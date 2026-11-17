namespace CSSOrg.Models
{
    public class Report
    {
        public int Id { get; set; }

        public string Type { get; set; }

        public string? StartDate { get; set; }

        public string? EndDate { get; set; }

        public int Total { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}