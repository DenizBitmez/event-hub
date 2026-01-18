using System.ComponentModel.DataAnnotations;

namespace EventHub.Models;

public class Event
{
    public int Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public int Capacity { get; set; } // Total tickets initially available
    
    public DateTime Date { get; set; }
    
    // Concurrency Token for Optimistic Locking
    [ConcurrencyCheck] 
    public Guid Version { get; set; } = Guid.NewGuid();
}
