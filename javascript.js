/**
 * javascript.js — แกนกลางหน้าเว็บ (v2)
 *  · เรียกหลังบ้านโดยไม่ตั้ง Content-Type (ไม่มี preflight → ไม่ติด CORS)
 *  · จำกัดคำขอพร้อมกัน 4 · คำสั่งอ่านลองซ้ำได้ · คำสั่งเขียนไม่ลองซ้ำ (กันบันทึกซ้ำ)
 *  · แคช 2 ชั้น (หน่วยความจำ + localStorage แยกผู้ใช้) เปิดหน้าเห็นข้อมูลเดิมทันที
 *  · ล็อกอินรอบเดียว (withBoot) — ลดเวลารอคิวของ Google
 *  · v2: ทุกปุ่มที่บันทึก/ส่ง/สร้าง ใช้ act() — ขึ้นป๊อปอัปบอกว่ากำลังทำอะไร ใช้เวลากี่วินาที และผลเป็นอย่างไร
 */
var PT_BUILD = '2569-10-01.2';
var PT_VER = '2.2569';
var S = { token: null, me: null, boot: null, page: 'home', ym: '', unitId: '', deptId: '', nav: 0 };
var NET = { active: 0, queue: [], MAX: 4 };

/* ---------------------------------------------------------------- เครือข่าย */
/*
 * v2.5 ความเร็ว (แนวทางเดียวกับ SMC ชุด 17–19)
 *  · คิวผู้ใช้มาก่อน: คำขอที่ผู้ใช้กดแทรกหน้าคิวเสมอ · งานเบื้องหลัง (โหลดล่วงหน้า) รอจนผู้ใช้ไม่มีคำขอค้าง และวิ่งทีละ 1
 *  · หมดเวลารอ: คำขออ่าน 45 วิ (ลองใหม่ให้ 1 ครั้ง) · คำขอเขียน 120 วิ — ไม่ค้างจนต้องรีเฟรช
 */
var NET = { active: 0, queue: [], MAX: 4, bg: 0, bgQueue: [], BGMAX: 1 };
function netSlot(bg) {
  return new Promise(function (r) {
    if (bg) { if (NET.bg < NET.BGMAX) { NET.bg++; r(); } else NET.bgQueue.push(r); return; }
    if (NET.active < NET.MAX) { NET.active++; r(); } else NET.queue.unshift(r);   // คำขอล่าสุดของผู้ใช้ได้ก่อน
  });
}
function netDone(bg) {
  if (bg) { var b = NET.bgQueue.shift(); if (b) b(); else NET.bg = Math.max(0, NET.bg - 1); return; }
  var n = NET.queue.shift(); if (n) n(); else NET.active = Math.max(0, NET.active - 1);
}
function isRead(a) { return /^(get|list|bootstrap|branding|ping|ver|suggest|login|search|lookup|preload|preview|printDoc|hrmiData|excelData)/.test(a); }

function fetchOnce(action, payload, ms) {
  var ctl = window.AbortController ? new AbortController() : null, tm = null, timedOut = false;
  if (ctl) tm = setTimeout(function () { timedOut = true; ctl.abort(); }, ms || 45000);
  return fetch(API_URL, {
    method: 'POST', redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ action: action, token: S.token, payload: payload || {} })
  }).then(function (r) {
    return r.text().then(function (t) {
      clearTimeout(tm);
      if (String(t).trim().charAt(0) === '<') { var e = new Error('เซิร์ฟเวอร์ Google ไม่ว่างชั่วคราว กรุณาลองอีกครั้งในอีกสักครู่'); e.busy = true; throw e; }
      try { return JSON.parse(t); } catch (err) { throw new Error('คำตอบจากเซิร์ฟเวอร์ไม่ถูกต้อง'); }
    });
  }, function () {
    clearTimeout(tm);
    var e = new Error(timedOut ? 'เซิร์ฟเวอร์ Google ตอบช้าผิดปกติ (เกิน ' + Math.round((ms || 45000) / 1000) + ' วินาที) — กรุณาลองใหม่อีกครั้ง' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบอินเทอร์เน็ต แล้วลองใหม่');
    e.busy = true; e.timeout = timedOut; throw e;
  });
}
function rawCall(action, payload, bg) {
  var read = isRead(action), waits = read ? (bg ? [1500] : [800, 2000]) : [], tries = 0;
  var attempt = function () {
    return netSlot(bg).then(function () { return fetchOnce(action, payload, read ? 45000 : 120000); })
      .then(function (x) { netDone(bg); return x; },
        function (e) {
          netDone(bg);
          if (read && tries < waits.length) {
            var w = waits[tries++];
            return new Promise(function (r) { setTimeout(r, w); }).then(attempt);
          }
          throw e;
        });
  };
  return attempt();
}

/* ---------------------------------------------------------------- แคชตามเลขรุ่นข้อมูล (v2.5) */
/*
 * ทุกคำตอบจากหลังบ้านแนบเลขรุ่นข้อมูล dv = {g: ตั้งค่า/ทะเบียน, m: {ym: ข้อมูลเดือนนั้น}}
 * ข้อมูลที่เก็บไว้ (หน่วยความจำ + localStorage แยกผู้ใช้) จำเลขรุ่นไว้ด้วย → ถ้าเลขรุ่นยังตรง = ใช้ได้ทันที ไม่ถาม Google
 * บันทึกข้อมูลเดือนใด เฉพาะข้อมูลของเดือนนั้นที่ต้องโหลดใหม่ · ถามเลขรุ่นล่าสุดทุก 60 วิ (และเมื่อกลับมาที่แท็บ) เพื่อรู้ว่ามีคนอื่นแก้
 */
