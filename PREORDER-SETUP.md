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

   > Rerunning `setupSheet` once orders exist is refused, on purpose — it
   > would otherwise wipe every preorder already captured, with real Zelle
   > payments made against those rows.

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

**Deadline, enforced where a client cannot reach:**

```sql
create function public.reject_late_orders() returns trigger as $$
begin
  if now() >= timestamptz '2026-09-04T09:00:00-04:00' then
    raise exception 'preorder closed';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger singlet_preorders_guard
  before insert on public.singlet_preorders
  for each row execute function public.reject_late_orders();
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
