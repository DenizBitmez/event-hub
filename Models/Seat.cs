using System.ComponentModel.DataAnnotations;

namespace EventHub.Models;

public class Seat
{
    public int Id { get; set; }

    public int EventId { get; set; }
    public Event? Event { get; set; }

    [Required]
    public string Section { get; set; } = string.Empty; // e.g. "A", "Balcony"

    [Required]
    public string Row { get; set; } = string.Empty; // e.g. "1", "C"

    [Required]
    public string Number { get; set; } = string.Empty; // e.g. "12"

    // Status: "Available", "Sold", "Locked" (Held by Redis)
    // Note: In high-scale systems, "Locked" status is often ephemeral in Redis, 
    // but having a DB status can be useful for permanent blocks (VIP, Maintenance).
    public string Status { get; set; } = "Available"; 
}
