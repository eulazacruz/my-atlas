package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class NeedsWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_needs, "open/couple");
        JSONObject pa = obj(d, "partner");
        v.setTextViewText(R.id.title, "Preciso de… · avisar " + str(pa, "name", "meu amor"));
        v.setOnClickPendingIntent(R.id.n1, action(c, "nudge/silencio"));
        v.setOnClickPendingIntent(R.id.n2, action(c, "nudge/colo"));
        v.setOnClickPendingIntent(R.id.n3, action(c, "nudge/desabafar"));
        v.setOnClickPendingIntent(R.id.n4, action(c, "nudge/comer"));
        return v;
    }
}