var MEMO = {}, PC = 'pt3_c:', PC_MAX = 24;
var DV = { g: '', m: {} };
var MONTH_FREE = { bootstrap: 1, listEmployeesLite: 1, listUsers: 1, getAudit: 1, listArchives: 1 };
function mkey(a, p) { return a + '|' + JSON.stringify(p || {}); }
function ymOfP(p) { var y = String((p && p.ym) || ''); return /^\d{4}-\d{2}$/.test(y) ? y : thisYmJs(); }
function pcKey(k) { return PC + (S.me ? S.me.empCode : '') + ':' + k; }
function pcGet(k) { try { var v = localStorage.getItem(pcKey(k)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function pcSet(k, entry) {
  try {
    var s = JSON.stringify(entry); if (s.length > 1500000) return;
    entry.t = Date.now(); s = JSON.stringify(entry);
    try { localStorage.setItem(pcKey(k), s); }
    catch (e1) { pcTrim(Math.floor(PC_MAX / 2)); localStorage.setItem(pcKey(k), s); }
    pcTrim(PC_MAX);
  } catch (e) { }
}
function pcTrim(max) {
  try {
    var pre = PC + (S.me ? S.me.empCode : '') + ':', list = [];
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf(pre) === 0) { var t = 0; try { t = JSON.parse(localStorage.getItem(k)).t || 0; } catch (e) { } list.push([k, t]); } });
    if (list.length <= max) return;
    list.sort(function (a, b) { return a[1] - b[1]; }).slice(0, list.length - max).forEach(function (x) { localStorage.removeItem(x[0]); });
  } catch (e) { }
}
function cacheClear() {
  MEMO = {};
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PC) === 0 || k.indexOf('pt2_c:') === 0 || k.indexOf('pt_c:') === 0) localStorage.removeItem(k); }); } catch (e) { }
}
function dvLoad() {
  try {
    var v = JSON.parse(localStorage.getItem('pt3_dv:' + (S.me ? S.me.empCode : '')) || 'null');
    if (!v || !v.m) return;
    if (v.g > (DV.g || '')) DV.g = v.g;
    Object.keys(v.m).forEach(function (ym) { if (v.m[ym] > (DV.m[ym] || '')) DV.m[ym] = v.m[ym]; });
  } catch (e) { }
}
function dvSave() { try { localStorage.setItem('pt3_dv:' + (S.me ? S.me.empCode : ''), JSON.stringify(DV)); } catch (e) { } }
/** รับเลขรุ่นจากคำตอบ — รับเฉพาะเลขที่ใหม่กว่าที่รู้อยู่ (คำตอบของคำสั่งอ่านที่มาช้าไม่ทับเลขใหม่) คืน true ถ้ามีส่วนใดเปลี่ยน */
function dvSeen(dv) {
  if (!dv) return false;
  var ch = false;
  if (dv.g && dv.g > (DV.g || '')) { if (DV.g) ch = true; DV.g = dv.g; }
  Object.keys(dv.m || {}).forEach(function (ym) { if (dv.m[ym] > (DV.m[ym] || '')) { if (DV.m[ym]) ch = true; DV.m[ym] = dv.m[ym]; } });
  dvSave();
  return ch;
}
function entryOf(action, payload, data, dv) {
  var ym = ymOfP(payload);
  return { d: data, g: dv ? dv.g : '', m: MONTH_FREE[action] ? '' : (dv && dv.m ? dv.m[ym] || '' : ''), ym: ym };
}
/** ข้อมูลที่เก็บไว้ยังตรงกับเลขรุ่นล่าสุดหรือไม่ */
function entryValid(e) {
  if (!e || !e.g || !DV.g || e.g !== DV.g) return false;
  if (e.m === '') return true;
  return !!DV.m[e.ym] && e.m === DV.m[e.ym];
}
function cacheGet(k) { var e = MEMO[k]; if (!e) { e = pcGet(k); if (e) MEMO[k] = e; } return e || null; }
function cachePut(action, payload, data, dv) { var k = mkey(action, payload), e = entryOf(action, payload, data, dv); MEMO[k] = e; if (action !== 'preload') pcSet(k, e); return e; }

/**
 * api('getSchedule', {...}, {fresh:true, onCache:draw})
 *  fresh = ข้อมูลสำหรับวาดหน้า: เลขรุ่นยังตรง → ได้ทันทีไม่ถามเซิร์ฟเวอร์ · ไม่ตรง → วาดของเดิมก่อน (onCache) แล้วโหลดใหม่
 *  ผลที่มาถึงหลังผู้ใช้เปลี่ยนหน้าแล้ว จะไม่ถูกวาดทับหน้าใหม่ (กันข้อมูลหน้าเก่าโผล่)
 *  opt.force = ถามเซิร์ฟเวอร์เสมอ · opt.bg = งานเบื้องหลัง (รอคิวผู้ใช้)
 */
function api(action, payload, opt) {
  opt = opt || {};
  var k = mkey(action, payload), nav = S.nav, view = !!opt.fresh && !opt.bg;
  var hold = function (x) { return view && nav !== S.nav && !opt.keep ? new Promise(function () { }) : x; };
  if (opt.fresh && !opt.force) {
    var e = cacheGet(k);
    if (e && entryValid(e)) return Promise.resolve(e.d);
    if (e && opt.onCache) { try { opt.onCache(e.d); } catch (err) { } opt._cached = JSON.stringify(e.d); }
    if (INFLIGHT[k]) return INFLIGHT[k].then(hold);
    if (BGWAIT[k]) return BGWAIT[k].then(function () {   // ชุดโหลดล่วงหน้าที่มีหน้านี้อยู่กำลังมา — รอชุดนั้น (เล็ก ≤3 รายการ) ไม่ยิงซ้ำ
      var e2 = cacheGet(k);
      if (e2 && entryValid(e2)) return hold(e2.d);
      var o2 = {}; for (var x in opt) o2[x] = opt[x]; o2.force = true; o2.onCache = null;
      return api(action, payload, o2);
    });
  }
  if (!opt.bg) { bar(0.25); }
  var slow = opt.bg ? null : setTimeout(function () { bar(0.7); }, 1500);
  var p = rawCall(action, payload, opt.bg).then(function (res) {
    clearTimeout(slow); if (!opt.bg) bar(1);
    if (res.ok) {
      var changed = dvSeen(res.dv);
      if (opt.fresh && isRead(action) && action !== 'login' && action !== 'preload' && action !== 'ver' && action !== 'ping') cachePut(action, payload, res.data, res.dv);
      if (!isRead(action) && changed) setTimeout(dvStaleCheck, 50);
      return res.data;
    }
    if (res.error === 'SESSION_EXPIRED') { signedOut(true); throw new Error('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่'); }
    throw new Error(res.error || 'เกิดข้อผิดพลาด');
  }, function (e) { clearTimeout(slow); if (!opt.bg) bar(1); throw e; });
  if (opt.fresh) { INFLIGHT[k] = p; p.then(function () { delete INFLIGHT[k]; }, function () { delete INFLIGHT[k]; }); }
  return p.then(function (d) {
    // ข้อมูลจริงเหมือนที่วาดจากแคชแล้ว → ไม่ต้องวาดซ้ำ (กันหน้ากระพริบ)
    if (opt._cached && opt._cached === JSON.stringify(d)) return new Promise(function () { });
    return hold(d);
  });
}
var INFLIGHT = {}, BGWAIT = {};

