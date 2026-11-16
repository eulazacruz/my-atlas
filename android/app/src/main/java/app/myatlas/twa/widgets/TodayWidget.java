package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class TodayWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_today, "open/agenda");
        String day = new java.text.SimpleDateFormat("EEE, d 'de' MMM", new java.util.Locale("pt", "BR")).format(new java.util.Date());
        v.setTextViewText(R.id.title, "Hoje · " + day);
        v.setTextViewText(R.id.updated, str(d, "updated", ""));
        JSONObject t = obj(d, "today");
        JSONArray ev = arr(t, "events"), tk = arr(t, "tasks");
        int[] ids = {R.id.l1, R.id.l2, R.id.l3, R.id.l4, R.id.l5};
        int n = 0;
        for (int i = 0; i < ev.length() && n < 5; i++) text(v, ids[n++], "▍ " + ev.optString(i));
        for (int i = 0; i < tk.length() && n < 5; i++) text(v, ids[n++], "○  " + tk.optString(i));
        if (n == 0) text(v, ids[n++], "Dia livre ✨ nada pendente.");
        for (; n < 5; n++) text(v, ids[n], "");
        v.setOnClickPendingIntent(R.id.btn_open, action(c, "open/agenda"));
        v.setOnClickPendingIntent(R.id.btn_task, action(c, "task"));
        return v;
    }
}
