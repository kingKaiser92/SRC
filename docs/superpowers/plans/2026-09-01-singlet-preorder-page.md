# Race Day Singlet Preorder Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `saintsrunclub.com/preorder` using the client's own GLB compressed for mobile, with the drag turntable restored and the order form built in full but deliberately unwired.

**Architecture:** Static self-contained HTML in the existing flat site, no build step. The 3D object is a meshopt/WebP derivative of the client GLB rendered by a vanilla-JS custom element wrapping three.js. The form is complete and endpoint-driven; with no endpoint set it takes an honest path that never claims an order was recorded.

**Tech Stack:** HTML/CSS/vanilla JS (ES5 style in `preorder.html`, ES6+ in the viewer), three.js 0.184.0 via import map from unpkg, `@gltf-transform/cli` for the asset pipeline, Playwright 1.62.1 (already cached at `~/AppData/Local/ms-playwright`) for verification, Python 3.13 `http.server` for local serving.

**Spec:** `docs/superpowers/specs/2026-09-01-singlet-preorder-page-design.md`

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Branch:** `singlet-preorder-page`. Already checked out. Never commit `_redirects`, `privacy.html`, `terms.html`, `.claude/`, `supabase/`, `src-stitch-webstore.md`, or `Saints Run Club anniversary RSVP/` — those are the user's unrelated in-flight edits. Stage files by explicit path, never `git add -A` or `git add .`.
- **Source GLB (read-only, outside the repo):** `/c/Users/Shadman Kaiser/Desktop/SRC Website 2/saints_floating_object_app_optimized.glb`, md5 `d45da0cd9cdeca882f2f7208993722a7`, 7,509,168 bytes. Never edit it. Never ship it directly. Never substitute a different model.
- **No em-dashes** anywhere in shipped HTML, CSS, JS, or their comments. Use a period, a comma, or a colon. This is an existing convention in these files.
- **No `window.addEventListener('scroll', ...)`** anywhere. Scroll-derived values are read inside a rAF tick or via `IntersectionObserver`.
- **No responsive media queries** in `preorder.html`. Layout reflows via `clamp()` and `flex: 1 1 <basis>`, never viewport breakpoints. User-preference queries such as `@media (prefers-reduced-motion: reduce)` are permitted and expected: the ban is on breakpoints, not on accessibility.
- **No ancestor of the sticky hero stage may set `overflow-x: hidden`.** It computes `overflow-y: auto` and silently kills `position: sticky`. Use `overflow-x: clip`.
- **Config values (final):** price `50`, `closesOn` `'Fri, Sept 4 · 9AM'`, `closesAt` `'2026-09-04T09:00:00-04:00'`, `zelleHandle` `'saintsvisionllc@gmail.com'`, `zelleUrl` `'https://www.zellepay.com/'`, sizes `XS,S,M,L,XL,XXL`, `maxQty` `6`, `pickup` `'Pickup at a Saturday long run, early October.'`, `item` `'Race Day Singlet Vol. 01'`, `endpoint` `''`.
- **`CONFIG.endpoint` ships empty.** It is the single condition that decides both receipt copy and whether a network call happens. Do not add a second flag.
- **Scratchpad for throwaway files:** `/c/Users/SHADMA~1/AppData/Local/Temp/claude/c--Users-Shadman-Kaiser-Desktop-Claude-Code-Projects-SRC-Website/d94cd29e-1e6e-4b3e-82bf-d902b246b5e2/scratchpad`. Verification scripts live here and are **not** committed. Referred to below as `$SCRATCH`.
- **Local server for every verification step:** `python -m http.server 8123` from the repo root, reachable at `http://127.0.0.1:8123/preorder.html`. `file://` will not work: ES module import maps and GLB fetches need a real origin.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `singlet-assets/singlet.glb` | The only 3D asset. Compressed derivative of the client GLB. Replaces a 1.6 MB photogrammetry scan that is not the client's model. | 1 |
| `singlet-assets/singlet-mobile.glb` | **Deleted.** One asset serves every device. | 1 |
| `singlet-assets/README.md` | Records the source md5, the exact pipeline, measured sizes, and the Draco/KTX2 rejections so the asset is reproducible. | 1 |
| `singlet-assets/singlet-viewer.js` | The turntable custom element. Owns all three.js, motion math, drag, framing, and lifecycle. Nothing else touches three.js. | 2 |
| `preorder.html` | The page: markup, styles, config, countdown, form state, validation, submit. | 3 |
| `google-apps-script.gs` | Sheets endpoint, ready to paste but not deployed. | 4 |
| `PREORDER-SETUP.md` | How to wire a backend later, both routes. | 4 |

`preorder.html` is a single large self-contained file. That is the established pattern in this repo (`rsvp.html`, `shop.html`, `strava.html` are all built the same way) and splitting it would break the "one page, one file, no build step" property the site depends on. Do not restructure it.

---

### Task 1: Build the compressed GLB from the client source

Replaces the wrong model with a compressed derivative of the client's own file, and documents the pipeline so it can be rebuilt.

**Files:**
- Create: `singlet-assets/singlet.glb` (overwrites the existing 1.6 MB file)
- Delete: `singlet-assets/singlet-mobile.glb`
- Rewrite: `singlet-assets/README.md`
- Test: `$SCRATCH/check-glb.sh`

**Interfaces:**
- Consumes: nothing.
- Produces: `singlet-assets/singlet.glb`, a GLB using extensions `EXT_meshopt_compression`, `EXT_texture_webp`, `KHR_mesh_quantization`, `KHR_materials_unlit`. Task 2's viewer must register a Meshopt decoder to load it, and must handle a `MeshBasicMaterial` carrying a `.map`.

- [ ] **Step 1: Write the failing check**

Create `$SCRATCH/check-glb.sh`:

```bash
#!/usr/bin/env bash
# Asserts the shipped GLB is a faithful, compressed derivative of the client
# source: same triangle count, same texture resolution, under the size budget.
set -u
GLB="singlet-assets/singlet.glb"
fail=0

if [ ! -f "$GLB" ]; then echo "FAIL: $GLB missing"; exit 1; fi

bytes=$(stat -c%s "$GLB")
if [ "$bytes" -gt 1600000 ]; then
  echo "FAIL: $GLB is $bytes bytes, over the 1,600,000 budget"; fail=1
else
  echo "PASS: size $bytes bytes"
fi

info=$(npx --yes @gltf-transform/cli inspect "$GLB" 2>&1 | sed 's/\x1b\[[0-9;]*m//g')

echo "$info" | grep -q "150,000" \
  && echo "PASS: 150,000 glPrimitives preserved" \
  || { echo "FAIL: triangle count is not 150,000 (model was decimated or swapped)"; fail=1; }

echo "$info" | grep -q "2048x2048" \
  && echo "PASS: 2048x2048 texture preserved" \
  || { echo "FAIL: texture is not 2048x2048"; fail=1; }

echo "$info" | grep -q "image/webp" \
  && echo "PASS: texture is WebP" \
  || { echo "FAIL: texture is not WebP"; fail=1; }

echo "$info" | grep -q "EXT_meshopt_compression" \
  && echo "PASS: meshopt compression applied" \
  || { echo "FAIL: EXT_meshopt_compression missing"; fail=1; }

[ -f "singlet-assets/singlet-mobile.glb" ] \
  && { echo "FAIL: singlet-mobile.glb should have been deleted"; fail=1; } \
  || echo "PASS: singlet-mobile.glb removed"

exit $fail
```

- [ ] **Step 2: Run it to verify it fails**

Run from the repo root:

```bash
bash "$SCRATCH/check-glb.sh"
```

Expected: FAIL. The current `singlet.glb` is the 1.6 MB photogrammetry scan at 125,000 tris, so the triangle-count and texture assertions fail, and `singlet-mobile.glb` still exists.

- [ ] **Step 3: Build the asset**

