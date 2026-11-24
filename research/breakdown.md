# Ramayana: The Sacred Fires — Technical Breakdown

Source: `https://thaxnay.com/ramayana/` (24 Nov 2026 ko fetch kiya)
Is folder mein:

| File | Kya hai |
|---|---|
| `index.html` | Page ka poora HTML (40,590 bytes) — saari analysis isi par based hai |
| `headers.txt` | Page ke HTTP response headers |
| `urls.txt` | HTML se nikale gaye saare asset paths |
| `sizes.tsv` | Har asset ka `curl -sI` result (status, length, type, encoding, etag, cache-control) |

> Note: kisi bhi badi file (`.data`, `.wasm`, `.framework`) ko poora download nahi kiya gaya. Sirf `fires10.loader.js` (28 KB, plain text) ko
> scratchpad mein stream karke config ke keywords grep kiye — wo repo mein save nahi hai.

---

## 1. Engine aur stack — ek nazar mein

| Cheez | Value | Saboot |
|---|---|---|
| Engine | **Unity 6** (6000.x) — exact patch version page par kahin nahi likha | Loader mein `webgpuVersion`, `hasWebGPU`, `wasmFileSize`, `GetMetricsInfo`, `UnityCache v4` — ye sab Unity 6 ke loader ke features hain; HTML comment kehta hai "built for WebGPU with WebGL 2 to fall back on" |
| Graphics API | **WebGPU pehle, WebGL 2 fallback** | HTML lines 436–443 |
| Compression | **Brotli** (`.br`), server `Content-Encoding: br` bhejta hai | `curl -sI -H 'Accept-Encoding: br'` → `content-encoding: br` |
| Decompression fallback | **Off** (files `.unityweb` nahi, `.br` hain; browser khud decompress karta hai) | Loader ke error messages + headers |
| Hosting | **Cloudflare Pages** (+ Pages Function, kyunki `cf-cache-status: DYNAMIC`) | Headers + HTML comment "Cloudflare Pages: nothing over 25 MiB" |
| Build name | `fires10` (fixed naam, hash nahi) | `Build/fires10.*` |
| Analytics | Cloudflare Web Analytics beacon | HTML line 547 |

---

## 2. Files aur unke size

Base URL: `https://thaxnay.com/ramayana/`

### Unity build files

| File | Status | Size (HEAD se) | Content-Type / Encoding | Cache |
|---|---|---|---|---|
| `Build/fires10.loader.js` | 200 | HEAD mein nahi diya; stream karke **28,051 bytes** | `text/javascript`, `vary: accept-encoding` | `max-age=14400, must-revalidate` |
| `Build/fires10.framework.js.br` | 200 | **HEAD mein nahi** | `application/javascript`, `br` | `max-age=31536000, immutable` |
| `Build/fires10.wasm.br` | 200 | **HEAD mein nahi** (uncompressed size loader mein: `wasmFileSize: 40089695` ≈ **40.1 MB**) | `application/wasm`, `br` | `immutable` |
| `Build/fires10.data.br` | **404** | — (asli file server par nahi; neeche "split data" dekho) | — | `no-store` |
| `Build/fires10.0.data.br` | 200 | HEAD mein nahi | `application/octet-stream`, `br` | `immutable` |
| `Build/fires10.1.data.br` | 200 | HEAD mein nahi | `application/octet-stream`, `br` | `immutable` |
| **Dono data pieces ka total** | | **51,641,684 bytes ≈ 49.2 MiB** (compressed; HTML ke `pieces.size` se) | | |
| `StreamingAssets/` | 404 | Directory listing nahi; folder path config mein hai | | |

**Size kyun nahi mila?** Server in files ko Pages Function se chunked stream karta hai, isliye `Content-Length` nahi bhejta — na HTTP/2 HEAD mein,
na HTTP/1.1 mein, na `Range: bytes=0-0` request mein (`Content-Range` bhi nahi). Isliye framework aur wasm ka compressed size sirf poora download
karke hi pata chalega, jo hamne nahi kiya. Andaza: 40 MB wasm brotli ke baad aam taur par ~8–12 MB hota hai. Page khud kehta hai
"A full play uses about 120 MB of data" (isme music stream bhi shamil hai).

