package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class CoupleWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_couple, "open/couple");
        JSONObject me = obj(d, "me"), pa = obj(d, "partner");
        v.setTextViewText(R.id.updated, str(d, "updated", ""));
        v.setTextViewText(R.id.me_name, "Você");
        text(v, R.id.me_status, str(me, "status", ""));
        v.setTextViewText(R.id.me_mood, str(me, "mood", "Abra o app"));
        v.setProgressBar(R.id.me_batt, 100, clamp(me.optInt("battery", 0)), false);
        v.setTextViewText(R.id.pa_name, str(pa, "name", "Seu amor"));
        text(v, R.id.pa_status, str(pa, "status", ""));
        v.setTextViewText(R.id.pa_mood, str(pa, "mood", "—"));
        v.setProgressBar(R.id.pa_batt, 100, clamp(pa.optInt("battery", 0)), false);
        v.setOnClickPendingIntent(R.id.btn_open, action(c, "open/couple"));
        v.setOnClickPendingIntent(R.id.btn_nudge, action(c, "nudge/carinho"));
        return v;
    }
}
