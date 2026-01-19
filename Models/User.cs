using System.ComponentModel.DataAnnotations;

namespace EventHub.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty; // Storing hashed passwords

    [Required]
    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = "User"; // "Admin", "User"

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
