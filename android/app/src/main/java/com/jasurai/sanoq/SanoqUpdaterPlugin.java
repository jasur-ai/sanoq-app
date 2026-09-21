package com.jasurai.sanoq;

import android.app.DownloadManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "SanoqUpdater")
public class SanoqUpdaterPlugin extends Plugin {
    private static final String TAG = "SanoqUpdater";
    private static final String UPDATE_FILE_NAME = "Sanoq-update.apk";
    private BroadcastReceiver downloadReceiver;
    private long activeDownloadId = -1L;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("Yangilanish manzili topilmadi");
            return;
        }

        try {
            File updateFile = getUpdateFile();
            if (isNewerLocalUpdate(updateFile)) {
                installDownloadedApk(fileProviderUri(updateFile));
                call.resolve();
                return;
            }
            if (updateFile.exists() && !updateFile.delete()) {
                Log.w(TAG, "Eski update APK o‘chirilmadi; yangi yuklama ustiga yoziladi");
            }

            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Sanoq yangilanmoqda");
            request.setDescription("Yangi versiya yuklanmoqda...");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, UPDATE_FILE_NAME);

            activeDownloadId = manager.enqueue(request);
            registerDownloadReceiver(manager);

            JSObject result = new JSObject();
            result.put("downloadId", activeDownloadId);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Yangilanishni boshlashda xatolik: " + error.getMessage());
        }
    }

    private File getUpdateFile() {
        File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (directory == null) throw new IllegalStateException("Update papkasi topilmadi");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Update papkasi yaratilmadi");
        return new File(directory, UPDATE_FILE_NAME);
    }

    private boolean isNewerLocalUpdate(File file) throws Exception {
        if (!file.exists() || file.length() < 1024) return false;
        PackageInfo current = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
        PackageInfo archive = getContext().getPackageManager().getPackageArchiveInfo(file.getAbsolutePath(), 0);
        if (archive == null || !getContext().getPackageName().equals(archive.packageName)) return false;
        long currentCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? current.getLongVersionCode() : current.versionCode;
        long archiveCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? archive.getLongVersionCode() : archive.versionCode;
        return archiveCode > currentCode;
    }

    private Uri fileProviderUri(File file) {
        return FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
    }

    private void registerDownloadReceiver(final DownloadManager manager) {
        if (downloadReceiver != null) return;

        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (completedId != activeDownloadId) return;

                Uri apkUri = manager.getUriForDownloadedFile(completedId);
                if (apkUri != null) {
                    installDownloadedApk(apkUri);
                } else {
                    Log.e(TAG, "Yuklangan APK manzili topilmadi");
                }
                unregisterDownloadReceiver();
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.registerReceiver(getContext(), downloadReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(downloadReceiver, filter);
        }
    }

    private void installDownloadedApk(final Uri apkUri) {
        new Thread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    installWithPackageInstaller(apkUri);
                } else {
                    openLegacyInstaller(apkUri);
                }
            } catch (Exception error) {
                Log.e(TAG, "APK o‘rnatishda xatolik", error);
                openLegacyInstaller(apkUri);
            }
        }, "sanoq-apk-install").start();
    }

    private InputStream openApkInput(Uri apkUri) throws Exception {
        if ("file".equals(apkUri.getScheme())) return new FileInputStream(new File(apkUri.getPath()));
        InputStream input = getContext().getContentResolver().openInputStream(apkUri);
        if (input == null) throw new IllegalStateException("APK faylini o‘qib bo‘lmadi");
        return input;
    }

    private void installWithPackageInstaller(Uri apkUri) throws Exception {
        PackageInstaller packageInstaller = getContext().getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(getContext().getPackageName());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        }

        int sessionId = packageInstaller.createSession(params);
        PackageInstaller.Session session = packageInstaller.openSession(sessionId);
        try {
            try (InputStream input = openApkInput(apkUri);
                 OutputStream output = session.openWrite(UPDATE_FILE_NAME, 0, -1)) {
                byte[] buffer = new byte[64 * 1024];
                int length;
                while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
                session.fsync(output);
            }

            Intent callbackIntent = new Intent(getContext(), UpdateInstallReceiver.class);
            callbackIntent.setAction("com.jasurai.sanoq.UPDATE_INSTALL_RESULT");
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) pendingFlags |= PendingIntent.FLAG_MUTABLE;
            PendingIntent callback = PendingIntent.getBroadcast(getContext(), sessionId, callbackIntent, pendingFlags);
            session.commit(callback.getIntentSender());

            if (getActivity() != null) getActivity().runOnUiThread(() -> getActivity().finishAndRemoveTask());
        } finally {
            session.close();
        }
    }

    @SuppressWarnings("deprecation")
    private void openLegacyInstaller(Uri apkUri) {
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        getContext().startActivity(installIntent);
        if (getActivity() != null) getActivity().runOnUiThread(() -> getActivity().finishAndRemoveTask());
    }

    private void unregisterDownloadReceiver() {
        if (downloadReceiver == null) return;
        try {
            getContext().unregisterReceiver(downloadReceiver);
        } catch (IllegalArgumentException ignored) {
            // Receiver was already unregistered.
        }
        downloadReceiver = null;
    }
}
