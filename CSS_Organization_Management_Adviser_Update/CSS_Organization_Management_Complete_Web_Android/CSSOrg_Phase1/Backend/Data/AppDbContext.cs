using MySql.Data.MySqlClient;

public sealed class AppDbContext
{
    private readonly IConfiguration _configuration;

    public AppDbContext(IConfiguration configuration) => _configuration = configuration;

    public MySqlConnection GetConnection()
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
        return new MySqlConnection(connectionString);
    }
}
