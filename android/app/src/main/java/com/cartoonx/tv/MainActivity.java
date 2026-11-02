package com.cartoonx.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.File;

public class MainActivity extends Activity {
    private static final String TAG = "CartoonX-MainActivity";
    private WebView webView;
    private UpdateManager updateManager;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide system UI for immersive TV experience
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );

        FrameLayout rootLayout = new FrameLayout(this);
        setContentView(rootLayout);

        webView = new WebView(this);
        rootLayout.addView(webView);

        updateManager = new UpdateManager(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUserAgentString(settings.getUserAgentString() + " CartoonX-AndroidTV/1.0");

        // Expose Javascript Interface for the web frontend to communicate with native updater
        webView.addJavascriptInterface(new AndroidAppBridge(), "AndroidApp");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false; // Load all routes in-app
            }
        });

        // Load the local or hosted CartoonX platform
        // In local development or packaged build, loads root URL
        webView.loadUrl("https://raretoonindia.in/");
    }

    /**
     * Javascript Interface exposed to Web UI as window.AndroidApp
     */
    public class AndroidAppBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionName != null ? pInfo.versionName : "1.0.0";
            } catch (Exception e) {
                return "1.0.0";
            }
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionCode;
            } catch (Exception e) {
                return 1;
            }
        }

        @JavascriptInterface
        public void downloadAndInstallUpdate(String apkUrl, String versionName) {
            runOnUiThread(() -> {
                Log.d(TAG, "Triggering in-app update from JS bridge: " + apkUrl);
                updateManager.downloadAndInstall(apkUrl, versionName, new UpdateManager.UpdateListener() {
                    @Override
                    public void onProgress(int percent, long downloadedBytes, long totalBytes) {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript(
                                "if (window.onUpdateProgress) { window.onUpdateProgress(" + percent + ", " + downloadedBytes + ", " + totalBytes + "); }",
                                null
                            );
                        });
                    }

                    @Override
                    public void onComplete(File apkFile) {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript(
                                "if (window.onUpdateComplete) { window.onUpdateComplete(); }",
                                null
                            );
                        });
                    }

                    @Override
                    public void onError(String message) {
                        runOnUiThread(() -> {
                            webView.evaluateJavascript(
                                "if (window.onUpdateError) { window.onUpdateError('" + message.replace("'", "\\'") + "'); }",
                                null
                            );
                        });
                    }
                });
            });
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle TV Remote Back button
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}

