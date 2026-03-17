using EventHub.Data;
using EventHub.DTOs;
using EventHub.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Features.Bookings.Commands;

public record ConfirmPaymentCommand(int EventId, List<int> SeatIds, int UserId) : IRequest<BookingResponse>;

public class ConfirmPaymentHandler : IRequestHandler<ConfirmPaymentCommand, BookingResponse>
{
    private readonly ApplicationDbContext _context;
    private readonly IBookingService _bookingService;
    private readonly IEmailService _emailService;

    public ConfirmPaymentHandler(ApplicationDbContext context, IBookingService bookingService, IEmailService emailService)
    {
        _context = context;
        _bookingService = bookingService;
        _emailService = emailService;
    }

    public async Task<BookingResponse> Handle(ConfirmPaymentCommand request, CancellationToken cancellationToken)
    {
        // 1. Finalize Bookings
        var bookingRequest = new BookingRequest 
        { 
            EventId = request.EventId, 
            Quantity = request.SeatIds.Count, 
            UserId = request.UserId 
        };
        
        var result = await _bookingService.BookSeatsAsync(bookingRequest, request.SeatIds);
        
        if (result.Success)
        {
            await SendConfirmationEmail(request.UserId, request.EventId, request.SeatIds);
        }
        
        return result;
    }

    private async Task SendConfirmationEmail(int userId, int eventId, List<int> seatIds)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return;

        var eventDetails = await _context.Events.FindAsync(eventId);
        var seats = await _context.Seats.Where(s => seatIds.Contains(s.Id)).ToListAsync();
        string seatNames = string.Join(", ", seats.Select(s => $"Row {s.Row}-{s.Number}"));
        
        string emailBody = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
            <h2 style='color: #ea580c; text-align: center;'>Your Ticket is Confirmed! 🎟️</h2>
            <p>Hi {user.FullName},</p>
            <p>Thank you for your purchase. Here are your booking details:</p>
            <div style='background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                <p><strong>Event:</strong> {eventDetails?.Name}</p>
                <p><strong>Venue:</strong> {eventDetails?.Venue}</p>
                <p><strong>Date:</strong> {eventDetails?.StartDate.ToShortDateString()}</p>
                <p><strong>Seats:</strong> {seatNames}</p>
            </div>
            <p style='text-align: center;'>
                <a href='http://localhost:5173/my-bookings' style='background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;'>View and Download PDF Ticket</a>
            </p>
            <p style='color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px;'>&copy; 2026 EventHub. All rights reserved.</p>
        </div>";
        
        await _emailService.SendEmailAsync(user.Email ?? "test@example.com", $"Your Ticket for {eventDetails?.Name}", emailBody);
    }
}
