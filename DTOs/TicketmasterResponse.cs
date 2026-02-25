namespace EventHub.DTOs.Ticketmaster;

public class TicketmasterResponse
{
    public EmbeddedEvents? _embedded { get; set; }
}

public class EmbeddedEvents
{
    public List<TicketmasterEvent>? events { get; set; }
}

public class TicketmasterEvent
{
    public string id { get; set; } = string.Empty;
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public string? info { get; set; }
    public string? pleaseNote { get; set; }
    public string? url { get; set; }
    public List<TicketmasterImage>? images { get; set; }
    public TicketmasterDates? dates { get; set; }
    public List<TicketmasterClassification>? classifications { get; set; }
    public EmbeddedVenues? _embedded { get; set; }
    public List<PriceRange>? priceRanges { get; set; }
}

public class TicketmasterImage
{
    public string url { get; set; } = string.Empty;
    public int width { get; set; }
    public int height { get; set; }
}

public class TicketmasterDates
{
    public StartDate? start { get; set; }
}

public class StartDate
{
    public string localDate { get; set; } = string.Empty;
    public string localTime { get; set; } = string.Empty;
    public DateTime dateTime { get; set; }
}

public class TicketmasterClassification
{
    public Segment? segment { get; set; }
    public Genre? genre { get; set; }
}

public class Segment { public string name { get; set; } = string.Empty; }
public class Genre { public string name { get; set; } = string.Empty; }

public class EmbeddedVenues
{
    public List<TicketmasterVenue>? venues { get; set; }
}

public class TicketmasterVenue
{
    public string name { get; set; } = string.Empty;
    public City? city { get; set; }
}

public class City { public string name { get; set; } = string.Empty; }

public class PriceRange
{
    public decimal min { get; set; }
    public decimal max { get; set; }
}
