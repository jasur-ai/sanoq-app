package com.jasurai.sanoq;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.util.Log;

/** Completes a PackageInstaller session and reopens Sanoq after replacement. */
public class UpdateInstallReceiver extends BroadcastReceiver {
    private static final String TAG = "SanoqUpdater";

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmation;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }
            if (confirmation != null) {
                confirmation.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirmation);
            }
            return;
        }

        if (status == PackageInstaller.STATUS_SUCCESS) {
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(launchIntent);
            }
            return;
        }

        Log.e(TAG, "APK o‘rnatilmadi: " + intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE));
    }
}
