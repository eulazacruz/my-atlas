package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class WaterWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_water, "open/health");
        JSONObject w = obj(d, "water");
        int ml = w.optInt("ml", 0), goal = Math.max(1, w.optInt("goal", 3000));
        v.setTextViewText(R.id.big, String.format(java.util.Locale.US, "%.1fL", ml / 1000.0));
        v.setTextViewText(R.id.sub, "de " + (goal / 1000) + "L · " + clamp(ml * 100 / goal) + "%");
        v.setProgressBar(R.id.bar, 100, clamp(ml * 100 / goal), false);
        v.setOnClickPendingIntent(R.id.btn_water, action(c, "water"));
        return v;
    }
}