Side-effect: loader `[UnityCache] Response is served without Content-Length header` warning deta hai aur progress bar ke liye size ka andaza lagata hai.
Apne server par ye galti mat karna — `Content-Length` bhejo.

### Page ke apne assets

| File | Size | Kaam |
|---|---|---|
| `start.webp` | 272,042 B | Opening/pause screen ki background picture |
| `end.webp` | 280,022 B | Ending screen ki picture (play shuru hone ke 15 sec baad prefetch) |
| `card.jpg` | 133,632 B | Social share card (og:image, 1200×630) |
| `icon.png` | 26,687 B | Favicon + apple-touch-icon |
| `check.avif` | 326 B | Browser AVIF padh sakta hai ya nahi, ye test |
| `fonts/FacultyGlyphic-Regular.woff2` | 17,880 B | Title font (preload) |
| `fonts/InstrumentSans-Regular.woff2` | 25,628 B | Body font |
| `fonts/InstrumentSans-Medium.woff2` | 26,308 B | Body font (500) |
| `stream/music-forest.m4a` | HEAD mein nahi | Pehle level ka music, game ke saath hi prefetch |
| `static.cloudflareinsights.com/beacon.min.js` | 31,853 B | Analytics |

**CSS:** koi alag `.css` file nahi — saari styling HTML ke `<style>` mein inline hai (~155 lines).
**JS:** sirf do scripts: `fires10.loader.js` + ek inline IIFE (~280 lines) jo poora shell chalata hai.

---

## 3. Unity loader config (`createUnityInstance`)

```js
createUnityInstance(canvas, {
  dataUrl:            'Build/fires10.data.br',
  frameworkUrl:       'Build/fires10.framework.js.br',
  codeUrl:            'Build/fires10.wasm.br',
  streamingAssetsUrl: 'StreamingAssets',
  companyName:        "DefaultCompany",   // Unity ka default chhoda hua hai
  productName:        "Ramayana",
  productVersion:     "0.1.0",
  matchWebGLToCanvasSize: true,
  devicePixelRatio:   ratio(),             // pixel budget ke hisaab se capped
  showBanner:   function (words, kind) { ... },   // engine warnings/errors
  errorHandler: function (words, file, line) { ... } // sirf fatal errors par fail screen
}, function (progress) { fill.style.width = Math.round(progress*100) + '%'; })
.then(instance => { ... }).catch(err => fail(...));
```

Important baatein:

1. **`companyName` + `productName` set hain** → loader `cachedFetch` use karta hai: files browser ke Cache API + IndexedDB (`UnityCache_DefaultCompany_Ramayana`) mein jaati hain.
   Dobara aane par data download nahi hota. (Loader ke andar `cacheControl()` data file ko `must-revalidate` aur baaki ko `no-store` deta hai.)
   ⚠️ `DefaultCompany` Player Settings ka default hai — apne game mein ise badalna.
2. **`devicePixelRatio` capped hai** — `ratio()` = `min(devicePixelRatio, sqrt(budget / cssPixels))`. Budget desktop par 2.6 MP, phone par 1 MP, `?pixels=` se override.
   Resize par `instance.Module.devicePixelRatio` dobara set hota hai. Retina screens par GPU ka bojh bahut kam ho jaata hai.
3. **`matchWebGLToCanvasSize: true`** + canvas `position: fixed; inset: 0` → full-window game.
4. **Progress callback** sirf ek `2px` ki gold bar ki width badalta hai. Promise resolve hone par note "Nearly there" ho jaata hai — asli "ready" tab hota hai jab game ka pehla scene load hokar page ko batata hai (neeche `settle()`).
5. `window.unityInstance` global par bhi rakha hai (debugging / console ke liye).

### Split data file — sabse smart trick

Cloudflare Pages 25 MiB se badi file host nahi karta, aur data 49 MiB hai. Hal:

- Build ke baad ek script (`web/host.py`, HTML comment ke mutabik) `fires10.data.br` ko `fires10.0.data.br` + `fires10.1.data.br` mein kaat deti hai aur HTML mein likh deti hai:
  ```js
  var pieces = {"name":"Build/fires10.data.br","size":51641684,"tag":"\"1253352a89025cad\"","files":[...]};
  ```
