/**
 * javascript.js — แกนกลางหน้าเว็บ
 *  · เรียกหลังบ้านโดยไม่ตั้ง Content-Type (ไม่มี preflight → ไม่ติด CORS)
 *  · จำกัดคำขอพร้อมกัน 4 · คำสั่งอ่านลองซ้ำได้ · คำสั่งเขียนไม่ลองซ้ำ (กันบันทึกซ้ำ)
 *  · แคช 2 ชั้น (หน่วยความจำ + localStorage แยกผู้ใช้) เปิดหน้าเห็นข้อมูลเดิมทันที
 *  · ล็อกอินรอบเดียว (withBoot) — ลดเวลารอคิวของ Google
 */
var PT_BUILD = '2569-09-29.1';
var S = { token: null, me: null, boot: null, page: 'home', ym: '', unitId: '' };
var NET = { active: 0, queue: [], MAX: 4 };

/* ---------------------------------------------------------------- เครือข่าย */
function netSlot() { return new Promise(function (r) { if (NET.active < NET.MAX) { NET.active++; r(); } else NET.queue.push(r); }); }
function netDone() { var n = NET.queue.shift(); if (n) n(); else NET.active = Math.max(0, NET.active - 1); }
function isRead(a) { return /^(get|list|bootstrap|branding|ping|suggest|login)/.test(a); }

function fetchOnce(action, payload) {
  return fetch(API_URL, {
    method: 'POST', redirect: 'follow', credentials: 'omit', cache: 'no-store',
    body: JSON.stringify({ action: action, token: S.token, payload: payload || {} })
  }).then(function (r) {
    return r.text().then(function (t) {
      if (String(t).trim().charAt(0) === '<') { var e = new Error('เซิร์ฟเวอร์ Google ไม่ว่างชั่วคราว กรุณาลองอีกครั้ง'); e.busy = true; throw e; }
      try { return JSON.parse(t); } catch (err) { throw new Error('คำตอบจากเซิร์ฟเวอร์ไม่ถูกต้อง'); }
    });
  });
}
function rawCall(action, payload) {
  var waits = [700, 1600, 3200], tries = 0, read = isRead(action);
  var slow = setTimeout(function () { bar(0.7, 'กำลังรอเซิร์ฟเวอร์…'); }, 3500);
  var attempt = function () {
    return netSlot().then(function () { return fetchOnce(action, payload); })
      .then(function (x) { netDone(); clearTimeout(slow); return x; },
        function (e) {
          netDone();
          if (read && tries < waits.length) {
            var w = waits[tries++];
            return new Promise(function (r) { setTimeout(r, w); }).then(attempt);
          }
          clearTimeout(slow); throw e;
        });
  };
  return attempt();
}

/* ---------------------------------------------------------------- แคช */
var MEMO = {}, MEMO_T = {}, PC = 'pt_c:';
function mkey(a, p) { return a + '|' + JSON.stringify(p || {}); }
function pcKey(k) { return PC + (S.me ? S.me.empCode : '') + ':' + k; }
function pcGet(k) { try { var v = localStorage.getItem(pcKey(k)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function pcSet(k, d) { try { var s = JSON.stringify(d); if (s.length < 400000) localStorage.setItem(pcKey(k), s); } catch (e) { } }
function cacheClear() {
  MEMO = {}; MEMO_T = {};
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PC) === 0) localStorage.removeItem(k); }); } catch (e) { }
}

/**
 * api('getSchedule', {...}, {fresh:true, onCache:draw}) — onCache วาดของเดิมทันที แล้ว then วาดของจริง
 */
function api(action, payload, opt) {
  opt = opt || {};
  var k = mkey(action, payload);
  if (opt.fresh && opt.onCache) {
    var cd = MEMO[k] || pcGet(k);
    if (cd) { try { opt.onCache(cd); } catch (e) { } }
    if (MEMO[k] && Date.now() - MEMO_T[k] < 15000) return Promise.resolve(MEMO[k]);
  }
  if (!isRead(action)) cacheClear();
  bar(0.25);
  return rawCall(action, payload).then(function (res) {
    bar(1);
    if (res.ok) {
      if (opt.fresh) { MEMO[k] = res.data; MEMO_T[k] = Date.now(); pcSet(k, res.data); }
      return res.data;
    }
    if (res.error === 'SESSION_EXPIRED') { signedOut(); throw new Error('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่'); }
    throw new Error(res.error || 'เกิดข้อผิดพลาด');
  }, function (e) { bar(1); throw e; });
}

