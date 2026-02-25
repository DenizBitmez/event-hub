using EventHub.Data;
using EventHub.DTOs.Ticketmaster;
using EventHub.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EventHub.Services;

public class TicketmasterSyncService : IEventSyncService
{
    private readonly ApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public TicketmasterSyncService(ApplicationDbContext context, HttpClient httpClient, IConfiguration configuration)
    {
        _context = context;
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<int> SyncEventsFromExternalApi(string? keyword = null, string? segmentName = null)
    {
        var apiKey = _configuration["Ticketmaster:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new Exception("Ticketmaster API Key is not configured. Please set it using 'dotnet user-secrets set \"Ticketmaster:ApiKey\" \"YOUR_KEY\"'.");
        }
        
        var url = $"https://app.ticketmaster.com/discovery/v2/events.json?apikey={apiKey}&size=20";

        if (!string.IsNullOrEmpty(keyword)) url += $"&keyword={keyword}";
        if (!string.IsNullOrEmpty(segmentName)) url += $"&classificationName={segmentName}";

        var response = await _httpClient.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"Ticketmaster API returned {response.StatusCode}: {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        var tmData = JsonSerializer.Deserialize<TicketmasterResponse>(json);

        if (tmData?._embedded?.events == null) 
        {
            Console.WriteLine("Sync: No events found in Ticketmaster response.");
            return 0;
        }

        Console.WriteLine($"Sync: Found {tmData._embedded.events.Count} events from API.");

        int addedCount = 0;
        int duplicateCount = 0;
        foreach (var tmEvent in tmData._embedded.events)
        {
            // Simple check to avoid duplicates (could be improved by a unique ExternalId)
            var eventDate = tmEvent.dates?.start?.dateTime ?? DateTime.UtcNow;
            var existingEvent = await _context.Events.FirstOrDefaultAsync(e => e.Name == tmEvent.name && e.StartDate == eventDate);
            if (existingEvent != null)
            {
                // Even if event exists, ensure it has seats
                if (!await _context.Seats.AnyAsync(s => s.EventId == existingEvent.Id))
                {
                    var existingSeats = GenerateSeatsForEvent(existingEvent.Id, 100);
                    _context.Seats.AddRange(existingSeats);
                    addedCount++; // Count as updated/fixed
                }
                duplicateCount++;
                continue;
            }

            var category = await GetOrCreateCategory(tmEvent.classifications?.FirstOrDefault()?.segment?.name ?? "Other");

            var newEvent = new Event
            {
                Name = tmEvent.name,
                Description = tmEvent.description ?? tmEvent.name,
                Location = tmEvent._embedded?.venues?.FirstOrDefault()?.name ?? "Unknown Venue",
                ImageUrl = tmEvent.images?.FirstOrDefault(i => i.width > 500)?.url ?? tmEvent.images?.FirstOrDefault()?.url ?? "",
                Price = tmEvent.priceRanges?.FirstOrDefault()?.min ?? 50.0m,
                StartDate = eventDate,
                EndDate = eventDate.AddHours(2),
                CategoryId = category.Id,
                IsActive = true,
                Capacity = 1000
            };

            _context.Events.Add(newEvent);
            await _context.SaveChangesAsync(); // Get ID
            
            // Generate some seats for the demo
            var newSeats = GenerateSeatsForEvent(newEvent.Id, 100); 
            _context.Seats.AddRange(newSeats);
            
            addedCount++;
        }

        Console.WriteLine($"Sync: Successfully added {addedCount} new events. Ignored {duplicateCount} duplicates.");
        await _context.SaveChangesAsync();
        return addedCount;
    }

    private List<Seat> GenerateSeatsForEvent(int eventId, int capacity)
    {
        var seats = new List<Seat>();
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
                    Section = "General",
                    Row = row,
                    Number = i.ToString(),
                    Status = "Available"
                });
                currentCapacity++;
            }
        }
        return seats;
    }

    private async Task<Category> GetOrCreateCategory(string name)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name == name);
        if (category == null)
        {
            category = new Category { Name = name, Description = $"Events for {name}" };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
        }
        return category;
    }
}
