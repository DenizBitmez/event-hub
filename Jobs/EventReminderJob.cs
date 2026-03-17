using EventHub.Data;
using EventHub.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using EventHub.Models.Enums;

namespace EventHub.Jobs;

public class EventReminderJob
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public EventReminderJob(ApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task SendReminders()
    {
        var tomorrow = DateTime.UtcNow.AddDays(1);
        var tomorrowEnd = tomorrow.AddHours(1); // Hourly window to check

        var upcomingEvents = await _context.Events
            .Where(e => e.StartDate >= tomorrow && e.StartDate <= tomorrowEnd && e.IsActive)
            .ToListAsync();

        foreach (var ev in upcomingEvents)
        {
            var usersToNotify = await _context.Tickets
                .Where(t => t.EventId == ev.Id && t.Status == TicketStatus.Confirmed)
                .Select(t => t.User)
                .Distinct()
                .ToListAsync();

            foreach (var user in usersToNotify)
            {
                if (user == null || string.IsNullOrEmpty(user.Email)) continue;

                string emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                        <h2 style='color: #ea580c; text-align: center;'>Reminder: {ev.Name} is Tomorrow! 📅</h2>
                        <p>Hi {user.FullName},</p>
                        <p>This is a friendly reminder that the event you've booked for starts in 24 hours.</p>
                        <div style='background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                            <p><strong>Event:</strong> {ev.Name}</p>
                            <p><strong>Location:</strong> {ev.Location}</p>
                            <p><strong>Start Time:</strong> {ev.StartDate.ToString("f")}</p>
                        </div>
                        <p>Don't forget to have your digital ticket ready in the app!</p>
                        <p style='color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px;'>&copy; 2026 EventHub. All rights reserved.</p>
                    </div>";

                await _emailService.SendEmailAsync(user.Email, $"Reminder: {ev.Name} starts tomorrow!", emailBody);
            }
        }
    }
}
