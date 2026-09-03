# Race Day Singlet: web assets

`preorder.html` is a static page; everything it loads from this folder is
listed here.

## Product renders

`singlet-front.png` and `singlet-back.png` are the production renders of the
garment: 470x610, transparent background, from the manufacturer's sample.
They are the hero images. The body is navy and disappears against the ink
page, so the page shows them on bone plates. There is no larger master in the
repo; the hero sizes the plates from the viewport height and caps them at
620px tall for that reason. If a higher-resolution export ever arrives, drop
it in at the same filenames and lift that cap.

## Retired: the 3D turntable

Until commit `c36541b` the hero was a scroll-driven three.js turntable of a
meshopt-compressed GLB (`singlet.glb`, 1.27 MB, with `singlet-viewer.js` and
`preview.html`). It was replaced by the renders above on 2026-09-03. To bring
it back:

```bash
git checkout c36541b -- singlet-assets/singlet.glb singlet-assets/singlet-viewer.js singlet-assets/preview.html
```

and read that commit's version of this README for the build notes, the
meshopt/Draco/KTX2 trade-offs, and the source-of-truth checksum.

## Fonts

`fonts/` holds the two latin subsets the page uses, taken from Google Fonts:
Archivo v25 (the variable cut, so one 35 KB file carries every weight) and
Archivo Black v23 (10 KB). They are self-hosted because the Google Fonts
stylesheet was render-blocking on a third-party origin: on a slow mobile fetch
it held first paint, and every script on the page behind it, for several
seconds. `preorder.html` preloads both and declares them in its own
`@font-face` rules.

## Raster assets

The four PNGs are palette-quantized, not stored as full RGBA. They had few
enough unique colors to make that lossless in practice, and it took them from
519 KB to 44 KB combined:

| File | Before | After | Note |
|---|---|---|---|
| `zelle-qr.png` | 254 KB | 12 KB | 651x651 kept. Do not downscale: it has to stay scannable. |
| `src-mark-dark.png` | 116 KB | 6 KB | Also resized 699x660 to 212x200. It renders at 34 to 40px. |
| `singlet-front.png` | 69 KB | 12 KB | 470x610 kept. Now the hero image, shown up to ~480px wide. |
| `singlet-back.png` | 81 KB | 14 KB | Same. |

If you re-export any of them from the source art, re-quantize before committing
or the page silently gets heavy again. `src-mark-dark.png`'s dimensions are also
declared as `width`/`height` on the two `<img>` tags in `preorder.html`; changing
the file's size means changing those too, or the reserved box gets the wrong
aspect ratio and the header shifts on load.

`src-mark.png` (178 KB) is not referenced by the page.
