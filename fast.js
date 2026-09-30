/**
 * fast.js — v2.4
 *  1) โหลดข้อมูลทุกหน้าครั้งเดียว (preload) หลังเข้าสู่ระบบ/เปลี่ยนเดือน → สลับหน้าได้ทันที
 *  2) ค้นชื่อบุคลากรในเครื่อง (ไม่ถามเซิร์ฟเวอร์ทุกครั้งที่พิมพ์)
 *  3) สร้างไฟล์ .xlsx / .zip ในเบราว์เซอร์แล้วดาวน์โหลดตรง (ไม่ผ่าน Google Drive ไม่ต้องล็อกอิน Google)
 *  4) ป๊อปอัปพิมพ์เอกสาร (เลือก "บันทึกเป็น PDF" ได้จากหน้าพิมพ์)
 */

/* ================================================================ 1) โหลดล่วงหน้าแบบเบื้องหลัง (v2.5) */
/*
 * รุ่น 2.4 โหลดทุกหน้าของทุกหน่วยรวดเดียวตอนเข้าระบบ (2 คำขอใหญ่) และทุกหน้าต้องรอชุดนั้น → รอ 15–35 วิ / ค้าง
 * รุ่น 2.5: เข้าระบบโหลดเฉพาะหน้าแรก · หน้าอื่นโหลดเบื้องหลังทีละชุดเล็ก (≤3 รายการ) เฉพาะตอนผู้ใช้ไม่ได้รอคำขออื่น
 *           ผู้ใช้กดเมนูเมื่อไร คำขอของผู้ใช้ได้ไปก่อนเสมอ ไม่ต้องรอชุดเบื้องหลัง · ข้อมูลที่เลขรุ่นยังตรงไม่โหลดซ้ำ
 */
var FAST_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/fast\.js[^/]*$/, '');
var PRE = { run: 0, ym: '', timer: null };

function preloadPlan(ym) {
  var me = S.me || {}, list = [];
  var add = function (action, payload) {
    var e = cacheGet(mkey(action, payload));
    if (e && entryValid(e)) return;
    list.push({ action: action, payload: payload });
  };
  var mgr = myUnitsFor('manage'), sched = typeof schedUnits === 'function' ? schedUnits() : mgr;
  var first = pickUnit(sched);
  // ลำดับ = หน้าที่ผู้ใช้น่าจะเปิดก่อน
  if (first) add('getSchedule', { ym: ym, unitId: first });
  add('getMySchedule', { ym: ym });
  if (mgr.length) {
    add('getPeriods', { ym: ym, deptId: S.deptId || '' });
    add('listEmployeesLite', {});
    var w1 = pickUnit(mgr); if (w1) add('getWorkSheet', { ym: ym, unitId: w1 });
  }
  if (mgr.length && mgr.length <= 12) sched.forEach(function (u) { if (u.unitId !== first) add('getSchedule', { ym: ym, unitId: u.unitId }); });
  return list;
}

/** โหลดล่วงหน้าเบื้องหลัง — ชุดละ ≤3 รายการ ทีละชุด (ช่องทางแยกจากคำขอของผู้ใช้ ไม่ขวางกัน) · หน้าที่เปิดระหว่างนั้นรอชุดที่มีหน้านั้นอยู่ */
function startPreload(ym) {
  if (!S.me || !S.token) return Promise.resolve();
  ym = ym || S.ym || thisYmJs();
  var run = ++PRE.run, items = preloadPlan(ym), chunks = [];
  for (var i = 0; i < items.length; i += 3) chunks.push(items.slice(i, i + 3));
  PRE.ym = ym;
  var chain = new Promise(function (r) { setTimeout(r, 300); });
  chunks.forEach(function (ch) {
    chain = chain.then(function () {
      if (run !== PRE.run || !S.token) return;
      var todo = ch.filter(function (it) { var k = mkey(it.action, it.payload), e = cacheGet(k); return !(e && entryValid(e)) && !INFLIGHT[k]; });
      if (!todo.length) return;
      var p = rawCall('preload', { items: todo }, true).then(function (res) {
        if (res && res.ok) {
          dvSeen(res.dv);
          res.data.items.forEach(function (x) { if (x.data !== undefined) cachePut(x.action, x.payload, x.data, res.dv); });
        } else if (res && res.error === 'SESSION_EXPIRED') { signedOut(true); }
      }).catch(function () { });
      var done = p.then(function () { todo.forEach(function (it) { var k = mkey(it.action, it.payload); if (BGWAIT[k] === done) delete BGWAIT[k]; }); });
      todo.forEach(function (it) { BGWAIT[mkey(it.action, it.payload)] = done; });
      return done;
    });
  });
  return chain;
}
/** รุ่นเดิมเรียกหลังบันทึก — รุ่นนี้ไม่ต้องทำอะไร (เลขรุ่นข้อมูลบอกเองว่าอะไรต้องโหลดใหม่) */
function schedulePreload() { }
function preBadge() { }

