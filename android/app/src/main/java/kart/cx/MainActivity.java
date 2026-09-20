package kart.cx;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.airbnb.lottie.LottieAnimationView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private FrameLayout splashLayout;
    private LottieAnimationView lottieView;
    private boolean isSplashActive = false;
    private static final int SPLASH_COLOR = Color.parseColor("#FF0000");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Install Android 12+ SplashScreen and dismiss system splash immediately
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> false);

        super.onCreate(savedInstanceState);

        if (savedInstanceState == null) {
            isSplashActive = true;
            setSplashFullscreen();
            setupSplashAnimation();
        } else {
            isSplashActive = false;
            applyMainAppSystemBars();
        }
    }

    private void setSplashFullscreen() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        // Force hardware layout beyond all screen limits (status bar, navigation bar, cutouts)
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        window.setStatusBarColor(SPLASH_COLOR);
        window.setNavigationBarColor(SPLASH_COLOR);

        WindowCompat.setDecorFitsSystemWindows(window, false);

        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
        insetsController.hide(WindowInsetsCompat.Type.systemBars());
        insetsController.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setPadding(0, 0, 0, 0);
        }
    }

    private void setupSplashAnimation() {
        splashLayout = new FrameLayout(this);
        splashLayout.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        splashLayout.setBackgroundColor(SPLASH_COLOR);

        lottieView = new LottieAnimationView(this);
        FrameLayout.LayoutParams lottieParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        lottieView.setLayoutParams(lottieParams);
        lottieView.setScaleType(ImageView.ScaleType.CENTER_CROP);
        lottieView.setAnimation(R.raw.splash);
        lottieView.setRepeatCount(0);

        lottieView.addAnimatorListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                dismissSplash();
            }
        });

        // Allow tapping anywhere to skip splash animation
        splashLayout.setOnClickListener(v -> dismissSplash());

        splashLayout.addView(lottieView);
        addContentView(splashLayout, splashLayout.getLayoutParams());

        lottieView.playAnimation();
    }

    private void dismissSplash() {
        if (!isSplashActive && splashLayout == null) {
            return;
        }
        isSplashActive = false;

        if (splashLayout != null) {
            splashLayout.animate()
                .alpha(0f)
                .setDuration(350)
                .withEndAction(() -> {
                    if (splashLayout != null && splashLayout.getParent() != null) {
                        ((ViewGroup) splashLayout.getParent()).removeView(splashLayout);
                        splashLayout = null;
                        if (lottieView != null) {
                            lottieView.cancelAnimation();
                            lottieView = null;
                        }
                    }
                    // Clear fullscreen flags and restore main app standard system bars
                    restoreNormalWindowMode();
                    applyMainAppSystemBars();
                })
                .start();
        } else {
            restoreNormalWindowMode();
            applyMainAppSystemBars();
        }
    }

    private void restoreNormalWindowMode() {
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
            window.setAttributes(lp);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (isSplashActive) {
            setSplashFullscreen();
        } else {
            applyMainAppSystemBars();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (isSplashActive) {
            setSplashFullscreen();
        } else {
            applyMainAppSystemBars();
        }
    }

    private void applyMainAppSystemBars() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
        // Show status bar and navigation bar in main app (not fullscreen)
        insetsController.show(WindowInsetsCompat.Type.systemBars());

        boolean isDarkMode = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int statusBarColor = isDarkMode ? Color.parseColor("#121316") : Color.WHITE;
        window.setStatusBarColor(statusBarColor);
        insetsController.setAppearanceLightStatusBars(!isDarkMode);

        int navBarColor = isDarkMode ? Color.parseColor("#121316") : Color.WHITE;
        window.setNavigationBarColor(navBarColor);
        insetsController.setAppearanceLightNavigationBars(!isDarkMode);

        WindowCompat.setDecorFitsSystemWindows(window, false);

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, insets) -> {
                Insets statusInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                Insets navInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
                v.setPadding(0, statusInsets.top, 0, navInsets.bottom);
                v.setBackgroundColor(statusBarColor);
                return insets;
            });
            contentView.requestApplyInsets();
        }
    }
}