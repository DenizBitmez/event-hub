using Microsoft.AspNetCore.SignalR;

namespace EventHub.Hubs;

public class SeatHub : Hub
{
    // Clients will join a group for a specific event to listen to seat updates
    public async Task JoinEventGroup(string eventId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Event_{eventId}");
    }

    public async Task LeaveEventGroup(string eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Event_{eventId}");
    }
}
