using EventHub.Services;
using System.Threading.Tasks;

namespace EventHub.Jobs;

public class ReservationCleanupJob
{
    private readonly IReservationService _reservationService;
    private readonly ILogger<ReservationCleanupJob> _logger;

    public ReservationCleanupJob(IReservationService reservationService, ILogger<ReservationCleanupJob> logger)
    {
        _reservationService = reservationService;
        _logger = logger;
    }

    public async Task Cleanup()
    {
        _logger.LogInformation("Reservation cleanup job triggered at {Time}", DateTime.UtcNow);
        
        await Task.CompletedTask;
    }
}
