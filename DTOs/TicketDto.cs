namespace EventHub.DTOs;

public class TicketDto
{
    public int Id { get; set; }
    public string EventName { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string Venue { get; set; } = string.Empty;
    
    public string SeatSection { get; set; } = string.Empty;
    public string SeatRow { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;
    
    public decimal Price { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string Status { get; set; } = string.Empty;
}
