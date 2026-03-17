using EventHub.DTOs;
using EventHub.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using MediatR;
using EventHub.Features.Bookings.Queries;
using EventHub.Features.Bookings.Commands;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingController : ControllerBase
{
    private readonly IMediator _mediator;

    public BookingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Obsolete GetEvents/GetEvent removed. Use EventController.

    [HttpPost("naive")]
    public async Task<IActionResult> BookTicketNaive([FromBody] BookingRequest request)
    {
        // SECURE: Get User ID from Token, don't trust the client body
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();
        
        request.UserId = userId;

        var command = new BookTicketNaiveCommand(request);
        var result = await _mediator.Send(command);

        if (result.Success) return Ok(result);
        if (result.Message.Contains("Sold Out")) return Conflict(result);
        return BadRequest(result);
    }


    [HttpPost("reserve")]
    [Authorize]
    public async Task<IActionResult> ReserveSeat([FromBody] ReserveRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        var command = new ReserveSeatsCommand(request.EventId, new List<int> { request.SeatId }, userId);
        var success = await _mediator.Send(command);
        
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

        var command = new ReserveSeatsCommand(request.EventId, request.SeatIds, userId);
        var success = await _mediator.Send(command);
        
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

        var command = new ConfirmBookingCommand(request.EventId, new List<int> { request.SeatId }, userId);
        var result = await _mediator.Send(command);
        
        if (result.Success) return Ok(result);
        return BadRequest(result);
    }

    [HttpPost("confirm-multiple")]
    [Authorize]
    public async Task<IActionResult> ConfirmMultipleBooking([FromBody] ConfirmMultipleBookingRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        var command = new ConfirmBookingCommand(request.EventId, request.SeatIds, userId);
        var result = await _mediator.Send(command);
        
        if (result.Success) return Ok(result);
        return BadRequest(result);
    }

    [HttpGet("user/my-bookings")]
    [Authorize]
    public async Task<IActionResult> GetUserBookings()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        var query = new GetMyBookingsQuery(userId);
        var bookings = await _mediator.Send(query);

        return Ok(bookings);
    }

    [HttpPost("refund/{ticketId}")]
    [Authorize]
    public async Task<IActionResult> RefundTicket(int ticketId)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId)) return Unauthorized();

        var command = new CancelTicketCommand(ticketId, userId);
        var result = await _mediator.Send(command);
        
        if (result.Success) return Ok(result);
        return BadRequest(result);
    }
}
