package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class QuickWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_quick, "open/home");
        v.setOnClickPendingIntent(R.id.a1, action(c, "breathe"));
        v.setOnClickPendingIntent(R.id.a2, action(c, "expense"));
        v.setOnClickPendingIntent(R.id.a3, action(c, "nudge/carinho"));
        v.setOnClickPendingIntent(R.id.a4, action(c, "sleep"));
        return v;
    }
}
