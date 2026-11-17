namespace CSSOrg.Mobile;
public partial class App : Application {
 public App(){InitializeComponent();MainPage=new NavigationPage(new MainPage()){BarBackgroundColor=Color.FromArgb("#07101F"),BarTextColor=Colors.White};}
}
