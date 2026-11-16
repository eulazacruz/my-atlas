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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AtlasNativePlugin.class);
        quietLocationChannel();
        super.onCreate(savedInstanceState);
        createChannels();
        applyImmersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersive();
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
    }
}
