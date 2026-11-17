
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using MySql.Data.MySqlClient;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    private static readonly PasswordHasher<User> Hasher = new();

    public AuthController(
        AppDbContext db,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    // =========================================
    // LEGACY SHA256 PASSWORD SUPPORT
    // =========================================

    private static string LegacyHash(string value)
    {
        using var sha = SHA256.Create();

        return Convert.ToBase64String(
            sha.ComputeHash(Encoding.UTF8.GetBytes(value))
        );
    }

    // =========================================
    // REGISTER ADVISER
    // =========================================

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var username = request.Username.Trim();
        var email = request.Email.Trim();

        if (username.Length < 3)
        {
            return BadRequest(new
            {
                message = "Username must contain at least 3 characters."
            });
        }

        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName))
        {
            return BadRequest(new
            {
                message = "First name and last name are required."
            });
        }

        if (!new EmailAddressAttribute().IsValid(email))
        {
            return BadRequest(new
            {
                message = "Please enter a valid email address."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Password) ||
            request.Password.Length < 8)
        {
            return BadRequest(new
            {
                message = "Password must contain at least 8 characters."
            });
        }

        try
        {
            await using var connection = _db.GetConnection();
            await connection.OpenAsync();

            const string sql = @"
                INSERT INTO users
                (
                    username,
                    email,
                    first_name,
                    middle_name,
                    last_name,
                    password,
                    role,
                    is_active
                )
                VALUES
                (
                    @username,
                    @email,
                    @firstName,
                    @middleName,
                    @lastName,
                    @password,
                    'Adviser',
                    1
                )";

            var hashUser = new User
            {
                Username = username,
                Password = request.Password
            };

            string hashedPassword =
                Hasher.HashPassword(hashUser, request.Password);

            await using var command =
                new MySqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "@username", username);

            command.Parameters.AddWithValue(
                "@email", email);

            command.Parameters.AddWithValue(
                "@firstName", request.FirstName.Trim());

            command.Parameters.AddWithValue(
                "@middleName",
                request.MiddleName?.Trim() ?? string.Empty);

            command.Parameters.AddWithValue(
                "@lastName", request.LastName.Trim());

            command.Parameters.AddWithValue(
                "@password", hashedPassword);

            await command.ExecuteNonQueryAsync();

            return Ok(new
            {
                message = "Adviser account registered successfully. You can now sign in."
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new
            {
                message = "This username or email address is already registered."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Adviser registration failed.");

            return StatusCode(500, new
            {
                message = "Registration failed. Check the backend terminal for details."
            });
        }
    }

    // =========================================
    // LOGIN ADVISER
    // =========================================

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var loginIdentifier = request.Username.Trim();

        if (string.IsNullOrWhiteSpace(loginIdentifier) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new
            {
                message = "Email address and password are required."
            });
        }

        try
        {
            await using var connection = _db.GetConnection();
            await connection.OpenAsync();

            const string sql = @"
                SELECT
                    id,
                    username,
                    password,
                    is_active,
                    first_name,
                    middle_name,
                    last_name
                FROM users
                WHERE LOWER(email) = LOWER(@identifier)
                   OR LOWER(username) = LOWER(@identifier)
                LIMIT 1";

            await using var command =
                new MySqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "@identifier", loginIdentifier);

            int id;
            string username;
            string storedPassword;
            bool active;
            string firstName;
            string middleName;
            string lastName;

            await using (var reader =
                await command.ExecuteReaderAsync())
            {
                if (!await reader.ReadAsync())
                {
                    return Unauthorized(new
                    {
                        message = "Invalid email address or password."
                    });
                }

                id = Convert.ToInt32(reader["id"]);

                username =
                    Convert.ToString(reader["username"])
                    ?? loginIdentifier;

                storedPassword =
                    Convert.ToString(reader["password"])
                    ?? string.Empty;

                active = Convert.ToBoolean(reader["is_active"]);

                firstName =
                    Convert.ToString(reader["first_name"])
                    ?? string.Empty;

                middleName =
                    Convert.ToString(reader["middle_name"])
                    ?? string.Empty;

                lastName =
                    Convert.ToString(reader["last_name"])
                    ?? string.Empty;
            }

            if (!active)
            {
                return StatusCode(403, new
                {
                    message = "This account is disabled. Contact the system administrator."
                });
            }

            // Verify ASP.NET Identity password hash.
            var hashUser = new User
            {
                Username = username,
                Password = request.Password
            };

            bool passwordValid = false;

            try
            {
                var result = Hasher.VerifyHashedPassword(
                    hashUser,
                    storedPassword,
                    request.Password
                );

                passwordValid =
                    result != PasswordVerificationResult.Failed;
            }
            catch (FormatException)
            {
                passwordValid = false;
            }

            // Support accounts using the previous SHA256 password format.
            bool legacyValid =
                storedPassword == LegacyHash(request.Password);

            if (!passwordValid && !legacyValid)
            {
                return Unauthorized(new
                {
                    message = "Invalid email address or password."
                });
            }

            // Upgrade legacy SHA256 password to ASP.NET Identity hash.
            if (legacyValid && !passwordValid)
            {
                string upgradedHash =
                    Hasher.HashPassword(hashUser, request.Password);

                await using var update = new MySqlCommand(
                    "UPDATE users SET password=@password WHERE id=@id",
                    connection
                );

                update.Parameters.AddWithValue(
                    "@password", upgradedHash);

                update.Parameters.AddWithValue("@id", id);

                await update.ExecuteNonQueryAsync();
            }

            // Adviser is the only role in this system.
            const string role = "Adviser";

            var token = CreateToken(id, username, role);

            var fullName = string.Join(
                " ",
                new[] { firstName, middleName, lastName }
                    .Where(part => !string.IsNullOrWhiteSpace(part))
            );

            return Ok(new
            {
                token,
                tokenType = "Bearer",
                expiresInMinutes = 60,

                user = new
                {
                    id,
                    username,
                    role,
                    fullName
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Login failed for {LoginIdentifier}.",
                loginIdentifier
            );

            return StatusCode(500, new
            {
                message = "Login failed. Check the backend terminal for details."
            });
        }
    }

    // =========================================
    // JWT TOKEN GENERATIONCreateToken
    // =========================================

    private string CreateToken(
        int id,
        string username,
        string role)
    {
        var signingKey = _configuration["Jwt:SigningKey"];
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(signingKey) ||
            Encoding.UTF8.GetByteCount(signingKey) < 32)
        {
            throw new InvalidOperationException(
                "JWT signing key must contain at least 32 bytes."
            );
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(signingKey)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var claims = new[]
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                id.ToString()
            ),

            new Claim(
                ClaimTypes.Name,
                username
            ),

            new Claim(
                ClaimTypes.Role,
                role
            )
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}

// =========================================
// LOGIN REQUEST MODEL
// =========================================

public sealed class LoginRequest
{
    [Required]
    [StringLength(150)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

// =========================================
// REGISTRATION REQUEST MODEL
// =========================================

public sealed class RegisterRequest
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? MiddleName { get; set; }

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}
