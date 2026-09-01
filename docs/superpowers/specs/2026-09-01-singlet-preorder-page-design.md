# Race Day Singlet Preorder Page — Design

**Date:** 2026-09-01
**Status:** Approved, ready for implementation planning
**Route:** `https://saintsrunclub.com/preorder`
**Source handoff:** `Saints Run Club Merchandise Setup (2).zip` → `design_handoff_singlet_preorder/`

---

## 1. Goal

Ship the Race Day Singlet Vol. 01 preorder page as a page of the existing
saintsrunclub.com static site. It reveals the singlet with a draggable 3D
turntable, shows front/back product artwork, and captures preorders (size,
quantity, name, email, optional Zelle confirmation code) into a Google Sheet
through a Google Apps Script web app.

Three requirements drive every decision below:

1. The 3D object must come from `saints_floating_object_app_optimized.glb`.
2. The page must be optimized for mobile.
3. Submissions must be able to land in a Google Sheet, following the pattern
   already established by the anniversary RSVP page (`RSVP-SETUP.md`). The
   submission layer is built in full, but **ships unwired by decision**: the
   Apps Script deploy needs a browser session and is being deferred. See
   section 8, which also covers how the page behaves honestly in that state.

There is no cart, no card processing, and no inventory. The Sheet is the order
list; payment reconciliation is manual, matched by name and amount.

---

## 2. Current state and what is wrong with it

`preorder.html` already exists in the working tree (untracked, 34.5 KB). It is a
faithful, already accessibility-hardened implementation of this design. Two
things about it are wrong:

**Wrong model.** The page loads `singlet-assets/singlet.glb`, a 1.6 MB
photogrammetry scan generated in a prior session. That substitution was correct
at the time: the *earlier* handoff ZIP shipped an untextured 4.6 MB placeholder,
so a textured replacement was built from a Rodin scan export. The updated ZIP
ships a genuinely textured GLB, so the substitution is now obsolete and must be
reverted.

**Viewer regressed.** `singlet-assets/singlet-viewer.js` lost the drag
interaction and the warped turntable during that same session. Rotation is now
`this._cur * Math.PI * 2.15`, driven purely by scroll. The hero still displays
the label `DRAG TO ROTATE`, which is currently untrue.

Additionally the config carries `$45 / Sat, Sept 5`, which conflicts with the
handoff spec.

`endpoint` is also empty, but that is no longer treated as a defect: shipping
unwired is a deliberate decision (section 8). What *is* a defect today is that
the empty-endpoint path still renders the full `YOU'RE ON THE LIST` receipt, so
the page currently tells buyers they are recorded when nothing is. That is
fixed.

---

## 3. Asset identity

`saints_floating_object_app_optimized.glb` and the ZIP's
`design_handoff_singlet_preorder/assets/singlet.glb` are the **same file**:

```
md5  d45da0cd9cdeca882f2f7208993722a7   7,509,168 bytes
```

Verified contents:

| Property | Value |
|---|---|
| Triangles | 150,000 (149,229 vertices) |
| Attributes | `POSITION` f32, `TEXCOORD_0` f32. No normals, no vertex colors. |
| Indices | u32 |
| Material | 1, `doubleSided`, `OPAQUE`, declares `KHR_materials_unlit` |
| Texture | 1, `SaintsColorTexture`, baseColor, 2048x2048 PNG, 2.72 MB |
| Animations | none |
| Bounds | approx `[1.417, 1.904, 0.156]`, near planar (depth is 8% of height) |

---

## 4. Architecture

Static, self-contained HTML, consistent with `rsvp.html`, `shop.html`, and
`strava.html`. No build step, no framework.

The handoff README suggests recreating the design inside a framework
(Next.js/Astro/etc). That is rejected: saintsrunclub.com is a flat set of static
files served with a `_redirects` map. Introducing a build pipeline for a single
page adds deployment risk and buys nothing the page needs.

The `/preorder` redirect already exists in `_redirects`:

