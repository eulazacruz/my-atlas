package app.myatlas.twa.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.MainActivity;

public final class WidgetData {
    private static final String PREFS = "atlas_widgets";
    @SuppressWarnings("unchecked")
    static final Class<? extends BaseWidget>[] ALL = new Class[]{
            CoupleWidget.class, TodayWidget.class, WaterWidget.class, CycleWidget.class, PetWidget.class,
            FinanceWidget.class, DateWidget.class, WordWidget.class, QuickWidget.class, NeedsWidget.class, HabitsWidget.class
    };

    private WidgetData() { }

    public static void save(Context c, String json) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply();
    }

    static JSONObject read(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            return new JSONObject(p.getString("data", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    public static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (Class<? extends BaseWidget> cls : ALL) {
            int[] ids = m.getAppWidgetIds(new ComponentName(c, cls));
            if (ids == null || ids.length == 0) continue;
            Intent i = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            i.setClass(c, cls);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            c.sendBroadcast(i);
        }
    }

    /** Abre o app executando app.myatlas://action/&lt;path&gt;. */
    static PendingIntent action(Context c, String path) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("app.myatlas://action/" + path));
        i.setClass(c, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, path.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static JSONObject obj(JSONObject o, String k) {
        JSONObject r = o == null ? null : o.optJSONObject(k);
        return r == null ? new JSONObject() : r;
    }

    static String str(JSONObject o, String k, String def) {
        if (o == null || o.isNull(k)) return def;
        String s = o.optString(k, def);
        return s == null || s.isEmpty() ? def : s;
    }

    static JSONArray arr(JSONObject o, String k) {
        JSONArray a = o == null ? null : o.optJSONArray(k);
        return a == null ? new JSONArray() : a;
    }

    static void text(RemoteViews v, int id, String s) {
        v.setTextViewText(id, s);
        v.setViewVisibility(id, s == null || s.isEmpty() ? View.GONE : View.VISIBLE);
    }

    static int clamp(int x) { return Math.max(0, Math.min(100, x)); }
}
