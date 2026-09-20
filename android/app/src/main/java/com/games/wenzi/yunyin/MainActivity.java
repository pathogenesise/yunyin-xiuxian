package com.games.wenzi.yunyin;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.Map;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private View loadingOverlay;
    private View enterButton;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean loadingDismissed = false;
    private SaveMigrator migrator;
    private Runnable enterButtonRunnable;

    /**
     * 系统栏占位,CSS 像素。
     *
     * 我们开了边到边(setDecorFitsSystemWindows(false),targetSdk 36 也会强制),网页内容
     * 铺到导航栏底下 —— 而 Android WebView **不会**把导航栏高度写进 CSS 的
     * env(safe-area-inset-bottom),那个值在安卓上恒为 0。于是三键导航的老机型上,
     * 页面底部的导航条整排被系统按钮盖住(玩家反馈)。手势导航机型看不出来:
     * 那条小横杠是半透明的,内容从底下透出来反而好看。
     *
     * 所以由原生把真实占位量出来,经 NativeApp 桥交给页面自己垫。
     * 底部取 tappableElement 而不是 navigationBars:三键导航两者相等(约 48dp),
     * 手势导航前者为 0、后者是横杠区 —— 正好只在「按钮真会挡住点按」时才垫。
     * JS 侧读到的是 CSS px,故除以 density。
     */
    private volatile float insetTopCss = 0f;
    private volatile float insetBottomCss = 0f;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 沉浸式状态栏
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);

        // BridgeActivity 已创建自己的 WebView 布局，手动 inflate 遮罩层叠加到上面
        loadingOverlay = getLayoutInflater().inflate(R.layout.activity_main, null);
        addContentView(loadingOverlay, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        enterButton = loadingOverlay.findViewById(R.id.enterButton);

        // 点击"进入游戏"手动关闭遮罩
        enterButton.setOnClickListener(v -> dismissLoading());

        // 5秒后如果还没加载完，显示进入按钮
        enterButtonRunnable = () -> {
            if (!loadingDismissed && enterButton != null) {
                enterButton.setVisibility(View.VISIBLE);
                enterButton.setAlpha(0f);
                enterButton.animate().alpha(1f).setDuration(300).start();
            }
        };
        handler.postDelayed(enterButtonRunnable, 5000);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // 系统栏占位:每次窗口 insets 变化(旋转、切换导航模式)都重新量,并通知页面重读
            final float density = getResources().getDisplayMetrics().density;
            ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
                Insets status = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                Insets tappable = insets.getInsets(WindowInsetsCompat.Type.tappableElement());
                float top = status.top / density;
                float bottom = tappable.bottom / density;
                if (top != insetTopCss || bottom != insetBottomCss) {
                    insetTopCss = top;
                    insetBottomCss = bottom;
                    // 页面可能还没加载(首次派发在 attach 时),事件丢了也无妨:组件挂载时会主动读一次
                    v.post(() -> ((WebView) v).evaluateJavascript(
                        "window.dispatchEvent(new Event('nativeinsets'))", null));
                }
                return insets;
            });
            ViewCompat.requestApplyInsets(webView);

            // 注册 JS 接口:隐藏遮罩 + 读系统栏占位(方法在 JavaBridge 线程上被调,只读 volatile 字段)
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void hideLoading() {
                    runOnUiThread(() -> dismissLoading());
                }

                @android.webkit.JavascriptInterface
                public float insetTop() {
                    return insetTopCss;
                }

                @android.webkit.JavascriptInterface
                public float insetBottom() {
                    return insetBottomCss;
                }
            }, "NativeApp");

            // 延迟注入轮询脚本，等 Capacitor 加载页面后检测 Vue 渲染完成
            handler.postDelayed(() -> {
                WebView wv = getBridge().getWebView();
                if (wv != null) {
                    wv.evaluateJavascript(
                        "(function check() {" +
                        "  var app = document.getElementById('app');" +
                        "  if (app && app.children.length > 0) {" +
                        "    NativeApp.hideLoading();" +
                        "  } else {" +
                        "    setTimeout(check, 200);" +
                        "  }" +
                        "})();",
                        null
                    );
                }
            }, 500);

            // 存档迁移：从旧版 http://localhost:8080 迁移到 Capacitor 的 https://localhost
            migrator = new SaveMigrator(this);
            migrator.migrate(new SaveMigrator.OnMigrationListener() {
                @Override
                public void onMigrationComplete(Map<String, String> saves) {
                    Log.d(TAG, "存档迁移成功，共 " + saves.size() + " 条，等待注入...");
                    // 延迟注入，确保 Capacitor WebView 页面已加载
                    handler.postDelayed(() -> {
                        WebView wv = getBridge().getWebView();
                        if (wv != null) {
                            SaveMigrator.injectSaves(wv, saves, MainActivity.this);
                            Toast.makeText(MainActivity.this,
                                "存档迁移完成！重新加载中...", Toast.LENGTH_LONG).show();
                        }
                    }, 2000);
                }

                @Override
                public void onMigrationSkipped(String reason) {
                    Log.d(TAG, "存档迁移跳过: " + reason);
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
        // 清理迁移器资源
        if (migrator != null) {
            migrator.cleanup();
            migrator = null;
        }
    }

    private void dismissLoading() {
        if (loadingDismissed || loadingOverlay == null) return;
        loadingDismissed = true;
        // 只移除进入按钮的超时回调，不清除所有回调（避免误杀迁移注入回调）
        if (enterButtonRunnable != null) {
            handler.removeCallbacks(enterButtonRunnable);
        }
        loadingOverlay.animate()
            .alpha(0f)
            .setDuration(300)
            .withEndAction(() -> loadingOverlay.setVisibility(View.GONE))
            .start();
    }
}
