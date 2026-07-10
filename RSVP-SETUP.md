# RSVP Page — Setup & Notes

The anniversary RSVP page lives at **`rsvp.html`** and is reachable at
**`https://saintsrunclub.com/rsvp`** (clean URL via `_redirects`).

## Access (unlisted)
The page is **not linked anywhere** on the main site and is marked
`noindex, nofollow`, so search engines won't list it. Only people you send
the `/rsvp` link to can find it. (A static site can't do true server-side
logins — this is the "unlisted URL" model you chose.)

## Saving RSVPs to a Google Sheet
Submissions POST to a **Google Apps Script web app** that appends a row to a
sheet you own. Until you paste your web-app URL into the page, the form still
works and shows the confirmation, but nothing is recorded.

### One-time setup (~5 min)
1. Go to **[sheets.new](https://sheets.new)** and create a sheet, e.g.
   **"SRC One Year RSVPs"**.
2. In that sheet: **Extensions → Apps Script**.
3. Delete whatever code is there and paste this:

   ```javascript
   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
     if (sheet.getLastRow() === 0) {
       sheet.appendRow(['Timestamp', 'Name', 'Email', '+1?', 'Guest', 'Total ($)']);
     }
     var p = e.parameter;
     sheet.appendRow([
       p.timestamp || new Date().toISOString(),
       p.name || '',
       p.email || '',
       p.plusOne || '',
       p.guest || '',
       p.total || ''
     ]);
     return ContentService.createTextOutput('ok');
   }
   ```

4. Click **Deploy → New deployment**.
5. Gear icon → choose **Web app**.
6. Set **Execute as: Me**, and **Who has access: Anyone**.
   (This lets the page post anonymously; the script only appends rows.)
7. **Deploy**, authorize when prompted, and **copy the Web app URL**
   (looks like `https://script.google.com/macros/s/AKfy...../exec`).

### Plug it into the page
Open `rsvp.html`, find this line near the top of the `<script>`:

```javascript
var RSVP_ENDPOINT = "";
```

Paste your URL between the quotes:

```javascript
var RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfy...../exec";
```

Save, commit, and deploy. Every RSVP now lands as a new row in your sheet with
timestamp, name, email, whether they brought a +1, guest name, and total due.

> **Tip:** submit a test RSVP after deploying and confirm a row appears. If you
> ever change the script, click **Deploy → Manage deployments → Edit → New
> version** so the URL keeps working.

## Payments (unchanged from the design)
Payment is manual — no processor. The page shows Zelle
(`saintsvisionllc@gmail.com`) and Venmo (`@ericsvntiago`) with copy buttons.
Match incoming payments to RSVPs by the note ("full name + SRC ONE YEAR").

## Files
- `rsvp.html` — the page (self-contained: markup + styles + vanilla JS).
- `rsvp-assets/winged-foot-site.png` — logo used on the box, lid, and invite.
- `_redirects` — contains the `/rsvp` → `/rsvp.html` rule.

## Editing content
Event details, prices, capacity, and payment handles are plain text in
`rsvp.html` — search for the value (e.g. `AINSLIE BOWERY`, `$85`,
`@ericsvntiago`) and edit in place. The countdown target is the
`TARGET` constant (`2026-08-16T14:00:00-04:00`).
