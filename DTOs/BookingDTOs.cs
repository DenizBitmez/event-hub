namespace EventHub.DTOs;

public class BookingRequest
{
    public int EventId { get; set; }
    public int UserId { get; set; } // Simplified user ID for this scenario
    public int Quantity { get; set; } = 1; // Default to 1 ticket
}

public class BookingResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? TicketId { get; set; }
    public int RemainingCapacity { get; set; }
}
