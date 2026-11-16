package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class WordWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_word, "open/health");
        JSONObject w = obj(d, "word");
        JSONArray ws = arr(d, "words");
        int h = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
        int period = h < 12 ? 0 : h < 18 ? 1 : 2;
        if (ws.length() > period && ws.optJSONObject(period) != null) w = ws.optJSONObject(period);
        v.setTextViewText(R.id.title, period == 0 ? "Palavra da manhã" : period == 1 ? "Palavra da tarde" : "Palavra da noite");
        v.setTextViewText(R.id.text, "“" + str(w, "text", "Abra o app para carregar a palavra do dia.") + "”");
        v.setTextViewText(R.id.ref, "— " + str(w, "ref", "My Atlas"));
        return v;
    }
}
