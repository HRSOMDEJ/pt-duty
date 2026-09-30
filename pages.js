/**
 * pages.js — หน้าใช้งานหลัก (v2): หน้าแรก · เวรของฉัน · ตารางเวร · ตรวจการปฏิบัติงาน · ส่งตรวจ/อนุมัติ · เอกสาร · รายงาน
 */
var PAGES = window.PAGES || {};
window.PAGES = PAGES;
var DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function wireYm(id, page) { $(id).addEventListener('change', function () { S.ym = this.value; startPreload(S.ym, true); PAGES[page](); }); }
function isManager() { return S.me.canEditUnits === null || (S.me.canEditUnits || []).length > 0 || S.me.isChief; }

/* ================================================================ หน้าแรก */
PAGES.home = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = ymSelect('hYm', ym);
  wireYm('hYm', 'home');
  var draw = function (d) {
    S.ym = d.ym;
    var late = d.daysLeft, hr = new Date().getHours();
    var greet = hr < 12 ? 'สวัสดีตอนเช้า' : hr < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
    var dueTxt = late < 0 ? 'เลยกำหนด ' + Math.abs(late) + ' วัน' : late === 0 ? 'ครบกำหนดวันนี้' : 'อีก ' + late + ' วัน';
    var ringP = late < 0 ? 100 : Math.max(4, Math.min(100, 100 - late / 35 * 100));
    var ringC = late < 0 ? '#ff8a9b' : late <= 3 ? '#ffd166' : '#7dffc4';
    var html = '<div class="hello"><i class="bi bi-calendar2-heart hl-ic"></i><div class="hl-row">' +
      '<div class="ring" style="--p:' + ringP + ';--c:' + ringC + '"><span>' + (late < 0 ? '!' : Math.max(0, late)) + '<small>' + (late < 0 ? 'เลยกำหนด' : 'วัน') + '</small></span></div>' +
      '<div class="flex-grow-1" style="min-width:220px"><h1>' + greet + ' คุณ' + h(String(S.me.name || '').replace(/^\S+\s/, '')) + '</h1>' +
      '<p>รอบเดือน <b>' + h(d.monthTh) + '</b> · เส้นตายส่งเอกสาร <b>' + h(thaiDate(d.due)) + '</b> (' + dueTxt + ')</p>' +
      '<div class="hl-chips"><span class="hl-chip"><i class="bi bi-person-badge"></i>' + h(roleName(topRole(S.me.roles))) + '</span>' +
      (S.me.depts || []).map(function (x) { return '<span class="hl-chip"><i class="bi bi-diagram-3"></i>' + h(deptName(x)) + '</span>'; }).join('') +
      (d.bookingOpen && d.bookingOpen.open ? '<span class="hl-chip"><i class="bi bi-unlock"></i>เปิดลงตารางเวรถึง ' + h(thaiDate(d.bookingOpen.to)) + '</span>' : '') + '</div></div>' +
      '<div class="d-flex gap-2 flex-wrap">' + (isManager() ? '<button class="btn btn-light" onclick="go(\'sched\')"><i class="bi bi-calendar3-week"></i> จัดตารางเวร</button>' : '') +
      '<button class="btn btn-light" onclick="go(\'my\')"><i class="bi bi-person-badge"></i> เวรของฉัน</button></div></div></div>';

    html += '<div class="stats">' +
      statCard('bi-calendar-check', d.totals.shifts, 'เวรทั้งหมด (' + h(d.ymTh) + ')') +
      statCard('bi-people', d.totals.people, 'บุคลากรที่ขึ้นเวร', 'acc') +
      (d.totals.amount !== null ? statCard('bi-cash-coin', d.totals.amount, 'ค่าตอบแทนรวม (บาท)', 'ok') : statCard('bi-wallet2', d.my.amount, 'ค่าตอบแทนของฉัน (บาท)', 'ok')) +
      statCard('bi-x-octagon', d.totals.red, 'รายการที่ต้องแก้ไข', d.totals.red ? 'bad' : 'ok') +
      (d.totals.pending ? statCard('bi-hourglass-split', d.totals.pending, 'เวรรอหัวหน้าหน่วยยืนยัน', 'warn') : '') +
      '</div>';

    if (d.depts.length > 1 || (d.manager && d.depts.length)) {
      html += '<div class="grid-auto anim mb-3" style="--min:280px">' + d.depts.map(function (x) {
        var pct = x.units ? Math.round(x.closed / x.units * 100) : 0;
        return '<div class="dept-card" style="--dc:' + h(x.color || deptColor(x.deptId)) + '"><h4><i class="bi bi-diagram-3-fill"></i>' + h(x.name) + '<span class="small-muted ms-auto fw-normal">' + x.units + ' หน่วยงาน</span></h4>' +
          '<div class="dm"><div><b>' + num(x.shifts) + '</b><span>เวร</span></div><div><b style="color:' + (x.red ? 'var(--bad)' : 'var(--ok)') + '">' + num(x.red) + '</b><span>ต้องแก้</span></div>' +
          '<div><b>' + (x.amount !== null ? num(x.amount) : x.submitted + '/' + x.units) + '</b><span>' + (x.amount !== null ? 'บาท' : 'ส่งตรวจแล้ว') + '</span></div></div>' +
          '<div class="prog"><i style="width:' + pct + '%"></i></div><div class="small-muted mt-1">ปิดรอบแล้ว ' + x.closed + ' จาก ' + x.units + ' หน่วยงาน · ส่งตรวจ/ตรวจแล้ว ' + x.submitted + '</div></div>';
      }).join('') + '</div>';
    }

    html += '<div class="card-x"><div class="card-h"><h3><i class="bi bi-buildings"></i> สถานะรายหน่วยงาน</h3><span class="sub">' + h(d.monthTh) + '</span>' +
      '<div class="r"><span class="small-muted">กดแถวเพื่อเปิดตาราง</span></div></div>' +
      tableBox(['หน่วยงาน', 'สถานะ', { t: 'คน', n: 1 }, { t: 'เวร', n: 1 }, { t: 'ค่าตอบแทน', n: 1 }, { t: 'ต้องแก้', n: 1 }, { t: 'ข้อสังเกต', n: 1 }, { t: 'รอยืนยัน', n: 1 }, ''],
        d.units.map(function (u) {
          return {
            _attrs: 'style="cursor:pointer" onclick="openUnit(\'' + u.unitId + '\')"',
            cells: ['<div class="fw-600">' + h(u.name) + '</div>' + deptChip(u.deptId), statusTag(u.status, u.statusTh), num(u.people), '<b>' + num(u.shifts) + '</b>' +
              (u.pos && Object.keys(u.pos).length > 1 ? '<div class="small-muted" style="white-space:nowrap">' + Object.keys(u.pos).map(function (k) { return h(k) + ' ' + num(u.pos[k]); }).join(' · ') + '</div>' : ''), u.amount === null ? '<span class="small-muted">—</span>' : num(u.amount),
              u.red ? '<span class="tag t-red">' + u.red + '</span>' : '<span class="small-muted">0</span>',
              u.orange ? '<span class="tag t-orange">' + u.orange + '</span>' : '<span class="small-muted">0</span>',
              u.pending ? '<span class="tag t-orange">' + u.pending + '</span>' : '<span class="small-muted">0</span>',
              '<button class="btn btn-sm btn-soft" onclick="event.stopPropagation();openUnit(\'' + u.unitId + '\')"><i class="bi bi-box-arrow-up-right"></i> เปิดตาราง</button>']
          };
        }), { empty: 'ยังไม่มีหน่วยงานที่เปิดใช้งาน', emptyIcon: 'bi-buildings' }) + '</div>';

    html += '<div class="card-x"><div class="card-h"><h3><i class="bi bi-person-heart"></i> เวรของฉันเดือนนี้</h3><span class="sub">' + num(d.my.shifts) + ' เวร · ' + num(d.my.amount) + ' บาท</span>' +
      '<div class="r"><button class="btn btn-sm btn-soft" onclick="go(\'my\')">ดูปฏิทินของฉัน <i class="bi bi-arrow-right"></i></button></div></div>';
    if (!d.my.rows.length) html += emptyBox('bi-calendar-plus', 'เดือนนี้ท่านยังไม่มีเวร Part Time', d.bookingOpen && d.bookingOpen.open ? 'ขณะนี้เปิดให้ลงบันทึกตารางเวร — ไปที่หน้า “เวรของฉัน”' : '');
    else html += '<div class="d-flex flex-wrap gap-2">' + d.my.rows.map(function (r) {
      var red = (r.flags || []).some(function (f) { return flagColor(f) === 'red'; });
      return '<span class="tag ' + (red ? 't-red' : r.bookStatus === 'PENDING' ? 't-orange' : 't-clo') + '" style="padding:.35rem .7rem" title="' + h(unitName(r.unitId) + (r.wardId ? ' · ' + wardName(r.wardId) : '') + ' ' + (r.shiftText || '')) + '">' +
        '<i class="bi bi-calendar-event"></i>' + thaiDate(r.date) + ' · <b>' + h(r.shiftCode) + '</b>' + (r.wardId ? ' · ' + h(wardShort(r.wardId)) : '') + '</span>';
    }).join('') + '</div>';
    html += '</div>';
    $('view').innerHTML = html;
    countUp($('view'));
  };
  var _pl = { ym: ym }; pageData('getDashboard', _pl);
  api('getDashboard', _pl, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};
function openUnit(unitId) { S.unitId = unitId; go('sched'); }

/* ================================================================ เวรของฉัน */
PAGES.my = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = ymSelect('myYm', ym);
  wireYm('myYm', 'my');
  var draw = function (d) {
    window.MYROWS = d.rows; window.MYQUOTA = d.quota || {};
    var byDay = {};
    d.rows.forEach(function (r) { (byDay[r.day] = byDay[r.day] || []).push(r); });
    var canBook = d.booking && d.booking.open && (S.me.bookUnits || []).length;
    var html = pageHead('bi-person-badge', 'เวรของฉัน · ' + d.monthTh, GUIDE.my.lead,
      canBook ? '<button class="btn btn-brand" onclick="openSelfBook(\'' + d.ym + '\')"><i class="bi bi-calendar-plus"></i> ลงบันทึกตารางเวรของฉัน</button>' : '');
    html += '<div class="stats">' + statCard('bi-calendar-check', d.total.shifts, 'เวรในเดือน ' + h(d.ymTh)) +
      statCard('bi-cash-coin', d.total.amount, 'ค่าตอบแทนรวม (บาท)', 'ok') + statCard('bi-clock-history', d.total.hours, 'ชั่วโมงรวม', 'acc') +
      statCard('bi-house-heart', h(d.me && d.me.homeWard ? d.me.homeWard : '—'), 'หน่วยต้นสังกัด (ลงเวรที่นี่ไม่ได้)', 'info', true) + '</div>';
    if (d.booking) {
      html += d.booking.open
        ? noteBox('ok', 'bi-unlock', '<b>เปิดให้ลงบันทึกตารางเวร</b> ตั้งแต่ ' + h(thaiDate(d.booking.from)) + ' ถึง ' + h(thaiDate(d.booking.to)) + (canBook ? '' : ' — แต่ยังไม่มีหน่วยงานที่ท่านลงเองได้ กรุณาแจ้งหัวหน้าฝ่ายตรวจ “ฝ่าย” ในบัญชีของท่าน'), 'mb-3')
        : noteBox('info', 'bi-calendar-range', 'ช่วงลงบันทึกตารางเวรของเดือน ' + h(d.ymTh) + ' คือ ' + h(thaiDate(d.booking.from)) + ' ถึง ' + h(thaiDate(d.booking.to)) + ' · นอกช่วงนี้กรุณาแจ้งหัวหน้าหน่วย', 'mb-3');
    }
    var first = new Date(+d.ym.slice(0, 4), +d.ym.slice(5) - 1, 1).getDay(), today = todayStr();
    var cal = '<div class="cal">' + DOW.map(function (x) { return '<div class="dh">' + x + '</div>'; }).join('');
    for (var i = 0; i < first; i++) cal += '<div class="dc pad"></div>';
    d.calendar.forEach(function (c, k) {
      var list = byDay[c.day] || [];
      var cls = c.dayType === 'SAT' || c.dayType === 'SUN' ? ' we' : (c.dayType === 'PUBHOL' || c.dayType === 'COMP' ? ' hol' : '');
      cal += '<div class="dc' + cls + (c.date === today ? ' today' : '') + (list.length ? '' : ' empty') + '" style="--d:' + k + '"><div class="dn">' + c.day + ' <small>' + DOW[c.dow] + (c.name ? ' · ' + h(c.name) : '') + '</small></div>' +
        list.map(function (r) {
          var red = r.flags.some(function (f) { return flagColor(f) === 'red'; });
          var scanIssue = r.flags.some(function (f) { return ['NO_SCAN', 'NO_IN', 'NO_OUT', 'NO_ATTACH'].indexOf(f) >= 0; });
          return '<div class="it' + (red ? ' bad' : '') + (r.bookStatus === 'PENDING' ? ' pend' : '') + '">' + shiftBadge(r.shiftCode) + ' <b>' + h(unitName(r.unitId)) + '</b>' +
            (r.wardId ? ' · <span style="color:var(--accent)">' + h(wardShort(r.wardId)) + '</span>' : '') +
            '<div class="small-muted">' + h(r.shiftText) + ' · ' + num(r.amount) + ' ฿</div>' +
            (r.scanIn || r.scanOut ? '<div class="small-muted"><i class="bi bi-fingerprint"></i> ' + h(r.scanIn || '—') + ' – ' + h(r.scanOut || '—') + '</div>' : '') +
            (r.bookStatus === 'PENDING' ? '<div class="tag t-orange mt-1"><i class="bi bi-hourglass-split"></i>รอยืนยัน</div>' : '') +
            (r.flags.filter(function (f) { return f !== 'NOT_CONF'; }).length ? '<div class="mt-1 d-flex flex-wrap gap-1">' + flagChips(r.flags.filter(function (f) { return f !== 'NOT_CONF'; })) + '</div>' : '') +
            '<div class="d-flex gap-1 mt-1">' +
            (r.bookStatus === 'PENDING' ? '<button class="btn btn-sm btn-danger-soft" onclick="cancelMine(\'' + r.id + '\')"><i class="bi bi-x-circle"></i> ยกเลิก</button>' : '') +
            '<button class="btn btn-sm ' + (scanIssue ? 'btn-soft' : 'btn-ghost') + '" onclick="attachFor(\'' + S.me.empCode + '\',\'' + r.date + '\',\'' + d.ym + '\',true)"><i class="bi bi-paperclip"></i> ' + (r.hasAttach ? 'ไฟล์แนบ' : 'แนบใบลืมสแกน') + '</button></div></div>';
        }).join('') + '</div>';
    });
    cal += '</div>';
    html += '<div class="card-x"><div class="card-h"><h3><i class="bi bi-calendar3"></i> ปฏิทินเวร</h3><span class="sub">' + d.rows.length + ' รายการ</span>' +
      '<div class="r legend mt-0"><span><i style="background:var(--day-we)"></i>เสาร์–อาทิตย์</span><span><i style="background:var(--day-hol)"></i>วันหยุด</span><span><i style="border:1.5px dashed var(--warn)"></i>รอยืนยัน</span></div></div>' +
      (d.rows.length ? '' : emptyBox('bi-calendar-plus', 'เดือนนี้ท่านยังไม่มีเวร', canBook ? 'กด “ลงบันทึกตารางเวรของฉัน” ด้านบนเพื่อเริ่มลงเวร' : '')) + cal + '</div>';
    $('view').innerHTML = html;
    countUp($('view'));
  };
  var _pl = { ym: ym }; pageData('getMySchedule', _pl);
  api('getMySchedule', _pl, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function cancelMine(id) {
  confirmX({ title: 'ยกเลิกเวรนี้?', html: 'ยกเลิกได้เฉพาะเวรที่ยังไม่ได้รับการยืนยันจากหัวหน้าหน่วย', ok: 'ยกเลิกเวร', danger: true }).then(function (y) {
    if (!y) return;
    act({ action: 'cancelBook', payload: { id: id }, title: 'กำลังยกเลิกเวร', icon: 'bi-x-circle', done: 'ยกเลิกเวรเรียบร้อย', quiet: true })
      .then(function () { PAGES.my(); }).catch(function () { });
  });
}

/** ลงบันทึกตารางเวรด้วยตนเอง — เลือกหน่วยงาน แล้วคลิกวัน เลือกเวร (+หน่วยที่ไปปฏิบัติรายวัน) */
function openSelfBook(ym) {
  var units = myUnitsFor('book');
  if (!units.length) { alertBox('ยังลงเวรเองไม่ได้', 'ยังไม่มีหน่วยงานที่ท่านลงเวรเองได้ — กรุณาแจ้งหัวหน้าฝ่ายให้ตรวจ “ฝ่าย” ในบัญชีของท่าน', 'info'); return; }
  var days = new Date(+ym.split('-')[0], +ym.split('-')[1], 0).getDate();
  var first = new Date(+ym.split('-')[0], +ym.split('-')[1] - 1, 1).getDay();
  var mine = {}; (window.MYROWS || []).forEach(function (r) { (mine[r.day] = mine[r.day] || []).push(r); });
  var picked = {};
  var unitSel = units[0].unitId;
  var lastDate = ym + '-' + ('0' + days).slice(-2);
  var codesFor = function (uid) { return codesForUnitJs(uid, lastDate); };
  var drawDays = function (root) {
    var box = root.querySelector('#sbDays'), html = DOW.map(function (x) { return '<div class="dh">' + x + '</div>'; }).join('');
    for (var i = 0; i < first; i++) html += '<div></div>';
    for (var d = 1; d <= days; d++) {
      var p = picked[d], has = mine[d];
      html += '<button type="button" class="btn btn-sm sb-day ' + (p ? 'btn-brand' : 'btn-ghost') + '" data-d="' + d + '" data-pop="1">' +
        '<b>' + d + '</b><small>' + (p ? h(p.code) + (p.wardId ? '/' + h(wardShort(p.wardId)) : '') : has ? has.map(function (r) { return r.shiftCode; }).join(',') : '&nbsp;') + '</small>' + qLeft(d) + '</button>';
    }
    box.innerHTML = html;
    var n = Object.keys(picked).length;
    root.querySelector('#sbSum').innerHTML = n ? '<i class="bi bi-check2-circle text-brand"></i> เลือกแล้ว <b>' + n + '</b> วัน: ' + Object.keys(picked).map(function (d) { return d + ' (' + picked[d].code + ')'; }).join(', ') : '<span class="small-muted">ยังไม่ได้เลือกวัน</span>';
    $$('#sbDays button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var d = +b.dataset.d, need = unitNeedWard(unitSel), cur = picked[d] || {};
        openCellPop({
          anchor: b, codes: codesFor(unitSel), date: ym + '-' + ('0' + d).slice(-2), code: cur.code || '', wardId: cur.wardId || '', needWard: need, homeWardId: S.me.homeWardId,
          title: 'วันที่ ' + d + ' ' + thaiYmJs(ym), sub: h(unitName(unitSel)) + (has = mine[d] ? ' · มีเวรอยู่แล้ว: ' + mine[d].map(function (r) { return r.shiftCode + ' ' + unitName(r.unitId); }).join(', ') : ''),
          extra: qLeft(d, true) ? '<div class="qhint"><span class="small-muted">กรอบคงเหลือของตำแหน่งท่าน:</span> ' + qLeft(d, true) + '</div>' : '',
          onPick: function (code, wardId) {
            if (code) picked[d] = { code: code, wardId: wardId || cur.wardId || '' }; else delete picked[d];
            drawDays(root);
          }
        });
      });
    });
  };
  var has;
  /** v2.5: กรอบคงเหลือของตำแหน่งตนเองรายวัน (min หน่วยงาน/ทั้งฝ่าย) */
  var qLeft = function (d, full) {
    var q = (window.MYQUOTA || {})[unitSel]; if (!q) return '';
    var parts = Object.keys(q).map(function (s) {
      var v = (q[s] || [])[d];
      if (v == null) return full ? '<span class="qh nolim">' + s + ' ∞</span>' : '';
      return '<span class="qh ' + (v < 0 ? 'hot' : v === 0 ? 'full' : 'ok') + '">' + s + (full ? ' เหลือ ' : '') + v + '</span>';
    }).filter(Boolean);
    return parts.length ? '<span class="sb-q">' + parts.join('') + '</span>' : '';
  };
  modal({
    title: 'ลงบันทึกตารางเวร ' + thaiYmJs(ym, true), icon: 'bi-calendar-plus', size: 'lg', sub: 'เวรที่ลงจะมีสถานะ “รอยืนยัน” จนกว่าหัวหน้าหน่วยจะยืนยัน',
    body: '<div class="row g-3"><div class="col-md-6"><label class="form-label">หน่วยงานที่จะลงเวร</label><select class="form-select" id="sbUnit">' + unitOptions(unitSel, units) + '</select></div>' +
      '<div class="col-md-6"><div id="sbUnitNote" class="small-muted pt-md-4"></div></div></div>' +
      '<div class="form-label mt-3">คลิกวันที่เพื่อเลือกเวร <span class="small-muted fw-normal">· ตัวเลขเล็กใต้วันที่ = กรอบคงเหลือของตำแหน่งท่าน (ช/บ/ด) · 0 = เต็ม</span></div><div id="sbDays" class="sb-days"></div>' +
      '<div id="sbSum" class="mt-3"></div>',
    okText: 'บันทึกตารางเวรของฉัน', okIcon: 'bi-save', noEnter: true,
    onOpen: function (root) {
      var note = function () {
        var u = unitObj(unitSel);
        root.querySelector('#sbUnitNote').innerHTML = (u && u.needWard ? '<i class="bi bi-geo-alt text-brand"></i> หน่วยงานนี้ต้องเลือก<b>หน่วยที่ไปปฏิบัติ</b>ของแต่ละวัน · ' : '') +
          'ช่วงเวรที่ลงได้: <b>' + h((u && u.slots || []).join(' ')) + '</b>';
      };
      root.querySelector('#sbUnit').addEventListener('change', function () { unitSel = this.value; picked = {}; note(); drawDays(root); });
      note(); drawDays(root);
    },
    onOk: function (close) {
      var items = Object.keys(picked).map(function (d) { return { day: +d, code: picked[d].code, wardId: picked[d].wardId }; });
      if (!items.length) { alertBox('ยังไม่ได้เลือกวัน', 'กรุณาคลิกวันที่และเลือกเวรอย่างน้อย 1 วัน', 'info'); return; }
      if (unitNeedWard(unitSel) && items.some(function (x) { return !x.wardId; })) { alertBox('ยังไม่ได้เลือกหน่วยที่ไปปฏิบัติ', 'หน่วยงานนี้ต้องเลือกหน่วยที่ไปปฏิบัติของทุกวัน — คลิกวันที่อีกครั้งแล้วเลือกหน่วยจากรายการ', 'warning'); return; }
      close();
      act({
        action: 'saveMyBooking', payload: { ym: ym, unitId: unitSel, items: items }, title: 'กำลังบันทึกตารางเวรของท่าน', text: items.length + ' วัน · ' + h(unitName(unitSel)), icon: 'bi-calendar-plus',
        steps: ['ตรวจรหัสเวรและหน่วยปลายทาง', 'ตรวจกฎหน่วยต้นสังกัดและเวลาทับซ้อน', 'บันทึกลงระบบ'],
        done: function (r) {
          return { title: 'บันทึก ' + r.saved + ' เวรเรียบร้อย', icon: r.warnings && r.warnings.length ? 'warning' : 'success',
            html: 'สถานะ “รอยืนยัน” จากหัวหน้าหน่วย' + (r.warnings && r.warnings.length ? '<div class="res-list mt-2">' + r.warnings.map(function (w) { return '<div class="warn"><i class="bi bi-exclamation-triangle"></i>' + h(w) + '</div>'; }).join('') + '</div>' : '') };
        }
      }).then(function () { PAGES.my(); }).catch(function () { });
    }
  });
}

