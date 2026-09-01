# Race Day Singlet: web 3D asset

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
