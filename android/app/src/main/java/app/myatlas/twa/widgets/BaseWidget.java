package app.myatlas.twa.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import app.myatlas.twa.R;

public abstract class BaseWidget extends AppWidgetProvider {
    protected abstract RemoteViews build(Context c, JSONObject d);

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        JSONObject d = WidgetData.read(c);
        for (int id : ids) {
            RemoteViews v;
            try {
                v = build(c, d);
            } catch (Exception e) {
                v = new RemoteViews(c.getPackageName(), R.layout.w_word);
            }
            m.updateAppWidget(id, v);
        }
    }

    protected RemoteViews views(Context c, int layout, String openPath) {
        RemoteViews v = new RemoteViews(c.getPackageName(), layout);
        v.setOnClickPendingIntent(R.id.root, WidgetData.action(c, openPath));
        return v;
    }
}
