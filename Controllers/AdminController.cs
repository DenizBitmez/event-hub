using EventHub.Data;
using EventHub.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EventHub.Models.Enums;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Strict Admin Access
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IBookingService _bookingService;

    public AdminController(ApplicationDbContext context, IBookingService bookingService)
    {
        _context = context;
        _bookingService = bookingService;
    }

    [HttpGet("reports/events")]
    public async Task<IActionResult> GetEventReports()
    {
        var reports = await _context.Events
            .Select(e => new 
            {
                EventId = e.Id,
                EventName = e.Name,
                TotalCapacity = e.Capacity + _context.Tickets.Count(t => t.EventId == e.Id && t.Status != TicketStatus.Cancelled), // Approx initial capacity
                RemainingCapacity = e.Capacity,
                SoldTickets = _context.Tickets.Count(t => t.EventId == e.Id && t.Status == TicketStatus.Confirmed),
                Revenue = _context.Tickets.Where(t => t.EventId == e.Id && t.Status == TicketStatus.Confirmed).Sum(t => t.PurchasePrice)
            })
            .ToListAsync();

        return Ok(reports);
    }

    [HttpPost("tickets/{ticketId}/cancel")]
    public async Task<IActionResult> CancelTicket(int ticketId)
    {
        var result = await _bookingService.CancelTicketAsync(ticketId);
        if (result.Success)
        {
            return Ok(result);
        }
        return BadRequest(result);
    }
}
