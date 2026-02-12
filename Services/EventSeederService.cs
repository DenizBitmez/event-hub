using EventHub.Data;
using EventHub.Models;

namespace EventHub.Services;

public class EventSeederService
{
    private readonly ApplicationDbContext _context;

    public EventSeederService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedEventsAsync()
    {

        var events = new List<Event>
        {
            new Event 
            { 
                Name = "Tarkan Concert", 
                Description = "Live at Harbiye", 
                Location = "Istanbul", 
                StartDate = DateTime.UtcNow.AddDays(7), 
                EndDate = DateTime.UtcNow.AddDays(7).AddHours(3),
                Price = 500,
                Capacity = 100
            },
            new Event 
            { 
                Name = "Fazıl Say Piano Recital", 
                Description = "Classical Night", 
                Location = "Ankara", 
                StartDate = DateTime.UtcNow.AddDays(14), 
                EndDate = DateTime.UtcNow.AddDays(14).AddHours(2),
                Price = 300,
                Capacity = 50
            },
            new Event 
            { 
                Name = "Techno Festival", 
                Description = "All night long", 
                Location = "Izmir", 
                StartDate = DateTime.UtcNow.AddDays(30), 
                EndDate = DateTime.UtcNow.AddDays(32),
                Price = 1000,
                Capacity = 500
            }
        };

        foreach (var evt in events)
        {
            if (!_context.Events.Any(e => e.Name == evt.Name))
            {
                _context.Events.Add(evt);
                await _context.SaveChangesAsync(); // Save to get ID

                // Generate Seats
                var seats = GenerateSeatsForEvent(evt.Id, evt.Capacity);
                _context.Seats.AddRange(seats);
            }
        }

        await _context.SaveChangesAsync();
    }

    private List<Seat> GenerateSeatsForEvent(int eventId, int capacity)
    {
        var seats = new List<Seat>();
        // Simple Grid: 10 seats per row
        // A1-A10, B1-B10, etc.
        
        string[] rows = { "A", "B", "C", "D", "E", "F", "G", "H", "I", "J" };
        int seatsPerRow = 10;
        int currentCapacity = 0;

        foreach (var row in rows)
        {
            for (int i = 1; i <= seatsPerRow; i++)
            {
                if (currentCapacity >= capacity) break;

                seats.Add(new Seat
                {
                    EventId = eventId,
                    Section = "Main Hall",
                    Row = row,
                    Number = i.ToString(),
                    Status = "Available"
                });
                currentCapacity++;
            }
        }
        return seats;
    }
}
