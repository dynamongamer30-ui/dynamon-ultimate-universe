package com.dynamongamer.royalvoid;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.text.*;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.util.*;

public final class ModController {
    final Activity activity;
    final GameConnection game;
    final PreferencesStore prefs;
    final MotionEffects motion;
    final HapticEngine haptics;
    final SoundEngine sounds;
    final SkinPackManager skins = new SkinPackManager();
    final LocalArtworkLoader itemArtwork;
    final Handler handler = new Handler(Looper.getMainLooper());
    final FrameLayout root;
    private View ambient;
    private GlassBackdropView backdrop;
    private ScrollMotion scrollMotion;
    private NativePayloadLoader payloadLoader;
    private String loaderStatus;
    private final PublicConfigClient publicConfig=new PublicConfigClient();
    private JSONObject remoteBrand;
    private TextView brandTitle;
    FloatingLauncher launcher;
    LinearLayout panel;
    LinearLayout body;
    LinearLayout nav;
    ScrollView scroll;
    TextView connection;
    TextView notice;
    JSONObject state = new JSONObject();
    boolean visible;
    boolean closed;
    boolean paused;
    boolean requesting;
    String page = "Home";
    String query = "";
    private EditText searchBox;
    private JSONArray teamScanMons;
    private String teamScanToken = "";
    private int teamScanScrollY;
    private LinearLayout teamScanResults;
    private SeekBar speedSlider;
    private TextView speedValue, speedStatus;
    private double speedMinimum=0.1, speedStep=0.1;
    private int pendingScrollY = 0;
    private int renderGeneration;
    private final HashMap<String, ToggleView> switches = new HashMap<String, ToggleView>();
    private final HashMap<Integer, TextView> partyButtons = new HashMap<Integer, TextView>();
    private final HashSet<String> inFlight = new HashSet<String>();
    private final ArrayList<TextView> statLabels = new ArrayList<TextView>();
    private final ArrayList<Dialog> dialogs = new ArrayList<Dialog>();
    private ProgressRingView ring;
    private TextView worldLabel;
    private TextView worldStats;
    private TextView pauseButton;
    private TextView grindLabel;
    private boolean automationWorld;
    private boolean expandedNav;
    private final Runnable poll = new Runnable(){
        
        public void run() {
            refresh();
        }
    };
    private final View.OnLayoutChangeListener layoutListener = new View.OnLayoutChangeListener(){
        
        public void onLayoutChange(View v, int l, int t, int r, int b, int ol, int ot, int or, int ob) {
            if (r - l != or - ol || b - t != ob - ot) {
                sizePanel();
                launcher.restore();
            }
        }
    };
    
    public ModController(Activity a, GameConnection g) {
        activity = a;
        itemArtwork = new LocalArtworkLoader(a);
        game = g;
        prefs = new PreferencesStore(a);
        motion = new MotionEffects(prefs);
        haptics = new HapticEngine(prefs);
        sounds = new SoundEngine(a, prefs);
        sounds.prepare();
        root = new FrameLayout(a);
        root.setClipChildren(false);
        root.setClipToPadding(false);
        root.setFitsSystemWindows(true);
        ThemeManager.restore(activity);
    }
    
    int dp(float n) {
        return RoyalVoidTheme.dp(activity, n);
    }
    
    public void start() {
        ViewGroup host = (ViewGroup)activity.getWindow().getDecorView();
        host.addView(root, new ViewGroup.LayoutParams(-1, -1));
        root.addOnLayoutChangeListener(layoutListener);
        launcher = new FloatingLauncher(activity, prefs, haptics, new FloatingLauncher.Listener(){
            
            public void open() {
                show();
            }
            
            public void quickActions() {
                quick();
            }
        });
        root.addView(launcher, new FrameLayout.LayoutParams(dp(56), dp(56)));
        launcher.compact(prefs.bool("compactLauncher", false));
        launcher.restore();
        page = prefs.string("page", "Home");
        if (!Arrays.asList("Home", "Battle", "Arena", "Items", "Unlock", "Team", "Skins", "Advanced", "Settings", "Community").contains(page)) page = "Home";
        buildPanel();
        // Branding and community links arrive inside the signed payload.
        refresh();
    }
    
    private void buildPanel() {
        panel = new LinearLayout(activity);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(14), dp(16), dp(14), dp(12));
        panel.setBackground(new GlassPanelDrawable(activity, dp(26), true));
        panel.setVisibility(View.GONE);
        panel.setFocusableInTouchMode(true);
        panel.setOnKeyListener(new View.OnKeyListener(){
            
            public boolean onKey(View v, int key, android.view.KeyEvent e) {
                if (key == android.view.KeyEvent.KEYCODE_BACK && visible) {
                    if (e.getAction() == android.view.KeyEvent.ACTION_UP) hide();
                    return true;
                }
                return false;
            }
        });
        ambient = new View(activity);
        ambient.setBackground(new GlowDrawable(activity));
        ambient.setVisibility(View.GONE);
        ambient.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        root.addView(ambient, new FrameLayout.LayoutParams(dp(360), dp(360), Gravity.TOP | Gravity.CENTER_HORIZONTAL));
        backdrop=new GlassBackdropView(activity); backdrop.setVisibility(View.GONE);
        root.addView(backdrop,new FrameLayout.LayoutParams(-1,-1,Gravity.CENTER));
        panel.setElevation(dp(12));
        root.addView(panel, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        LinearLayout head = row();
        head.setGravity(Gravity.CENTER_VERTICAL);
        ArtworkView logo = new ArtworkView(activity);
        logo.asset(ThemeManager.logoPath(activity));
        head.addView(logo, new LinearLayout.LayoutParams(dp(42), dp(42)));
        LinearLayout titles = column();
        titles.setPadding(dp(10), 0, 0, 0);
        brandTitle=text(BrandConfig.NAME.toUpperCase(java.util.Locale.US),17,RoyalVoidTheme.colors(activity).TEXT,true);
        titles.addView(brandTitle);
        titles.addView(text("ROYAL VOID  /  " + BrandConfig.VERSION, 10, RoyalVoidTheme.colors(activity).LAVENDER, true));
        head.addView(titles, new LinearLayout.LayoutParams(0, -2, 1));
        head.addView(iconButton("close", "Close menu", new Runnable(){
            
            public void run() {
                hide();
            }
        }));
        head.setContentDescription("Drag to move the floating menu");
        head.setOnTouchListener(new View.OnTouchListener(){
            float downX,downY,baseX,baseY; boolean dragging;
            public boolean onTouch(View v,MotionEvent e){
                if(e.getAction()==MotionEvent.ACTION_DOWN){
                    panel.animate().cancel(); downX=e.getRawX(); downY=e.getRawY(); baseX=panel.getX(); baseY=panel.getY(); dragging=false; return true;
                }
                if(e.getAction()==MotionEvent.ACTION_MOVE){
                    float dx=e.getRawX()-downX,dy=e.getRawY()-downY;
                    if(Math.abs(dx)+Math.abs(dy)>dp(6)) dragging=true;
                    if(dragging){ panel.setTranslationX(0); panel.setTranslationY(0);
                        panel.setX(Math.max(0,Math.min(root.getWidth()-panel.getWidth(),baseX+dx)));
                        panel.setY(Math.max(0,Math.min(root.getHeight()-panel.getHeight(),baseY+dy)));
                        backdrop.setX(panel.getX());backdrop.setY(panel.getY());backdrop.invalidate();
                    } return true;
                }
                if(e.getAction()==MotionEvent.ACTION_UP){ if(dragging) haptics.tick(v); else v.performClick(); return true; }
                return e.getAction()==MotionEvent.ACTION_CANCEL;
            }
        });
        panel.addView(head);
        connection = text("Connecting to game\u2026", 11, RoyalVoidTheme.colors(activity).MUTED, false);
        connection.setPadding(dp(2), dp(10), 0, dp(10));
        panel.addView(connection);
        LinearLayout main = row();
        panel.addView(main, new LinearLayout.LayoutParams(-1, 0, 1));
        ScrollView navScroll = new ScrollView(activity);
        navScroll.setFillViewport(false);
        navScroll.setVerticalScrollBarEnabled(false);
        nav = column();
        navScroll.addView(nav);
        main.addView(navScroll, new LinearLayout.LayoutParams(dp(52), -1));
        LinearLayout right = column();
        right.setPadding(dp(10), 0, 0, 0);
        main.addView(right, new LinearLayout.LayoutParams(0, -1, 1));
        final EditText search = input("Search features", false);
        searchBox = search;
        search.setSingleLine(true);
        search.setTextSize(13);
        search.setText(query);
        right.addView(search, new LinearLayout.LayoutParams(-1, dp(46)));
        search.addTextChangedListener(new TextWatcher(){
            
            public void beforeTextChanged(CharSequence s, int st, int c, int a) {
            }
            
            public void onTextChanged(CharSequence s, int st, int before, int count) {
                query = s.toString().trim().toLowerCase(java.util.Locale.US);
                render();
            }
            
            public void afterTextChanged(Editable e) {
            }
        });
        scroll = new ScrollView(activity);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        scroll.setPadding(0, dp(12), 0, dp(12));
        scroll.setVerticalScrollBarEnabled(false);
        body = column();
        scroll.addView(body, new ScrollView.LayoutParams(-1, -2));
        right.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        scrollMotion = new ScrollMotion(scroll, body, motion);
        TextView footer = text("Dynamon Gamer  \u00b7  " + (game.preview() ? "DESIGN PREVIEW" : "LIVE CONTROLS"), 10, RoyalVoidTheme.colors(activity).MUTED, false);
        footer.setPadding(dp(6), dp(10), 0, 0);
        panel.addView(footer);
        makeNav();
        render();
        sizePanel();
    }
    
