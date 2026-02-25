using EventHub.Data;
using EventHub.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EventHub.Services;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEventSyncService _syncService;

    public EventController(ApplicationDbContext context, IEventSyncService syncService)
    {
        _context = context;
        _syncService = syncService;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] string? location, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] int? categoryId)
    {
        var query = _context.Events.AsQueryable();

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

        if (categoryId.HasValue)
        {
            query = query.Where(e => e.CategoryId == categoryId.Value);
        }

        var events = await query.ToListAsync();
        return Ok(events);
    }

    [HttpGet("{id}/seats")]
    [AllowAnonymous] // Allow public access to seat availability for now
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
                Price = 100 // Placeholder, could be from Event or SeatType
            })
            .ToListAsync();

        return Ok(seats);
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

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories.ToListAsync();
        return Ok(categories);
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

    [HttpPost("sync")]
    [AllowAnonymous] // For testing, ideally should be Admin only
    public async Task<IActionResult> SyncEvents([FromQuery] string? keyword, [FromQuery] string? category)
    {
        try
        {
            var count = await _syncService.SyncEventsFromExternalApi(keyword, category);
            return Ok(new { Message = $"{count} new events synced successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Error syncing events.", Error = ex.Message });
        }
    }
}