/** ถามเลขรุ่นล่าสุด (เบามาก) — ถ้าข้อมูลของหน้าที่เปิดอยู่เปลี่ยน (มีคนอื่นแก้) โหลดหน้านั้นใหม่แบบเงียบ ๆ */
var DV_T = null;
function dvPing() {
  if (!S.me || !S.token || document.hidden) return;
  var yms = [S.ym || thisYmJs()];
  rawCall('ver', { yms: yms }, true).then(function (r) { if (r && r.ok && dvSeen(r.dv)) dvStaleCheck(); }).catch(function () { });
}
function dvStaleCheck() {
  if (!S.me || !PAGE_KEY) return;
  var e = cacheGet(PAGE_KEY);
  if (e && entryValid(e)) return;
  if (document.querySelector('.modal.show') || (window.Swal && Swal.isVisible()) || (window.POP && POP)) return;
  if (window.G && S.page === 'sched' && G.dirty && Object.keys(G.dirty).length) return;
  if (window.G && G.saving) return;
  if (typeof PAGES[S.page] === 'function' && REFRESHABLE[S.page]) {
    var y = window.scrollY, w = document.querySelector('.schedwrap'), wl = w ? w.scrollLeft : 0, wt = w ? w.scrollTop : 0;
    PAGES[S.page]();
    setTimeout(function () { window.scrollTo(0, y); var w2 = document.querySelector('.schedwrap'); if (w2) { w2.scrollLeft = wl; w2.scrollTop = wt; } }, 30);
  }
}
var PAGE_KEY = '', REFRESHABLE = { home: 1, my: 1, sched: 1, work: 1, flow: 1, report: 1, wardrep: 1 };
/** หน้าเว็บบอกว่ากำลังแสดงข้อมูลชุดไหน (ใช้ตรวจว่าล้าสมัยหรือยัง) */
function pageData(action, payload) { PAGE_KEY = mkey(action, payload); }
var DV_VIS = false;
function dvTimerStart() {
  clearInterval(DV_T);
  DV_T = setInterval(dvPing, 60000);
  if (!DV_VIS) { DV_VIS = true; document.addEventListener('visibilitychange', function () { if (!document.hidden) dvPing(); }); }
}

/* ---------------------------------------------------------------- UI พื้นฐาน */
function $(id) { return document.getElementById(id); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function h(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); }
function num(n, d) { return (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d }); }
function baht(n) { return n === null || n === undefined ? '—' : num(n) + ' ฿'; }
function bar(p) {
  var el = $('progress'); if (!el) return;
  if (p >= 1) { el.style.width = '100%'; setTimeout(function () { el.style.opacity = '0'; el.style.width = '0'; }, 250); setTimeout(function () { el.style.opacity = '1'; }, 600); }
  else { el.style.opacity = '1'; el.style.width = Math.round(p * 100) + '%'; }
}
function initials(name) {
  var s = String(name || '').replace(/^(นาย|นางสาว|นาง|น\.ส\.|นส\.|พว\.|พญ\.|นพ\.|ภก\.|ภญ\.|ดร\.)\s*/, '').trim();
  return s ? s.charAt(0) : '?';
}

