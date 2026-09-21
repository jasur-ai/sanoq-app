package com.jasurai.sanoq;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SanoqUpdater")
public class SanoqUpdaterPlugin extends Plugin {
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
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            Uri source = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(source);
            request.setTitle("Sanoq yangilanmoqda");
            request.setDescription("Yangi versiya yuklanmoqda...");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, "Sanoq-update.apk");

            activeDownloadId = manager.enqueue(request);
            registerDownloadReceiver(manager);

            JSObject result = new JSObject();
            result.put("downloadId", activeDownloadId);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Yangilanishni boshlashda xatolik: " + error.getMessage());
        }
    }

    private void registerDownloadReceiver(final DownloadManager manager) {
        if (downloadReceiver != null) return;

        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (completedId != activeDownloadId) return;

                Uri apkUri = manager.getUriForDownloadedFile(completedId);
                if (apkUri != null) openInstaller(apkUri);
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

    private void openInstaller(Uri apkUri) {
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        getContext().startActivity(installIntent);
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
