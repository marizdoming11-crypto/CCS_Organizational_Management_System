using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

public sealed class OfficerDTO
{
    [Required, StringLength(150)] public string Name { get; set; } = string.Empty;
    [Required, StringLength(100)] public string Position { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = string.Empty;
    [Required, StringLength(30)] public string Contact { get; set; } = string.Empty;
    public IFormFile? Image { get; set; }
}