Run from the repo root. Two stages, because the WebP encode must happen before quantization:

```bash
SRC="/c/Users/Shadman Kaiser/Desktop/SRC Website 2/saints_floating_object_app_optimized.glb"

# Guard: refuse to proceed if the source is not the file the spec pins.
echo "d45da0cd9cdeca882f2f7208993722a7 *$SRC" | md5sum -c - || exit 1

npx --yes @gltf-transform/cli webp "$SRC" "$SCRATCH/a_webp.glb" \
  --slots baseColorTexture --quality 82

npx --yes @gltf-transform/cli meshopt "$SCRATCH/a_webp.glb" singlet-assets/singlet.glb \
  --level medium

rm -f singlet-assets/singlet-mobile.glb
```

Expected console output from the two transform steps:

```
info: saints_floating_object_app_optimized.glb (7.51 MB) → a_webp.glb (4.91 MB)
info: a_webp.glb (4.91 MB) → singlet.glb (1.27 MB)
```

- [ ] **Step 4: Run the check to verify it passes**

```bash
bash "$SCRATCH/check-glb.sh"
```

Expected: every line `PASS`, exit 0.

- [ ] **Step 5: Rewrite the asset README**

Replace the entire contents of `singlet-assets/README.md` with:

```markdown
# Race Day Singlet — web 3D asset

`singlet.glb` is a compressed derivative of the client's model. It is not a
different model, and it must never be replaced by one.

**Source of truth** (kept outside the repo, 7.5 MB is too heavy to version):

```
saints_floating_object_app_optimized.glb
md5 d45da0cd9cdeca882f2f7208993722a7
7,509,168 bytes
```

That file is byte-identical to `assets/singlet.glb` in the
`Saints Run Club Merchandise Setup` design handoff. They are the same object.

## What ships

| File | Size | Notes |
|---|---|---|
| `singlet.glb` | 1.27 MB | 150,000 tris, 2048x2048 WebP baseColor. Serves every device. |
| `singlet-viewer.js` | 11 KB | Turntable custom element. |
| `preview.html` | 2 KB | Local harness. Serve this folder over HTTP and scroll. |

Extensions used: `EXT_meshopt_compression`, `EXT_texture_webp`,
`KHR_mesh_quantization`, `KHR_materials_unlit`. three.js supports all four
natively; only meshopt needs a decoder, which `singlet-viewer.js` registers.

## Rebuilding

Requires `@gltf-transform/cli` (via `npx`, no install needed).

```bash
gltf-transform webp    saints_floating_object_app_optimized.glb a.glb \
                       --slots baseColorTexture --quality 82
gltf-transform meshopt a.glb singlet.glb --level medium
```

Measured at each stage:

| Stage | Size |
|---|---|
| Source | 7,509,168 B |
| After WebP texture | 4,908,200 B |
| After meshopt | 1,271,000 B |

83% smaller. The texture does the heavy lifting: 2.72 MB PNG becomes 122 KB
WebP at the same 2048x2048. Meshopt then quantizes positions to `i16_norm` and
UVs to `u16_norm`. **No decimation happens.** All 150,000 triangles survive, so
this is the client's geometry exactly.

## Two things deliberately not done

**Draco.** WebP + Draco reaches 472 KB, but costs a ~200 KB decoder download
and materially slower CPU decode. Meshopt's decoder is ~5 KB and decodes
near-instantly. On mid-range phones the constraint is CPU, not bandwidth, so
meshopt wins. Swap only if you re-measure and disagree.

**KTX2 / Basis.** The WebP texture still decodes to roughly 22 MB of VRAM, and
KTX2 would cut that to about 5.6 MB. ETC1S is visibly lossy on a baked color
map, and 22 MB is fine on any phone from the last six years, so fidelity wins.

## Source characteristics worth knowing

- No `NORMAL` attribute: positions and UVs only. The viewer calls
  `computeVertexNormals()` on load, or `MeshStandardMaterial` would shade
  against a normal that does not exist.
- Declares `KHR_materials_unlit`, which three.js instantiates as
  `MeshBasicMaterial`. Unlit, it is unreadable against the `#0A0A0A` page, so
  the viewer swaps in a lit material that keeps the baked map.
- Near planar: bounds are roughly `[1.417, 1.904, 0.156]`, so depth is about 8%
  of height. This is why the viewer warps its rotation rate instead of turning
  at a constant speed. See `singlet-viewer.js`.
```

- [ ] **Step 6: Commit**

```bash
git add singlet-assets/singlet.glb singlet-assets/README.md
git rm --cached singlet-assets/singlet-mobile.glb 2>/dev/null || true
git add -u singlet-assets
git commit -m "Use the client GLB, compressed, as the only 3D asset

singlet.glb was a 1.6 MB photogrammetry scan substituted when an earlier
handoff shipped an untextured placeholder. The updated handoff ships a
properly textured model, so that substitution is obsolete.

Rebuilds from saints_floating_object_app_optimized.glb (md5 d45da0cd...)
with a WebP baseColor encode and meshopt: 7.51 MB to 1.27 MB, 83% smaller,
with all 150,000 triangles and the 2048x2048 texture intact. No decimation,
so this is the client's geometry exactly.

Deletes singlet-mobile.glb: one 1.27 MB asset serves every device, and a
second variant only drifts out of sync.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Merge the viewer

Restores the drag and the warped turntable that a prior session dropped, keeps the decoder and rAF work that session added, and adds the offscreen pause.

**Files:**
- Rewrite: `singlet-assets/singlet-viewer.js`
- Test: `$SCRATCH/check-viewer.mjs`

**Interfaces:**
- Consumes: `singlet-assets/singlet.glb` from Task 1.
- Produces: custom element `<singlet-viewer src="..." color="..." progress-target="...">`. Sets the attribute `data-ready` on itself once the GLB has loaded, and `data-touched` on first drag. Task 3's CSS relies on `singlet-viewer:not([data-ready]) { opacity: 0 }` already present in `preorder.html`.

- [ ] **Step 1: Write the failing check**

Create `$SCRATCH/check-viewer.mjs`:

```js
// Verifies the viewer against the four behaviours that regressed or are new:
// it loads the meshopt GLB, renders something, drag changes rotation, and the
// rAF loop stops when the hero scrolls away.
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8123/preorder.html';
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'load' });

// 1. The GLB loads. data-ready is only set after loadAsync resolves, so this
//    failing means the meshopt decoder is missing or the file is unreadable.
let ready = true;
await page.waitForSelector('singlet-viewer[data-ready]', { timeout: 30000 })
  .catch(() => { ready = false; });
check(ready, 'GLB loaded (data-ready set within 30s)');

// 2. Something is actually drawn. A black canvas means the material swap did
//    not happen and the unlit material is rendering invisible on ink.
await page.waitForTimeout(1200);
const lit = await page.evaluate(() => {
  const cv = document.querySelector('singlet-viewer canvas');
  if (!cv) return { ok: false, reason: 'no canvas' };
  const g = cv.getContext('webgl2') || cv.getContext('webgl');
  if (!g) return { ok: false, reason: 'no webgl context' };
  const w = cv.width, h = cv.height;
  const px = new Uint8Array(w * h * 4);
  g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px);
  let bright = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] + px[i + 1] + px[i + 2] > 90) bright++;
  }
  return { ok: bright > 500, bright };
});
check(lit.ok, `model renders lit pixels (${lit.bright ?? lit.reason})`);

// 3. Drag rotates. Reads the pivot through the element instance.
const before = await page.evaluate(() => document.querySelector('singlet-viewer')._pivot.rotation.y);
const box = await page.locator('singlet-viewer canvas').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 12 });
await page.mouse.up();
const after = await page.evaluate(() => document.querySelector('singlet-viewer')._userY);
check(Math.abs(after) > 0.05, `drag accumulates _userY (${after.toFixed(3)})`);
// The offset must actually reach the pivot, not just sit in a field.
await page.waitForTimeout(120);
const rotAfter = await page.evaluate(() => document.querySelector('singlet-viewer')._pivot.rotation.y);
check(Number.isFinite(before) && Number.isFinite(rotAfter) && rotAfter !== before,
  `drag moved pivot.rotation.y (${before.toFixed(3)} -> ${rotAfter.toFixed(3)})`);

// 4. The loop stops when the hero is offscreen.
await page.evaluate(() => document.getElementById('preorder').scrollIntoView());
await page.waitForTimeout(700);
const paused = await page.evaluate(() => {
  const v = document.querySelector('singlet-viewer');
  return { visible: v._visible, raf: v._raf };
});
check(paused.visible === false && !paused.raf, `rAF paused offscreen (visible=${paused.visible}, raf=${paused.raf})`);

// 5. Vertical swipe must not be claimed by the canvas on touch.
const touchAction = await page.evaluate(() =>
  getComputedStyle(document.querySelector('singlet-viewer canvas')).touchAction);
check(touchAction === 'pan-y', `canvas touch-action is pan-y (${touchAction})`);

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ') || 'none'})`);

