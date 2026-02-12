namespace EventHub.DTOs;

public class SeatDto
{
    public int Id { get; set; }
    public string Section { get; set; } = string.Empty;
    public string Row { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string Status { get; set; } = "Available"; // Available, Sold, Locked, Reserved
    public decimal Price { get; set; }
}
