package app.myatlas.twa.island;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import app.myatlas.twa.R;

/**
 * "Ilha" fora do app: um cartão preto que nasce em volta da câmera, mostra a notificação
 * e volta a se recolher. Usa a permissão "Sobrepor a outros apps".
 */
public class IslandOverlay {
    public static final String PREFS = "atlas_island";
    private static View showing;

    public static boolean enabled(Context c) {
        boolean can = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c);
        return can && c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("enabled", false);
    }

    /** Guarda a posição da câmera (medida pela MainActivity). */
    public static void saveCutout(Context c, int l, int t, int r, int b) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("cl", l).putInt("ct", t).putInt("cr", r).putInt("cb", b).apply();
    }

    public static void show(Context ctx, String title, String body, String link) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try { doShow(ctx.getApplicationContext(), title, body, link); } catch (Exception ignored) { }
        });
    }

    private static int dp(Context c, float v) { return Math.round(v * c.getResources().getDisplayMetrics().density); }

    private static void doShow(Context c, String title, String body, String link) {
        if (!enabled(c)) return;
        WindowManager wm = (WindowManager) c.getSystemService(Context.WINDOW_SERVICE);
        if (wm == null) return;
        if (showing != null) { try { wm.removeView(showing); } catch (Exception ignored) { } showing = null; }

        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        DisplayMetrics dm = c.getResources().getDisplayMetrics();
        int sw = dm.widthPixels;
        int cl = sp.getInt("cl", sw / 2 - dp(c, 14)), cr = sp.getInt("cr", sw / 2 + dp(c, 14));
        int ct = sp.getInt("ct", dp(c, 8)), cb = sp.getInt("cb", dp(c, 36));
        float d = dm.density;
        int dx = Math.round(sp.getFloat("dx", 0) * d), dy = Math.round(sp.getFloat("dy", 0) * d);
        float scale = sp.getFloat("scale", 1f);
        int camH = Math.max(dp(c, 22), cb - ct);
        int camCx = (cl + cr) / 2 + dx;

        int cardW = Math.min(sw - dp(c, 16), dp(c, 380));
        int pad = dp(c, 7);
        int top = Math.max(0, ct - pad + dy);

        // Cartão
        LinearLayout card = new LinearLayout(c);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.BLACK);
        bg.setCornerRadius(dp(c, 30));
        card.setBackground(bg);
        card.setPadding(dp(c, 14), camH + pad * 2, dp(c, 16), dp(c, 14));
        card.setElevation(dp(c, 8));

        LinearLayout content = new LinearLayout(c);
        content.setOrientation(LinearLayout.HORIZONTAL);
        content.setGravity(Gravity.CENTER_VERTICAL);
        ImageView icon = new ImageView(c);
        icon.setImageResource(R.mipmap.ic_launcher_round);
        content.addView(icon, new LinearLayout.LayoutParams(dp(c, 38), dp(c, 38)));
        LinearLayout texts = new LinearLayout(c);
        texts.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tp.leftMargin = dp(c, 12);
        TextView t1 = new TextView(c);
        t1.setText(title);
        t1.setTextColor(Color.WHITE);
        t1.setTextSize(14.5f);
        t1.setTypeface(Typeface.DEFAULT_BOLD);
        t1.setMaxLines(1);
        t1.setEllipsize(TextUtils.TruncateAt.END);
        TextView t2 = new TextView(c);
        t2.setText(body == null ? "" : body);
        t2.setTextColor(0xFFB3B3B3);
        t2.setTextSize(13f);
        t2.setMaxLines(2);
        t2.setEllipsize(TextUtils.TruncateAt.END);
        texts.addView(t1);
        if (body != null && !body.isEmpty()) texts.addView(t2);
        content.addView(texts, tp);
        View dot = new View(c);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(0xFF10B981);
        dot.setBackground(g);
        LinearLayout.LayoutParams dpm = new LinearLayout.LayoutParams(dp(c, 9), dp(c, 9));
        dpm.leftMargin = dp(c, 10);
        content.addView(dot, dpm);
        card.addView(content, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        FrameLayout root = new FrameLayout(c);
        root.addView(card, new FrameLayout.LayoutParams(cardW, FrameLayout.LayoutParams.WRAP_CONTENT));

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(cardW, WindowManager.LayoutParams.WRAP_CONTENT, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = camCx - cardW / 2;
        lp.y = top;
        if (Build.VERSION.SDK_INT >= 28) lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;

        Runnable hide = () -> collapse(wm, root, card, content, camH, pad, scale);
        root.setOnClickListener(v -> {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(link == null || link.isEmpty() ? "app.myatlas://action/open/home" : link));
                i.setPackage(c.getPackageName());
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(i);
            } catch (Exception ignored) { }
            hide.run();
        });

        wm.addView(root, lp);
        showing = root;

        // Nasce do tamanho da câmera e expande
        card.post(() -> {
            int w = card.getWidth(), h = card.getHeight();
            if (w == 0 || h == 0) return;
            float pillW = (camH * 2.6f + pad * 2) * scale;
            float pillH = camH + pad * 2;
            card.setPivotX(w / 2f);
            card.setPivotY(pad + camH / 2f);
            card.setScaleX(pillW / w);
            card.setScaleY(pillH / h);
            content.setAlpha(0f);
            card.animate().scaleX(1f).scaleY(1f).setDuration(420).setInterpolator(new OvershootInterpolator(0.9f)).start();
            content.animate().alpha(1f).setStartDelay(170).setDuration(220).start();
        });
        root.postDelayed(hide, 5200);
    }

    private static void collapse(WindowManager wm, View root, View card, View content, int camH, int pad, float scale) {
        if (root.getTag() != null) return;
        root.setTag("closing");
        int w = card.getWidth(), h = card.getHeight();
        content.animate().alpha(0f).setDuration(120).start();
        if (w == 0 || h == 0) { remove(wm, root); return; }
        float pillW = (camH * 2.6f + pad * 2) * scale;
        card.animate().scaleX(pillW / w).scaleY((camH + pad * 2f) / h).setStartDelay(80).setDuration(300)
            .setInterpolator(new AccelerateInterpolator())
            .setListener(new AnimatorListenerAdapter() {
                @Override public void onAnimationEnd(Animator a) {
                    card.animate().alpha(0f).setDuration(160).setListener(new AnimatorListenerAdapter() {
                        @Override public void onAnimationEnd(Animator b) { remove(wm, root); }
                    }).start();
                }
            }).start();
    }

    private static void remove(WindowManager wm, View root) {
        try { wm.removeView(root); } catch (Exception ignored) { }
        if (showing == root) showing = null;
    }
}
