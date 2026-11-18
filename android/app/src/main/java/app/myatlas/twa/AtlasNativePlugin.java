package app.myatlas.twa;

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
import app.myatlas.twa.widgets.InstantWidget;
import app.myatlas.twa.alarm.AlarmReceiver;
import app.myatlas.twa.alarm.AlarmScheduler;
import android.app.NotificationManager;
import android.net.Uri;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Locale;
import org.json.JSONArray;

@CapacitorPlugin(name = "AtlasNative", requestCodes = {4711})
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

    /* ───────── Leitura em voz alta (TTS offline) ───────── */
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private int ttsTotal = 0;

    private void withTts(Runnable r) {
        if (tts != null && ttsReady) { r.run(); return; }
        tts = new TextToSpeech(getContext(), status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) {
                        JSObject e = new JSObject();
                        try { e.put("index", Integer.parseInt(id)); } catch (Exception ignored) { }
                        notifyListeners("ttsProgress", e);
                    }
                    @Override public void onDone(String id) {
                        try { if (Integer.parseInt(id) >= ttsTotal - 1) notifyListeners("ttsEnd", new JSObject()); } catch (Exception ignored) { }
                    }
                    @Override public void onError(String id) { }
                });
                r.run();
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        JSONArray parts = call.getArray("parts");
        float rate = call.getFloat("rate", 1f);
        withTts(() -> {
            tts.stop();
            tts.setSpeechRate(rate);
            ttsTotal = parts == null ? 0 : parts.length();
            for (int i = 0; i < ttsTotal; i++) {
                tts.speak(parts.optString(i, ""), i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, null, String.valueOf(i));
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stopSpeak(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }

    /* ───────── Despertador ───────── */
    private JSObject alarmPerms() {
        JSObject r = new JSObject();
        r.put("exact", AlarmScheduler.canExact(getContext()));
        boolean fs = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            fs = nm == null || nm.canUseFullScreenIntent();
        }
        r.put("fullScreen", fs);
        return r;
    }

    @PluginMethod
    public void setAlarms(PluginCall call) {
        AlarmScheduler.save(getContext(), call.getString("data", "{}"));
        AlarmReceiver.ensureChannel(getContext());
        AlarmScheduler.scheduleAll(getContext());
        call.resolve(alarmPerms());
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        AlarmReceiver.stop(getContext());
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 27) { getActivity().setShowWhenLocked(false); getActivity().setTurnScreenOn(false); }
            getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        });
        call.resolve();
    }

    @PluginMethod
    public void alarmState(PluginCall call) {
        JSObject r = new JSObject();
        boolean ring = getContext().getSharedPreferences("atlas_alarms", Context.MODE_PRIVATE).getBoolean("ringing", false);
        r.put("ringing", ring);
        r.put("id", getContext().getSharedPreferences("atlas_alarms", Context.MODE_PRIVATE).getString("ringingId", null));
        call.resolve(r);
    }

    @PluginMethod
    public void openAlarmSettings(PluginCall call) {
        String which = call.getString("which", "exact");
        Intent i;
        if ("exact".equals(which) && Build.VERSION.SDK_INT >= 31) i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
        else if ("fullscreen".equals(which) && Build.VERSION.SDK_INT >= 34) i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getContext().getPackageName()));
        else i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); } catch (Exception e) { }
        call.resolve();
    }

    /** Chamado pela MainActivity quando o alarme abre o app. */
    public void emitAlarm(String id) {
        JSObject e = new JSObject();
        e.put("id", id);
        notifyListeners("alarm", e, true);
    }

    /* ───────── Widget de instante ───────── */
    @PluginMethod
    public void setInstantWidget(PluginCall call) {
        String img = call.getString("image", "");
        try {
            File f = InstantWidget.file(getContext());
            if (img == null || img.isEmpty()) { f.delete(); }
            else { FileOutputStream o = new FileOutputStream(f); o.write(Base64.decode(img, Base64.DEFAULT)); o.close(); }
            getContext().getSharedPreferences("atlas_instant", Context.MODE_PRIVATE).edit()
                .putString("from", img == null || img.isEmpty() ? "" : call.getString("from", ""))
                .putString("caption", call.getString("caption", "")).apply();
            InstantWidget.refresh(getContext());
        } catch (Exception ignored) { }
        call.resolve();
    }



    /* ───────── Reconhecimento de fala (exercício "fale a frase") ───────── */
    @PluginMethod
    public void listen(PluginCall call) {
        Intent i = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", "en-US"));
        i.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", "Fale agora"));
        i.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        try { startActivityForResult(call, i, "onSpeech"); }
        catch (Exception e) { call.reject("Reconhecimento de voz indisponível"); }
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void onSpeech(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        com.getcapacitor.JSArray arr = new com.getcapacitor.JSArray();
        if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
            java.util.ArrayList<String> list = result.getData().getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);
            if (list != null) for (String x : list) arr.put(x);
        }
        r.put("results", arr);
        call.resolve(r);
    }


    /* ───────── Google Drive (escopo drive.file) ───────── */
    private static final int REQ_DRIVE = 4711;
    private PluginCall driveCall;

    @PluginMethod
    public void driveToken(PluginCall call) {
        java.util.List<com.google.android.gms.common.api.Scope> scopes = java.util.Collections.singletonList(new com.google.android.gms.common.api.Scope("https://www.googleapis.com/auth/drive.file"));
        com.google.android.gms.auth.api.identity.AuthorizationRequest req = com.google.android.gms.auth.api.identity.AuthorizationRequest.builder().setRequestedScopes(scopes).build();
        boolean interactive = call.getBoolean("interactive", true);
        com.google.android.gms.auth.api.identity.Identity.getAuthorizationClient(getActivity()).authorize(req)
            .addOnSuccessListener(res -> {
                if (res.hasResolution()) {
                    if (!interactive || res.getPendingIntent() == null) { call.reject("needs-consent"); return; }
                    try {
                        driveCall = call;
                        getActivity().startIntentSenderForResult(res.getPendingIntent().getIntentSender(), REQ_DRIVE, null, 0, 0, 0, null);
                    } catch (Exception e) { call.reject(e.getMessage()); }
                } else {
                    JSObject r = new JSObject();
                    r.put("token", res.getAccessToken());
                    call.resolve(r);
                }
            })
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_DRIVE || driveCall == null) return;
        PluginCall c = driveCall;
        driveCall = null;
        try {
            com.google.android.gms.auth.api.identity.AuthorizationResult res = com.google.android.gms.auth.api.identity.Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(data);
            JSObject r = new JSObject();
            r.put("token", res.getAccessToken());
            c.resolve(r);
        } catch (Exception e) { c.reject("Permissão do Drive negada"); }
    }

    /* ───────── Ilha fora do app ───────── */
    @PluginMethod
    public void islandOverlayState(PluginCall call) {
        JSObject r = new JSObject();
        r.put("permission", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(getContext()));
        r.put("enabled", getContext().getSharedPreferences(app.myatlas.twa.island.IslandOverlay.PREFS, Context.MODE_PRIVATE).getBoolean("enabled", false));
        call.resolve(r);
    }

    @PluginMethod
    public void setIslandOverlay(PluginCall call) {
        getContext().getSharedPreferences(app.myatlas.twa.island.IslandOverlay.PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", call.getBoolean("enabled", false))
            .putFloat("dx", call.getFloat("dx", 0f)).putFloat("dy", call.getFloat("dy", 0f)).putFloat("scale", call.getFloat("scale", 1f)).apply();
        call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) { }
        call.resolve();
    }

    @PluginMethod
    public void testIsland(PluginCall call) {
        app.myatlas.twa.island.IslandOverlay.show(getContext(), call.getString("title", "Teste da ilha"), call.getString("body", ""), "");
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) tts.shutdown();
        super.handleOnDestroy();
    }
}
