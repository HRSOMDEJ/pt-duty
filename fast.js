/**
 * fast.js — v2.4
 *  1) โหลดข้อมูลทุกหน้าครั้งเดียว (preload) หลังเข้าสู่ระบบ/เปลี่ยนเดือน → สลับหน้าได้ทันที
 *  2) ค้นชื่อบุคลากรในเครื่อง (ไม่ถามเซิร์ฟเวอร์ทุกครั้งที่พิมพ์)
 *  3) สร้างไฟล์ .xlsx / .zip ในเบราว์เซอร์แล้วดาวน์โหลดตรง (ไม่ผ่าน Google Drive ไม่ต้องล็อกอิน Google)
 *  4) ป๊อปอัปพิมพ์เอกสาร (เลือก "บันทึกเป็น PDF" ได้จากหน้าพิมพ์)
 */

/* ================================================================ 1) โหลดครั้งเดียว */
var FAST_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/fast\.js[^/]*$/, '');
var PRE = { wait: {}, run: 0, ym: '', done: 0, total: 0, timer: null };
var MEMO_TTL = 10 * 60 * 1000;          // ข้อมูลที่โหลดไว้ใช้ได้ 10 นาที (หลังจากนั้นหน้าที่เปิดจะโหลดใหม่เฉพาะหน้านั้น)

function preloadPlan(ym) {
  var me = S.me || {}, a = [], b = [];
  var add = function (list, action, payload) {
    var k = mkey(action, payload);
    if (MEMO[k] && Date.now() - MEMO_T[k] < MEMO_TTL) return;
    list.push({ action: action, payload: payload });
  };
  add(a, 'getDashboard', { ym: ym });
  add(a, 'getMySchedule', { ym: ym });
  var mgr = myUnitsFor('manage'), sched = typeof schedUnits === 'function' ? schedUnits() : mgr;
  if (!mgr.length) sched = sched.slice(0, 1);   // บุคลากรทั่วไป โหลดเฉพาะตารางหน่วยแรก
  if (mgr.length) { add(a, 'getPeriods', { ym: ym, deptId: S.deptId || '' }); add(a, 'listEmployeesLite', {}); }
  var first = pickUnit(sched);
  if (first) add(a, 'getSchedule', { ym: ym, unitId: first });
  sched.forEach(function (u) { if (u.unitId !== first) add(a.length < 12 ? a : b, 'getSchedule', { ym: ym, unitId: u.unitId }); });
  mgr.forEach(function (u) { add(b, 'getWorkSheet', { ym: ym, unitId: u.unitId }); });
  if (mgr.length) {
    add(b, 'getReport', { ym: ym, unitId: S.repUnit || '', onlyProblems: true });
    var wdef = S.repUnit || (mgr.filter(function (u) { return u.needWard; })[0] || {}).unitId || '';
    add(b, 'getWardReport', { ym: ym, unitId: wdef });
  }
  if (me.isAdmin || me.isChief) add(b, 'getAdminData', { ym: ym });
  if (me.canManageUsers) add(b, 'listUsers', {});
  return [a, b].filter(function (x) { return x.length; });
}