/* ================================================================ ตารางเวร (หน้าหลักของระบบ) */
/*
 * v2.5 (1 ต.ค. 69)
 *  · แยกแท็บตามตำแหน่ง (RN / PN / NA …) — หน่วยงานเปิดตำแหน่งใดได้ตั้งที่ ตั้งค่า › หน่วยงาน · กรอบเวรแยกตำแหน่ง
 *  · แถวกรอบใต้ตาราง 2 แถวต่อช่วงเวร: หน่วยนี้ / ทั้งฝ่าย — ตัวใหญ่ = คงเหลือ · ตัวเล็ก = ใช้/กรอบ (เขียว ว่าง · ส้ม เต็ม · แดง เกิน)
 *  · บันทึกแบบไม่ต้องรอ: กดบันทึกแล้วลงเวรต่อได้ทันที ระบบส่งข้อมูลเบื้องหลัง · ช่องที่บันทึกไม่ผ่านกลับเป็นช่องที่ต้องแก้พร้อมเหตุผล
 *  · ดึงรายชื่อจากเดือนก่อน (เฉพาะชื่อ ไม่ดึงเวร ไม่ทับข้อมูลที่บันทึกแล้ว)
 *  · แนบใบลืมสแกนจากช่องเวรได้เลย (ตามสิทธิ์: หัวหน้าหน่วย/หัวหน้าฝ่ายแนบให้บุคลากรได้)
 */
var G = { data: null, dirty: {}, ym: '', unitId: '', pos: '', rows: [], saving: null, queued: false, bad: {} };
var SCAN_FLAGS = ['NO_SCAN', 'NO_IN', 'NO_OUT', 'SCAN_LATE', 'SCAN_EARLY', 'HOURS_SHORT', 'NO_ATTACH'];
function schedUnits() {
  var list = myUnitsFor('manage');
  if (!list.length || !(S.me.roles || []).some(function (r) { return r !== 'STAFF'; })) {
    var book = myUnitsFor('book'); list = book.length ? book : (S.boot.units || []);
  }
  return list;
}
function dirtyCount() { return Object.keys(G.dirty || {}).length; }
function leaveGrid(fn) {
  if (!dirtyCount()) { fn(); return; }
  confirmX({ title: 'ยังไม่ได้บันทึก', html: 'มี <b>' + dirtyCount() + '</b> ช่องที่แก้ไขแล้วยังไม่ได้บันทึก — ต้องการทิ้งการแก้ไขหรือไม่?', ok: 'ทิ้งการแก้ไข', cancel: 'กลับไปบันทึก', danger: true })
    .then(function (y) { if (y) { G.dirty = {}; G.bad = {}; fn(); } });
}
function posKey(unitId) { return 'pt_pos:' + (S.me ? S.me.empCode : '') + ':' + unitId; }
function posRemember(unitId, pos) { try { localStorage.setItem(posKey(unitId), pos); } catch (e) { } }
function posRecall(unitId) { try { return localStorage.getItem(posKey(unitId)) || ''; } catch (e) { return ''; } }
function dkey(empCode, pos, day) { return empCode + '|' + pos + '|' + day; }

PAGES.sched = function () {
  var ym = S.ym || thisYmJs();
  var units = schedUnits();
  var unitId = pickUnit(units);
  S.unitId = unitId;
  if (!unitId) { $('view').innerHTML = pageHead('bi-calendar3-week', 'ตารางเวร', GUIDE.sched.lead) + emptyBox('bi-buildings', 'ยังไม่มีหน่วยงานที่ท่านเข้าถึงได้', 'กรุณาแจ้งผู้ดูแลระบบ'); return; }
  $('topExtra').innerHTML = '<select class="sel-chip" id="gUnit" title="หน่วยงาน">' + unitOptions(unitId, units) + '</select>' + ymSelect('gYm', ym) +
    '<button class="btn btn-icon btn-ghost" id="gReload" title="โหลดใหม่จากเซิร์ฟเวอร์"><i class="bi bi-arrow-clockwise"></i></button>';
  var gu = $('gUnit'), gy = $('gYm');
  gu.addEventListener('change', function () { var v = this.value; this.value = G.unitId || v; leaveGrid(function () { S.unitId = v; PAGES.sched(); }); });
  gy.addEventListener('change', function () { var v = this.value; this.value = G.ym || v; leaveGrid(function () { S.ym = v; startPreload(v); PAGES.sched(); }); });
  $('gReload').addEventListener('click', function () { leaveGrid(function () { loadSched(true); }); });
  var payload = { ym: ym, unitId: unitId };
  pageData('getSchedule', payload);
  var loadSched = function (force) {
    api('getSchedule', payload, { fresh: true, force: !!force, onCache: drawSched }).then(drawSched).catch(errToast);
  };
  loadSched(false);
};
function drawSched(d) {
  if (dirtyCount() && G.unitId === d.unit.unitId && G.ym === d.ym) return;   // กันข้อมูลแคชทับของที่กำลังแก้
  if (S.page !== 'sched') return;
  var sameUnit = G.unitId === d.unit.unitId && G.ym === d.ym;
  G.data = d; G.ym = d.ym; G.unitId = d.unit.unitId; G.dirty = {}; if (!sameUnit) G.bad = {};
  var open = (d.positions || []).filter(function (p) { return p.open || p.people; });
  var want = G.pos && sameUnit ? G.pos : posRecall(d.unit.unitId);
  if (!open.some(function (p) { return p.posId === want; })) {
    var withPeople = open.filter(function (p) { return p.people; })[0];
    want = (withPeople || open[0] || { posId: '' }).posId;
  }
  G.pos = want;
  gridBase(d);
  paintGrid(true);
}
/** ยอดกรอบของแต่ละตำแหน่งตอนโหลด (ใช้คำนวณส่วนต่างทันทีที่พิมพ์) */
function gridBase(d) {
  d._base = {};
  (d.positions || []).forEach(function (p) {
    var b = d._base[p.posId] = { 'ช': [], 'บ': [], 'ด': [] };
    d.people.forEach(function (e) {
      if (e.posId !== p.posId) return;
      Object.keys(e.cells).forEach(function (day) {
        var c = e.cells[day]; if (!c || !c.code || c.work === 'ABSENT') return;
        (parseShiftJs(c.code, d.ym + '-' + ('0' + day).slice(-2)).segs || []).forEach(function (g) { b[g.slot][day] = (b[g.slot][day] || 0) + g.quota; });
      });
    });
  });
}
/** วาดตารางใหม่ โดยคงตำแหน่งเลื่อนและช่องที่กำลังพิมพ์ไว้ */
function paintGrid(first) {
  var d = G.data; if (!d) return;
  var w0 = document.querySelector('.schedwrap'), sl = w0 ? w0.scrollLeft : 0, st = w0 ? w0.scrollTop : 0;
  var ae = document.activeElement, focus = ae && ae.dataset && ae.dataset.d ? { emp: (G.rows[+ae.dataset.r] || {}).empCode, day: ae.dataset.d } : null;
  $('view').innerHTML = renderGrid(d);
  wireGrid();
  var w = document.querySelector('.schedwrap');
  if (w && !first) { w.scrollLeft = sl; w.scrollTop = st; }
  if (dirtyCount()) recalcFoot();
  if (focus) {
    var ri = -1; G.rows.forEach(function (p, i) { if (p.empCode === focus.emp) ri = i; });
    var inp = ri >= 0 ? document.querySelector('#grid input[data-r="' + ri + '"][data-d="' + focus.day + '"]') : null;
    if (inp) inp.focus();
  }
}