```
/preorder /preorder.html 200
```

**Approach chosen:** evolve the existing `preorder.html` rather than rebuild
from `Race Day Singlet Preorder.dc.html`. The existing file is already a correct
implementation of this design plus a round of contrast and performance work
(the spec's own `--border #2A2721` at 1.33:1 and `--muted-deep #5C574E` at
2.78:1 both fail WCAG 1.4.11, and were raised to `#635E53` and `#837D6F`).
Rebuilding from the handoff discards that work to arrive at the same place.

Where the corrected tokens disagree with the handoff's token table, the
corrected tokens win. This is the single, deliberate deviation from
"the README is the spec."

---

## 5. The 3D asset pipeline

`saints_floating_object_app_optimized.glb` becomes the single source of truth.
The shipped file is a compressed derivative of it, never a different model.

```bash
gltf-transform webp    saints_floating_object_app_optimized.glb a.glb \
                       --slots baseColorTexture --quality 82
gltf-transform meshopt a.glb singlet-assets/singlet.glb --level medium
```

Measured, not estimated:

| Stage | Size |
|---|---|
| Source | 7,509,168 B (7.51 MB) |
| After WebP texture | 4,908,200 B (4.91 MB) |
| After meshopt | **1,271,000 B (1.27 MB)** |

83% smaller. Verified preserved in the output: **150,000 glPrimitives** (no
decimation) and the **2048x2048** texture resolution. The texture drops from
2.72 MB PNG to 122 KB WebP. Positions become `i16_norm` and UVs `u16_norm` under
`KHR_mesh_quantization`.

Extensions in the output: `EXT_meshopt_compression`, `EXT_texture_webp`,
`KHR_mesh_quantization`, `KHR_materials_unlit`. three.js supports all four;
only meshopt needs a decoder, which the viewer registers.

**Draco was measured and rejected.** WebP + Draco reaches 472 KB, but costs a
~200 KB decoder download and materially slower CPU decode. Meshopt's decoder is
~5 KB and decodes near-instantly, which is the better trade on mid-range phones
where CPU, not bandwidth, is the constraint. Recorded in the asset README as an
option, not used.

**KTX2 was considered and rejected.** The WebP texture still decodes to roughly
22 MB of VRAM. KTX2/Basis would cut that to about 5.6 MB, but ETC1S is visibly
lossy on a baked color map. 22 MB is acceptable on any phone from the last six
years, so fidelity wins.

### Files removed

`singlet-assets/singlet.glb` (1.6 MB photogrammetry) is replaced.
`singlet-assets/singlet-mobile.glb` (1.0 MB) is deleted: a single 1.27 MB
asset serves every device, so a second variant is dead weight that can drift
out of sync.

`singlet-assets/README.md` is rewritten to document the new source, its md5,
the exact pipeline above, the measured sizes, and the Draco and KTX2 rejections.

---

## 6. The viewer

`singlet-assets/singlet-viewer.js` is a merge of the two existing versions, not
a rewrite of either.

**Restored from the handoff version (currently missing):**

- Continuous turntable with warped angular velocity. `_spin += 0.0042` per
  frame; displayed angle is `rotation.y = _spin - 0.35 * sin(2 * _spin)`. The
  mesh is near planar, so a linear turn parks it edge on and invisible for
  seconds twice per revolution. The warp preserves a true 360 degree revolution
  while dwelling on the faces and sweeping about 1.7x faster through the edge-on
  quadrants. This must not be simplified to a constant rate.
- Pointer drag adding to `_userY` / `_userX` (X clamped to +/-0.55) on top of the
  idle spin, with 0.94-per-frame inertia after release and a slow ease back
  toward zero.
- `touch-action: pan-y` on the canvas, and touch pointers claim only the
  horizontal axis, so a vertical swipe still scrolls the page on mobile.
- Cursor toggles `grab` / `grabbing`.
- `toneMappingExposure = 1.45` (the repo version lowered this to 1.15 for the
  photogrammetry model).
