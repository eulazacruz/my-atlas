package app.myatlas.twa.island;

import androidx.annotation.NonNull;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

import app.myatlas.twa.MainActivity;

/** Recebe os pushes: os de "ilha" viram o cartão em volta da câmera quando o app está fechado. */
public class AtlasMessagingService extends MessagingService {
    @Override
    public void onMessageReceived(@NonNull RemoteMessage msg) {
        Map<String, String> d = msg.getData();
        if ("island".equals(d.get("type"))) {
            if (!MainActivity.visible) IslandOverlay.show(this, d.get("title"), d.get("body"), d.get("link"));
            return;
        }
        super.onMessageReceived(msg);
    }
}
