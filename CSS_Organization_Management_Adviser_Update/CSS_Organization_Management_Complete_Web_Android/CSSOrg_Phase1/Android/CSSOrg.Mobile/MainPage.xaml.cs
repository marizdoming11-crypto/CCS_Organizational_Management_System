using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CommunityToolkit.Maui;
using CommunityToolkit.Maui.Media;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Media;

namespace CSSOrg.Mobile;

public partial class MainPage : ContentPage
{
    // Android Emulator: 10.0.2.2 reaches the host computer.
    // Physical phone: replace with your computer's LAN IPv4 address, e.g. http://192.168.1.10:5151/api
    private const string ApiBase = "http://10.0.2.2:5151/api";
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(20) };
    private string? _token;
    private string _role = "Member";

    public MainPage()
    {
        InitializeComponent();
        _http.BaseAddress = new Uri(ApiBase);
    }

    private async void OnLoginClicked(object sender, EventArgs e)
    {
        try
        {
            StatusLabel.Text = "Signing in...";
            var body = JsonSerializer.Serialize(new { username = UsernameEntry.Text?.Trim(), password = PasswordEntry.Text });
            var response = await _http.PostAsync("/auth/login", new StringContent(body, Encoding.UTF8, "application/json"));
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) throw new Exception(ReadMessage(json, "Login failed."));
            using var doc = JsonDocument.Parse(json);
            _token = doc.RootElement.GetProperty("token").GetString();
            var user = doc.RootElement.GetProperty("user");
            var username = user.GetProperty("username").GetString();
            _role = user.GetProperty("role").GetString() ?? "Member";
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            LoginPanel.IsVisible = false;
            WorkspacePanel.IsVisible = true;
            WelcomeLabel.Text = $"Welcome, {username} ({_role})";
            StatusLabel.Text = "Signed in successfully.";
            await ReadAloud("Welcome to the CSS Organization Management System.");
        }
        catch (Exception ex) { StatusLabel.Text = ex.Message; }
    }

    private async void OnModuleClicked(object sender, EventArgs e)
    {
        if (sender is not Button button) return;
        var name = button.Text.ToLowerInvariant();
        var endpoint = name switch { "members" => "/workspace/members", "events" => "/workspace/events",
            "announcements" => "/workspace/announcements", "attendance" => "/workspace/attendance", _ => "/workspace/summary" };
        try
        {
            var response = await _http.GetAsync(endpoint);
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) throw new Exception(ReadMessage(json, "Unable to load module."));
            ModuleResult.Text = $"{button.Text}\n{FormatPreview(json)}";
            await ReadAloud($"{button.Text} opened.");
        }
        catch (Exception ex) { ModuleResult.Text = ex.Message; }
    }

    private async void OnVoiceClicked(object sender, EventArgs e)
    {
        try
        {
            var permission = await SpeechToText.Default.RequestPermissions(CancellationToken.None);
            if (!permission) { VoiceTranscript.Text = "Microphone permission was not granted."; return; }
            VoiceTranscript.Text = "Listening...";
            var result = await SpeechToText.Default.ListenAsync(
                CultureInfo.GetCultureInfo("en-PH"),
                new SpeechToTextOptions { ShouldReportPartialResults = false },
                CancellationToken.None);
            if (!result.IsSuccessful) { VoiceTranscript.Text = result.Exception?.Message ?? "No speech was recognized."; return; }
            var text = result.Text ?? "";
            VoiceTranscript.Text = $"You said: {text}";
            await HandleVoiceCommand(text);
        }
        catch (Exception ex) { VoiceTranscript.Text = $"Voice input error: {ex.Message}"; }
    }

    private async Task HandleVoiceCommand(string phrase)
    {
        var p = phrase.ToLowerInvariant();
        var commands = new (string[] Words, string Module)[] {
            (new[]{"dashboard","home","balik sa dashboard"},"Dashboard"),
            (new[]{"members","member","mga miyembro"},"Members"),
            (new[]{"events","event","activities","mga kalihokan"},"Events"),
            (new[]{"attendance","talaan sa attendance"},"Attendance"),
            (new[]{"announcements","announcement","pahibalo","abiso"},"Announcements")
        };
        foreach (var item in commands)
        {
            if (item.Words.Any(p.Contains))
            {
                if (item.Module == "Dashboard") ModuleResult.Text = "Dashboard";
                else {
                    var fakeButton = new Button { Text = item.Module };
                    OnModuleClicked(fakeButton, EventArgs.Empty);
                }
                await ReadAloud($"Opening {item.Module}.");
                return;
            }
        }
        await ReadAloud("Sorry, I did not recognize that command.");
    }

    private async Task ReadAloud(string text)
    {
        try { await TextToSpeech.Default.SpeakAsync(text); } catch { /* TTS may be unavailable on a device. */ }
    }

    private void OnLogoutClicked(object sender, EventArgs e)
    {
        _token = null; _http.DefaultRequestHeaders.Authorization = null;
        WorkspacePanel.IsVisible = false; LoginPanel.IsVisible = true;
        PasswordEntry.Text = ""; ModuleResult.Text = ""; StatusLabel.Text = "You have signed out.";
    }

    private static string ReadMessage(string json, string fallback)
    {
        try { using var d=JsonDocument.Parse(json); return d.RootElement.TryGetProperty("message",out var m)?m.GetString()??fallback:fallback; }
        catch { return fallback; }
    }
    private static string FormatPreview(string json)
    {
        try { using var d=JsonDocument.Parse(json); if(d.RootElement.ValueKind==JsonValueKind.Array)return $"{d.RootElement.GetArrayLength()} record(s) returned."; return d.RootElement.ToString(); }
        catch { return json.Length>500?json[..500]:json; }
    }
}
