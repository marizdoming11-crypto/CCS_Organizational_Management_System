namespace CSSOrg.Mobile;

public partial class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();

        WebViewControl.Source = new UrlWebViewSource
        {
            Url = "file:///android_asset/wwwroot/index.html"
        };
    }
}