/* ================================================================ 2) ค้นชื่อในเครื่อง */
function empLite() { return api('listEmployeesLite', {}, { fresh: true, keep: true }); }
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
/* v2.5 รูปแบบเอกสารเดียวกับ SMC (ชุด 18–20): ฟอนต์ Sarabun · ตัวย่อเวรใหญ่ หนา · 1 section = 1 หน้า A4 ย่อพอดีหน้าด้วย CSS zoom
 * (ใช้ zoom ไม่ใช้ transform เพื่อให้เครื่องพิมพ์ตัดหน้าตามขนาดที่ย่อแล้วจริง · วัดซ้ำ ≤4 รอบเพราะตัวอักษรจัดบรรทัดใหม่หลังย่อ) */
var PRINT_CSS =
  /* v2.5.1: ขนาดตัวอักษรเป็นลำดับชั้นเดียว (หัวเรื่อง 14 · หัวรอง 12 · เนื้อหา 10–11 · ตัวช่วย 8) + สีแยกส่วนของตาราง */
  '*{box-sizing:border-box}html,body{margin:0;background:#e9edf0;font-family:Sarabun,"TH Sarabun New","TH SarabunPSK",Tahoma,sans-serif;color:#000;font-size:10pt;line-height:1.25}' +
  '.dp{position:relative;overflow:hidden;background:#fff;display:flex;justify-content:center;align-items:flex-start;margin:12px auto;box-shadow:0 2px 14px rgba(0,0,0,.16);padding:0}' +
  '.land .dp{width:281mm;height:193mm}.port .dp{width:194mm;height:280mm}.dp.flow{height:auto!important;min-height:0;overflow:visible}' +
  '.dp-in{width:max-content;flex:none}' +
  '.dt{font-size:10pt}.dt-h1{text-align:center;font-weight:700;font-size:14pt;line-height:1.35}.dt-h2{text-align:center;font-weight:600;font-size:12pt;line-height:1.4}' +
  '.dt-h3{text-align:center;font-size:11pt;line-height:1.35}.dt-mark{text-align:center;font-weight:600;font-size:10pt;color:#b00000;line-height:1.4;margin-bottom:3px}.dt-gap{height:6px}' +
  '.dt-sub{font-weight:700;font-size:11pt;margin:10px 0 4px}' +
  '.dt-t{border-collapse:collapse;table-layout:fixed;width:100%;border:1.5px solid #000}' +
  '.dt-t th,.dt-t td{border:1px solid #555;padding:0 3px;vertical-align:middle;overflow:hidden}' +
  '.dt-t thead th{background:#e4e9ee;font-size:9.5pt;text-align:center;font-weight:700;line-height:1.2;padding:3px 1px}' +
  '.dt-t thead th.dn{font-size:10pt;padding:2px 0}.dt-t thead th.dw{font-size:8pt;font-weight:400;padding:1px 0}.dt-t thead{border-bottom:1.5px solid #000}' +
  '.dt-t thead th small{font-weight:400;font-size:8pt}' +
  '.dt-t thead th.sl{background:#e4e9ee}.dt-t thead th.tot{background:#d9d0ec}.dt-t thead th.amt{background:#f5e3a6}' +
  '.dt-t td{font-size:10pt;line-height:1.2}.dt-t td.c{text-align:center}' +
  '.dt-t td.nm{line-height:1.2;padding:2px 5px;text-align:left}' +
  '.dt-t td.nm .cd{display:inline-block;min-width:3.9em;font-weight:600;margin-right:4px}' +
  '.dt-t td.nm .n1{font-size:10pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.dt-t td.nm .n2{font-size:8pt;color:#333;white-space:normal;line-height:1.15;padding-left:calc(39pt + 4px);word-break:break-word}' +
  '.dt-t td.ps{font-size:8.5pt;line-height:1.1;white-space:normal}' +
  '.dt-t td.d{text-align:center;padding:0;font-size:11pt;line-height:1.1}.dt-t td.d b{font-weight:700}.dt-t td.d s{color:#777}' +
  '.dt-t td.d.l3{font-size:9.5pt}.dt-t td.d.l4{font-size:8.5pt;letter-spacing:-.02em}' +
  '.dt-t td.d .dw2{display:block;font-size:7pt;font-weight:400;color:#333;line-height:1.05;white-space:nowrap;overflow:hidden}' +
  '.dt-t td.t{text-align:center;font-weight:600;font-size:10.5pt}.dt-t td.t.b{font-weight:700}' +
  '.dt-t td.a{text-align:right;font-weight:600;padding-right:5px;font-size:10.5pt}' +
  '.dt-t td.sl{background:#f4f6f8}.dt-t td.tot{background:#efeaf8}.dt-t td.amt{background:#fff6d8}' +
  '.dt-t tr.sum td{background:#e4e9ee;font-weight:700;height:24px;font-size:10pt;border-top:1.5px solid #000}' +
  '.dt-t tr.sum td.tot{background:#d9d0ec}.dt-t tr.sum td.amt{background:#f5e3a6}' +
  '.dt-t tr.sum.q td{font-weight:400;border-top:1px solid #888;height:20px}.dt-t tr.sum.q1 td{border-top:1.5px solid #000}' +
  '.dt-t tr.q.qu td{background:#eaf5ee}.dt-t tr.q.qd td{background:#fdf1e4}' +
  '.dt-t tr.q.qu td.ql{background:#cfe8d7}.dt-t tr.q.qd td.ql{background:#f6dcbf}' +
  '.dt-t tr.sum.q td.ql{text-align:left;font-size:8.5pt;font-weight:700;padding-left:5px}' +
  '.dt-t td.qv{font-size:7pt;padding:0;white-space:nowrap;letter-spacing:-.03em}.dt-t td.qv.u1{font-size:9pt;letter-spacing:0}.dt-t tr.sum.q td.ql .qlim{font-weight:400;font-size:8pt}.dt-t td.qv.over{color:#c00000;font-weight:700;background:#fbd5d5!important}' +
  '.dt-leg{font-size:8pt;color:#333;line-height:1.6;margin-top:4px}.dt-leg .lg{display:inline-block;padding:0 6px;border:1px solid #999;border-radius:2px;line-height:1.3}.dt-leg .lg.qu{background:#cfe8d7}.dt-leg .lg.qd{background:#f6dcbf}' +
  '.ds{display:flex;justify-content:space-around;margin-top:14px}.ds-b{width:31%;text-align:center;font-size:11pt;line-height:1.55}.ds-b .ds-tt{font-weight:600}.ds-b .ds-gap{height:18px}' +
  '.dt-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;font-size:8pt;color:#555}.dt-foot span{font-size:8pt;color:#000;font-style:normal}' +
  '.drs-note{font-size:9pt;line-height:1.5;margin-top:6px;border:1px solid #999;border-radius:3px;padding:4px 8px;background:#fbfbfb}' +
  '.dt.ps .dt-t td{font-size:10pt;height:24px}.w2 .dt-t td{height:22px}.w2 .dt-t td.nm{white-space:nowrap;text-overflow:ellipsis}' +
  '@media print{html,body{background:#fff}.dp{margin:0;box-shadow:none;break-after:page;page-break-after:always}.dp:last-child{break-after:auto;page-break-after:auto}' +
  '.dt-t thead{display:table-header-group}.dt-t tr{page-break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

