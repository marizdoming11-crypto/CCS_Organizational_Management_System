using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;

namespace CSSOrg.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public sealed class UserController : ControllerBase
{
    private static readonly string[] AllowedRoles =
        { "Admin", "Governor", "Secretary", "Treasurer", "Member" };

    private readonly AppDbContext _db;
    public UserController(AppDbContext db) => _db = db;

    [HttpGet("all")]
    public async Task<IActionResult> GetAll()
    {
        var users = new List<object>();
        await using var conn = _db.GetConnection();
        await conn.OpenAsync();
        const string sql = @"SELECT id, username, role, is_active, created_at
                             FROM users ORDER BY created_at DESC, id DESC";
        await using var cmd = new MySqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(new {
                id = Convert.ToInt32(reader["id"]),
                username = reader["username"].ToString(),
                role = reader["role"].ToString(),
                isActive = Convert.ToBoolean(reader["is_active"]),
                createdAt = Convert.ToDateTime(reader["created_at"]).ToString("yyyy-MM-dd HH:mm")
            });
        }
        return Ok(users);
    }

    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleRequest request)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid user ID." });
        if (request is null || !AllowedRoles.Contains(request.Role, StringComparer.Ordinal))
            return BadRequest(new { message = "Role must be Admin, Governor, Secretary, Treasurer or Member." });

        var currentUserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed) ? parsed : 0;
        if (id == currentUserId && request.Role != "Admin")
            return BadRequest(new { message = "You cannot remove your own Admin role." });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            await using var check = new MySqlCommand(
                "SELECT role FROM users WHERE id=@id FOR UPDATE", conn, tx);
            check.Parameters.AddWithValue("@id", id);
            var existing = await check.ExecuteScalarAsync();
            if (existing is null) { await tx.RollbackAsync(); return NotFound(new { message = "User not found." }); }

            if (Convert.ToString(existing) == "Admin" && request.Role != "Admin")
            {
                await using var count = new MySqlCommand(
                    "SELECT COUNT(*) FROM users WHERE role='Admin' AND is_active=1", conn, tx);
                if (Convert.ToInt32(await count.ExecuteScalarAsync()) <= 1)
                { await tx.RollbackAsync(); return Conflict(new { message = "You cannot demote the last active administrator." }); }
            }

            await using var update = new MySqlCommand("UPDATE users SET role=@role WHERE id=@id", conn, tx);
            update.Parameters.AddWithValue("@role", request.Role);
            update.Parameters.AddWithValue("@id", id);
            await update.ExecuteNonQueryAsync();
            await tx.CommitAsync();
            return Ok(new { message = "User role updated. The user must log in again for the new role to take effect." });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { message = "Unable to update user role." });
        }
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateUserStatusRequest request)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid user ID." });
        var currentUserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed) ? parsed : 0;
        if (id == currentUserId && !request.IsActive)
            return BadRequest(new { message = "You cannot deactivate your own account." });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            await using var check = new MySqlCommand(
                "SELECT role, is_active FROM users WHERE id=@id FOR UPDATE", conn, tx);
            check.Parameters.AddWithValue("@id", id);
            await using var reader = await check.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) { await reader.DisposeAsync(); await tx.RollbackAsync(); return NotFound(new { message = "User not found." }); }
            var role = Convert.ToString(reader["role"]) ?? "Member";
            var wasActive = Convert.ToBoolean(reader["is_active"]);
            await reader.DisposeAsync();

            if (role == "Admin" && wasActive && !request.IsActive)
            {
                await using var count = new MySqlCommand(
                    "SELECT COUNT(*) FROM users WHERE role='Admin' AND is_active=1", conn, tx);
                if (Convert.ToInt32(await count.ExecuteScalarAsync()) <= 1)
                { await tx.RollbackAsync(); return Conflict(new { message = "You cannot deactivate the last active administrator." }); }
            }

            await using var update = new MySqlCommand("UPDATE users SET is_active=@active WHERE id=@id", conn, tx);
            update.Parameters.AddWithValue("@active", request.IsActive ? 1 : 0);
            update.Parameters.AddWithValue("@id", id);
            await update.ExecuteNonQueryAsync();
            await tx.CommitAsync();
            return Ok(new { message = request.IsActive ? "Account activated." : "Account deactivated." });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { message = "Unable to update account status." });
        }
    }
}

public sealed class UpdateUserRoleRequest
{
    public string Role { get; set; } = string.Empty;
}

public sealed class UpdateUserStatusRequest
{
    public bool IsActive { get; set; }
}
