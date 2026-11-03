package com.cartoonx.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageInfo;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Environment;
import android.os.StatFs;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
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
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class MainActivity extends Activity {
    private static final String TAG = "CartoonX-MainActivity";
    private WebView webView;
    private UpdateManager updateManager;
    private WebViewAssetLoader assetLoader;
    private final ExecutorService downloadExecutor = Executors.newFixedThreadPool(2);
    private final ConcurrentHashMap<String, Boolean> activeDownloads = new ConcurrentHashMap<>();
    private volatile boolean isPlayerActive = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure TV remote Volume+ and Volume- keys directly control Android media stream volume
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

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
        // Force GPU hardware layer rendering for 60fps Leanback TV animations & low-RAM efficiency
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        rootLayout.addView(webView);

        updateManager = new UpdateManager(this);

        File moviesDir = getStorageDir();

        // Configure WebViewAssetLoader to securely serve local assets and downloads under HTTPS
        assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/downloads/", new DownloadsPathHandler(moviesDir))
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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setLoadsImagesAutomatically(true);
        // Do not waste GPU VRAM or RAM pre-rasterizing offscreen elements on 2GB-3GB TV hardware
        settings.setOffscreenPreRaster(false);

        // Enable third-party cookies for embedded video players & Cloudflare clearance tokens
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Use authentic Desktop Chrome User-Agent so Cloudflare Turnstile never detects a TV
        // and never triggers the Smart TV "Confirm you're not a robot" Cross-Device QR Code prompt
        settings.setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

        webView.addJavascriptInterface(new AndroidAppBridge(), "AndroidApp");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse assetResponse = assetLoader.shouldInterceptRequest(request.getUrl());
                if (assetResponse != null) {
                    return assetResponse;
                }

                // Seamlessly frame Razorshell & AnimeToon streaming embeds on Android TV
                // by removing restrictive frame-ancestors & X-Frame-Options headers on embed pages.
                // Media streams (m3u8, mp4, ts) and CDN assets (groovy.monster, static JS/CSS)
                // are NOT intercepted so Android WebView's native engine handles CORS, cookies,
                // Range byte requests (HTTP 206), and streaming without interference.
                String host = request.getUrl().getHost();
                String path = request.getUrl().getPath();
                if (host != null && host.contains("razorshell.space") && path != null && path.contains("/embed/")) {
                    try {
                        URL url = new URL(request.getUrl().toString());
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod(request.getMethod());
                        conn.setConnectTimeout(10000);
                        conn.setReadTimeout(15000);
                        conn.setInstanceFollowRedirects(true);

                        // Forward CookieManager cookies to HttpURLConnection
                        CookieManager cookieManager = CookieManager.getInstance();
                        String existingCookies = cookieManager.getCookie("https://" + host);
                        if (existingCookies != null && !existingCookies.isEmpty()) {
                            conn.setRequestProperty("Cookie", existingCookies);
                        }

                        // Forward request headers (excluding managed ones)
                        Map<String, String> reqHeaders = request.getRequestHeaders();
                        if (reqHeaders != null) {
                            for (Map.Entry<String, String> entry : reqHeaders.entrySet()) {
                                String k = entry.getKey();
                                if (!k.equalsIgnoreCase("Host") &&
                                    !k.equalsIgnoreCase("Referer") &&
                                    !k.equalsIgnoreCase("Cookie") &&
                                    !k.equalsIgnoreCase("User-Agent") &&
                                    !k.equalsIgnoreCase("Accept-Encoding")) {
                                    conn.setRequestProperty(k, entry.getValue());
                                }
                            }
                        }

                        // Set authentic desktop User-Agent and codedew referer needed by Razorshell
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                        conn.setRequestProperty("Referer", "https://codedew.com/cdn/liptron.php/");
                        conn.setRequestProperty("Accept-Encoding", "identity");

                        Map<String, List<String>> headerFields = conn.getHeaderFields();
                        Map<String, String> responseHeaders = new HashMap<>();
                        if (headerFields != null) {
                            for (Map.Entry<String, List<String>> entry : headerFields.entrySet()) {
                                if (entry.getKey() != null) {
                                    String key = entry.getKey().toLowerCase();
                                    // Strip frame-ancestors & X-Frame-Options to allow framing in Android TV WebView
                                    if (key.equals("content-security-policy") || key.equals("x-frame-options")) {
                                        continue;
                                    }
                                    // Sync Set-Cookie headers directly into WebView CookieManager
                                    if (key.equals("set-cookie")) {
                                        for (String cookieVal : entry.getValue()) {
                                            cookieManager.setCookie("https://" + host, cookieVal);
                                            cookieManager.setCookie("https://argon.razorshell.space", cookieVal);
                                        }
                                        cookieManager.flush();
                                    }
                                    if (!entry.getValue().isEmpty()) {
                                        responseHeaders.put(entry.getKey(), entry.getValue().get(0));
                                    }
                                }
                            }
                        }
                        // Remove content-encoding / content-length since identity is requested
                        responseHeaders.remove("content-encoding");
                        responseHeaders.remove("Content-Encoding");
                        responseHeaders.remove("content-length");
                        responseHeaders.remove("Content-Length");

                        String contentType = conn.getContentType();
                        String mimeType = "text/html";
                        String encoding = "UTF-8";
                        if (contentType != null) {
                            if (contentType.contains(";")) {
                                String[] parts = contentType.split(";");
                                mimeType = parts[0].trim();
                            } else {
                                mimeType = contentType.trim();
                            }
                        }
                        return new WebResourceResponse(mimeType, encoding, conn.getResponseCode(), conn.getResponseMessage(), responseHeaders, conn.getInputStream());
                    } catch (Exception e) {
                        Log.w(TAG, "Razorshell embed interceptor fallback: " + e.getMessage());
                    }
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // If it is NOT the top-level main window frame (i.e. it is an iframe, video stream, or sub-frame),
                // allow it to load its resources, scripts, and video streams!
                if (!request.isForMainFrame()) {
                    return false;
                }

                String host = request.getUrl().getHost();
                // Strictly keep the TV app main frame inside our native interface - block all external web/ad takeovers
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

    @Override
    protected void onDestroy() {
        super.onDestroy();
        downloadExecutor.shutdownNow();
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (webView != null && level >= TRIM_MEMORY_MODERATE) {
            // Free inactive WebView graphics & bitmap memory without dropping current state
            webView.clearCache(false);
        }
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        if (webView != null) {
            webView.clearCache(false);
        }
    }

    /**
     * Storage directory for offline downloads (movies/episodes)
     */
    public File getStorageDir() {
        File dir = getExternalFilesDir(Environment.DIRECTORY_MOVIES);
        if (dir == null) {
            dir = new File(getFilesDir(), "movies");
        }
        File cartoonxDir = new File(dir, "CartoonX");
        if (!cartoonxDir.exists()) {
            cartoonxDir.mkdirs();
        }
        return cartoonxDir;
    }

    /**
     * Custom PathHandler for WebViewAssetLoader to securely stream offline downloaded media.
     * Prevents directory traversal attacks and maps .m3u8 and .ts files with exact MIME types.
     */
    public static class DownloadsPathHandler implements WebViewAssetLoader.PathHandler {
        private final File baseDir;

        public DownloadsPathHandler(File baseDir) {
            this.baseDir = baseDir;
        }

        @Override
        public WebResourceResponse handle(String path) {
            try {
                File file = new File(baseDir, path);
                String canonicalBase = baseDir.getCanonicalPath();
                String canonicalTarget = file.getCanonicalPath();
                if (!canonicalTarget.startsWith(canonicalBase)) {
                    Log.w(TAG, "Blocked directory traversal attempt: " + path);
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", null, null);
                }
                if (!file.exists() || file.isDirectory()) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
                }

                String mimeType = "application/octet-stream";
                if (path.endsWith(".m3u8")) {
                    mimeType = "application/vnd.apple.mpegurl";
                } else if (path.endsWith(".ts")) {
                    mimeType = "video/mp2ts";
                } else if (path.endsWith(".mp4")) {
                    mimeType = "video/mp4";
                } else if (path.endsWith(".json")) {
                    mimeType = "application/json";
                }

                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                headers.put("Access-Control-Allow-Headers", "*");

                return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, new FileInputStream(file));
            } catch (Exception e) {
                Log.e(TAG, "Error handling download resource: " + path, e);
                return new WebResourceResponse("text/plain", "UTF-8", 500, "Internal Error", null, null);
            }
        }
    }

    private void deleteRecursive(File fileOrDir) {
        if (fileOrDir.isDirectory()) {
            File[] children = fileOrDir.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDir.delete();
    }

    private long getFolderSize(File dir) {
        long size = 0;
        if (dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    size += f.isDirectory() ? getFolderSize(f) : f.length();
                }
            }
        } else {
            size = dir.length();
        }
        return size;
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
        public void setPlayerActive(boolean active) {
            isPlayerActive = active;
            Log.d(TAG, "TV Player active state updated: " + active);
        }

        /**
         * Simulates a hardware-level touch/click directly at the center of the screen.
         * Penetrates cross-origin iframes, shadow roots, and embedded player overlays,
         * automatically starting playback without the user needing an airmouse or touchscreen!
         */
        @JavascriptInterface
        public void simulateCenterClick() {
            runOnUiThread(() -> {
                if (webView != null) {
                    int width = webView.getWidth();
                    int height = webView.getHeight();
                    if (width <= 0) width = 1920;
                    if (height <= 0) height = 1080;
                    final float x = width / 2.0f;
                    final float y = height / 2.0f;
                    final long downTime = SystemClock.uptimeMillis();

                    MotionEvent down = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0);
                    webView.dispatchTouchEvent(down);
                    down.recycle();

                    webView.postDelayed(() -> {
                        if (webView != null) {
                            long upTime = SystemClock.uptimeMillis();
                            MotionEvent up = MotionEvent.obtain(downTime, upTime, MotionEvent.ACTION_UP, x, y, 0);
                            webView.dispatchTouchEvent(up);
                            up.recycle();
                            Log.d(TAG, "Simulated native hardware touch tap at screen center (" + x + ", " + y + ")");
                        }
                    }, 60);
                }
            });
        }

        @JavascriptInterface
        public void sendMediaPlay() {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY));
                    webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY));
                }
            });
        }

        @JavascriptInterface
        public void sendMediaPause() {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PAUSE));
                    webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PAUSE));
                }
            });
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
        public long getAppLastUpdateTime() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.lastUpdateTime;
            } catch (Exception e) {
                return 0L;
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

        /**
         * Native HLS / MP4 Episode Downloader: saves streams for 100% offline TV playback
         */
        @JavascriptInterface
        public String downloadEpisode(String episodeId, String showTitle, String episodeTitle, String videoUrl, String posterUrl) {
            try {
                final String safeId = episodeId.replaceAll("[^a-zA-Z0-9_-]", "_");

                if (activeDownloads.containsKey(safeId)) {
                    return "{\"status\":\"already_downloading\"}";
                }

                // Check TV storage: require at least 300MB free disk space
                File storageDir = getStorageDir();
                StatFs stat = new StatFs(storageDir.getPath());
                long freeBytes = stat.getAvailableBytes();
                if (freeBytes < 300L * 1024L * 1024L) {
                    runOnUiThread(() -> webView.evaluateJavascript(
                        "if (window.onDownloadError) { window.onDownloadError('" + safeId + "', 'Low TV Storage: At least 300MB free space required.'); }",
                        null
                    ));
                    return "{\"error\":\"low_storage\"}";
                }

                activeDownloads.put(safeId, Boolean.TRUE);

                downloadExecutor.submit(() -> {
                    File epDir = new File(storageDir, safeId);
                    if (!epDir.exists()) {
                        epDir.mkdirs();
                    }

                    try {
                        long totalDownloadedBytes = 0;

                        if (videoUrl.contains(".m3u8")) {
                            // 1. Fetch Master Playlist or direct Chunklist
                            String playlistContent = fetchHttp(videoUrl);
                            String chunklistUrl = videoUrl;

                            if (playlistContent.contains("#EXT-X-STREAM-INF")) {
                                String[] lines = playlistContent.split("\n");
                                for (int i = 0; i < lines.length; i++) {
                                    String line = lines[i].trim();
                                    if (line.startsWith("#EXT-X-STREAM-INF") && (i + 1) < lines.length) {
                                        String nextLine = lines[i + 1].trim();
                                        if (!nextLine.startsWith("#") && !nextLine.isEmpty()) {
                                            chunklistUrl = new URL(new URL(videoUrl), nextLine).toString();
                                            break;
                                        }
                                    }
                                }
                                playlistContent = fetchHttp(chunklistUrl);
                            }

                            // 2. Parse all video TS segments
                            String[] chunkLines = playlistContent.split("\n");
                            List<String> segmentUrls = new ArrayList<>();
                            StringBuilder localM3u8 = new StringBuilder();

                            int segIndex = 0;
                            for (String line : chunkLines) {
                                String trimmed = line.trim();
                                if (!trimmed.startsWith("#") && !trimmed.isEmpty()) {
                                    String fullSegUrl = new URL(new URL(chunklistUrl), trimmed).toString();
                                    segmentUrls.add(fullSegUrl);
                                    localM3u8.append("seg_").append(segIndex).append(".ts\n");
                                    segIndex++;
                                } else {
                                    localM3u8.append(trimmed).append("\n");
                                }
                            }

                            if (segmentUrls.isEmpty()) {
                                throw new Exception("No playable video segments found in stream playlist.");
                            }

                            // Write local.m3u8 playlist with relative segment paths
                            File localM3u8File = new File(epDir, "local.m3u8");
                            try (FileWriter writer = new FileWriter(localM3u8File)) {
                                writer.write(localM3u8.toString());
                            }

                            // 3. Download segments sequentially
                            int totalSegments = segmentUrls.size();
                            for (int i = 0; i < totalSegments; i++) {
                                if (!activeDownloads.containsKey(safeId)) {
                                    // User cancelled download
                                    deleteRecursive(epDir);
                                    return;
                                }

                                String segUrl = segmentUrls.get(i);
                                File segFile = new File(epDir, "seg_" + i + ".ts");
                                long segBytes = downloadFile(segUrl, segFile);
                                totalDownloadedBytes += segBytes;

                                final int percent = (int) Math.round(((double) (i + 1) / totalSegments) * 100);
                                if (i % 3 == 0 || i == totalSegments - 1) {
                                    runOnUiThread(() -> webView.evaluateJavascript(
                                        "if (window.onDownloadProgress) { window.onDownloadProgress('" + safeId + "', " + percent + "); }",
                                        null
                                    ));
                                }
                            }
                        } else {
                            // Direct MP4 file download
                            File mp4File = new File(epDir, "video.mp4");
                            totalDownloadedBytes = downloadFileWithProgress(videoUrl, mp4File, safeId);
                        }

                        // 4. Save metadata JSON
                        JSONObject meta = new JSONObject();
                        meta.put("id", safeId);
                        meta.put("showTitle", showTitle);
                        meta.put("episodeTitle", episodeTitle);
                        meta.put("posterUrl", posterUrl);
                        meta.put("localUrl", "https://appassets.androidplatform.net/downloads/" + safeId + "/local.m3u8");
                        meta.put("sizeBytes", totalDownloadedBytes);
                        meta.put("sizeMb", Math.round((totalDownloadedBytes / (1024.0 * 1024.0)) * 10.0) / 10.0);
                        meta.put("downloadedAt", System.currentTimeMillis());

                        File metaFile = new File(epDir, "meta.json");
                        try (FileWriter writer = new FileWriter(metaFile)) {
                            writer.write(meta.toString());
                        }

                        activeDownloads.remove(safeId);

                        runOnUiThread(() -> webView.evaluateJavascript(
                            "if (window.onDownloadComplete) { window.onDownloadComplete('" + safeId + "'); }",
                            null
                        ));

                    } catch (Exception e) {
                        Log.e(TAG, "Download failed for episode: " + safeId, e);
                        activeDownloads.remove(safeId);
                        deleteRecursive(epDir);

                        runOnUiThread(() -> webView.evaluateJavascript(
                            "if (window.onDownloadError) { window.onDownloadError('" + safeId + "', '" + escapeJs(e.getMessage()) + "'); }",
                            null
                        ));
                    }
                });

                return "{\"status\":\"started\"}";
            } catch (Exception e) {
                Log.e(TAG, "Error initiating download", e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public boolean cancelDownload(String episodeId) {
            String safeId = episodeId.replaceAll("[^a-zA-Z0-9_-]", "_");
            if (activeDownloads.containsKey(safeId)) {
                activeDownloads.remove(safeId);
                File epDir = new File(getStorageDir(), safeId);
                deleteRecursive(epDir);
                return true;
            }
            return false;
        }

        @JavascriptInterface
        public String getDownloadedEpisodes() {
            try {
                File storageDir = getStorageDir();
                File[] episodeDirs = storageDir.listFiles();
                JSONArray result = new JSONArray();

                if (episodeDirs != null) {
                    for (File dir : episodeDirs) {
                        if (dir.isDirectory()) {
                            File metaFile = new File(dir, "meta.json");
                            File localM3u8 = new File(dir, "local.m3u8");
                            File localMp4 = new File(dir, "video.mp4");

                            if (metaFile.exists() && (localM3u8.exists() || localMp4.exists())) {
                                try (BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(metaFile), StandardCharsets.UTF_8))) {
                                    StringBuilder sb = new StringBuilder();
                                    String line;
                                    while ((line = br.readLine()) != null) {
                                        sb.append(line);
                                    }
                                    result.put(new JSONObject(sb.toString()));
                                } catch (Exception ignored) {}
                            }
                        }
                    }
                }
                return result.toString();
            } catch (Exception e) {
                Log.e(TAG, "Failed reading downloaded episodes", e);
                return "[]";
            }
        }

        @JavascriptInterface
        public boolean deleteDownloadedEpisode(String episodeId) {
            try {
                String safeId = episodeId.replaceAll("[^a-zA-Z0-9_-]", "_");
                File epDir = new File(getStorageDir(), safeId);
                if (epDir.exists()) {
                    deleteRecursive(epDir);
                    return true;
                }
                return false;
            } catch (Exception e) {
                Log.e(TAG, "Failed to delete episode: " + episodeId, e);
                return false;
            }
        }

        @JavascriptInterface
        public String getStorageInfo() {
            try {
                File storageDir = getStorageDir();
                StatFs stat = new StatFs(storageDir.getPath());
                long freeBytes = stat.getAvailableBytes();
                long totalBytes = stat.getTotalBytes();
                long appBytes = getFolderSize(storageDir);

                JSONObject obj = new JSONObject();
                obj.put("freeBytes", freeBytes);
                obj.put("totalBytes", totalBytes);
                obj.put("appBytes", appBytes);
                obj.put("freeMb", Math.round((freeBytes / (1024.0 * 1024.0))));
                obj.put("totalMb", Math.round((totalBytes / (1024.0 * 1024.0))));
                obj.put("appMb", Math.round((appBytes / (1024.0 * 1024.0))));
                return obj.toString();
            } catch (Exception e) {
                return "{\"freeBytes\":0,\"totalBytes\":0,\"appBytes\":0}";
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
                                "if (window.onUpdateError) { window.onUpdateError('" + escapeJs(message) + "'); }",
                                null
                            );
                        });
                    }
                });
            });
        }
    }

    private String fetchHttp(String targetUrl) throws Exception {
        URL url = new URL(targetUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
        conn.setRequestProperty("Accept", "*/*");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(15000);
        conn.connect();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } finally {
            conn.disconnect();
        }
    }

    private long downloadFile(String fileUrl, File destination) throws Exception {
        URL url = new URL(fileUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
        conn.setRequestProperty("Accept", "*/*");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(20000);
        conn.connect();

        try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(destination)) {
            byte[] buffer = new byte[8192];
            int read;
            long total = 0;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                total += read;
            }
            out.flush();
            return total;
        } finally {
            conn.disconnect();
        }
    }

    private long downloadFileWithProgress(String fileUrl, File destination, String safeId) throws Exception {
        URL url = new URL(fileUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
        conn.setRequestProperty("Accept", "*/*");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(20000);
        conn.connect();

        long contentLength = conn.getContentLengthLong();

        try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(destination)) {
            byte[] buffer = new byte[8192];
            int read;
            long total = 0;
            long lastReport = 0;

            while ((read = in.read(buffer)) != -1) {
                if (!activeDownloads.containsKey(safeId)) {
                    throw new Exception("Download cancelled by user");
                }
                out.write(buffer, 0, read);
                total += read;

                if (contentLength > 0 && (total - lastReport > 256 * 1024 || total == contentLength)) {
                    lastReport = total;
                    final int percent = (int) Math.round(((double) total / contentLength) * 100);
                    runOnUiThread(() -> webView.evaluateJavascript(
                        "if (window.onDownloadProgress) { window.onDownloadProgress('" + safeId + "', " + percent + "); }",
                        null
                    ));
                }
            }
            out.flush();
            return total;
        } finally {
            conn.disconnect();
        }
    }

    private static String escapeJs(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                   .replace("'", "\\'")
                   .replace("\"", "\\\"")
                   .replace("\n", " ")
                   .replace("\r", "");
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
        // TV Remote D-Pad Center OK, Enter, or Select Key
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER || keyCode == KeyEvent.KEYCODE_BUTTON_A) {
            if (isPlayerActive) {
                webView.evaluateJavascript("if (window.handlePlayerCenterClick) { window.handlePlayerCenterClick(); } else if (window.togglePlayPause) { window.togglePlayPause(); }", null);
                return true;
            }
        }
        // TV Remote D-Pad Up / Down keys in video player:
        // Strictly prevent D-Pad Up/Down from interfering with player software volume.
        // The player volume stays pinned at MAX (100%), and users control sound with TV volume keys.
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
            if (isPlayerActive) {
                webView.evaluateJavascript(
                    keyCode == KeyEvent.KEYCODE_DPAD_UP 
                        ? "if (window.handlePlayerDpadUp) { window.handlePlayerDpadUp(); }" 
                        : "if (window.handlePlayerDpadDown) { window.handlePlayerDpadDown(); }", 
                    null
                );
                return true;
            }
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