function renderGrid(d) {
  var days = d.calendar.length, needWard = d.unit.needWard, today = todayStr();
  var tabs = (d.positions || []).filter(function (p) { return p.open || p.people; });
  var pos = G.pos, posObj = tabs.filter(function (p) { return p.posId === pos; })[0] || { posId: pos, name: posName(pos) };
  G.rows = d.people.filter(function (p) { return p.posId === pos; });
  var dcount = {}; Object.keys(G.dirty).forEach(function (k) { var ps = k.split('|')[1]; dcount[ps] = (dcount[ps] || 0) + 1; });
  var html = howtoBox('sched');
  html += '<div class="gbar"><div class="gu"><b>' + h(d.unit.name) + '</b><small>' + h(d.monthTh) + '</small></div>' + deptChip(d.unit.deptId) + statusTag(d.period.status, d.period.statusTh) +
    (needWard ? '<span class="tag t-acc"><i class="bi bi-geo-alt"></i>ระบุหน่วยที่ไปปฏิบัติทุกวัน</span>' : '') +
    (d.summary ? '<span class="tag t-info"><i class="bi bi-calendar-check"></i>' + num(d.summary.shifts) + ' เวร · ' + num(d.summary.amount) + ' ฿</span>' : '') +
    '<span id="gSaving"></span>' +
    '<div class="r">' +
    (d.canEdit ? '<button class="btn btn-sm btn-ghost" id="gAdd"><i class="bi bi-person-plus"></i> เพิ่มบุคลากร</button>' : '') +
    (d.canEdit ? '<button class="btn btn-sm btn-ghost" id="gPrev" title="ดึงรายชื่อ (ไม่ดึงเวร) ของตำแหน่งนี้จากเดือนก่อน"><i class="bi bi-people"></i> ดึงรายชื่อเดือนก่อน</button>' : '') +
    (d.canEdit ? '<button class="btn btn-sm btn-ghost" id="gConfirm"><i class="bi bi-check2-all"></i> ยืนยันทั้งตาราง</button>' : '') +
    '<button class="btn btn-sm btn-ghost" id="gPrint"><i class="bi bi-printer"></i> พิมพ์</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="openHelp(\'sched\')"><i class="bi bi-keyboard"></i> รหัสเวร</button>' +
    (d.canEdit ? '<button class="btn btn-sm btn-brand" id="gSave"' + (dirtyCount() ? '' : ' disabled') + '><i class="bi bi-save"></i> บันทึก' + (dirtyCount() ? ' (' + dirtyCount() + ')' : '') + '</button>' : '') +
    '</div></div>' +
    (d.period.reason ? noteBox('bad', 'bi-arrow-return-left', '<b>ข้อความจากผู้ตรวจ:</b> ' + h(d.period.reason), 'mb-2') : '') +
    (d.locked ? noteBox('info', 'bi-lock', 'รอบเดือนนี้ปิดแล้ว ดูได้อย่างเดียว', 'mb-2') : '') +
    (!d.canEdit && !d.locked && (d.period.status === 'SUBMITTED' || d.period.status === 'VERIFIED') ? noteBox('info', 'bi-hourglass-split', 'อยู่ระหว่างการตรวจ — ถ้าต้องแก้ไข ให้ผู้ตรวจกด “ส่งกลับแก้ไข” ก่อน', 'mb-2') : '');

  // แท็บตำแหน่ง
  html += '<div class="ptabs" role="tablist">' + tabs.map(function (p) {
    return '<button type="button" role="tab" data-pos="' + h(p.posId) + '"' + (p.posId === pos ? ' class="on" aria-selected="true"' : '') + '><i class="bi bi-person-badge"></i>' + h(p.name) +
      ' <span class="cnt">' + p.people + ' คน</span>' + (p.red ? ' <span class="cnt bad" title="รายการที่ต้องแก้ไข">' + p.red + '</span>' : '') +
      (dcount[p.posId] ? ' <span class="cnt dirty" title="แก้แล้วยังไม่บันทึก">' + dcount[p.posId] + '</span>' : '') + (!p.open ? ' <span class="cnt" title="หน่วยงานไม่ได้เปิดตำแหน่งนี้ (ข้อมูลเดิม)">ปิด</span>' : '') + '</button>';
  }).join('') + '<span class="pt-hint small-muted"><i class="bi bi-info-circle"></i> 1 แท็บ = 1 ตำแหน่ง · กรอบเวรนับแยกตำแหน่ง · ส่งตรวจรวมทั้งหน่วยงาน</span></div>';

  if (!G.rows.length && d.canEdit) {
    html += '<div class="note acc mb-2 d-flex align-items-center gap-2 flex-wrap"><i class="bi bi-people"></i><div class="flex-grow-1">ตาราง <b>' + h(posObj.name) + '</b> เดือนนี้ยังไม่มีรายชื่อ — ดึงรายชื่อชุดเดิมจากเดือน <b>' + h(thaiYmJs(prevYmJs(d.ym))) + '</b> มาได้เลย ไม่ต้องเพิ่มทีละคน</div>' +
      '<button class="btn btn-sm btn-brand" onclick="pullPrev()"><i class="bi bi-people"></i> ดึงรายชื่อเดือนก่อน</button></div>';
  }

  html += '<div class="schedwrap"><table class="sched" id="grid"><thead><tr><th class="nmh">' + h(posObj.name) + ' <small>' + G.rows.length + ' คน</small></th>';
  d.calendar.forEach(function (c) {
    var cls = c.dayType === 'SAT' || c.dayType === 'SUN' ? ' we' : (c.dayType === 'PUBHOL' ? ' hol' : c.dayType === 'COMP' ? ' comp' : '');
    html += '<th class="day' + cls + (c.date === today ? ' today' : '') + '" title="' + h(c.name || '') + '">' + c.day + '<small>' + DOW[c.dow] + '</small></th>';
  });
  html += '<th class="toth">รวม</th></tr></thead><tbody>';
  G.rows.forEach(function (p, ri) {
    var mis = p.regPosId && p.regPosId !== p.posId;
    html += '<tr data-emp="' + p.empCode + '"><td class="nm"><div class="nm1" title="' + h(p.empName + ' · ' + p.empCode + (p.homeWard ? ' · สังกัด ' + p.homeWard : '')) + '"><b>' + h(p.empName) + '</b>' +
      '<small>' + h(p.empCode) + (p.homeWard ? ' · <span class="hw">' + h(p.homeWard) + '</span>' : '') + '</small>' +
      (mis ? '<span class="tag t-orange mis" title="ตำแหน่งในทะเบียน HR ไม่ตรงกับแท็บนี้ — ตรวจสอบก่อนส่งตรวจ">ทะเบียน: ' + h(posName(p.regPosId)) + '</span>' : '') + '</div></td>';
    for (var day = 1; day <= days; day++) {
      var c = p.cells[day], cal = d.calendar[day - 1];
      var cls = 'cell' + (cal.dayType === 'SAT' || cal.dayType === 'SUN' ? ' we' : (cal.dayType === 'PUBHOL' || cal.dayType === 'COMP' ? ' hol' : ''));
      var red = c && (c.flags || []).some(function (f) { return flagColor(f) === 'red'; });
      var orange = c && !red && (c.flags || []).some(function (f) { return SCAN_FLAGS.indexOf(f) < 0 && f !== 'NOT_CONF'; });
      var k = dkey(p.empCode, pos, day), bad = G.bad[k];
      if (red || bad) cls += ' bad'; else if (orange) cls += ' warn';
      if (c && c.book === 'PENDING') cls += ' pend';
      if (G.dirty[k]) cls += ' dirty';
      var wtxt = '', wcls = 'wt';
      if (c && c.code) {
        if (c.wardId) { wtxt = wardShort(c.wardId); wcls += ' set'; }
        else if (needWard) { wtxt = 'ไม่ระบุ'; wcls += ' miss'; }
      }
      var tip = c && c.flags && c.flags.length ? c.flags.map(flagText).join(' · ') : '';
      if (c && c.book === 'PENDING') tip = 'รอหัวหน้าหน่วยยืนยัน' + (tip ? ' · ' + tip : '');
      if (bad) tip = 'บันทึกไม่ผ่าน: ' + bad + (tip ? ' · ' + tip : '');
      html += '<td class="' + cls + '" id="c' + ri + '_' + day + '"' + (tip ? ' title="' + h(tip) + '"' : '') + '>' +
        '<input maxlength="14" data-r="' + ri + '" data-d="' + day + '" value="' + h(c ? c.code : '') + '"' + (d.canEdit ? '' : ' readonly') + ' aria-label="' + h(p.empName) + ' วันที่ ' + day + '" autocomplete="off" inputmode="text">' +
        '<span class="' + wcls + '" data-r="' + ri + '" data-d="' + day + '">' + h(wtxt) + '</span>' + (c && c.att ? '<i class="bi bi-paperclip att" title="มีไฟล์แนบ"></i>' : '') + '</td>';
    }
    html += '<td class="tot"><b>' + num(p.shifts) + '</b><span>เวร</span>' + (p.amount != null ? '<em>' + num(p.amount) + ' ฿</em>' : '') + '</td></tr>';
  });
  if (!G.rows.length) html += '<tr><td class="nm">—</td><td colspan="' + (days + 1) + '" class="emptyrow">' + emptyBox('bi-person-plus', 'ยังไม่มีบุคลากรในตาราง ' + posObj.name, d.canEdit ? 'กด “ดึงรายชื่อเดือนก่อน” หรือ “เพิ่มบุคลากร”' : '') + '</td></tr>';
  html += '</tbody><tfoot id="gFoot">' + quotaRows(d) + '</tfoot></table></div>';
  html += '<div class="legend">' +
    '<span><i style="background:var(--bad)"></i>ต้องแก้ไข</span><span><i style="background:var(--warn)"></i>ข้อสังเกต</span>' +
    '<span><i style="background:var(--accent)"></i>หน่วยที่ระบุวันนั้น / แก้แล้วยังไม่บันทึก</span><span><i style="background:var(--day-we)"></i>เสาร์–อาทิตย์</span>' +
    '<span><i style="background:var(--day-hol)"></i>นักขัตฤกษ์/ชดเชย</span><span><i style="background:var(--warn);border-radius:50%"></i>รอยืนยัน</span>' +
    '<span><b class="ql ok">5</b> กรอบคงเหลือ <b class="ql full">0</b> เต็ม <b class="ql hot">-1</b> เกิน</span>' +
    '<span><i class="bi bi-paperclip" style="width:auto;height:auto"></i> มีใบลืมสแกน · แตะแถบล่างของช่องเพื่อแนบ</span></div>';
  html += '<div class="msgs" id="gMsgs"></div>';
  return html;
}

/**
 * แถวกรอบเวรใต้ตาราง (ของตำแหน่งในแท็บที่เปิด) — 2 แถวต่อช่วงเวร: หน่วยนี้ · ทั้งฝ่าย
 * ตัวใหญ่ = คงเหลือ · ตัวเล็ก = ใช้/กรอบ · ไม่ได้ตั้งกรอบ = แสดงจำนวนที่ใช้ และเครื่องหมาย ∞
 */
function quotaRows(d) {
  var out = '', dn = deptName(d.unit.deptId).replace(/^ฝ่าย/, ''), pos = G.pos;
  var b = (d.board.pos || {})[pos];
  if (!b) return '';
  var fmt = function (n) { n = Math.round(n * 100) / 100; return String(n); };
  var slots = ['ช', 'บ', 'ด'].filter(function (s) { return d.unit.slots.indexOf(s) >= 0; });
  var nrow = slots.length * 2, ri = 0;
  slots.forEach(function (s) {
    [['unit', 'หน่วยนี้'], ['dept', 'ทั้งฝ่าย' + dn]].forEach(function (lv, li) {
      var bottom = (nrow - 1 - ri) * 34; ri++;
      out += '<tr class="qrow' + (li ? ' qd' : ' qu') + '"><td class="lb" style="bottom:' + bottom + 'px">' + (li ? '<span class="qsp"></span>' : shiftBadge(s) + ' ') + '<span>' + (li ? '' : (s === 'ช' ? 'เช้า' : s === 'บ' ? 'บ่าย' : 'ดึก') + ' · ') + h(lv[1]) + '</span></td>';
      for (var day = 1; day <= d.calendar.length; day++) {
        var used = (b[lv[0]][s] || [])[day] || 0, lim = (b.limits[lv[0]][s] || [])[day];
        var cls = 'q', big, small;
        if (lim == null) { cls += ' nolim'; big = used ? fmt(used) : '·'; small = '∞'; }
        else {
          var left = lim - used;
          cls += left < -1e-9 ? ' hot' : Math.abs(left) < 1e-9 ? ' full' : ' ok';
          big = fmt(left); small = fmt(used) + '/' + fmt(lim);
        }
        if (d._chg && d._chg[lv[0] + s + day]) cls += ' chg';
        var tip = (lim == null ? 'ไม่ได้ตั้งกรอบ (ไม่จำกัด) · ใช้ ' + fmt(used) : 'คงเหลือ ' + fmt(lim - used) + ' · ใช้ ' + fmt(used) + ' จากกรอบ ' + fmt(lim)) +
          ((b.mode[lv[0]][s] || [])[day] === '*' ? ' (กรอบรวมทุกตำแหน่ง)' : '') + ' · ครึ่งเวร = 0.5';
        out += '<td class="' + cls + '" style="bottom:' + bottom + 'px" title="' + h(tip) + '"><b>' + big + '</b><small>' + small + '</small></td>';
      }
      out += '<td class="tot" style="bottom:' + bottom + 'px"></td></tr>';
    });
  });
  return out;
}
/** คำนวณแถวกรอบใหม่ทันทีที่พิมพ์ (ยังไม่ต้องบันทึก) — นับตาม "นับกรอบ" ของรหัสเวร ครึ่งเวร = 0.5 */
function recalcFoot() {
  var d = G.data; if (!d || !d._base || !d.board.pos || !d.board.pos[G.pos]) return;
  var pos = G.pos, base = d._base[pos] || { 'ช': [], 'บ': [], 'ด': [] }, now = { 'ช': [], 'บ': [], 'ด': [] }, days = d.calendar.length;
  d.people.forEach(function (p) {
    if (p.posId !== pos) return;
    for (var day = 1; day <= days; day++) {
      var c = p.cells[day]; if (!c || !c.code || c.work === 'ABSENT') continue;
      var r = parseShiftJs(c.code, d.ym + '-' + ('0' + day).slice(-2));
      (r.segs || []).forEach(function (g) { now[g.slot][day] = (now[g.slot][day] || 0) + g.quota; });
    }
  });
  var b = d.board.pos[pos];
  if (!b._srv) b._srv = JSON.parse(JSON.stringify({ unit: b.unit, dept: b.dept }));
  var chg = {};
  ['ช', 'บ', 'ด'].forEach(function (s) {
    for (var day = 1; day <= days; day++) {
      var delta = (now[s][day] || 0) - (base[s][day] || 0);
      if (Math.abs(delta) > 1e-9) { chg['unit' + s + day] = 1; chg['dept' + s + day] = 1; }
      b.unit[s][day] = ((b._srv.unit[s] || [])[day] || 0) + delta;
      b.dept[s][day] = ((b._srv.dept[s] || [])[day] || 0) + delta;
    }
  });
  d._chg = chg;
  var f = $('gFoot'); if (f) f.innerHTML = quotaRows(d);
}
var _rfT = null;
function recalcFootSoon() { clearTimeout(_rfT); _rfT = setTimeout(recalcFoot, 120); }

