package app.myatlas.twa.alarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

import app.myatlas.twa.MainActivity;

/** Agenda os despertadores com AlarmManager.setAlarmClock (o mais confiável do Android). */
public class AlarmScheduler {
    static final String PREFS = "atlas_alarms";

    public static void save(Context c, String json) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply();
    }

    static JSONObject read(Context c) {
        try { return new JSONObject(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }

    public static boolean canExact(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    /** Próximo disparo de um alarme (ms) ou -1. */
    static long next(JSONObject a, long now) {
        long at = a.optLong("at", 0);
        if (at > 0) return at > now + 1000 ? at : -1;
        try {
            String[] t = a.getString("time").split(":");
            int h = Integer.parseInt(t[0]), m = Integer.parseInt(t[1]);
            JSONArray days = a.optJSONArray("days");
            for (int i = 0; i < 8; i++) {
                Calendar cal = Calendar.getInstance();
                cal.setTimeInMillis(now);
                cal.add(Calendar.DAY_OF_YEAR, i);
                cal.set(Calendar.HOUR_OF_DAY, h); cal.set(Calendar.MINUTE, m); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
                if (cal.getTimeInMillis() <= now + 1000) continue;
                int dow = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0 = domingo
                if (days == null || days.length() == 0) return cal.getTimeInMillis();
                for (int k = 0; k < days.length(); k++) if (days.optInt(k) == dow) return cal.getTimeInMillis();
            }
        } catch (Exception ignored) { }
        return -1;
    }

    /** Reagenda tudo: o próximo alarme de cada configuração + a soneca. */
    public static void scheduleAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONObject d = read(c);
        JSONArray list = d.optJSONArray("alarms");
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        // cancela os antigos
        int oldCount = sp.getInt("count", 0);
        for (int i = 0; i < oldCount + 1; i++) am.cancel(pi(c, i, null));
        am.cancel(pi(c, 999, null));
        long now = System.currentTimeMillis();
        int n = 0;
        if (list != null) {
            for (int i = 0; i < list.length(); i++) {
                JSONObject a = list.optJSONObject(i);
                if (a == null) continue;
                long at = next(a, now);
                if (at < 0) continue;
                set(c, am, at, pi(c, i, a.optString("id")));
                n++;
            }
        }
        sp.edit().putInt("count", list == null ? 0 : list.length()).apply();
        long snooze = d.optLong("snoozeAt", 0);
        if (snooze > now) set(c, am, snooze, pi(c, 999, d.optString("lastId", "snooze")));
    }

    static void set(Context c, AlarmManager am, long at, PendingIntent op) {
        Intent show = new Intent(c, MainActivity.class);
        show.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent showPi = PendingIntent.getActivity(c, 7, show, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPi), op);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, op);
        }
    }

    /** Busca a configuração de um alarme pelo id (título, texto, som, tipo). */
    public static JSONObject find(Context c, String id) {
        JSONArray list = read(c).optJSONArray("alarms");
        if (list != null && id != null) for (int i = 0; i < list.length(); i++) { JSONObject a = list.optJSONObject(i); if (a != null && id.equals(a.optString("id"))) return a; }
        return new JSONObject();
    }

    static PendingIntent pi(Context c, int req, String id) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction("app.myatlas.ALARM");
        if (id != null) i.putExtra("id", id);
        return PendingIntent.getBroadcast(c, 4200 + req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