await browser.close();
process.exit(failed);
```

- [ ] **Step 2: Run it to verify it fails**

In one shell, from the repo root:

```bash
python -m http.server 8123
```

In another, from the repo root:

```bash
npx --yes playwright@1.62.1 --version >/dev/null 2>&1
node "$SCRATCH/check-viewer.mjs"
```

Expected: FAIL on `drag accumulates _userY` (the current viewer has no drag binding at all, so `_userY` is `undefined` and the expression throws or fails), FAIL on `rAF paused offscreen` (`_visible` is `undefined`), and FAIL on `canvas touch-action is pan-y` (currently unset).

If `node` cannot resolve `playwright`, install it once into the scratchpad: `npm --prefix "$SCRATCH" install playwright@1.62.1` and run with `NODE_PATH="$SCRATCH/node_modules" node "$SCRATCH/check-viewer.mjs"`.

- [ ] **Step 3: Write the merged viewer**

Replace the entire contents of `singlet-assets/singlet-viewer.js` with:

```js
// <singlet-viewer src="...">: continuous turntable with drag, locked camera.
(function () {
  const IMPORTMAP = {
    imports: {
      three: 'https://unpkg.com/three@0.184.0/build/three.module.js',
      'three/addons/loaders/GLTFLoader.js': 'https://unpkg.com/three@0.184.0/examples/jsm/loaders/GLTFLoader.js',
      'three/addons/libs/meshopt_decoder.module.js': 'https://unpkg.com/three@0.184.0/examples/jsm/libs/meshopt_decoder.module.js'
    }
  };
  if (!document.querySelector('script[type="importmap"]')) {
    const s = document.createElement('script');
    s.type = 'importmap';
    s.textContent = JSON.stringify(IMPORTMAP);
    document.head.prepend(s);
  }

  const okColor = (v) =>
    (typeof v === 'string' && !v.includes('{{') && /^(#|rgb|hsl|[a-z]{3,})/i.test(v.trim())) ? v.trim() : null;

  class SingletViewer extends HTMLElement {
    static get observedAttributes() { return ['color']; }

    attributeChangedCallback(n, o, v) {
      // Only meaningful for meshes with no baked map. The shipped asset is
      // fully textured, so `color` is a no-op on it. See _boot.
      const c = okColor(v);
      if (n === 'color' && c && this._mat && this._THREE) this._mat.color.set(new this._THREE.Color(c));
    }

    connectedCallback() {
      this.style.display = 'block';
      this.style.position = 'relative';
      // A framework runtime may detach and reattach this element during mount.
      // Boot once, but restart the loop and observers on EVERY connect: an
      // `if (booted) return` guard here kills the loop forever.
      if (!this._booted) { this._booted = true; this._boot(); }
      else this._start();
    }

    disconnectedCallback() { this._stop(); }

    _start() {
      if (!this._renderer || this._running) return;
      this._running = true;
      if (this.parentElement && this._canvas && this._canvas.parentElement !== this) this.appendChild(this._canvas);
      this._pEl = undefined;
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);

      // Battery on mobile: a 150k-tri scene has no business rendering while
      // the hero is scrolled away and the reader is filling in the form below.
      this._visible = true;
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver((entries) => {
          // Newest entry, not entries[0]. A delivery flushes every queued
          // entry for the target, so a fast scroll past and back batches a
          // false and a true together; taking the oldest latches _visible
          // false while the element is on screen and freezes the loop.
          const e = entries[entries.length - 1];
          this._visible = e.isIntersecting;
          if (this._visible) this._loop();
          else if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
        }, { threshold: 0 });
        this._io.observe(this);
      }

      this._resize();
      this._measure();
      if (!Number.isFinite(this._cur)) this._cur = this._target;
      this._loop();
    }

    _stop() {
      this._running = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._io) { this._io.disconnect(); this._io = null; }
    }

    _loop() {
      if (this._raf || !this._running || !this._visible) return;
      const tick = () => {
        this._raf = 0;
        if (!this._running || !this._visible) return;
        // Measured inside the frame rather than from a scroll listener. The
        // listener version ran this same rect read outside rAF on every scroll
        // event, which is a forced-layout risk.
        this._measure();
        if (!Number.isFinite(this._cur)) this._cur = 0;
        // Reduced motion drops the autonomous turntable and the bob. Drag still
        // works: that is direct manipulation, not motion inflicted on a reader.
        const quiet = this._calm.matches;
        this._cur += (this._target - this._cur) * (quiet ? 1 : 0.09);
        const c = this._cur;
        if (!this._dragging) {
          // Inertia after a flick, then ease the offset back toward the idle
          // float so the piece never parks edge-on.
          this._userY += this._velY;
          this._userX = Math.max(-0.55, Math.min(0.55, this._userX + this._velX));
          this._velY *= 0.94; this._velX *= 0.94;
          if (Math.abs(this._velY) < 0.0004) this._velY = 0;
          if (Math.abs(this._velX) < 0.0004) this._velX = 0;
          if (!this._velY && !this._velX) { this._userY *= 0.985; this._userX *= 0.97; }
        }
        const t = performance.now() * 0.001;
        if (!quiet) this._spin += 0.0042;
        // The mesh is near planar (depth is about 8% of height), so a linear
        // turn parks it edge-on and invisible for seconds twice per revolution.
        // Warping theta to theta - k*sin(2*theta) keeps a true 360 degree
        // revolution but dwells on the faces and sweeps about 1.7x faster
        // through the edge-on quadrants. Do not simplify this to a constant
        // rate: the object disappears if you do.
        const sp = this._spin;
        this._pivot.rotation.y = sp - 0.35 * Math.sin(2 * sp) + this._userY;
        this._pivot.rotation.x = 0.11 + (quiet ? 0 : Math.sin(t * 0.23) * 0.03) + this._userX;
        this._pivot.position.y = (0.5 - c) * this._size.y * 0.14 +
          (quiet ? 0 : Math.sin(t * 0.42) * this._size.y * 0.012);
        this._renderer.render(this._scene, this._camera);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    async _boot() {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      const cv = renderer.domElement;
      cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab';
      this.appendChild(cv);
      this._canvas = cv;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);

      scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1a1a, 1.1));
      const key = new THREE.DirectionalLight(0xfff4e0, 2.6); key.position.set(2.2, 3.2, 2.6); scene.add(key);
      const fill = new THREE.DirectionalLight(0xbfd4ff, 0.9); fill.position.set(-3, 1.2, 1.5); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffc30b, 1.9); rim.position.set(-1.4, 1.6, -3.2); scene.add(rim);

      const pivot = new THREE.Group();
      scene.add(pivot);

      // The shipped GLB is meshopt-compressed (EXT_meshopt_compression).
      // Without the decoder GLTFLoader throws on load.
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(this.getAttribute('src'));
      const obj = gltf.scene;

      let mat = null;
      obj.traverse((m) => {
        if (!m.isMesh) return;
        // The source carries POSITION and TEXCOORD_0 only. MeshStandardMaterial
        // would shade against a normal the geometry does not have, so derive
        // them once, here.
        if (m.geometry && !m.geometry.getAttribute('normal')) m.geometry.computeVertexNormals();
        const src = m.material;
        // The GLB declares KHR_materials_unlit, which three.js instantiates as
        // MeshBasicMaterial: unlit, and unreadable against the ink page. Swap
        // in a lit material that keeps the baked map. Gate on the presence of a
        // map rather than on material type, so an ordinary textured GLB gets
        // the same treatment. Gating on "has a map, keep its material" instead
        // is what left this asset rendering flat.
        if (src && src.map) {
          if (src.map.colorSpace !== undefined) src.map.colorSpace = THREE.SRGBColorSpace;
          m.material = new THREE.MeshStandardMaterial({
            map: src.map, roughness: 0.62, metalness: 0.06,
            side: THREE.DoubleSide, emissiveMap: src.map,
            emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.34
          });
          this._textured = true;
          return;
        }
        if (!mat) {
          mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(okColor(this.getAttribute('color')) || '#e9e3d6'),
            roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide
          });
        }
        m.material = mat;
      });

      const box = new THREE.Box3().setFromObject(obj);
      obj.position.sub(box.getCenter(new THREE.Vector3()));
      pivot.add(obj);

      this._THREE = THREE; this._mat = mat; this._renderer = renderer;
      this._scene = scene; this._camera = camera; this._pivot = pivot;
      this._size = box.getSize(new THREE.Vector3());
      this._cur = undefined; this._target = 0; this._spin = 0;
      this._userY = 0; this._userX = 0; this._velY = 0; this._velX = 0; this._dragging = false;
      this._calm = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._bindDrag(cv);

      const late = okColor(this.getAttribute('color'));
      if (late && mat) mat.color.set(new THREE.Color(late));

      this.setAttribute('data-ready', '');
      if (this.isConnected) this._start();
    }

    _bindDrag(cv) {
      let px = 0, py = 0, id = null;
      cv.addEventListener('pointerdown', (e) => {
        id = e.pointerId; px = e.clientX; py = e.clientY;
        this._dragging = true; this._velY = 0; this._velX = 0;
        cv.setPointerCapture(id); cv.style.cursor = 'grabbing';
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this._dragging || e.pointerId !== id) return;
        const dx = e.clientX - px;
        // touch-action:pan-y leaves vertical swipes to the page, so touch drags
        // only claim the horizontal axis. Mouse and pen still get tilt.
        const dy = e.pointerType === 'touch' ? 0 : e.clientY - py;
        px = e.clientX; py = e.clientY;
        this._velY = dx * 0.0075;
        this._velX = dy * 0.0045;
        this._userY += this._velY;
        this._userX = Math.max(-0.55, Math.min(0.55, this._userX + this._velX));
        this.setAttribute('data-touched', '');
      });
      const end = () => {
        if (!this._dragging) return;
        this._dragging = false; cv.style.cursor = 'grab';
        if (id !== null && cv.hasPointerCapture(id)) cv.releasePointerCapture(id);
        id = null;
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('lostpointercapture', end);
    }

    _progressEl() {
      if (this._pEl !== undefined) return this._pEl;
      const sel = this.getAttribute('progress-target');
      if (sel) { this._pEl = document.querySelector(sel); return this._pEl; }
      let n = this.parentElement;
      while (n && n !== document.body) {
        if (getComputedStyle(n).position === 'sticky') { this._pEl = n.parentElement; return this._pEl; }
        n = n.parentElement;
      }
      this._pEl = null;
      return null;
    }

    _measure() {
      // This element is pinned inside a sticky stage, so its own rect never
      // moves. Progress comes from the tall scroll wrapper around it.
      const vh = window.innerHeight;
      const el = this._progressEl();
      let p = 0;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = r.height - vh;
        p = span > 8 ? -r.top / span : 0;
      } else {
        const r = this.getBoundingClientRect();
        const span = vh + r.height;
        if (span > 8) p = (vh - r.top) / span;
      }
      // A pre-layout measure yields 0/0 = NaN, which permanently poisons the
      // eased value, so guard before storing.
      this._target = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
    }

    _resize() {
      if (!this._renderer) return;
      const w = this.clientWidth || 1, h = this.clientHeight || 1;
      this._renderer.setSize(w, h, false);
      const aspect = w / h;
      const cam = this._camera;
      cam.aspect = aspect;
      const s = this._size;
      const t = Math.tan((cam.fov * Math.PI / 180) / 2);
      const distV = (s.y / 2) / t;
      const distH = (Math.max(s.x, s.z) / 2) / (t * aspect);
      cam.position.set(0, 0.02, Math.max(distV, distH) * 1.2 + s.z);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
    }
  }

  if (!customElements.get('singlet-viewer')) customElements.define('singlet-viewer', SingletViewer);
})();
```

- [ ] **Step 4: Run the check to verify it passes**

```bash
node --check singlet-assets/singlet-viewer.js && echo "syntax ok"
node "$SCRATCH/check-viewer.mjs"
```

Expected: `syntax ok`, then every line `PASS`, exit 0.

If `model renders lit pixels` fails with a low `bright` count, the material swap did not take. Confirm the `if (src && src.map)` branch is being entered by temporarily logging `m.material.type` before the swap: it should read `MeshBasicMaterial`.

- [ ] **Step 5: Confirm no scroll listeners were reintroduced**

```bash
grep -n "addEventListener('scroll'\|addEventListener(\"scroll\"" singlet-assets/singlet-viewer.js && echo "FAIL: scroll listener present" || echo "PASS: no scroll listeners"
grep -c "—" singlet-assets/singlet-viewer.js
```

Expected: `PASS: no scroll listeners`, and an em-dash count of `0`.

- [ ] **Step 6: Commit**

```bash
git add singlet-assets/singlet-viewer.js
git commit -m "Restore drag and the warped turntable in the viewer

