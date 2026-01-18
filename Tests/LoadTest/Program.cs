using System.Net.Http.Json;

Console.WriteLine("Starting Load Test...");

var client = new HttpClient();
var url = "http://localhost:5181/api/booking/redis";
var tasks = new List<Task<HttpResponseMessage>>();

int concurrency = 50; // Try to book 50 tickets simultaneously
Console.WriteLine($"Simulating {concurrency} users trying to book...");

// Start all requests at roughly the same time
for (int i = 0; i < concurrency; i++)
{
    // Need to capture loop variable if passing or just send body
    tasks.Add(client.PostAsJsonAsync(url, 1)); // EventID 1
}

await Task.WhenAll(tasks);

int successCount = 0;
int failCount = 0;
int busyCount = 0;

foreach (var t in tasks)
{
    var response = await t;
    if (response.IsSuccessStatusCode) successCount++;
    else if ((int)response.StatusCode == 429) busyCount++;
    else failCount++;
}

Console.WriteLine($"Total Requests: {concurrency}");
Console.WriteLine($"Successful Bookings (200 OK): {successCount}");
Console.WriteLine($"Server Busy (429 Redis Lock): {busyCount}");
Console.WriteLine($"Sold Out (400 Bad Request): {failCount}");