    private void sizePanel() {
        if (panel == null || root.getWidth() == 0) return;
        int w = root.getWidth();
        int h = root.getHeight();
        boolean land = w > h;
        int width = Math.min(w - dp(16), dp(land ? 620 : 500));
        float fraction = prefs.number("panelHeight", 0.78F);
        FrameLayout.LayoutParams p = (FrameLayout.LayoutParams)panel.getLayoutParams();
        p.width = Math.max(dp(260), width);
        p.height = Math.max(dp(200), Math.min(h - dp(16), (int)(h * fraction)));
        p.gravity = land ? Gravity.RIGHT | Gravity.CENTER_VERTICAL : Gravity.CENTER;
        p.rightMargin = land ? dp(8) : 0;
        panel.setLayoutParams(p);
        FrameLayout.LayoutParams blurParams=new FrameLayout.LayoutParams(p.width,p.height,p.gravity);blurParams.rightMargin=p.rightMargin;
        backdrop.setLayoutParams(blurParams);
        View navParent = (View)nav.getParent();
        ViewGroup.LayoutParams np = navParent.getLayoutParams();
        np.width = dp(expandedNav && width > dp(440) ? 135 : 52);
        navParent.setLayoutParams(np);
        panel.setAlpha(prefs.number("opacity", 0.86f));
    }
    
