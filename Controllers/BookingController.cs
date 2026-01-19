using EventHub.DTOs;
using EventHub.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>
    /// Books a ticket for an event securely handling high concurrency.
    /// </summary>
    [HttpPost]
    [Authorize] // <--- Require Login
    public async Task<IActionResult> BookTicket([FromBody] BookingRequest request)
    {
        if (request.Quantity <= 0)
        {
            return BadRequest("Quantity must be greater than 0.");
        }

        // SECURE: Get User ID from Token, don't trust the client body
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        request.UserId = int.Parse(userIdClaim.Value);

        try
        {
            var response = await _bookingService.BookTicketAsync(request);

            if (response.Success)
            {
                return Ok(response);
            }
            else
            {
                // If Sold Out or other logic failure, return 409 Conflict or 400 BadRequest
                // 409 Conflict is often semantic for "State didn't allow this" (e.g. sold out during race)
                if (response.Message.Contains("Sold Out"))
                {
                    return Conflict(response); 
                }
                return BadRequest(response);
            }
        }
        catch (Exception ex)
        {
            // Logged in Service, but return generic 500 here
            return StatusCode(500, "An internal error occurred while processing your booking.");
        }
    }

    [HttpPost("reset")]
    public IActionResult ResetStub()
    {
       // Ideally this should be a dev-only endpoint or handled via a separate AdminService.
       // For now, I'm removing the inline implementation to separate concerns, 
       // but if we need it for testing, we can re-add or put back in a TestController.
       return StatusCode(501, "Reset functionality moved to direct DB access or Admin API for security.");
    }
}
