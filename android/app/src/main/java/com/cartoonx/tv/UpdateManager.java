package com.cartoonx.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

public class UpdateManager {
    private static final String TAG = "CartoonX-Update";
    private final Activity activity;
    private final Handler mainHandler;

    public interface UpdateListener {
        void onProgress(int percent, long downloadedBytes, long totalBytes);
        void onComplete(File apkFile);
        void onError(String message);
    }

    public UpdateManager(Activity activity) {
        this.activity = activity;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    /**
     * Downloads new APK in a background thread and triggers in-place installation.
     */
    public void downloadAndInstall(String apkUrl, String versionName, UpdateListener listener) {
        new Thread(() -> {
            InputStream in = null;
            FileOutputStream out = null;
            HttpURLConnection conn = null;

            try {
                Log.d(TAG, "Starting update download from: " + apkUrl);
                URL url = new URL(apkUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "CartoonX-AndroidTV/1.0");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.connect();

                int responseCode = conn.getResponseCode();
                // Handle HTTP redirects (301, 302, 307, 308)
                if (responseCode == HttpURLConnection.HTTP_MOVED_PERM || 
                    responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                    responseCode == 307 || responseCode == 308) {
                    String newUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    url = new URL(newUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("User-Agent", "CartoonX-AndroidTV/1.0");
                    conn.connect();
                    responseCode = conn.getResponseCode();
                }

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    throw new Exception("Server returned HTTP " + responseCode);
                }

                long fileLength = conn.getContentLengthLong();
                File cacheDir = activity.getExternalCacheDir();
                if (cacheDir == null) {
                    cacheDir = activity.getCacheDir();
                }

                File updateFile = new File(cacheDir, "cartoonx_update_" + (versionName != null ? versionName : "latest") + ".apk");
                if (updateFile.exists()) {
                    updateFile.delete();
                }

                in = conn.getInputStream();
                out = new FileOutputStream(updateFile);

                byte[] buffer = new byte[8192];
                long total = 0;
                int count;
                long lastProgressTime = 0;

                while ((count = in.read(buffer)) != -1) {
                    total += count;
                    out.write(buffer, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 250 && fileLength > 0) {
                        int percent = (int) ((total * 100) / fileLength);
                        long currentTotal = total;
                        mainHandler.post(() -> {
                            if (listener != null) {
                                listener.onProgress(percent, currentTotal, fileLength);
                            }
                        });
                        lastProgressTime = now;
                    }
                }

                out.flush();
                Log.d(TAG, "Download finished. APK path: " + updateFile.getAbsolutePath() + " Size: " + updateFile.length());

                mainHandler.post(() -> {
                    if (listener != null) {
                        listener.onComplete(updateFile);
                    }
                    installApk(updateFile, listener);
                });

            } catch (Exception e) {
                Log.e(TAG, "Download update failed", e);
                mainHandler.post(() -> {
                    if (listener != null) {
                        listener.onError(e.getMessage() != null ? e.getMessage() : "Download error");
                    }
                });
            } finally {
                try {
                    if (out != null) out.close();
                    if (in != null) in.close();
                    if (conn != null) conn.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    /**
     * Prompts the Android OS PackageInstaller to install the update in-place without deleting the old app.
     */
    public void installApk(File apkFile) {
        installApk(apkFile, null);
    }

    public void installApk(File apkFile, UpdateListener listener) {
        try {
            if (apkFile == null || !apkFile.exists()) {
                Log.e(TAG, "APK file does not exist");
                if (listener != null) {
                    listener.onError("Downloaded update APK not found");
                }
                return;
            }

            apkFile.setReadable(true, false);

            // Check Unknown Sources permission on Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!activity.getPackageManager().canRequestPackageInstalls()) {
                    Log.w(TAG, "Install permission not granted. Directing user to Settings.");
                    try {
                        Intent manageIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                        manageIntent.setData(Uri.parse("package:" + activity.getPackageName()));
                        manageIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(manageIntent);
                    } catch (Exception e1) {
                        try {
                            Intent fallback = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            activity.startActivity(fallback);
                        } catch (Exception ignored) {}
                    }
                    if (listener != null) {
                        listener.onError("Please toggle 'Allow from this source' in Settings, then tap Install Update again.");
                    }
                    return;
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                activity,
                activity.getPackageName() + ".fileprovider",
                apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

            // Explicitly grant read URI permissions to PackageInstaller handlers
            try {
                List<ResolveInfo> resInfoList = activity.getPackageManager().queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY);
                for (ResolveInfo resolveInfo : resInfoList) {
                    String packageName = resolveInfo.activityInfo.packageName;
                    activity.grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }
                activity.grantUriPermission("com.google.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                activity.grantUriPermission("com.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}

            Log.d(TAG, "Launching PackageInstaller for in-place update: " + apkUri);
            activity.startActivity(installIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch package installer", e);
            if (listener != null) {
                listener.onError("Failed to launch installer: " + (e.getMessage() != null ? e.getMessage() : "permission denied"));
            }
        }
    }
}

