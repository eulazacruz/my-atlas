package app.myatlas.twa;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    static boolean immersive = true;
    public static volatile boolean visible = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AtlasNativePlugin.class);
        quietLocationChannel();
        super.onCreate(savedInstanceState);
        createChannels();
        applyImmersive();
        handleAlarm(getIntent());
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        handleAlarm(intent);
    }

    /** Alarme tocando: acende a tela por cima do bloqueio e avisa o app. */
    void handleAlarm(android.content.Intent intent) {
        if (intent == null || intent.getStringExtra("atlas_alarm") == null) return;
        String id = intent.getStringExtra("atlas_alarm");
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        try {
            com.getcapacitor.PluginHandle h = getBridge() != null ? getBridge().getPlugin("AtlasNative") : null;
            if (h != null) ((AtlasNativePlugin) h.getInstance()).emitAlarm(id);
        } catch (Exception ignored) { }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    @Override
    public void onResume() {
        super.onResume();
        visible = true;
        applyImmersive();
        getWindow().getDecorView().post(this::saveCutout);
    }

    @Override
    public void onPause() {
        super.onPause();
        visible = false;
    }

    /** Saiu do app com alarme/compromisso tocando: volta para a tela em poucos segundos. */
    private final android.os.Handler back = new android.os.Handler(android.os.Looper.getMainLooper());
    @Override
    public void onStop() {
        super.onStop();
        if (!app.myatlas.twa.alarm.AlarmReceiver.ringing) return;
        back.postDelayed(() -> {
            if (visible || !app.myatlas.twa.alarm.AlarmReceiver.ringing) return;
            try {
                android.content.Intent i = new android.content.Intent(this, MainActivity.class);
                i.putExtra("atlas_alarm", app.myatlas.twa.alarm.AlarmReceiver.ringingId == null ? "x" : app.myatlas.twa.alarm.AlarmReceiver.ringingId);
                i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP | android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(i);
            } catch (Exception ignored) { }
        }, 8000);
    }

    /** Mede a câmera para a ilha que aparece fora do app. */
    void saveCutout() {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return;
            android.view.WindowInsets wi = getWindow().getDecorView().getRootWindowInsets();
            android.view.DisplayCutout dc = wi != null ? wi.getDisplayCutout() : null;
            if (dc == null || dc.getBoundingRects().isEmpty()) return;
            android.graphics.Rect best = null;
            for (android.graphics.Rect rc : dc.getBoundingRects()) if (best == null || rc.top < best.top) best = rc;
            app.myatlas.twa.island.IslandOverlay.saveCutout(this, best.left, best.top, best.right, best.bottom);
        } catch (Exception ignored) { }
    }

    void applyImmersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (immersive) {
            c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            c.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            c.show(WindowInsetsCompat.Type.systemBars());
        }
    }

    /** Canal do serviço de localização em segundo plano: mínimo (sem ícone na barra, recolhido). */
    void quietLocationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel("com.equimaps.capacitor_background_geolocation", "Localização em segundo plano", NotificationManager.IMPORTANCE_MIN);
        ch.setShowBadge(false);
        ch.enableVibration(false);
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
    }

    void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel("atlas", "Atlas — casal", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Status, pedidos, Atlas virtual e avisos do seu amor");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 60, 40, 90});
        nm.createNotificationChannel(ch);
        NotificationChannel r = new NotificationChannel("lembretes", "Lembretes", NotificationManager.IMPORTANCE_DEFAULT);
        r.setDescription("Água, agenda, datas e sono");
        nm.createNotificationChannel(r);
        NotificationChannel il = new NotificationChannel("atlas_island", "Atlas — com ilha", NotificationManager.IMPORTANCE_DEFAULT);
        il.setDescription("Avisos do seu amor quando a ilha em volta da câmera está ativa");
        il.enableVibration(true);
        il.setVibrationPattern(new long[]{0, 60, 40, 90});
        nm.createNotificationChannel(il);
    }
}