/** ย่อแต่ละหน้าให้พอดีกระดาษ (รันในหน้าต่างพิมพ์) */
var PRINT_FIT = 'function fitPages(){var ps=document.querySelectorAll(".dp");for(var j=0;j<ps.length;j++){var sec=ps[j],inn=sec.firstElementChild,flow=sec.classList.contains("flow");inn.style.zoom=1;' +
  'var W=sec.clientWidth,H=flow?1e9:sec.clientHeight,k=Math.min(1,W/Math.max(1,inn.scrollWidth),H/Math.max(1,inn.scrollHeight))*0.99;' +
  'for(var i=0;i<4;i++){inn.style.zoom=k.toFixed(4);var r=inn.getBoundingClientRect(),a=sec.getBoundingClientRect();var over=Math.max(r.width/Math.max(1,a.width),flow?0:r.height/Math.max(1,a.height));if(over<=1)break;k=k/over*0.99;}}}' +
  'function viewFit(){document.body.style.zoom=1;var p=document.querySelector(".dp");if(!p)return;var z=Math.min(1,(innerWidth-8)/(p.offsetWidth+24));document.body.style.zoom=z}' +
  'function ready(){var f=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();Promise.race([f,new Promise(function(r){setTimeout(r,5000)})]).then(function(){fitPages();viewFit();document.body.setAttribute("data-ready","1")})}' +
  'addEventListener("load",ready);addEventListener("resize",viewFit);addEventListener("beforeprint",function(){document.body.style.zoom=1});addEventListener("afterprint",viewFit);';

