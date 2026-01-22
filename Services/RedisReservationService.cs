using StackExchange.Redis;

namespace EventHub.Services;

public interface IReservationService
{
    Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId);
    Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId);
}

public class RedisReservationService : IReservationService
{
    private readonly IConnectionMultiplexer _redis;
    private const int EXPIRATION_MINUTES = 10;

    public RedisReservationService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId)
    {
        var db = _redis.GetDatabase();
        var key = $"seat:{eventId}:{seatId}";
        var value = userId.ToString();

        // SET key value NX (Not Exists) EX (Expiration)
        // Only returns true if the key did NOT exist (meaning we got the lock)
        return await db.StringSetAsync(key, value, TimeSpan.FromMinutes(EXPIRATION_MINUTES), When.NotExists);
    }

    public async Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId)
    {
        var db = _redis.GetDatabase();
        var key = $"seat:{eventId}:{seatId}";
        var value = await db.StringGetAsync(key);

        if (value == userId.ToString())
        {
            // Lock held by this user.
            // In a real flow, we might delete it here OR explicitly set it to a "Permanent" key.
            // For now, we just verify ownership.
            // Deleting it is risky if the transaction fails later. 
            // Better to let it expire or delete AFTER DB commit.
            return true;
        }
        return false;
    }
}