/** เริ่มโหลดล่วงหน้า — หน้าไหนที่เปิดระหว่างรอ จะรอผลชุดนี้แทนการยิงคำขอซ้ำ */
function startPreload(ym, quiet, light) {
  if (!S.me || !S.token) return Promise.resolve();
  ym = ym || S.ym || thisYmJs();
  var batches = preloadPlan(ym), run = ++PRE.run;
  if (light) batches = batches.slice(0, 1);   // หลังบันทึก: โหลดใหม่เฉพาะชุดหลัก (เบาเครื่องแม่ข่าย)
  if (!batches.length) return Promise.resolve();
  PRE.ym = ym; PRE.done = 0; PRE.total = batches.reduce(function (n, x) { return n + x.length; }, 0);
  preBadge(quiet ? null : 'load');
  var chain = Promise.resolve();
  batches.forEach(function (items) {
    var release;
    var gate = new Promise(function (r) { release = r; });
    items.forEach(function (it) { PRE.wait[mkey(it.action, it.payload)] = gate; });
    chain = chain.then(function () {
      if (run !== PRE.run) { release(); return; }
      return rawCall('preload', { items: items }).then(function (res) {
        if (res && res.ok) {
          res.data.items.forEach(function (x) {
            if (x.data === undefined) return;
            var k = mkey(x.action, x.payload);
            MEMO[k] = x.data; MEMO_T[k] = Date.now();
            if (x.action !== 'listEmployeesLite') pcSet(k, x.data);
          });
        } else if (res && res.error === 'SESSION_EXPIRED') { signedOut(true); }
        PRE.done += items.length;
        if (run === PRE.run && !quiet) preBadge('load');
      }).catch(function () { }).then(function () {
        items.forEach(function (it) { var k = mkey(it.action, it.payload); if (PRE.wait[k] === gate) delete PRE.wait[k]; });
        release();
      });
    });
  });
  return chain.then(function () { if (run === PRE.run && !quiet) preBadge('ok'); });
}

/** หลังบันทึก — โหลดข้อมูลล่วงหน้าใหม่แบบเงียบ ๆ (รวบหลายการบันทึกติดกันเป็นครั้งเดียว) */
function schedulePreload() {
  clearTimeout(PRE.timer);
  PRE.timer = setTimeout(function () { startPreload(S.ym || thisYmJs(), true, true); }, 6000);
}

function preBadge(state) {
  var el = $('preBadge');
  if (!el) {
    el = document.createElement('div'); el.id = 'preBadge'; el.className = 'pre-badge';
    document.body.appendChild(el);
  }
  if (!state) { el.className = 'pre-badge'; return; }
  if (state === 'ok') {
    el.className = 'pre-badge show ok';
    el.innerHTML = '<i class="bi bi-check-circle"></i> ข้อมูลพร้อมแล้ว — สลับหน้าได้ทันที';
    setTimeout(function () { el.className = 'pre-badge'; }, 2500);
    return;
  }
  var pct = PRE.total ? Math.round(PRE.done / PRE.total * 100) : 0;
  el.className = 'pre-badge show';
  el.innerHTML = '<span class="spin"></span> กำลังเตรียมข้อมูลทุกหน้า (ครั้งเดียว) ' + pct + '%';
}

/* ================================================================ 2) ค้นชื่อในเครื่อง */
function empLite() {
  var k = mkey('listEmployeesLite', {});
  if (MEMO[k]) return Promise.resolve(MEMO[k]);
  if (PRE.wait[k]) return PRE.wait[k].then(function () { return MEMO[k] || api('listEmployeesLite', {}, { fresh: true }); });
  return api('listEmployeesLite', {}, { fresh: true });
}
function normTh(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
/** ค้นหาในรายชื่อที่โหลดไว้ — ผลลัพธ์รูปแบบเดียวกับ searchEmployees ของหลังบ้าน */
function empSearchLocal(list, q, max) {
  q = normTh(q);
  var words = q ? q.split(' ') : [], out = [];
  for (var i = 0; i < list.length && out.length < (max || 40); i++) {
    var e = list[i], hay = normTh(e[0] + ' ' + e[1] + ' ' + e[3] + ' ' + e[5]);
    if (words.every(function (w) { return hay.indexOf(w) >= 0; })) {
      out.push({ empCode: e[0], fullName: e[1], posId: e[2], hrPosition: e[3], wardId: e[4], wardName: e[5] });
    }
  }
  return out;
}

/* ================================================================ 3) ไฟล์ .xlsx / .zip ในเบราว์เซอร์ */
function loadScript(src) {
  return new Promise(function (ok, bad) {
    if (document.querySelector('script[data-src="' + src + '"]')) return ok();
    var s = document.createElement('script'); s.src = src; s.setAttribute('data-src', src);
    s.onload = ok; s.onerror = function () { bad(new Error('โหลดตัวสร้างไฟล์ไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วลองใหม่')); };
    document.head.appendChild(s);
  });
}
function needZip() { return window.JSZip ? Promise.resolve() : loadScript(FAST_BASE + 'lib/jszip.min.js?v=' + PT_BUILD); }

function xe(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); }
function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

