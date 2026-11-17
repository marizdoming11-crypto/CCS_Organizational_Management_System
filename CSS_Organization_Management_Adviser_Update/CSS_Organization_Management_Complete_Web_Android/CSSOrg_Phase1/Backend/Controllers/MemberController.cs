using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MemberController : ControllerBase
{
    private readonly AppDbContext _db;

    public MemberController(AppDbContext db) => _db = db;

    [HttpPost("add-member")]
    public async Task<IActionResult> AddMember([FromBody] MemberDTO m)
    {
        if (m == null || string.IsNullOrWhiteSpace(m.Name) ||
            string.IsNullOrWhiteSpace(m.YearSection) ||
            string.IsNullOrWhiteSpace(m.Address) ||
            string.IsNullOrWhiteSpace(m.ContactNumber))
            return BadRequest(new { message = "All fields are required." });

        try
        {
            using var conn = _db.GetConnection();
            await conn.OpenAsync();

            const string sql = @"INSERT INTO members
                (full_name, year_section, address, contact)
                VALUES (@name, @yearSection, @address, @contact)";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@name", m.Name.Trim());
            cmd.Parameters.AddWithValue("@yearSection", m.YearSection.Trim());
            cmd.Parameters.AddWithValue("@address", m.Address.Trim());
            cmd.Parameters.AddWithValue("@contact", m.ContactNumber.Trim());
            await cmd.ExecuteNonQueryAsync();

            return Ok(new { message = "Member added successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to add member.", detail = ex.Message });
        }
    }

    [HttpPut("update/{id:int}")]
    public async Task<IActionResult> UpdateMember(int id, [FromBody] MemberDTO m)
    {
        if (id <= 0 || m == null || string.IsNullOrWhiteSpace(m.Name) ||
            string.IsNullOrWhiteSpace(m.YearSection) ||
            string.IsNullOrWhiteSpace(m.Address) ||
            string.IsNullOrWhiteSpace(m.ContactNumber))
            return BadRequest(new { message = "A valid ID and all member fields are required." });

        try
        {
            using var conn = _db.GetConnection();
            await conn.OpenAsync();

            const string sql = @"UPDATE members
                SET full_name=@name, year_section=@yearSection,
                    address=@address, contact=@contact
                WHERE id=@id";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@name", m.Name.Trim());
            cmd.Parameters.AddWithValue("@yearSection", m.YearSection.Trim());
            cmd.Parameters.AddWithValue("@address", m.Address.Trim());
            cmd.Parameters.AddWithValue("@contact", m.ContactNumber.Trim());

            int affected = await cmd.ExecuteNonQueryAsync();
            if (affected == 0)
            {
                using var check = new MySqlCommand("SELECT COUNT(*) FROM members WHERE id=@id", conn);
                check.Parameters.AddWithValue("@id", id);
                if (Convert.ToInt32(await check.ExecuteScalarAsync()) == 0)
                    return NotFound(new { message = "Member not found." });
            }

            return Ok(new { message = "Member updated successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to update member.", detail = ex.Message });
        }
    }

    [HttpDelete("delete/{id:int}")]
    public async Task<IActionResult> DeleteMember(int id)
    {
        if (id <= 0)
            return BadRequest(new { message = "A valid member ID is required." });

        try
        {
            using var conn = _db.GetConnection();
            await conn.OpenAsync();

            using var cmd = new MySqlCommand("DELETE FROM members WHERE id=@id", conn);
            cmd.Parameters.AddWithValue("@id", id);

            if (await cmd.ExecuteNonQueryAsync() == 0)
                return NotFound(new { message = "Member not found." });

            return Ok(new { message = "Member deleted successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to delete member.", detail = ex.Message });
        }
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var list = new List<object>();
            using var conn = _db.GetConnection();
            await conn.OpenAsync();

            using var cmd = new MySqlCommand(
                "SELECT id, full_name, year_section, address, contact FROM members ORDER BY id DESC", conn);
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    id = reader["id"],
                    name = reader["full_name"].ToString(),
                    yearSection = reader["year_section"].ToString(),
                    address = reader["address"].ToString(),
                    contact = reader["contact"].ToString()
                });
            }

            return Ok(list);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to load members.", detail = ex.Message });
        }
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? key)
    {
        try
        {
            var list = new List<object>();
            using var conn = _db.GetConnection();
            await conn.OpenAsync();

            const string sql = @"SELECT id, full_name, year_section, address, contact
                FROM members
                WHERE full_name LIKE CONCAT('%', @key, '%')
                   OR CAST(id AS CHAR) LIKE CONCAT('%', @key, '%')
                ORDER BY id DESC";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@key", key?.Trim() ?? "");
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    id = reader["id"],
                    name = reader["full_name"].ToString(),
                    yearSection = reader["year_section"].ToString(),
                    address = reader["address"].ToString(),
                    contact = reader["contact"].ToString()
                });
            }

            return Ok(list);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to search members.", detail = ex.Message });
        }
    }

    [HttpGet("next-id")]
    public async Task<IActionResult> GetNextId()
    {
        try
        {
            using var conn = _db.GetConnection();
            await conn.OpenAsync();
            using var cmd = new MySqlCommand("SELECT IFNULL(MAX(id), 0) + 1 FROM members", conn);
            int nextId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            return Ok(new { nextId });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to get the next member ID.", detail = ex.Message });
        }
    }
}