- `rotation.x = 0.11 + sin(t * 0.23) * 0.03` plus the vertical bob.

**Kept from the repo version:**

- `MeshoptDecoder` registration via `GLTFLoader.setMeshoptDecoder`, required by
  `EXT_meshopt_compression`.
- `_measure()` called inside the rAF tick rather than from a `scroll` listener.
  The old handler ran the same rect read on every scroll event outside rAF,
  which is a forced-layout risk.
- `prefers-reduced-motion` handling.

**Material handling.** The GLB declares `KHR_materials_unlit`, which three.js
instantiates as `MeshBasicMaterial`: unlit, and unreadable against the dark
page. Replace it with:

```js
MeshStandardMaterial({
  map, roughness: 0.62, metalness: 0.06,
  emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.34,
  side: DoubleSide
})
```

The repo version's "detect a texture and keep the GLB's own material" branch
must not fire here. It exists for PBR models; on this unlit asset it would leave
`MeshBasicMaterial` in place. Gate the material swap on `KHR_materials_unlit` or
on the material being `MeshBasicMaterial`, not on the absence of a map.

The photogrammetry-era `metallicFactor = 0` correction and the `RoomEnvironment`
IBL are both dropped. This asset has no metallic-roughness texture and its
appearance is fully baked into the color map.

**Normals.** The GLB carries no `NORMAL` attribute, so a `MeshStandardMaterial`
would shade against an undefined normal. Call
`geometry.computeVertexNormals()` on each mesh after load, before the material
swap. Cheap at 150k vertices, done once.

**Framing** (`_resize`), recomputed on every resize because aspect changes:

```
t     = tan(fov/2)                          // fov 28 degrees
distV = (size.y / 2) / t
distH = (max(size.x, size.z) / 2) / (t * aspect)
camZ  = max(distV, distH) * 1.2 + size.z
```

Camera at `(0, 0.02, camZ)` looking at the origin.

**Scroll progress** (`_measure`) walks up to the nearest `position: sticky`
ancestor and measures **its parent**, the 280vh wrapper, because the pinned
element's own rect never moves.
`p = clamp(-rect.top / (rect.height - innerHeight), 0, 1)`, guarded with
`Number.isFinite`. A pre-layout measure otherwise yields `0/0 = NaN` and
permanently poisons the eased value.

**Lifecycle.** Boots once, but starts and stops the rAF loop and
`ResizeObserver` on every connect and disconnect. An `if (booted) return` guard
in `connectedCallback` would kill the loop forever if the element is ever
detached and reattached.

**Critical layout constraint.** No ancestor of the sticky stage may have
`overflow-x: hidden`, which computes `overflow-y: auto` and silently kills
`position: sticky`. Use `overflow-x: clip`.

---

## 7. Mobile optimization

| Measure | Effect |
|---|---|
| 1.27 MB model, down from 7.51 MB | Roughly 1s on 4G instead of roughly 7s |
| `<link rel="preload" as="fetch" type="model/gltf-binary" crossorigin>` | Model download starts before the module graph resolves |
| `touch-action: pan-y`, horizontal-axis-only touch pointers | Vertical swipe scrolls the page instead of spinning the model |
| Device pixel ratio capped at 2 | Bounds fragment cost on high-DPR phones |
| **rAF loop paused by IntersectionObserver when the hero leaves the viewport** | No GPU or battery burn while the user is down in the form. Not in the handoff spec; a genuine mobile win |
| `prefers-reduced-motion: reduce` | Easing becomes 1, so the model never drifts on its own after input stops |
| Product PNGs `loading="lazy" decoding="async"` with intrinsic `width`/`height` | No layout shift, no competing download during hero load |
| 44x44 stepper buttons, size chips at `min-width: 62px` / `padding: 15px 8px` | Meets tap target minimums |
| `clamp()` type and `flex: 1 1 300px` panels, no media queries | Panels reflow 3 to 2+1 to 1 |
| Corrected color tokens (section 4) | Interactive borders and all form labels clear WCAG 1.4.11 and 1.4.3 |

