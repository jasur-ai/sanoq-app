package com.jasurai.sanoq;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Reopens Sanoq after Android finishes replacing the APK. */
public class UpdateCompletedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_PACKAGE_REPLACED.equals(intent.getAction())) return;
        if (intent.getData() == null || !context.getPackageName().equals(intent.getData().getSchemeSpecificPart())) return;

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) return;
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launchIntent);
    }
}
