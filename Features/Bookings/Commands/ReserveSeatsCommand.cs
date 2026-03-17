using EventHub.Services;
using MediatR;

namespace EventHub.Features.Bookings.Commands;

public record ReserveSeatsCommand(int EventId, List<int> SeatIds, int UserId) : IRequest<bool>;

public class ReserveSeatsHandler : IRequestHandler<ReserveSeatsCommand, bool>
{
    private readonly IReservationService _reservationService;

    public ReserveSeatsHandler(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    public async Task<bool> Handle(ReserveSeatsCommand request, CancellationToken cancellationToken)
    {
        // Use the plural version of the service call
        return await _reservationService.ReserveSeatsAsync(request.EventId, request.SeatIds, request.UserId);
    }
}
