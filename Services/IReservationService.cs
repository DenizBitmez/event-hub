namespace EventHub.Services;

public interface IReservationService
{
    Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId);
    Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId);
}
