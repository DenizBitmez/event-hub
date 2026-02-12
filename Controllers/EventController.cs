using EventHub.Data;
using EventHub.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EventController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] string? location, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _context.Events
            .Include(e => e.Category)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(location))
        {
            query = query.Where(e => e.Location.Contains(location));
        }

        if (startDate.HasValue)
        {
            query = query.Where(e => e.StartDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(e => e.EndDate <= endDate.Value);
        }

        var events = await query.ToListAsync();
        
        return Ok(events);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEvent(int id)
    {
        var eventItem = await _context.Events
            .Include(e => e.Category)
            .SingleOrDefaultAsync(e => e.Id == id);

        if (eventItem == null) return NotFound();

        return Ok(eventItem);
    }

    [HttpGet("{id}/seats")]
    public async Task<IActionResult> GetEventSeats(int id)
    {
        var seats = await _context.Seats
            .Where(s => s.EventId == id)
            .Select(s => new EventHub.DTOs.SeatDto
            {
                Id = s.Id,
                Section = s.Section,
                Row = s.Row,
                Number = s.Number,
                Status = s.Status,
                Price = 100 // Default price, or fetch from Event/Category
            })
            .ToListAsync();

        return Ok(seats);
    }

    // Only authorized users can create events (for now, ideally Admin)
    [HttpPost]
    [Authorize] 
    public async Task<IActionResult> CreateEvent([FromBody] Event eventItem)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Reset some sensitive fields
        eventItem.Id = 0; 
        eventItem.Capacity = eventItem.Capacity > 0 ? eventItem.Capacity : 100;

        _context.Events.Add(eventItem);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEvent), new { id = eventItem.Id }, eventItem);
    }
}
