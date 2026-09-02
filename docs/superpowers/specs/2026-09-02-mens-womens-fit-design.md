# Men's / Women's Fit Selection — Design

**Date:** 2026-09-02
**Status:** Approved
**Page:** `preorder.html` (saintsrunclub.com/preorder)

---

## 1. Goal

The singlet ships in two cuts, men's and women's. The preorder form currently
offers a single unisex size run, so a buyer cannot say which cut they want and
the club cannot cut the right garment.

Add a cut selection that feeds through to the Google Sheet, **without requiring
the Apps Script to be edited or redeployed.** The drop closes Fri Sept 4, so a
second browser deployment trip is a cost worth designing around.

## 2. Decisions

| Question | Decision |
|---|---|
| What is offered | Men's and women's. No unisex. |
| Size runs | Both XS, S, M, L, XL, XXL. Identical, so the chip row never changes length. |
| Where the cut lands in the Sheet | The existing `Item` column, as `Race Day Singlet (Women's)`. |
| Default cut | None. The buyer picks deliberately. |

**Why the Item column.** `Size` stays a clean `"M"` so the Size column still
tallies directly, and `Item` becomes a sortable second axis. Critically,
`HEADERS` in `google-apps-script.gs` is unchanged, so nothing needs redeploying.
Folding the cut into the Size value (`"Women's M"`) was rejected: it makes the
column that gets counted the messiest one.

**Why no default.** A pre-selected "Men's" is exactly the kind of default a
buyer skips past, and the cost is a wrong garment on a drop with no returns
process. One extra tap is cheaper than one wrong singlet.

## 3. UI

Panel 01's head becomes `Pick your fit`. Inside it, two labelled chip groups:

```
CUT      [ Men's ] [ Women's ]           2-column grid
SIZE     [ XS ][ S ][ M ]                3-column grid, unchanged
         [ L ][ XL ][ XXL ]
```

Cut chips reuse the existing `.size` chip styling, so selected state, contrast,
and tap targets are already correct and consistent. A new `.cuts` grid gives
them two columns. Both groups get a `micro` label above them, because the panel
now asks two questions rather than one.

The existing size-chip render loop is generalised into one `renderChips` helper
used by both groups, rather than duplicated. Duplicating it would be the more
obvious edit and the wrong one.

## 4. Behaviour

- `state.fit` is `''` until chosen, alongside the existing `state.size`.
- Validation gains one rule **ahead of** the size check:
  `Pick a cut first.` The existing rules follow unchanged.
- Selecting either chip clears the error, as the size chips already do.
- Receipt reads `1 × Women's, Size M`.
- Reset clears `state.fit` and both groups' `aria-pressed`.
- `applyClosed()` needs no change: the cut chips are `<button>` elements inside
  `formEl`, so the existing disable loop already covers them.

## 5. Data

```js
item: CONFIG.item + ' (' + state.fit + ')'   // "Race Day Singlet (Women's)"
size: state.size                              // "M", unchanged
```

`google-apps-script.gs` is untouched. No redeploy.

## 6. Copy that must change

Dropping the unisex cut makes several existing strings false:

| Location | Now | Becomes |
|---|---|---|
| Fit spec row | "Unisex race cut." | "Men's and women's race cut." |
| `<meta name="description">` | "unisex race cut" | "men's and women's race cut" |
| Panel 02 memo instruction | "your full name + size" | "your full name, cut and size" |
| Unwired `#preorder-sub` | "full name and size in the memo" | "full name, cut and size in the memo" |
| Unwired `#receipt-body` | same | same |

The memo strings matter more than they look: the Zelle memo is the club's
reconciliation key, and with two cuts it has to carry the cut.

**Artwork note.** Both product photos and the 3D model show one garment. The
art note gains `Shown in the men's cut.` so a women's buyer is not surprised.

## 7. Out of scope

A size chart. "Women's M" means nothing without measurements and it is the
single biggest driver of wrong-size orders, but it needs real measurement data
from the manufacturer, which is not available here. Flagged to the club.

## 8. Verification

Added to the existing Playwright suite:

1. Cut chips exist, are unselected on load, and both are `aria-pressed="false"`.
2. Submitting with a size but no cut shows `Pick a cut first.`
3. Submitting with a cut but no size still shows `Pick a size first.`
4. Picking a cut clears the error.
5. Receipt reads `1 × Women's, Size M`.
6. The POST body carries `item: "Race Day Singlet (Women's)"` and `size: "M"`.
7. Reset clears the cut selection.
8. No "unisex" string remains anywhere in the page.