/* ---------------------------------------------------------------- ป๊อปอัปแจ้งเตือน (SweetAlert2) */
var TOAST = null;
function notify(msg, icon, ms) {
  if (!window.Swal) { console.log(msg); return; }
  TOAST = TOAST || Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timerProgressBar: true, showCloseButton: true,
    didOpen: function (t) { t.addEventListener('mouseenter', Swal.stopTimer); t.addEventListener('mouseleave', Swal.resumeTimer); }
  });
  TOAST.fire({ icon: icon || 'success', title: msg, timer: ms || 3200 });
}
function toast(msg, kind, ms) { notify(msg, { ok: 'success', warn: 'warning', bad: 'error' }[kind] || (kind || 'info'), ms); }
function errToast(e) { alertBox('ทำรายการไม่สำเร็จ', (e && e.message) ? e.message : String(e), 'error'); }
function alertBox(title, text, icon, isHtml) {
  if (!window.Swal) { alert(title + '\n' + text); return Promise.resolve(); }
  return Swal.fire({ icon: icon || 'info', title: title, html: isHtml ? text : '<div style="white-space:pre-line">' + h(text) + '</div>', confirmButtonText: 'รับทราบ' });
}
/** ถามยืนยัน — คืน Promise<boolean> */
function confirmX(o) {
  return Swal.fire({
    icon: o.icon || (o.danger ? 'warning' : 'question'), title: o.title, html: o.html || '',
    showCancelButton: true, confirmButtonText: o.ok || 'ยืนยัน', cancelButtonText: o.cancel || 'ยกเลิก', reverseButtons: true, focusCancel: !!o.danger,
    customClass: o.danger ? { confirmButton: 'swal-danger' } : {}
  }).then(function (r) { return !!r.isConfirmed; });
}
/** ขอรหัสผ่านซ้ำ (+เหตุผลถ้าต้องการ) — คืน Promise<{password, reason}|null> */
function askPassword(title, html, o) {
  o = o || {};
  return Swal.fire({
    icon: 'warning', title: title,
    html: '<div style="text-align:left">' + (html || '') +
      (o.reason ? '<label class="form-label mt-3">' + h(o.reasonLabel || 'เหตุผล') + '</label><textarea id="swR" class="form-control" rows="2" placeholder="' + h(o.reasonHint || '') + '"></textarea>' : '') +
      '<label class="form-label mt-3"><i class="bi bi-shield-lock"></i> ยืนยันด้วยรหัสผ่านของท่าน</label><input id="swP" type="password" class="form-control" autocomplete="current-password"></div>',
    showCancelButton: true, confirmButtonText: o.ok || 'ยืนยัน', cancelButtonText: 'ยกเลิก', reverseButtons: true,
    didOpen: function () { setTimeout(function () { var el = $(o.reason ? 'swR' : 'swP'); if (el) el.focus(); }, 80); },
    preConfirm: function () {
      var pw = $('swP').value, rs = o.reason ? $('swR').value.trim() : '';
      if (o.reason && !rs) { Swal.showValidationMessage('กรุณาระบุเหตุผล'); return false; }
      if (!pw) { Swal.showValidationMessage('กรุณาใส่รหัสผ่าน'); return false; }
      return { password: pw, reason: rs };
    }
  }).then(function (r) { return r.isConfirmed ? r.value : null; });
}

/**
 * act() — ทำรายการที่เปลี่ยนข้อมูล พร้อมป๊อปอัปบอกสถานะตลอดเวลา
 * o = {action, payload, title, text, icon, steps:[], done:'ข้อความ'|fn(r)→string|{title,html,icon}, quiet:true (แสดงผลเป็น toast)}
 * คืน Promise ของผลลัพธ์ (ถ้าผิดพลาด แสดงกล่องข้อผิดพลาดให้แล้ว และ reject ด้วย error เดิม)
 */
