namespace EventHub.DTOs;

public class ReserveRequest
{
    public int EventId { get; set; }
    public int SeatId { get; set; }
    public int UserId { get; set; } // Populated from Token
}

public class ConfirmBookingRequest
{
    public int EventId { get; set; }
    public int SeatId { get; set; }
    // Payment details would go here
}
public class ReserveMultipleRequest
{
    public int EventId { get; set; }
    public List<int> SeatIds { get; set; } = new();
}

public class ConfirmMultipleBookingRequest
{
    public int EventId { get; set; }
    public List<int> SeatIds { get; set; } = new();
}
