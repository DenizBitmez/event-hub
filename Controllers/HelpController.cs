using EventHub.Data;
using EventHub.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Asp.Versioning;

namespace EventHub.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class HelpController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public HelpController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetHelpArticles()
    {
        var articles = await _context.HelpArticles.ToListAsync();
        var grouped = articles.GroupBy(a => a.Category)
            .Select(g => new {
                Category = g.Key,
                Icon = g.First().Icon,
                Articles = g.Select(a => new { a.Id, a.Title, a.Content }).ToList()
            });
        return Ok(grouped);
    }
}