/* ---------------------------------------------------------------- UI พื้นฐาน */
function $(id) { return document.getElementById(id); }
function h(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); }
function num(n, d) { return (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d }); }
function bar(p, text) {
  var el = $('progress'); if (!el) return;
  if (p >= 1) { el.style.width = '100%'; setTimeout(function () { el.style.opacity = '0'; el.style.width = '0'; }, 220); setTimeout(function () { el.style.opacity = '1'; }, 500); }
  else { el.style.opacity = '1'; el.style.width = Math.round(p * 100) + '%'; }
  if (text) toast(text, 'warn', 1800);
}
function toast(msg, kind, ms) {
  var box = $('toast'), d = document.createElement('div');
  d.className = kind || '';
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(function () { d.remove(); }, ms || 3600);
}
function errToast(e) { toast((e && e.message) ? e.message : String(e), 'bad', 6000); }

/* ---------------------------------------------------------------- ธีม */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('pt_theme', t); } catch (e) { }
  var b = $('btnTheme');
  if (b) b.innerHTML = t === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
}
function initTheme() {
  var t = null;
  try { t = localStorage.getItem('pt_theme'); } catch (e) { }
  if (!t) t = (window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches) ? 'dark' : 'light';
  applyTheme(t);
}

/* ---------------------------------------------------------------- เมนู */
var MENU = [
  { id: 'home', name: 'หน้าแรก', icon: 'bi-house', roles: '*' },
  { id: 'my', name: 'เวรของฉัน', icon: 'bi-person-badge', roles: '*' },
  { grp: 'จัดตารางเวร' },
  { id: 'sched', name: 'ตารางเวร', icon: 'bi-calendar3', roles: '*' },
  { id: 'work', name: 'ตรวจการปฏิบัติงาน', icon: 'bi-fingerprint', roles: 'HEAD,CHIEF,ADMIN' },
  { id: 'flow', name: 'ส่งตรวจ / อนุมัติ', icon: 'bi-patch-check', roles: 'HEAD,CHIEF,ADMIN' },
  { grp: 'เอกสารและรายงาน' },
  { id: 'docs', name: 'เอกสารและไฟล์ HRMi', icon: 'bi-file-earmark-arrow-down', roles: 'HEAD,CHIEF,ADMIN' },
  { id: 'report', name: 'รายงานติดตาม', icon: 'bi-clipboard-data', roles: 'HEAD,CHIEF,ADMIN' },
  { id: 'wardrep', name: 'รายงานหน่วยปฏิบัติงาน', icon: 'bi-diagram-3', roles: 'HEAD,CHIEF,ADMIN' },
  { grp: 'ตั้งค่าระบบ' },
  { id: 'setup', name: 'ตั้งค่าและข้อมูลหลัก', icon: 'bi-sliders', roles: 'CHIEF,ADMIN' },
  { id: 'users', name: 'ผู้ใช้และสิทธิ์', icon: 'bi-people', roles: 'ADMIN' },
  { id: 'data', name: 'นำเข้าข้อมูล / คลัง', icon: 'bi-database', roles: 'ADMIN' },
  { id: 'audit', name: 'ประวัติการใช้งาน', icon: 'bi-clock-history', roles: 'CHIEF,ADMIN' }
];
function canSee(m) {
  if (m.roles === '*') return true;
  var want = m.roles.split(',');
  return (S.me.roles || []).some(function (r) { return want.indexOf(r) >= 0; });
}
function drawMenu() {
  var html = '';
  MENU.forEach(function (m) {
    if (m.grp) { html += '<div class="grp">' + h(m.grp) + '</div>'; return; }
    if (!canSee(m)) return;
    html += '<a href="#' + m.id + '" data-pg="' + m.id + '"><i class="bi ' + m.icon + '"></i>' + h(m.name) + '</a>';
  });
  $('menu').innerHTML = html;
  Array.prototype.forEach.call($('menu').querySelectorAll('a'), function (a) {
    a.addEventListener('click', function (ev) { ev.preventDefault(); go(a.dataset.pg); });
  });
}
function go(id) {
  if (!PAGES[id]) id = 'home';
  S.page = id;
  try { location.hash = id; } catch (e) { }
  Array.prototype.forEach.call($('menu').querySelectorAll('a'), function (a) { a.classList.toggle('on', a.dataset.pg === id); });
  var m = MENU.filter(function (x) { return x.id === id; })[0];
  $('pgTitle').textContent = m ? m.name : '';
  $('topExtra').innerHTML = '';
  $('page').innerHTML = '<div class="card"><div class="skeleton" style="height:1.4em;width:40%"></div><div class="skeleton" style="height:1em;width:70%;margin-top:.6rem"></div></div>';
  closeSide();
  try { PAGES[id](); } catch (e) { errToast(e); }
}
function closeSide() {
  $('side').classList.remove('open');
  var b = document.querySelector('.backdrop'); if (b) b.remove();
}