    private void makeNav() {
        nav.removeAllViews();
        String[][] pages = {{"Home", "home"}, {"Battle", "shield"}, {"Arena", "star"}, {"Items", "items"}, {"Unlock", "unlock"}, {"Team", "team"}, {"Skins", "skins"}, {"Advanced", "bolt"}, {"Settings", "settings"}, {"Community", "globe"}};
        nav.addView(iconButton("menu", "Expand navigation", new Runnable(){
            
            public void run() {
                expandedNav = !expandedNav;
                sizePanel();
                makeNav();
            }
        }));
        for (final String[] p : pages) {
            LinearLayout n = row();
            n.setGravity(Gravity.CENTER_VERTICAL);
            n.setPadding(dp(12), 0, dp(8), 0);
            n.setMinimumHeight(dp(48));
            n.setContentDescription(p[0]);
            n.setFocusable(true);
            n.setBackground(RoyalVoidTheme.shape(page.equals(p[0]) ? RoyalVoidTheme.colors(activity).DEEP : Color.TRANSPARENT, page.equals(p[0]) ? RoyalVoidTheme.colors(activity).PURPLE : 0, dp(14)));
            n.addView(new IconView(activity, p[1], page.equals(p[0]) ? RoyalVoidTheme.colors(activity).LAVENDER : RoyalVoidTheme.colors(activity).MUTED), new LinearLayout.LayoutParams(dp(24), dp(24)));
            if (expandedNav) {
                TextView label = text(p[0].equals("Settings") ? "Command centre" : p[0], 12, RoyalVoidTheme.colors(activity).TEXT, true);
                label.setPadding(dp(10), 0, 0, 0);
                n.addView(label);
            }
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, dp(48));
            lp.bottomMargin = dp(5);
            nav.addView(n, lp);
            if (page.equals(p[0])) NavigationAnimator.selected(n, motion.enabled());
            n.setOnLongClickListener(new View.OnLongClickListener(){
                
                public boolean onLongClick(View v) {
                    toast(p[0], false);
                    return true;
                }
            });
            n.setOnClickListener(new View.OnClickListener(){
                
                public void onClick(View v) {
                    haptics.tick(v);
                    sounds.play(false);
                    navigateTo(p[0]);
                }
            });
        }
    }
    
    public void show() {
        if (closed || visible) return;
        visible = true;
        restoreScroll(page.equals("Team") && teamScanMons!=null ? teamScanScrollY : 0,renderGeneration);
        panel.animate().setListener(null);panel.animate().cancel();panel.setVisibility(View.GONE);
        
        ambient.setVisibility(View.GONE);
        launcher.setVisibility(View.GONE);
        sizePanel();
        backdrop.setVisibility(View.GONE);
        backdrop.capture(activity,new Runnable(){public void run(){
            if(closed || !visible) return;
            ambient.setVisibility(prefs.bool("ambientGlow",true)?View.VISIBLE:View.GONE);
            backdrop.setVisibility(View.VISIBLE); panel.setVisibility(View.VISIBLE);panel.requestFocus();motion.panel(panel);
        }});
        handler.removeCallbacks(poll);
        refresh();
    }
    
    void hide() {
        if (!visible) return;
        visible = false;
        backdrop.cancel(); backdrop.setVisibility(View.GONE);
        ambient.setVisibility(View.GONE);
        if(page.equals("Team") && teamScanMons!=null)teamScanScrollY=scroll.getScrollY();
        hideKeyboard();
        motion.exit(panel, new Runnable(){
            
            public void run() {
                if (!visible) {
                    panel.setVisibility(View.GONE);
                    panel.clearFocus();
                    launcher.setVisibility(View.VISIBLE);
                }
            }
        });
    }
    
    void startNativeLoader(android.webkit.WebView webView) {
        if(payloadLoader!=null) return;
        payloadLoader=new NativePayloadLoader(webView,new NativePayloadLoader.Listener(){
            public void status(String message,boolean error){loaderStatus=message;if(connection!=null)updateState();toast(message,error,true);}
            public void appearance(JSONObject config){if(ThemeManager.configure(activity,config))rebuildAppearance();}
        });
        payloadLoader.start();
    }

    void quick() {
        final String[] options = {"Open menu", "Stop all automation", launcher.compact() ? "Expand launcher" : "Collapse to edge handle", "Retry game loading"};
        final AlertDialog d = new AlertDialog.Builder(new ContextThemeWrapper(activity, android.R.style.Theme_DeviceDefault_Dialog_Alert)).setTitle("Dynamon Gamer").setItems(options, new DialogInterface.OnClickListener(){
            
            public void onClick(DialogInterface d, int which) {
                if (which == 0) show(); else if (which == 1) command("stopAll", new JSONObject(), null); else if(which==2) launcher.compact(!launcher.compact()); else if(payloadLoader!=null) payloadLoader.start(); else toast("Your existing JavaScript loader manages game loading",false);
            }
        }).create();
        track(d);
        d.show();
        styleDialog(d);
    }
    
    private void hideKeyboard() {
        try {
            ((android.view.inputmethod.InputMethodManager)activity.getSystemService(Context.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(panel.getWindowToken(), 0);
        } catch (Exception ignored) {
        }
    }
    
    void refresh() {
        if (closed || paused || requesting) return;
        requesting = true;
        game.snapshot(new GameConnection.Callback(){
            
            public void result(JSONObject s) {
                requesting = false;
                if (closed) return;
                state = s;
                if(teamScanMons!=null && s.has("scanToken") && !teamScanToken.equals(s.optString("scanToken"))){
                    teamScanMons=null;teamScanToken="";teamScanScrollY=0;
                    if(teamScanResults!=null){teamScanResults.removeAllViews();if(page.equals("Team"))restoreScroll(0,renderGeneration);}
                }
                boolean catalogueChanged=FeatureRegistry.load(s.optJSONObject("menuConfig"));
                if(catalogueChanged)render();
                updateState();
                handler.removeCallbacks(poll);
                if (!paused) handler.postDelayed(poll, visible ? 1200 : 4000);
            }
        });
    }
    
    private void updateState() {
        
        JSONObject brand=state.optJSONObject("brand");
        if(brand==null)brand=remoteBrand;
        if(brandTitle!=null && brand!=null) brandTitle.setText(brand.optString("name",BrandConfig.NAME).toUpperCase(java.util.Locale.US));
        boolean ready = state.optBoolean("ready");
        String startupError=state.optString("error", "Waiting for game");
        if(!game.preview() && !ready && state.optBoolean("bridgeMissing")){
            startupError=payloadLoader==null?"Native loader was not started. Check MainActivity: use ModEntry.attachWithLoader, not attach.":(loaderStatus==null?"Preparing protected mod…":loaderStatus);
        }
        connection.setText(game.preview() ? "\u25cf  PREVIEW  \u00b7  Sample data; game unchanged" : ready ? "\u25cf  GAME CONNECTED" : "\u25cb  " + startupError);
        connection.setTextColor(ready ? RoyalVoidTheme.colors(activity).GREEN : RoyalVoidTheme.colors(activity).MUTED);
        JSONObject f = state.optJSONObject("flags");
        JSONObject l = state.optJSONObject("locks");
        updatePartyButtons();
        updateSpeedControl();
        for (String k : switches.keySet()) {
            ToggleView t = switches.get(k);
            boolean on = k.equals("shopfix") || (f != null && f.optBoolean(k));
            boolean lock = k.equals("shopfix") || (l != null && (l.optBoolean(k) || l.optBoolean("app") || l.optBoolean("mods")));
            t.state(on, lock, motion.enabled());
            t.setAlpha(ready ? 1 : 0.45F);
        }
        if (statLabels.size() >= 3) {
            statLabels.get(0).setText(ready ? format(state.optLong("coins")) : "\u2014");
            statLabels.get(1).setText(ready ? format(state.optLong("dust")) : "\u2014");
            statLabels.get(2).setText(ready ? String.format(java.util.Locale.US, "%.1f\u00d7", state.optDouble("speed", 1)) : "\u2014");
        }
        JSONObject aw = state.optJSONObject("world");
        if (ring != null && aw != null) {
            ring.progress((float)aw.optDouble("pct", 0), motion.enabled() && visible);
            worldLabel.setText((aw.optBoolean("paused") ? "PAUSED" : aw.optBoolean("on") ? "RUNNING" : "IDLE") + "  \u00b7  " + aw.optString("map", "Open a world map").replace('_', ' '));
            worldStats.setText(aw.optInt("bosses") + " bosses  \u00b7  " + aw.optInt("quests") + " quests\n" + duration(aw.optLong("elapsed")) + " elapsed  \u00b7  " + aw.optInt("left") + " remaining");
        }
        JSONObject current = state.optJSONObject(automationWorld ? "world" : "grind");
        if (pauseButton != null) {
            boolean on = current != null && current.optBoolean("on");
            pauseButton.setEnabled(on);
            pauseButton.setAlpha(on ? 1 : 0.45F);
            pauseButton.setText(current != null && current.optBoolean("paused") ? "Resume" : "Pause");
        }
        if (grindLabel != null) {
            JSONObject g = state.optJSONObject("grind");
            grindLabel.setText(g != null && g.optBoolean("on") ? (g.optBoolean("paused") ? "PAUSED" : "RUNNING") : "IDLE");
        }
    }

    private void updatePartyButtons() {
        int selected = state.optInt("party", 3);
        for (Integer size : partyButtons.keySet()) {
            TextView button = partyButtons.get(size);
            boolean active = size.intValue() == selected;
            button.setSelected(active);
            button.setTextColor(active ? RoyalVoidTheme.colors(activity).TEXT : RoyalVoidTheme.colors(activity).LAVENDER);
            button.setBackground(RoyalVoidTheme.shape(active ? RoyalVoidTheme.colors(activity).DEEP : ThemeManager.colors(activity).BUTTON,
                active ? RoyalVoidTheme.colors(activity).PURPLE : RoyalVoidTheme.colors(activity).LINE, dp(14)));
            button.setContentDescription(size + " Dynamons" + (active ? ", selected" : ", select party size"));
        }
    }
    
    private String format(long v) {
        return java.text.NumberFormat.getIntegerInstance().format(v);
    }
    
    private String duration(long ms) {
        long s = ms / 1000;
        return String.format(java.util.Locale.US, "%02d:%02d", s / 60, s % 60);
    }
    
    void command(final String name, final JSONObject a, final GameConnection.Callback after) {
        if (closed) return;
        final String id = name + ":" + a.optString("key", a.optString("id", ""));
        if (inFlight.contains(id)) {
            toast("Waiting for the game\u2026", false);
            return;
        }
        inFlight.add(id);
        game.command(name, a, new GameConnection.Callback(){
            
            public void result(JSONObject r) {
                inFlight.remove(id);
                if (closed) return;
                boolean ok = r.optBoolean("ok");
                if (!ok) {
                    String failure=r.optString("error", "Action failed");
                    if("Game is not ready".equals(failure) && loaderStatus!=null)failure=loaderStatus;
                    toast(failure,true);
                } else {
                    if (!name.equals("items") && !name.equals("scan") && !name.equals("exportControls")) {
                        haptics.success(panel);
                        sounds.play(true);
                        toast(game.preview() ? "Preview: " + resultMessage(name, a, r) : resultMessage(name, a, r), false);
                    }
                }
                if (after != null) after.result(r);
                if (ok && page.equals("Items") && (name.equals("item") || name.equals("allItems"))) render();
                if (!name.equals("items") && !name.equals("scan") && !name.equals("exportControls")) refresh();
            }
        });
    }
    
    JSONObject args(Object... values) {
        JSONObject o = new JSONObject();
        try {
            for (int i = 0; i < values.length; i += 2) o.put((String)values[i], values[i + 1]);
        } catch (Exception ignored) {
        }
        return o;
    }
    
    private String resultMessage(String name, JSONObject a, JSONObject r) {
        if (name.equals("flag")) {
            String label=a.optString("key");
            for(FeatureRegistry.Feature f: FeatureRegistry.ALL) if(f.key.equals(label)){ label=f.title; break; }
            if(label.equals("autoWorld")) label="Auto World";
            if(label.equals("autoGrind")) label="Arena automation";
            return label + (a.optBoolean("value") ? " turned on" : " turned off");
        }
        if(name.equals("speed")) return "Game speed set to " + r.optDouble("value",a.optDouble("value")) + "×";
        if(name.equals("coins") || name.equals("dust")) return (name.equals("coins")?"Coins":"Dust") + " set to " + format(r.optLong("value",a.optLong("value")));
        if(name.equals("item")) return a.optString("label","Item") + " set to " + format(r.optLong("value",a.optLong("value")));
        if(name.equals("allItems")) return "All consumables set to " + format(a.optLong("value"));
        if(name.equals("stat")) return a.optString("stat").toUpperCase(java.util.Locale.US) + " set to " + a.optLong("value");
        if(name.equals("party")) return "Party size set to " + a.optInt("value");
        return r.optString("message","Change confirmed by the game");
    }

    private void portableControls() {
        LinearLayout backup=card();
        backup.addView(text("ONE-FILE BACKUP",11,RoyalVoidTheme.colors(activity).LAVENDER,true));
        backup.addView(text("Save controls, speed, inventory quantities, skin selection and interface settings to a file you keep after uninstalling.",12,RoyalVoidTheme.colors(activity).MUTED,false));
        addButton(backup,"Export all settings",true,new Runnable(){ public void run(){
            command("exportControls",new JSONObject(),new GameConnection.Callback(){ public void result(JSONObject r){
                if(!r.optBoolean("ok")) return;
                final JSONObject document=args("format","dg-royal-void-profile","schema",1,"name","Dynamon Gamer controls","createdAt",System.currentTimeMillis(),"controls",r.optJSONObject("controls"),"interface",prefs.exportValues());
                PortableProfile.open(activity,document,true,new PortableProfile.Listener(){public void done(JSONObject value,String error){
                    if(error!=null) toast(error,true); else if(value!=null) toast("Settings exported · keep this file",false);
                }});
            }});
        }});
        addButton(backup,"Import and restore all settings",false,new Runnable(){ public void run(){
            PortableProfile.open(activity,null,false,new PortableProfile.Listener(){public void done(final JSONObject value,String error){
                if(error!=null){toast(error,true);return;} if(value==null || closed) return;
                confirm("Restore this control backup? Inventory and currency values will change. Automation stays stopped until you start it.",new Runnable(){public void run(){
                    command("restoreControls",args("controls",value.optJSONObject("controls")),new GameConnection.Callback(){public void result(JSONObject r){
                        if(!r.optBoolean("ok")) return;
                        prefs.importValues(value.optJSONObject("interface")); ThemeManager.restore(activity); sounds.prepare(); launcher.compact(prefs.bool("compactLauncher",false)); rebuildAppearance();
                    }});
                }});
            }});
        }});
    }

    void toast(String message, boolean error) { toast(message,error,false); }
    private void toast(String message, boolean error, boolean loadingStatus) {
        if (closed) return;
        if (error) {
            haptics.warning(panel);
            sounds.warn();
        }
        if (notice != null) root.removeView(notice);
        final TextView t = text(message, 13, RoyalVoidTheme.colors(activity).TEXT, false);
        notice = t;
        t.setPadding(dp(16), dp(12), dp(16), dp(12));
        t.setGravity(Gravity.CENTER);
        t.setBackground(new GlassPanelDrawable(activity, dp(18), false));
        t.setTextColor(error ? RoyalVoidTheme.colors(activity).RED : RoyalVoidTheme.colors(activity).TEXT);
        t.setElevation(dp(8));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.min(Math.max(dp(180), root.getWidth() - dp(40)), dp(420)), -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        lp.topMargin = dp(14);
        root.addView(t, lp);
        motion.enter(t, 0);
        t.announceForAccessibility(message);
        if(loadingStatus && error) return;
        handler.postDelayed(new Runnable(){
            
            public void run() {
                root.removeView(t);
                if (notice == t) notice = null;
            }
        }, loadingStatus ? 6000 : (error ? 2600 : 1000));
    }
    
    TextView text(String s, int size, int color, boolean bold) {
        return RoyalVoidTheme.text(activity, s, size, color, bold);
    }
    
    LinearLayout row() {
        LinearLayout l = new LinearLayout(activity);
        l.setOrientation(LinearLayout.HORIZONTAL);
        return l;
    }
    
    LinearLayout column() {
        LinearLayout l = new LinearLayout(activity);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }
    
    LinearLayout card() {
        LinearLayout l = column();
        l.setPadding(dp(14), dp(14), dp(14), dp(14));
        l.setBackground(new GlassPanelDrawable(activity, dp(18), false));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.bottomMargin = dp(12);
        body.addView(l, lp);
        return l;
    }
    
    void section(String title, String desc) {
        TextView t = text(title, 22, RoyalVoidTheme.colors(activity).TEXT, true);
        t.setPadding(0, dp(6), 0, dp(8));
        body.addView(t);
        if (desc != null) {
            TextView d = text(desc, 12, RoyalVoidTheme.colors(activity).MUTED, false);
            d.setLineSpacing(dp(3), 1);
            d.setPadding(0, 0, 0, dp(14));
            body.addView(d);
        }
    }
    
    EditText input(String hint, boolean numeric) {
        EditText e = new EditText(activity);
        e.setTextColor(RoyalVoidTheme.colors(activity).TEXT);
        e.setHintTextColor(RoyalVoidTheme.colors(activity).MUTED);
        e.setTypeface(FontManager.get(activity, "regular"));
        e.setTextSize(14);
        e.setSingleLine(true);
        e.setPadding(dp(12), 0, dp(12), 0);
        e.setHint(hint);
        e.setContentDescription(hint);
        e.setBackground(RoyalVoidTheme.shape(ThemeManager.colors(activity).INPUT, RoyalVoidTheme.colors(activity).LINE, dp(12)));
        if (numeric) e.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        return e;
    }
    
    View iconButton(String icon, String label, final Runnable action) {
        FrameLayout f = new FrameLayout(activity);
        f.setContentDescription(label);
        f.setFocusable(true);
        f.setClickable(true);
        f.setBackground(RoyalVoidTheme.shape(ThemeManager.colors(activity).BUTTON, RoyalVoidTheme.colors(activity).LINE, dp(14)));
        f.addView(new IconView(activity, icon, RoyalVoidTheme.colors(activity).LAVENDER), new FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER));
        f.setLayoutParams(new LinearLayout.LayoutParams(dp(48), dp(48)));
        f.setOnClickListener(new View.OnClickListener(){
            
            public void onClick(View v) {
                haptics.tick(v);
                action.run();
            }
        });
        return f;
    }
    
    TextView button(String label, boolean primary, final Runnable action) {
        final TextView b = text(label, 13, primary ? RoyalVoidTheme.colors(activity).TEXT : RoyalVoidTheme.colors(activity).LAVENDER, true);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(10), dp(12), dp(10), dp(12));
        b.setMinHeight(dp(48));
        b.setFocusable(true);
        b.setBackground(RoyalVoidTheme.shape(primary ? RoyalVoidTheme.colors(activity).DEEP : ThemeManager.colors(activity).BUTTON, primary ? RoyalVoidTheme.colors(activity).PURPLE : RoyalVoidTheme.colors(activity).LINE, dp(14)));
        b.setOnTouchListener(new View.OnTouchListener(){
            
            public boolean onTouch(View v, MotionEvent e) {
                if (e.getAction() == MotionEvent.ACTION_DOWN) motion.press(v, true);
                if (e.getAction() == MotionEvent.ACTION_UP || e.getAction() == MotionEvent.ACTION_CANCEL) motion.press(v, false);
                return false;
            }
        });
        b.setOnClickListener(new View.OnClickListener(){
            
            public void onClick(View v) {
                haptics.tick(v);
                sounds.play(false);
                action.run();
            }
        });
        return b;
    }
    
    void addButton(LinearLayout parent, String label, boolean primary, Runnable action) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = dp(8);
        if (parent == body) lp.bottomMargin = dp(12);
        parent.addView(button(label, primary, action), lp);
    }
    
    private void feature(final FeatureRegistry.Feature f) {
        LinearLayout c = card();
        LinearLayout r = row();
        r.setGravity(Gravity.CENTER_VERTICAL);
        c.addView(r);
        r.addView(new IconView(activity, f.icon, RoyalVoidTheme.colors(activity).LAVENDER), new LinearLayout.LayoutParams(dp(23), dp(23)));
        LinearLayout labels = column();
        labels.setPadding(dp(10), 0, dp(4), 0);
        TextView title = text(f.title, 14, RoyalVoidTheme.colors(activity).TEXT, true);
        labels.addView(title);
        TextView detail = text(f.description, 11, RoyalVoidTheme.colors(activity).MUTED, false);
        detail.setPadding(0, dp(4), 0, 0);
        labels.addView(detail);
        r.addView(labels, new LinearLayout.LayoutParams(0, -2, 1));
        final ToggleView toggle = new ToggleView(activity);
        toggle.setContentDescription(f.title);
        r.addView(toggle, new LinearLayout.LayoutParams(dp(48), dp(48)));
        switches.put(f.key, toggle);
        toggle.setOnClickListener(new View.OnClickListener(){
            
            public void onClick(View v) {
                if(f.key.equals("shopfix")){toast("Shop compatibility is always enabled", false);return;}
                if(f.key.equals("botMatch") && state.optJSONObject("locks")!=null && state.optJSONObject("locks").optBoolean("botMatch")){toast("Bot matchmaking is locked until this match ends",false);return;}
                haptics.tick(v);
                command("flag", args("key", f.key, "value", !toggle.checked()), null);
            }
        });
        TextView favorite = text(prefs.favorite(f.key) ? "\u2605  FAVORITE" : "\u2606  HOLD TO FAVORITE", 9, RoyalVoidTheme.colors(activity).LAVENDER, true);
        favorite.setPadding(dp(33), dp(8), 0, 0);
        c.addView(favorite);
        c.setOnLongClickListener(new View.OnLongClickListener(){
            
            public boolean onLongClick(View v) {
                boolean on = prefs.flipFavorite(f.key);
                haptics.warning(v);
                toast(on ? "Added to favorites" : "Removed from favorites", false);
                render();
                return true;
            }
        });
    }
    
    private void navigateTo(String next) {
        if(page.equals("Team") && teamScanMons!=null)teamScanScrollY=scroll.getScrollY();
        page=next; prefs.set("page",page);
        query="";
        if(searchBox!=null)searchBox.setText("");
        pendingScrollY=page.equals("Team") && teamScanMons!=null ? teamScanScrollY : 0;
        makeNav();render();
    }

    private void restoreScroll(final int y, final int generation) {
        final ScrollView target=scroll;
        target.post(new Runnable(){public void run(){
            if(!closed && scroll==target && renderGeneration==generation)target.scrollTo(0,y);
        }});
    }

    void render() {
        if (body == null) return;
        final int targetScroll=pendingScrollY>=0 ? pendingScrollY : scroll.getScrollY();
        pendingScrollY=-1;
        final int generation=++renderGeneration;
        teamScanResults=null;
        speedSlider=null;speedValue=null;speedStatus=null;
        body.removeAllViews();
        switches.clear();
        partyButtons.clear();
        statLabels.clear();
        ring = null;
        worldLabel = null;
        worldStats = null;
        pauseButton = null;
        grindLabel = null;
        if (query.length() > 0) {
            section("Search", "Results across all feature groups");
            int n = 0;
            for (FeatureRegistry.Feature f : FeatureRegistry.ALL) if ((f.title + " " + f.description + " " + f.category).toLowerCase(java.util.Locale.US).contains(query)) {
                feature(f);
                n++;
            }
            if (n == 0) section("No matches", "Try a different feature name.");
        } else if (page.equals("Home")) home(); else if (page.equals("Battle")) {
            section("Battle", "Live controls for your active team.");
            features("Battle");
        } else if (page.equals("Arena")) {
            section("Arena", "Existing game hooks; availability depends on your game version.");
            automation(false);
            features("Arena");
        } else if (page.equals("Items")) itemsPage(); else if (page.equals("Unlock")) unlockPage(); else if (page.equals("Team")) teamPage(); else if (page.equals("Skins")) skinsPage(); else if (page.equals("Advanced")) {
            section("Advanced", "These controls require the matching patches in the game payload.");
            features("Advanced");
        } else if (page.equals("Settings")) settingsPage(); else if (page.equals("Community")) community();
        updateState();
        if (scrollMotion != null) scrollMotion.reset();
        restoreScroll(targetScroll,generation);
    }
    
    private void features(String category) {
        int shown = 0;
        for (FeatureRegistry.Feature f : FeatureRegistry.ALL) {
            if (f.category.equals(category)) {
                feature(f);
                shown++;
            }
        }
        if (shown == 0) {
            LinearLayout c = card();
            c.addView(text("Controls unavailable", 15, RoyalVoidTheme.colors(activity).TEXT, true));
            TextView explanation = text(FeatureRegistry.ALL.length == 0
                ? "The signed server feature catalogue has not loaded. Updating Worker code alone does not update the game payload."
                : "The loaded server catalogue has no controls in this category.",
                12, RoyalVoidTheme.colors(activity).MUTED, false);
            explanation.setPadding(0, dp(8), 0, 0);
            c.addView(explanation);
        }
    }
    
    private void home() {
        section("Dashboard", game.preview() ? "Preview mode. Explore the design with sample data." : "Your team, favorite controls and world progress.");
        LinearLayout c = card();
        String[] labels = {"COINS", "DUST", "GAME SPEED"};
        for (String s : labels) {
            LinearLayout r = row();
            r.setPadding(0, dp(5), 0, dp(5));
            r.addView(text(s, 10, RoyalVoidTheme.colors(activity).MUTED, true), new LinearLayout.LayoutParams(0, -2, 1));
            TextView v = text("\u2014", 18, RoyalVoidTheme.colors(activity).TEXT, true);
            statLabels.add(v);
            r.addView(v);
            c.addView(r);
        }
        addButton(c, "Edit coins & dust", true, new Runnable(){
            
            public void run() {
                currencyDialog();
            }
        });
        addButton(c, "Open command centre", false, new Runnable(){ public void run(){ navigateTo("Settings"); }});
        speedCard();
        automation(true);
        section("Favorites", "Long press a feature card to pin it here.");
        int n = 0;
        for (FeatureRegistry.Feature f : FeatureRegistry.ALL) if (prefs.favorite(f.key)) {
            feature(f);
            n++;
        }
        if (n == 0) {
            TextView t = text("Your favorites will appear here.", 12, RoyalVoidTheme.colors(activity).MUTED, false);
            body.addView(t);
        }
    }
    
    private void updateSpeedControl() {
        if(speedSlider==null)return;
        JSONObject locks=state.optJSONObject("locks");
        JSONObject flags=state.optJSONObject("flags");
        boolean arena=state.optBoolean("arenaSpeedLocked");
        boolean blocked=arena || !state.optBoolean("ready") || (locks!=null && (locks.optBoolean("speed")||locks.optBoolean("app")||locks.optBoolean("mods"))) || (flags!=null && flags.optBoolean("autoWorld"));
        speedSlider.setEnabled(!blocked);
        speedSlider.setAlpha(blocked?0.45F:1F);
        if(!speedSlider.isPressed() || blocked){
            double effective=state.optDouble("speed",1);
            speedSlider.setProgress((int)Math.round((effective-speedMinimum)/speedStep));
            speedValue.setText(String.format(java.util.Locale.US,"%.1f×",effective));
        }
        speedStatus.setText(arena?"Real-player Arena: speed locked to 1×. After this match, restore "+String.format(java.util.Locale.US,"%.1f×",state.optDouble("selectedSpeed",1)):"Real-player Arena automatically uses 1× and restores your selected speed afterward. Bot Arena and other modes use your selected speed. Higher speed can cause visual or state mismatches; it cannot speed up the opponent or network.");
    }

    private void speedCard() {
        LinearLayout c = card();
        c.addView(text("GAME SPEED", 11, RoyalVoidTheme.colors(activity).LAVENDER, true));
        TextView speedNote = text("Real-player Arena uses 1× and restores your selected speed after the match. Bot Arena and other modes keep your selected speed. Higher speed can cause visual or state mismatches; it cannot speed up the opponent or network.", 11, RoyalVoidTheme.colors(activity).MUTED, false);
        speedStatus=speedNote;
        speedNote.setPadding(0,dp(6),0,dp(10));
        c.addView(speedNote);
        final TextView value = text(String.format(java.util.Locale.US, "%.1f\u00d7", state.optDouble("speed", 1)), 24, RoyalVoidTheme.colors(activity).TEXT, true);
        speedValue=value;
        c.addView(value);
        SeekBar slider = new SeekBar(activity);
        JSONObject config=state.optJSONObject("menuConfig");
        JSONObject limits=config==null?null:config.optJSONObject("limits");
        JSONObject range=limits==null?null:limits.optJSONObject("speed");
        if(range==null)range=args("min",0.1,"max",8.0,"step",0.1);
        final double minimum=range.optDouble("min"),maximum=range.optDouble("max"),step=range.optDouble("step");
        if(Double.isNaN(minimum)||Double.isInfinite(minimum)||Double.isNaN(maximum)||Double.isInfinite(maximum)||Double.isNaN(step)||Double.isInfinite(step)||minimum<0||maximum<=minimum||step<=0||(maximum-minimum)/step>10000)return;
        speedSlider=slider;speedMinimum=minimum;speedStep=step;
        slider.setMax((int)Math.round((maximum-minimum)/step));
        slider.setProgress((int)Math.round((state.optDouble("speed",minimum)-minimum)/step));
        slider.setContentDescription("Game speed");
        try {
            slider.getProgressDrawable().setColorFilter(RoyalVoidTheme.colors(activity).PURPLE, android.graphics.PorterDuff.Mode.SRC_IN);
            slider.getThumb().setColorFilter(RoyalVoidTheme.colors(activity).LAVENDER, android.graphics.PorterDuff.Mode.SRC_IN);
        } catch (Exception ignored) {
        }
        c.addView(slider, new LinearLayout.LayoutParams(-1, dp(48)));
        slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            
            public void onProgressChanged(SeekBar b, int v, boolean from) {
                value.setText(String.format(java.util.Locale.US, "%.1f\u00d7", minimum+v*step));
            }
            
            public void onStartTrackingTouch(SeekBar b) {
            }
            
            public void onStopTrackingTouch(SeekBar b) {
                if(state.optBoolean("arenaSpeedLocked")){updateSpeedControl();toast("Real-player Arena: speed locked to 1×",false);return;}
                command("speed", args("value", minimum+b.getProgress()*step), null);
            }
        });
        updateSpeedControl();
    }
    
    private void automation(final boolean world) {
        automationWorld = world;
        LinearLayout c = card();
        c.addView(text(world ? "AUTO WORLD" : "ARENA AUTOMATION", 11, RoyalVoidTheme.colors(activity).LAVENDER, true));
        if (world) {
            LinearLayout r = row();
            r.setGravity(Gravity.CENTER_VERTICAL);
            ring = new ProgressRingView(activity);
            r.addView(ring, new LinearLayout.LayoutParams(dp(76), dp(76)));
            LinearLayout detail = column();
            detail.setPadding(dp(12), dp(8), 0, dp(8));
            worldLabel = text("IDLE", 12, RoyalVoidTheme.colors(activity).TEXT, true);
            worldStats = text("", 11, RoyalVoidTheme.colors(activity).MUTED, false);
            detail.addView(worldLabel);
            detail.addView(worldStats);
            r.addView(detail, new LinearLayout.LayoutParams(0, -2, 1));
            c.addView(r);
        } else {
            grindLabel = text("IDLE", 14, RoyalVoidTheme.colors(activity).TEXT, true);
            c.addView(grindLabel);
            c.addView(text("Automatically play bot matches while the game is in the foreground.", 12, RoyalVoidTheme.colors(activity).MUTED, false));
        }
        addButton(c, "Start", true, new Runnable(){
            
            public void run() {
                command("flag", args("key", world ? "autoWorld" : "autoGrind", "value", true), null);
            }
        });
        pauseButton = button("Pause", false, new Runnable(){
            
            public void run() {
                JSONObject current = state.optJSONObject(world ? "world" : "grind");
                command("pause", args("kind", world ? "world" : "grind", "value", !(current != null && current.optBoolean("paused"))), null);
            }
        });
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(-1, -2);
        pp.topMargin = dp(8);
        c.addView(pauseButton, pp);
        addButton(c, "Stop & restore controls", false, new Runnable(){
            
            public void run() {
                command("flag", args("key", world ? "autoWorld" : "autoGrind", "value", false), null);
            }
        });
    }
    
    private void currencyDialog() {
        final LinearLayout c = column();
        c.setPadding(dp(20), dp(12), dp(20), 0);
        final EditText coins = input("Coins", true);
        final EditText dust = input("Dust", true);
        coins.setText(String.valueOf(state.optLong("coins")));
        dust.setText(String.valueOf(state.optLong("dust")));
        c.addView(text("Coins", 12, RoyalVoidTheme.colors(activity).MUTED, false));
        c.addView(coins, new LinearLayout.LayoutParams(-1, dp(48)));
        c.addView(text("Dust", 12, RoyalVoidTheme.colors(activity).MUTED, false));
        c.addView(dust, new LinearLayout.LayoutParams(-1, dp(48)));
        dialog("Currency", c, "Apply", new Runnable(){
            
            public void run() {
                try {
                    long a = Long.parseLong(coins.getText().toString());
                    long b = Long.parseLong(dust.getText().toString());
                    command("coins", args("value", a), null);
                    command("dust", args("value", b), null);
                } catch (Exception e) {
                    toast("Enter valid whole numbers", true);
                }
            }
        });
    }
    
    private void itemsPage() {
        section("Inventory", "Search items and adjust quantities.");
        addButton(body, "Set all consumables", false, new Runnable(){
            
            public void run() {
                numberDialog("Set all consumables", 99, new NumberAction(){
                    
                    public void apply(final long n) {
                        confirm("Set every consumable to " + n + "?", new Runnable(){
                            
                            public void run() {
                                command("allItems", args("value", n), null);
                            }
                        });
                    }
                });
            }
        });
        final EditText filter = input("Filter item names", false);
        body.addView(filter, new LinearLayout.LayoutParams(-1, dp(48)));
        final LinearLayout results = column();
        body.addView(results);
        TextView loading = text("Loading inventory from the game...", 12, RoyalVoidTheme.colors(activity).MUTED, false);
        loading.setPadding(0, dp(12), 0, 0);
        results.addView(loading);
        final JSONArray[] loaded = {new JSONArray()};
        final String[] inventoryError = {"Loading inventory from the game..."};
        final Runnable draw = new Runnable(){
            
            public void run() {
                results.removeAllViews();
                String q = filter.getText().toString().toLowerCase(java.util.Locale.US);
                int shown = 0;
                if (loaded[0].length() == 0) {
                    TextView message = text(inventoryError[0].length() > 0 ? inventoryError[0]
                        : "No inventory items were returned by the game.", 12, RoyalVoidTheme.colors(activity).MUTED, false);
                    message.setPadding(0, dp(12), 0, 0);
                    results.addView(message);
                    return;
                }
                for (int i = 0; i < loaded[0].length(); i++) {
                    final JSONObject item = loaded[0].optJSONObject(i);
                    if (item == null || !item.optString("title").toLowerCase(java.util.Locale.US).contains(q)) continue;
                    if (++shown > 60) {
                        results.addView(text("Refine your search to see more items.", 12, RoyalVoidTheme.colors(activity).MUTED, false));
                        break;
                    }
                    LinearLayout c = column();
                    c.setPadding(dp(10), dp(10), dp(10), dp(10));
                    c.setBackground(new GlassPanelDrawable(activity, dp(14), false));
                    LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, -2);
                    cp.topMargin = dp(8);
                    results.addView(c, cp);
                    LinearLayout itemHead = row(); itemHead.setGravity(Gravity.CENTER_VERTICAL);
                    ArtworkView image = new ArtworkView(activity);
                    itemHead.addView(image, new LinearLayout.LayoutParams(dp(44), dp(44)));
                    itemArtwork.load(item.optString("image"), image);
                    TextView itemTitle = text(item.optString("title"), 13, RoyalVoidTheme.colors(activity).TEXT, true);
                    itemTitle.setPadding(dp(10),0,0,0);
                    itemHead.addView(itemTitle, new LinearLayout.LayoutParams(0,-2,1)); c.addView(itemHead);
                    addButton(c, "Quantity: " + item.optInt("amount") + "  \u00b7  Edit", false, new Runnable(){
                        
                        public void run() {
                            numberDialog(item.optString("title"), item.optInt("amount"), new NumberAction(){
                                
                                public void apply(long n) {
                                    command("item", args("id", item.optString("id"), "label", item.optString("title"), "value", n), null);
                                }
                            });
                        }
                    });
                }
            }
        };
        command("items", new JSONObject(), new GameConnection.Callback(){
            
            public void result(JSONObject r) {
                if (!r.optBoolean("ok")) {
                    inventoryError[0] = r.optString("error", "Inventory could not be loaded. Check the game connection.");
                    draw.run();
                    return;
                }
                inventoryError[0] = "";
                loaded[0] = r.optJSONArray("items");
                if (loaded[0] == null) loaded[0] = new JSONArray();
                draw.run();
            }
        });
        filter.addTextChangedListener(new TextWatcher(){
            
            public void beforeTextChanged(CharSequence s, int st, int c, int a) {
            }
            
            public void onTextChanged(CharSequence s, int st, int before, int c) {
                draw.run();
            }
            
            public void afterTextChanged(Editable e) {
            }
        });

    }

    private void unlockPage() {
        section("Unlocks", "Refresh the game screen after changing your collection.");
        addButton(body, "Unlock all supported categories", true, new Runnable(){ public void run(){
            confirm("Add missing Dynamons at maximum level, upgrade owned Dynamons, and unlock skins, emotes, avatars and worlds? Story completion stays unchanged.", new Runnable(){ public void run(){ command("unlockAll", new JSONObject(), null); }});
        }});
        String[][] kinds = {{"Mons", "All playable Dynamons"}, {"Skins", "All available skins"}, {"Emotes", "All available emotes"}, {"Avatars", "All available suit avatars"}, {"Worlds", "All supported worlds"}};
        for (final String[] kind : kinds) {
            LinearLayout c = card();
            c.addView(text(kind[1], 15, RoyalVoidTheme.colors(activity).TEXT, true));
            addButton(c, "Unlock", true, new Runnable(){
                
                public void run() {
                    confirm("Update " + kind[1].toLowerCase(java.util.Locale.US) + "?", new Runnable(){
                        
                        public void run() {
                            command("unlock", args("kind", kind[0]), null);
                        }
                    });
                }
            });
        }
    }
    
    private void teamPage() {
        section("Team studio", "Scan again after changing battles or switching monsters.");
        LinearLayout size = card();
        size.addView(text("PARTY SIZE", 11, RoyalVoidTheme.colors(activity).LAVENDER, true));
        for (int i = 3; i <= 5; i++) {
            final int n = i;
            TextView option = button(n + " Dynamons", state.optInt("party", 3) == i, new Runnable(){
                
                public void run() {
                    command("party", args("value", n), new GameConnection.Callback(){
                        public void result(JSONObject result) {
                            if (!result.optBoolean("ok")) return;
                            try { state.put("party", result.optInt("value", n)); } catch (JSONException ignored) {}
                            updatePartyButtons();
        updateSpeedControl();
                        }
                    });
                }
            });
            partyButtons.put(Integer.valueOf(n), option);
            LinearLayout.LayoutParams optionParams = new LinearLayout.LayoutParams(-1, -2);
            optionParams.topMargin = dp(8);
            size.addView(option, optionParams);
        }
        updatePartyButtons();
        updateSpeedControl();
        final LinearLayout results = column();
        teamScanResults=results;
        renderTeamScan(results);
        addButton(body, "Scan team & enemy", true, new Runnable(){
            
            public void run() {
                command("scan", new JSONObject(), new GameConnection.Callback(){
                    
                    public void result(JSONObject r) {
                        if (!r.optBoolean("ok")) return;
                        results.removeAllViews();
                        JSONArray mons = r.optJSONArray("mons");
                        final String token = r.optString("token");
                        if (mons == null) return;
                        teamScanMons=mons;teamScanToken=token;teamScanScrollY=0;
                        if(page.equals("Team") && teamScanResults!=null){
                            renderTeamScan(teamScanResults);
                            final int scanGeneration=renderGeneration;
                            scroll.post(new Runnable(){public void run(){
                                if(!closed && page.equals("Team") && renderGeneration==scanGeneration && teamScanResults!=null){
                                    teamScanScrollY=teamScanResults.getTop();scroll.scrollTo(0,teamScanScrollY);
                                }
                            }});
                        }
                    }
                });
            }
        });
        body.addView(results);
    }
    
    private void renderTeamScan(final LinearLayout results) {
        results.removeAllViews();
        if(teamScanMons==null)return;
        final JSONArray mons=teamScanMons;
        final String token=teamScanToken;
                        for (int i = 0; i < mons.length(); i++) {
                            final JSONObject m = mons.optJSONObject(i);
                            if (m == null) continue;
                            LinearLayout c = column();
                            c.setPadding(dp(12), dp(14), dp(12), dp(14));
                            boolean enemy = "enemy".equals(m.optString("sideId")) || "Enemy".equals(m.optString("side"));
                            int sideColor = enemy ? android.graphics.Color.rgb(255, 137, 116) : android.graphics.Color.rgb(102, 224, 217);
                            c.setBackground(new GlassPanelDrawable(activity, dp(16), false, sideColor));
                            c.setContentDescription((enemy ? "Enemy: " : "Your team: ") + m.optString("name"));
                            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
                            lp.topMargin = dp(10);
                            results.addView(c, lp);
                            c.addView(text(enemy ? "ENEMY" : "YOUR TEAM", 10, sideColor, true));
                            c.addView(text(m.optString("name"), 18, RoyalVoidTheme.colors(activity).TEXT, true));
                            c.addView(text("HP " + m.optInt("hp") + " / " + m.optInt("max"), 12, RoyalVoidTheme.colors(activity).MUTED, false));
                            for (final String stat : new String[]{"hp", "atk", "def", "aim"}) {
                                addButton(c, stat.toUpperCase(java.util.Locale.US) + "  " + m.optInt(stat), false, new Runnable(){
                                    
                                    public void run() {
                                        numberDialog(stat.toUpperCase(java.util.Locale.US), m.optInt(stat), new NumberAction(){
                                            
                                            public void apply(long n) {
                                                command("stat", args("token", token, "index", m.optInt("index"), "stat", stat, "value", n), null);
                                            }
                                        });
                                    }
                                });
                            }
                        }
    }

    private void skinsPage() {
        section("Skin atelier", "Load a pack from your existing Supabase storage. Saved changes apply after restarting the game.");
        final EditText pack = input("Pack folder name", false);
        pack.setText(prefs.string("skinPack", "mypack"));
        body.addView(pack, new LinearLayout.LayoutParams(-1, dp(48)));
        final LinearLayout results = column();
        addButton(body, "Load manifest", true, new Runnable(){
            
            public void run() {
                final String id = pack.getText().toString().trim();
                toast("Loading skin pack\u2026", false);
                skins.load(id, new SkinPackManager.Callback(){
                    
                    public void result(final JSONObject manifest, String error) {
                        if (error != null) {
                            toast(error, true);
                            return;
                        }
                        prefs.set("skinPack", id);
                        results.removeAllViews();
                        results.addView(text(manifest.optString("title", id), 17, RoyalVoidTheme.colors(activity).TEXT, true));
                        final ArrayList<String> all = new ArrayList<String>();
                        Object mons = manifest.opt("mons");
                        if (mons instanceof JSONObject) {
                            Iterator<String> it = ((JSONObject)mons).keys();
                            while (it.hasNext()) all.add(it.next());
                        } else if (mons instanceof JSONArray) {
                            JSONArray ar = (JSONArray)mons;
                            for (int i = 0; i < ar.length(); i++) all.add(ar.optString(i));
                        }
                        JSONObject names = manifest.optJSONObject("names");
                        if (names != null) {
                            Iterator<String> it = names.keys();
                            while (it.hasNext()) {
                                String k = it.next();
                                if (!all.contains(k)) all.add(k);
                            }
                        }
                        Collections.sort(all);
                        final HashSet<String> selected = new HashSet<String>();
                        JSONObject saved=state.optJSONObject("skin");
                        JSONObject enabled=saved!=null && id.equals(saved.optString("pack"))?saved.optJSONObject("enabled"):null;
                        if(enabled!=null){Iterator<String> keys=enabled.keys();while(keys.hasNext()){String k=keys.next();if(enabled.optInt(k,0)!=0)selected.add(k);}}
                        int shown = 0;
                        for (final String mon : all) {
                            if (++shown > 60) {
                                results.addView(text("Showing the first 60. Apply to all includes the full pack.", 11, RoyalVoidTheme.colors(activity).MUTED, false));
                                break;
                            }
                            final SelectionView marker = new SelectionView(activity);
                            marker.selected(selected.contains(mon));
                            final TextView cb = text(names == null ? mon : names.optString(mon,mon),13,RoyalVoidTheme.colors(activity).TEXT,false);
                            cb.setPadding(dp(8),0,0,0);
                            LinearLayout skinRow = row();
                            skinRow.setGravity(Gravity.CENTER_VERTICAL);
                            ArtworkView icon = new ArtworkView(activity);
                            skinRow.addView(icon, new LinearLayout.LayoutParams(dp(40), dp(40)));
                            skins.loadIcon(id, mon, icon);
                            skinRow.addView(cb, new LinearLayout.LayoutParams(0, -2, 1));
                            skinRow.addView(marker, new LinearLayout.LayoutParams(dp(40),dp(48)));
                            skinRow.setContentDescription(cb.getText()); skinRow.setFocusable(true);
                            results.addView(skinRow);
                            skinRow.setOnClickListener(new View.OnClickListener(){ public void onClick(View v){
                                boolean on=!selected.contains(mon); if(on) selected.add(mon); else selected.remove(mon);
                                marker.selected(on); v.setSelected(on); haptics.tick(v); sounds.play(false); motion.press(v,false);
                                v.announceForAccessibility(cb.getText() + (on ? " selected" : " unselected"));
                            }});
                        }
                        addButton(results, "Save selected", true, new Runnable(){
                            
                            public void run() {
                                command("skinConfig", args("pack", id, "manifest", manifest, "enabled", new JSONArray(selected)), null);
                            }
                        });
                        addButton(results, "Apply to all", false, new Runnable(){
                            
                            public void run() {
                                command("skinConfig", args("pack", id, "manifest", manifest, "enabled", new JSONArray(all)), null);
                            }
                        });
                    }
                });
            }
        });
        addButton(body, "Restore original artwork", false, new Runnable(){
            
            public void run() {
                command("resetSkins", new JSONObject(), null);
            }
        });
        body.addView(results);
    }
    
    private void themeSelector() {
        LinearLayout container=card();
        container.addView(text("THEMES",11,ThemeManager.colors(activity).LAVENDER,true));
        TextView detail=text("Tap to change the logo and every menu colour. Saved on this device.",12,ThemeManager.colors(activity).MUTED,false);
        detail.setPadding(0,dp(8),0,dp(4));container.addView(detail);
        for(final String id:ThemeManager.enabled(activity)) {
            final ThemeManager.Palette palette=ThemeManager.preview(activity,id);
            boolean selected=id.equals(ThemeManager.current(activity));
            LinearLayout option=row();option.setGravity(Gravity.CENTER_VERTICAL);
            option.setPadding(dp(10),dp(10),dp(10),dp(10));
            option.setBackground(RoyalVoidTheme.shape(selected?ThemeManager.colors(activity).DEEP:ThemeManager.colors(activity).INPUT,selected?ThemeManager.colors(activity).PURPLE:ThemeManager.colors(activity).LINE,dp(14)));
            LinearLayout.LayoutParams optionParams=new LinearLayout.LayoutParams(-1,-2);optionParams.topMargin=dp(8);container.addView(option,optionParams);
            ArtworkView logo=new ArtworkView(activity);logo.asset(ThemeManager.logoPath(activity,id));logo.setSurfaceColor(palette.CARD);
            option.addView(logo,new LinearLayout.LayoutParams(dp(42),dp(42)));
            LinearLayout labels=column();labels.setPadding(dp(10),0,dp(6),0);
            labels.addView(text(palette.label,13,ThemeManager.colors(activity).TEXT,true));
            LinearLayout swatches=row();swatches.setPadding(0,dp(6),0,0);
            for(int color:new int[]{palette.PURPLE,palette.DEEP,palette.LAVENDER}) {
                View dot=new View(activity);dot.setBackground(RoyalVoidTheme.shape(color,0,dp(6)));
                LinearLayout.LayoutParams dotParams=new LinearLayout.LayoutParams(dp(12),dp(12));dotParams.rightMargin=dp(5);swatches.addView(dot,dotParams);
            }
            labels.addView(swatches);option.addView(labels,new LinearLayout.LayoutParams(0,-2,1));
            if(selected)option.addView(new IconView(activity,"check",ThemeManager.colors(activity).LAVENDER),new LinearLayout.LayoutParams(dp(22),dp(22)));
            option.setFocusable(true);option.setClickable(true);option.setSelected(selected);
            option.setContentDescription(palette.label+(selected?", selected":", select theme"));
            option.setOnClickListener(new View.OnClickListener(){public void onClick(View v){
                if(id.equals(ThemeManager.current(activity)))return;
                if(ThemeManager.select(activity,id)){haptics.tick(v);rebuildAppearance();toast(palette.label+" theme selected",false);}
            }});
        }
    }

    private void rebuildAppearance() {
        if(closed||panel==null)return;
        final int scrollY=scroll.getScrollY();final boolean wasVisible=visible;
        final float positionX=panel.getX(),positionY=panel.getY();
        hideKeyboard();
        for(Dialog dialog:new ArrayList<Dialog>(dialogs))dialog.dismiss();
        panel.animate().setListener(null);panel.animate().cancel();
        if(scrollMotion!=null)scrollMotion.close();
        if(backdrop!=null){backdrop.close();root.removeView(backdrop);}
        root.removeView(panel);root.removeView(ambient);
        if(notice!=null){root.removeView(notice);notice=null;}
        launcher.applyTheme();
        buildPanel();
        panel.setX(positionX);panel.setY(positionY);
        backdrop.setX(positionX);backdrop.setY(positionY);
        launcher.setVisibility(wasVisible?View.GONE:View.VISIBLE);
        final ScrollView rebuiltScroll=scroll;
        final int rebuiltGeneration=renderGeneration;
        rebuiltScroll.post(new Runnable(){public void run(){if(!closed&&scroll==rebuiltScroll&&renderGeneration==rebuiltGeneration)rebuiltScroll.scrollTo(0,scrollY);}});
        if(wasVisible){
            backdrop.capture(activity,new Runnable(){public void run(){if(closed||!visible)return;
                backdrop.setVisibility(View.VISIBLE);panel.setVisibility(View.VISIBLE);
                ambient.setVisibility(prefs.bool("ambientGlow",true)?View.VISIBLE:View.GONE);
                panel.requestFocus();
                if(motion.enabled()){panel.setAlpha(0);panel.animate().alpha(prefs.number("opacity",.86f)).setDuration(180).start();}
            }});
        }
    }

    private void settingsPage() {
        section("Command centre", "Appearance, feedback and one-file control backup.");
        themeSelector();
        portableControls();
        setting("Haptic feedback", "haptics", true);
        setting("Interface sounds", "sounds", true);
        setting("Subtle 3D depth", "depth", true);
        setting("Ambient glow", "ambientGlow", true);
        setting("Reduced motion", "reducedMotion", false);
        preferenceSlider("Glass opacity", "opacity", 65, 100, 86);
        preferenceSlider("Sound volume", "soundVolume", 0, 60, 22);
        LinearLayout c = card();
        c.addView(text("PANEL SIZE", 11, RoyalVoidTheme.colors(activity).LAVENDER, true));
        SeekBar size = new SeekBar(activity);
        try{size.getProgressDrawable().setColorFilter(RoyalVoidTheme.colors(activity).PURPLE,android.graphics.PorterDuff.Mode.SRC_IN);size.getThumb().setColorFilter(RoyalVoidTheme.colors(activity).LAVENDER,android.graphics.PorterDuff.Mode.SRC_IN);}catch(Exception ignored){}
        size.setMax(35);
        size.setProgress((int)(prefs.number("panelHeight", 0.78F) * 100) - 60);
        c.addView(size, new LinearLayout.LayoutParams(-1, dp(48)));
        size.setContentDescription("Menu height");
        size.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            
            public void onProgressChanged(SeekBar b, int n, boolean user) {
                if (user) {
                    prefs.set("panelHeight", (n + 60) / 100.0F);
                    sizePanel();
                }
            }
            
            public void onStartTrackingTouch(SeekBar b) {
            }
            
            public void onStopTrackingTouch(SeekBar b) {
            }
        });
        addButton(c, "Toggle compact edge launcher", false, new Runnable(){
            
            public void run() {
                launcher.compact(!launcher.compact());
                toast("Launcher preference saved", false);
            }
        });
        addButton(body, "Stop all automation", false, new Runnable(){
            
            public void run() {
                command("stopAll", new JSONObject(), null);
            }
        });
    }
    
    private void preferenceSlider(final String title,final String key,final int min,final int max,int fallback) {
        LinearLayout c=card(); final TextView label=text(title,13,RoyalVoidTheme.colors(activity).TEXT,true);c.addView(label);
        SeekBar b=new SeekBar(activity);b.setMax(max-min);b.setProgress((int)(prefs.number(key,fallback/100f)*100)-min);b.setContentDescription(title);
        try{b.getProgressDrawable().setColorFilter(RoyalVoidTheme.colors(activity).PURPLE,android.graphics.PorterDuff.Mode.SRC_IN);b.getThumb().setColorFilter(RoyalVoidTheme.colors(activity).LAVENDER,android.graphics.PorterDuff.Mode.SRC_IN);}catch(Exception ignored){}
        c.addView(b,new LinearLayout.LayoutParams(-1,dp(48)));
        b.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(SeekBar v){}public void onStopTrackingTouch(SeekBar v){sounds.play(false);}
            public void onProgressChanged(SeekBar v,int n,boolean user){label.setText(title+" · "+(n+min)+"%");if(user){prefs.set(key,(n+min)/100f);if(key.equals("opacity"))sizePanel();}}
        });
    }

    private void setting(String label, final String key, boolean fallback) {
        LinearLayout c = card();
        LinearLayout r = row();
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.addView(text(label, 13, RoyalVoidTheme.colors(activity).TEXT, true), new LinearLayout.LayoutParams(0, -2, 1));
        final ToggleView t = new ToggleView(activity);
        t.setContentDescription(label);
        t.state(prefs.bool(key, fallback), false, false);
        r.addView(t, new LinearLayout.LayoutParams(dp(48), dp(48)));
        c.addView(r);
        t.setOnClickListener(new View.OnClickListener(){
            
            public void onClick(View v) {
                boolean n = !t.checked();
                prefs.set(key, n);
                t.state(n, false, motion.enabled());
                haptics.tick(t);
                if (key.equals("sounds")) sounds.prepare();
                if (key.equals("ambientGlow")) ambient.setVisibility(n && visible ? View.VISIBLE : View.GONE);
            }
        });
    }
    
    private void community() {
        section("Dynamon Gamer", "Royal Void edition. Built for your Dynamons World experience.");
        LinearLayout c = card();
        ArtworkView logo = new ArtworkView(activity);
        logo.asset(ThemeManager.logoPath(activity));
        c.addView(logo, new LinearLayout.LayoutParams(-1, dp(112)));
        c.addView(text("Stay connected", 19, RoyalVoidTheme.colors(activity).TEXT, true));
        JSONObject brand=state.optJSONObject("brand");
        if(brand==null)brand=remoteBrand;
        JSONArray links=brand==null?null:brand.optJSONArray("links");
        if(links==null){ c.addView(text("Community links are loading from your server. Check your connection if they remain unavailable.",12,RoyalVoidTheme.colors(activity).MUTED,false)); }
        else for(int i=0;i<Math.min(links.length(),8);i++) {
            JSONObject link=links.optJSONObject(i); if(link==null) continue;
            final String url=link.optString("url");
            Uri uri=Uri.parse(url); String host=uri.getHost();
            if(!"https".equals(uri.getScheme()) || host==null || uri.getUserInfo()!=null) continue;
            LinearLayout row=row(); row.setGravity(Gravity.CENTER_VERTICAL);
            row.addView(new IconView(activity,link.optString("icon","globe"),RoyalVoidTheme.colors(activity).LAVENDER),new LinearLayout.LayoutParams(dp(24),dp(24)));
            row.addView(button(link.optString("title","Open link"),false,new Runnable(){public void run(){
                try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}
                catch(ActivityNotFoundException e){toast("No app can open this link",true);}
            }}),new LinearLayout.LayoutParams(0,-2,1));
            c.addView(row);
        }
        body.addView(text("Version " + BrandConfig.VERSION + " \u00b7 Open Sans typography", 11, RoyalVoidTheme.colors(activity).MUTED, false));
    }
    
    interface NumberAction {
        
        void apply(long n);
    }
    
    private void numberDialog(String title, long value, final NumberAction action) {
        final EditText e = input(title, true);
        e.setText(String.valueOf(value));
        LinearLayout box = column();
        box.setPadding(dp(20), dp(12), dp(20), 0);
        box.addView(e, new LinearLayout.LayoutParams(-1, dp(48)));
        dialog(title, box, "Apply", new Runnable(){
            
            public void run() {
                try {
                    action.apply(Long.parseLong(e.getText().toString()));
                } catch (Exception x) {
                    toast("Enter a valid whole number", true);
                }
            }
        });
    }
    
    private void confirm(String message, Runnable action) {
        LinearLayout box = column();
        box.setPadding(dp(20), dp(12), dp(20), 0);
        box.addView(text(message, 14, RoyalVoidTheme.colors(activity).TEXT, false));
        dialog("Confirm change", box, "Continue", action);
    }
    
    private void dialog(String title, View content, String positive, final Runnable action) {
        final AlertDialog d = new AlertDialog.Builder(new ContextThemeWrapper(activity, android.R.style.Theme_DeviceDefault_Dialog_Alert)).setTitle(title).setView(content).setNegativeButton("Cancel", null).setPositiveButton(positive, new DialogInterface.OnClickListener(){
            
            public void onClick(DialogInterface dialog, int which) {
                action.run();
            }
        }).create();
        track(d);
        d.show();
        styleDialog(d);
    }
    
    private void styleDialog(AlertDialog d) {
        if(d.getWindow()!=null){
            d.getWindow().setBackgroundDrawable(new GlassPanelDrawable(activity,dp(22),true));
            tintDialogText(d.getWindow().getDecorView());
        }
        if(d.getButton(-1)!=null)d.getButton(-1).setTextColor(ThemeManager.colors(activity).LAVENDER);
        if(d.getButton(-2)!=null)d.getButton(-2).setTextColor(ThemeManager.colors(activity).MUTED);
        if(d.getListView()!=null)d.getListView().setSelector(RoyalVoidTheme.shape(ThemeManager.alpha(ThemeManager.colors(activity).PURPLE,45),0,dp(10)));
    }
    private void tintDialogText(View view) {
        if(view instanceof TextView){
            ((TextView)view).setTextColor(ThemeManager.colors(activity).TEXT);
            if(view instanceof EditText)((EditText)view).setHintTextColor(ThemeManager.colors(activity).MUTED);
        }
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)tintDialogText(group.getChildAt(i));}
    }

    private void track(final Dialog d) {
        dialogs.add(d);
        d.setOnDismissListener(new DialogInterface.OnDismissListener(){
            
            public void onDismiss(DialogInterface x) {
                dialogs.remove(d);
            }
        });
    }
    
    public void pause() {
        paused = true;
        handler.removeCallbacks(poll);
        if (panel != null) {
            panel.animate().setListener(null);
            panel.animate().cancel();
            if (!visible) {
                panel.setVisibility(View.GONE);
                launcher.setVisibility(View.VISIBLE);
            }
        }
    }
    
    public void resume() {
        paused = false;
        if (visible) {
            panel.setAlpha(prefs.number("opacity", 0.86f));
            panel.setScaleX(1);
            panel.setScaleY(1);
            panel.setRotationX(0);
            panel.setRotationY(0);
        }
        handler.removeCallbacks(poll);
        refresh();
    }
    
    public void close() {
        closed = true;
        handler.removeCallbacksAndMessages(null);
        publicConfig.close();
        if(payloadLoader!=null) payloadLoader.close();
        game.close();
        if (scrollMotion != null) scrollMotion.close();
        if(backdrop!=null) backdrop.close();
        skins.close();
        itemArtwork.close();
        sounds.close();
        for (Dialog d : new ArrayList<Dialog>(dialogs)) d.dismiss();
        dialogs.clear();
        root.removeOnLayoutChangeListener(layoutListener);
        if (root.getParent() instanceof ViewGroup) ((ViewGroup)root.getParent()).removeView(root);
    }
}