var BUSY = null;
function busyOpen(o) {
  var steps = o.steps || [];
  var t0 = Date.now();
  Swal.fire({
    html: '<div class="busy"><div class="busy-orb"><i class="rg"></i><i class="rg r2"></i><i class="rg r3"></i><div class="ic"><i class="bi ' + (o.icon || 'bi-cloud-arrow-up') + '"></i></div></div>' +
      '<b>' + h(o.title || 'กำลังดำเนินการ…') + '</b>' + (o.text ? '<div class="bt">' + o.text + '</div>' : '') +
      (steps.length ? '<ol class="bs">' + steps.map(function (s, i) { return '<li data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '>' + h(s) + '</li>'; }).join('') + '</ol>' : '') +
      '<div class="bb"><i></i></div><small>ใช้เวลาไปแล้ว <span class="el" id="busyEl">0</span> วินาที · <span id="busyHint">กรุณารอสักครู่ อย่าปิดหน้านี้</span></small></div>',
    showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, width: 440,
    didOpen: function () {
      var i = 0;
      BUSY = setInterval(function () {
        var s = Math.floor((Date.now() - t0) / 1000), el = $('busyEl');
        if (el) el.textContent = s;
        if (s === 8 && $('busyHint')) $('busyHint').textContent = 'เซิร์ฟเวอร์ Google กำลังประมวลผล (ปกติไม่เกิน 30 วินาที)';
        if (steps.length && s > 0 && s % 2 === 0 && i < steps.length - 1) {
          var li = document.querySelector('.busy .bs li[data-i="' + i + '"]'); if (li) { li.className = 'done'; }
          i++; var nx = document.querySelector('.busy .bs li[data-i="' + i + '"]'); if (nx) nx.className = 'on';
        }
      }, 1000);
    }
  });
}
function busyClose() { if (BUSY) { clearInterval(BUSY); BUSY = null; } }
function act(o) {
  busyOpen(o);
  return api(o.action, o.payload || {}).then(function (r) {
    busyClose();
    var d = typeof o.done === 'function' ? o.done(r) : o.done;
    if (d === false) { Swal.close(); return r; }
    if (d && typeof d === 'object') {
      return Swal.fire({ icon: d.icon || 'success', title: d.title || 'เรียบร้อย', html: d.html || '', confirmButtonText: d.ok || 'ตกลง', timer: d.timer, timerProgressBar: !!d.timer }).then(function () { return r; });
    }
    if (o.quiet) { Swal.close(); notify(d || 'บันทึกเรียบร้อย', 'success'); return r; }
    return Swal.fire({ icon: 'success', title: d || 'บันทึกเรียบร้อย', html: o.doneHtml ? o.doneHtml(r) : '', showConfirmButton: false, timer: 1500, timerProgressBar: true }).then(function () { return r; });
  }, function (e) {
    busyClose();
    var msg = (e && e.message) ? e.message : String(e);
    return Swal.fire({
      icon: 'error', title: o.failTitle || 'ทำรายการไม่สำเร็จ',
      html: '<div style="white-space:pre-line">' + h(msg) + '</div>' + (e && e.busy ? '<div class="small-muted mt-2">ระบบยังไม่ได้บันทึกรายการนี้ กดลองใหม่ได้เลย</div>' : ''),
      confirmButtonText: 'รับทราบ'
    }).then(function () { throw e; });
  });
}

/* ---------------------------------------------------------------- ธีม */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-bs-theme', t);
  try { localStorage.setItem('pt_theme', t); } catch (e) { }
  var b = $('btnTheme');
  if (b) b.innerHTML = t === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
}
function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }

/* ---------------------------------------------------------------- เมนู */
var MENU = [
  { grp: 'ภาพรวม' },
  { id: 'home', name: 'หน้าแรก', icon: 'bi-grid-1x2', roles: '*', crumb: 'ภาพรวม' },
  { id: 'my', name: 'เวรของฉัน', icon: 'bi-person-badge', roles: '*', crumb: 'ภาพรวม' },
  { grp: 'จัดตารางเวร' },
  { id: 'sched', name: 'ตารางเวร', icon: 'bi-calendar3-week', roles: '*', crumb: 'จัดตารางเวร' },
  { id: 'work', name: 'ตรวจการปฏิบัติงาน', icon: 'bi-fingerprint', roles: 'HEAD,CHIEF,ADMIN', crumb: 'จัดตารางเวร' },
  { id: 'flow', name: 'ส่งตรวจ / อนุมัติ', icon: 'bi-patch-check', roles: 'HEAD,CHIEF,ADMIN', crumb: 'จัดตารางเวร' },
  { grp: 'เอกสารและรายงาน' },
  { id: 'docs', name: 'เอกสารและไฟล์ HRMi', icon: 'bi-file-earmark-arrow-down', roles: 'HEAD,CHIEF,ADMIN', crumb: 'เอกสารและรายงาน' },
  { id: 'report', name: 'รายงานติดตาม', icon: 'bi-clipboard2-pulse', roles: 'HEAD,CHIEF,ADMIN', crumb: 'เอกสารและรายงาน' },
  { id: 'wardrep', name: 'รายงานหน่วยปฏิบัติงาน', icon: 'bi-diagram-3', roles: 'HEAD,CHIEF,ADMIN', crumb: 'เอกสารและรายงาน' },
  { grp: 'จัดการระบบ' },
  { id: 'users', name: 'ผู้ใช้และสิทธิ์', icon: 'bi-people', roles: 'CHIEF,ADMIN', crumb: 'จัดการระบบ' },
  { id: 'setup', name: 'ตั้งค่าและข้อมูลหลัก', icon: 'bi-sliders', roles: 'CHIEF,ADMIN', crumb: 'จัดการระบบ' },
  { id: 'data', name: 'นำเข้าข้อมูล / งานระบบ', icon: 'bi-database-gear', roles: 'ADMIN', crumb: 'จัดการระบบ' },
  { id: 'audit', name: 'ประวัติการใช้งาน', icon: 'bi-clock-history', roles: 'CHIEF,ADMIN', crumb: 'จัดการระบบ' },
  { grp: 'ช่วยเหลือ' },
  { id: 'guide', name: 'คู่มือการใช้งาน', icon: 'bi-journal-richtext', roles: '*', crumb: 'ช่วยเหลือ' }
];
function canSee(m) {
  if (m.roles === '*') return true;
  var want = m.roles.split(',');
  return (S.me.roles || []).some(function (r) { return want.indexOf(r) >= 0; });
}
function drawMenu() {
  var html = '', pendingG = null;
  MENU.forEach(function (m) {
    if (m.grp) { pendingG = m.grp; return; }
    if (!canSee(m)) return;
    if (pendingG) { html += '<div class="nav-g">' + h(pendingG) + '</div>'; pendingG = null; }
    html += '<a class="nav-i" href="#' + m.id + '" data-pg="' + m.id + '" title="' + h(m.name) + '"><i class="bi ' + m.icon + '"></i><span>' + h(m.name) + '</span></a>';
  });
  $('nav').innerHTML = html; $('nav2').innerHTML = html;
  $$('.nav-i[data-pg]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault(); go(a.dataset.pg);
      var oc = bootstrap.Offcanvas.getInstance($('ocNav')); if (oc) oc.hide();
    });
  });
}
function go(id) {
  if (!PAGES[id]) id = 'home';
  var m = MENU.filter(function (x) { return x.id === id; })[0];
  if (m && !canSee(m)) id = 'home', m = MENU.filter(function (x) { return x.id === 'home'; })[0];
  S.page = id; S.nav = (S.nav || 0) + 1; PAGE_KEY = '';
  try { if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id); } catch (e) { }
  $$('.nav-i[data-pg]').forEach(function (a) { a.classList.toggle('on', a.dataset.pg === id); });
  $('topTitle').textContent = m ? m.name : '';
  $('topCrumb').textContent = 'ตารางเวร PT · ' + (m ? m.crumb : '');
  document.title = (m ? m.name + ' · ' : '') + 'ตารางเวร Part Time';
  $('topExtra').innerHTML = '';
  $('view').innerHTML = skeletonPage();
  closePop();
  window.scrollTo(0, 0);
  try { PAGES[id](); } catch (e) { console.error(e); errToast(e); }
}
function skeletonPage() {
  return '<div class="sk-page"><div class="sk-card"><div class="d-flex gap-3 align-items-center"><div class="skeleton" style="width:54px;height:54px;border-radius:17px"></div>' +
    '<div class="flex-grow-1"><div class="skeleton" style="height:1.3em;width:36%"></div><div class="skeleton" style="height:.9em;width:62%;margin-top:.6rem"></div></div></div></div>' +
    '<div class="stats">' + [1, 2, 3, 4].map(function () { return '<div class="sk-card"><div class="skeleton" style="height:1.6em;width:50%"></div><div class="skeleton" style="height:.8em;width:75%;margin-top:.6rem"></div></div>'; }).join('') + '</div>' +
    '<div class="sk-card"><div class="skeleton" style="height:12em"></div></div></div>';
}