/* ---------------------------------------------------------------- เข้า/ออกระบบ */
function showLogin() { $('app').style.display = 'none'; $('login').hidden = false; }
function showApp() { $('login').hidden = true; $('app').style.display = 'block'; }
function signedOut() {
  S.token = null; S.me = null; cacheClear();
  try { localStorage.removeItem('pt_token'); } catch (e) { }
  showLogin();
}
function afterLogin(r) {
  S.token = r.token;
  try { localStorage.setItem('pt_token', r.token); } catch (e) { }
  S.boot = r.boot; S.me = r.boot.me; S.ym = r.boot.ym;
  if (r.first) { var k = mkey(r.first.action, r.first.payload); MEMO[k] = r.first.data; MEMO_T[k] = Date.now(); }
  $('meName').textContent = S.me.name || S.me.empCode;
  $('meRole').textContent = (S.me.roles || []).map(roleName).join(' · ');
  $('verTxt').textContent = 'เวอร์ชัน ' + r.boot.app.version + ' build ' + r.boot.app.build + ' (' + r.boot.app.buildTh + ')';
  if (r.boot.app.build !== PT_BUILD) {
    $('verbar').hidden = false;
    $('verbar').textContent = 'หน้าเว็บเป็น build ' + PT_BUILD + ' แต่ระบบหลังบ้านเป็น build ' + r.boot.app.build + ' — กรุณาแจ้งผู้ดูแลระบบให้ Deploy เวอร์ชันใหม่';
  }
  drawMenu();
  showApp();
  var want = (location.hash || '').replace('#', '');
  go(PAGES[want] ? want : 'home');
  if (r.mustChange) openChangePassword(true);
}
function roleName(r) {
  return ({ STAFF: 'บุคลากร', HEAD: 'หัวหน้าหอ/ผู้บันทึก', CHIEF: 'หัวหน้าฝ่าย', ADMIN: 'ผู้ดูแลระบบ' })[r] || r;
}

function doLogin(ev) {
  if (ev) ev.preventDefault();
  var code = $('lgCode').value.trim(), pw = $('lgPw').value;
  if (!code || !pw) { toast('กรุณากรอกรหัสพนักงานและรหัสผ่าน', 'warn'); return; }
  var btn = $('lgBtn'); btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ…';
  $('lgMsg').innerHTML = '';
  if ($('lgRem').checked) { try { localStorage.setItem('pt_code', code); } catch (e) { } }
  else { try { localStorage.removeItem('pt_code'); } catch (e) { } }
  api('login', { empCode: code, password: pw, withBoot: true, ym: '' })
    .then(afterLogin)
    .catch(function (e) {
      $('lgMsg').innerHTML = '<div class="note bad" style="margin-bottom:.8rem">' + h(e.message) + '</div>';
    })
    .then(function () { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; });
}

