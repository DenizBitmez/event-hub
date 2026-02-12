using System.ComponentModel.DataAnnotations;

namespace EventHub.Models;

public class Category
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public ICollection<Event> Events { get; set; } = new List<Event>();
}
