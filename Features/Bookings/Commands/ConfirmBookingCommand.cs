using EventHub.DTOs;
using EventHub.Services;
using MediatR;

namespace EventHub.Features.Bookings.Commands;

public record ConfirmBookingCommand(int EventId, List<int> SeatIds, int UserId) : IRequest<BookingResponse>;

public class ConfirmBookingHandler : IRequestHandler<ConfirmBookingCommand, BookingResponse>
{
    private readonly IBookingService _bookingService;
    private readonly IReservationService _reservationService;

    public ConfirmBookingHandler(IBookingService bookingService, IReservationService reservationService)
    {
        _bookingService = bookingService;
        _reservationService = reservationService;
    }

    public async Task<BookingResponse> Handle(ConfirmBookingCommand request, CancellationToken cancellationToken)
    {
        // 1. Verify Reservations (Redis)
        var hasReservations = await _reservationService.ConfirmReservationsAsync(request.EventId, request.SeatIds, request.UserId);
        if (!hasReservations)
        {
            return new BookingResponse { Success = false, Message = "One or more reservations expired or are invalid" };
        }

        // 2. Finalize Booking (DB)
        var bookingRequest = new BookingRequest 
        { 
            EventId = request.EventId, 
            Quantity = request.SeatIds.Count, 
            UserId = request.UserId 
        };
        
        return await _bookingService.BookSeatsAsync(bookingRequest, request.SeatIds);
    }
}