/* ---------------------------------------------------------------- เข้า/ออกระบบ */
function showView(v) {
  $('vLogin').hidden = v !== 'login';
  $('vForce').hidden = v !== 'force';
  $('vApp').hidden = v !== 'app';
}
function signedOut(expired) {
  S.token = null; cacheClear(); S.me = null; PRE.run++; DV = { g: '', m: {} }; PAGE_KEY = ''; clearInterval(DV_T);
  try { localStorage.removeItem('pt_token'); } catch (e) { }
  if (window.Swal) Swal.close();
  $('lgWait').hidden = true; $('fLogin').hidden = false;
  showView('login');
  if (expired) $('lgMsg').innerHTML = '<div class="note warn mb-3"><i class="bi bi-hourglass-bottom"></i><div>หมดเวลาการใช้งาน หรือบัญชีถูกปรับสิทธิ์ กรุณาเข้าสู่ระบบใหม่</div></div>';
}
function roleName(r) {
  var x = ((S.boot && S.boot.roles) || []).filter(function (o) { return o.role === r; })[0];
  return x ? x.name : ({ STAFF: 'บุคลากร', HEAD: 'หัวหน้าหน่วย / ผู้บันทึก', CHIEF: 'หัวหน้าฝ่าย', ADMIN: 'ผู้ดูแลระบบ / HR' })[r] || r;
}
function topRole(roles) {
  var order = ['ADMIN', 'CHIEF', 'HEAD', 'STAFF'];
  for (var i = 0; i < order.length; i++) if ((roles || []).indexOf(order[i]) >= 0) return order[i];
  return 'STAFF';
}
function afterLogin(r) {
  S.token = r.token;
  try { localStorage.setItem('pt_token', r.token); localStorage.setItem('pt_who', r.boot.me.empCode); } catch (e) { }
  S.boot = r.boot; S.me = r.boot.me; S.ym = S.ym || r.boot.ym;
  dvLoad();
  if (r.dv) dvSeen(r.dv);
  pcSet('__boot', { d: r.boot, g: DV.g || '' });
  if (r.first) cachePut(r.first.action, r.first.payload, r.first.data, r.dv);
  if (r.mustChange || S.me.mustChange) { showForce(); return; }
  enterApp();
}
function enterApp() {
  var me = S.me, b = S.boot;
  $('meName').textContent = me.name || me.empCode;
  $('meRole').textContent = roleName(topRole(me.roles));
  $('meAv').textContent = initials(me.name);
  $('verTxt').textContent = 'เวอร์ชัน ' + b.app.version + ' build ' + b.app.build + ' (' + b.app.buildTh + ')';
  $('annApp').innerHTML = '';
  startPreload(S.ym || b.ym);   // v2.5: โหลดหน้าอื่นเบื้องหลังทีละชุดเล็ก ไม่ขวางการใช้งาน
  dvTimerStart();
  if (b.app.build !== PT_BUILD) {
    $('annApp').innerHTML = '<div class="ver-bar"><i class="bi bi-exclamation-triangle"></i> หน้าเว็บเป็น build ' + h(PT_BUILD) + ' แต่ระบบหลังบ้านเป็น build ' + h(b.app.build) +
      ' — กรุณาแจ้งผู้ดูแลระบบให้ Deploy หลังบ้านเวอร์ชันใหม่ (Manage deployments › Edit › New version)</div>';
  }
  drawMenu();
  showView('app');
  var want = (location.hash || '').replace('#', '');
  go(PAGES[want] ? want : 'home');
}

function loginSteps(n) {
  $$('#lgSteps li').forEach(function (li) { var s = +li.dataset.s; li.className = s < n ? 'done' : s === n ? 'on' : ''; });
  $('lgBar').style.width = Math.min(100, n * 30) + '%';
}
function doLogin(ev) {
  if (ev) ev.preventDefault();
  var code = $('lgCode').value.trim(), pw = $('lgPw').value;
  if (!code || !pw) {
    $('lgMsg').innerHTML = '<div class="note warn mb-3"><i class="bi bi-exclamation-circle"></i><div>กรุณากรอกรหัสพนักงานและรหัสผ่าน</div></div>';
    (!code ? $('lgCode') : $('lgPw')).focus(); return;
  }
  $('lgMsg').innerHTML = '';
  try { if ($('lgRem').checked) localStorage.setItem('pt_code', code); else localStorage.removeItem('pt_code'); } catch (e) { }
  $('lgWait').hidden = false; $('lgBtn').disabled = true; loginSteps(1);
  var t2 = setTimeout(function () { loginSteps(2); }, 1400), t3 = setTimeout(function () { loginSteps(3); }, 3200);
  api('login', { empCode: code, password: pw, withBoot: true, ym: S.ym || '' })
    .then(function (r) { clearTimeout(t2); clearTimeout(t3); loginSteps(4); $('lgPw').value = ''; setTimeout(function () { $('lgWait').hidden = true; afterLogin(r); }, 250); })
    .catch(function (e) {
      clearTimeout(t2); clearTimeout(t3); $('lgWait').hidden = true;
      $('lgMsg').innerHTML = '<div class="note bad mb-3"><i class="bi bi-x-octagon"></i><div>' + h(e.message) + '</div></div>';
      $('lgPw').select();
    })
    .then(function () { $('lgBtn').disabled = false; });
}
function tryResume() {
  var t = null; try { t = localStorage.getItem('pt_token'); } catch (e) { }
  if (!t) { showView('login'); return; }
  S.token = t;
  $('view').innerHTML = skeletonPage();
  // v2.5: เปิดแอปทันทีจากข้อมูลตั้งต้นที่เก็บไว้ในเครื่อง แล้วตรวจกับเซิร์ฟเวอร์ตามหลัง (รีเฟรชหน้าไม่ต้องรอ Google)
  var who = ''; try { who = localStorage.getItem('pt_who') || ''; } catch (e) { }
  var cb = null;
  if (who) { S.me = { empCode: who }; cb = pcGet('__boot'); dvLoad(); }
  var started = false;
  if (cb && cb.d && cb.d.me && cb.d.me.empCode === who) { started = true; afterLogin({ token: t, boot: cb.d, resumed: true }); }
  api('bootstrap', {}).then(function (b) {
    if (!started) { afterLogin({ token: t, boot: b }); return; }
    var same = JSON.stringify(b) === JSON.stringify(S.boot);
    S.boot = b; S.me = b.me; pcSet('__boot', { d: b, g: DV.g || '' });
    if (!same) { drawMenu(); dvStaleCheck(); }
    dvPing();
  }).catch(function (e) { if (!started || /หมดเวลา/.test(e && e.message)) signedOut(!!started); });
}
function forgotPw() {
  alertBox('ลืมรหัสผ่าน',
    '<div style="text-align:left;line-height:1.8">ติดต่อผู้ที่รีเซ็ตรหัสผ่านให้ท่านได้:<ul class="mt-2 mb-2"><li><b>หัวหน้าฝ่าย</b>ของท่าน (หน้า ผู้ใช้และสิทธิ์ › รีเซ็ตรหัส)</li><li><b>งานบริหารเงินเดือน ค่าจ้าง และค่าตอบแทน</b> ฝ่ายทรัพยากรบุคคล</li></ul>' +
    'หลังรีเซ็ต รหัสผ่านจะกลับเป็น <b>รหัสพนักงาน</b> และระบบจะให้ตั้งรหัสใหม่ทันทีที่เข้าใช้</div>', 'info', true);
}