Known and accepted: the 2048x2048 texture decodes to roughly 22 MB of VRAM.
See section 5 for why KTX2 was not used.

Use `flex` with `flex: 1 1 300px`, not
`grid-template-columns: repeat(auto-fit, minmax(...))`. With auto-fit, three
items in a two-column track leave a visible empty bordered cell.

---

## 8. Form and order capture

### Shipping decision: capture is off at launch

The page ships with `CONFIG.endpoint = ''`. No backend is wired yet. This is a
deliberate choice, made with the tradeoff understood: deploying an Apps Script
web app requires a browser session that cannot be automated, and that step is
being deferred.

The submission layer is still built in full. Going live later is a one-line
change, and `PREORDER-SETUP.md` documents both routes (section "Wiring a
backend later"). Nothing about the page needs to be rewritten to enable capture.

**The critical constraint this creates:** with no endpoint, the page must never
tell a buyer their order was recorded. A silent fake success would lose real
orders during a drop that closes Fri Sept 4. See "Unwired behavior" below. This
is the single most important requirement in this section.

### Data flow, once wired

```
preorder.html form
  -> POST (mode: 'no-cors', Content-Type: text/plain;charset=utf-8)
  -> Apps Script web app /exec
  -> appendRow to "Orders" sheet  +  MailApp notification
```

`text/plain` avoids a CORS preflight. `no-cors` makes the response opaque, so
success is assumed when `fetch` does not throw. This mirrors the RSVP page and
is the correct shape for a static site with no server.

### Unwired behavior (the shipping state)

When `CONFIG.endpoint` is empty, `submit()` skips the network call entirely and
takes an honest path:

- Validation still runs in full, so the form is genuinely testable.
- The receipt state still renders, so the design is reviewable.
- The receipt headline stays `YOU'RE ON THE LIST`, but its body copy is replaced
  with: `Your order isn't logged automatically yet. Send your Zelle with your
  full name and size in the memo, then DM @svintsrunclub to confirm. {pickup}`
- The `ADD ANOTHER ORDER` ghost button is unchanged.
- The existing `console.warn` guard stays, so the state is obvious in devtools.

The buyer is told the truth and given a path that reaches the club, and the
Zelle memo (full name plus size) already carries enough to reconstruct the
order. When `endpoint` is set, this copy swaps back to the spec wording
automatically, driven by the same condition. No second code path.

This behavior is decided by `CONFIG.endpoint` alone. There is no separate flag
to keep in sync.

Request body:

```js
JSON.stringify({
  timestamp, name, email, size, quantity, total, zelleCode,
  item: 'Race Day Singlet Vol. 01',
  source: 'saintsrunclub.com/preorder'
})
```

### Sheet

Deferred. No Google Sheet is created as part of this work, because with capture
off there is nothing to write into it. It is created at wiring time instead, so
an empty spreadsheet does not sit in Drive being forgotten.

The target shape, when it is created: **"SRC Singlet Preorders"**, tab `Orders`,
header row frozen and formatted (ink background, gold text), column H as
checkboxes.

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Name | Email | Size | Quantity | Total ($) | Zelle Code | Paid? | Item | Source |

`Paid?` is ticked manually once the Zelle transfer is matched.

### Apps Script, ready but not deployed

`google-apps-script.gs` ships in the repo root so the work is done when it is
needed. It is the handoff version with two changes:

- `NOTIFY_EMAIL = 'svintsrunclub@gmail.com'`, the same inbox the RSVP page
  notifies.
- Honeypot and deadline rejection (see below).

It uses `LockService.getScriptLock()` with a 20s wait so concurrent submissions
cannot interleave rows, and returns `{ ok: true }` as JSON. The email send is
wrapped so a mail quota failure never costs the sheet row.

Deployment is manual and cannot be automated: Deploy as Web app,
*Execute as: Me*, *Who has access: Anyone*, then authorize. The resulting
`/exec` URL goes into `CONFIG.endpoint`.

### Wiring a backend later

`PREORDER-SETUP.md` documents both routes end to end, so the choice stays open:

**Route A, Google Apps Script.** Mirrors `RSVP-SETUP.md` exactly, including the
re-deploy step (Manage deployments, edit, New version) that keeps the URL
stable. Roughly 5 minutes of browser work. Chosen when the Google Sheet needs to
be the live system of record.

**Route B, Supabase.** Recorded because it needs no browser session at all and
the site already depends on this project: `index.html` serves its images from
`izcimioeuohdofzmnahu`. A `public.singlet_preorders` table with RLS enabled and
a single INSERT-only policy for the `anon` role, so the publishable key in the
page can write an order but can never read anyone else's. The page would POST to
`/rest/v1/singlet_preorders` with `Prefer: return=minimal` and read a real
status code, which is strictly better than the opaque `no-cors` response Route A
forces. The deadline and honeypot become a `BEFORE INSERT` trigger, which a
client cannot bypass. The Google Sheet is then populated as a mirror rather than
being written to live.

Both routes terminate at the same one-line change: set `CONFIG.endpoint`. Route
B additionally needs the publishable key and a different request shape, which
`PREORDER-SETUP.md` gives verbatim.

### Two production gaps closed

The handoff README flags both as known gaps.

**Spam.** A honeypot text input named `company`, visually hidden and
`tabindex="-1"` with `autocomplete="off"`. Any submission with it filled is
accepted silently client-side (shows the normal receipt) and dropped server-side
without writing a row, so a bot gets no signal.

**Hard close.** Nothing currently stops orders after the deadline. When
`Date.now() >= closesAt`: the countdown reads `Closed`, size chips, steppers,
inputs and submit are `disabled`, the submit label becomes `PREORDER CLOSED`,
and the hero CTA changes to `PREORDER CLOSED` with the `#preorder` anchor
removed. The Apps Script also rejects posts arriving after the deadline, since
a client-side clock is trivially wrong or spoofed.

### Validation

Client side, on submit, in order:

1. No size selected: `Pick a size first.`
2. Empty or whitespace name: `We need your name to match the payment.`
3. Email failing `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`: `That email looks off.`

Any keystroke in name or email clears the error. The confirmation code is never
validated. Errors render in `--error #FF6B4A` in the note line under the submit
button, which reserves `min-height: 18px` so nothing shifts.

Network throw: `Couldn't reach the list. Try again, or DM us on Instagram.`

Empty `endpoint`: no network call is attempted and the receipt copy changes, per
"Unwired behavior" above. Validation is unaffected and still runs in full.

---

## 9. Configuration

```js
var CONFIG = {
  endpoint:    '',                                    // intentionally blank at launch, see section 8
  price:       50,
  sizes:       ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  maxQty:      6,
  zelleUrl:    'https://www.zellepay.com/',
  zelleHandle: 'saintsvisionllc@gmail.com',
  closesOn:    'Fri, Sept 4 · 9AM',
  closesAt:    '2026-09-04T09:00:00-04:00',
  pickup:      'Pickup at a Saturday long run, early October.',
  item:        'Race Day Singlet Vol. 01'
};
```

Resolved from conflicting sources: the working file carried `$45` and
`Sat, Sept 5`; the handoff README specifies `$50` and `Fri, Sept 4 9AM ET`. The
handoff values are correct.

`zelleUrl` stays the generic Zelle homepage. It is the fallback link behind the
QR tile for anyone who cannot scan, and no deep link exists. `zelleHandle` is
the email address, matching the spec's `SEND TO` row, not the display name
`Saints Vision LLC` currently in the file.

---

## 10. Page structure

Unchanged from the handoff. One page: fixed header, 280vh hero with a sticky
100vh stage, preorder section, footer, and one swapped state inside preorder.

- **Header.** Fixed, z-50, `pointer-events: none` on the bar and `auto` on its
  children so the hero stays draggable beneath. `src-mark-dark.png` at 38px with
  no CSS filter, the asset is pre-baked for dark. Right side: pulsing 6px gold
  dot, `PREORDER OPEN`, live countdown.
- **Hero.** Glow layer, title layer (`LIMITED DROP` eyebrow, `RACE DAY / SINGLET`
  h1) with the model deliberately in front of it, viewer row at
  `width: min(86vw, 660px)` with `padding: 150px 0 0` to drop the object clear of
  the h1, and a bottom row with `DRAG TO ROTATE`, the price, and the
  `RESERVE YOURS` CTA.
- **Preorder.** Artwork strip of two bone `#EDE7DA` tiles (the garment is navy
  and disappears on the dark page), then the three-panel form: 01 size and
  quantity and total, 02 Zelle QR, 03 name / email / optional code plus submit.
- **Receipt state.** Replaces the three panels, artwork strip stays. Gold-bordered
  box, `YOU'RE ON THE LIST`, `{qty} x Size {size}`, pickup line, and an
  `ADD ANOTHER ORDER` ghost button that resets all state.
- **Footer.** Logo at 44px, wordmark, `Astoria, Queens - Est. 2025`, Instagram
  and Home links.

Countdown renders `{d}d HH:MM:SS`, drops the day part under 24h, and reads
`Closed` at zero. Interval cleared on unmount.

---

## 11. Deliverables

| File | Change |
|---|---|
| `preorder.html` | Config updated, honeypot added, hard close added, unwired receipt copy added, model path confirmed |
| `singlet-assets/singlet.glb` | Replaced: 1.27 MB derivative of the client GLB |
| `singlet-assets/singlet-mobile.glb` | Deleted |
| `singlet-assets/singlet-viewer.js` | Merged: handoff motion math plus repo decoder and rAF work |
| `singlet-assets/README.md` | Rewritten for the new source, pipeline, and measurements |
| `google-apps-script.gs` | Added, with notify email, honeypot, and deadline rejection. Ready, not deployed |
| `PREORDER-SETUP.md` | Added. Route A (Apps Script) mirrors `RSVP-SETUP.md`; Route B (Supabase) documented as the no-browser alternative |
| `_redirects` | No change, `/preorder` rule already present |

---

## 12. Verification

1. `gltf-transform inspect` on the built GLB confirms 150,000 glPrimitives and
   a 2048x2048 texture.
2. Serve the site over local HTTP. The model loads, is lit and readable against
   `#0A0A0A`, and never parks edge-on and invisible.
3. Drag rotates the model; release decays with inertia; the model eases back
   toward the idle spin.
4. On a touch viewport, a vertical swipe scrolls the page and does not rotate.
5. Sticky pin holds through the 280vh hero, confirming no ancestor reintroduced
   `overflow-x: hidden`.
6. rAF loop stops when the hero leaves the viewport, confirmed by instrumenting
   the tick.
7. All three validation paths produce their exact copy; a keystroke clears it.
8. Honeypot field is present, visually hidden, skipped by keyboard tabbing, and
   ignored by autofill.
9. With `closesAt` moved into the past, the form is fully disabled and the CTA
   reads `PREORDER CLOSED`.
10. **Unwired receipt check.** With `endpoint` empty, a valid submission makes no
    network request (confirmed in the Network panel) and the receipt tells the
    buyer to DM to confirm rather than claiming they are recorded. Setting
    `endpoint` to any non-empty string restores the spec receipt copy and issues
    the POST. This is the one behavior that keeps the launch honest, so it is
    checked in both directions.
11. Lighthouse mobile pass on the deployed page.

Deferred to whenever a backend is wired, and written into `PREORDER-SETUP.md`
as its final step rather than dropped: one real end-to-end order appends a
correctly typed row and sends the notification email.

---

## 13. Out of scope

Duplicate order detection, a buyer confirmation email, rate limiting beyond the
honeypot, inventory tracking, and any payment processing. Payment stays manual
over Zelle, reconciled by name and amount.
