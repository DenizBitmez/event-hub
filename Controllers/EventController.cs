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
    public async Task<IActionResult> GetEvents()
    {
        var events = await _context.Events
            .Include(e => e.Category)
            .Where(e => e.IsActive)
            .ToListAsync();
        
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
