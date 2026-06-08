const CONTACT_SHEET = "Contact Messages";
const VISITOR_SHEET = "Visitor Logs";
const TIMEZONE = "Asia/Kolkata";

function doPost(e) {
  const data = e.parameter || {};
  const action = data.action || "";
  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "contact") {
      saveContact(ss, data);
    }

    if (action === "visit") {
      saveVisitor(ss, data);
    }

    return ContentService.createTextOutput("OK");
  } finally {
    lock.releaseLock();
  }
}

function saveContact(ss, data) {
  const sheet = getSheet(ss, CONTACT_SHEET, [
    "Date",
    "Time",
    "Name",
    "Email",
    "Mobile Number",
    "Subject",
    "Message",
    "Page URL"
  ]);

  const now = new Date();

  sheet.appendRow([
    Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd"),
    Utilities.formatDate(now, TIMEZONE, "HH:mm:ss"),
    data.name || "",
    data.email || "",
    data.mobile || "",
    data.subject || "",
    data.message || "",
    data.pageUrl || ""
  ]);
}

function saveVisitor(ss, data) {
  const sheet = getSheet(ss, VISITOR_SHEET, [
    "Date",
    "Time",
    "IP Address",
    "Device Type",
    "Browser",
    "OS",
    "Page URL"
  ]);

  const now = new Date();

  sheet.appendRow([
    Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd"),
    Utilities.formatDate(now, TIMEZONE, "HH:mm:ss"),
    data.ip || "",
    data.device || "",
    data.browser || "",
    data.os || "",
    data.pageUrl || ""
  ]);
}

function getSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    return sheet;
  }

  const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];

  if (firstRow.filter(Boolean).length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}
