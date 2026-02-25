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

        // Clean up expired (lazy cleanup on access, simplistic for demo)
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

    public async Task<bool> ReserveSeatsAsync(int eventId, List<int> seatIds, int userId)
    {
        // Try to reserve all. If one fails, we should ideally rollback others for a "real" system, 
        // but for this demo concurrent dictionary, we'll just try to add all and return false if any fails.
        foreach (var seatId in seatIds)
        {
            var success = await ReserveSeatAsync(eventId, seatId, userId);
            if (!success) return false; 
        }
        return true;
    }

    public Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId)
    {
        var key = $"{eventId}:{seatId}";
        if (_reservations.TryGetValue(key, out var val))
        {
            if (val.UserId == userId && val.Expiry > DateTime.UtcNow)
            {
                // Optionally remove here or let BookingService handle it?
                // Usually we keep it until booked, or remove it. 
                // Let's remove it to "consume" the reservation.
                _reservations.TryRemove(key, out _);
                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public async Task<bool> ConfirmReservationsAsync(int eventId, List<int> seatIds, int userId)
    {
        foreach (var seatId in seatIds)
        {
            var success = await ConfirmReservationAsync(eventId, seatId, userId);
            if (!success) return false;
        }
        return true;
    }
}
