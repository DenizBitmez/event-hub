using EventHub.Data;
using EventHub.DTOs;
using EventHub.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using System.Security.Claims;
using MediatR;
using EventHub.Features.Bookings.Commands;
using Asp.Versioning;

namespace EventHub.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class StripeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IMediator _mediator;

    public StripeController(ApplicationDbContext context, IConfiguration configuration, IMediator _mediator)
    {
        _context = context;
        _configuration = configuration;
        this._mediator = _mediator;
        StripeConfiguration.ApiKey = _configuration["STRIPE_SECRET_KEY"] ?? Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
    }

    [HttpGet("config")]
    [AllowAnonymous]
    public IActionResult GetConfig()
    {
        var pk = _configuration["STRIPE_PUBLISHABLE_KEY"] ?? Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY");
        return Ok(new { publishableKey = pk });
    }

    // DTO for creating session
    public class CreateCheckoutSessionRequest
    {
        public int EventId { get; set; }
        public List<int> SeatIds { get; set; } = new();
    }

    [HttpPost("create-checkout-session")]
    [Authorize]
    public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateCheckoutSessionRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) 
            return Unauthorized();

        if (req.SeatIds.Count == 0) return BadRequest("No seats selected");

        var eventItem = await _context.Events.FindAsync(req.EventId);
        if (eventItem == null) return NotFound("Event not found");

        var seats = await _context.Seats.Where(s => req.SeatIds.Contains(s.Id)).ToListAsync();
        if (seats.Count != req.SeatIds.Count) return BadRequest("One or more seats not found");

        var lineItems = new List<SessionLineItemOptions>();

        foreach (var seat in seats)
        {
            var seatPrice = seat.Price > 0 ? seat.Price : eventItem.Price;
            lineItems.Add(new SessionLineItemOptions
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    UnitAmount = (long)(seatPrice * 100), // Stripe expects cents
                    Currency = "usd", // Setting default to usd, modify if needed
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = $"Seat - Section {seat.Section}, Row {seat.Row}, No {seat.Number}",
                        Description = $"Event: {eventItem.Name}"
                    },
                },
                Quantity = 1,
            });
        }

        var domain = "http://localhost:5173"; // React App URL
        
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = lineItems,
            Mode = "payment",
            SuccessUrl = domain + $"/event/{req.EventId}?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = domain + $"/event/{req.EventId}?canceled=true",
            Metadata = new Dictionary<string, string>
            {
                { "UserId", userId.ToString() },
                { "EventId", req.EventId.ToString() },
                { "SeatIds", string.Join(',', req.SeatIds) }
            }
        };

        var service = new SessionService();
        try
        {
            var session = await service.CreateAsync(options);
            return Ok(new { url = session.Url, sessionId = session.Id });
        }
        catch(StripeException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [HttpPost("create-payment-intent")]
    [Authorize]
    public async Task<IActionResult> CreatePaymentIntent([FromBody] CreateCheckoutSessionRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) 
            return Unauthorized();

        if (req.SeatIds.Count == 0) return BadRequest("No seats selected");

        var eventItem = await _context.Events.FindAsync(req.EventId);
        if (eventItem == null) return NotFound("Event not found");

        var seats = await _context.Seats.Where(s => req.SeatIds.Contains(s.Id)).ToListAsync();
        if (seats.Count != req.SeatIds.Count) return BadRequest("One or more seats not found");

        long totalAmountCents = 0;
        foreach (var seat in seats)
        {
            var seatPrice = seat.Price > 0 ? seat.Price : eventItem.Price;
            totalAmountCents += (long)(seatPrice * 100);
        }

        var options = new PaymentIntentCreateOptions
        {
            Amount = totalAmountCents,
            Currency = "usd", // default
            // Optionally, we could require PaymentMethods here
            AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
            {
                Enabled = true,
            },
            Metadata = new Dictionary<string, string>
            {
                { "UserId", userId.ToString() },
                { "EventId", req.EventId.ToString() },
                { "SeatIds", string.Join(',', req.SeatIds) }
            }
        };

        var service = new PaymentIntentService();
        try
        {
            var paymentIntent = await service.CreateAsync(options);
            return Ok(new { clientSecret = paymentIntent.ClientSecret });
        }
        catch (StripeException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    public class CompletePaymentIntentRequest
    {
        public string PaymentIntentId { get; set; } = string.Empty;
    }

    [HttpPost("confirm-payment-intent")]
    [Authorize]
    public async Task<IActionResult> ConfirmPaymentIntent([FromBody] CompletePaymentIntentRequest req)
    {
        if (string.IsNullOrEmpty(req.PaymentIntentId)) return BadRequest("Invalid Payment Intent ID");

        var service = new PaymentIntentService();
        PaymentIntent paymentIntent;
        try
        {
            paymentIntent = await service.GetAsync(req.PaymentIntentId);
        }
        catch (StripeException e)
        {
            return BadRequest(e.Message);
        }

        if (paymentIntent.Status != "succeeded")
        {
            return BadRequest("Payment not successful");
        }

        var userId = int.Parse(paymentIntent.Metadata["UserId"]);
        var eventId = int.Parse(paymentIntent.Metadata["EventId"]);
        var seatIds = paymentIntent.Metadata["SeatIds"].Split(',').Select(int.Parse).ToList();

        // 1. Verify User 
        var callerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (callerIdClaim == null || int.Parse(callerIdClaim.Value) != userId)
        {
            return Unauthorized("Mismatch in user verification");
        }

        // 2. Finalize Bookings
        var command = new ConfirmPaymentCommand(eventId, seatIds, userId);
        var result = await _mediator.Send(command);
        
        if (result.Success) return Ok(result);
        
        return BadRequest(result);
    }

    public class CompleteCheckoutRequest
    {
        public string SessionId { get; set; } = string.Empty;
    }

    [HttpPost("complete-checkout")]
    [Authorize]
    public async Task<IActionResult> CompleteCheckout([FromBody] CompleteCheckoutRequest req)
    {
        if (string.IsNullOrEmpty(req.SessionId)) return BadRequest("Invalid session ID");

        var service = new SessionService();
        Stripe.Checkout.Session session;
        try
        {
            session = await service.GetAsync(req.SessionId);
        }
        catch (StripeException e)
        {
            return BadRequest(e.Message);
        }

        if (session.PaymentStatus != "paid")
        {
            return BadRequest("Payment not successful");
        }

        var userId = int.Parse(session.Metadata["UserId"]);
        var eventId = int.Parse(session.Metadata["EventId"]);
        var seatIds = session.Metadata["SeatIds"].Split(',').Select(int.Parse).ToList();

        // 1. Verify User (Ensure the caller is the one who created it - or trust metadata)
        var callerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (callerIdClaim == null || int.Parse(callerIdClaim.Value) != userId)
        {
            return Unauthorized("Mismatch in user verification");
        }

        // 2. Finalize Bookings
        var command = new ConfirmPaymentCommand(eventId, seatIds, userId);
        var result = await _mediator.Send(command);
        
        if (result.Success) return Ok(result);
        
        return BadRequest(result);
    }
}
