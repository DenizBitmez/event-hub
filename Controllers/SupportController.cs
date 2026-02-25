using EventHub.Data;
using EventHub.Models;
using EventHub.Services;
using Microsoft.AspNetCore.Mvc;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public SupportController(ApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> SubmitRequest([FromBody] SupportRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        request.CreatedAt = DateTime.UtcNow;
        request.Status = "Pending";

        _context.SupportRequests.Add(request);
        await _context.SaveChangesAsync();

        // Send Confirmation to User
        string userBody = $@"
            <h2>Hello {request.Name},</h2>
            <p>Thank you for reaching out to EventHub support team.</p>
            <p>We have received your message regarding: <strong>{request.Subject}</strong></p>
            <p>Our team will review it and get back to you shortly.</p>
            <br/>
            <p>Best regards,<br/>EventHub Team</p>";
        
        await _emailService.SendEmailAsync(request.Email, "We received your support request - EventHub", userBody);

        // Notify Admin (Mocking admin email)
        string adminBody = $@"
            <h2>New Support Request!</h2>
            <p><strong>From:</strong> {request.Name} ({request.Email})</p>
            <p><strong>Subject:</strong> {request.Subject}</p>
            <p><strong>Message:</strong></p>
            <p>{request.Message}</p>
            <br/>
            <p><a href='http://localhost:5173/admin/tickets'>View in Admin Panel</a></p>";

        await _emailService.SendEmailAsync("admin@eventhub.com", $"[Support] {request.Subject}", adminBody);

        return Ok(new { message = "Support request submitted successfully", requestId = request.Id });
    }
}
