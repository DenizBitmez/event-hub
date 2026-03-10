using EventHub.Data;
using EventHub.DTOs;
using EventHub.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using System.Security.Claims;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StripeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IBookingService _bookingService;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public StripeController(ApplicationDbContext context, IBookingService bookingService, IConfiguration configuration, IEmailService emailService)
    {
        _context = context;
        _bookingService = bookingService;
        _configuration = configuration;
        _emailService = emailService;
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
        var bookingRequest = new BookingRequest { EventId = eventId, Quantity = seatIds.Count, UserId = userId };
        var result = await _bookingService.BookSeatsAsync(bookingRequest, seatIds);
        
        if (result.Success)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                var eventDetails = await _context.Events.FindAsync(eventId);
                var seats = await _context.Seats.Where(s => seatIds.Contains(s.Id)).ToListAsync();
                string seatNames = string.Join(", ", seats.Select(s => $"Row {s.Row}-{s.Number}"));
                
                string emailBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                    <h2 style='color: #ea580c; text-align: center;'>Your Ticket is Confirmed! 🎟️</h2>
                    <p>Hi {user.FullName},</p>
                    <p>Thank you for your purchase. Here are your booking details:</p>
                    <div style='background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                        <p><strong>Event:</strong> {eventDetails?.Name}</p>
                        <p><strong>Venue:</strong> {eventDetails?.Venue}</p>
                        <p><strong>Date:</strong> {eventDetails?.StartDate.ToShortDateString()}</p>
                        <p><strong>Seats:</strong> {seatNames}</p>
                    </div>
                    <p style='text-align: center;'>
                        <a href='http://localhost:5173/my-bookings' style='background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;'>View and Download PDF Ticket</a>
                    </p>
                    <p style='color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px;'>&copy; 2026 EventHub. All rights reserved.</p>
                </div>";
                
                await _emailService.SendEmailAsync(user.Email ?? "test@example.com", $"Your Ticket for {eventDetails?.Name}", emailBody);
            }
            return Ok(result);
        }
        
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
        // Note: For a robust system, we should check if this session was already fulfilled 
        // to prevent duplicate bookings for the same session ID. 
        // We could store SessionId in the Ticket model or another table.
        // For simplicity, we just rely on booking service rejecting duplicate seat bookings.
        
        var bookingRequest = new BookingRequest { EventId = eventId, Quantity = seatIds.Count, UserId = userId };
        var result = await _bookingService.BookSeatsAsync(bookingRequest, seatIds);
        
        if (result.Success) return Ok(result);
        
        return BadRequest(result);
    }
}
