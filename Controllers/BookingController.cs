using EventHub.Data;
using EventHub.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConnectionMultiplexer _redis;

    public BookingController(ApplicationDbContext context, IConnectionMultiplexer redis)
    {
        _context = context;
        _redis = redis;
    }

    [HttpPost("naive")]
    public async Task<IActionResult> BookTicketNaive([FromBody] int eventId)
    {
        // 1. Fetch Event
        var eventItem = await _context.Events.FindAsync(eventId);
        if (eventItem == null) return NotFound("Event not found");

        // 2. Check Capacity
        if (eventItem.Capacity <= 0)
        {
            return BadRequest("Sold Out!");
        }

        // Simulate some processing time (widen the race window)
        await Task.Delay(50); 

        // 3. Decrement Capacity
        eventItem.Capacity--;
        
        // 4. Create Ticket
        _context.Tickets.Add(new Ticket 
        { 
            EventId = eventItem.Id,
            OwnerName = $"User-{Guid.NewGuid()}" // Random user
        });

        // 5. Save Changes
        await _context.SaveChangesAsync();
        
        return Ok($"Ticket Booked! Remaining: {eventItem.Capacity}");
    }

    [HttpPost("reset")]
    public async Task<IActionResult> Reset([FromBody] int capacity = 10)
    {
        var eventItem = await _context.Events.FindAsync(1);
        if (eventItem != null)
        {
            eventItem.Capacity = capacity;
            // Clear tickets
            var tickets = _context.Tickets.Where(t => t.EventId == 1);
            _context.Tickets.RemoveRange(tickets);
        }
        await _context.SaveChangesAsync();
        return Ok($"Reset to {capacity} and cleared tickets.");
    }

    [HttpPost("pessimistic")]
    public async Task<IActionResult> BookTicketPessimistic([FromBody] int eventId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // PESSIMISTIC LOCK: This SQL locks the row until transaction commit/rollback
            // Other transactions trying to read this row with FOR UPDATE will WAIT.
            var eventItem = await _context.Events
                .FromSqlRaw("SELECT * FROM \"Events\" WHERE \"Id\" = {0} FOR UPDATE", eventId)
                .SingleOrDefaultAsync();

            if (eventItem == null) return NotFound("Event not found");

            if (eventItem.Capacity <= 0)
            {
                return BadRequest("Sold Out!");
            }

            await Task.Delay(50); // Validate that lock makes them wait

            eventItem.Capacity--;
            
            _context.Tickets.Add(new Ticket 
            { 
                EventId = eventItem.Id, 
                OwnerName = $"User-{Guid.NewGuid()}" 
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            return Ok($"Ticket Booked! Remaining: {eventItem.Capacity}");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    [HttpPost("optimistic")]
    public async Task<IActionResult> BookTicketOptimistic([FromBody] int eventId)
    {
        try
        {
            // 1. Read (No Lock)
            var eventItem = await _context.Events.FindAsync(eventId);
            if (eventItem == null) return NotFound("Event not found");

            if (eventItem.Capacity <= 0)
            {
                return BadRequest("Sold Out!");
            }

            // Simulate slight delay to increase race chance
            await Task.Delay(20);

            // 2. Modify
            eventItem.Capacity--;
            
            // EF Core will automatically check if 'Version' matches the DB
            // We must update the version so the NEXT person fails
            eventItem.Version = Guid.NewGuid();

            _context.Tickets.Add(new Ticket 
            { 
                EventId = eventItem.Id, 
                OwnerName = $"User-{Guid.NewGuid()}" 
            });

            // 3. Save (Will throw DbUpdateConcurrencyException if Version changed)
            await _context.SaveChangesAsync();
            
            return Ok($"Ticket Booked! Remaining: {eventItem.Capacity}");
        }
        catch (DbUpdateConcurrencyException)
        {
            // PROOF OF SUCCESS: The system prevented an overwrite!
            // In a real app, we would retry here.
            return Conflict("Concurrency Conflict! Someone else booked while you were looking. Please try again.");
        }
    }
    [HttpPost("redis")]
    public async Task<IActionResult> BookTicketRedis([FromBody] int eventId)
    {
        try
        {
            var db = _redis.GetDatabase();
            var lockKey = $"lock:event:{eventId}";
            var token = Guid.NewGuid().ToString();

            // 1. Acquire Lock (SET NX PX)
            if (!await db.LockTakeAsync(lockKey, token, TimeSpan.FromSeconds(10)))
            {
                 return StatusCode(429, "Server busy, please try again later (Lock not acquired)");
            }

            try
            {
                // 2. Critical Section (Protected by Redis)
                var eventItem = await _context.Events.FindAsync(eventId);
                if (eventItem == null) return NotFound("Event not found");

                if (eventItem.Capacity <= 0)
                {
                    return BadRequest("Sold Out!");
                }

                await Task.Delay(20); 

                eventItem.Capacity--;

                _context.Tickets.Add(new Ticket 
                { 
                    EventId = eventItem.Id, 
                    OwnerName = $"User-Redis-{Guid.NewGuid()}" 
                });

                await _context.SaveChangesAsync();
                
                return Ok($"Ticket Booked! Remaining: {eventItem.Capacity}");
            }
            finally
            {
                // 3. Release Lock
                await db.LockReleaseAsync(lockKey, token);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.ToString());
        }
    }
}
