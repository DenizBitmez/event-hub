using EventHub.Data;
using EventHub.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Features.Events.Queries;

public record GetCategoriesQuery() : IRequest<List<Category>>;

public class GetCategoriesHandler : IRequestHandler<GetCategoriesQuery, List<Category>>
{
    private readonly ApplicationDbContext _context;

    public GetCategoriesHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Category>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Categories.ToListAsync(cancellationToken);
    }
}