- Page `window.fetch` ko **wrap** kar deta hai. Jab Unity loader `fires10.data.br` maangta hai:
  - `HEAD` → fake `200` with `Content-Length` aur `ETag` (taaki progress bar sahi chale)
  - `If-None-Match` = same tag → `304` (cache wali copy hi chalegi, kuch download nahi)
  - warna → dono pieces **ek saath** fetch, aur ek `ReadableStream` mein order se jod kar ek `Response` lautata hai.
- Loader ko pata hi nahi chalta ki file do tukdon mein thi. Isiliye asli `fires10.data.br` par 404 aata hai.

---

## 4. Loading screen

Sab kuch ek `#veil` div hai jo canvas ke upar (`z-index: 5`) baitha hai. Uski **class hi screen ka state hai**:

| Class | Kab | Kya dikhta hai |
|---|---|---|
| `loading` | Page khulte hi | Title, subtitle, description, progress bar, controls list, "120 MB" note |
| `start` | Game ka pehla scene ready | `Begin` / `Continue` + `Begin again` |
| `asking` | "Begin again" dabaya | Erase confirm: `Go back` / `Erase and begin again` |
| `paused` | Esc / P / tab chhoda / pause button | Resume, Music toggle, Shrine/Home, feedback link |
| `ending` | Game ne `ending` bheja | Thank-you, credits, Follow, Share on X, Keep playing |
| `failed` | Koi bhi fatal error | Error message + detail + `Load it again` |
| `gone` (add hoti hai) | Play ke dauraan | Opacity 0, pointer-events none (0.7s fade) |

- Har element par `data-on="loading start"` jaisa attribute hai; CSS `#veil.loading [data-on~="loading"] { display:block }` se decide hota hai kaunsa dikhega. Koi framework nahi, bas CSS attribute selectors.
- Background `start.webp` load hone par `.in` class se fade-in hoti hai; uske upar `#shade` gradient taaki text padha jaaye.
- **Controls list** khud badalti hai: `html.touch` class → keyboard list chhupti hai, thumb instructions dikhte hain; `html[data-scene="Flight"]` → flight ke controls.
- Responsive: phone portrait mein picture upar 36% mein, landscape phone mein do-column grid. `env(safe-area-inset-*)` har jagah.
- Load khatam hone ke baad bhi screen tab tak nahi hatti jab tak game `gameSays('scene', ...)` na bole — isse "promise resolve hua par pehla frame kaala hai" wali problem nahi aati.

---

## 5. Page ↔ Unity bridge (sabka asli dil)

Do tarfa, simple string protocol:

**Page → Unity:** `instance.SendMessage('Session', method, word)` — scene mein `Session` naam ka GameObject (`Scripts/Web/Session.cs`).

| Method | Arg | Matlab |
|---|---|---|
| `Go` | `begin` | Opening screen se game shuru |
| `Go` | `again` | Saari progress mitao, Hub scene par jao |
| `Go` | `home` | Pause se "Back to the forest home" |
| `Go` | `shrine` | Pause se nearest found shrine par (stuck hone ka ilaaj) |
| `Pause` | `1` / `0` | Game rokna / chalana (timeScale, audio) |
| `Music` | `0` / `1` | Music off / on |
| `Markers` | `''` | Markers toggle |

**Unity → Page:** game `.jslib` ke through `window.gameSays(what, detail)` call karta hai:

| `what` | `detail` | Page kya karta hai |
|---|---|---|
| `scene` | `Hub`, `DarkForest`, `Crag`, `Flight` | `root.dataset.scene` set, aur loading ho to `settle()` → start screen |
| `music` | `1`/`0` | Button text "Music: on/off" |
| `markers` | `1`/`0` | Markers button dim/bright |
| `ending` | — | Game pause, ending screen |

Is design ka fayda: **saara menu UI HTML mein hai, Unity mein nahi.** Fonts sharp, accessibility (button, focus, aria-label), aur Unity UI ka koi kharcha nahi.

---

## 6. Save / Erase