/* ---------------------------------------------------------------- ตั้งรหัสผ่านครั้งแรก */
var FC = { pw: '', old: '' };
function showForce() {
  showView('force');
  $('fcWho').textContent = (S.me.name || '') + ' · รหัส ' + S.me.empCode;
  $('fPw').hidden = false; $('fPhone').hidden = true;
  $('fcS1').className = 'on'; $('fcS2').className = '';
  setTimeout(function () { $('fcOld').focus(); }, 100);
}
function pwScore(p) {
  var s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p) || p.length < 8) s = Math.min(s, 1);
  return s;
}
function wireForce() {
  $('fcNew').addEventListener('input', function () {
    var s = pwScore(this.value), w = [8, 22, 48, 70, 88, 100][s], c = ['#d63447', '#d63447', '#f59e0b', '#14b8a6', '#10915f', '#10915f'][s];
    $('pwMeter').style.width = (this.value ? w : 0) + '%'; $('pwMeter').style.background = c;
    $('pwHint').textContent = !this.value ? 'ความแข็งแรงของรหัสผ่าน' : ['อ่อนมาก — ต้องมีตัวอักษรอังกฤษและตัวเลข อย่างน้อย 8 ตัว', 'อ่อน — ต้องมีตัวอักษรอังกฤษและตัวเลข อย่างน้อย 8 ตัว', 'พอใช้', 'ดี', 'แข็งแรง', 'แข็งแรงมาก'][s];
  });
  $('fPw').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = $('fcOld').value, b = $('fcNew').value, c = $('fcNew2').value;
    var err = !a ? 'กรุณากรอกรหัสผ่านปัจจุบัน' : b.length < 8 ? 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร' : (!/[A-Za-z]/.test(b) || !/\d/.test(b)) ? 'รหัสผ่านใหม่ต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข' :
      b === S.me.empCode ? 'รหัสผ่านใหม่ต้องไม่ใช่รหัสพนักงาน' : b !== c ? 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน' : '';
    if (err) { alertBox('ตรวจสอบรหัสผ่าน', err, 'warning'); return; }
    FC.old = a; FC.pw = b;
    $('fPw').hidden = true; $('fPhone').hidden = false; $('fcS1').className = 'done'; $('fcS2').className = 'on';
    setTimeout(function () { $('fcPhone').focus(); }, 80);
  });
  $('fPhone').addEventListener('submit', function (e) {
    e.preventDefault();
    var ph = $('fcPhone').value.replace(/[^\d]/g, '');
    if (!/^0\d{8,9}$/.test(ph)) { alertBox('เบอร์โทรไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก ขึ้นต้นด้วย 0', 'warning'); return; }
    act({ action: 'changePassword', payload: { oldPassword: FC.old, newPassword: FC.pw, phone: ph }, title: 'กำลังบันทึกรหัสผ่านใหม่', icon: 'bi-shield-lock',
      done: { title: 'ตั้งค่าบัญชีเรียบร้อย', html: 'ครั้งต่อไปให้เข้าสู่ระบบด้วยรหัสผ่านใหม่ของท่าน', ok: 'เริ่มใช้งาน' } })
      .then(function () { S.me.mustChange = false; FC = { pw: '', old: '' }; enterApp(); })
      .catch(function () { $('fPw').hidden = false; $('fPhone').hidden = true; $('fcS1').className = 'on'; $('fcS2').className = ''; });
  });
  $('fcOut').addEventListener('click', doLogout);
}

