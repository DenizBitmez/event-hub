using System.ComponentModel.DataAnnotations;
using EventHub.Models.Enums;

namespace EventHub.Models;

public class Ticket
{
    public int Id { get; set; }
    
    public int EventId { get; set; }
    public Event? Event { get; set; }
    
    public int? UserId { get; set; }
    public User? User { get; set; }
    
    public TicketStatus Status { get; set; } = TicketStatus.Confirmed; // "Pending", "Confirmed", "Cancelled"
    
    public decimal PurchasePrice { get; set; } // Store price at time of booking
    
    public DateTime BookingDate { get; set; } = DateTime.UtcNow;

    public int? SeatId { get; set; }
    public Seat? Seat { get; set; }
}
