package com.dynamongamer.containerprobe;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.fvbox.lib.FCore;
import com.fvbox.lib.common.pm.InstallResult;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Experimental startup probe only: no menu, save import, microG install or game patching. */
public final class ProbeActivity extends Activity {
    private static final String GAME = "com.funtomic.dynamons3";
    private static final int USER = 0;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final StringBuilder journal = new StringBuilder();
    private TextView log;
    private Button prepare;
    private Button launch;
    private boolean busy;
    private volatile boolean compatible;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(20 * getResources().getDisplayMetrics().density);
        panel.setPadding(padding, padding, padding, padding);
        scroll.addView(panel);
        TextView heading = new TextView(this);
        heading.setText("Dynamons Container Probe\nExperimental 0.1.0");
        heading.setTextSize(24);
        panel.addView(heading);
        TextView note = new TextView(this);
        note.setText("Uses the published SpaceCore SDK. Android 16 support is unverified. "
            + "Import the installed original game first. This has a separate game-data area; "
            + "your original save/account session is not copied. Menu attachment is not implemented.");
        panel.addView(note);
        prepare = addButton(panel, "Import installed original game");
        launch = addButton(panel, "Launch inside container");
        launch.setEnabled(false);
        prepare.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { importOriginal(); }
        });
        launch.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { launchInside(); }
        });
        addButton(panel, "Share startup report").setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { share(); }
        });
        log = new TextView(this);
        log.setTextIsSelectable(true);
        panel.addView(log);
        setContentView(scroll);
        String previous = getPreferences(MODE_PRIVATE).getString("startup_report", "");
        if (!previous.isEmpty()) journal.append(previous).append("\n--- New host session ---\n");
        record("Android API " + Build.VERSION.SDK_INT + "; ABI " + Arrays.toString(Build.SUPPORTED_ABIS));
        record(ProbeApplication.initialization);
        prepare.setEnabled(ProbeApplication.ready);
        if (Build.VERSION.SDK_INT >= 36) record("Android 16: compatibility test, not verified SDK support.");
    }

    private Button addButton(LinearLayout panel, String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        panel.addView(button);
        return button;
    }

    private void record(final String message) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                if (isDestroyed()) return;
                journal.append(message).append('\n');
                if (journal.length() > 32768) journal.delete(0, journal.length() - 32768);
                getPreferences(MODE_PRIVATE).edit().putString("startup_report", journal.toString()).apply();
                log.setText(journal.toString());
            }
        });
    }

    private void importOriginal() {
        if (busy) return;
        busy = true;
        compatible = false;
        launch.setEnabled(false);
        prepare.setEnabled(false);
        record("Import requested. Original installed APK files are not rebuilt or re-signed.");
        worker.execute(new Runnable() {
            @Override public void run() {
                try {
                    PackageInfo original = getPackageManager().getPackageInfo(GAME, 0);
                    record("Original version: " + original.versionName + "; splits: " + Arrays.toString(original.splitNames));
                    if (!FCore.get().isInstalled(GAME, USER)) {
                        InstallResult result = FCore.get().installPackageAsUser(GAME, USER);
                        if (result == null || !result.getSuccess()) {
                            record("Import failed: " + (result == null ? "no SDK result" : result.getMsg()));
                            return;
                        }
                    } else {
                        record("Existing container installation reused; no repeated import requested.");
                    }
                    PackageInfo guest = FCore.get().getPackageInfo(GAME, 0, USER);
                    if (guest == null) { record("Imported package information is unavailable."); return; }
                    if (guest.versionCode != original.versionCode) {
                        record("Launch blocked: original and container game versions differ.");
                        return;
                    }
                    Set<String> expected = splitSet(original);
                    Set<String> actual = splitSet(guest);
                    record("Container splits: " + actual);
                    if (!expected.equals(actual)) {
                        record("Launch blocked: container split metadata differs. Expected " + expected);
                        return;
                    }
                    int expectedPaths = original.applicationInfo.splitSourceDirs == null ? 0 : original.applicationInfo.splitSourceDirs.length;
                    int actualPaths = guest.applicationInfo.splitSourceDirs == null ? 0 : guest.applicationInfo.splitSourceDirs.length;
                    if (actualPaths != expectedPaths) {
                        record("Launch blocked: container has " + actualPaths + " split paths; expected " + expectedPaths);
                        return;
                    }
                    compatible = true;
                    record("Import and split-metadata checks passed. This does not prove game startup or login.");
                } catch (PackageManager.NameNotFoundException missing) {
                    record("Original game is not installed/visible. Install it from its official listing.");
                } catch (Throwable failure) {
                    record("Import error: " + failure.getClass().getSimpleName() + ": " + failure.getMessage());
                } finally {
                    runOnUiThread(new Runnable() {
                        @Override public void run() {
                            if (isDestroyed()) return;
                            busy = false;
                            prepare.setEnabled(ProbeApplication.ready);
                            launch.setEnabled(compatible);
                        }
                    });
                }
            }
        });
    }

    private Set<String> splitSet(PackageInfo info) {
        return new HashSet<String>(info.splitNames == null
            ? java.util.Collections.<String>emptyList() : Arrays.asList(info.splitNames));
    }

    private void launchInside() {
        if (!compatible || busy) return;
        try {
            FCore.get().launchApk(GAME, USER);
            record("Container launch requested. Confirm actual game screen separately; no automatic login claim.");
        } catch (Throwable failure) {
            record("Launch error: " + failure.getClass().getSimpleName() + ": " + failure.getMessage());
        }
    }

    private void share() {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, journal.toString());
        try { startActivity(Intent.createChooser(intent, "Share startup report")); }
        catch (RuntimeException unavailable) { record("Sharing unavailable; select and copy the report."); }
    }

    @Override protected void onDestroy() {
        worker.shutdown();
        super.onDestroy();
    }
}