- Progress **`localStorage['ramayana.progress']`** mein JSON hai, kuch is shakal ka: `{ scene, forest, flight, given: [...] }`.
- Page ise **sirf padhta hai** (game ise jslib se likhta hoga, kyunki page mein `setItem` kahin nahi hai). Unity ka default `PlayerPrefs`/`persistentDataPath` IndexedDB (`/idbfs`) mein jaata hai jise page aasaani se nahi padh sakta — isliye localStorage chuna gaya.
- `returning` = scene Hub ke alawa hai, ya forest/flight/given mein kuch hai. Tab:
  - Button "Begin" ki jagah **"Continue"**, aur "Begin again" dikhta hai
  - "You left off in the dark forest." jaisa message (`#left`)
- **Erase flow:** `Begin again` → `asking` screen (confirm, `Go back` default focus, Esc = Go back) → `Erase and begin again` →
  screen wapas `loading` (bar 100%), `tell('Go','again')`, aur ek `waiting = {scene:'Hub', then: ...}` rakh diya jaata hai. Jab game `scene=Hub` bolta hai, 1.5 sec baad (textures aane ke liye) apne aap `Go begin` + play.
- Asli erase game ke andar hota hai (Session.cs) — page sirf command bhejta hai.

---

## 7. Music toggle

- Pause screen par `#music` button. Click → `tell('Music', current==='on' ? '0' : '1')`.
- **Button text khud nahi badalta**; game state badal kar `gameSays('music','0'|'1')` wapas bhejta hai, tab text update hota hai. Source of truth = game.
- **iPhone silent switch fix:** `navigator.audioSession.type = 'playback'` (Safari 16.4+), warna ringer silent hone par WebAudio chup rehta hai.
- **Music prefetch:** `fetch('stream/music-forest.m4a')` game ke saath hi shuru, taaki browser cache mein ho jab game maange (slow network par late start ki shikayat ke baad). Music Unity build ke andar nahi — `stream/` folder mein alag `.m4a` hai, jo data file ko chhota rakhta hai.

---

## 8. Mobile / touch controls

- **Phone detection** (page aur game dono same rule): `/iPhone|iPad|iPod|Android/` ya `maxTouchPoints > 1 && Macintosh` (iPadOS). `?touch` URL mein ho to desktop par bhi touch mode.
- Asli on-screen joystick/buttons **Unity ke andar** hain (`Scripts/UI/TouchControls.cs`, comment ke mutabik): left thumb ring = move, kahin aur drag = look, bow button hold/slide/release, Roll/Jump/Strike.
- Page ki zimmedari:
  - **Safe area:** ek invisible `#keep` div ki padding `env(safe-area-inset-*)` hai; JS uski computed padding padh kar `window.safeInsets = [left,right,top,bottom]` (window ke fraction) set karta hai. Game jslib se ise padh kar controls notch/home bar se door rakhta hai. Resize aur orientationchange par update.
  - **Pause & Markers buttons** HTML mein (`#stop`, `#marks`), sirf `html.touch.playing` par dikhte hain, diamond shape CSS pseudo-elements se.
  - **Fullscreen:** Android par pehle `touchend` par `requestFullscreen({navigationUI:'hide'})` (iPhone par support nahi).
  - `touch-action: none`, `overscroll-behavior: none`, `user-select: none`, `-webkit-touch-callout: none`, viewport `user-scalable=no, viewport-fit=cover` — browser ke zoom/scroll/long-press menu band.
  - **Motion permission popup band:** Unity engine iPhone par DeviceMotion/Orientation permission maang leta hai chahe game use na kare; page `requestPermission` ko `undefined` kar deta hai.
  - Phone par pixel budget 1 MP.
- **Desktop:** Begin par `canvas.requestPointerLock()`. Pointer lock chhootne (Esc) par apne aap pause. Tab hide hone par pause. `P` = pause/resume, `Enter` = resume.

---

## 9. Error handling

Teen parat:

