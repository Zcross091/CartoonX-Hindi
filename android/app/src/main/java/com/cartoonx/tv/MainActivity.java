package com.cartoonx.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class MainActivity extends Activity {
    private static final String TAG = "CartoonX-MainActivity";
    private WebView webView;
    private UpdateManager updateManager;
    private WebViewAssetLoader assetLoader;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide system UI for 100% immersive Android TV Leanback experience
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

        // Configure WebViewAssetLoader to securely serve local assets under HTTPS
        assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " CartoonX-AndroidTV/1.0");

        webView.addJavascriptInterface(new AndroidAppBridge(), "AndroidApp");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                // Strictly keep the TV app inside our native interface - block all external web/ad takeovers
                if (host != null && host.equals("appassets.androidplatform.net")) {
                    return false;
                }
                Log.d(TAG, "Blocked external web redirect from hijacking TV UI: " + request.getUrl());
                return true;
            }
        });

        // Load self-contained native CartoonX TV application
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
    }

    /**
     * Native Javascript Interface exposed as window.AndroidApp
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

        /**
         * Native HTTP fetch: bypasses browser CORS and sandbox restrictions
         */
        @JavascriptInterface
        public String fetch(String targetUrl) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/json,*/*");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(18000);
                conn.connect();

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                reader.close();
                return sb.toString();
            } catch (Exception e) {
                Log.e(TAG, "Native fetch error for " + targetUrl, e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            } finally {
                if (conn != null) conn.disconnect();
            }
        }

        /**
         * Resolves HTTP 301/302 redirects and bypasses intermediate shortener/redirect landing pages
         */
        @JavascriptInterface
        public String resolveRedirect(String targetUrl) {
            String currentUrl = targetUrl;
            for (int i = 0; i < 5; i++) {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    conn.connect();

                    int code = conn.getResponseCode();
                    if (code >= 300 && code < 400) {
                        String loc = conn.getHeaderField("Location");
                        if (loc != null && !loc.isEmpty()) {
                            if (!loc.startsWith("http")) {
                                loc = new URL(url, loc).toString();
                            }
                            currentUrl = loc;
                            continue;
                        }
                    }
                    break;
                } catch (Exception e) {
                    break;
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
            return currentUrl;
        }

        /**
         * Native AES-256-GCM stream decryptor: guarantees 100% video source resolution on any TV
         */
        @JavascriptInterface
        public String decryptStream(String videoCode) {
            HttpURLConnection conn = null;
            try {
                String metaUrl = "https://bysekoze.com/api/videos/" + videoCode;
                URL url = new URL(metaUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
                conn.setRequestProperty("Referer", "https://bysekoze.com/e/" + videoCode);
                conn.setRequestProperty("Accept", "application/json, text/plain, */*");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);
                conn.connect();

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                JSONObject data = new JSONObject(sb.toString());
                if (!data.has("playback")) {
                    return "{\"error\":\"No playback object in API response\"}";
                }

                JSONObject playback = data.getJSONObject("playback");
                int v = Integer.parseInt(playback.getString("version"));
                JSONArray keyParts = playback.getJSONArray("key_parts");

                byte[] part1 = Base64.decode(keyParts.getString(v - 1).replace('-', '+').replace('_', '/'), Base64.DEFAULT);
                byte[] part2 = Base64.decode(keyParts.getString(31 - v - 1).replace('-', '+').replace('_', '/'), Base64.DEFAULT);

                byte[] key = new byte[part1.length + part2.length];
                System.arraycopy(part1, 0, key, 0, part1.length);
                System.arraycopy(part2, 0, key, part1.length, part2.length);

                byte[] iv = Base64.decode(playback.getString("iv").replace('-', '+').replace('_', '/'), Base64.DEFAULT);
                byte[] rawPayload = Base64.decode(playback.getString("payload").replace('-', '+').replace('_', '/'), Base64.DEFAULT);

                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                GCMParameterSpec spec = new GCMParameterSpec(128, iv);
                SecretKeySpec keySpec = new SecretKeySpec(key, "AES");
                cipher.init(Cipher.DECRYPT_MODE, keySpec, spec);

                byte[] decrypted = cipher.doFinal(rawPayload);
                return new String(decrypted, StandardCharsets.UTF_8);

            } catch (Exception e) {
                Log.e(TAG, "Native stream decryption failed for " + videoCode, e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            } finally {
                if (conn != null) conn.disconnect();
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
        // TV Remote Back button
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            webView.evaluateJavascript("if (window.onTVBack) { window.onTVBack(); } else if (history.length > 1) { history.back(); }", null);
            return true;
        }
        // TV Remote Media Play / Pause
        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
            webView.evaluateJavascript("if (window.togglePlayPause) { window.togglePlayPause(); }", null);
            return true;
        }
        // TV Remote Media Fast Forward (+10s)
        if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
            webView.evaluateJavascript("if (window.seekForward) { window.seekForward(10); }", null);
            return true;
        }
        // TV Remote Media Rewind (-10s)
        if (keyCode == KeyEvent.KEYCODE_MEDIA_REWIND) {
            webView.evaluateJavascript("if (window.seekRewind) { window.seekRewind(10); }", null);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
