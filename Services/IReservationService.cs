namespace EventHub.Services;

public interface IReservationService
{
    Task<bool> ReserveSeatAsync(int eventId, int seatId, int userId);
    Task<bool> ConfirmReservationAsync(int eventId, int seatId, int userId);

    Task<bool> ReserveSeatsAsync(int eventId, List<int> seatIds, int userId);
    Task<bool> ConfirmReservationsAsync(int eventId, List<int> seatIds, int userId);
}
