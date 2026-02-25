namespace EventHub.Models;

public class HelpArticle
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Icon { get; set; } = "HelpCircle"; // Lucide icon name
}
