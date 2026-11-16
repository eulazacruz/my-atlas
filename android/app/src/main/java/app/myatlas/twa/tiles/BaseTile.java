package app.myatlas.twa.tiles;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

import app.myatlas.twa.MainActivity;

public abstract class BaseTile extends TileService {
    protected abstract String path();

    @Override
    public void onStartListening() {
        Tile t = getQsTile();
        if (t != null) { t.setState(Tile.STATE_INACTIVE); t.updateTile(); }
    }

    @Override
    public void onClick() {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("app.myatlas://action/" + path()));
        i.setClass(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (Build.VERSION.SDK_INT >= 34) {
            PendingIntent pi = PendingIntent.getActivity(this, path().hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            startActivityAndCollapse(pi);
        } else {
            startActivityAndCollapseCompat(i);
        }
    }

    @SuppressWarnings("deprecation")
    private void startActivityAndCollapseCompat(Intent i) {
        startActivityAndCollapse(i);
    }
}
