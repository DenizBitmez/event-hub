using EventHub.Services;
using MediatR;

namespace EventHub.Features.Events.Commands;

public record SyncEventsCommand(string? Keyword, string? Category) : IRequest<int>;

public class SyncEventsHandler : IRequestHandler<SyncEventsCommand, int>
{
    private readonly IEventSyncService _syncService;

    public SyncEventsHandler(IEventSyncService syncService)
    {
        _syncService = syncService;
    }

    public async Task<int> Handle(SyncEventsCommand request, CancellationToken cancellationToken)
    {
        return await _syncService.SyncEventsFromExternalApi(request.Keyword, request.Category);
    }
}
