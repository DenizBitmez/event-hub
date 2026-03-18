using Microsoft.Extensions.Diagnostics.HealthChecks;
using Stripe;
using System.Threading;
using System.Threading.Tasks;

namespace EventHub.Health;

public class StripeHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public StripeHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var apiKey = _configuration["STRIPE_SECRET_KEY"] ?? System.Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
            if (string.IsNullOrEmpty(apiKey))
            {
                return HealthCheckResult.Unhealthy("Stripe Secret Key is missing in environment variables.");
            }

            // Simple check: list one product
            var service = new ProductService();
            await service.ListAsync(new ProductListOptions { Limit = 1 }, cancellationToken: cancellationToken);

            return HealthCheckResult.Healthy("Stripe API is reachable.");
        }
        catch (System.Exception ex)
        {
            return new HealthCheckResult(context.Registration.FailureStatus, $"Stripe Check Failed: {ex.Message}", ex);
        }
    }
}
