package app.myatlas.twa.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.myatlas.twa.R;

import static app.myatlas.twa.widgets.WidgetData.*;

public class PetWidget extends BaseWidget {
    @Override
    protected RemoteViews build(Context c, JSONObject d) {
        RemoteViews v = views(c, R.layout.w_pet, "open/pet");
        JSONObject p = obj(d, "pet");
        String pose = str(p, "pose", "alert");
        String emoji = "sleeping".equals(pose) ? "😴" : "playing".equals(pose) ? "🪢" : "happy".equals(pose) ? "🥰" : "🐶";
        v.setTextViewText(R.id.emoji, emoji);
        v.setTextViewText(R.id.title, "Atlas · nível " + p.optInt("level", 1));
        v.setTextViewText(R.id.big, str(p, "label", "Atlas"));
        v.setProgressBar(R.id.happy, 100, clamp(p.optInt("happiness", 50)), false);
        v.setProgressBar(R.id.energy, 100, clamp(p.optInt("energy", 50)), false);
        v.setOnClickPendingIntent(R.id.btn_treat, action(c, "pet/pet_petisco"));
        v.setOnClickPendingIntent(R.id.btn_play, action(c, "pet/pet_cabo"));
        v.setOnClickPendingIntent(R.id.btn_lick, action(c, "pet/pet_lambida"));
        return v;
    }
}
