
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;

[ApiController]
[Route("api/workspace")]
[Authorize]
public sealed class WorkspaceController : ControllerBase
{
    private readonly AppDbContext _db;
    public WorkspaceController(AppDbContext db) => _db = db;

    private sealed record ModuleInfo(string Table, string[] Fields, string[] WriteRoles);
    private static readonly Dictionary<string, ModuleInfo> Modules = new(StringComparer.OrdinalIgnoreCase)
    {
       ["members"] = new("members", new[] { "first_name", "middle_name", "last_name", "year_section", "address", "contact" }, new[] { "Adviser" }),
        ["officers"] = new("officers", new[] { "full_name","member_id","position","email","contact","profile_image" }, new[] { "Adviser" }),
        ["events"] = new("events", new[] { "title","description","event_date","start_time","end_time","location","status" }, new[] { "Adviser" }),
        ["attendance"] = new("attendance", new[] { "event_id","member_id","member_name","attendance_status","remarks","attendance_date" }, new[] { "Adviser" }),
        ["finance"] = new("finance_records", new[] { "record_type","category","description","amount","transaction_date","reference_no" }, new[] { "Adviser" }),
        ["activity-logs"] = new("activity_logs", new[] { "user_id","username","action","module","details" }, Array.Empty<string>())
    };

