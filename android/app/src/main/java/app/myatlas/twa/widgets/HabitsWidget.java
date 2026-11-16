package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class HabitsWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_habits, "open/health");
        JSONArray h = arr(d, "habits");
        int[] ids = {R.id.h1, R.id.h2, R.id.h3, R.id.h4};
        int done = 0;
        for (int i = 0; i < 4; i++) {
            JSONObject x = h.optJSONObject(i);
            if (x == null) { text(v, ids[i], ""); continue; }
            boolean ok = x.optBoolean("done", false);
            if (ok) done++;
            v.setTextViewText(ids[i], (ok ? "✓  " : "○  ") + x.optString("label"));
            v.setTextColor(ids[i], ok ? 0xFF10B981 : 0xFFFFFFFF);
        }
        v.setTextViewText(R.id.title, "Hábitos · " + done + "/4");
        JSONObject s = obj(d, "sleep");
        v.setTextViewText(R.id.sleep, s.optBoolean("sleeping", false) ? "🌙 Dormindo…" : "🌙 " + str(s, "last", "—") + "  ·  ☕ " + s.optInt("caffeine22", 0) + "mg às 22h");
        return v;
    }
}
