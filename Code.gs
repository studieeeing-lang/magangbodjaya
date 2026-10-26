// Google Apps Script: simpan data tracker di sheet "data" pada Google Sheet ini.
const SHEET_NAME = "data";

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) { s = ss.insertSheet(SHEET_NAME); s.appendRow(["path", "json"]); }
  return s;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const data = {};
  rows.forEach(r => { if (r[0]) { try { data[r[0]] = JSON.parse(r[1]); } catch (e) {} } });
  return out_({ ok: true, data: data });
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const s = sheet_();
    const last = s.getLastRow();
    const paths = last > 0 ? s.getRange(1, 1, last, 1).getValues() : [];
    let row = -1;
    for (let i = 1; i < paths.length; i++) { if (paths[i][0] === body.path) { row = i + 1; break; } }
    if (body.data === null) { if (row > 0) s.deleteRow(row); }
    else if (row > 0) s.getRange(row, 2).setValue(JSON.stringify(body.data));
    else s.appendRow([body.path, JSON.stringify(body.data)]);
    return out_({ ok: true });
  } finally { lock.releaseLock(); }
}