function wireGrid() {
  var tbl = $('grid');
  var d = G.data, days = d.calendar.length;
  $$('.ptabs [data-pos]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.pos === G.pos) return;
      G.pos = b.dataset.pos; posRemember(G.unitId, G.pos); closePop(); paintGrid(true);
    });
  });
  if ($('gSave')) $('gSave').addEventListener('click', saveGrid);
  if ($('gAdd')) $('gAdd').addEventListener('click', addPerson);
  if ($('gPrev')) $('gPrev').addEventListener('click', pullPrev);
  if ($('gPrint')) $('gPrint').addEventListener('click', function () { openPrintOpts(G.unitId, G.ym, G.pos); });
  if ($('gConfirm')) $('gConfirm').addEventListener('click', function () {
    var pend = 0; d.people.forEach(function (p) { Object.keys(p.cells).forEach(function (k) { if (p.cells[k].book === 'PENDING') pend++; }); });
    if (!pend) { alertBox('ไม่มีเวรรอยืนยัน', 'ทุกเวรในตารางนี้ได้รับการยืนยันแล้ว', 'info'); return; }
    leaveGrid(function () {
      confirmX({ title: 'ยืนยันทั้งตาราง?', html: 'ยืนยันเวรที่บุคลากรลงไว้ <b>' + pend + '</b> เวร ของ ' + h(d.unit.name) + ' (ทุกตำแหน่ง)', ok: 'ยืนยันทั้งหมด' }).then(function (y) {
        if (!y) return;
        act({ action: 'confirmBook', payload: { ym: G.ym, unitId: G.unitId }, title: 'กำลังยืนยันเวร', text: pend + ' เวร', icon: 'bi-check2-all', done: function (r) { return 'ยืนยัน ' + r.confirmed + ' เวรเรียบร้อย'; }, quiet: true })
          .then(function (r) { schedFromServer(r.schedule); }).catch(function () { });
      });
    });
  });
  showGridMsgs();
  setSavingChip();
  if (!tbl) return;
  var cellOf = function (ri, day) { var p = G.rows[ri]; return p.cells[day] || (p.cells[day] = { code: '', wardId: '', flags: [], book: 'CONFIRMED' }); };
  var markDirty = function (ri, day) {
    var p = G.rows[ri], c = cellOf(ri, day), k = dkey(p.empCode, G.pos, day);
    G.dirty[k] = { empCode: p.empCode, posId: G.pos, day: day, code: c.code, wardId: c.wardId };
    delete G.bad[k];
    var td = $('c' + ri + '_' + day); if (td) { td.classList.add('dirty'); td.classList.remove('bad'); }
    var btn = $('gSave'); if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> บันทึก (' + dirtyCount() + ')'; }
    var tb = document.querySelector('.ptabs [data-pos="' + G.pos + '"]');
    if (tb) { var n = Object.keys(G.dirty).filter(function (x) { return x.split('|')[1] === G.pos; }).length, sp = tb.querySelector('.cnt.dirty'); if (!sp) { sp = document.createElement('span'); sp.className = 'cnt dirty'; tb.appendChild(document.createTextNode(' ')); tb.appendChild(sp); } sp.textContent = n; }
    recalcFootSoon();
  };
  var refreshWard = function (ri, day) {
    var p = G.rows[ri], c = p.cells[day] || {};
    var td = $('c' + ri + '_' + day); if (!td) return;
    var wt = td.querySelector('.wt');
    if (!c.code) { wt.textContent = ''; wt.className = 'wt'; return; }
    if (c.wardId) { wt.textContent = wardShort(c.wardId); wt.className = 'wt set'; }
    else if (d.unit.needWard) {
      var prev = '';
      for (var k = day - 1; k >= 1; k--) { var pc = p.cells[k]; if (pc && pc.code && pc.wardId) { prev = pc.wardId; break; } }
      if (prev) { wt.textContent = wardShort(prev); wt.className = 'wt'; } else { wt.textContent = 'ไม่ระบุ'; wt.className = 'wt miss'; }
    } else { wt.textContent = ''; wt.className = 'wt'; }
  };
  var parse = function (c, v) {
    v = String(v || '').trim();
    var cut = v.indexOf('/'); if (cut < 0) cut = v.indexOf(' ');
    if (cut >= 0) {
      var wt = v.slice(cut + 1).trim(), w = wardByText(wt);
      c.code = v.slice(0, cut).trim();
      if (w) c.wardId = w; else if (wt) notify('ไม่รู้จักหน่วย "' + wt + '"', 'warning', 2500);
    } else { c.code = v; if (!v) c.wardId = ''; }
  };
  var dateOf = function (day) { return d.ym + '-' + ('0' + day).slice(-2); };
  var quotaHint = function (day) {
    var b = (d.board.pos || {})[G.pos]; if (!b) return '';
    return ['ช', 'บ', 'ด'].filter(function (s) { return d.unit.slots.indexOf(s) >= 0; }).map(function (s) {
      var lu = b.limits.unit[s][day], ld = b.limits.dept[s][day], left = null;
      if (lu != null) left = lu - b.unit[s][day];
      if (ld != null) left = left == null ? ld - b.dept[s][day] : Math.min(left, ld - b.dept[s][day]);
      return '<span class="qh ' + (left == null ? 'nolim' : left < 0 ? 'hot' : left === 0 ? 'full' : 'ok') + '">' + s + ' ' + (left == null ? '∞' : (Math.round(left * 100) / 100)) + '</span>';
    }).join('');
  };
  var openPop = function (anchor, ri, day) {
    var p = G.rows[ri], c = cellOf(ri, day);
    openCellPop({
      anchor: anchor, codes: d.codes, date: dateOf(day), code: c.code, wardId: c.wardId, needWard: d.unit.needWard, homeWardId: p.homeWardId, readonly: !d.canEdit,
      title: p.empName, sub: 'วันที่ ' + day + ' ' + h(d.monthTh) + (p.homeWard ? ' · สังกัด ' + h(p.homeWard) : ''),
      extra: '<div class="qhint"><span class="small-muted">กรอบคงเหลือ ' + h(posName(G.pos)) + ':</span> ' + quotaHint(day) + '</div>' +
        (c.flags && c.flags.length ? '<div class="d-flex flex-wrap gap-1 mb-2">' + flagChips(c.flags) + '</div>' : ''),
      attach: c.id && (d.canAttach || p.empCode === S.me.empCode) ? { n: c.att ? 1 : 0, go: function () { attachFor(p.empCode, dateOf(day), d.ym, false, p.empName); } } : null,
      onPick: function (code, wardId) {
        if (!d.canEdit) return;
        c.code = code; if (wardId !== undefined) c.wardId = code ? wardId : '';
        var inp = tbl.querySelector('input[data-r="' + ri + '"][data-d="' + day + '"]'); if (inp) inp.value = code;
        markDirty(ri, day); refreshWard(ri, day);
      }
    });
  };
  tbl.addEventListener('input', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d || !d.canEdit) return;
    var ri = +el.dataset.r, day = +el.dataset.d;
    parse(cellOf(ri, day), el.value);
    markDirty(ri, day); refreshWard(ri, day);
  });
  // ออกจากช่องแล้วแสดงเฉพาะรหัสเวร (ส่วน /19A ไปอยู่แถบหน่วยด้านล่างของช่อง)
  tbl.addEventListener('change', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d) return;
    var c = G.rows[+el.dataset.r] && G.rows[+el.dataset.r].cells[+el.dataset.d];
    if (c && el.value !== c.code) el.value = c.code;
  });
  tbl.addEventListener('click', function (e) {
    var wt = e.target.closest ? e.target.closest('.wt, .att') : null;
    if (!wt) { var inp = e.target.closest ? e.target.closest('input[data-d]') : null; if (inp && !d.canEdit) openPop(inp, +inp.dataset.r, +inp.dataset.d); return; }
    var td = wt.closest('td.cell'), m = td.id.match(/^c(\d+)_(\d+)$/);
    openPop(wt, +m[1], +m[2]);
  });
  tbl.addEventListener('keydown', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d) return;
    var r = +el.dataset.r, day = +el.dataset.d, nr = r, nd = day;
    if (e.key === 'ArrowRight' || e.key === 'Enter') nd = Math.min(days, day + 1);
    else if (e.key === 'ArrowLeft') nd = Math.max(1, day - 1);
    else if (e.key === 'ArrowDown') nr = Math.min(G.rows.length - 1, r + 1);
    else if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
    else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveGrid(); return; }
    else if (e.key === 'F2' || (e.key === ' ' && e.ctrlKey)) { e.preventDefault(); openPop(el, r, day); return; }
    else return;
    e.preventDefault(); closePop();
    var n = tbl.querySelector('input[data-r="' + nr + '"][data-d="' + nd + '"]');
    if (n) { n.focus(); n.select(); }
  });
  /* วางจาก Excel ได้ทั้งบล็อก (ตัดบรรทัดว่างท้ายที่ Excel ใส่มา ไม่ให้ลบช่องของแถวถัดไปโดยไม่ตั้งใจ) */
  tbl.addEventListener('paste', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d || !d.canEdit) return;
    var txt = (e.clipboardData || window.clipboardData).getData('text') || '';
    if (!/[\t\n\r]/.test(txt)) return;
    e.preventDefault();
    var lines = txt.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
    var r0 = +el.dataset.r, d0 = +el.dataset.d, n = 0, skip = 0;
    lines.forEach(function (line, i) {
      line.split('\t').forEach(function (val, j) {
        var ri = r0 + i, day = d0 + j;
        if (ri >= G.rows.length || day > days) { skip++; return; }
        parse(cellOf(ri, day), val);
        var inp = tbl.querySelector('input[data-r="' + ri + '"][data-d="' + day + '"]'); if (inp) inp.value = cellOf(ri, day).code;
        markDirty(ri, day); refreshWard(ri, day); n++;
      });
    });
    notify('วางข้อมูล ' + n + ' ช่อง' + (skip ? ' (เกินขอบตาราง ' + skip + ' ช่อง ไม่ได้วาง)' : '') + ' — อย่าลืมกดบันทึก', 'success', 3600);
  });
}

function showGridMsgs() {
  var d = G.data, msgs = [];
  Object.keys(G.bad || {}).forEach(function (k) {
    var a = k.split('|'); if (a[1] !== G.pos) return;
    var p = G.rows.filter(function (x) { return x.empCode === a[0]; })[0];
    msgs.push({ c: 'red', t: (p ? p.empName : a[0]) + ' วันที่ ' + a[2] + ' — บันทึกไม่ผ่าน: ' + G.bad[k] });
  });
  G.rows.forEach(function (p) {
    Object.keys(p.cells).forEach(function (day) {
      (p.cells[day].flags || []).forEach(function (f) {
        if (SCAN_FLAGS.indexOf(f) >= 0) return;
        msgs.push({ c: flagColor(f), t: p.empName + ' วันที่ ' + day + ' — ' + flagText(f) });
      });
    });
  });
  var other = (d.positions || []).filter(function (p) { return p.posId !== G.pos && p.red; });
  var box = $('gMsgs'); if (!box) return;
  var seen = {}, uniq = msgs.filter(function (m) { var k = m.c + m.t; if (seen[k]) return false; seen[k] = 1; return true; });
  uniq.sort(function (a, b) { return a.c === b.c ? 0 : a.c === 'red' ? -1 : 1; });
  box.innerHTML = (uniq.length
    ? uniq.slice(0, 12).map(function (m) { return '<div class="msg ' + m.c + '"><span class="dot"></span>' + h(m.t) + '</div>'; }).join('') +
      (uniq.length > 12 ? '<div class="msg"><span class="dot" style="background:var(--muted)"></span>และอีก ' + (uniq.length - 12) + ' รายการ — ดูทั้งหมดที่ <a href="#report" onclick="go(\'report\');return false">รายงานติดตาม</a></div>' : '')
    : (G.rows.length ? '<div class="msg ok"><span class="dot"></span>ตาราง ' + h(posName(G.pos)) + ' ตรวจแล้วไม่พบข้อผิดพลาด</div>' : '')) +
    other.map(function (p) { return '<div class="msg red"><span class="dot"></span>แท็บ ' + h(p.name) + ' มีรายการที่ต้องแก้ไข ' + p.red + ' รายการ — <a href="#" onclick="G.pos=\'' + h(p.posId) + '\';paintGrid(true);return false">เปิดแท็บ</a></div>'; }).join('');
}

/** ข้อมูลใหม่จากเซิร์ฟเวอร์ (หลังบันทึก/ยืนยัน) — คงช่องที่ยังแก้อยู่ไว้บนข้อมูลใหม่ แล้ววาดใหม่ตำแหน่งเดิม */
function schedFromServer(sch) {
  if (!sch) return;
  cacheStoreSched(sch);
  if (!G.data || sch.unit.unitId !== G.unitId || sch.ym !== G.ym) return;
  var keep = G.dirty, old = G.data;
  // คนที่เพิ่มเข้าตารางแล้วยังไม่มีเวร (แถวว่าง) หรือยังมีช่องที่ยังไม่บันทึก คงไว้
  old.people.forEach(function (e) {
    if (sch.people.some(function (x) { return x.empCode === e.empCode && x.posId === e.posId; })) return;
    var pend = Object.keys(keep).some(function (k) { var a = k.split('|'); return a[0] === e.empCode && a[1] === e.posId; });
    var empty = !Object.keys(e.cells).some(function (k) { return e.cells[k] && e.cells[k].code; });
    if (pend || empty) sch.people.push({ empCode: e.empCode, empName: e.empName, posId: e.posId, regPosId: e.regPosId, cells: {}, shifts: 0, amount: null, homeWard: e.homeWard, homeWardId: e.homeWardId, red: 0, orange: 0 });
  });
  sch.people.sort(function (a, b) { return a.empName < b.empName ? -1 : a.empName > b.empName ? 1 : 0; });
  (sch.positions || []).forEach(function (p) { p.people = sch.people.filter(function (x) { return x.posId === p.posId; }).length; });
  gridBase(sch);                        // ฐาน = ค่าที่บันทึกแล้วจริงบนเซิร์ฟเวอร์
  Object.keys(keep).forEach(function (k) {   // แล้วค่อยวางช่องที่ยังไม่บันทึกทับ
    var x = keep[k], p = sch.people.filter(function (e) { return e.empCode === x.empCode && e.posId === x.posId; })[0];
    if (!p) return;
    var c = p.cells[x.day] || (p.cells[x.day] = { code: '', wardId: '', flags: [], book: 'CONFIRMED' });
    c.code = x.code; c.wardId = x.wardId;
  });
  G.data = sch;
  if (S.page === 'sched') paintGrid(false);
}
function cacheStoreSched(sch) {
  var e = cacheGet(mkey('getSchedule', { ym: sch.ym, unitId: sch.unit.unitId }));
  cachePut('getSchedule', { ym: sch.ym, unitId: sch.unit.unitId }, sch, { g: DV.g, m: (function () { var m = {}; m[sch.ym] = DV.m[sch.ym] || ''; return m; })() });
}
function setSavingChip() {
  var el = $('gSaving'); if (!el) return;
  el.innerHTML = G.saving ? '<span class="tag t-info saving"><span class="spin"></span> กำลังบันทึก ' + G.saving.n + ' ช่อง… ลงเวรต่อได้เลย</span>' : '';
}

/**
 * บันทึกแบบไม่ต้องรอ — ช่องที่แก้ถูกส่งไปเบื้องหลัง ผู้ใช้ลงเวรต่อได้ทันที
 * สำเร็จ: วาดผลตรวจ/กรอบจากเซิร์ฟเวอร์ (คงช่องที่แก้ต่อระหว่างรอ) · บางช่องไม่ผ่าน: ช่องนั้นกลับมาเป็นสีแดงพร้อมเหตุผล
 * ล้มเหลวทั้งชุด (เน็ต/เซิร์ฟเวอร์): ช่องทั้งหมดกลับมาเป็น "ยังไม่บันทึก" ให้กดบันทึกใหม่ได้
 */
function saveGrid() {
  if (G.saving) { G.queued = true; notify('กำลังบันทึกชุดก่อนหน้า — ชุดนี้จะบันทึกต่อทันที', 'info', 2200); return; }
  var keys = Object.keys(G.dirty);
  if (!keys.length) { notify('ยังไม่มีการเปลี่ยนแปลง', 'info'); return; }
  var sent = {}, cells = keys.map(function (k) { sent[k] = G.dirty[k]; return G.dirty[k]; });
  var d = G.data, ym = G.ym, unitId = G.unitId;
  G.dirty = {};
  G.saving = { n: cells.length, at: Date.now() };
  var btn = $('gSave'); if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-save"></i> บันทึก'; }
  $$('#grid td.dirty').forEach(function (td) { td.classList.remove('dirty'); td.classList.add('sending'); });
  $$('.ptabs .cnt.dirty').forEach(function (x) { x.remove(); });
  setSavingChip();
  api('saveCells', { ym: ym, unitId: unitId, cells: cells }).then(function (r) {
    G.saving = null;
    (r.rejected || []).forEach(function (x) { var k = dkey(x.empCode, x.posId || G.pos, x.day); if (!G.dirty[k]) { G.dirty[k] = sent[k] || x; } G.bad[k] = x.msg; });
    var red = 0; (r.schedule.people || []).forEach(function (p) { red += p.red || 0; });
    var rej = (r.rejected || []).length, warn = (r.warnings || []).filter(function (w) { return !(r.rejected || []).some(function (x) { return x.msg && w.indexOf(x.msg) >= 0; }); });
    if (G.unitId === unitId && G.ym === ym) schedFromServer(r.schedule); else cacheStoreSched(r.schedule);
    var msg = 'บันทึก ' + r.saved + ' ช่อง' + (r.deleted ? ' · ลบ ' + r.deleted : '') + ' · ' + h(d.unit.name);
    if (rej) alertBox('บันทึกไม่ผ่าน ' + rej + ' ช่อง', '<div class="res-list">' + r.rejected.slice(0, 20).map(function (x) { return '<div class="warn"><i class="bi bi-exclamation-triangle"></i>' + h(x.name + ' วันที่ ' + x.day + ': ' + x.msg) + '</div>'; }).join('') + '</div><div class="small-muted mt-2">ช่องเหล่านี้ยังเป็นสีแดงในตาราง แก้แล้วกดบันทึกอีกครั้ง · ช่องอื่นบันทึกเรียบร้อยแล้ว</div>', 'warning', true);
    else notify(msg + (warn.length ? ' · ' + warn[0] : '') + (red ? ' · มีรายการต้องแก้ ' + red : ''), warn.length || red ? 'info' : 'success', 3600);
    if (G.queued) { G.queued = false; if (dirtyCount()) setTimeout(saveGrid, 50); }
  }, function (e) {
    G.saving = null; G.queued = false;
    Object.keys(sent).forEach(function (k) { if (!G.dirty[k]) G.dirty[k] = sent[k]; });
    if (S.page === 'sched' && G.unitId === unitId && G.ym === ym) paintGrid(false);
    alertBox('ยังบันทึกไม่สำเร็จ', (e && e.message ? e.message : String(e)) + '\n\nช่องที่แก้ไว้ยังอยู่ครบ (สีฟ้า) — กด “บันทึก” อีกครั้งได้เลย', 'error');
  });
}

