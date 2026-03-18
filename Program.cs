using EventHub.Data;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Microsoft.OpenApi.Models;
using EventHub.Middleware;
using FluentValidation;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

using Serilog;
using EventHub.Services;
using EventHub.Models;
using Hangfire;
using Hangfire.PostgreSql;
using EventHub.Jobs;
using Asp.Versioning;

// Load .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add environment variables to configuration so we can read them
builder.Configuration.AddEnvironmentVariables();

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

// Disable legacy claim mapping to ensure NameIdentifier is not overwritten by 'sub'
System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Host.UseSerilog();

// Add Rate Limiter
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = System.Threading.RateLimiting.PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Request.Headers.Host.ToString(),
            factory: partition => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 10,
                QueueLimit = 0,
                Window = TimeSpan.FromSeconds(1)
            });
    });
    
    options.RejectionStatusCode = 429;
});

// Add services to the container.
// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// 1. Add API Versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("x-api-version"),
        new QueryStringApiVersionReader("api-version")
    );
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// Add SignalR Configuration
builder.Services.AddSignalR();

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Register MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options => 
    {
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"));
    }));

// Add the processing server as IHostedService
builder.Services.AddHangfireServer();


// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// 1. Database Context (PostgreSQL)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptionsAction: sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorCodesToAdd: null);
        }));

// Add Swagger/OpenAPI with JWT Support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Hardcode v1 for now, but in a real app we'd iterate through provider descriptions
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EventHub API", Version = "v1" });
    c.SwaggerDoc("v2", new OpenApiInfo { Title = "EventHub API", Version = "v2" });
    
    // Add JWT Authentication Support to Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});



// 1.1 Register Booking Service
builder.Services.AddScoped<EventHub.Services.IBookingService, EventHub.Services.BookingService>();
builder.Services.AddScoped<EventHub.Services.IJwtService, EventHub.Services.JwtService>();
builder.Services.AddScoped<EventHub.Services.IEmailService, EventHub.Services.EmailService>();

// Use Redis for distributed seat locks and reservations
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisConnectionString));
builder.Services.AddSingleton<EventHub.Services.IReservationService, EventHub.Services.RedisReservationService>();

builder.Services.AddScoped<EventHub.Services.EventSeederService>();
builder.Services.AddScoped<IEventSyncService, TicketmasterSyncService>();
builder.Services.AddHttpClient<TicketmasterSyncService>();

// 1.2 Authentication & Authorization
var jwtKey = builder.Configuration["Jwt:Key"] ?? "super_secret_key_that_is_long_enough_for_hmac_sha256";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = false; // Prevent mapping 'sub' to NameIdentifier
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "EventHub",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "EventHubUsers",
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtKey))
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    // app.MapOpenApi(); // Using Swashbuckle instead
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        options.SwaggerEndpoint("/swagger/v2/swagger.json", "v2");
    });
}

app.UseCors("AllowFrontend");

app.UseAuthorization();

// Add Hangfire Dashboard
app.UseHangfireDashboard();

app.UseRateLimiter(); // <--- Rate Limiting Middleware

app.MapControllers();
app.MapHub<EventHub.Hubs.SeatHub>("/hubs/seats");

// Schedule Background Jobs
using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobManager.AddOrUpdate<EventReminderJob>("daily-event-reminder", x => x.SendReminders(), Cron.Hourly); // Running hourly to check for next 24h window
    recurringJobManager.AddOrUpdate<ReservationCleanupJob>("reservation-cleanup", x => x.Cleanup(), Cron.Daily);
}

// Apply Migrations at Startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        db.Database.Migrate(); // Ensure DB is up to date
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Migration Failed: {ex.Message}");
        Log.Error(ex, "Database Migration Failed");
        throw; // Re-throw to stop startup if DB is critical
    }

    // Seed Help Articles
    try
    {
        if (!await db.HelpArticles.AnyAsync())
        {
            var helpArticles = new List<HelpArticle>
            {
                new HelpArticle { Category = "Booking", Title = "How to book a ticket?", Content = "To book a ticket, navigate to the event details page, select your preferred seats from the interactive map, and click 'Reserve'. Once reserved, you have 10 minutes to confirm your purchase.", Icon = "Ticket" },
                new HelpArticle { Category = "Booking", Title = "Can I book multiple seats?", Content = "Yes, you can select multiple seats at once. The total price will be displayed in your booking summary before you confirm.", Icon = "Users" },
                new HelpArticle { Category = "Payments", Title = "Supported payment methods", Content = "We currently support all major credit and debit cards. Your payment is processed securely through our encrypted payment gateway.", Icon = "CreditCard" },
                new HelpArticle { Category = "Refunds", Title = "Refund Policy", Content = "Tickets are generally non-refundable unless the event is cancelled or rescheduled. Please contact our support team for specific inquiries.", Icon = "RefreshCw" },
                new HelpArticle { Category = "Account", Title = "Resetting your password", Content = "If you've forgotten your password, go to the login page and click 'Forgot Password' to receive a reset link via email.", Icon = "Lock" }
            };
            db.HelpArticles.AddRange(helpArticles);
            await db.SaveChangesAsync();
            Console.WriteLine("Help Articles Seeded Successfully");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Help Seeding Failed: {ex.Message}");
    }
}


app.Run();