function printPopup(doc) {
  var land = doc.orientation !== 'portrait';
  var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + h(doc.title) + '</title>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,600;0,700;1,400&display=swap">' +
    '<style>@page{size:A4 ' + (land ? 'landscape' : 'portrait') + ';margin:8mm}' + PRINT_CSS + '</style></head><body class="' + (land ? 'land' : 'port') + '">' + doc.html +
    '<script>' + PRINT_FIT + '<\/script></body></html>';
  var old = $('prOv'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'prOv'; ov.className = 'pr-ov';
  ov.innerHTML = '<div class="pr-bar"><i class="bi bi-printer"></i><b class="text-truncate">' + h(doc.title) + '</b>' + (doc.pages ? '<span class="tag t-info d-none d-md-inline-flex">' + doc.pages + ' หน้า</span>' : '') + '<span class="ms-auto"></span>' +
    '<button class="btn btn-brand" id="prGo"><i class="bi bi-printer"></i> พิมพ์ / บันทึกเป็น PDF</button>' +
    '<button class="btn btn-ghost" id="prTab" title="เปิดในแท็บใหม่"><i class="bi bi-box-arrow-up-right"></i><span class="d-none d-md-inline"> แท็บใหม่</span></button>' +
    '<button class="btn btn-ghost btn-icon" id="prX" title="ปิด"><i class="bi bi-x-lg"></i></button></div>' +
    '<div class="pr-hint"><i class="bi bi-info-circle"></i> กด “พิมพ์” แล้วเลือกเครื่องพิมพ์ หรือเลือก “บันทึกเป็น PDF” เพื่อเก็บเป็นไฟล์ · กระดาษ A4 ' + (land ? 'แนวนอน' : 'แนวตั้ง') + ' · ระบบย่อให้พอดี 1 หน้าอัตโนมัติ (ตั้งขนาด 100% / ค่าเริ่มต้น)</div>' +
    '<iframe id="prFrame" title="ตัวอย่างก่อนพิมพ์"></iframe>';
  document.body.appendChild(ov);
  document.body.classList.add('pr-open');
  var fr = $('prFrame');
  fr.srcdoc = html;
  var close = function () { ov.remove(); document.body.classList.remove('pr-open'); document.removeEventListener('keydown', esc); try { uiCleanupPT(); } catch (e) { } };
  var esc = function (e) { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  $('prX').addEventListener('click', close);
  $('prGo').addEventListener('click', function () {
    var w = fr.contentWindow;
    var go = function () { try { w.focus(); w.print(); } catch (e) { openTab(); } };
    var wait = function (n) { if (n <= 0 || (w.document.body && w.document.body.getAttribute('data-ready'))) go(); else setTimeout(function () { wait(n - 1); }, 150); };
    wait(40);
  });
  var openTab = function () {
    var url = URL.createObjectURL(new Blob([html.replace('</body>', '<script>addEventListener("load",function(){var t=setInterval(function(){if(document.body.getAttribute("data-ready")){clearInterval(t);print()}},200)})<\/script></body>')], { type: 'text/html' }));
    var w = window.open(url, '_blank');
    if (!w) alertBox('เบราว์เซอร์บล็อกหน้าต่างใหม่', 'กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้ หรือกดปุ่ม “พิมพ์” แทน', 'info');
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
  };
  $('prTab').addEventListener('click', openTab);
}
/** กันชั้นโปร่งใสค้างหลังพิมพ์ (บทเรียน SMC 1 ต.ค. 69) */
function uiCleanupPT() {
  if (window.Swal && !Swal.isVisible()) { $$('.swal2-container').forEach(function (x) { x.remove(); }); document.body.classList.remove('swal2-shown', 'swal2-height-auto'); }
  if (!document.querySelector('.modal.show')) { $$('.modal-backdrop').forEach(function (x) { x.remove(); }); document.body.classList.remove('modal-open'); document.body.style.overflow = ''; document.body.style.paddingRight = ''; }
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
