package app.myatlas.twa.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.RemoteViews;

import java.io.File;

import app.myatlas.twa.R;

/** "Instante na tela": o último instante não visto do seu amor. */
public class InstantWidget extends AppWidgetProvider {
    public static File file(Context c) { return new File(c.getFilesDir(), "instant.jpg"); }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_instant);
        v.setOnClickPendingIntent(R.id.root, WidgetData.action(c, "tool/social"));
        String from = c.getSharedPreferences("atlas_instant", Context.MODE_PRIVATE).getString("from", "");
        String cap = c.getSharedPreferences("atlas_instant", Context.MODE_PRIVATE).getString("caption", "");
        File f = file(c);
        Bitmap bmp = f.exists() && !from.isEmpty() ? BitmapFactory.decodeFile(f.getAbsolutePath()) : null;
        if (bmp != null) {
            v.setImageViewBitmap(R.id.photo, bmp);
            v.setViewVisibility(R.id.photo, View.VISIBLE);
            v.setViewVisibility(R.id.empty, View.GONE);
            v.setTextViewText(R.id.from, from + " mandou um instante");
            v.setTextViewText(R.id.caption, cap);
            v.setViewVisibility(R.id.overlay, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.photo, View.GONE);
            v.setViewVisibility(R.id.overlay, View.GONE);
            v.setViewVisibility(R.id.empty, View.VISIBLE);
        }
        return v;
    }

    public static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, InstantWidget.class));
        for (int id : ids) m.updateAppWidget(id, build(c));
    }
}
