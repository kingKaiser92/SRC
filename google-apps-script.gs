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

  // This is a one-time setup step, but nothing stops someone from running it
  // again months later to fix formatting or re-authorize. sh.clear() below
  // would silently wipe every preorder captured so far, and real Zelle
  // payments have already been made against those rows. Refuse instead.
  var dataRows = sh.getLastRow() - 1; // rows below the header
  if (dataRows > 0) {
    throw new Error(
      'setupSheet refused to run: sheet "' + SHEET_NAME + '" already has ' +
      dataRows + ' order row(s). Running setup again would erase them. ' +
      'If you genuinely want to start over, delete or rename this sheet ' +
      'first, then run setupSheet again to create a fresh one.'
    );
  }

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
