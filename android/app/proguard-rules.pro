# CartoonX Proguard Rules
-keep class com.cartoonx.tv.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
