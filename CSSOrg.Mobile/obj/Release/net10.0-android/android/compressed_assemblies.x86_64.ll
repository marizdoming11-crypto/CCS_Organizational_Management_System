; ModuleID = 'compressed_assemblies.x86_64.ll'
source_filename = "compressed_assemblies.x86_64.ll"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-android21"

%struct.CompressedAssemblyDescriptor = type {
	i32, ; uint32_t uncompressed_file_size
	i1, ; bool loaded
	i32 ; uint32_t buffer_offset
}

@compressed_assembly_count = dso_local local_unnamed_addr constant i32 126, align 4

@compressed_assembly_descriptors = dso_local local_unnamed_addr global [126 x %struct.CompressedAssemblyDescriptor] [
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 0; uint32_t buffer_offset
	}, ; 0: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 15144; uint32_t buffer_offset
	}, ; 1: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 30288; uint32_t buffer_offset
	}, ; 2: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 45432; uint32_t buffer_offset
	}, ; 3: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 60576; uint32_t buffer_offset
	}, ; 4: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 75720; uint32_t buffer_offset
	}, ; 5: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 90864; uint32_t buffer_offset
	}, ; 6: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 106008; uint32_t buffer_offset
	}, ; 7: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 121152; uint32_t buffer_offset
	}, ; 8: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 136296; uint32_t buffer_offset
	}, ; 9: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 151440; uint32_t buffer_offset
	}, ; 10: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 166584; uint32_t buffer_offset
	}, ; 11: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 181728; uint32_t buffer_offset
	}, ; 12: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15184, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 196872; uint32_t buffer_offset
	}, ; 13: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 212056; uint32_t buffer_offset
	}, ; 14: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 227200; uint32_t buffer_offset
	}, ; 15: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 242344; uint32_t buffer_offset
	}, ; 16: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 257488; uint32_t buffer_offset
	}, ; 17: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 272632; uint32_t buffer_offset
	}, ; 18: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15184, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 287776; uint32_t buffer_offset
	}, ; 19: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15184, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 302960; uint32_t buffer_offset
	}, ; 20: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15184, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 318144; uint32_t buffer_offset
	}, ; 21: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 333328; uint32_t buffer_offset
	}, ; 22: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15184, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 348472; uint32_t buffer_offset
	}, ; 23: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 363656; uint32_t buffer_offset
	}, ; 24: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 378800; uint32_t buffer_offset
	}, ; 25: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 393944; uint32_t buffer_offset
	}, ; 26: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 409088; uint32_t buffer_offset
	}, ; 27: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 424232; uint32_t buffer_offset
	}, ; 28: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15184, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 439376; uint32_t buffer_offset
	}, ; 29: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 454560; uint32_t buffer_offset
	}, ; 30: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 469704; uint32_t buffer_offset
	}, ; 31: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 484848; uint32_t buffer_offset
	}, ; 32: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 15144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 499992; uint32_t buffer_offset
	}, ; 33: Microsoft.Maui.Controls.resources
	%struct.CompressedAssemblyDescriptor {
		i32 7168, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 515136; uint32_t buffer_offset
	}, ; 34: _Microsoft.Android.Resource.Designer
	%struct.CompressedAssemblyDescriptor {
		i32 22528, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 522304; uint32_t buffer_offset
	}, ; 35: CommunityToolkit.Maui
	%struct.CompressedAssemblyDescriptor {
		i32 36352, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 544832; uint32_t buffer_offset
	}, ; 36: CommunityToolkit.Maui.Core
	%struct.CompressedAssemblyDescriptor {
		i32 14848, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 581184; uint32_t buffer_offset
	}, ; 37: Microsoft.Extensions.Configuration
	%struct.CompressedAssemblyDescriptor {
		i32 6656, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 596032; uint32_t buffer_offset
	}, ; 38: Microsoft.Extensions.Configuration.Abstractions
	%struct.CompressedAssemblyDescriptor {
		i32 46592, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 602688; uint32_t buffer_offset
	}, ; 39: Microsoft.Extensions.DependencyInjection
	%struct.CompressedAssemblyDescriptor {
		i32 26112, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 649280; uint32_t buffer_offset
	}, ; 40: Microsoft.Extensions.DependencyInjection.Abstractions
	%struct.CompressedAssemblyDescriptor {
		i32 8192, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 675392; uint32_t buffer_offset
	}, ; 41: Microsoft.Extensions.Diagnostics.Abstractions
	%struct.CompressedAssemblyDescriptor {
		i32 7168, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 683584; uint32_t buffer_offset
	}, ; 42: Microsoft.Extensions.FileProviders.Abstractions
	%struct.CompressedAssemblyDescriptor {
		i32 6144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 690752; uint32_t buffer_offset
	}, ; 43: Microsoft.Extensions.Hosting.Abstractions
	%struct.CompressedAssemblyDescriptor {
		i32 17920, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 696896; uint32_t buffer_offset
	}, ; 44: Microsoft.Extensions.Logging
	%struct.CompressedAssemblyDescriptor {
		i32 19456, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 714816; uint32_t buffer_offset
	}, ; 45: Microsoft.Extensions.Logging.Abstractions
	%struct.CompressedAssemblyDescriptor {
		i32 16896, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 734272; uint32_t buffer_offset
	}, ; 46: Microsoft.Extensions.Options
	%struct.CompressedAssemblyDescriptor {
		i32 9216, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 751168; uint32_t buffer_offset
	}, ; 47: Microsoft.Extensions.Primitives
	%struct.CompressedAssemblyDescriptor {
		i32 1987368, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 760384; uint32_t buffer_offset
	}, ; 48: Microsoft.Maui.Controls
	%struct.CompressedAssemblyDescriptor {
		i32 135976, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 2747752; uint32_t buffer_offset
	}, ; 49: Microsoft.Maui.Controls.Xaml
	%struct.CompressedAssemblyDescriptor {
		i32 973312, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 2883728; uint32_t buffer_offset
	}, ; 50: Microsoft.Maui
	%struct.CompressedAssemblyDescriptor {
		i32 69120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 3857040; uint32_t buffer_offset
	}, ; 51: Microsoft.Maui.Essentials
	%struct.CompressedAssemblyDescriptor {
		i32 210216, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 3926160; uint32_t buffer_offset
	}, ; 52: Microsoft.Maui.Graphics
	%struct.CompressedAssemblyDescriptor {
		i32 73728, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4136376; uint32_t buffer_offset
	}, ; 53: Xamarin.AndroidX.Activity
	%struct.CompressedAssemblyDescriptor {
		i32 583680, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4210104; uint32_t buffer_offset
	}, ; 54: Xamarin.AndroidX.AppCompat
	%struct.CompressedAssemblyDescriptor {
		i32 17920, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4793784; uint32_t buffer_offset
	}, ; 55: Xamarin.AndroidX.AppCompat.AppCompatResources
	%struct.CompressedAssemblyDescriptor {
		i32 18944, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4811704; uint32_t buffer_offset
	}, ; 56: Xamarin.AndroidX.CardView
	%struct.CompressedAssemblyDescriptor {
		i32 22528, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4830648; uint32_t buffer_offset
	}, ; 57: Xamarin.AndroidX.Collection.Jvm
	%struct.CompressedAssemblyDescriptor {
		i32 78336, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4853176; uint32_t buffer_offset
	}, ; 58: Xamarin.AndroidX.CoordinatorLayout
	%struct.CompressedAssemblyDescriptor {
		i32 596992, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 4931512; uint32_t buffer_offset
	}, ; 59: Xamarin.AndroidX.Core
	%struct.CompressedAssemblyDescriptor {
		i32 26624, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5528504; uint32_t buffer_offset
	}, ; 60: Xamarin.AndroidX.CursorAdapter
	%struct.CompressedAssemblyDescriptor {
		i32 9728, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5555128; uint32_t buffer_offset
	}, ; 61: Xamarin.AndroidX.CustomView
	%struct.CompressedAssemblyDescriptor {
		i32 47104, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5564856; uint32_t buffer_offset
	}, ; 62: Xamarin.AndroidX.DrawerLayout
	%struct.CompressedAssemblyDescriptor {
		i32 236032, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5611960; uint32_t buffer_offset
	}, ; 63: Xamarin.AndroidX.Fragment
	%struct.CompressedAssemblyDescriptor {
		i32 23552, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5847992; uint32_t buffer_offset
	}, ; 64: Xamarin.AndroidX.Lifecycle.Common.Jvm
	%struct.CompressedAssemblyDescriptor {
		i32 18944, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5871544; uint32_t buffer_offset
	}, ; 65: Xamarin.AndroidX.Lifecycle.LiveData.Core
	%struct.CompressedAssemblyDescriptor {
		i32 32768, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5890488; uint32_t buffer_offset
	}, ; 66: Xamarin.AndroidX.Lifecycle.ViewModel.Android
	%struct.CompressedAssemblyDescriptor {
		i32 13824, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5923256; uint32_t buffer_offset
	}, ; 67: Xamarin.AndroidX.Lifecycle.ViewModelSavedState.Android
	%struct.CompressedAssemblyDescriptor {
		i32 39424, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5937080; uint32_t buffer_offset
	}, ; 68: Xamarin.AndroidX.Loader
	%struct.CompressedAssemblyDescriptor {
		i32 92672, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 5976504; uint32_t buffer_offset
	}, ; 69: Xamarin.AndroidX.Navigation.Common.Android
	%struct.CompressedAssemblyDescriptor {
		i32 19456, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6069176; uint32_t buffer_offset
	}, ; 70: Xamarin.AndroidX.Navigation.Fragment
	%struct.CompressedAssemblyDescriptor {
		i32 65536, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6088632; uint32_t buffer_offset
	}, ; 71: Xamarin.AndroidX.Navigation.Runtime.Android
	%struct.CompressedAssemblyDescriptor {
		i32 27136, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6154168; uint32_t buffer_offset
	}, ; 72: Xamarin.AndroidX.Navigation.UI
	%struct.CompressedAssemblyDescriptor {
		i32 457728, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6181304; uint32_t buffer_offset
	}, ; 73: Xamarin.AndroidX.RecyclerView
	%struct.CompressedAssemblyDescriptor {
		i32 12288, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6639032; uint32_t buffer_offset
	}, ; 74: Xamarin.AndroidX.SavedState.SavedState.Android
	%struct.CompressedAssemblyDescriptor {
		i32 41984, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6651320; uint32_t buffer_offset
	}, ; 75: Xamarin.AndroidX.SwipeRefreshLayout
	%struct.CompressedAssemblyDescriptor {
		i32 62976, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6693304; uint32_t buffer_offset
	}, ; 76: Xamarin.AndroidX.ViewPager
	%struct.CompressedAssemblyDescriptor {
		i32 40448, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6756280; uint32_t buffer_offset
	}, ; 77: Xamarin.AndroidX.ViewPager2
	%struct.CompressedAssemblyDescriptor {
		i32 982016, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 6796728; uint32_t buffer_offset
	}, ; 78: Xamarin.Google.Android.Material
	%struct.CompressedAssemblyDescriptor {
		i32 90624, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 7778744; uint32_t buffer_offset
	}, ; 79: Xamarin.Kotlin.StdLib
	%struct.CompressedAssemblyDescriptor {
		i32 28672, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 7869368; uint32_t buffer_offset
	}, ; 80: Xamarin.KotlinX.Coroutines.Core.Jvm
	%struct.CompressedAssemblyDescriptor {
		i32 91648, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 7898040; uint32_t buffer_offset
	}, ; 81: Xamarin.KotlinX.Serialization.Core.Jvm
	%struct.CompressedAssemblyDescriptor {
		i32 67584, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 7989688; uint32_t buffer_offset
	}, ; 82: CSSOrg.Mobile
	%struct.CompressedAssemblyDescriptor {
		i32 24576, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8057272; uint32_t buffer_offset
	}, ; 83: System.Collections.Concurrent
	%struct.CompressedAssemblyDescriptor {
		i32 22528, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8081848; uint32_t buffer_offset
	}, ; 84: System.Collections.Immutable
	%struct.CompressedAssemblyDescriptor {
		i32 15872, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8104376; uint32_t buffer_offset
	}, ; 85: System.Collections.NonGeneric
	%struct.CompressedAssemblyDescriptor {
		i32 10752, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8120248; uint32_t buffer_offset
	}, ; 86: System.Collections.Specialized
	%struct.CompressedAssemblyDescriptor {
		i32 31232, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8131000; uint32_t buffer_offset
	}, ; 87: System.Collections
	%struct.CompressedAssemblyDescriptor {
		i32 11776, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8162232; uint32_t buffer_offset
	}, ; 88: System.ComponentModel.Primitives
	%struct.CompressedAssemblyDescriptor {
		i32 94720, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8174008; uint32_t buffer_offset
	}, ; 89: System.ComponentModel.TypeConverter
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8268728; uint32_t buffer_offset
	}, ; 90: System.ComponentModel
	%struct.CompressedAssemblyDescriptor {
		i32 11776, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8273848; uint32_t buffer_offset
	}, ; 91: System.Console
	%struct.CompressedAssemblyDescriptor {
		i32 40448, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8285624; uint32_t buffer_offset
	}, ; 92: System.Diagnostics.DiagnosticSource
	%struct.CompressedAssemblyDescriptor {
		i32 11776, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8326072; uint32_t buffer_offset
	}, ; 93: System.Diagnostics.TraceSource
	%struct.CompressedAssemblyDescriptor {
		i32 11776, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8337848; uint32_t buffer_offset
	}, ; 94: System.Drawing.Primitives
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8349624; uint32_t buffer_offset
	}, ; 95: System.Drawing
	%struct.CompressedAssemblyDescriptor {
		i32 60416, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8354744; uint32_t buffer_offset
	}, ; 96: System.Formats.Asn1
	%struct.CompressedAssemblyDescriptor {
		i32 22016, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8415160; uint32_t buffer_offset
	}, ; 97: System.IO.Compression.Brotli
	%struct.CompressedAssemblyDescriptor {
		i32 31744, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8437176; uint32_t buffer_offset
	}, ; 98: System.IO.Compression
	%struct.CompressedAssemblyDescriptor {
		i32 6144, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8468920; uint32_t buffer_offset
	}, ; 99: System.IO.Pipelines
	%struct.CompressedAssemblyDescriptor {
		i32 354816, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8475064; uint32_t buffer_offset
	}, ; 100: System.Linq.Expressions
	%struct.CompressedAssemblyDescriptor {
		i32 62464, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8829880; uint32_t buffer_offset
	}, ; 101: System.Linq
	%struct.CompressedAssemblyDescriptor {
		i32 14336, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8892344; uint32_t buffer_offset
	}, ; 102: System.Memory
	%struct.CompressedAssemblyDescriptor {
		i32 122368, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 8906680; uint32_t buffer_offset
	}, ; 103: System.Net.Http
	%struct.CompressedAssemblyDescriptor {
		i32 38912, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9029048; uint32_t buffer_offset
	}, ; 104: System.Net.Primitives
	%struct.CompressedAssemblyDescriptor {
		i32 7168, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9067960; uint32_t buffer_offset
	}, ; 105: System.Net.Requests
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9075128; uint32_t buffer_offset
	}, ; 106: System.Numerics.Vectors
	%struct.CompressedAssemblyDescriptor {
		i32 17920, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9080248; uint32_t buffer_offset
	}, ; 107: System.ObjectModel
	%struct.CompressedAssemblyDescriptor {
		i32 72704, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9098168; uint32_t buffer_offset
	}, ; 108: System.Private.Uri
	%struct.CompressedAssemblyDescriptor {
		i32 396288, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9170872; uint32_t buffer_offset
	}, ; 109: System.Private.Xml
	%struct.CompressedAssemblyDescriptor {
		i32 9216, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9567160; uint32_t buffer_offset
	}, ; 110: System.Runtime.InteropServices
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9576376; uint32_t buffer_offset
	}, ; 111: System.Runtime.Loader
	%struct.CompressedAssemblyDescriptor {
		i32 77824, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9581496; uint32_t buffer_offset
	}, ; 112: System.Runtime.Numerics
	%struct.CompressedAssemblyDescriptor {
		i32 14336, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9659320; uint32_t buffer_offset
	}, ; 113: System.Runtime
	%struct.CompressedAssemblyDescriptor {
		i32 123904, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9673656; uint32_t buffer_offset
	}, ; 114: System.Security.Cryptography
	%struct.CompressedAssemblyDescriptor {
		i32 29696, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9797560; uint32_t buffer_offset
	}, ; 115: System.Text.Encodings.Web
	%struct.CompressedAssemblyDescriptor {
		i32 376320, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 9827256; uint32_t buffer_offset
	}, ; 116: System.Text.Json
	%struct.CompressedAssemblyDescriptor {
		i32 325120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 10203576; uint32_t buffer_offset
	}, ; 117: System.Text.RegularExpressions
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 10528696; uint32_t buffer_offset
	}, ; 118: System.Threading.Thread
	%struct.CompressedAssemblyDescriptor {
		i32 12288, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 10533816; uint32_t buffer_offset
	}, ; 119: System.Threading
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 10546104; uint32_t buffer_offset
	}, ; 120: System.Xml.ReaderWriter
	%struct.CompressedAssemblyDescriptor {
		i32 5120, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 10551224; uint32_t buffer_offset
	}, ; 121: System
	%struct.CompressedAssemblyDescriptor {
		i32 1998848, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 10556344; uint32_t buffer_offset
	}, ; 122: System.Private.CoreLib
	%struct.CompressedAssemblyDescriptor {
		i32 171008, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 12555192; uint32_t buffer_offset
	}, ; 123: Java.Interop
	%struct.CompressedAssemblyDescriptor {
		i32 22560, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 12726200; uint32_t buffer_offset
	}, ; 124: Mono.Android.Runtime
	%struct.CompressedAssemblyDescriptor {
		i32 2140160, ; uint32_t uncompressed_file_size
		i1 false, ; bool loaded
		i32 12748760; uint32_t buffer_offset
	} ; 125: Mono.Android
], align 16

@uncompressed_assemblies_data_size = dso_local local_unnamed_addr constant i32 14888920, align 4

@uncompressed_assemblies_data_buffer = dso_local local_unnamed_addr global [14888920 x i8] zeroinitializer, align 16

; Metadata
!llvm.module.flags = !{!0, !1}
!0 = !{i32 1, !"wchar_size", i32 4}
!1 = !{i32 7, !"PIC Level", i32 2}
!llvm.ident = !{!2}
!2 = !{!".NET for Android remotes/origin/release/10.0.1xx @ e1d3646df9cb50b2a0924f5b67fa78f9750ae489"}
!3 = !{!4, !4, i64 0}
!4 = !{!"any pointer", !5, i64 0}
!5 = !{!"omnipotent char", !6, i64 0}
!6 = !{!"Simple C++ TBAA"}