A prior session replaced the idle turntable with scroll-linked rotation
and dropped the pointer drag entirely, while the hero kept advertising
DRAG TO ROTATE. This restores both from the design handoff and keeps the
work that session added: the Meshopt decoder registration, and _measure()
batched inside the rAF tick instead of a scroll listener.

The rotation warp matters and is not decoration. The mesh is near planar,
so a constant rate parks it edge-on and invisible for seconds twice per
revolution.

Also: computes vertex normals on load, because the source carries only
POSITION and TEXCOORD_0 and MeshStandardMaterial has nothing to shade
against otherwise; gates the material swap on the presence of a map so
the unlit GLB stops rendering flat; and pauses the rAF loop via
IntersectionObserver once the hero scrolls away, so a 150k-tri scene is
not burning phone battery while someone fills in the form.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Update the page

Corrects the config, adds spam and deadline protection, and makes the unwired state honest.

**Files:**
- Modify: `preorder.html`
- Test: `$SCRATCH/check-page.mjs`

**Interfaces:**
- Consumes: `singlet-assets/singlet.glb` (Task 1), `<singlet-viewer>` (Task 2).
- Produces: new element ids `hero-cta` (the hero CTA anchor), `receipt-body` (the receipt paragraph), `f-company` (honeypot input). New CSS class `.hp`. New JS functions `isClosed()` and `applyClosed()`.

- [ ] **Step 1: Write the failing check**

Create `$SCRATCH/check-page.mjs`:

