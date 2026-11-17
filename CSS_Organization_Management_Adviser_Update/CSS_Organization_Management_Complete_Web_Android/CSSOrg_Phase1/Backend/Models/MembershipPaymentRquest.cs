
using System.ComponentModel.DataAnnotations;

public sealed class MembershipPaymentRequest
{
    [Range(1, int.MaxValue)]
    public int FeeId { get; set; }

    [Range(1, int.MaxValue)]
    public int MemberId { get; set; }

    [Range(typeof(decimal), "0.01", "999999.99")]
    public decimal AmountPaid { get; set; }

    [Required]
    [RegularExpression("^(Cash|GCash)$",
        ErrorMessage = "Payment method must be Cash or GCash.")]
    public string PaymentMethod { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    public DateTime PaymentDate { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
