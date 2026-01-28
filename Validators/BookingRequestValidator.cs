using FluentValidation;
using EventHub.DTOs;

namespace EventHub.Validators;

public class BookingRequestValidator : AbstractValidator<BookingRequest>
{
    public BookingRequestValidator()
    {
        RuleFor(x => x.EventId)
            .GreaterThan(0).WithMessage("EventId must be valid.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be at least 1.")
            .LessThanOrEqualTo(10).WithMessage("You can book at most 10 tickets at a time.");
            
        // UserId is set from Token usually, but if DTO has it, validate it only if provided
        // But in Controller we overwrite it. So validation might be redundant for UserId if it's ignored.
        // RuleFor(x => x.UserId)... 
    }
}