1. **Pehle se check (game load hone se pehle):**
   - `WebAssembly` + (`navigator.gpu` ya `webgl2` context) nahi → turant `failed` screen, load hi nahi karta.
   - `check.avif` (326 bytes) load fail → warning: "browser out of date, game blurred dikhega" (textures AVIF mein hain, purana Edge nahi padh paata).
   - **Firefox ko zabardasti WebGL 2:** `Navigator.prototype.gpu` ko `undefined` kar dete hain (Firefox WebGPU par skin kaali / deer gulaabi render hota tha). `?gl` sab par WebGL 2, `?gpu` Firefox par WebGPU.
2. **Unity ke callbacks:**
   - `showBanner(words, kind)`: `error` → fail screen ("could not start"); warnings → `console.log` (Unity ka default lal/peela banner nahi).
   - `errorHandler`: page ki **har** error yahan aati hai (jaise pointer lock refuse). Sirf regex se match karne wali fatal cheezen (`RuntimeError|abort(|out of memory|unreachable|out of bounds|null function|exception thrown`) par fail screen; baaki sirf log. `return true` taaki Unity khud na ruke.
3. **Promise `.catch`** → fail screen with error text.

`fail()` idempotent hai (ek baar hi chalta hai), pointer lock chhodta hai, error ki pehli line `#detail` mein dikhata hai, aur "Load it again" button sirf tab dikhata hai jab instance ban chuka ho.

---

## 10. Hosting / headers

| Kya | Value |
|---|---|
| `.br` files | `Content-Encoding: br` + sahi `Content-Type` (`application/wasm`, `application/javascript`, `application/octet-stream`) |
| Build files | `Cache-Control: public, max-age=31536000, immutable` |
| HTML, loader, images | `max-age=0` / `14400, must-revalidate` |
| CORS | `access-control-allow-origin: *` |
| Misc | `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin` |

Dhyaan do: `fires10.loader.js` ka naam fixed hai par `max-age=14400` hai, jabki framework/wasm `immutable` hain. Naya build hamesha **naya naam** (`fires11`) lega, warna purana cache atak jayega — `fires10` mein "10" shayad isi liye build number hai.

---

## 11. Apna game Unity 6 mein isi tarah kaise banayein

### Step 1 — Project aur Player Settings (Edit → Project Settings → Player → Web)

- Platform: **Web** (File → Build Profiles → Web → Switch Platform).
- **Company Name** aur **Product Name** set karo (ye UnityCache ke naam mein jaate hain). Version bhi.
- *Other Settings → Graphics APIs*: "Auto Graphics API" band karo, list mein **WebGPU** upar aur **WebGL 2** neeche (Unity 6.1+ mein WebGPU available hai; abhi experimental hai — apne target browsers par test karo).
- *Publishing Settings*:
  - Compression Format: **Brotli**
  - **Decompression Fallback: Off** (server sahi header bhejega; fallback on karne se JS mein decompress hota hai, slow hai)
  - **Data Caching: On**
  - Name Files As Hashes: Off rakho agar ye site ki tarah fixed naam + build number chahiye; ya On rakho aur HTML template variables par bharosa karo (cache busting free milti hai).
- Textures ke liye ASTC/AVIF jaisi compression try karo — is game ne pictures AVIF mein rakhi hain aur `check.avif` se browser test kiya.
- *Resolution and Presentation*: apna **custom WebGL template** chuno (Step 2).

### Step 2 — Custom WebGL Template

`Assets/WebGLTemplates/MyShell/index.html` banao (+ `thumbnail.png`). Unity ye variables bhar deta hai:

```html
<canvas id="game" tabindex="-1"></canvas>
<div id="veil" class="loading"> ... (apni loading/start/pause/ending/failed screens) ... </div>
<script src="Build/{{{ LOADER_FILENAME }}}"></script>
<script>
  createUnityInstance(document.getElementById('game'), {
    dataUrl:      "Build/{{{ DATA_FILENAME }}}",
    frameworkUrl: "Build/{{{ FRAMEWORK_FILENAME }}}",
    codeUrl:      "Build/{{{ CODE_FILENAME }}}",
    streamingAssetsUrl: "StreamingAssets",
    companyName:    {{{ JSON.stringify(COMPANY_NAME) }}},
    productName:    {{{ JSON.stringify(PRODUCT_NAME) }}},
    productVersion: {{{ JSON.stringify(PRODUCT_VERSION) }}},
    matchWebGLToCanvasSize: true,
    devicePixelRatio: ratio(),
    showBanner: (msg, type) => type === 'error' ? fail('Could not start', msg) : console.log(msg),
    errorHandler: (msg) => { if (/RuntimeError|abort\(|out of memory/i.test(String(msg))) fail('Game stopped', msg); return true; }
  }, p => fill.style.width = (p * 100) + '%')
  .then(inst => { window.unityInstance = inst; /* settle() game ke 'scene' message par */ })
  .catch(err => fail('Could not start', String(err)));
</script>
```

