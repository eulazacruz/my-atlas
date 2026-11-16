package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class CycleWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_cycle, "open/health");
        JSONObject cy = obj(d, "cycle");
        if (!cy.optBoolean("active", false)) {
            v.setTextViewText(R.id.big, "—");
            v.setTextViewText(R.id.phase, "Ciclo não ativo");
            v.setTextViewText(R.id.next, "Configure no app");
            return v;
        }
        String owner = str(cy, "owner", "");
        v.setTextViewText(R.id.title, owner.isEmpty() ? "Seu ciclo" : "Ciclo · " + owner);
        v.setTextViewText(R.id.big, "Dia " + cy.optInt("day", 0));
        v.setTextViewText(R.id.phase, str(cy, "phase", ""));
        v.setTextViewText(R.id.next, str(cy, "next", ""));
        return v;
    }
}
