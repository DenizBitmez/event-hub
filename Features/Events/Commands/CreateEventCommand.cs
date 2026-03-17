using EventHub.Data;
using EventHub.Models;
using MediatR;

namespace EventHub.Features.Events.Commands;

public record CreateEventCommand(Event EventItem) : IRequest<Event>;

public class CreateEventHandler : IRequestHandler<CreateEventCommand, Event>
{
    private readonly ApplicationDbContext _context;

    public CreateEventHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Event> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        var eventItem = request.EventItem;
        
        // Reset ID to ensure it's a new entry, and set default capacity if needed
        eventItem.Id = 0; 
        eventItem.Capacity = eventItem.Capacity > 0 ? eventItem.Capacity : 100;

        _context.Events.Add(eventItem);
        await _context.SaveChangesAsync(cancellationToken);

        return eventItem;
    }
}
