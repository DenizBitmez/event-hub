using EventHub.Data;
using EventHub.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EventHub.Services;
using MediatR;
using EventHub.Features.Events.Queries;
using EventHub.Features.Events.Commands;
using Asp.Versioning;

namespace EventHub.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class EventController : ControllerBase
{
    private readonly IMediator _mediator;

    public EventController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] string? location, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] int? categoryId, [FromQuery] string? searchTerm)
    {
        var query = new GetEventsQuery(searchTerm, location, startDate, endDate, categoryId);
        var events = await _mediator.Send(query);
        return Ok(events);
    }

    [HttpGet("{id}/seats")]
    [AllowAnonymous] // Allow public access to seat availability for now
    public async Task<IActionResult> GetEventSeats(int id)
    {
        var query = new GetEventSeatsQuery(id);
        var seats = await _mediator.Send(query);
        return Ok(seats);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEvent(int id)
    {
        var query = new GetEventByIdQuery(id);
        var eventItem = await _mediator.Send(query);

        if (eventItem == null) return NotFound();

        return Ok(eventItem);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var query = new GetCategoriesQuery();
        var categories = await _mediator.Send(query);
        return Ok(categories);
    }


    // Only authorized users can create events (for now, ideally Admin)
    [HttpPost]
    [Authorize] 
    public async Task<IActionResult> CreateEvent([FromBody] Event eventItem)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var command = new CreateEventCommand(eventItem);
        var result = await _mediator.Send(command);

        return CreatedAtAction(nameof(GetEvent), new { id = result.Id }, result);
    }

    [HttpPost("sync")]
    [AllowAnonymous] // For testing, ideally should be Admin only
    public async Task<IActionResult> SyncEvents([FromQuery] string? keyword, [FromQuery] string? category)
    {
        try
        {
            var command = new SyncEventsCommand(keyword, category);
            var count = await _mediator.Send(command);
            return Ok(new { Message = $"{count} new events synced successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Error syncing events.", Error = ex.Message });
        }
    }
}
