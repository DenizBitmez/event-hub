using System.ComponentModel.DataAnnotations;

namespace EventHub.Models;

public class Event
{
    public int Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    
    public decimal Price { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public int Capacity { get; set; } 
    
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    
    // Foreign Key
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    
    // Concurrency Token for Optimistic Locking
    [ConcurrencyCheck] 
    public Guid Version { get; set; } = Guid.NewGuid();
}