/** ดึงรายชื่อจากเดือนก่อน (เฉพาะชื่อ) — เพิ่มเป็นแถวว่างของแท็บตำแหน่งที่เปิดอยู่ ไม่ทับข้อมูลที่บันทึกแล้ว */
function prevYmJs(ym) { var a = ym.split('-').map(Number), m = a[0] * 12 + a[1] - 2; return Math.floor(m / 12) + '-' + ('0' + (m % 12 + 1)).slice(-2); }
function pullPrev() {
  var d = G.data; if (!d || !d.canEdit) return;
  var pos = G.pos, pn = posName(pos);
  act({ action: 'getPrevRoster', payload: { ym: G.ym, unitId: G.unitId, posId: pos }, title: 'กำลังดึงรายชื่อเดือนก่อน', text: h(d.unit.name) + ' · ' + h(pn) + ' · จาก ' + h(thaiYmJs(prevYmJs(G.ym))), icon: 'bi-people', steps: ['อ่านตารางเวรเดือนก่อน'], done: false })
    .then(function (r) {
      var add = 0, had = 0;
      r.people.forEach(function (e) {
        if (d.people.some(function (p) { return p.empCode === e.empCode && p.posId === pos; })) { had++; return; }
        d.people.push({ empCode: e.empCode, empName: e.empName, posId: pos, regPosId: e.posId, cells: {}, shifts: 0, amount: null, homeWard: e.homeWard || '', homeWardId: e.homeWardId || '', red: 0, orange: 0 });
        add++;
      });
      d.people.sort(function (a, b) { return a.empName < b.empName ? -1 : a.empName > b.empName ? 1 : 0; });
      (d.positions || []).forEach(function (p) { if (p.posId === pos) p.people = d.people.filter(function (x) { return x.posId === pos; }).length; });
      paintGrid(false);
      var sk = r.skipped || [];
      var html = 'จากเดือน <b>' + h(r.srcTh) + '</b> · ตำแหน่ง <b>' + h(pn) + '</b><br>เพิ่มเข้าตาราง <b>' + add + '</b> คน' + (had ? ' · มีอยู่แล้ว ' + had + ' คน' : '') +
        (sk.length ? '<div class="res-list mt-2">' + sk.map(function (x) { return '<div class="warn"><i class="bi bi-person-dash"></i>ข้าม ' + h(x.name) + ' — ' + h(x.reason) + '</div>'; }).join('') + '</div>' : '') +
        '<div class="small-muted mt-2">ดึงเฉพาะรายชื่อ ใส่เวรแล้วกด “บันทึก” · คนที่ไม่มีเวรจะไม่ถูกบันทึก</div>';
      if (!r.people.length && !sk.length) alertBox('เดือนก่อนไม่มีรายชื่อ', 'เดือน ' + r.srcTh + ' ไม่มีเวรของตำแหน่ง ' + pn + ' ในหน่วยงานนี้ — กด “เพิ่มบุคลากร” เพื่อเพิ่มทีละคน', 'info');
      else Swal.fire({ icon: add ? 'success' : 'info', title: add ? 'ดึงรายชื่อแล้ว ' + add + ' คน' : 'ไม่มีรายชื่อใหม่', html: html, confirmButtonText: 'เริ่มลงเวร' }).then(function () {
        var inp = document.querySelector('#grid input[data-r="0"][data-d="1"]'); if (inp) inp.focus();
      });
    }).catch(function () { });
}

function addPerson() {
  var d = G.data, pos = G.pos;
  modal({
    title: 'เพิ่มบุคลากรเข้าตาราง ' + posName(pos), icon: 'bi-person-plus', sub: d.unit.name + ' · ' + d.monthTh,
    body: '<div class="input-group mb-2"><span class="input-group-text"><i class="bi bi-search"></i></span><input class="form-control" id="apQ" placeholder="พิมพ์รหัสพนักงานหรือชื่อ เช่น 5501201 หรือ กมลชนก"></div>' +
      '<div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="apAll"><label class="form-check-label small" for="apAll">แสดงทุกตำแหน่ง (คนที่ตำแหน่งในทะเบียนไม่ใช่ ' + h(posName(pos)) + ' จะติดธงส้มให้ตรวจ)</label></div>' +
      '<div id="apList" class="emp-list"></div>' +
      noteBox('info', 'bi-info-circle', 'ค้นหาได้เฉพาะตำแหน่ง <b>' + h(posName(pos)) + '</b> ของแท็บนี้ · เพิ่มแล้วลงเวรในแถวใหม่ได้ทันที แล้วกด “บันทึก” · คนที่ไม่มีเวรในเดือนนี้จะไม่ถูกบันทึกเป็นแถวว่าง', 'mt-3'),
    okText: null, cancelText: 'ปิด',
    onOpen: function (root, close) {
      var q = root.querySelector('#apQ'), box = root.querySelector('#apList'), all = root.querySelector('#apAll'), t = null, EMPS = null;
      var search = function () {
        if (!EMPS) box.innerHTML = '<div class="small-muted mb-2"><span class="spin"></span> กำลังโหลดรายชื่อ (ครั้งเดียว)…</div><div class="skeleton" style="height:56px"></div>';
        empLite().then(function (list0) { EMPS = list0; return empSearchLocal(list0.filter(function (e) { return all.checked || e[2] === pos; }), q.value, 40); }).then(function (list) {
          box.innerHTML = list.length ? list.map(function (e, i) {
            var inGrid = d.people.some(function (p) { return p.empCode === e.empCode && p.posId === pos; });
            var other = e.posId !== pos;
            return '<div class="emp-item" style="--d:' + i + '" data-add="' + e.empCode + '"><div class="avatar sm">' + h(initials(e.fullName)) + '</div><div class="ei"><b>' + h(e.fullName) + '</b>' +
              '<small>' + h(e.empCode) + ' · ' + h(e.hrPosition || posName(e.posId)) + (e.wardName ? ' · สังกัด ' + h(e.wardName) : '') + '</small>' +
              (other ? '<div class="tag t-orange mt-1">ทะเบียน: ' + h(e.posId ? posName(e.posId) : 'ไม่ระบุตำแหน่ง') + '</div>' : '') + '</div>' +
              (inGrid ? '<span class="tag t-ok"><i class="bi bi-check"></i>อยู่ในตารางแล้ว</span>' : '<button class="btn btn-sm btn-brand"><i class="bi bi-plus-lg"></i> เพิ่ม</button>') + '</div>';
          }).join('') : emptyBox('bi-search', 'ไม่พบรายชื่อตำแหน่ง ' + posName(pos), all.checked ? 'ลองพิมพ์รหัสพนักงานเต็ม หรือให้ผู้ดูแลระบบเพิ่มบุคลากรที่หน้า “ผู้ใช้และสิทธิ์”' : 'ถ้าตำแหน่งในทะเบียนไม่ตรง เปิด “แสดงทุกตำแหน่ง” ด้านบน');
          $$('[data-add]', box).forEach(function (b) {
            b.addEventListener('click', function () {
              var code = b.dataset.add, e = list.filter(function (x) { return x.empCode === code; })[0];
              if (d.people.some(function (p) { return p.empCode === code && p.posId === pos; })) { notify('มีอยู่ในตารางแล้ว', 'info'); return; }
              d.people.push({ empCode: code, empName: e.fullName, posId: pos, regPosId: e.posId || '', cells: {}, shifts: 0, amount: null, homeWard: e.wardName || '', homeWardId: e.wardId || '', red: 0, orange: 0 });
              (d.positions || []).forEach(function (p) { if (p.posId === pos) p.people++; });
              paintGrid(false);
              notify('เพิ่ม ' + e.fullName + ' แล้ว — ลงเวรในแถวใหม่ได้เลย', 'success');
              close();
              setTimeout(function () {
                var ri = -1; G.rows.forEach(function (p, i) { if (p.empCode === code) ri = i; });
                var inp = document.querySelector('#grid input[data-r="' + ri + '"][data-d="1"]'); if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); }
              }, 300);
            });
          });
        }).catch(errToast);
      };
      q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(search, EMPS ? 60 : 250); });
      all.addEventListener('change', search);
      search();
    }
  });
}

/**
 * ตัวเลือกก่อนพิมพ์ตารางเวร (จากหน้าตารางเวรหรือหน้าเอกสาร)
 *  ฉบับส่ง HR: มีช่องลงนาม · เลือกแสดง/ไม่แสดงเงิน · แผ่นที่ 2 (เฉพาะหน่วยที่ต้องระบุหน่วยปลายทาง)
 *  ฉบับแจกหน่วยงาน: ไม่มีช่องลงนาม ไม่มีเงิน มีหมายเหตุว่าไม่ใช่เอกสารเบิกจ่าย (บุคลากรพิมพ์ได้)
 */
function openPrintOpts(unitId, ym, curPos) {
  var u = unitObj(unitId) || {}, mgr = canEditUnitJs(unitId) || isChiefOfJs(unitId);
  var ids = (u.posIds && u.posIds.length ? u.posIds : (S.boot.positions || []).map(function (p) { return p.posId; }));
  if (G.data && G.data.unit.unitId === unitId) ids = (G.data.positions || []).filter(function (p) { return p.open || p.people; }).map(function (p) { return p.posId; });
  modal({
    title: 'พิมพ์ตารางเวร', icon: 'bi-printer', sub: (u.name || unitId) + ' · ' + thaiYmJs(ym, true),
    body: '<label class="form-label">แบบเอกสาร</label>' + chipGroup('pk', [
        { v: 'hr', t: 'ฉบับส่ง HR / เบิกจ่าย', d: 'มีช่องลงนาม · แถวกรอบเวร' + (u.needWard ? ' · แผ่นที่ 2 หน่วยที่ไปปฏิบัติ' : '') },
        { v: 'dist', t: 'ฉบับแจกหน่วยงาน', d: 'ไม่มีช่องลงนาม · ไม่แสดงเงิน · ไม่ใช่เอกสารเบิกจ่าย' }
      ], [mgr ? 'hr' : 'dist'], { single: true }) +
      '<label class="form-label mt-3">ตำแหน่งที่จะพิมพ์ <span class="small-muted">(1 ตำแหน่ง = 1 หน้า)</span></label>' +
      chipGroup('pp', ids.map(function (id) { return { v: id, t: posName(id) }; }), ids) +
      '<div id="ppMoney" class="mt-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="prMoney" checked><label class="form-check-label" for="prMoney">แสดงจำนวนเงิน (ค่าตอบแทนรายคนและรวม)</label></div></div>' +
      (u.needWard ? '<div class="form-check form-switch mt-2" id="ppWard"><input class="form-check-input" type="checkbox" id="prWard" checked><label class="form-check-label" for="prWard">แนบแผ่นที่ 2 — รายงานหน่วยที่ไปปฏิบัติงาน</label></div>' : '') +
      noteBox('info', 'bi-info-circle', 'เปิดหน้าพิมพ์ A4 แนวนอน ย่อให้พอดีหน้าอัตโนมัติ · เลือก “บันทึกเป็น PDF” เพื่อเก็บเป็นไฟล์', 'mt-3'),
    okText: 'เปิดหน้าพิมพ์', okIcon: 'bi-printer',
    onOpen: function (root) {
      var sync = function () { var k = chipValues(root, 'pk')[0]; root.querySelector('#ppMoney').style.display = k === 'dist' ? 'none' : ''; var w = root.querySelector('#ppWard'); if (w) w.style.display = k === 'dist' ? 'none' : ''; };
      wireChips(root, sync); sync();
      if (!mgr) { var hb = root.querySelector('[data-chips="pk"] input[value="hr"]'); if (hb) hb.closest('.chip').style.display = 'none'; }
    },
    onOk: function (close, root) {
      var kind = chipValues(root, 'pk')[0] || 'hr', pp = chipValues(root, 'pp');
      if (!pp.length) { alertBox('ยังไม่ได้เลือกตำแหน่ง', 'เลือกอย่างน้อย 1 ตำแหน่ง', 'info'); return; }
      var p = { ym: ym, unitId: unitId, kind: 'schedule', dist: kind === 'dist', money: kind === 'dist' ? false : $('prMoney').checked, ward: kind === 'dist' ? false : ($('prWard') ? $('prWard').checked : false), posIds: pp };
      close();
      act({ action: 'printDoc', payload: p, title: 'กำลังเตรียมเอกสารตารางเวร', text: h(u.name || unitId) + ' · ' + thaiYmJs(ym) + ' · ' + pp.map(posName).join(', '), icon: 'bi-printer', steps: ['รวบรวมข้อมูลและคำนวณ', 'จัดหน้าเอกสาร A4'], done: false })
        .then(function (r) { printPopup(r); }).catch(function () { });
    }
  });
}

