using EventHub.Models;

namespace EventHub.Services;

public interface IEventSyncService
{
    Task<int> SyncEventsFromExternalApi(string? keyword = null, string? segmentName = null);
}