```js
// Verifies config, the honeypot, the hard close, and the unwired receipt copy.
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8123/preorder.html';
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = 1;
};

const browser = await chromium.launch();

// --- config and unwired receipt -------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });

  check((await page.textContent('#hero-price')).trim() === '$50', 'hero price is $50');
  check((await page.textContent('#closes-on')).trim() === 'Fri, Sept 4 · 9AM', 'closes label is Fri, Sept 4 · 9AM');
  check((await page.textContent('#zelle-handle')).trim() === 'saintsvisionllc@gmail.com', 'zelle handle is the email');

  // Honeypot must exist, be off-screen, and be skipped by tabbing.
  // Measure the .hp WRAPPER, not the input. An element's own
  // getBoundingClientRect() reports its natural layout box regardless of an
  // ancestor's clipping, so the input reads ~177px wide even when hidden.
  const hp = await page.evaluate(() => {
    const el = document.getElementById('f-company');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const wrap = el.closest('.hp');
    const wcs = getComputedStyle(wrap);
    const box = wrap.getBoundingClientRect();
    return {
      tab: el.tabIndex, ac: el.autocomplete, display: cs.display,
      r: box.width, h: box.height, ov: wcs.overflow
    };
  });
  check(hp !== null, 'honeypot #f-company exists');
  check(hp && hp.tab === -1, 'honeypot is tabindex -1');
  check(hp && hp.ac === 'off', 'honeypot has autocomplete off');
  check(hp && hp.display !== 'none', 'honeypot is not display:none (bots skip those)');
  check(hp && hp.r <= 2 && hp.h <= 2, `honeypot wrapper is collapsed (${hp && hp.r}x${hp && hp.h})`);
  // width:1px with overflow:visible would still render the input in plain
  // sight, so the clip is the assertion that actually matters.
  check(hp && hp.ov === 'hidden', `honeypot wrapper clips its overflow (${hp && hp.ov})`);

  // A valid submission with no endpoint must make NO network request and must
  // not claim the order was recorded.
  let posted = 0;
  page.on('request', (r) => { if (r.method() === 'POST') posted++; });

  await page.click('#sizes button >> nth=2');
  await page.fill('#f-name', 'Test Runner');
  await page.fill('#f-email', 'test@example.com');
  await page.click('#submit');
  await page.waitForSelector('#receipt:not([hidden])', { timeout: 5000 });
  await page.waitForTimeout(400);

  check(posted === 0, `no POST issued when endpoint is empty (${posted})`);
  const body = (await page.textContent('#receipt-body')).trim();
  check(/isn't logged automatically yet/.test(body), 'receipt says the order is not logged automatically');
  check(/DM @svintsrunclub/.test(body), 'receipt gives a way to confirm');
  check(!/We'll confirm your Zelle payment and email you/.test(body), 'receipt does NOT use the wired copy');
  await page.close();
}

// --- honeypot rejection ----------------------------------------------------
{
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.click('#sizes button >> nth=0');
  await page.fill('#f-name', 'Bot');
  await page.fill('#f-email', 'bot@example.com');
  await page.evaluate(() => { document.getElementById('f-company').value = 'Acme Corp'; });
  await page.click('#submit');
  await page.waitForTimeout(600);
  const shown = await page.isVisible('#receipt');
  check(shown, 'honeypot submission still shows a receipt (gives a bot no signal)');
  await page.close();
}

// --- validation ------------------------------------------------------------
{
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.click('#submit');
  check((await page.textContent('#note')).includes('Pick a size first.'), 'validation: no size');
  await page.click('#sizes button >> nth=1');
  await page.click('#submit');
  check((await page.textContent('#note')).includes('We need your name'), 'validation: no name');
  await page.fill('#f-name', 'Runner');
  await page.fill('#f-email', 'nope');
  await page.click('#submit');
  check((await page.textContent('#note')).includes('That email looks off.'), 'validation: bad email');
  await page.fill('#f-email', 'a');
  check(!(await page.textContent('#note')).includes('looks off'), 'validation: typing clears the error');
  await page.close();
}

// --- hard close ------------------------------------------------------------
{
  const page = await browser.newPage();
  // Freeze the clock a day past the deadline before any page script runs.
  await page.addInitScript(() => {
    const fixed = new Date('2026-09-05T12:00:00-04:00').getTime();
    const RealDate = Date;
    Date.now = () => fixed;
    globalThis.Date = class extends RealDate {
      constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(fixed); }
      static now() { return fixed; }
    };
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  check((await page.textContent('#countdown')).trim() === 'Closed', 'countdown reads Closed');
  check(await page.isDisabled('#submit'), 'submit is disabled past the deadline');
  check(await page.isDisabled('#f-name'), 'name input is disabled past the deadline');
  const cta = await page.evaluate(() => {
    const a = document.getElementById('hero-cta');
    return { text: a.textContent.trim(), href: a.getAttribute('href') };
  });
  check(/closed/i.test(cta.text), `hero CTA reads closed (${cta.text})`);
  check(cta.href === null, 'hero CTA no longer links to #preorder');
  await page.close();
}

await browser.close();
process.exit(failed);
```

- [ ] **Step 2: Run it to verify it fails**

With `python -m http.server 8123` running from the repo root:

```bash
node "$SCRATCH/check-page.mjs"
```

Expected: FAIL on the price (`$45`), the closes label (`Sat, Sept 5`), the zelle handle (`Saints Vision LLC`), every honeypot assertion (`#f-company` does not exist), the receipt copy assertions (it currently uses the wired copy), and every hard-close assertion.

- [ ] **Step 3: Update CONFIG**

In `preorder.html`, replace:

```javascript
  var CONFIG = {
    endpoint:    '',                                  // Google Apps Script /exec URL
    price:       45,
    sizes:       ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    maxQty:      6,
    zelleUrl:    'https://www.zellepay.com/',
    zelleHandle: 'Saints Vision LLC',
    closesOn:    'Sat, Sept 5',
    closesAt:    '2026-09-05T23:59:00-04:00',
```

with:

```javascript
  var CONFIG = {
    // Empty on purpose. This one value decides both whether a submission is
    // POSTed anywhere and what the receipt tells the buyer. See PREORDER-SETUP.md.
    endpoint:    '',
    price:       50,
    sizes:       ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    maxQty:      6,
    zelleUrl:    'https://www.zellepay.com/',
    zelleHandle: 'saintsvisionllc@gmail.com',
    closesOn:    'Fri, Sept 4 · 9AM',
    closesAt:    '2026-09-04T09:00:00-04:00',
```

- [ ] **Step 4: Add the hero CTA id**

Replace:

```html
          <a class="btn btn-gold" href="#preorder">Reserve yours →</a>
```

with:

```html
          <a class="btn btn-gold" id="hero-cta" href="#preorder">Reserve yours →</a>
```

- [ ] **Step 5: Add the honeypot styles**

Find the `.note` rule block in the `<style>` section and insert this rule immediately before it:

```css
  /* Honeypot. Deliberately not display:none: bots skip those, and skipping is
     the whole point of the field. Off-screen and untabbable instead. */
  .hp {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
```

- [ ] **Step 6: Add the honeypot field**

Replace:

```html
          <button type="submit" class="btn btn-gold submit" id="submit" data-sending="false">Add me to the list</button>
```

with:

```html
          <div class="hp" aria-hidden="true">
            <label for="f-company">Company</label>
            <input id="f-company" name="company" type="text" tabindex="-1" autocomplete="off">
          </div>
          <button type="submit" class="btn btn-gold submit" id="submit" data-sending="false">Add me to the list</button>
```

- [ ] **Step 7: Give the receipt paragraph an id**

Replace:

```html
      <p>We'll confirm your Zelle payment and email you when pickup opens. <span id="receipt-pickup"></span></p>
```

with:

```html
      <p id="receipt-body"></p>
```

- [ ] **Step 8: Drive the receipt copy from the endpoint**

Replace:

```javascript
  $('spec-pickup').textContent = CONFIG.pickup;
  $('receipt-pickup').textContent = CONFIG.pickup;
```

with:

