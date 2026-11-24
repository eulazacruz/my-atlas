package app.myatlas.twa.alarm;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

/** Toca o som do alarme em repetição, no volume de alarme, aumentando aos poucos. */
public class AlarmSound {
    private static MediaPlayer player;
    private static final Handler h = new Handler(Looper.getMainLooper());
    private static Runnable ramp;
    private static Vibrator vib;

    public static Uri resolve(String uri) {
        if (uri != null && !uri.isEmpty()) return Uri.parse(uri);
        Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        return u;
    }

    /** max: volume final (0..1). rampMs: tempo até chegar no máximo. */
    public static synchronized void start(Context c, String uri, float max, long rampMs, boolean vibrate) {
        stop();
        try {
            AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int mx = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                if (am.getStreamVolume(AudioManager.STREAM_ALARM) < mx * 0.4) am.setStreamVolume(AudioManager.STREAM_ALARM, Math.round(mx * 0.6f), 0);
            }
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            try { player.setDataSource(c, resolve(uri)); }
            catch (Exception e) { player.reset(); player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()); player.setDataSource(c, resolve(null)); }
            player.setLooping(true);
            final float start = Math.min(0.15f, max);
            player.setVolume(start, start);
            player.prepare();
            player.start();
            final long t0 = System.currentTimeMillis();
            ramp = new Runnable() {
                @Override public void run() {
                    if (player == null) return;
                    float k = Math.min(1f, (System.currentTimeMillis() - t0) / (float) Math.max(1, rampMs));
                    float v = start + (max - start) * k;
                    try { player.setVolume(v, v); } catch (Exception ignored) { }
                    if (k < 1f) h.postDelayed(this, 500);
                }
            };
            h.postDelayed(ramp, 500);
        } catch (Exception ignored) { }
        if (vibrate) {
            try {
                vib = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null) vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 800, 500, 800, 900}, 0));
            } catch (Throwable ignored) { }
        }
    }

    public static synchronized void stop() {
        if (ramp != null) h.removeCallbacks(ramp);
        ramp = null;
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) { }
            try { player.release(); } catch (Exception ignored) { }
            player = null;
        }
        if (vib != null) { try { vib.cancel(); } catch (Exception ignored) { } vib = null; }
    }
}
