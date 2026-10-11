package com.dynamongamer.launcher;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Read-only baseline. No container, hooks, game editing or account handling. */
public final class MainActivity extends Activity {
    private static final String GAME = "com.funtomic.dynamons3";
    private static final String MOD = "com.funtomic.dynamons";
    private TextView details;
    private TextView status;
    private Button launch;
    private String report = "";
    private boolean waitingForReturn;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(10, 22, 35));
        getWindow().setNavigationBarColor(Color.rgb(10, 22, 35));
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setFitsSystemWindows(true);
        scroll.setBackgroundColor(Color.rgb(10, 22, 35));
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(24);
        panel.setPadding(pad, pad, pad, pad);
        scroll.addView(panel);
        TextView heading = text("DYNAMON GAMER\nLauncher baseline", 26);
        panel.addView(heading);
        panel.addView(text("Step 1: test the original game", 19));
        panel.addView(text("This launcher reads installed app details and opens Dynamons normally. "
            + "Container startup and Royal Void attachment are not implemented yet.", 15));
        status = text("", 15);
        panel.addView(status);
        launch = button("Open original Dynamons", panel);
        launch.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { launchOriginal(); }
        });
        button("Refresh installed app details", panel).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { refresh(); }
        });
        button("Share diagnostic report", panel).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { shareReport(); }
        });
        panel.addView(text("After opening the game, test Google sign-in, check your player "
            + "profile and saved progress, then return here. This launcher cannot observe "
            + "those results automatically.", 15));
        details = text("", 13);
        details.setTextIsSelectable(true);
        panel.addView(details);
        setContentView(scroll);
        refresh();
    }

    @Override public void onResume() {
        super.onResume();
        if (details != null) {
            refresh();
            if (waitingForReturn) {
                waitingForReturn = false;
                status.setText("Returned to launcher. Record the sign-in/profile result separately; "
                    + "returning does not prove login succeeded.");
            }
        }
    }

    private TextView text(String value, int size) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(Color.rgb(222, 235, 249));
        view.setPadding(0, dp(10), 0, dp(10));
        return view;
    }

    private Button button(String label, LinearLayout panel) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(8);
        panel.addView(button, lp);
        return button;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void refresh() {
        StringBuilder out = new StringBuilder("Dynamons launcher baseline 0.1.0\n");
        out.append("Generated: ").append(new SimpleDateFormat(
            "yyyy-MM-dd HH:mm:ss Z", Locale.US).format(new Date())).append('\n');
        out.append("Android: ").append(Build.VERSION.RELEASE)
            .append(" (API ").append(Build.VERSION.SDK_INT).append(")\n");
        out.append("Supported ABIs: ").append(String.join(", ", Build.SUPPORTED_ABIS)).append('\n');
        out.append("Container: not implemented\nMenu attachment: not implemented\n");
        boolean installed = appendPackage(out, GAME, "Expected original package", true);
        appendPackage(out, MOD, "Previously supplied mod package", true);
        appendPackage(out, "com.google.android.gms", "Google-services package", false);
        appendPackage(out, "com.google.android.play.games", "Play Games package", false);
        out.append("\nPackage names do not authenticate a publisher. Fingerprints are reported ")
            .append("from Android; no trusted official signer has been supplied for comparison.\n")
            .append("Login/profile/cloud-save and Arena write results are not measured here.\n")
            .append("No email, account token, game save or device identifier is collected.\n");
        report = out.toString();
        details.setText(report);
        Intent intent = getPackageManager().getLaunchIntentForPackage(GAME);
        launch.setEnabled(installed && intent != null);
        status.setText(installed ? "Expected game package found. Its publisher identity is not yet verified."
            : "Original game package not found. Install Dynamons World from its official store listing first.");
    }

    @SuppressWarnings("deprecation")
    private boolean appendPackage(StringBuilder out, String name, String label, boolean signer) {
        out.append('\n').append(label).append(": ").append(name).append('\n');
        try {
            int flags = signer ? (Build.VERSION.SDK_INT >= 28
                ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES) : 0;
            PackageInfo info = getPackageManager().getPackageInfo(name, flags);
            long code = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            out.append("Installed version: ").append(info.versionName)
                .append(" / ").append(code).append('\n');
            out.append("Split count: ").append(info.splitNames == null ? 0 : info.splitNames.length).append('\n');
            if (info.splitNames != null) out.append("Splits: ").append(String.join(", ", info.splitNames)).append('\n');
            if (signer) {
                Signature[] signatures = Build.VERSION.SDK_INT >= 28
                    ? (info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners())
                    : info.signatures;
                if (signatures == null || signatures.length == 0) out.append("Signer unavailable\n");
                else for (int i = 0; i < signatures.length; i++) {
                    out.append("Current signer ").append(i + 1).append(" SHA-1: ")
                        .append(fingerprint(signatures[i], "SHA-1")).append('\n');
                    out.append("Current signer ").append(i + 1).append(" SHA-256: ")
                        .append(fingerprint(signatures[i], "SHA-256")).append('\n');
                }
            }
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            out.append("Not installed or not visible to this app\n");
        } catch (Exception e) {
            out.append("Inspection failed: ").append(e.getClass().getSimpleName()).append('\n');
        }
        return false;
    }

    private String fingerprint(Signature signer, String algorithm) throws Exception {
        byte[] bytes = MessageDigest.getInstance(algorithm).digest(signer.toByteArray());
        StringBuilder value = new StringBuilder();
        for (byte b : bytes) {
            if (value.length() > 0) value.append(':');
            value.append(String.format(Locale.US, "%02X", b & 255));
        }
        return value.toString();
    }

    private void launchOriginal() {
        Intent intent = getPackageManager().getLaunchIntentForPackage(GAME);
        if (intent == null) { refresh(); return; }
        try {
            startActivity(intent);
            waitingForReturn = true;
        } catch (ActivityNotFoundException | SecurityException e) {
            status.setText("Game could not open: " + e.getClass().getSimpleName());
        }
    }

    private void shareReport() {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_SUBJECT, "Dynamons launcher diagnostic report");
        intent.putExtra(Intent.EXTRA_TEXT, report);
        try { startActivity(Intent.createChooser(intent, "Share diagnostic report")); }
        catch (ActivityNotFoundException e) { status.setText("No sharing app is available. Select and copy the report below."); }
    }
}