```javascript
  $('spec-pickup').textContent = CONFIG.pickup;

  // With no endpoint the page must never tell a buyer they are on a list that
  // does not exist. Same condition gates the network call below, so there is
  // one source of truth and no flag to keep in sync.
  $('receipt-body').textContent = CONFIG.endpoint
    ? "We'll confirm your Zelle payment and email you when pickup opens. " + CONFIG.pickup
    : "Your order isn't logged automatically yet. Send your Zelle with your full name and size in the memo, then DM @svintsrunclub to confirm. " + CONFIG.pickup;
```

- [ ] **Step 9: Add the hard close**

Replace:

```javascript
  tickCountdown();
  setInterval(tickCountdown, 1000);
```

with:

```javascript
  // ---- hard close ----
  // The countdown reaching zero used to change nothing but a label, so the form
  // kept taking orders after the deadline. Re-checked on every tick as well as
  // at load, so a page left open past 9AM closes itself.
  var ctaEl = $('hero-cta');
  function isClosed() { return Date.now() >= closeAt; }
  function applyClosed() {
    if (!isClosed() || formEl.dataset.closed === 'true') return;
    formEl.dataset.closed = 'true';
    Array.prototype.forEach.call(
      formEl.querySelectorAll('button, input'),
      function (el) { el.disabled = true; }
    );
    submitEl.textContent = 'Preorder closed';
    noteEl.textContent = 'Preorder closed ' + CONFIG.closesOn + '. DM us on Instagram if you missed it.';
    noteEl.removeAttribute('data-error');
    if (ctaEl) {
      ctaEl.textContent = 'Preorder closed';
      ctaEl.removeAttribute('href');
      ctaEl.setAttribute('aria-disabled', 'true');
    }
  }

  tickCountdown();
  setInterval(function () { tickCountdown(); applyClosed(); }, 1000);
```

Then move the countdown block so it runs **after** the `formEl` / `submitEl` / `noteEl` declarations. Cut the whole `// ---- countdown ----` block (from `var closeAt = ...` through the `setInterval(...)` line above) and paste it immediately after this existing line:

```javascript
  var DEFAULT_NOTE = 'Submit once you have sent the Zelle. We match by name + amount.';
```

Then add `applyClosed();` on the line directly after the pasted block, so the page loads closed if the deadline has already passed.

- [ ] **Step 10: Reject the honeypot and guard the deadline on submit**

Replace:

```javascript
  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.sending) return;

    if (!state.size) return setError('Pick a size first.');
```

with:

```javascript
  var hpEl = $('f-company');

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.sending) return;
    if (isClosed()) { applyClosed(); return; }

    if (!state.size) return setError('Pick a size first.');
```

Then replace:

```javascript
    // No endpoint means nothing is recorded anywhere. Useful for design
    // review, silently lossy in production, so make it audible.
    if (!CONFIG.endpoint) {
      console.warn('[preorder] CONFIG.endpoint is empty: this order was NOT recorded.');
      done();
      return;
    }
```

with:

```javascript
    // A filled honeypot means a bot. Show the ordinary receipt and send
    // nothing: a visible rejection would just teach the next pass to skip it.
    if (hpEl.value) { done(); return; }

    // No endpoint means nothing is recorded anywhere. The receipt copy already
    // says so (see receipt-body above); this is the audit trail for whoever is
    // watching devtools.
    if (!CONFIG.endpoint) {
      console.warn('[preorder] CONFIG.endpoint is empty: this order was NOT recorded. See PREORDER-SETUP.md.');
      done();
      return;
    }
```

- [ ] **Step 11: Clear the honeypot on reset**

Replace:

```javascript
    nameEl.value = emailEl.value = codeEl.value = '';
```

with:

```javascript
    nameEl.value = emailEl.value = codeEl.value = hpEl.value = '';
```

- [ ] **Step 12: Run the check to verify it passes**

```bash
node "$SCRATCH/check-page.mjs"
```

Expected: every line `PASS`, exit 0.

- [ ] **Step 13: Confirm the conventions still hold**

```bash
grep -c "—" preorder.html
grep -n "addEventListener('scroll'" preorder.html && echo "FAIL: scroll listener" || echo "PASS: no scroll listeners"
grep -nE "@media[^{]*\((min-width|max-width|min-device-width|orientation|aspect-ratio)" preorder.html && echo "FAIL: responsive media query" || echo "PASS: no responsive media queries"
grep -n "overflow-x: *hidden" preorder.html && echo "FAIL: kills position:sticky" || echo "PASS: no overflow-x hidden"
```

Expected: em-dash count `0`, and three `PASS` lines.

- [ ] **Step 14: Commit**

```bash
git add preorder.html
git commit -m "Set final config, and stop the page lying when it cannot record

Config now matches the handoff: \$50, closes Fri Sept 4 9AM ET, and the
Zelle SEND TO row shows the address rather than the display name.

The important change is the unwired path. CONFIG.endpoint ships empty by
decision, but the page still rendered the full YOU'RE ON THE LIST receipt,
so it told buyers they were recorded when nothing was written anywhere.
With the drop closing Friday that silently loses real orders. The receipt
copy is now driven by the same condition that gates the POST, so there is
one source of truth: unwired, it asks for the Zelle memo and an Instagram
DM instead.

Also closes the two gaps the handoff README flags as production risks: a
honeypot (off-screen rather than display:none, which bots skip), and a
real deadline. The countdown hitting zero previously changed a label and
nothing else, so the form kept taking orders after close.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Ship the backend, ready but not deployed

Produces everything needed to wire capture later in about five minutes, without deciding the route now.

**Files:**
- Create: `google-apps-script.gs`
- Create: `PREORDER-SETUP.md`

**Interfaces:**
- Consumes: the payload shape emitted by `preorder.html` (Task 3): `{ timestamp, name, email, size, quantity, total, zelleCode, company, item, source }`.
- Produces: no runtime interface. Documentation and a script to paste.

Note: Task 3's payload does not yet carry `company`. Add it in Step 1 below so the Apps Script can reject bots server-side too, not only in the browser.

- [ ] **Step 1: Send the honeypot value with the payload**

In `preorder.html`, replace:

```javascript
      zelleCode: codeEl.value.trim(),
      item: CONFIG.item,
```

with:

```javascript
      zelleCode: codeEl.value.trim(),
      company: hpEl.value,
      item: CONFIG.item,
```

- [ ] **Step 2: Write the Apps Script**

Create `google-apps-script.gs`:

```javascript
// ---------------------------------------------------------------------------
// SAINTS RUN CLUB - singlet preorder endpoint
// Paste into Extensions > Apps Script on your Google Sheet, then Deploy.
// Full walkthrough: PREORDER-SETUP.md in the site repo.
// ---------------------------------------------------------------------------

var SHEET_NAME   = 'Orders';
var NOTIFY_EMAIL = 'svintsrunclub@gmail.com';  // '' to disable the heads-up email
var CLOSES_AT    = '2026-09-04T09:00:00-04:00'; // must match CONFIG.closesAt

