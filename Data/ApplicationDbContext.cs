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
    public DbSet<Category> Categories { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Seed Category
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Concerts", Description = "Live music events" }
        );

        // Seed Event
        modelBuilder.Entity<Event>().HasData(
            new Event 
            { 
                Id = 1, 
                Name = "High Demand Concert", 
                Description = "The biggest event of the year",
                Location = "Stadium Arena",
                Price = 100,
                Capacity = 10, 
                StartDate = DateTime.UtcNow.AddDays(10), 
                EndDate = DateTime.UtcNow.AddDays(10).AddHours(3),
                CategoryId = 1,
                Version = Guid.NewGuid() 
            }
        );

        // Seed Test User
        modelBuilder.Entity<User>().HasData(
            new User 
            { 
                Id = 1, 
                FullName = "Test User", 
                Email = "test@example.com", 
                PasswordHash = "hashed_secret", 
                Role = "User"
            },
            new User 
            { 
                Id = 2, 
                FullName = "Admin User", 
                Email = "admin@eventhub.com", 
                PasswordHash = "admin123", 
                Role = "Admin"
            }
        );
    }
}
