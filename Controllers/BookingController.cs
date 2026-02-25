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

    // Obsolete GetEvents/GetEvent removed. Use EventController.

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
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();
        
        request.UserId = userId;

        try
        {
            var response = await _bookingService.BookTicketAsync(request);

            if (response.Success)
            {
                return Ok(response);
            }
            else
            {
                if (response.Message.Contains("Sold Out"))
                {
                    return Conflict(response); 
                }
                return BadRequest(response);
            }
        }
        catch (Exception)
        {
            return StatusCode(500, "An internal error occurred while processing your booking.");
        }
    }


    [HttpPost("reserve")]
    [Authorize]
    public async Task<IActionResult> ReserveSeat([FromBody] ReserveRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        var success = await _reservationService.ReserveSeatAsync(request.EventId, request.SeatId, userId);
        if (success)
        {
            return Ok(new { Message = "Seat Reserved for 10 minutes", ExpiresAt = DateTime.UtcNow.AddMinutes(10) });
        }
        return Conflict(new { Message = "Seat already reserved or unavailable" });
    }

    [HttpPost("reserve-multiple")]
    [Authorize]
    public async Task<IActionResult> ReserveSeats([FromBody] ReserveMultipleRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        var success = await _reservationService.ReserveSeatsAsync(request.EventId, request.SeatIds, userId);
        if (success)
        {
            return Ok(new { Message = $"{request.SeatIds.Count} Seats Reserved for 10 minutes", ExpiresAt = DateTime.UtcNow.AddMinutes(10) });
        }
        return Conflict(new { Message = "One or more seats are already reserved or unavailable" });
    }

    [HttpPost("confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmBooking([FromBody] ConfirmBookingRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

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

    [HttpPost("confirm-multiple")]
    [Authorize]
    public async Task<IActionResult> ConfirmMultipleBooking([FromBody] ConfirmMultipleBookingRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        // 1. Verify Reservations
        var hasReservations = await _reservationService.ConfirmReservationsAsync(request.EventId, request.SeatIds, userId);
        if (!hasReservations)
        {
            return BadRequest("One or more reservations expired or are invalid");
        }

        // 2. Finalize Bookings
        var bookingRequest = new BookingRequest { EventId = request.EventId, Quantity = request.SeatIds.Count, UserId = userId };
        var result = await _bookingService.BookSeatsAsync(bookingRequest, request.SeatIds);
        
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
                EventName = t.Event != null ? t.Event.Name : "Unknown Event",
                EventDate = t.Event != null ? t.Event.StartDate : DateTime.MinValue,
                Venue = t.Event != null ? t.Event.Location : "Unknown Venue",
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
