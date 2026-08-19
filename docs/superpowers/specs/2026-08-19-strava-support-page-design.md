# Strava Support Page — Design

**Date:** 2026-08-19
**Status:** Approved, ready for implementation planning

## Problem

Saints Run Club is submitting a Strava API application to raise its athlete
cap. The form requires a Support URL — "Support site for your athletes that
connect to Strava."

The site currently has one support page, `/support`, which serves the App Store
requirement. It covers the whole app and gives Strava a single short Q&A. A
Strava reviewer landing there finds one paragraph among app-wide FAQs, with no
brand attribution and no instructions for revoking access from Strava's own
settings.

## Goal

A dedicated page at `https://saintsrunclub.com/strava` that:

1. Satisfies the Support URL field — an athlete who connects Strava can find
   help and a way to reach a human.
2. Strengthens the API application itself. The review scores brand-guideline
   compliance, transparency about what athlete data is read, and whether
   athletes can disconnect. The page answers all three in one scannable place.

## Non-goals

- Rewriting `/support`, `/privacy`, or `/terms`. They stay authoritative for
  the app as a whole; this page is Strava-scoped and links back to them.
- Any backend, form, or interactive behavior. This is a static page.
- Changing the app's Strava integration. The page documents what already ships.

## Deliverables

| Path | Change |
|---|---|
| `strava.html` | New. The page. Repo root, matching the flat layout of the other legal/support pages. |
| `_redirects` | New line: `/strava  /strava.html  200` |
| `support.html` | One-line edit: existing Strava Q&A gains a pointer to `/strava` |
| `strava-assets/powered-by-strava.svg` | Asset slot. Supplied by the user (see Brand Assets). |

## Design

### Styling

Reuses the CSS token block from `support.html` verbatim so the page is visually
continuous with the rest of the site:

```
--bg:#0A0A0A  --panel:#121212  --text:#ECEAE5
--muted:#9B978E  --line:#242320  --accent:#C8A24B
```

Headings in Clash Display, body in Inter, both already loaded from the same CDN
links used by the sibling pages.

One token is added: `--strava:#FC4C02`. It is used **only** on Strava-brand
elements (the attribution mark and the Strava-orange rule above it) so Strava's
orange never competes with the club's gold as an accent colour.

Layout follows `support.html`: a single `.wrap` column at `max-width:720px`,
the same `.contact` and `.callout` components, the same `h2` top-border rule.

### Page structure

Ordered so a reviewer scanning top-down hits the material facts first.

1. **Header** — kicker "Saints Run Club", `h1` "Strava Support", meta line
   "Help for athletes who connect Strava to the Saints Run Club app".

2. **Contact card** — reuses the `.contact` component. Email
   `svintsrunclub@gmail.com`, the volunteer-run reply expectation, and the
   Instagram handle `@svintsrunclub`. This is the literal answer to the Support
   URL field, so it sits above the fold.

3. **What Saints Run Club accesses** — read-only access to the athlete's Strava
   profile and activities; the app **never posts to Strava**; access tokens are
   held server-side and are never accessible to the app on the device. Consistent
   with `privacy.html` §"Strava (only if you connect it)".

4. **Connecting Strava** — Profile tab → **Connect with Strava** → approve on
   Strava's own authorization screen. Notes that connecting is optional and the
   app is fully usable without it.

5. **Disconnecting Strava** — two paths, both required to be discoverable:
   - *In the app:* Profile → Strava section → **Disconnect**. Removes synced
     activities from Saints Run Club.
   - *On Strava:* `strava.com/settings/apps` → find Saints Run Club → **Revoke
     Access**. Stated plainly that this works even without opening the app.

6. **Deleting your data** — in-app account deletion and the email route, each
   cross-linked to `/support#delete` and `/privacy#delete` rather than restated
   at length, so the three pages cannot drift apart.

7. **Troubleshooting** — the failure modes an athlete actually writes in about:
   runs not appearing after a sync, activities marked private on Strava not
   showing, and re-authorizing after a Strava password change or revoked token.

8. **Privacy & terms** — links to `/privacy` and `/terms`.

9. **Footer** — the trademark disclaimer carried over from `terms.html` §6
   ("Strava® is a trademark of Strava, Inc.; we are not affiliated with,
   endorsed by, or sponsored by Strava."), the Powered by Strava mark, and the
   standard site footer nav.

Sections 3 and 5 carry the weight in the API review — they are the direct
answers to "what does this app do with athlete data" and "can athletes get out."

### Brand assets

The footer renders the official **Powered by Strava** mark:

```html
<img src="strava-assets/powered-by-strava.svg" alt="Powered by Strava">
```

Constraints:

- The **white** variant is used, since the page background is `#0A0A0A`.
- Sized and padded to respect Strava's minimum clear-space rule.
- A styled text fallback (`Powered by Strava` set in `--strava`) is markup-
  adjacent to the image and revealed by an `onerror` handler on the `img`, so an
  absent or failed asset degrades to a readable credit rather than a broken icon.

The asset is downloaded by the user from `https://www.strava.com/brand` and
saved to `strava-assets/powered-by-strava.svg`. It is not hand-drawn or
recreated — Strava's guidelines require the official file.

## Verification

No build step. Before commit:

1. Open `strava.html` locally and confirm it renders with fonts and tokens applied.
2. Confirm no horizontal overflow at a 375px viewport.
3. Confirm every internal link resolves: `/privacy`, `/terms`, `/support`,
   `/support#delete`, `/privacy#delete`.
4. Confirm the text fallback shows while `powered-by-strava.svg` is absent, and
   that the image replaces it once the file is added.
5. Confirm `/strava` serves `strava.html` after the `_redirects` entry is added.

## Open items for the user

- Download the white "Powered by Strava" mark from `https://www.strava.com/brand`
  and save it to `strava-assets/powered-by-strava.svg`.