var HEADERS = [
  'Timestamp', 'Name', 'Email', 'Size', 'Quantity',
  'Total ($)', 'Zelle Code', 'Paid?', 'Item', 'Source'
];

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.clear();
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#0A0A0A').setFontColor('#FFC30B');
  sh.setFrozenRows(1);
  sh.getRange('H2:H').insertCheckboxes();
  sh.autoResizeColumns(1, HEADERS.length);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);

    // Honeypot. A real buyer never sees this field, so anything in it is a bot.
    // Return ok so the caller learns nothing from being rejected.
    if (d.company) return json({ ok: true });

    // The client clock is trivially wrong or spoofed, so the deadline is
    // enforced here too.
    if (new Date().getTime() >= new Date(CLOSES_AT).getTime()) {
      return json({ ok: false, error: 'closed' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    sh.appendRow([
      d.timestamp ? new Date(d.timestamp) : new Date(),
      d.name || '', d.email || '', d.size || '', d.quantity || 1,
      d.total || '', d.zelleCode || '', false,
      d.item || '', d.source || ''
    ]);
    sh.getRange(sh.getLastRow(), 8).insertCheckboxes();

    // Wrapped: a mail quota failure must never cost the row that was written.
    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(
          NOTIFY_EMAIL,
          'Singlet preorder - ' + (d.name || 'unknown'),
          [d.name, d.email, 'Size ' + d.size + ' x ' + d.quantity,
           '$' + d.total, 'Zelle code: ' + (d.zelleCode || '-')].join('\n')
        );
      } catch (mailErr) {}
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json({ ok: true, service: 'saints-preorder' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 3: Write the setup doc**

Create `PREORDER-SETUP.md`:

```markdown
# Preorder Page — Setup & Notes

The singlet preorder page lives at **`preorder.html`** and is reachable at
**`https://saintsrunclub.com/preorder`** (clean URL via `_redirects`).

## Current state: orders are NOT being recorded

`CONFIG.endpoint` in `preorder.html` is empty. That is deliberate, not an
oversight. Until you wire one of the two routes below:

- The form validates, and shows a receipt.
- **Nothing is written anywhere.** No sheet, no database, no email.
- The receipt says so. It reads *"Your order isn't logged automatically yet.
  Send your Zelle with your full name and size in the memo, then DM
  @svintsrunclub to confirm."* Buyers are told the truth, and the Zelle memo
  (full name plus size) carries enough to reconstruct the order by hand.
- `console.warn` fires on every submission, so it is visible in devtools.

Setting `CONFIG.endpoint` swaps the receipt back to the normal wording and
starts POSTing. One value controls both. There is no second flag.

---

## Route A — Google Apps Script

Pick this if you want the Google Sheet to be the live system of record. About
five minutes, all of it in a browser.

> **Do this while signed in to the SRC Google account.** Whoever is logged in
> when you create the sheet and deploy the script owns the sheet, the script,
> and the "From" address on the notification emails.

1. Signed in as **SRC**, go to **[sheets.new](https://sheets.new)** and name it
   **"SRC Singlet Preorders"**.
2. **Extensions → Apps Script**.
3. Delete the sample code and paste all of `google-apps-script.gs` from this
   repo.
4. **Run → setupSheet**, and authorize when prompted. This writes the formatted
   header row and turns column H into checkboxes.
5. **Deploy → New deployment**, gear icon → **Web app**.
6. **Execute as: Me**, **Who has access: Anyone**. This is what lets the page
   post anonymously; the script only appends a row and emails you.
7. **Deploy**, then authorize. Google asks for two permissions (manage
   spreadsheets, and send email as you) because the script also emails. If you
   see "Google hasn't verified this app", click **Advanced → Go to [project]
   (unsafe)**. That is normal for your own script.
8. Copy the **Web app URL** (`https://script.google.com/macros/s/AKfy.../exec`).
9. In `preorder.html`, set:

   ```javascript
   endpoint: 'https://script.google.com/macros/s/AKfy...../exec',
   ```

10. Commit and deploy the site.

Sheet columns: `Timestamp, Name, Email, Size, Quantity, Total ($), Zelle Code,
Paid?, Item, Source`. **Paid?** is a checkbox you tick by hand once you match
the Zelle transfer.

The script uses `LockService` (20s) so two people submitting at once cannot
interleave rows, rejects anything with the honeypot filled, and refuses posts
arriving after `CLOSES_AT`. Keep `CLOSES_AT` in the script matching
`CONFIG.closesAt` in the page.

> If you edit the script later, use **Deploy → Manage deployments → edit → New
> version**, or the URL changes and the page silently stops recording.

> Gmail sends about 100 emails/day on a free account, far more than this drop
> will produce. The sheet is the record; the email is a heads-up. The send is
> wrapped in try/catch, so if mail ever fails the row is still written.

---

## Route B — Supabase

Pick this if you want to skip the browser entirely. Needs no Google account and
no deployment step: the tables can be created directly from a Claude Code
session with the Supabase connection.

The site already depends on this project. `index.html` serves every one of its
images from `izcimioeuohdofzmnahu.supabase.co`, so this adds no new vendor.

**Schema and policy:**

```sql
create table public.singlet_preorders (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  size        text not null,
  quantity    int  not null default 1,
  total       numeric,
  zelle_code  text,
  paid        boolean not null default false,
  item        text,
  source      text
);

alter table public.singlet_preorders enable row level security;

-- Insert only. The publishable key sits in the page, so it must never be able
-- to read the table back: that would expose every buyer's email to anyone who
-- opened devtools.
create policy "anon can insert orders"
  on public.singlet_preorders for insert
  to anon with check (true);
```

**Deadline and honeypot, enforced where a client cannot reach:**

```sql
create function public.reject_late_or_bot() returns trigger as $$
begin
  if now() >= timestamptz '2026-09-04T09:00:00-04:00' then
    raise exception 'preorder closed';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger singlet_preorders_guard
  before insert on public.singlet_preorders
  for each row execute function public.reject_late_or_bot();
```

The honeypot is dropped client-side before the request is built, so it never
reaches the table.

**Page changes.** Route B needs a different request shape than Route A, because
there is a real response to read:

```javascript
endpoint: 'https://izcimioeuohdofzmnahu.supabase.co/rest/v1/singlet_preorders',
supabaseKey: 'PASTE_THE_PUBLISHABLE_ANON_KEY',
```

and the `fetch` becomes:

```javascript
fetch(CONFIG.endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': CONFIG.supabaseKey,
    'Authorization': 'Bearer ' + CONFIG.supabaseKey,
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify({
    name: payload.name, email: payload.email, size: payload.size,
    quantity: payload.quantity, total: payload.total,
    zelle_code: payload.zelleCode, item: payload.item, source: payload.source
  })
}).then(function (r) { return r.ok ? done() : failed(); }, failed);
```

This is strictly better than Route A on one point: `no-cors` makes the Apps
Script response opaque, so the page assumes success whenever the request does
not throw. Here a real status code is available, so a failed write actually
shows the buyer an error instead of a false receipt.

The Google Sheet then becomes a mirror rather than the live record. Populate it
whenever you want by asking Claude Code to read the table and write the rows.

---

## Whichever route you pick, test it

Submit one real order and confirm:

1. A row appears with the right size, quantity, and total.
2. The notification email arrives (Route A).
3. The receipt shows the normal wording, not the "not logged automatically" copy.

---

## Payments

Manual, no processor. Zelle to **Saints Vision LLC**
(`saintsvisionllc@gmail.com`), and buyers are told to put their full name plus
size in the memo. Match incoming payments to orders by name and amount.

## Editing content

Prices, sizes, dates, and handles are all in the `CONFIG` object near the top of
the `<script>` block in `preorder.html`. The countdown reads `CONFIG.closesAt`.
If you change that, change `CLOSES_AT` in `google-apps-script.gs` (Route A) or
the trigger function (Route B) to match, or the two will disagree about when the
drop closed.

## Files

- `preorder.html` — the page. Markup, styles, and logic, self-contained.
- `singlet-assets/` — the 3D asset, the viewer, product artwork, Zelle QR.
  See `singlet-assets/README.md` for how the GLB is built.
- `google-apps-script.gs` — Route A endpoint, ready to paste.
- `_redirects` — contains the `/preorder` rule.
```

- [ ] **Step 4: Verify the script parses and the page still passes**

```bash
node --check google-apps-script.gs && echo "gs syntax ok"
grep -c "—" google-apps-script.gs PREORDER-SETUP.md
node "$SCRATCH/check-page.mjs"
```

Expected: `gs syntax ok`, em-dash count `0` for `google-apps-script.gs` (the setup doc's prose em-dashes in headings are fine, but the count should be small and only in `Route A —` style headings), and every page check still `PASS`.

- [ ] **Step 5: Commit**

```bash
git add google-apps-script.gs PREORDER-SETUP.md preorder.html
git commit -m "Add the backend, ready to wire but not deployed

google-apps-script.gs is complete and pasteable: LockService so concurrent
submits cannot interleave rows, honeypot rejection, and a server-side
deadline check because a client clock is trivially spoofed. It notifies
svintsrunclub@gmail.com, the same inbox the RSVP page uses.

PREORDER-SETUP.md documents both routes so the choice stays open. Route A
mirrors RSVP-SETUP.md. Route B is Supabase, which needs no browser session
at all and runs on the project the site already serves its images from; it
also gets a real status code back instead of the opaque no-cors response
Route A forces, so a failed write can show an error rather than a false
receipt.

The page now sends the honeypot value so it can be rejected server-side
too, not only in the browser.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Whole-page verification

Confirms the things no single earlier task owns: the sticky pin, mobile touch behaviour, and that the model is actually the client's.

**Files:**
- Test: `$SCRATCH/check-e2e.mjs`
- No source files change unless this task finds a defect.

**Interfaces:**
- Consumes: everything from Tasks 1 through 4.
- Produces: screenshots at `$SCRATCH/shot-desktop.png` and `$SCRATCH/shot-mobile.png` for eyeballing.

- [ ] **Step 1: Write the check**

Create `$SCRATCH/check-e2e.mjs`:

```js
// Whole-page pass: sticky hero, mobile swipe, asset identity, entrance states.
import { chromium, devices } from 'playwright';

const URL = 'http://127.0.0.1:8123/preorder.html';
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = 1;
};

const browser = await chromium.launch();

// --- desktop ---------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('singlet-viewer[data-ready]', { timeout: 30000 });

  // The page must request the compressed asset and nothing heavier.
  const glb = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter((r) => r.name.endsWith('.glb'))
      .map((r) => ({ name: r.name.split('/').pop(), size: r.encodedBodySize })));
  check(glb.length === 1, `exactly one GLB requested (${glb.length})`);
  check(glb[0] && glb[0].name === 'singlet.glb', `it is singlet.glb (${glb[0] && glb[0].name})`);
  check(glb[0] && glb[0].size < 1600000, `under budget (${glb[0] && glb[0].size} bytes)`);

  // Sticky pin: the stage must stay put while the 280vh hero scrolls past.
  const stage = page.locator('.stage').first();
  const topA = (await stage.boundingBox()).y;
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(300);
  const topB = (await stage.boundingBox()).y;
  check(Math.abs(topA - topB) < 4, `hero stage stays pinned (${topA} then ${topB})`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  await page.screenshot({ path: process.env.SCRATCH + '/shot-desktop.png', fullPage: false });
  await page.close();
}

// --- mobile ----------------------------------------------------------------
{
  const page = await browser.newPage({ ...devices['iPhone 13'] });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('singlet-viewer[data-ready]', { timeout: 30000 });

  // A vertical swipe over the model must scroll the page, not spin the object.
  const box = await page.locator('singlet-viewer canvas').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const before = await page.evaluate(() => window.scrollY);
  await page.touchscreen.tap(cx, cy);
  await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    const mk = (type, ty) => new PointerEvent(type, {
      pointerId: 1, pointerType: 'touch', clientX: x, clientY: ty, bubbles: true
    });
    el.dispatchEvent(mk('pointerdown', y));
    el.dispatchEvent(mk('pointermove', y - 160));
    el.dispatchEvent(mk('pointerup', y - 160));
  }, [cx, cy]);
  const userX = await page.evaluate(() => document.querySelector('singlet-viewer')._userX);
  check(Math.abs(userX) < 0.001, `vertical touch drag does not tilt the model (_userX=${userX})`);

  // No horizontal overflow: the body must never scroll sideways on a phone.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `no horizontal overflow (${overflow}px)`);

  // Tap targets on the steppers.
  const dec = await page.locator('#qty-dec').boundingBox();
  check(dec.width >= 44 && dec.height >= 44, `stepper is >= 44x44 (${dec.width}x${dec.height})`);

  await page.evaluate(() => document.getElementById('preorder').scrollIntoView());
  await page.waitForTimeout(600);
  await page.screenshot({ path: process.env.SCRATCH + '/shot-mobile.png', fullPage: false });
  await page.close();
}

await browser.close();
process.exit(failed);
```

- [ ] **Step 2: Run it**

With `python -m http.server 8123` running from the repo root:

```bash
SCRATCH="$SCRATCH" node "$SCRATCH/check-e2e.mjs"
```

Expected: every line `PASS`, exit 0.

If `hero stage stays pinned` fails, an ancestor has `overflow-x: hidden`. Find it with:

```bash
grep -n "overflow-x" preorder.html
```

and change it to `clip`.

- [ ] **Step 3: Look at the screenshots**

Open `$SCRATCH/shot-desktop.png` and `$SCRATCH/shot-mobile.png`. Confirm by eye:

- The singlet is visible and readable against the near-black background, not a flat silhouette and not invisible.
- It sits in front of the `RACE DAY / SINGLET` headline, which is intentional.
- It is not edge-on and vanishingly thin. If it is, catch it a second later; if it is *always* edge-on, the rotation warp was dropped.
- On mobile, the three form panels have reflowed to one column with no empty bordered cell.

- [ ] **Step 4: Re-run the earlier checks together**

```bash
bash "$SCRATCH/check-glb.sh" && node "$SCRATCH/check-viewer.mjs" && node "$SCRATCH/check-page.mjs" && SCRATCH="$SCRATCH" node "$SCRATCH/check-e2e.mjs" && echo "ALL CHECKS PASS"
```

Expected: `ALL CHECKS PASS`.

- [ ] **Step 5: Confirm the diff touched only what it should**

```bash
git status --short
git diff --stat main...HEAD
```

Expected: `git status --short` still shows `M _redirects`, `M privacy.html`, `M terms.html` and the untracked entries as **unstaged and uncommitted**. The branch diff should list only: `docs/superpowers/plans/...`, `docs/superpowers/specs/...`, `google-apps-script.gs`, `PREORDER-SETUP.md`, `preorder.html`, `singlet-assets/README.md`, `singlet-assets/singlet-viewer.js`, `singlet-assets/singlet.glb`, and the deletion of `singlet-assets/singlet-mobile.glb`.

- [ ] **Step 6: Note the one deferred check**

Spec §12 item 11 is a Lighthouse mobile pass **on the deployed page**. It cannot
run here because this plan does not deploy. Do not skip it silently: say so in
the completion report, and run it against `https://saintsrunclub.com/preorder`
once the site is deployed.

- [ ] **Step 7: Report**

The plan and spec are already committed, so nothing further to stage here.

Report to the user: what shipped, the measured asset size against the 7.51 MB source, that capture is off by design and exactly what the receipt now says because of it, that the Lighthouse check is deferred to post-deploy, and that `PREORDER-SETUP.md` holds both wiring routes for whenever they want one.

---

## Notes for whoever executes this

**The two failure modes most likely to bite:**

1. **The model renders as a flat black shape, or not at all.** The GLB declares `KHR_materials_unlit`. three.js turns that into `MeshBasicMaterial`, which ignores every light in the scene, and the object is near-black on a near-black page. The fix is the `if (src && src.map)` swap in Task 2 Step 3. A previous version of this viewer gated on "already has a texture, so keep its material", which is exactly wrong for this asset.

2. **The hero stops pinning.** Any ancestor with `overflow-x: hidden` computes `overflow-y: auto`, and `position: sticky` silently stops working with no error anywhere. Use `overflow-x: clip`.

**On the deliberately unwired form.** It would be easy to read `CONFIG.endpoint: ''` as an unfinished job and "helpfully" wire something up, or to leave the original receipt copy because it reads better. Do neither. Shipping unwired is a decision the user made with the tradeoff explained, and the changed receipt copy is the thing that keeps that decision honest rather than lossy.
