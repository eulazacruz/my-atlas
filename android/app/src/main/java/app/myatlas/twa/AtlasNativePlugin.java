package app.myatlas.twa;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Rect;
import android.provider.Settings;
import android.os.Build;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.myatlas.twa.widgets.WidgetData;

@CapacitorPlugin(name = "AtlasNative")
public class AtlasNativePlugin extends Plugin {

    @PluginMethod
    public void getCutout(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject r = new JSObject();
            float density = getContext().getResources().getDisplayMetrics().density;
            r.put("density", density);
            r.put("hasCutout", false);
            r.put("left", 0); r.put("top", 0); r.put("right", 0); r.put("bottom", 0);
            try {
                View decor = getActivity().getWindow().getDecorView();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    WindowInsets wi = decor.getRootWindowInsets();
                    DisplayCutout dc = wi != null ? wi.getDisplayCutout() : null;
                    if (dc != null && !dc.getBoundingRects().isEmpty()) {
                        Rect best = null;
                        for (Rect rc : dc.getBoundingRects()) {
                            if (best == null || rc.top < best.top) best = rc;
                        }
                        int[] loc = new int[2];
                        decor.getLocationOnScreen(loc);
                        r.put("hasCutout", true);
                        r.put("left", best.left - loc[0]);
                        r.put("top", best.top - loc[1]);
                        r.put("right", best.right - loc[0]);
                        r.put("bottom", best.bottom - loc[1]);
                        r.put("safeTop", dc.getSafeInsetTop());
                    }
                }
            } catch (Exception ignored) { }
            call.resolve(r);
        });
    }

    @PluginMethod
    public void updateWidgets(PluginCall call) {
        String data = call.getString("data", "{}");
        WidgetData.save(getContext(), data);
        WidgetData.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void hasFirebase(PluginCall call) {
        int id = getContext().getResources().getIdentifier("google_app_id", "string", getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("value", id != 0);
        call.resolve(r);
    }

    @PluginMethod
    public void setDnd(PluginCall call) {
        JSObject r = new JSObject();
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) { r.put("value", "unsupported"); call.resolve(r); return; }
        if (!nm.isNotificationPolicyAccessGranted()) {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            r.put("value", "permission");
            call.resolve(r);
            return;
        }
        nm.setInterruptionFilter(on ? NotificationManager.INTERRUPTION_FILTER_PRIORITY : NotificationManager.INTERRUPTION_FILTER_ALL);
        r.put("value", "ok");
        call.resolve(r);
    }

    @PluginMethod
    public void setImmersive(PluginCall call) {
        MainActivity.immersive = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) ((MainActivity) getActivity()).applyImmersive();
        });
        call.resolve();
    }
}
