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
    public DbSet<Seat> Seats { get; set; }
    public DbSet<HelpArticle> HelpArticles { get; set; }
    public DbSet<SupportRequest> SupportRequests { get; set; }

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
                StartDate = new DateTime(2026, 6, 1, 20, 0, 0, DateTimeKind.Utc), 
                EndDate = new DateTime(2026, 6, 1, 23, 0, 0, DateTimeKind.Utc),
                CategoryId = 1,
                Version = Guid.Parse("550e8400-e29b-41d4-a716-446655440000") 
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

        // Seed Seats (Stadium Layout)
        var seats = new List<Seat>();
        int seatId = 1;
        for (int row = 1; row <= 2; row++) // 2 Rows
        {
            for (int num = 1; num <= 5; num++) // 5 Seats per row
            {
                seats.Add(new Seat 
                { 
                    Id = seatId++, 
                    EventId = 1, 
                    Section = "A", 
                    Row = row.ToString(), 
                    Number = num.ToString(), 
                    Status = "Available" 
                });
            }
        }
        modelBuilder.Entity<Seat>().HasData(seats);
    }
}