function tryResume() {
  var t = null; try { t = localStorage.getItem('pt_token'); } catch (e) { }
  if (!t) { showLogin(); return; }
  S.token = t;
  api('bootstrap', {}).then(function (b) {
    afterLogin({ token: t, boot: b });
  }).catch(function () { signedOut(); });
}

function openChangePassword(force) {
  modal({
    title: force ? 'ตั้งรหัสผ่านใหม่ (ครั้งแรก)' : 'เปลี่ยนรหัสผ่าน',
    body: (force ? '<div class="note" style="margin-bottom:.7rem">เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านใหม่ อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข</div>' : '') +
      '<div class="field"><label class="fl">รหัสผ่านเดิม</label><input type="password" id="pwOld"></div>' +
      '<div class="field"><label class="fl">รหัสผ่านใหม่</label><input type="password" id="pwNew"></div>' +
      '<div class="field"><label class="fl">ยืนยันรหัสผ่านใหม่</label><input type="password" id="pwNew2"></div>' +
      '<div class="field"><label class="fl">เบอร์โทรติดต่อ</label><input id="pwPhone" inputmode="tel"></div>',
    okText: 'บันทึก',
    noClose: !!force,
    onOk: function (close) {
      var a = $('pwOld').value, b = $('pwNew').value, c2 = $('pwNew2').value;
      if (b !== c2) { toast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'warn'); return; }
      api('changePassword', { oldPassword: a, newPassword: b, phone: $('pwPhone').value })
        .then(function () { toast('เปลี่ยนรหัสผ่านเรียบร้อย', 'ok'); close(); })
        .catch(errToast);
    }
  });
}

/* ---------------------------------------------------------------- เริ่มทำงาน */
function boot() {
  initTheme();
  var tick = function () {
    var d = new Date();
    if ($('lgTime')) $('lgTime').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if ($('lgDate')) $('lgDate').textContent = d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  tick(); setInterval(tick, 20000);
  $('lgVer').textContent = 'เวอร์ชัน 1.2569 build ' + PT_BUILD;
  try { var c = localStorage.getItem('pt_code'); if (c) { $('lgCode').value = c; $('lgRem').checked = true; $('lgPw').focus(); } } catch (e) { }

  $('fLogin').addEventListener('submit', doLogin);
  $('btnTheme').addEventListener('click', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  $('btnPw').addEventListener('click', function () { openChangePassword(false); });
  $('btnOut').addEventListener('click', function () {
    api('logout', {}).catch(function () { });
    signedOut();
  });
  $('btnMenu').addEventListener('click', function () {
    var s = $('side');
    s.classList.toggle('open');
    if (s.classList.contains('open')) {
      var b = document.createElement('div'); b.className = 'backdrop';
      b.addEventListener('click', closeSide);
      document.body.appendChild(b);
    } else closeSide();
  });
  window.addEventListener('hashchange', function () {
    var id = (location.hash || '').replace('#', '');
    if (id && id !== S.page && PAGES[id]) go(id);
  });

  api('branding', {}).then(function (b) {
    $('lgOwner').textContent = ' ' + b.owner;
    $('lgVer').textContent = 'เวอร์ชัน ' + b.version + ' build ' + b.build + ' (' + b.buildTh + ')';
  }).catch(function () {
    $('lgMsg').innerHTML = '<div class="note bad" style="margin-bottom:.8rem">ยังเชื่อมต่อระบบหลังบ้านไม่ได้ กรุณาตรวจลิงก์ใน config.js หรือแจ้งผู้ดูแลระบบ</div>';
  });
  tryResume();

  // ตรวจเวอร์ชันใหม่ทุก 10 นาที
  setInterval(function () {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) {
      if (v.build && v.build !== PT_BUILD) {
        $('verbar').hidden = false;
        $('verbar').innerHTML = 'มีเวอร์ชันใหม่ (' + h(v.build) + ') <a href="#" onclick="location.reload();return false">คลิกเพื่อรีเฟรช</a>';
      }
    }).catch(function () { });
  }, 600000);
}
