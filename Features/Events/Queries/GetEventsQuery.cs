using EventHub.Data;
using EventHub.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Features.Events.Queries;

public record GetEventsQuery(
    string? SearchTerm = null,
    string? Location = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int? CategoryId = null
) : IRequest<List<Event>>;

public class GetEventsHandler : IRequestHandler<GetEventsQuery, List<Event>>
{
    private readonly ApplicationDbContext _context;

    public GetEventsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Event>> Handle(GetEventsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Events
            .Include(e => e.Category)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(request.SearchTerm))
        {
            query = query.Where(e => e.Name.ToLower().Contains(request.SearchTerm.ToLower()));
        }

        if (!string.IsNullOrEmpty(request.Location))
        {
            query = query.Where(e => e.Location.ToLower().Contains(request.Location.ToLower()));
        }

        if (request.StartDate.HasValue)
        {
            query = query.Where(e => e.StartDate >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(e => e.EndDate < request.EndDate.Value.AddDays(1));
        }

        if (request.CategoryId.HasValue)
        {
            query = query.Where(e => e.CategoryId == request.CategoryId.Value);
        }

        return await query
            .OrderByDescending(e => e.StartDate)
            .ToListAsync(cancellationToken);
    }
}
