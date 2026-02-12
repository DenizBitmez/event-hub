using EventHub.DTOs;
using EventHub.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly IReservationService _reservationService;
    private readonly IValidator<BookingRequest> _validator;

    public BookingController(IBookingService bookingService, IReservationService reservationService, IValidator<BookingRequest> validator)
    {
        _bookingService = bookingService;
        _reservationService = reservationService;
        _validator = validator;
    }

    [HttpPost("naive")]
    public async Task<IActionResult> BookTicketNaive([FromBody] BookingRequest request)
    {
        var validationResult = await _validator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.Errors);
        }

        // SECURE: Get User ID from Token, don't trust the client body
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        request.UserId = int.Parse(userIdClaim.Value);

        try
        {
            var response = await _bookingService.BookTicketAsync(request);

            if (response.Success)
            {
                return Ok(response);
            }
            else
            {
                // If Sold Out or other logic failure, return 409 Conflict or 400 BadRequest
                // 409 Conflict is often semantic for "State didn't allow this" (e.g. sold out during race)
                if (response.Message.Contains("Sold Out"))
                {
                    return Conflict(response); 
                }
                return BadRequest(response);
            }
        }
        catch (Exception ex)
        {
            // Logged in Service, but return generic 500 here
            return StatusCode(500, "An internal error occurred while processing your booking.");
        }
    }

    [HttpPost("reserve")]
    [Authorize]
    public async Task<IActionResult> ReserveSeat([FromBody] ReserveRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        var userId = int.Parse(userIdClaim.Value);

        var success = await _reservationService.ReserveSeatAsync(request.EventId, request.SeatId, userId);
        if (success)
        {
            return Ok(new { Message = "Seat Reserved for 10 minutes", ExpiresAt = DateTime.UtcNow.AddMinutes(10) });
        }
        return Conflict(new { Message = "Seat already reserved or unavailable" });
    }

    [HttpPost("confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmBooking([FromBody] ConfirmBookingRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        var userId = int.Parse(userIdClaim.Value);

        // 1. Verify Reservation (Redis)
        var hasReservation = await _reservationService.ConfirmReservationAsync(request.EventId, request.SeatId, userId);
        if (!hasReservation)
        {
            return BadRequest("Reservation expired or invalid");
        }

        // 2. Finalize Booking (DB)
        var bookingRequest = new BookingRequest { EventId = request.EventId, Quantity = 1, UserId = userId };
        var result = await _bookingService.BookSeatAsync(bookingRequest, request.SeatId);
        
        if (result.Success) return Ok(result);
        return BadRequest(result);
    }

    [HttpGet("user/my-bookings")]
    [Authorize]
    public async Task<IActionResult> GetUserBookings([FromServices] EventHub.Data.ApplicationDbContext context)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        var userId = int.Parse(userIdClaim.Value);

        var bookings = await context.Tickets
            .Include(t => t.Event)
            .Include(t => t.Seat)
            .Where(t => t.UserId == userId)
            .Select(t => new EventHub.DTOs.TicketDto
            {
                Id = t.Id,
                EventName = t.Event.Name,
                EventDate = t.Event.StartDate,
                Venue = t.Event.Location,
                SeatSection = t.Seat != null ? t.Seat.Section : "N/A",
                SeatRow = t.Seat != null ? t.Seat.Row : "N/A",
                SeatNumber = t.Seat != null ? t.Seat.Number : "N/A",
                Price = t.PurchasePrice,
                PurchaseDate = t.BookingDate,
                Status = t.Status.ToString()
            })
            .OrderByDescending(t => t.PurchaseDate)
            .ToListAsync();

        return Ok(bookings);
    }
}
