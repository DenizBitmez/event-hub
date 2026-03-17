using EventHub.DTOs;
using EventHub.Services;
using MediatR;

namespace EventHub.Features.Bookings.Commands;

public record BookTicketNaiveCommand(BookingRequest Request) : IRequest<BookingResponse>;

public class BookTicketNaiveHandler : IRequestHandler<BookTicketNaiveCommand, BookingResponse>
{
    private readonly IBookingService _bookingService;

    public BookTicketNaiveHandler(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    public async Task<BookingResponse> Handle(BookTicketNaiveCommand request, CancellationToken cancellationToken)
    {
        return await _bookingService.BookTicketAsync(request.Request);
    }
}
