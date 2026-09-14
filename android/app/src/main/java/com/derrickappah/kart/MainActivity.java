package com.derrickappah.kart;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarsConfiguration();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBarsConfiguration();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemBarsConfiguration();
    }

    private void applySystemBarsConfiguration() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
        insetsController.show(WindowInsetsCompat.Type.statusBars());

        int statusBarColor = Color.WHITE;
        window.setStatusBarColor(statusBarColor);
        insetsController.setAppearanceLightStatusBars(true);

        window.setNavigationBarColor(Color.TRANSPARENT);
        insetsController.setAppearanceLightNavigationBars(true);

        WindowCompat.setDecorFitsSystemWindows(window, false);

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, insets) -> {
                Insets statusInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                v.setPadding(0, statusInsets.top, 0, 0);
                v.setBackgroundColor(statusBarColor);
                return insets;
            });
            contentView.requestApplyInsets();
        }
    }
}
