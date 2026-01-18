using EventHub.Models;
using Microsoft.EntityFrameworkCore;

namespace EventHub.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Event> Events { get; set; }
    public DbSet<Ticket> Tickets { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Seed an example event
        modelBuilder.Entity<Event>().HasData(
            new Event { Id = 1, Name = "High Demand Concert", Capacity = 10, Date = DateTime.UtcNow.AddDays(10), Version = Guid.NewGuid() }
        );
    }
}
