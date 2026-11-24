package app.myatlas.twa.alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import app.myatlas.twa.MainActivity;
import app.myatlas.twa.R;

/** Dispara o alarme: notificação em tela cheia com som de alarme insistente (toca até a missão ser cumprida). */
public class AlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL = "despertador_v2";
    public static final int NOTIF_ID = 777;
    public static volatile boolean ringing = false;
    public static volatile String ringingId = null;

    @Override
    public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            AlarmScheduler.scheduleAll(c);
            return;
        }
        String id = intent.getStringExtra("id");
        ringing = true;
        ringingId = id;
        c.getSharedPreferences(AlarmScheduler.PREFS, Context.MODE_PRIVATE).edit().putBoolean("ringing", true).putString("ringingId", id).apply();
        ensureChannel(c);
        org.json.JSONObject cfg = AlarmScheduler.find(c, id);
        String kind = cfg.optString("kind", "alarm");
        boolean isAlarm = "alarm".equals(kind);
        AlarmSound.start(c, cfg.optString("sound", ""), (float) cfg.optDouble("volume", 1.0), isAlarm ? 40_000 : 15_000, true);

        Intent open = new Intent(c, MainActivity.class);
        open.putExtra("atlas_alarm", id == null ? "x" : id);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent full = PendingIntent.getActivity(c, 778, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_atlas)
            .setContentTitle(cfg.optString("title", "⏰ Hora de acordar"))
            .setContentText(cfg.optString("text", "Toque para cumprir a missão e desligar"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(full)
            .setFullScreenIntent(full, true)
            .setSilent(true);
        Notification n = b.build();
        n.flags |= Notification.FLAG_NO_CLEAR;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, n);
        try { c.startActivity(open); } catch (Exception ignored) { }
        // agenda a próxima ocorrência
        AlarmScheduler.scheduleAll(c);
    }

    static Uri alarmUri() {
        Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        return u != null ? u : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
    }

    public static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Despertador e compromissos", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Tela cheia do despertador, do check-in de humor e das tarefas obrigatórias");
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setBypassDnd(true);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    public static void stop(Context c) {
        AlarmSound.stop();
        ringing = false;
        ringingId = null;
        c.getSharedPreferences(AlarmScheduler.PREFS, Context.MODE_PRIVATE).edit().putBoolean("ringing", false).apply();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
    }
}
