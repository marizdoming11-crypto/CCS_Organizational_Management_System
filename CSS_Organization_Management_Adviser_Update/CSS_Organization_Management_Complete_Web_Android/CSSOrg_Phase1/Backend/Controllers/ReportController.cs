using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using CSSOrg.Models;

namespace CSSOrg.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class ReportController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReportController(AppDbContext db) => _db = db;

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] ReportDTO report)
    {
        if (report is null || string.IsNullOrWhiteSpace(report.Type)) return BadRequest(new { message = "Report type is required." });
        if (!new[] { "members", "officers" }.Contains(report.Type.Trim().ToLowerInvariant())) return BadRequest(new { message = "Report type must be members or officers." });
        if (!DateOnly.TryParse(report.StartDate, out var start) && !string.IsNullOrWhiteSpace(report.StartDate)) return BadRequest(new { message = "Start date must use yyyy-MM-dd." });
        if (!DateOnly.TryParse(report.EndDate, out var end) && !string.IsNullOrWhiteSpace(report.EndDate)) return BadRequest(new { message = "End date must use yyyy-MM-dd." });
        if (!string.IsNullOrWhiteSpace(report.StartDate) && !string.IsNullOrWhiteSpace(report.EndDate) && start > end) return BadRequest(new { message = "Start date cannot be after end date." });
        try
        {
            await using var conn = _db.GetConnection(); await conn.OpenAsync();
            var table = report.Type.Trim().Equals("officers", StringComparison.OrdinalIgnoreCase) ? "officers" : "members";
            var list = new List<object>();
            // Member/officer tables currently have created_at; apply selected date range to that field.
            var sql = $"SELECT full_name AS name, @label AS type, created_at AS date FROM {table} WHERE (@start IS NULL OR DATE(created_at) >= @start) AND (@end IS NULL OR DATE(created_at) <= @end) ORDER BY created_at DESC";
            await using (var cmd = new MySqlCommand(sql, conn))
            {
                cmd.Parameters.AddWithValue("@label", table == "members" ? "Member" : "Officer");
                object startValue = string.IsNullOrWhiteSpace(report.StartDate) ? DBNull.Value : start.ToDateTime(TimeOnly.MinValue);
                object endValue = string.IsNullOrWhiteSpace(report.EndDate) ? DBNull.Value : end.ToDateTime(TimeOnly.MaxValue);
                cmd.Parameters.AddWithValue("@start", startValue);
                cmd.Parameters.AddWithValue("@end", endValue);
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync()) list.Add(new { name = reader["name"].ToString(), type = reader["type"].ToString(), date = Convert.ToDateTime(reader["date"]).ToString("yyyy-MM-dd HH:mm") });
            }
            await using var insert = new MySqlCommand("INSERT INTO reports(type,start_date,end_date,total) VALUES(@type,@start,@end,@total)", conn);
            object reportStart = string.IsNullOrWhiteSpace(report.StartDate) ? DBNull.Value : start.ToDateTime(TimeOnly.MinValue);
            object reportEnd = string.IsNullOrWhiteSpace(report.EndDate) ? DBNull.Value : end.ToDateTime(TimeOnly.MinValue);
            insert.Parameters.AddWithValue("@type", table); insert.Parameters.AddWithValue("@start", reportStart); insert.Parameters.AddWithValue("@end", reportEnd); insert.Parameters.AddWithValue("@total", list.Count); await insert.ExecuteNonQueryAsync();
            return Ok(list);
        }
        catch (Exception) { return StatusCode(500, new { message = "Unable to generate report. Check the API and database logs." }); }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        try
        {
            await using var conn = _db.GetConnection(); await conn.OpenAsync();
            async Task<int> Count(string table) { await using var cmd = new MySqlCommand($"SELECT COUNT(*) FROM {table}", conn); return Convert.ToInt32(await cmd.ExecuteScalarAsync()); }
            return Ok(new { members = await Count("members"), officers = await Count("officers"), reports = await Count("reports") });
        }
        catch (Exception) { return StatusCode(500, new { message = "Unable to load report summary." }); }
    }
}
