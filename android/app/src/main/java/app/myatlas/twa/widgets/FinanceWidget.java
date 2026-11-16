package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class FinanceWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_finance, "open/finance");
        JSONObject f = obj(d, "finance");
        v.setTextViewText(R.id.big, str(f, "balance", "R$ —"));
        int pct = f.optInt("spentPct", 0);
        v.setProgressBar(R.id.bar, 100, clamp(pct), false);
        v.setTextViewText(R.id.sub, "Gasto " + str(f, "spent", "—") + " · " + pct + "% do orçamento");
        v.setOnClickPendingIntent(R.id.btn_expense, action(c, "expense"));
        return v;
    }
}
