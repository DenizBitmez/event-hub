using System.Text.Json.Serialization;

namespace EventHub.Models.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TicketStatus
{
    Pending,
    Confirmed,
    Cancelled,
    Sold
}
