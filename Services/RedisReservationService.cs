using StackExchange.Redis;
using Polly;

namespace EventHub.Services;

public interface IReservationService
{
    Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId);
    Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId);
}

public class RedisReservationService : IReservationService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly Polly.Retry.AsyncRetryPolicy _retryPolicy;
    private const int EXPIRATION_MINUTES = 10;

    public RedisReservationService(IConnectionMultiplexer redis)
    {
        _redis = redis;
        // Retry 3 times with exponential backoff on connection errors
        _retryPolicy = Polly.Policy
            .Handle<RedisConnectionException>()
            .Or<RedisTimeoutException>()
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }

    public async Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId)
    {
        return await _retryPolicy.ExecuteAsync(async () => 
        {
            var db = _redis.GetDatabase();
            var key = $"seat:{eventId}:{seatId}";
            var value = userId.ToString();

            // SET key value NX (Not Exists) EX (Expiration)
            // Only returns true if the key did NOT exist (meaning we got the lock)
            return await db.StringSetAsync(key, value, TimeSpan.FromMinutes(EXPIRATION_MINUTES), When.NotExists);
        });
    }

    public async Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId)
    {
        return await _retryPolicy.ExecuteAsync(async () => 
        {
            var db = _redis.GetDatabase();
            var key = $"seat:{eventId}:{seatId}";
            var value = await db.StringGetAsync(key);

            if (value == userId.ToString())
            {
                // Lock held by this user.
                return true;
            }
            return false;
        });
    }
}