function doLogout() {
  confirmX({ title: 'ออกจากระบบ?', html: 'ข้อมูลที่ยังไม่ได้กดบันทึกจะหายไป', ok: 'ออกจากระบบ', icon: 'question' }).then(function (y) {
    if (!y) return;
    api('logout', {}).catch(function () { });
    signedOut(false);
    notify('ออกจากระบบแล้ว', 'success');
  });
}
function openChangePassword() {
  modal({
    title: 'เปลี่ยนรหัสผ่าน', icon: 'bi-key', sub: 'อย่างน้อย 8 ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข',
    body: '<div class="mb-2"><label class="form-label">รหัสผ่านเดิม</label><input type="password" class="form-control" id="pwOld" autocomplete="current-password"></div>' +
      '<div class="mb-2"><label class="form-label">รหัสผ่านใหม่</label><input type="password" class="form-control" id="pwNew" autocomplete="new-password"></div>' +
      '<div class="mb-2"><label class="form-label">ยืนยันรหัสผ่านใหม่</label><input type="password" class="form-control" id="pwNew2" autocomplete="new-password"></div>',
    okText: 'บันทึกรหัสผ่านใหม่',
    onOk: function (close) {
      var a = $('pwOld').value, b = $('pwNew').value, c = $('pwNew2').value;
      if (b !== c) { alertBox('รหัสผ่านไม่ตรงกัน', 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'warning'); return; }
      close();
      act({ action: 'changePassword', payload: { oldPassword: a, newPassword: b }, title: 'กำลังเปลี่ยนรหัสผ่าน', icon: 'bi-key', done: 'เปลี่ยนรหัสผ่านเรียบร้อย' }).catch(function () { });
    }
  });
}
function openAccount() {
  var me = S.me;
  var depts = (me.depts || []).map(function (d) { return d === '*' ? '<span class="dchip">ทุกฝ่าย</span>' : deptChip(d); }).join(' ') || '<span class="small-muted">ยังไม่ระบุ</span>';
  var units = (me.units || []).map(function (u) { return '<span class="tag t-info">' + h(unitName(u)) + '</span>'; }).join(' ') || '<span class="small-muted">—</span>';
  modal({
    title: 'บัญชีของฉัน', icon: 'bi-person-vcard', size: 'md',
    body: '<div class="sel-emp mb-3"><div class="avatar lg">' + h(initials(me.name)) + '</div><div><b style="font-size:1.1rem">' + h(me.name) + '</b><div class="small-muted">รหัส ' + h(me.empCode) + (me.hrPosition ? ' · ' + h(me.hrPosition) : '') + '</div>' +
      (me.homeWard ? '<div class="small-muted">หน่วยต้นสังกัด: ' + h(me.homeWard) + '</div>' : '') + '</div></div>' +
      '<div class="mb-2"><div class="form-label">บทบาท</div>' + (me.roles || []).map(function (r) { return '<span class="tag role-' + r + '">' + h(roleName(r)) + '</span>'; }).join(' ') + '</div>' +
      '<div class="mb-2"><div class="form-label">ฝ่าย</div>' + depts + '</div>' +
      '<div class="mb-2"><div class="form-label">หน่วยงานที่ดูแล (หัวหน้าหน่วย)</div>' + units + '</div>' +
      '<div class="note info mt-3"><i class="bi bi-info-circle"></i><div>ถ้าบทบาทหรือหน่วยงานไม่ถูกต้อง แจ้งหัวหน้าฝ่ายหรือผู้ดูแลระบบให้ปรับได้ที่หน้า “ผู้ใช้และสิทธิ์” — มีผลทันทีไม่ต้องออกจากระบบ</div></div>',
    okText: 'เปลี่ยนรหัสผ่าน', cancelText: 'ปิด',
    onOk: function (close) { close(); setTimeout(openChangePassword, 250); }
  });
}

/* ---------------------------------------------------------------- เริ่มทำงาน */
function boot() {
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  var tick = function () {
    var d = new Date();
    if ($('lgTime')) $('lgTime').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if ($('lgDate')) $('lgDate').textContent = d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  tick(); setInterval(tick, 20000);
  $('lgVer').textContent = 'เวอร์ชัน ' + PT_VER + ' build ' + PT_BUILD;
  try { var c = localStorage.getItem('pt_code'); if (c) { $('lgCode').value = c; $('lgRem').checked = true; } } catch (e) { }

  $('fLogin').addEventListener('submit', doLogin);
  $('lgEye').addEventListener('click', function () {
    var p = $('lgPw'), on = p.type === 'password';
    p.type = on ? 'text' : 'password'; this.innerHTML = on ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>'; p.focus();
  });
  $('lgPw').addEventListener('keyup', function (e) { if (e.getModifierState) $('lgCaps').hidden = !e.getModifierState('CapsLock'); });
  $('lgForgot').addEventListener('click', function (e) { e.preventDefault(); forgotPw(); });
  wireForce();
  $('btnTheme').addEventListener('click', toggleTheme);
  $('btnHelp').addEventListener('click', function () { openHelp(S.page); });
  $('sideBtn').addEventListener('click', function () {
    document.body.classList.toggle('side-mini');
    try { localStorage.setItem('pt_side', document.body.classList.contains('side-mini') ? 'mini' : ''); } catch (e) { }
  });
  try { if (localStorage.getItem('pt_side') === 'mini') document.body.classList.add('side-mini'); } catch (e) { }
  $$('[data-act]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var x = a.dataset.act;
      var oc = bootstrap.Offcanvas.getInstance($('ocNav')); if (oc) oc.hide();
      if (x === 'logout') doLogout(); else if (x === 'password') openChangePassword(); else if (x === 'account') openAccount(); else if (x === 'theme') toggleTheme();
    });
  });
  window.addEventListener('hashchange', function () {
    var id = (location.hash || '').replace('#', '');
    if (S.me && id && id !== S.page && PAGES[id]) go(id);
  });
  window.addEventListener('beforeunload', function (e) {
    if (window.G && G.dirty && Object.keys(G.dirty).length) { e.preventDefault(); e.returnValue = ''; }
  });

  api('branding', {}).then(function (b) {
    $('connState').innerHTML = '<span class="ok"><i></i> เชื่อมต่อระบบแล้ว · เวอร์ชัน ' + h(b.version) + ' build ' + h(b.build) + '</span>';
    $('lgVer').textContent = 'เวอร์ชัน ' + b.version + ' build ' + b.build + ' (' + b.buildTh + ')';
  }).catch(function () {
    $('connState').innerHTML = '<span class="bad"><i></i> ยังเชื่อมต่อระบบหลังบ้านไม่ได้ — ตรวจลิงก์ใน config.js หรือแจ้งผู้ดูแลระบบ</span>';
  });
  tryResume();

  // ตรวจเวอร์ชันหน้าเว็บใหม่ทุก 10 นาที
  setInterval(function () {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) {
      if (v.build && v.build !== PT_BUILD && $('annApp')) {
        $('annApp').innerHTML = '<div class="ver-bar"><i class="bi bi-stars"></i> มีเวอร์ชันใหม่ (' + h(v.build) + ') <a href="#" class="btn btn-sm btn-brand" onclick="location.reload();return false"><i class="bi bi-arrow-clockwise"></i> รีเฟรชเพื่ออัปเดต</a></div>';
      }
    }).catch(function () { });
  }, 600000);
}
