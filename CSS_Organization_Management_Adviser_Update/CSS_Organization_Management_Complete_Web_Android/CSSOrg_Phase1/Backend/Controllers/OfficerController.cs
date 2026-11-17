
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class OfficerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp" };

    public OfficerController(
        AppDbContext db,
        IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    // GET: api/Officer/members
    // Supplies registered members for the officer assignment form.
    [HttpGet("members")]
    public async Task<IActionResult> GetMembers()
    {
        var list = new List<object>();

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT id, full_name, year_section, address, contact
            FROM members
            ORDER BY full_name ASC";

        await using var cmd = new MySqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                id = Convert.ToInt32(reader["id"]),
                name = reader["full_name"].ToString(),
                yearSection = reader["year_section"].ToString(),
                address = reader["address"].ToString(),
                contact = reader["contact"].ToString()
            });
        }

        return Ok(list);
    }

    // GET: api/Officer/all
    // Retrieves officer information through a JOIN.
    [HttpGet("all")]
    public async Task<IActionResult> GetAll()
    {
        var list = new List<object>();

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                o.id,
                o.member_id AS memberId,
                m.full_name AS name,
                m.year_section AS yearSection,
                m.contact,
                o.position,
                o.email,
                o.profile_image AS profileImage
            FROM officers o
            INNER JOIN members m ON m.id = o.member_id
            ORDER BY o.id DESC";

        await using var cmd = new MySqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                id = Convert.ToInt32(reader["id"]),
                memberId = Convert.ToInt32(reader["memberId"]),
                name = reader["name"].ToString(),
                yearSection = reader["yearSection"].ToString(),
                contact = reader["contact"].ToString(),
                position = reader["position"].ToString(),
                email = reader["email"].ToString(),
                profileImage = reader["profileImage"] == DBNull.Value
                    ? null
                    : reader["profileImage"].ToString()
            });
        }

        return Ok(list);
    }

    // GET: api/Officer/search?key=Angel
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? key)
    {
        var list = new List<object>();
        var term = key?.Trim() ?? "";

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                o.id,
                o.member_id AS memberId,
                m.full_name AS name,
                m.year_section AS yearSection,
                m.contact,
                o.position,
                o.email,
                o.profile_image AS profileImage
            FROM officers o
            INNER JOIN members m ON m.id = o.member_id
            WHERE m.full_name LIKE CONCAT('%', @key, '%')
               OR o.position LIKE CONCAT('%', @key, '%')
               OR CAST(o.id AS CHAR) LIKE CONCAT('%', @key, '%')
            ORDER BY o.id DESC";

        await using var cmd = new MySqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@key", term);

        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                id = Convert.ToInt32(reader["id"]),
                memberId = Convert.ToInt32(reader["memberId"]),
                name = reader["name"].ToString(),
                yearSection = reader["yearSection"].ToString(),
                contact = reader["contact"].ToString(),
                position = reader["position"].ToString(),
                email = reader["email"].ToString(),
                profileImage = reader["profileImage"] == DBNull.Value
                    ? null
                    : reader["profileImage"].ToString()
            });
        }

        return Ok(list);
    }

    // POST: api/Officer/add
    // Multipart form fields: memberId, position, email, image.
    
    [HttpPost("add")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Add(
        [FromForm] string Name,
        [FromForm] string Position,
        [FromForm] string Email,
        [FromForm] string Contact,
        IFormFile? Image)    {
        if (string.IsNullOrWhiteSpace(Name) ||
            string.IsNullOrWhiteSpace(Position) ||
            string.IsNullOrWhiteSpace(Email) ||
            string.IsNullOrWhiteSpace(Contact))
        {
            return BadRequest(new { message = "All fields are required." });
        }

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute()
            .IsValid(Email))
        {
            return BadRequest(new { message = "Invalid email address." });
    }

        string? savedFile = null;

        try
        {
            if (Image is not null)
                savedFile = await SaveImageAsync(Image);

            await using var conn = _db.GetConnection();
            await conn.OpenAsync();

            const string sql = @"
                INSERT INTO officers
                (full_name, position, email, contact, profile_image)
                VALUES (@name, @position, @email, @contact, @image)";

            await using var cmd = new MySqlCommand(sql, conn);

            cmd.Parameters.AddWithValue("@name", Name.Trim());
            cmd.Parameters.AddWithValue("@position", Position.Trim());
            cmd.Parameters.AddWithValue("@email", Email.Trim());
            cmd.Parameters.AddWithValue("@contact", Contact.Trim());
            cmd.Parameters.AddWithValue("@image",
                (object?)savedFile ?? DBNull.Value);

            await cmd.ExecuteNonQueryAsync();

            return Ok(new { message = "Officer added successfully." });
        }
        catch (Exception)
        {
            DeleteImage(savedFile);
            return StatusCode(500, new
            {
                message = "Unable to add officer. Check the API and database logs."
            });    
        }
    }


    // PUT: api/Officer/update/1
    [HttpPut("update/{id:int}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Update(
        int id,
        [FromForm] int memberId,
        [FromForm] string position,
        [FromForm] string? email,
        IFormFile? image)
    {
        if (id <= 0 || memberId <= 0 ||
            string.IsNullOrWhiteSpace(position))
            return BadRequest(new
            {
                message = "A valid officer, member and position are required."
            });

        string? savedFile = null;

        try
        {
            await using var conn = _db.GetConnection();
            await conn.OpenAsync();

            const string checkSql = @"
                SELECT COUNT(*) FROM officers o
                INNER JOIN members m ON m.id=@memberId
                WHERE o.id=@id";

            await using (var check = new MySqlCommand(checkSql, conn))
            {
                check.Parameters.AddWithValue("@id", id);
                check.Parameters.AddWithValue("@memberId", memberId);

                if (Convert.ToInt32(await check.ExecuteScalarAsync()) == 0)
                    return NotFound(new
                    {
                        message = "Officer or selected member was not found."
                    });
            }

            const string duplicateSql = @"
                SELECT COUNT(*)
                FROM officers
                WHERE member_id=@memberId
                  AND LOWER(position)=LOWER(@position)
                  AND id<>@id";

            await using (var duplicate = new MySqlCommand(
                duplicateSql, conn))
            {
                duplicate.Parameters.AddWithValue("@memberId", memberId);
                duplicate.Parameters.AddWithValue("@position", position.Trim());
                duplicate.Parameters.AddWithValue("@id", id);

                if (Convert.ToInt32(await duplicate.ExecuteScalarAsync()) > 0)
                    return Conflict(new
                    {
                        message = "This member already has this officer position."
                    });
            }

            if (image != null)
                savedFile = await SaveImageAsync(image);

            string sql = image == null
                ? @"
                    UPDATE officers o
                    INNER JOIN members m ON m.id=@memberId
                    SET o.member_id=m.id,
                        o.full_name=m.full_name,
                        o.contact=m.contact,
                        o.position=@position,
                        o.email=@email
                    WHERE o.id=@id"
                : @"
                    UPDATE officers o
                    INNER JOIN members m ON m.id=@memberId
                    SET o.member_id=m.id,
                        o.full_name=m.full_name,
                        o.contact=m.contact,
                        o.position=@position,
                        o.email=@email,
                        o.profile_image=@image
                    WHERE o.id=@id";

            await using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@memberId", memberId);
            cmd.Parameters.AddWithValue("@position", position.Trim());
            cmd.Parameters.AddWithValue("@email", email?.Trim() ?? "");

            if (image != null)
                cmd.Parameters.AddWithValue("@image", savedFile);

            await cmd.ExecuteNonQueryAsync();

            return Ok(new
            {
                message = "Officer appointment updated successfully."
            });
        }
        catch (InvalidOperationException ex)
        {
            DeleteImage(savedFile);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            DeleteImage(savedFile);
            return StatusCode(500, new
            {
                message = "Unable to update officer. Check the backend logs."
            });
        }
    }

    // DELETE: api/Officer/delete/1
    [HttpDelete("delete/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (id <= 0)
            return BadRequest(new
            {
                message = "A valid officer ID is required."
            });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        await using var cmd = new MySqlCommand(
            "DELETE FROM officers WHERE id=@id", conn);

        cmd.Parameters.AddWithValue("@id", id);

        if (await cmd.ExecuteNonQueryAsync() == 0)
            return NotFound(new { message = "Officer not found." });

        return Ok(new { message = "Officer appointment removed successfully." });
    }

    private async Task<string> SaveImageAsync(IFormFile image)
    {
        var extension = Path.GetExtension(image.FileName);

        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException(
                "Only JPG, JPEG, PNG and WEBP images are allowed.");

        if (image.Length <= 0 || image.Length > 5_000_000)
            throw new InvalidOperationException(
                "Image must be between 1 byte and 5 MB.");

        var folder = Path.Combine(
            _environment.WebRootPath ??
            Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "officers");

        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var path = Path.Combine(folder, fileName);

        await using var stream = System.IO.File.Create(path);
        await image.CopyToAsync(stream);

        return fileName;
    }

    private void DeleteImage(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return;

        var folder = Path.Combine(
            _environment.WebRootPath ??
            Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "officers");

        var path = Path.Combine(folder, fileName);

        if (System.IO.File.Exists(path))
            System.IO.File.Delete(path);
    }
}

