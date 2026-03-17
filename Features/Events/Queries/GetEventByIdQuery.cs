using EventHub.Data;
using EventHub.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Features.Events.Queries;

public record GetEventByIdQuery(int Id) : IRequest<Event?>;

public class GetEventByIdHandler : IRequestHandler<GetEventByIdQuery, Event?>
{
    private readonly ApplicationDbContext _context;

    public GetEventByIdHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Event?> Handle(GetEventByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.Events
            .Include(e => e.Category)
            .SingleOrDefaultAsync(e => e.Id == request.Id, cancellationToken);
    }
}
