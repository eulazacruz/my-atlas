package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class DateWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_date, "open/couple");
        JSONObject dt = d.optJSONObject("date");
        if (dt == null) return v;
        int days = dt.optInt("days", 0);
        v.setTextViewText(R.id.emoji, str(dt, "emoji", "⭐"));
        v.setTextViewText(R.id.big, days == 0 ? "Hoje! 🎉" : days == 1 ? "Amanhã" : days + " dias");
        v.setTextViewText(R.id.sub, str(dt, "title", ""));
        return v;
    }
}