Fonts, `start.webp`, `check.avif`, `icon.png` template folder mein rakho — Unity unhe build output mein copy kar deta hai.
Is page ke CSS/JS (sections 4–9) ko starting point ki tarah use karo: veil-class state machine, `data-on` selectors, safe-area `#keep` trick, pixel budget.

### Step 3 — Page ↔ Unity bridge

**`Assets/Plugins/WebGL/Bridge.jslib`**

```js
mergeInto(LibraryManager.library, {
  GameSays: function (what, detail) {
    if (window.gameSays) window.gameSays(UTF8ToString(what), UTF8ToString(detail));
  },
  SaveProgress: function (json) {
    try { localStorage.setItem('mygame.progress', UTF8ToString(json)); } catch (e) {}
  },
  LoadProgress: function () {
    var s = ''; try { s = localStorage.getItem('mygame.progress') || ''; } catch (e) {}
    var n = lengthBytesUTF8(s) + 1, p = _malloc(n); stringToUTF8(s, p, n); return p;
  },
  ClearProgress: function () { try { localStorage.removeItem('mygame.progress'); } catch (e) {} },
  SafeInset: function (i) { return (window.safeInsets && window.safeInsets[i]) || 0; },
  IsTouch: function () { return document.documentElement.classList.contains('touch') ? 1 : 0; }
});
```

**`Session.cs`** (scene mein `Session` naam ka GameObject, `DontDestroyOnLoad`):

```csharp
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;

public class Session : MonoBehaviour
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void GameSays(string what, string detail);
    [DllImport("__Internal")] static extern void ClearProgress();
#else
    static void GameSays(string w, string d) => Debug.Log($"gameSays {w} {d}");
    static void ClearProgress() {}
#endif
    void Awake() { gameObject.name = "Session"; DontDestroyOnLoad(gameObject);
                   SceneManager.sceneLoaded += (s, _) => GameSays("scene", s.name); }

    // page se: SendMessage('Session', 'Go', 'begin' | 'again' | 'home' | 'shrine')
    public void Go(string what) {
        switch (what) {
            case "begin":  /* intro/controls enable */ break;
            case "again":  ClearProgress(); SceneManager.LoadScene("Hub"); break;
            case "home":   SceneManager.LoadScene("Hub"); break;
            case "shrine": /* player ko last checkpoint par */ break;
        }
    }
    public void Pause(string on) { Time.timeScale = on == "1" ? 0 : 1; AudioListener.pause = on == "1"; }
    public void Music(string on) { /* music mixer mute */ GameSays("music", on); }
    public void Markers(string _) { /* toggle */ /* GameSays("markers", visible ? "1" : "0"); */ }

    public static void Ending() => GameSays("ending", "");
}
```

Zaroori: `Pause` mein `Time.timeScale` aur audio dono rokna. `Music` ka jawab hamesha `GameSays("music", ...)` se bhejo taaki button sach dikhaye. Pehla scene load hote hi `scene` bhejo — page isi par loading screen hatata hai.

### Step 4 — Save system

- Ek chhota `[Serializable] class Progress { string scene; bool forest; bool flight; string[] given; }`.
- Har checkpoint par `SaveProgress(JsonUtility.ToJson(p))`; start par `LoadProgress()`.
- localStorage isliye kyunki page ko bhi "Continue / Begin again / You left off..." dikhane ke liye padhna hai. (Alternative: `PlayerPrefs` — par wo IndexedDB mein hai aur page se padhna mushkil.)
- Erase hamesha confirm screen ke peeche rakho.

### Step 5 — Mobile touch controls

