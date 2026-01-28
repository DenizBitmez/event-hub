using EventHub.Data;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Microsoft.OpenApi.Models;
using EventHub.Middleware;
using FluentValidation;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

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

builder.Services.AddValidatorsFromAssemblyContaining<Program>();


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
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EventHub API", Version = "v1" });
    
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
// Add Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis") ?? "localhost"));

builder.Services.AddScoped<EventHub.Services.IBookingService, EventHub.Services.BookingService>();
builder.Services.AddScoped<EventHub.Services.IJwtService, EventHub.Services.JwtService>();
builder.Services.AddScoped<EventHub.Services.IReservationService, EventHub.Services.RedisReservationService>();

// 1.2 Authentication & Authorization
var jwtKey = builder.Configuration["Jwt:Key"] ?? "super_secret_key_that_is_long_enough_for_hmac_sha256";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
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
    app.UseSwaggerUI();
}

app.UseAuthentication(); // <--- Added
app.UseAuthorization();

app.UseRateLimiter(); // <--- Rate Limiting Middleware

app.MapControllers();

// Apply Migrations at Startup
using (var scope = app.Services.CreateScope())
{

    // var outputConn = builder.Configuration.GetConnectionString("DefaultConnection");
    // Console.WriteLine($"DEBUG: ConnectionString: {outputConn}");
    
    // var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    
    // EnsureCreated() works for prototypes, but Migrate() is better for real apps.
    // For this demo, EnsureCreated is fine.
    // For this demo, we reset the DB to ensure schema is up to date
    /*
    try 
    {
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DEBUG: DB Init Failed: {ex.Message}");
    }
    */
}


app.Run();