/**
 * สร้างไฟล์ .xlsx (Blob) — sheets: [{ name, head[], rows[][], widths[] }]
 * หัวตาราง: ตัวหนา พื้นเทา มีเส้นขอบ จัดกลาง (เหมือนไฟล์ต้นแบบ HRMi) · ข้อมูล: มีเส้นขอบ · ฟอนต์ Tahoma 10
 * ตัวเลขเขียนเป็นตัวเลขจริง · ข้อความใช้ sharedStrings (รูปแบบมาตรฐานที่โปรแกรมนำเข้าอ่านได้ทุกตัว)
 */
function makeXlsx(sheets) {
  return needZip().then(function () {
    var zip0 = new JSZip(), sst = [], sidx = {};
    var zip = { file: function (n, d) { return zip0.file(n, d, { createFolders: false }); }, generateAsync: function (o) { return zip0.generateAsync(o); } };
    var si = function (v) { v = String(v); if (!(v in sidx)) { sidx[v] = sst.length; sst.push(v); } return sidx[v]; };
    var cell = function (ref, v, st) {
      if (v === null || v === undefined || v === '') return '<c r="' + ref + '" s="' + st + '"/>';
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>';
      return '<c r="' + ref + '" s="' + st + '" t="s"><v>' + si(v) + '</v></c>';
    };
    sheets.forEach(function (sh, n) {
      var rows = (sh.head ? [sh.head] : []).concat(sh.rows || []), ncol = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
      var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<dimension ref="A1:' + colName(ncol - 1) + Math.max(1, rows.length) + '"/>';
      if (sh.head) x += '<sheetViews><sheetView workbookViewId="0"' + (n === 0 ? ' tabSelected="1"' : '') + '><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
      x += '<sheetFormatPr defaultRowHeight="15"/><cols>';
      for (var c = 0; c < ncol; c++) {
        var w = (sh.widths && sh.widths[c]) || Math.min(45, Math.max(8, rows.reduce(function (m, r) { return Math.max(m, String(r[c] == null ? '' : r[c]).length); }, 4) + 2));
        x += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" customWidth="1"/>';
      }
      x += '</cols><sheetData>';
      rows.forEach(function (r, ri) {
        x += '<row r="' + (ri + 1) + '">';
        for (var ci = 0; ci < ncol; ci++) x += cell(colName(ci) + (ri + 1), r[ci], sh.head && ri === 0 ? 1 : 2);
        x += '</row>';
      });
      x += '</sheetData><pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
      zip.file('xl/worksheets/sheet' + (n + 1) + '.xml', x);
    });
    var sname = function (s, i) { return xe(String(s || ('Sheet' + (i + 1))).replace(/[\\\/?*\[\]:]/g, '').slice(0, 31)); };
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:creator>PT Duty</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified></cp:coreProperties>');
    zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>');
    zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' +
      sheets.map(function (s, i) { return '<sheet name="' + sname(s.name, i) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId' + (sheets.length + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>');
    zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="10"/><name val="Tahoma"/><family val="2"/><charset val="222"/></font><font><b/><sz val="10"/><name val="Tahoma"/><family val="2"/><charset val="222"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor rgb="FFF3F4F6"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    zip.file('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + sst.length + '" uniqueCount="' + sst.length + '">' +
      sst.map(function (s) { return '<si><t xml:space="preserve">' + xe(s) + '</t></si>'; }).join('') + '</sst>');
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  });
}

function saveBlob(blob, name) {
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
}

/** ไฟล์ HRMi: 1 รหัส = .xlsx ไฟล์เดียว · หลายรหัส = .zip ที่มี .xlsx แยกตามรหัสรายได้ */
function downloadHrmi(r) {
  var one = function (f) { return makeXlsx([{ name: f.sheet, head: r.head, rows: f.rows, widths: [14, 16, 18, 10, 12, 12, 10] }]); };
  if (r.files.length === 1) return one(r.files[0]).then(function (b) { saveBlob(b, r.files[0].name + '.xlsx'); return [r.files[0].name + '.xlsx']; });
  return Promise.all(r.files.map(one)).then(function (blobs) {
    var z = new JSZip();
    blobs.forEach(function (b, i) { z.file(r.files[i].name + '.xlsx', b, { createFolders: false }); });
    return z.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  }).then(function (zb) { saveBlob(zb, r.zipName + '.zip'); return r.files.map(function (f) { return f.name + '.xlsx'; }); });
}
function downloadExcel(r) {
  return makeXlsx([{ name: r.sheet, head: r.head, rows: r.rows }]).then(function (b) { saveBlob(b, r.name + '.xlsx'); return r.name + '.xlsx'; });
}

/* ================================================================ 4) ป๊อปอัปพิมพ์ */
var PRINT_CSS =
  '@import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap");' +
  '*{box-sizing:border-box}html,body{margin:0;background:#e9edf0;font-family:Sarabun,"TH Sarabun New",Tahoma,sans-serif;color:#000}' +
  '.page{background:#fff;margin:14px auto;padding:10mm;box-shadow:0 2px 12px rgba(0,0,0,.15)}' +
  '.page.land{width:297mm;min-height:210mm}.page.port{width:210mm;min-height:297mm}' +
  '.t1{text-align:center;font-weight:700;font-size:15px}.t2{text-align:center;font-weight:700;font-size:14px;margin-top:2px}.t2.left{text-align:left}' +
  '.t3{font-size:12.5px;margin:4px 0 8px}.t3.c{text-align:center}.b{font-weight:700}' +
  'table.grid{width:100%;border-collapse:collapse;font-size:10.5px;table-layout:auto}' +
  '.grid th,.grid td{border:1px solid #444;padding:2px 3px;vertical-align:middle}' +
  '.grid th{background:#eef3f2;text-align:center;font-weight:700}' +
  '.grid td.c{text-align:center}.grid td.r{text-align:right;white-space:nowrap}.grid .nm{text-align:left;white-space:nowrap}' +
  '.grid.sched{table-layout:fixed}.grid.sched td,.grid.sched th{font-size:9.5px;padding:1px 1px;overflow:hidden;word-break:break-all}.grid.sched .nm{white-space:normal;word-break:normal}.grid.sched small{font-size:8px;color:#333}' +
  '.grid .we{background:#e6eefb}.grid .hol{background:#fbe7ea}' +
  '.grid tfoot td{background:#f4f6f6;font-weight:700}' +
  'table.sign{width:100%;margin-top:26px;font-size:12.5px;text-align:center;border:0}.sign td{width:33%;padding:6px;line-height:1.9;border:0}' +
  '.foot{margin-top:10px;font-size:9px;color:#777}' +
  '@media print{html,body{background:#fff}.page{margin:0;box-shadow:none;padding:0;width:auto!important;min-height:0!important;page-break-after:always}.page:last-child{page-break-after:auto}' +
  'thead{display:table-header-group}tr{page-break-inside:avoid}.grid th,.grid .we,.grid .hol,.grid tfoot td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

function printPopup(doc) {
  var land = doc.orientation !== 'portrait';
  var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + h(doc.title) + '</title>' +
    '<style>@page{size:A4 ' + (land ? 'landscape' : 'portrait') + ';margin:8mm}' + PRINT_CSS + '</style></head><body>' + doc.html +
    // จอเล็ก (มือถือ): ย่อหน้าเอกสารให้พอดีจอ · ตอนพิมพ์กลับเป็นขนาดจริง
    '<script>function fit(){var p=document.querySelector(".page");if(!p)return;document.body.style.zoom=1;var z=Math.min(1,(innerWidth-8)/(p.offsetWidth+28));document.body.style.zoom=z}' +
    'addEventListener("load",fit);addEventListener("resize",fit);addEventListener("beforeprint",function(){document.body.style.zoom=1});addEventListener("afterprint",fit);<\/script></body></html>';
  var old = $('prOv'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'prOv'; ov.className = 'pr-ov';
  ov.innerHTML = '<div class="pr-bar"><i class="bi bi-printer"></i><b class="text-truncate">' + h(doc.title) + '</b><span class="ms-auto"></span>' +
    '<button class="btn btn-brand" id="prGo"><i class="bi bi-printer"></i> พิมพ์ / บันทึกเป็น PDF</button>' +
    '<button class="btn btn-ghost" id="prTab" title="เปิดในแท็บใหม่"><i class="bi bi-box-arrow-up-right"></i><span class="d-none d-md-inline"> แท็บใหม่</span></button>' +
    '<button class="btn btn-ghost btn-icon" id="prX" title="ปิด"><i class="bi bi-x-lg"></i></button></div>' +
    '<div class="pr-hint"><i class="bi bi-info-circle"></i> กด “พิมพ์” แล้วเลือกเครื่องพิมพ์ หรือเลือก “บันทึกเป็น PDF” เพื่อเก็บเป็นไฟล์ · ตั้งกระดาษ A4 ' + (land ? 'แนวนอน' : 'แนวตั้ง') + '</div>' +
    '<iframe id="prFrame" title="ตัวอย่างก่อนพิมพ์"></iframe>';
  document.body.appendChild(ov);
  document.body.classList.add('pr-open');
  var fr = $('prFrame');
  fr.srcdoc = html;
  var close = function () { ov.remove(); document.body.classList.remove('pr-open'); document.removeEventListener('keydown', esc); };
  var esc = function (e) { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  $('prX').addEventListener('click', close);
  $('prGo').addEventListener('click', function () {
    var w = fr.contentWindow;
    var go = function () { try { w.focus(); w.print(); } catch (e) { openTab(); } };
    try { (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready : Promise.resolve()).then(go); } catch (e) { go(); }
  });
  var openTab = function () {
    var url = URL.createObjectURL(new Blob([html.replace('</body>', '<script>window.onload=function(){setTimeout(function(){print()},400)}<\/script></body>')], { type: 'text/html' }));
    var w = window.open(url, '_blank');
    if (!w) alertBox('เบราว์เซอร์บล็อกหน้าต่างใหม่', 'กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้ หรือกดปุ่ม “พิมพ์” แทน', 'info');
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
  };
  $('prTab').addEventListener('click', openTab);
}

/* ================================================================ 5) เปิดไฟล์แนบ (ไม่ผ่านลิงก์ Google Drive) */
function openAttach(id) {
  var w = null;
  act({ action: 'getAttachment', payload: { id: id }, title: 'กำลังเปิดไฟล์แนบ', icon: 'bi-paperclip', steps: ['ดึงไฟล์จากระบบ'], done: false }).then(function (f) {
    var bin = atob(f.dataBase64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var blob = new Blob([arr], { type: f.mimeType }), url = URL.createObjectURL(blob);
    if (/^image\//.test(f.mimeType)) {
      Swal.fire({ title: h(f.name), imageUrl: url, imageAlt: f.name, width: 'min(900px,96vw)', showCancelButton: true, confirmButtonText: '<i class="bi bi-download"></i> บันทึกไฟล์', cancelButtonText: 'ปิด' })
        .then(function (r) { if (r.isConfirmed) saveBlob(blob, f.name); });
    } else {
      w = window.open(url, '_blank');
      if (!w) saveBlob(blob, f.name);
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 300000);
  }).catch(function () { });
}