- **Unity Input System** ka `On-Screen Stick` / `On-Screen Button` (ya apna custom script) ek Canvas par, sirf `IsTouch()==1` par enable.
- Canvas ke `SafeArea` panel ki anchors `SafeInset(0..3)` se set karo (Unity ka `Screen.safeArea` Web par notch nahi jaanta — isliye ye page wali trick).
- Page par: viewport meta (`viewport-fit=cover, user-scalable=no`), `touch-action:none`, motion-permission patch, Android fullscreen on first touch, HTML pause button.
- Phone par `devicePixelRatio` ko ~1 MP budget tak capped rakho; Quality setting bhi kam karo.

### Step 6 — Build aur post-process

Ek editor script (`BuildPipeline.BuildPlayer`) se build karo, output folder ka naam build number ke saath (`game12`). Phir ek chhoti script (Python/Node):

1. Agar `*.data.br` > 25 MiB hai (Cloudflare Pages limit) → 20 MiB ke pieces mein kaato, size + ETag nikalo, aur `index.html` mein `var pieces = {...}` likh do (section 3 wala fetch wrapper template mein pehle se rakho; `pieces = null` ho to wo kuch nahi karta).
2. Bade music files `stream/` mein `.m4a` ke roop mein alag rakho; Unity mein `UnityWebRequestMultimedia.GetAudioClip` se stream karo.
3. og:image card, icon, check.avif copy karo.

### Step 7 — Hosting

Cloudflare Pages par `_headers` file:

```
/Build/*.br
  Content-Encoding: br
  Cache-Control: public, max-age=31536000, immutable
/Build/*.wasm.br
  Content-Type: application/wasm
/Build/*.js.br
  Content-Type: application/javascript
/Build/*.data.br
  Content-Type: application/octet-stream
```

Agar Pages `Content-Encoding` header ko sahi se pass na kare (ye site Pages Function use karti lagti hai — `cf-cache-status: DYNAMIC`), to ek chhota `functions/Build/[[path]].js`
likho jo file ko `Content-Encoding: br`, sahi type aur **`Content-Length`** ke saath lautaye. (Is site par `Content-Length` nahi aata — tumhare server par aana chahiye, taaki progress bar sahi chale.)

Doosre hosts: itch.io (Decompression Fallback On karna padta hai), Netlify / Nginx (`.br` → `Content-Encoding: br` ka rule), GitHub Pages (custom headers nahi → Decompression Fallback On ya Gzip).

### Step 8 — Testing checklist

- [ ] Chrome (WebGPU), Safari 26, Firefox (WebGL 2 forced), purana Edge (AVIF warning)
- [ ] iPhone: silent switch par sound, motion popup na aaye, notch ke paas controls
- [ ] Android: fullscreen, back button, low-end GPU fps
- [ ] Slow 3G throttle: progress bar, music prefetch, dobara visit par cache se instant load (DevTools → Application → Cache Storage `UnityCache_...`)
- [ ] Save → reload → "Continue"; Begin again → Go back; Erase → fresh Hub
- [ ] Esc / tab switch → pause; P / Enter → resume
- [ ] Jaan-boojh kar crash (`Utils.ForceCrash`) → failed screen + "Load it again"
- [ ] Naya build → naya filename, purana cache nahi atakta

---

## 12. Seekhne layak chhoti baatein (summary)

1. Menu/HUD-ke-bahar ka UI **HTML mein**, game sirf game — `SendMessage` + jslib ka chhota protocol.
2. Loading screen tab hatao jab **game bole "scene ready"**, promise resolve hone par nahi.
3. **Pixel budget** se `devicePixelRatio` cap — retina/phone par sabse bada performance jeet.
4. Browser-specific quirks page mein patch karo (Firefox WebGPU, iPhone audioSession, iOS motion permission, AVIF check).
5. **errorHandler** mein filter: har console error fatal nahi.
6. Host limits ko `fetch` wrapper se jeeto (25 MiB split) — loader ko kuch pata nahi chalta.
7. Bade audio ko build se bahar `stream/` mein rakho aur jaldi prefetch karo.
8. `immutable` cache + har build ka naya naam.
