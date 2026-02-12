using System.Collections.Concurrent;

namespace EventHub.Services;

public class InMemoryReservationService : IReservationService
{
    // Key: "eventId:seatId", Value: (userId, expiryTime)
    private static readonly ConcurrentDictionary<string, (int UserId, DateTime Expiry)> _reservations = new();

    public Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId)
    {
        var key = $"{eventId}:{seatId}";
        var now = DateTime.UtcNow;

        if (_reservations.TryGetValue(key, out var checkV))
        {
            if (checkV.Expiry < now)
            {
                _reservations.TryRemove(key, out _);
            }
        }

        var success = _reservations.TryAdd(key, (userId, now.AddMinutes(10)));
        return Task.FromResult(success);
    }

    public Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId)
    {
        var key = $"{eventId}:{seatId}";
        if (_reservations.TryGetValue(key, out var val))
        {
            if (val.UserId == userId && val.Expiry > DateTime.UtcNow)
            {
                _reservations.TryRemove(key, out _);
                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }
}
