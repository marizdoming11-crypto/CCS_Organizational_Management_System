using System.ComponentModel.DataAnnotations;

public sealed class MemberDTO
{
    [Required, StringLength(150)] public string Name { get; set; } = string.Empty;
    [Required, StringLength(100)] public string YearSection { get; set; } = string.Empty;
    [Required, StringLength(255)] public string Address { get; set; } = string.Empty;
    [Required, StringLength(30)] public string ContactNumber { get; set; } = string.Empty;
}