/* ================================================================ ตรวจการปฏิบัติงาน */
PAGES.work = function () {
  var ym = S.ym || thisYmJs();
  var units = myUnitsFor('manage');
  var unitId = pickUnit(units);
  S.unitId = unitId;
  if (!unitId) { $('view').innerHTML = pageHead('bi-fingerprint', 'ตรวจการปฏิบัติงาน', GUIDE.work.lead) + emptyBox('bi-buildings', 'ท่านยังไม่ได้รับมอบหมายหน่วยงาน'); return; }
  $('topExtra').innerHTML = '<select class="sel-chip" id="wUnit">' + unitOptions(unitId, units) + '</select>' + ymSelect('wYm', ym);
  $('wUnit').addEventListener('change', function () { S.unitId = this.value; PAGES.work(); });
  wireYm('wYm', 'work');
  var draw = function (d) {
    window.WORKROWS = d.rows;
    var cnt = function (f) { return d.rows.filter(function (r) { return f === 'problem' ? r.flags.length : r.flags.indexOf(f) >= 0; }).length; };
    var html = pageHead('bi-fingerprint', 'ตรวจการปฏิบัติงาน · ' + d.unitName, GUIDE.work.lead,
      '<button class="btn btn-ghost" id="wScan"><i class="bi bi-cloud-download"></i> ดึงเวลาสแกน</button>' +
      (d.canEdit ? '<button class="btn btn-brand" id="wAll"><i class="bi bi-check2-square"></i> ตรงตามใบทั้งหมด</button>' : '') +
      '<button class="btn btn-ghost btn-icon" onclick="window.print()" title="พิมพ์"><i class="bi bi-printer"></i></button>');
    html += '<div class="stats">' + statCard('bi-list-check', d.rows.length, 'รายการเวรในเดือน') + statCard('bi-exclamation-triangle', d.problems, 'มีข้อสังเกต', d.problems ? 'warn' : 'ok') +
      statCard('bi-fingerprint', cnt('NO_SCAN'), 'ไม่พบการสแกน', cnt('NO_SCAN') ? 'bad' : 'ok') +
      statCard('bi-clock', h(d.lastScanSync ? thaiDT(d.lastScanSync) : 'ยังไม่เคยดึง'), 'ดึงเวลาสแกนล่าสุด', 'info', true) + '</div>';
    html += '<div class="d-flex gap-2 flex-wrap align-items-center mb-2">' + statusTag(d.period.status, d.period.statusTh) +
      (d.scanMode === 'block' ? '<span class="tag t-red"><i class="bi bi-shield-x"></i>โหมดบล็อก: สแกนไม่ครบส่งตรวจไม่ได้</span>' : '<span class="tag t-info"><i class="bi bi-info-circle"></i>โหมดข้อสังเกต: สแกนไม่ครบยังส่งตรวจได้</span>') + '</div>';
    html += '<div class="fchips" id="wF">' + [['', 'ทั้งหมด', d.rows.length], ['problem', 'มีข้อสังเกต', cnt('problem')], ['NO_SCAN', 'ไม่พบสแกน', cnt('NO_SCAN')], ['HOURS_SHORT', 'ชั่วโมงไม่ครบ', cnt('HOURS_SHORT')],
      ['SCAN_LATE', 'เข้าสาย', cnt('SCAN_LATE')], ['OWN_WARD', 'ลงหน่วยตัวเอง', cnt('OWN_WARD')], ['NO_WARD', 'ไม่ระบุหน่วย', cnt('NO_WARD')]]
      .map(function (x, i) { return '<button class="' + (i ? '' : 'on') + '" data-f="' + x[0] + '">' + x[1] + ' <b>' + x[2] + '</b></button>'; }).join('') + '</div><div id="wTable"></div>';
    $('view').innerHTML = html;
    countUp($('view'));
    var render = function (filter) {
      var rows = d.rows.filter(function (r) { return !filter || (filter === 'problem' ? r.flags.length : r.flags.indexOf(filter) >= 0); });
      $('wTable').innerHTML = tableBox(
        ['วันที่', 'บุคลากร', 'หน่วยที่ไปปฏิบัติ', 'เวร', 'สแกน เข้า – ออก', 'สถานะ', { t: 'เงิน', n: 1 }, 'ข้อสังเกต', ''],
        rows.map(function (r) {
          return [thaiDate(r.date), personCell(r.empName, h(r.empCode)), h(r.wardName || '—'),
            shiftBadge(r.shiftCode) + '<div class="small-muted">' + h(r.shiftText) + '</div>',
            '<b>' + h(r.scanIn || '—') + ' – ' + h(r.scanOut || '—') + '</b>' + (r.scanHours == null ? '' : '<div class="small-muted">' + num(r.scanHours, 2) + ' ชม.</div>'),
            r.workStatus === 'ABSENT' ? '<span class="tag t-red">ไม่มา</span>' : (r.workStatus === 'WORKED' ? '<span class="tag t-ok">ปฏิบัติงาน</span>' : '<span class="tag t-open">ตามตาราง</span>'),
            num(r.amount), '<div class="flagbox">' + flagChips(r.flags) + (r.hasAttach ? ' <span class="tag t-acc"><i class="bi bi-paperclip"></i>แนบแล้ว</span>' : '') + '</div>',
            '<div class="d-flex gap-1">' + (d.canEdit ? '<button class="btn btn-sm btn-soft" onclick="editWork(\'' + r.id + '\')"><i class="bi bi-pencil"></i> แก้ไข</button>' : '') +
            (d.canAttach ? '<button class="btn btn-sm ' + (r.hasAttach ? 'btn-soft' : 'btn-ghost') + '" title="ใบลืมสแกน / เอกสารแนบ" onclick="attachFor(\'' + r.empCode + '\',\'' + r.date + '\',\'' + r.date.slice(0, 7) + '\',false,REG[\'' + reg('an' + r.id, r.empName) + '\'])"><i class="bi bi-paperclip"></i></button>' : '') + '</div>'];
        }), { empty: 'ไม่มีรายการตามเงื่อนไข', emptyIcon: 'bi-check2-circle', maxh: '62vh' });
    };
    render('');
    $$('#wF button').forEach(function (b) { b.addEventListener('click', function () { $$('#wF button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); render(b.dataset.f); }); });
    $('wScan').addEventListener('click', function () {
      act({ action: 'syncScans', payload: { ym: d.ym }, title: 'กำลังดึงเวลาสแกนนิ้ว', text: 'จากระบบ HR (SmartAPI) · ' + h(d.ymTh), icon: 'bi-fingerprint',
        steps: ['ขอสิทธิ์เชื่อมต่อ SmartAPI', 'ดึงเวลาสแกนของทุกคนที่มีเวรในเดือนนี้', 'บันทึกและเทียบกับตารางเวร'],
        done: function (r) { return { title: 'ดึงเวลาสแกนเรียบร้อย', html: r.message ? h(r.message) : 'ได้ข้อมูล <b>' + r.days + '</b> วัน จาก <b>' + r.people + '</b> คน' }; } })
        .then(function () { MEMO = {}; PAGES.work(); }).catch(function () { });
    });
    if ($('wAll')) $('wAll').addEventListener('click', function () {
      confirmX({ title: 'ตรงตามใบทั้งหมด?', html: 'ยืนยันว่าทุกแถวปฏิบัติงานจริงตามตารางเวร<br><span class="small-muted">รายการที่ทำเครื่องหมาย “ไม่มา” ไว้จะไม่ถูกเปลี่ยน</span>', ok: 'ยืนยัน' }).then(function (y) {
        if (!y) return;
        act({ action: 'markAllAsPlanned', payload: { ym: d.ym, unitId: d.unitId }, title: 'กำลังบันทึกการปฏิบัติงาน', icon: 'bi-check2-square', done: function (r) { return 'บันทึก ' + r.saved + ' รายการเรียบร้อย'; } })
          .then(function () { MEMO = {}; PAGES.work(); }).catch(function () { });
      });
    });
  };
  var _pl = { ym: ym, unitId: unitId }; pageData('getWorkSheet', _pl);
  api('getWorkSheet', _pl, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function editWork(id) {
  var r = (window.WORKROWS || []).filter(function (x) { return x.id === id; })[0];
  if (!r) return;
  modal({
    title: 'แก้ไขการปฏิบัติงาน', icon: 'bi-pencil-square', sub: r.empName + ' · ' + thaiDate(r.date) + ' · เวร ' + r.shiftCode,
    body: '<div class="row g-3"><div class="col-md-6"><label class="form-label">สถานะ</label><select class="form-select" id="ewSt">' +
      ['PLANNED|ตามตาราง', 'WORKED|ปฏิบัติงานจริง', 'ABSENT|ไม่มา (ไม่คิดค่าตอบแทน)'].map(function (x) {
        var a = x.split('|'); return '<option value="' + a[0] + '"' + (r.workStatus === a[0] ? ' selected' : '') + '>' + a[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="col-md-6"><label class="form-label">หน่วยที่ไปปฏิบัติ</label><select class="form-select" id="ewWard"><option value="">—</option>' +
      (S.boot.wards || []).map(function (w) { return '<option value="' + w.wardId + '"' + (w.wardId === r.wardId ? ' selected' : '') + '>' + h(w.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-6"><label class="form-label">เวลาเข้า (ถ้าต่างจากสแกน)</label><input class="form-control" id="ewIn" value="' + h(r.timeIn) + '" placeholder="เช่น 08:05"></div>' +
      '<div class="col-6"><label class="form-label">เวลาออก</label><input class="form-control" id="ewOut" value="' + h(r.timeOut) + '" placeholder="เช่น 16:10"></div>' +
      '<div class="col-12"><label class="form-label">หมายเหตุ</label><input class="form-control" id="ewNote" value="' + h(r.note) + '"></div></div>' +
      noteBox('info', 'bi-fingerprint', 'สแกนจริง: เข้า <b>' + h(r.scanIn || '—') + '</b> · ออก <b>' + h(r.scanOut || '—') + '</b>' + (r.flags.length ? '<div class="mt-1 d-flex flex-wrap gap-1">' + flagChips(r.flags) + '</div>' : ''), 'mt-3') +
      '<div class="d-flex gap-2 flex-wrap mt-3"><button class="btn btn-sm btn-soft" onclick="attachFor(\'' + r.empCode + '\',\'' + r.date + '\',\'' + r.date.slice(0, 7) + '\',false,REG[\'' + reg('an' + r.id, r.empName) + '\'])"><i class="bi bi-paperclip"></i> ใบลืมสแกน / เอกสารแนบ</button>' +
      (S.me.isAdmin ? '<button class="btn btn-sm btn-warn-soft" onclick="setExc(\'' + r.id + '\',' + (r.exception ? 'true' : 'false') + ')"><i class="bi bi-shield-exclamation"></i> ' + (r.exception ? 'ยกเลิกการยกเว้นกฎ' : 'ยกเว้นกฎให้แถวนี้') + '</button>' : '') + '</div>' +
      (r.exception ? noteBox('warn', 'bi-shield-exclamation', 'ยกเว้นกฎไว้: ' + h(r.excReason), 'mt-2') : ''),
    okText: 'บันทึก', okIcon: 'bi-save',
    onOk: function (close) {
      var p = { ym: r.date.slice(0, 7), items: [{ id: id, workStatus: $('ewSt').value, wardId: $('ewWard').value, timeIn: $('ewIn').value, timeOut: $('ewOut').value, note: $('ewNote').value }] };
      close();
      act({ action: 'saveWork', payload: p, title: 'กำลังบันทึกการปฏิบัติงาน', text: h(r.empName) + ' · ' + thaiDate(r.date), icon: 'bi-save', done: 'บันทึกเรียบร้อย', quiet: true })
        .then(function () { MEMO = {}; PAGES.work(); }).catch(function () { });
    }
  });
}
/** ผู้ดูแลระบบยกเว้นกฎ — ต้องใส่เหตุผลและยืนยันรหัสผ่าน ระบบติดธงส้มถาวร */
function setExc(id, on) {
  askPassword(on ? 'ยกเลิกการยกเว้นกฎ' : 'ยกเว้นกฎให้รายการนี้',
    on ? 'ให้แถวนี้กลับมาถูกตรวจตามกฎปกติ' : noteBox('warn', 'bi-exclamation-triangle', 'ใช้เมื่อจำเป็นจริงเท่านั้น เช่น ต้องให้ลงเวรที่หน่วยต้นสังกัดของตนเอง · ระบบติดธงส้มถาวรและบันทึกในประวัติ'),
    { reason: !on, reasonLabel: 'เหตุผลการยกเว้น', ok: on ? 'ยกเลิกการยกเว้น' : 'ยกเว้นกฎ' }).then(function (v) {
    if (!v) return;
    act({ action: 'setException', payload: { id: id, on: !on, reason: on ? 'ยกเลิกการยกเว้น' : v.reason, password: v.password }, title: 'กำลังบันทึกการยกเว้นกฎ', icon: 'bi-shield-exclamation', done: on ? 'ยกเลิกการยกเว้นแล้ว' : 'บันทึกการยกเว้นแล้ว' })
      .then(function () { MEMO = {}; if (MDL) MDL.hide(); PAGES.work(); }).catch(function () { });
  });
}
/**
 * ใบลืมสแกน / เอกสารแนบ — v2.5 แนบให้ผู้อื่นได้ตามสิทธิ์ (หัวหน้าหน่วย = คนในหน่วยที่ดูแล · หัวหน้าฝ่าย = ทั้งฝ่าย · ผู้ดูแลระบบ = ทุกคน)
 * แนบ/ลบได้จนกว่าจะปิดรอบ · แสดงว่าใครเป็นผู้แนบ
 */
function attachFor(empCode, date, ym, self, name) {
  var who = empCode === S.me.empCode ? 'ของท่านเอง' : (name || empCode);
  modal({
    title: 'ใบลืมสแกน / เอกสารแนบ', icon: 'bi-paperclip', iconCls: 'acc', sub: who + ' · ' + thaiDate(date),
    body: (empCode !== S.me.empCode ? noteBox('info', 'bi-person-check', 'ท่านกำลังแนบให้ <b>' + h(name || empCode) + '</b> (' + h(empCode) + ') — ระบบบันทึกชื่อผู้แนบไว้ทุกครั้ง', 'mb-3') : '') +
      '<label class="form-label">เลือกไฟล์ (รูปถ่ายหรือ PDF ไม่เกิน 8 MB)</label><input type="file" class="form-control" id="atF" accept="image/*,application/pdf">' +
      '<label class="form-label mt-3">หมายเหตุ</label><input class="form-control" id="atNote" placeholder="เช่น ใบลืมสแกนลงนามหัวหน้าหน่วยแล้ว">' +
      '<div class="form-label mt-3">ไฟล์ที่แนบไว้</div><div id="atList" class="small-muted">กำลังโหลด…</div>',
    okText: 'อัปโหลด', okIcon: 'bi-cloud-upload',
    onOpen: function (root) {
      api('listAttachments', { ym: ym, empCode: empCode, date: date }).then(function (list) {
        root.querySelector('#atList').innerHTML = list.length ? list.map(function (a) {
          return '<div class="att-row"><i class="bi bi-file-earmark-check text-brand"></i><div class="flex-grow-1"><a href="#" onclick="openAttach(\'' + h(a.id) + '\');return false">' + h(a.fileName) + '</a>' +
            '<div class="small-muted">แนบโดย ' + h(a.byName || a.by) + ' · ' + h(thaiDT(a.at)) + (a.note ? ' · ' + h(a.note) : '') + '</div></div>' +
            (a.canDelete ? '<button class="btn btn-sm btn-danger-soft" onclick="delAttach(\'' + a.id + '\')" title="ลบไฟล์"><i class="bi bi-trash"></i></button>' : '') + '</div>';
        }).join('') : 'ยังไม่มีไฟล์แนบ';
      }).catch(function (e) { root.querySelector('#atList').textContent = e.message; });
    },
    onOk: function (close) {
      var f = $('atF').files[0];
      if (!f) { alertBox('ยังไม่ได้เลือกไฟล์', 'กรุณาเลือกรูปถ่ายหรือไฟล์ PDF', 'info'); return; }
      if (f.size > 8 * 1024 * 1024) { alertBox('ไฟล์ใหญ่เกินไป', 'ไฟล์ต้องไม่เกิน 8 MB — ลองถ่ายรูปใหม่ด้วยความละเอียดต่ำลง', 'warning'); return; }
      var note = $('atNote').value;
      var rd = new FileReader();
      rd.onload = function () {
        close();
        act({ action: 'uploadAttachment', payload: { ym: ym, empCode: empCode, date: date, kind: 'MISS_SCAN', note: note, file: { name: f.name, mimeType: f.type, dataBase64: String(rd.result).split(',')[1] } },
          title: 'กำลังอัปโหลดไฟล์แนบ', text: h(f.name) + ' · ' + Math.round(f.size / 1024) + ' KB · ' + h(who), icon: 'bi-cloud-upload', steps: ['ส่งไฟล์ไปยังเซิร์ฟเวอร์', 'เก็บไฟล์แบบส่วนตัว', 'ผูกกับรายการเวร'], done: 'อัปโหลดเรียบร้อย', quiet: true })
          .then(function () { attachRefresh(self); }).catch(function () { });
      };
      rd.readAsDataURL(f);
    }
  });
}
function attachRefresh(self) {
  if (self || S.page === 'my') PAGES.my();
  else if (S.page === 'work') PAGES.work();
  else if (S.page === 'sched' && !dirtyCount() && !G.saving) PAGES.sched();
}
function delAttach(id) {
  confirmX({ title: 'ลบไฟล์แนบนี้?', ok: 'ลบไฟล์', danger: true }).then(function (y) {
    if (!y) return;
    act({ action: 'deleteAttachment', payload: { id: id }, title: 'กำลังลบไฟล์แนบ', icon: 'bi-trash', done: 'ลบไฟล์แล้ว', quiet: true }).then(function () { if (MDL) MDL.hide(); attachRefresh(false); }).catch(function () { });
  });
}

/* ================================================================ ส่งตรวจ / อนุมัติ */
PAGES.flow = function () {
  var ym = S.ym || thisYmJs();
  var depts = (S.boot.depts || []).filter(function (x) { return myUnitsFor('manage').some(function (u) { return u.deptId === x.deptId; }); });
  $('topExtra').innerHTML = (depts.length > 1 ? '<select class="sel-chip" id="fDept">' + deptOptions(S.deptId, 'ทุกฝ่าย', depts.map(function (x) { return x.deptId; })) + '</select>' : '') + ymSelect('fYm', ym);
  if ($('fDept')) $('fDept').addEventListener('change', function () { S.deptId = this.value; PAGES.flow(); });
  wireYm('fYm', 'flow');
  var draw = function (d) {
    var c = { open: 0, sub: 0, ver: 0, clo: 0 };
    d.units.forEach(function (u) { if (u.status === 'SUBMITTED') c.sub++; else if (u.status === 'VERIFIED') c.ver++; else if (u.status === 'CLOSED' || u.status === 'ARCHIVED') c.clo++; else c.open++; });
    var html = pageHead('bi-patch-check', 'ส่งตรวจ / อนุมัติ · ' + thaiYmJs(d.ym, true), GUIDE.flow.lead);
    html += '<div class="stats">' + statCard('bi-pencil', c.open, 'กำลังบันทึก / ส่งกลับ') + statCard('bi-send', c.sub, 'รอหัวหน้าฝ่ายตรวจ', c.sub ? 'warn' : '') +
      statCard('bi-patch-check', c.ver, 'ตรวจผ่าน รอปิดรอบ', 'info') + statCard('bi-lock', c.clo, 'ปิดรอบแล้ว', 'ok') + '</div>';
    if (!d.units.length) html += emptyBox('bi-buildings', 'ไม่มีหน่วยงานในขอบเขตของท่าน');
    var groups = {};
    d.units.forEach(function (u) { (groups[u.deptId] = groups[u.deptId] || []).push(u); });
    Object.keys(groups).forEach(function (did) {
      if (Object.keys(groups).length > 1) html += '<div class="d-flex align-items-center gap-2 mb-2 mt-2">' + deptChip(did) + '<span class="small-muted">' + groups[did].length + ' หน่วยงาน</span></div>';
      html += '<div class="grid-auto fill anim mb-3" style="--min:330px">' + groups[did].map(function (u) {
        var btns = '<button class="btn btn-sm btn-ghost" onclick="openUnit(\'' + u.unitId + '\')"><i class="bi bi-calendar3-week"></i> เปิดตาราง</button>';
        if (u.canSubmit && (u.status === 'OPEN' || u.status === 'RETURNED')) btns += '<button class="btn btn-sm btn-brand" onclick="doSubmit(\'' + d.ym + '\',\'' + u.unitId + '\')"><i class="bi bi-send"></i> ส่งตรวจ</button>';
        if (u.canVerify && u.status === 'SUBMITTED') btns += '<button class="btn btn-sm btn-ok" onclick="doVerify(\'' + d.ym + '\',\'' + u.unitId + '\')"><i class="bi bi-patch-check"></i> ผ่านการตรวจ</button>';
        if (u.canVerify && (u.status === 'SUBMITTED' || u.status === 'VERIFIED')) btns += '<button class="btn btn-sm btn-danger-soft" onclick="doReturn(\'' + d.ym + '\',\'' + u.unitId + '\')"><i class="bi bi-arrow-return-left"></i> ส่งกลับแก้ไข</button>';
        if (u.canClose && u.status === 'VERIFIED') btns += '<button class="btn btn-sm btn-brand" onclick="doClose(\'' + d.ym + '\',\'' + u.unitId + '\')"><i class="bi bi-lock"></i> ปิดรอบ</button>';
        if (u.canClose && (u.status === 'CLOSED' || u.status === 'VERIFIED' || u.status === 'SUBMITTED')) btns += '<button class="btn btn-sm btn-ghost" onclick="doReopen(\'' + d.ym + '\',\'' + u.unitId + '\')"><i class="bi bi-arrow-counterclockwise"></i> ย้อนสถานะ</button>';
        if (u.canVerify && (u.status === 'CLOSED' || u.status === 'ARCHIVED')) btns += '<button class="btn btn-sm btn-ghost" onclick="doPayRef(\'' + d.ym + '\',\'' + u.unitId + '\',\'' + h(u.payRef || '') + '\')"><i class="bi bi-receipt"></i> เลขที่จ่าย ' + h(u.payRef || '—') + '</button>';
        return '<div class="card-x hov"><div class="card-h"><h3>' + h(u.name) + '</h3><div class="r">' + statusTag(u.status, u.statusTh) + '</div></div>' +
          pipeline(u.status) +
          '<div class="d-flex flex-wrap gap-2 mt-2">' + '<span class="tag t-info"><i class="bi bi-calendar-check"></i>' + num(u.shifts) + ' เวร</span><span class="tag t-open"><i class="bi bi-cash"></i>' + num(u.amount) + ' ฿</span>' +
          (u.red ? '<span class="tag t-red"><i class="bi bi-x-octagon"></i>ต้องแก้ ' + u.red + '</span>' : '<span class="tag t-ok"><i class="bi bi-check-circle"></i>ไม่มีรายการแดง</span>') +
          (u.orange ? '<span class="tag t-orange">ข้อสังเกต ' + u.orange + '</span>' : '') + (u.pending ? '<span class="tag t-orange">รอยืนยัน ' + u.pending + '</span>' : '') + '</div>' +
          (u.reason ? noteBox(u.status === 'RETURNED' ? 'bad' : 'info', 'bi-chat-left-text', h(u.reason), 'mt-2') : '') +
          '<div class="small-muted mt-2" style="line-height:1.7">' +
          (u.submittedAt ? '<i class="bi bi-send"></i> ส่งตรวจ ' + h(thaiDT(u.submittedAt)) + ' โดย ' + h(u.submittedBy) + '<br>' : '') +
          (u.verifiedAt ? '<i class="bi bi-patch-check"></i> ตรวจผ่าน ' + h(thaiDT(u.verifiedAt)) + ' โดย ' + h(u.verifiedBy) + '<br>' : '') +
          (u.closedAt ? '<i class="bi bi-lock"></i> ปิดรอบ ' + h(thaiDT(u.closedAt)) : '') + '</div>' +
          '<div class="d-flex gap-2 flex-wrap mt-3">' + btns + '</div></div>';
      }).join('') + '</div>';
    });
    $('view').innerHTML = html;
    countUp($('view'));
  };
  var _pl = { ym: ym, deptId: S.deptId || '' }; pageData('getPeriods', _pl);
  api('getPeriods', _pl, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function doSubmit(ym, unitId, force) {
  var run = function () {
    act({ action: 'submitMonth', payload: { ym: ym, unitId: unitId, force: !!force }, title: 'กำลังส่งตรวจ', text: h(unitName(unitId)) + ' · ' + thaiYmJs(ym), icon: 'bi-send',
      steps: ['ตรวจรายการที่ต้องแก้ไขทั้งเดือน', 'เปลี่ยนสถานะเป็น “ส่งตรวจแล้ว”', 'บันทึกประวัติ'],
      done: function (r) { return r.ok ? { title: 'ส่งตรวจเรียบร้อย', html: 'แจ้ง' + h(deptOf(unitDept(unitId)) ? deptOf(unitDept(unitId)).chiefTitle : 'หัวหน้าฝ่าย') + 'ให้ตรวจได้เลย', timer: 2200 } : false; } })
      .then(function (r) {
        if (r.ok) { MEMO = {}; PAGES.flow(); return; }
        modal({
          title: 'ยังส่งตรวจไม่ได้ — พบ ' + r.total + ' รายการที่ต้องแก้', icon: 'bi-x-octagon', iconCls: 'bad', size: 'lg',
          body: '<div class="msgs mt-0">' + r.blockers.slice(0, 30).map(function (b) { return '<div class="msg red"><span class="dot"></span>' + h(thaiDate(b.date) + ' · ' + b.empName + ' — ' + b.text) + '</div>'; }).join('') + '</div>' +
            (r.total > 30 ? '<div class="small-muted mt-2">และอีก ' + (r.total - 30) + ' รายการ</div>' : '') +
            (S.me.isAdmin ? noteBox('warn', 'bi-shield-exclamation', 'ผู้ดูแลระบบสามารถ “ส่งทั้งที่ยังมีปัญหา” ได้ แต่ระบบจะบันทึกไว้ในประวัติ', 'mt-3') : ''),
          okText: S.me.isAdmin ? 'ส่งทั้งที่ยังมีปัญหา' : 'ไปแก้ในตารางเวร', cancelText: 'ปิด',
          onOk: function (close) { close(); if (S.me.isAdmin) doSubmit(ym, unitId, true); else openUnit(unitId); }
        });
      }).catch(function () { });
  };
  if (force) { run(); return; }
  confirmX({ title: 'ส่งตรวจ ' + unitName(unitId) + '?', html: 'รอบเดือน <b>' + thaiYmJs(ym, true) + '</b><br><span class="small-muted">หลังส่งตรวจจะแก้ตารางไม่ได้ จนกว่าผู้ตรวจจะส่งกลับ</span>', ok: 'ส่งตรวจ', icon: 'question' })
    .then(function (y) { if (y) run(); });
}
function doVerify(ym, unitId) {
  confirmX({ title: 'ผ่านการตรวจ?', html: 'ยืนยันว่าตรวจสอบตารางเวรและชั่วโมงของ <b>' + h(unitName(unitId)) + '</b> เรียบร้อยแล้ว', ok: 'ผ่านการตรวจ' }).then(function (y) {
    if (!y) return;
    act({ action: 'verifyMonth', payload: { ym: ym, unitId: unitId }, title: 'กำลังบันทึกผลการตรวจ', icon: 'bi-patch-check', done: { title: 'ผ่านการตรวจเรียบร้อย', html: 'ขั้นต่อไป: ผู้ดูแลระบบ/HR ปิดรอบ', timer: 2000 } })
      .then(function () { MEMO = {}; PAGES.flow(); }).catch(function () { });
  });
}
function doReturn(ym, unitId) {
  Swal.fire({
    icon: 'warning', title: 'ส่งกลับแก้ไข', input: 'textarea', inputLabel: 'เหตุผล (หน่วยงานจะเห็นข้อความนี้ที่หน้าตารางเวร)', inputPlaceholder: 'เช่น วันที่ 12 ลงเวรเกินกรอบ กรุณาปรับ',
    showCancelButton: true, confirmButtonText: 'ส่งกลับ', cancelButtonText: 'ยกเลิก', reverseButtons: true,
    inputValidator: function (v) { return !String(v || '').trim() ? 'กรุณาระบุเหตุผล' : null; }
  }).then(function (r) {
    if (!r.isConfirmed) return;
    act({ action: 'returnMonth', payload: { ym: ym, unitId: unitId, reason: r.value.trim() }, title: 'กำลังส่งกลับแก้ไข', icon: 'bi-arrow-return-left', done: 'ส่งกลับแก้ไขเรียบร้อย' })
      .then(function () { MEMO = {}; PAGES.flow(); }).catch(function () { });
  });
}
function doClose(ym, unitId) {
  askPassword('ปิดรอบเดือน', 'ปิดรอบ <b>' + h(unitName(unitId)) + '</b> เดือน ' + thaiYmJs(ym, true) + '<br><span class="small-muted">ข้อมูลจะถูกล็อก และออกไฟล์ HRMi ได้</span>', { ok: 'ปิดรอบ' }).then(function (v) {
    if (!v) return;
    act({ action: 'closeMonth', payload: { ym: ym, unitId: unitId, password: v.password }, title: 'กำลังปิดรอบ', icon: 'bi-lock', done: { title: 'ปิดรอบเรียบร้อย', html: 'ไปที่หน้า “เอกสารและไฟล์ HRMi” เพื่อออกไฟล์ได้เลย', timer: 2400 } })
      .then(function () { MEMO = {}; PAGES.flow(); }).catch(function () { });
  });
}
function doReopen(ym, unitId) {
  askPassword('ย้อนสถานะเป็น “กำลังบันทึก”', 'หน่วยงาน <b>' + h(unitName(unitId)) + '</b> จะกลับมาแก้ไขตารางได้อีกครั้ง', { reason: true, reasonLabel: 'เหตุผลการย้อนสถานะ', ok: 'ย้อนสถานะ' }).then(function (v) {
    if (!v) return;
    act({ action: 'reopenMonth', payload: { ym: ym, unitId: unitId, reason: v.reason, password: v.password }, title: 'กำลังย้อนสถานะ', icon: 'bi-arrow-counterclockwise', done: 'ย้อนสถานะเรียบร้อย' })
      .then(function () { MEMO = {}; PAGES.flow(); }).catch(function () { });
  });
}
function doPayRef(ym, unitId, cur) {
  Swal.fire({ title: 'เลขที่เอกสารจ่าย (จาก HRMi)', input: 'text', inputValue: cur || '', inputPlaceholder: 'เช่น 0202', showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', reverseButtons: true })
    .then(function (r) {
      if (!r.isConfirmed) return;
      act({ action: 'savePayRef', payload: { ym: ym, unitId: unitId, payRef: r.value }, title: 'กำลังบันทึกเลขที่จ่าย', icon: 'bi-receipt', done: 'บันทึกเรียบร้อย', quiet: true })
        .then(function () { MEMO = {}; PAGES.flow(); }).catch(function () { });
    });
}

/* ================================================================ เอกสารและไฟล์ */
PAGES.docs = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = ymSelect('dYm', ym);
  wireYm('dYm', 'docs');
  var units = myUnitsFor('manage');
  var hrDepts = (S.boot.depts || []).filter(function (x) { return units.some(function (u) { return u.deptId === x.deptId && isChiefOfJs(u.unitId); }); });
  var canHr = S.me.isAdmin || (S.me.roles || []).indexOf('CHIEF') >= 0;
  var html = pageHead('bi-file-earmark-arrow-down', 'เอกสารและไฟล์ HRMi · ' + thaiYmJs(ym, true), GUIDE.docs.lead) + '<div class="grid-auto anim" style="--min:320px">';
  html += '<div class="card-x hov"><div class="card-h"><h3><i class="bi bi-file-earmark-pdf"></i> ตารางเวร + รายงานหน่วยปฏิบัติงาน</h3></div>' +
    '<p class="small-muted">A4 แนวนอน 1 ตำแหน่ง = 1 หน้า ย่อให้พอดีหน้า · <b>ฉบับส่ง HR</b> มีช่องลงนาม แถวกรอบเวร เลือกแสดง/ไม่แสดงเงินได้ · หน่วยที่ต้องระบุหน่วยปลายทาง (เช่น IPD&OPD) มีแผ่นที่ 2 รายงานหน่วยที่ไปปฏิบัติ · <b>ฉบับแจกหน่วยงาน</b> ไม่มีลงนาม/เงิน</p>' +
    '<label class="form-label">หน่วยงาน</label><select class="form-select mb-3" id="pdUnit">' + unitOptions(pickUnit(units), units) + '</select>' +
    '<button class="btn btn-brand w-100" id="pdGo"><i class="bi bi-printer"></i> พิมพ์ตารางเวร</button><div id="pdOut"></div></div>';
  html += '<div class="card-x hov"><div class="card-h"><h3><i class="bi bi-table"></i> สรุปค่าตอบแทน / Excel</h3></div>' +
    '<p class="small-muted">พิมพ์สรุป: รายชื่อ จำนวนเวรแยกช่วง รหัสรายได้ จำนวนเงิน พร้อมช่องลงนาม · Excel: ดาวน์โหลดทันที ทุกแถวพร้อมเวลาสแกนและข้อสังเกต</p>' +
    '<label class="form-label">หน่วยงาน</label><select class="form-select mb-3" id="smUnit">' + unitOptions('', units, 'ทุกหน่วยงานที่ท่านดูแล') + '</select>' +
    '<div class="d-flex gap-2"><button class="btn btn-brand flex-grow-1" id="smGo"><i class="bi bi-printer"></i> พิมพ์สรุป</button><button class="btn btn-ghost flex-grow-1" id="xlGo"><i class="bi bi-file-earmark-excel"></i> Excel รายละเอียด</button></div><div id="smOut"></div></div>';
  if (canHr) {
    html += '<div class="card-x hov" style="grid-column:1/-1"><div class="card-h"><h3><i class="bi bi-filetype-xlsx"></i> ไฟล์นำเข้า HRMi</h3><span class="sub">เลือกฝ่าย · หน่วยงาน · รหัสรายได้ · บุคลากร แล้วดูตัวเลขก่อนสร้างไฟล์</span></div>' +
      '<p class="small-muted">หัวตาราง: รหัสพนักงาน · เลขบัตรประชาชน (0) · รหัสรายได้-รายหัก · จำนวน · รายได้ (บาท) · รายหัก (บาท) · รหัสงาน — 1 รหัสรายได้ = 1 ไฟล์ · เลือกหลายรหัสได้เป็น ZIP · ไฟล์จริงออกได้เฉพาะหน่วยงานที่ปิดรอบแล้ว</p>' +
      '<div class="row g-2 mb-2"><div class="col-md-4"><label class="form-label">1 · ฝ่าย</label><select class="form-select" id="hrDept">' + deptOptions(hrDepts.length === 1 ? hrDepts[0].deptId : '', hrDepts.length > 1 ? 'ทุกฝ่ายที่ดูแล' : '', hrDepts.map(function (x) { return x.deptId; })) + '</select></div>' +
      '<div class="col-md-4"><label class="form-label">รูปแบบไฟล์</label><select class="form-select" id="hrMode"><option value="split">แยกไฟล์ตามรหัสรายได้ (หลายรหัส = ZIP)</option><option value="single">รวมทุกรหัสในไฟล์เดียว</option></select></div>' +
      '<div class="col-md-4"><label class="form-label">เฉพาะบุคลากร (ถ้าต้องการ)</label><input class="form-control" id="hrEmp" placeholder="เว้นว่าง = ทุกคน · ใส่รหัสพนักงาน คั่นด้วย ,"></div></div>' +
      '<div id="hrPick"><div class="skeleton" style="height:5em"></div></div>' +
      '<div class="d-flex flex-wrap gap-3 align-items-center mt-3"><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="hrForce"><label class="form-check-label" for="hrForce">ออกไฟล์ทดลอง (ยังไม่ปิดรอบ — ใช้ตรวจตัวเลขก่อน)</label></div>' +
      '<button class="btn btn-brand ms-auto" id="hrGo" style="min-width:220px"><i class="bi bi-download"></i> ดาวน์โหลดไฟล์ HRMi</button></div><div id="hrOut"></div></div>';
  }
  html += '<div class="card-x"><div class="card-h"><h3><i class="bi bi-clock-history"></i> เอกสารที่เคยออกเดือนนี้</h3></div><div id="exList"><div class="skeleton" style="height:3em"></div></div></div></div>';
  $('view').innerHTML = html;

  // v2.4: เอกสารพิมพ์ = ป๊อปอัปพิมพ์ · Excel/HRMi = สร้างไฟล์ในเครื่องแล้วดาวน์โหลดทันที (ไม่ผ่าน Google Drive)
  var printIt = function (btnId, o) {
    $(btnId).addEventListener('click', function () {
      var p = o.payload();
      act({ action: 'printDoc', payload: p, title: o.title, text: o.text(p), icon: 'bi-printer', steps: ['รวบรวมข้อมูลและคำนวณ', 'จัดหน้าเอกสาร A4'], done: false })
        .then(function (r) { printPopup(r); loadEx(); }).catch(function () { });
    });
  };
  $('pdGo').addEventListener('click', function () { openPrintOpts($('pdUnit').value, S.ym || ym, ''); });
  printIt('smGo', { title: 'กำลังเตรียมเอกสารสรุปค่าตอบแทน', payload: function () { return { ym: S.ym || ym, unitId: $('smUnit').value, kind: 'summary' }; },
    text: function (p) { return h(p.unitId ? unitName(p.unitId) : 'ทุกหน่วยงานที่ดูแล'); } });
  $('xlGo').addEventListener('click', function () {
    var p = { ym: S.ym || ym, unitId: $('smUnit').value };
    act({ action: 'excelData', payload: p, title: 'กำลังสร้างไฟล์ Excel', text: h(p.unitId ? unitName(p.unitId) : 'ทุกหน่วยงานที่ดูแล'), icon: 'bi-file-earmark-excel',
      steps: ['รวบรวมข้อมูลทุกเวร', 'สร้างไฟล์ .xlsx ในเครื่องของท่าน'], done: false })
      .then(function (r) {
        return downloadExcel(r).then(function (name) {
          notify('ดาวน์โหลด ' + name + ' แล้ว', 'success');
          $('smOut').innerHTML = noteBox('ok', 'bi-check-circle', 'ดาวน์โหลดแล้ว: <b>' + h(name) + '</b> (ดูในโฟลเดอร์ดาวน์โหลดของเครื่อง)', 'mt-3'); loadEx();
        }, errToast);
      }).catch(function () { });
  });
  if (canHr) {
    var HR = { units: null, codes: null };
    var hrEmps = function () { return ($('hrEmp').value.match(/\d{3,10}/g) || []); };
    var hrPreview = function (keepUnits) {
      var pl = { ym: S.ym || ym, deptId: $('hrDept').value, empCodes: hrEmps() };
      if (keepUnits && HR.units) pl.unitIds = HR.units;
      $('hrPick').innerHTML = '<div class="skeleton" style="height:5em"></div>';
      api('previewHrmi', pl, { fresh: true }).then(function (r) {
        if (!keepUnits) HR.units = r.units.map(function (u) { return u.unitId; });
        HR.codes = r.codes.map(function (x) { return x.code; });
        var q = function (x) { return num(x.qty) + ' ' + h(x.unit); };
        $('hrPick').innerHTML =
          '<label class="form-label mt-1">2 · หน่วยงาน <span class="small-muted">(แตะเพื่อเลือก/ไม่เลือก)</span></label><div class="hr-units mb-3">' + r.units.map(function (u) {
            var on = HR.units.indexOf(u.unitId) >= 0;
            return '<label class="chip' + (on ? ' on' : '') + '" style="cursor:pointer"><input type="checkbox" data-u="' + u.unitId + '"' + (on ? ' checked' : '') + ' hidden>' + (on ? '<i class="bi bi-check-lg"></i> ' : '') + h(u.name) + ' ' + (u.closed ? '<span class="tag t-ok">ปิดรอบแล้ว</span>' : '<span class="tag t-open">' + h(u.statusTh || u.status) + '</span>') + '</label>';
          }).join('') + '</div>' +
          (r.notClosed.length ? noteBox('warn', 'bi-exclamation-triangle', 'ยังไม่ปิดรอบ ' + r.notClosed.length + ' หน่วยงาน — สร้างได้เฉพาะ “ไฟล์ทดลอง” หรือเลือกเฉพาะหน่วยที่ปิดรอบแล้ว', 'mb-3') : '') +
          '<div class="d-flex align-items-center gap-2"><label class="form-label m-0">3 · รหัสรายได้</label><span class="ms-auto"></span>' +
          '<button type="button" class="btn btn-sm btn-ghost" id="hrAll">เลือกทั้งหมด</button><button type="button" class="btn btn-sm btn-ghost" id="hrNone">ไม่เลือก</button></div>' +
          (r.codes.length ? '<div class="hr-codes mt-2">' + r.codes.map(function (x) {
            return '<label class="hr-code"><input type="checkbox" data-code="' + h(x.code) + '" checked><span class="tag t-clo">' + h(x.code) + '</span><span class="nm"><b>' + h(x.name || '') + '</b><small>' + x.people + ' คน</small></span><span class="q">' + q(x) + '<br><span class="small-muted">' + num(x.amount) + ' ฿</span></span></label>';
          }).join('') + '</div>' : emptyBox('bi-inbox', 'ไม่มีรายการตามเงื่อนไขนี้', 'ลองเลือกหน่วยงาน/เดือนอื่น')) +
          '<div class="hr-sum" id="hrSum"></div>';
        var sum = function () {
          var sel = $$('#hrPick [data-code]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.code; });
          var picked = r.codes.filter(function (x) { return sel.indexOf(x.code) >= 0; });
          $$('#hrPick .hr-code').forEach(function (l) { l.classList.toggle('off', !l.querySelector('input').checked); });
          $('hrSum').innerHTML = '<span>เลือก <b>' + picked.length + '</b>/' + r.codes.length + ' รหัส</span><span>รวม <b>' + num(picked.reduce(function (a, x) { return a + x.amount; }, 0)) + '</b> ฿</span><span>' + (HR.units.length) + ' หน่วยงาน</span>' + (hrEmps().length ? '<span>เฉพาะ ' + hrEmps().length + ' คน</span>' : '');
        };
        $$('#hrPick [data-code]').forEach(function (x) { x.addEventListener('change', sum); });
        if ($('hrAll')) $('hrAll').addEventListener('click', function () { $$('#hrPick [data-code]').forEach(function (x) { x.checked = true; }); sum(); });
        if ($('hrNone')) $('hrNone').addEventListener('click', function () { $$('#hrPick [data-code]').forEach(function (x) { x.checked = false; }); sum(); });
        $$('#hrPick [data-u]').forEach(function (x) {
          x.addEventListener('change', function () {
            var u = x.dataset.u, i = HR.units.indexOf(u);
            if (i >= 0) HR.units.splice(i, 1); else HR.units.push(u);
            if (!HR.units.length) { HR.units.push(u); x.checked = true; notify('ต้องเลือกอย่างน้อย 1 หน่วยงาน', 'info'); return; }
            hrPreview(true);
          });
        });
        sum();
      }).catch(function (e) { $('hrPick').innerHTML = noteBox('bad', 'bi-x-octagon', h(e.message)); });
    };
    $('hrDept').addEventListener('change', function () { HR.units = null; hrPreview(false); });
    var et = null; $('hrEmp').addEventListener('input', function () { clearTimeout(et); et = setTimeout(function () { hrPreview(true); }, 700); });
    hrPreview(false);
    $('hrGo').addEventListener('click', function () {
      var codes = $$('#hrPick [data-code]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.code; });
      if (HR.codes && !codes.length) { alertBox('ยังไม่ได้เลือกรหัสรายได้', 'เลือกอย่างน้อย 1 รหัส', 'info'); return; }
      var p = { ym: S.ym || ym, deptId: $('hrDept').value, unitIds: HR.units || [], codes: codes.length === (HR.codes || []).length ? [] : codes, empCodes: hrEmps(), mode: $('hrMode').value, force: $('hrForce').checked };
      act({ action: 'hrmiData', payload: p, title: 'กำลังสร้างไฟล์ HRMi', text: (p.deptId ? h(deptName(p.deptId)) : 'ทุกฝ่ายที่ดูแล') + ' · ' + codes.length + ' รหัส' + (p.force ? ' · ไฟล์ทดลอง' : ''), icon: 'bi-filetype-xlsx',
        steps: ['ตรวจสถานะปิดรอบของหน่วยงานที่เลือก', 'รวมจำนวนตามรหัสรายได้ × บุคคล', 'สร้างไฟล์ .xlsx ในเครื่องของท่าน'], done: false })
        .then(function (r) {
          return downloadHrmi(r).then(function (names) {
            notify(r.files.length > 1 ? 'ดาวน์โหลดไฟล์ ZIP (' + r.files.length + ' ไฟล์) แล้ว' : 'ดาวน์โหลด ' + names[0] + ' แล้ว', 'success');
            $('hrOut').innerHTML = (r.test ? noteBox('warn', 'bi-exclamation-triangle', 'ไฟล์ทดลอง — ยังมีหน่วยงานที่ยังไม่ปิดรอบ ห้ามนำเข้า HRMi จริง', 'mt-3') : '') +
              '<div class="mt-3">' + tableBox(['รหัสรายได้', 'ชื่อ', { t: 'คน', n: 1 }, { t: 'จำนวน', n: 1 }], r.preview.map(function (x) { return ['<span class="tag t-clo">' + h(x.code) + '</span>', h(x.name), num(x.people), num(x.qty) + ' ' + h(x.unit)]; })) + '</div>' +
              noteBox('ok', 'bi-download', 'ดาวน์โหลดแล้ว' + (r.files.length > 1 ? ' <b>' + h(r.zipName) + '.zip</b> — ข้างในมี ' + names.length + ' ไฟล์ แยกตามรหัสรายได้' : '') + ':<div class="small mt-1">' + names.map(h).join(' · ') + '</div>' +
                '<div class="small-muted mt-1">ถ้าเบราว์เซอร์ไม่ดาวน์โหลดอัตโนมัติ ให้กดปุ่มสร้างไฟล์อีกครั้ง</div>', 'mt-2');
            loadEx();
          }, errToast);
        }).catch(function () { });
    });
  }
  var loadEx = function () {
    api('listExports', { ym: S.ym || ym }).then(function (list) {
      $('exList').innerHTML = list.length ? '<div class="d-grid gap-2">' + list.map(function (e) {
        return '<div class="d-flex align-items-center gap-2 small"><span class="tag t-open">' + h({ HRMI: 'HRMi', SCHEDULE_PDF: 'พิมพ์ตารางเวร', SUMMARY_PDF: 'พิมพ์สรุป', EXCEL: 'Excel' }[e.kind] || e.kind) + '</span>' +
          (e.url ? '<a class="text-truncate flex-grow-1" href="' + h(e.url) + '" target="_blank" rel="noopener">' + h(e.fileName) + '</a>' : '<span class="text-truncate flex-grow-1">' + h(e.fileName) + '</span>') +
          '<span class="small-muted text-nowrap">' + h(e.by || '') + ' · ' + h(thaiDT(e.at)) + '</span></div>';
      }).join('') + '</div>' : emptyBox('bi-folder2-open', 'ยังไม่มีเอกสารในเดือนนี้');
    }).catch(function () { $('exList').innerHTML = ''; });
  };
  loadEx();
};

/* ================================================================ รายงานติดตาม */
PAGES.report = function () {
  var ym = S.ym || thisYmJs();
  var units = myUnitsFor('manage');
  $('topExtra').innerHTML = ymSelect('rYm', ym) + '<select class="sel-chip" id="rUnit">' + unitOptions(S.repUnit || '', units, 'ทุกหน่วยงาน') + '</select>' +
    '<select class="sel-chip" id="rPos" title="ตำแหน่ง"><option value="">ทุกตำแหน่ง</option>' + (S.boot.positions || []).map(function (p) { return '<option value="' + h(p.posId) + '"' + (S.repPos === p.posId ? ' selected' : '') + '>' + h(p.name) + '</option>'; }).join('') + '</select>' +
    '<button class="btn btn-icon btn-ghost" onclick="window.print()" title="พิมพ์"><i class="bi bi-printer"></i></button>';
  var flag = '';
  $('rPos').addEventListener('change', function () { S.repPos = this.value; load(); });
  var load = function () {
    S.ym = $('rYm').value; S.repUnit = $('rUnit').value;
    api('getReport', { ym: $('rYm').value, unitId: $('rUnit').value, onlyProblems: true }, { fresh: true }).then(function (d) {
      var html = pageHead('bi-clipboard2-pulse', 'รายงานติดตาม · ' + d.ymTh, GUIDE.report.lead,
        '<span class="small-muted">เลขที่ ' + h(d.refNo) + ' · พิมพ์โดย ' + h(d.printedBy) + ' · ' + h(thaiDT(d.printedAt)) + '</span>');
      var red = d.flagCounts.filter(function (f) { return f.color === 'red'; }).reduce(function (a, f) { return a + f.n; }, 0);
      var ora = d.flagCounts.filter(function (f) { return f.color !== 'red'; }).reduce(function (a, f) { return a + f.n; }, 0);
      html += '<div class="stats">' + statCard('bi-x-octagon', red, 'รายการต้องแก้ไข', red ? 'bad' : 'ok') + statCard('bi-exclamation-triangle', ora, 'ข้อสังเกต', ora ? 'warn' : 'ok') +
        statCard('bi-list-ul', d.all, 'แถวที่มีข้อสังเกต') + statCard('bi-people', d.people, 'บุคลากรที่เกี่ยวข้อง', 'acc') + '</div>';
      html += '<div class="fchips" id="rF"><button class="on" data-f="">ทั้งหมด <b>' + d.rows.length + '</b></button>' + d.flagCounts.map(function (f) {
        return '<button data-f="' + f.flag + '"><span class="dchip" style="--dc:' + (f.color === 'red' ? 'var(--bad)' : 'var(--warn)') + ';padding:0;background:none"></span>' + h(f.text) + ' <b>' + f.n + '</b></button>';
      }).join('') + '</div><div id="rT"></div>' + '<div class="small-muted mt-2">แสดง ' + d.shown + ' จาก ' + d.all + ' รายการ</div>';
      $('view').innerHTML = html;
      countUp($('view'));
      var render = function () {
        var rows = d.rows.filter(function (r) { return (!flag || r.flags.some(function (f) { return f.code === flag; })) && (!S.repPos || r.posId === S.repPos); });
        $('rT').innerHTML = tableBox(['วันที่', 'บุคลากร', 'หน่วยงาน', 'หน่วยที่ไปปฏิบัติ', 'เวร', 'สแกน', { t: 'เงิน', n: 1 }, 'ข้อสังเกต'],
          rows.map(function (r) {
            return [thaiDate(r.date), personCell(r.empName, h(r.empCode) + ' · <b>' + h(r.posId || '') + '</b>' + (r.homeWard ? ' · สังกัด ' + h(r.homeWard) : '')),
              '<a href="#sched" onclick="openUnit(\'' + r.unitId + '\');return false">' + h(r.unitName) + '</a><div>' + deptChip(r.deptId) + '</div>', h(r.wardName || '—'), shiftBadge(r.shiftCode),
              h((r.scanIn || '—') + ' – ' + (r.scanOut || '—')), num(r.amount),
              '<div class="flagbox">' + r.flags.map(function (f) { return '<span class="tag t-' + f.color + '">' + h(f.text) + '</span>'; }).join('') + '</div>'];
          }), { empty: 'ไม่พบรายการที่มีข้อสังเกต', emptyText: 'เยี่ยมมาก! ทุกอย่างเรียบร้อย', emptyIcon: 'bi-emoji-smile', maxh: '62vh' });
      };
      render();
      $$('#rF button').forEach(function (b) { b.addEventListener('click', function () { $$('#rF button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); flag = b.dataset.f; render(); }); });
    }).catch(errToast);
  };
  $('rYm').addEventListener('change', load);
  $('rUnit').addEventListener('change', load);
  load();
};

/* ================================================================ รายงานหน่วยปฏิบัติงาน (แผ่นที่ 2) */
PAGES.wardrep = function () {
  var ym = S.ym || thisYmJs();
  var units = myUnitsFor('manage');
  var def = S.repUnit || (units.filter(function (u) { return u.needWard; })[0] || {}).unitId || '';
  $('topExtra').innerHTML = ymSelect('q2Ym', ym) + '<select class="sel-chip" id="q2Unit">' + unitOptions(def, units, 'ทุกหน่วยงาน') + '</select>' +
    '<button class="btn btn-icon btn-ghost" onclick="window.print()" title="พิมพ์"><i class="bi bi-printer"></i></button>';
  var load = function () {
    S.ym = $('q2Ym').value;
    api('getWardReport', { ym: $('q2Ym').value, unitId: $('q2Unit').value }, { fresh: true }).then(function (d) {
      var head = ['หน่วยที่ไปปฏิบัติ'];
      for (var i = 1; i <= d.days; i++) head.push({ t: String(i), n: 1 });
      head.push({ t: 'รวม', n: 1 });
      var dot = '<span style="color:var(--line)">·</span>';
      var rows = d.wards.map(function (w) {
        var r = ['<b>' + h(w.name) + '</b>'];
        for (var i = 1; i <= d.days; i++) r.push(w.days[i] ? '<b class="text-brand">' + num(w.days[i]) + '</b>' : dot);
        r.push('<b>' + num(w.total) + '</b>'); return r;
      });
      var foot = ['รวมทุกหน่วย'];
      for (var k = 1; k <= d.days; k++) { var s = 0; d.wards.forEach(function (w) { s += w.days[k] || 0; }); foot.push(s ? num(s) : '·'); }
      foot.push(num(d.wards.reduce(function (a, w) { return a + w.total; }, 0)));
      var h2 = ['บุคลากร'].concat(d.wards.map(function (w) { return { t: w.short, n: 1 }; })).concat([{ t: 'รวมเวร', n: 1 }]);
      var r2 = d.people.map(function (p) {
        var r = [personCell(p.empName, h(p.empCode))];
        d.wards.forEach(function (w) { r.push(p.wards[w.wardId] ? num(p.wards[w.wardId]) : dot); });
        r.push('<b>' + num(p.total) + '</b>'); return r;
      });
      $('view').innerHTML = pageHead('bi-diagram-3', 'รายงานหน่วยปฏิบัติงาน · ' + d.unitName + ' · ' + d.ymTh, GUIDE.wardrep.lead) +
        '<div class="card-x"><div class="card-h"><h3><i class="bi bi-grid-3x3"></i> ตารางที่ 1 — จำนวนเวรรายหน่วยรายวัน</h3><span class="sub">' + d.wards.length + ' หน่วย</span></div>' +
        tableBox(head, rows, { foot: foot, empty: 'ยังไม่มีข้อมูลหน่วยที่ไปปฏิบัติ', emptyText: 'รายงานนี้ใช้กับหน่วยงานที่ต้องระบุหน่วยที่ไปปฏิบัติ เช่น IPD&OPD', emptyIcon: 'bi-geo-alt' }) + '</div>' +
        '<div class="card-x"><div class="card-h"><h3><i class="bi bi-people"></i> ตารางที่ 2 — บุคลากรไปปฏิบัติงานหน่วยใดบ้าง</h3><span class="sub">' + d.people.length + ' คน</span></div>' +
        tableBox(h2, r2, { empty: 'ยังไม่มีข้อมูล', emptyIcon: 'bi-people' }) + '</div>';
    }).catch(errToast);
  };
  $('q2Ym').addEventListener('change', load);
  $('q2Unit').addEventListener('change', function () { S.repUnit = this.value; load(); });
  load();
};
