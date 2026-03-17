using EventHub.Data;
using EventHub.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Features.Bookings.Queries;

public record GetMyBookingsQuery(int UserId) : IRequest<List<TicketDto>>;

public class GetMyBookingsHandler : IRequestHandler<GetMyBookingsQuery, List<TicketDto>>
{
    private readonly ApplicationDbContext _context;

    public GetMyBookingsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<TicketDto>> Handle(GetMyBookingsQuery request, CancellationToken cancellationToken)
    {
        return await _context.Tickets
            .Include(t => t.Event)
            .Include(t => t.Seat)
            .Where(t => t.UserId == request.UserId)
            .Select(t => new TicketDto
            {
                Id = t.Id,
                EventName = t.Event != null ? t.Event.Name : "Unknown Event",
                EventDate = t.Event != null ? t.Event.StartDate : DateTime.MinValue,
                Venue = t.Event != null ? t.Event.Location : "Unknown Venue",
                SeatSection = t.Seat != null ? t.Seat.Section : "N/A",
                SeatRow = t.Seat != null ? t.Seat.Row : "N/A",
                SeatNumber = t.Seat != null ? t.Seat.Number : "N/A",
                Price = t.PurchasePrice,
                PurchaseDate = t.BookingDate,
                Status = t.Status.ToString()
            })
            .OrderByDescending(t => t.PurchaseDate)
            .ToListAsync(cancellationToken);
    }
}
