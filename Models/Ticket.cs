using System.ComponentModel.DataAnnotations;

namespace EventHub.Models;

public class Ticket
{
    public int Id { get; set; }
    
    public int EventId { get; set; }
    public Event? Event { get; set; }
    
    public int? UserId { get; set; }
    public User? User { get; set; }
    
    public string Status { get; set; } = "Confirmed"; // "Pending", "Confirmed", "Cancelled"
    
    public decimal PurchasePrice { get; set; } // Store price at time of booking
    
    public DateTime BookingDate { get; set; } = DateTime.UtcNow;
}