    private string CurrentRole => User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Member";
    private int CurrentUserId => int.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;
    private bool CanWrite(ModuleInfo info) => info.WriteRoles.Contains(CurrentRole, StringComparer.OrdinalIgnoreCase);

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        await using var conn = _db.GetConnection(); await conn.OpenAsync();
        var result = new Dictionary<string, int>();
        foreach (var item in new[] { ("members","members"),("officers","officers"),("events","events"),("attendance","attendance"),("finance","finance_records") })
        {
            await using var cmd = new MySqlCommand($"SELECT COUNT(*) FROM `{item.Item2}`", conn);
            try { result[item.Item1] = Convert.ToInt32(await cmd.ExecuteScalarAsync()); }
            catch (MySqlException) { result[item.Item1] = 0; }
        }
        return Ok(result);
    }

    [HttpGet("{module}")]
    public async Task<IActionResult> List(string module)
    {
        if (!Modules.TryGetValue(module, out var info)) return NotFound(new { message = "Unknown module." });
        await using var conn = _db.GetConnection(); await conn.OpenAsync();
        await using var cmd = new MySqlCommand($"SELECT * FROM `{info.Table}` ORDER BY id DESC LIMIT 500", conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        var rows = new List<Dictionary<string, object?>>();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>();
            for (var i=0; i<reader.FieldCount; i++) row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            rows.Add(row);
        }
        return Ok(rows);
    }

    // Save one attendance sheet for a selected event. Existing event/officer rows are updated,
    // so pressing Save again will not create duplicate attendance records.
    public sealed record AttendanceEntry(int MemberId, string MemberName, bool IsPresent, string? Remarks);

    public sealed record AttendanceSheetRequest(int EventId, string AttendanceDate, List<AttendanceEntry> Officers);

    [HttpPost("attendance/sheet")]
    public async Task<IActionResult> SaveAttendanceSheet([FromBody] AttendanceSheetRequest request)
    {
        if (!string.Equals(CurrentRole, "Adviser", StringComparison.OrdinalIgnoreCase))
            return Forbid();

        if (request.EventId <= 0 || request.Officers == null || request.Officers.Count == 0)
            return BadRequest(new { message = "Choose an event and load at least one officer." });

        if (!DateTime.TryParse(request.AttendanceDate, out var attendanceDate))
            return BadRequest(new { message = "A valid attendance date is required." });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            foreach (var officer in request.Officers)
            {
                if (officer.MemberId <= 0 || string.IsNullOrWhiteSpace(officer.MemberName))
                    continue;

                // Check first rather than relying on UPDATE's affected-row count:
                // MySQL may report zero when an existing row already has the same values.
                await using var exists = new MySqlCommand(
                    "SELECT COUNT(*) FROM attendance WHERE event_id=@eventId AND member_id=@memberId",
                    conn, (MySqlTransaction)tx);
                exists.Parameters.AddWithValue("@eventId", request.EventId);
                exists.Parameters.AddWithValue("@memberId", officer.MemberId);
                var alreadyExists = Convert.ToInt32(await exists.ExecuteScalarAsync()) > 0;

                if (alreadyExists)
                {
                    await using var update = new MySqlCommand(
                        @"UPDATE attendance
                          SET member_name=@name, attendance_status=@status, remarks=@remarks, attendance_date=@date
                          WHERE event_id=@eventId AND member_id=@memberId", conn, (MySqlTransaction)tx);
                    update.Parameters.AddWithValue("@name", officer.MemberName.Trim());
                    update.Parameters.AddWithValue("@status", officer.IsPresent ? "Present" : "Absent");
                    update.Parameters.AddWithValue("@remarks", (object?)officer.Remarks ?? DBNull.Value);
                    update.Parameters.AddWithValue("@date", attendanceDate.Date);
                    update.Parameters.AddWithValue("@eventId", request.EventId);
                    update.Parameters.AddWithValue("@memberId", officer.MemberId);
                    await update.ExecuteNonQueryAsync();
                }
                else
                {
                    await using var insert = new MySqlCommand(
                        @"INSERT INTO attendance
                          (event_id, member_id, member_name, attendance_status, remarks, attendance_date)
                          VALUES (@eventId, @memberId, @name, @status, @remarks, @date)", conn, (MySqlTransaction)tx);
                    insert.Parameters.AddWithValue("@eventId", request.EventId);
                    insert.Parameters.AddWithValue("@memberId", officer.MemberId);
                    insert.Parameters.AddWithValue("@name", officer.MemberName.Trim());
                    insert.Parameters.AddWithValue("@status", officer.IsPresent ? "Present" : "Absent");
                    insert.Parameters.AddWithValue("@remarks", (object?)officer.Remarks ?? DBNull.Value);
                    insert.Parameters.AddWithValue("@date", attendanceDate.Date);
                    await insert.ExecuteNonQueryAsync();
                }
            }

            await tx.CommitAsync();
            await LogAsync(conn, $"Saved attendance for event #{request.EventId}", "attendance");
            return Ok(new { message = "Attendance saved successfully.", eventId = request.EventId });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpPost("{module}")]
    public async Task<IActionResult> Create(string module, [FromBody] Dictionary<string, JsonElement> payload)
    {
        if (!Modules.TryGetValue(module, out var info)) return NotFound(new { message = "Unknown module." });
        if (!CanWrite(info)) return Forbid();
        var fields = payload.Keys.Where(k => info.Fields.Contains(k, StringComparer.OrdinalIgnoreCase)).ToArray();
        if (fields.Length == 0) return BadRequest(new { message = "Provide at least one valid field." });
        var columns = string.Join(",", fields.Select(f => $"`{f}`"));
        var parameters = string.Join(",", fields.Select((f,i) => $"@p{i}"));
        await using var conn = _db.GetConnection(); await conn.OpenAsync();
        await using var cmd = new MySqlCommand($"INSERT INTO `{info.Table}` ({columns}) VALUES ({parameters})", conn);
        for (var i=0;i<fields.Length;i++) cmd.Parameters.AddWithValue($"@p{i}", ToDbValue(payload[fields[i]]));
        await cmd.ExecuteNonQueryAsync();
        var id = (int)cmd.LastInsertedId;
        await LogAsync(conn, $"Created record #{id}", module);
        return Ok(new { id, message = "Record created successfully." });
    }

    [HttpPut("{module}/{id:int}")]
    public async Task<IActionResult> Update(string module, int id, [FromBody] Dictionary<string, JsonElement> payload)
    {
        if (!Modules.TryGetValue(module, out var info)) return NotFound(new { message = "Unknown module." });
        if (!CanWrite(info)) return Forbid();
        var fields = payload.Keys.Where(k => info.Fields.Contains(k, StringComparer.OrdinalIgnoreCase)).ToArray();
        if (id <= 0 || fields.Length == 0) return BadRequest(new { message = "Valid ID and fields are required." });
        var sets = string.Join(",", fields.Select((f,i) => $"`{f}`=@p{i}"));
        await using var conn = _db.GetConnection(); await conn.OpenAsync();
        await using var cmd = new MySqlCommand($"UPDATE `{info.Table}` SET {sets} WHERE id=@id", conn);
        for (var i=0;i<fields.Length;i++) cmd.Parameters.AddWithValue($"@p{i}", ToDbValue(payload[fields[i]]));
        cmd.Parameters.AddWithValue("@id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound(new { message = "Record not found." });
        await LogAsync(conn, $"Updated record #{id}", module);
        return Ok(new { message = "Record updated successfully." });
    }

    [HttpDelete("{module}/{id:int}")]
    public async Task<IActionResult> Delete(string module, int id)
    {
        if (!Modules.TryGetValue(module, out var info)) return NotFound(new { message = "Unknown module." });
        if (!CanWrite(info)) return Forbid();
        if (id <= 0) return BadRequest(new { message = "Invalid ID." });
        await using var conn = _db.GetConnection(); await conn.OpenAsync();
        await using var cmd = new MySqlCommand($"DELETE FROM `{info.Table}` WHERE id=@id", conn);
        cmd.Parameters.AddWithValue("@id", id);
        try
        {
            if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound(new { message = "Record not found." });
        }
        catch (MySqlException ex) when (ex.Number == 1451)
        {
            return Conflict(new { message = "This record is linked to other records and cannot be deleted yet. Remove or reassign its linked records first." });
        }
        await LogAsync(conn, $"Deleted record #{id}", module);
        return Ok(new { message = "Record deleted successfully." });
    }

    private async Task LogAsync(MySqlConnection conn, string action, string module)
    {
        try {
            await using var cmd = new MySqlCommand(
                "INSERT INTO activity_logs(user_id,username,action,module,details) VALUES(@uid,@username,@action,@module,@details)", conn);
            cmd.Parameters.AddWithValue("@uid", CurrentUserId);
            cmd.Parameters.AddWithValue("@username", User.Identity?.Name ?? "Unknown");
            cmd.Parameters.AddWithValue("@action", action);
            cmd.Parameters.AddWithValue("@module", module);
            cmd.Parameters.AddWithValue("@details", $"Role: {CurrentRole}");
            await cmd.ExecuteNonQueryAsync();
        } catch { /* Logging must not fail the main transaction. */ }
    }

    private static object ToDbValue(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => DBNull.Value,
        JsonValueKind.String => (object?)value.GetString() ?? DBNull.Value,
        JsonValueKind.Number => value.TryGetDecimal(out var d) ? (object)d : value.GetDouble(),
        JsonValueKind.True => 1,
        JsonValueKind.False => 0,
        _ => value.GetRawText()
    };
}
