using EventHub.Data;
using EventHub.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Features.Events.Queries;

public record GetEventSeatsQuery(int EventId) : IRequest<List<SeatDto>>;

public class GetEventSeatsHandler : IRequestHandler<GetEventSeatsQuery, List<SeatDto>>
{
    private readonly ApplicationDbContext _context;

    public GetEventSeatsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SeatDto>> Handle(GetEventSeatsQuery request, CancellationToken cancellationToken)
    {
        return await _context.Seats
            .Where(s => s.EventId == request.EventId)
            .Select(s => new SeatDto
            {
                Id = s.Id,
                Section = s.Section,
                Row = s.Row,
                Number = s.Number,
                Status = s.Status,
                Price = 100 // Placeholder logic from controller maintained
            })
            .ToListAsync(cancellationToken);
    }
}
