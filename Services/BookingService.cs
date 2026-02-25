using EventHub.Data;
using EventHub.DTOs;
using EventHub.Models;
using EventHub.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Services;

public interface IBookingService
{
    Task<BookingResponse> BookTicketAsync(BookingRequest request);
    Task<BookingResponse> CancelTicketAsync(int ticketId);
    Task<BookingResponse> BookSeatAsync(BookingRequest request, int seatId);
    Task<BookingResponse> BookSeatsAsync(BookingRequest request, List<int> seatIds);
}

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BookingService> _logger;

    public BookingService(ApplicationDbContext context, ILogger<BookingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BookingResponse> BookTicketAsync(BookingRequest request)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            // 1. Start a Database Transaction
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                 _logger.LogInformation("Attempting to book ticket for Event {EventId} by User {UserId}", request.EventId, request.UserId);

                // 2. ACQUIRE LOCK (Pessimistic Locking)
                var eventItem = await _context.Events
                    .FromSqlRaw("SELECT * FROM \"Events\" WHERE \"Id\" = {0} FOR UPDATE", request.EventId)
                    .SingleOrDefaultAsync();

                if (eventItem == null)
                {
                    return new BookingResponse { Success = false, Message = "Event not found" };
                }

                // 3. Business Rule Check (Inside the Lock)
                if (eventItem.Capacity < request.Quantity)
                {
                    _logger.LogWarning("Event {EventId} is Sold Out. Requested: {Qty}, Available: {Cap}", request.EventId, request.Quantity, eventItem.Capacity);
                    return new BookingResponse 
                    { 
                        Success = false, 
                        Message = "Sold Out!", 
                        RemainingCapacity = eventItem.Capacity 
                    };
                }

                // 4. Update State
                eventItem.Capacity -= request.Quantity;

                var ticket = new Ticket
                {
                    EventId = eventItem.Id,
                    UserId = request.UserId, // Linked to real User
                    PurchasePrice = eventItem.Price,
                    Status = TicketStatus.Confirmed,
                    BookingDate = DateTime.UtcNow
                };

                _context.Tickets.Add(ticket);

                // 5. Save Changes & Commit Transaction
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully booked ticket {TicketId} for Event {EventId}. Remaining: {Capacity}", ticket.Id, eventItem.Id, eventItem.Capacity);

                return new BookingResponse
                {
                    Success = true,
                    Message = "Ticket Booked Successfully",
                    TicketId = ticket.Id,
                    RemainingCapacity = eventItem.Capacity
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error booking ticket for Event {EventId}", request.EventId);
                await transaction.RollbackAsync();
                throw; 
            }
        });
    }
    public async Task<BookingResponse> CancelTicketAsync(int ticketId)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ticket = await _context.Tickets.FindAsync(ticketId);
                if (ticket == null) return new BookingResponse { Success = false, Message = "Ticket not found" };

                if (ticket.Status == TicketStatus.Cancelled) return new BookingResponse { Success = false, Message = "Already cancelled" };

                // 1. Mark as Cancelled
                ticket.Status = TicketStatus.Cancelled;

                // 2. Restore Capacity (Locking Event to ensure consistency)
                var eventItem = await _context.Events
                    .FromSqlRaw("SELECT * FROM \"Events\" WHERE \"Id\" = {0} FOR UPDATE", ticket.EventId)
                    .SingleOrDefaultAsync();

                if (eventItem != null)
                {
                    eventItem.Capacity++; // Restore inventory
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Cancelled Ticket {TicketId} and restored capacity for Event {EventId}", ticketId, ticket.EventId);
                
                return new BookingResponse { Success = true, Message = "Ticket cancelled and refunded" };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling ticket {TicketId}", ticketId);
                await transaction.RollbackAsync();
                throw;
            }
        });
    }
    public async Task<BookingResponse> BookSeatAsync(BookingRequest request, int seatId)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Validate Seat
                var seat = await _context.Seats.FindAsync(seatId);
                if (seat == null) return new BookingResponse { Success = false, Message = "Seat not found" };
                if (seat.EventId != request.EventId) return new BookingResponse { Success = false, Message = "Seat mismatch" };
                
                // Check usage (DB level check as final gate)
                if (seat.Status == "Sold") return new BookingResponse { Success = false, Message = "Seat already sold" };

                // 2. Mark Seat as Sold
                seat.Status = "Sold";

                // 3. Create Ticket
                var eventItem = await _context.Events.FindAsync(request.EventId);
                var ticket = new Ticket
                {
                    EventId = request.EventId,
                    UserId = request.UserId,
                    SeatId = seatId,
                    PurchasePrice = seat.Price > 0 ? seat.Price : (eventItem?.Price ?? 100),
                    Status = TicketStatus.Confirmed,
                    BookingDate = DateTime.UtcNow
                };
                
                _context.Tickets.Add(ticket);
                
                // 4. Decrement Capacity (Optional, but keeps stats consistent)
                if(eventItem != null) eventItem.Capacity--;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new BookingResponse { Success = true, Message = "Seat Booked", TicketId = ticket.Id };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error booking seat {SeatId}", seatId);
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    public async Task<BookingResponse> BookSeatsAsync(BookingRequest request, List<int> seatIds)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var eventItem = await _context.Events.FindAsync(request.EventId);
                var tickets = new List<Ticket>();
                foreach (var seatId in seatIds)
                {
                    var seat = await _context.Seats.FindAsync(seatId);
                    if (seat == null || seat.EventId != request.EventId || seat.Status == "Sold")
                    {
                        await transaction.RollbackAsync();
                        return new BookingResponse { Success = false, Message = $"Seat {seatId} unavailable" };
                    }

                    seat.Status = "Sold";
                    
                    var ticket = new Ticket
                    {
                        EventId = request.EventId,
                        UserId = request.UserId,
                        SeatId = seatId,
                        PurchasePrice = seat.Price > 0 ? seat.Price : (eventItem?.Price ?? 100),
                        Status = TicketStatus.Confirmed,
                        BookingDate = DateTime.UtcNow
                    };
                    tickets.Add(ticket);
                }

                _context.Tickets.AddRange(tickets);

                if (eventItem != null) eventItem.Capacity -= seatIds.Count;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new BookingResponse 
                { 
                    Success = true, 
                    Message = $"{seatIds.Count} Seats Booked Successfully", 
                    TicketId = tickets[0].Id // Return first ticket ID or modify response DTO to return list
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error booking multiple seats for Event {EventId}", request.EventId);
                await transaction.RollbackAsync();
                throw;
            }
        });
    }
}
