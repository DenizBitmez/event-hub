using EventHub.DTOs;
using EventHub.Services;
using MediatR;

namespace EventHub.Features.Bookings.Commands;

public record CancelTicketCommand(int TicketId, int UserId) : IRequest<BookingResponse>;

public class CancelTicketHandler : IRequestHandler<CancelTicketCommand, BookingResponse>
{
    private readonly IBookingService _bookingService;

    public CancelTicketHandler(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    public async Task<BookingResponse> Handle(CancelTicketCommand request, CancellationToken cancellationToken)
    {
        // Internal check could be added here to verify that the ticket actually belongs to request.UserId
        // For now, keeping the existing service-level logic
        return await _bookingService.CancelTicketAsync(request.TicketId);
    }
}
