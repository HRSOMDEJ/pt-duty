/**
 * pages.js — หน้าใช้งานหลัก: หน้าแรก · เวรของฉัน · ตารางเวร · ตรวจการปฏิบัติงาน · ส่งตรวจ/อนุมัติ · เอกสาร · รายงาน
 */
var PAGES = {};

/* ================================================================ หน้าแรก */
PAGES.home = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = '<select id="hYm" style="width:auto">' + ymOptions(ym) + '</select>';
  $('hYm').addEventListener('change', function () { S.ym = this.value; PAGES.home(); });
  var draw = function (d) {
    S.ym = d.ym;
    var late = d.daysLeft;
    var dueTxt = late < 0 ? 'เลยกำหนดมาแล้ว ' + Math.abs(late) + ' วัน' : late === 0 ? 'ครบกำหนดวันนี้' : 'เหลืออีก ' + late + ' วัน';
    var dueCls = late < 0 ? 'badish' : late <= 2 ? 'warnish' : 'okish';
    var html =
      helpBox('home') +
      '<div class="grid g4" style="margin-bottom:.8rem">' +
      '<div class="stat ' + dueCls + '"><b>' + h(dueTxt) + '</b><span>เส้นตายส่งเอกสาร ' + h(d.due) + '</span></div>' +
      '<div class="stat"><b>' + num(d.totals.shifts) + '</b><span>เวรทั้งหมดในเดือน ' + h(d.ymTh) + '</span></div>' +
      '<div class="stat"><b>' + num(d.totals.amount) + '</b><span>ค่าตอบแทนรวม (บาท)</span></div>' +
      '<div class="stat ' + (d.totals.red ? 'badish' : 'okish') + '"><b>' + num(d.totals.red) + '</b><span>รายการที่ต้องแก้ไข</span></div>' +
      '</div>';

    html += '<div class="card"><div class="row"><h3>สถานะรายหน่วยงาน</h3>' +
      '<span class="sub right">' + h(d.monthTh) + '</span></div>' +
      tableBox(
        ['หน่วยงาน', 'สถานะ', { t: 'เวร', n: 1 }, { t: 'ค่าตอบแทน', n: 1 }, { t: 'ต้องแก้ไข', n: 1 }, { t: 'ข้อสังเกต', n: 1 }, { t: 'รอยืนยัน', n: 1 }, 'เลขที่จ่าย', ''],
        d.units.map(function (u) {
          return [
            h(u.name), statusTag(u.status, u.statusTh), num(u.shifts), num(u.amount),
            u.red ? '<b style="color:var(--bad)">' + u.red + '</b>' : '0',
            u.orange ? '<span style="color:var(--warn)">' + u.orange + '</span>' : '0',
            u.pending ? '<span style="color:var(--warn)">' + u.pending + '</span>' : '0',
            h(u.payRef || '—'),
            '<button class="btn btn-sm" onclick="openUnit(\'' + u.unitId + '\')">เปิดตาราง</button>'
          ];
        }), { empty: 'ยังไม่มีหน่วยงานที่เปิดใช้งาน' }) + '</div>';

    html += '<div class="card"><div class="row"><h3>เวรของฉันเดือนนี้</h3>' +
      '<span class="right sub">' + num(d.my.shifts) + ' เวร · ' + num(d.my.amount) + ' บาท</span></div>';
    if (!d.my.rows.length) html += '<div class="empty">เดือนนี้ท่านยังไม่มีเวร Part Time</div>';
    else {
      html += '<div class="row" style="gap:.3rem;margin-top:.5rem">' + d.my.rows.map(function (r) {
        var red = (r.flags || []).some(function (f) { return flagColor(f) === 'red'; });
        return '<span class="tag ' + (red ? 't-red' : r.bookStatus === 'PENDING' ? 't-orange' : 't-clo') + '" title="' +
          h(unitName(r.unitId) + (r.wardId ? ' · ' + wardName(r.wardId) : '') + ' ' + (r.shiftText || '')) + '">' +
          'วันที่ ' + r.day + ' ' + h(r.shiftCode) + (r.wardId ? ' · ' + h(wardShort(r.wardId)) : '') + '</span>';
      }).join('') + '</div>';
    }
    html += '<div class="row" style="margin-top:.7rem"><button class="btn btn-soft btn-sm" onclick="go(\'my\')">ไปหน้าเวรของฉัน</button>';
    if (d.bookingOpen && d.bookingOpen.open) html += '<span class="tag t-ok">เปิดให้ลงตารางเวรถึง ' + h(d.bookingOpen.to) + '</span>';
    html += '</div></div>';
    $('page').innerHTML = html;
  };
  api('getDashboard', { ym: ym }, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};
function openUnit(unitId) { S.unitId = unitId; go('sched'); }

/* ================================================================ เวรของฉัน */
PAGES.my = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = '<select id="myYm" style="width:auto">' + ymOptions(ym) + '</select>';
  $('myYm').addEventListener('change', function () { S.ym = this.value; PAGES.my(); });

  var draw = function (d) {
    var byDay = {};
    d.rows.forEach(function (r) { (byDay[r.day] = byDay[r.day] || []).push(r); });
    var cells = d.calendar.map(function (c) {
      var list = byDay[c.day] || [];
      var cls = c.dayType === 'SAT' || c.dayType === 'SUN' ? 'we' : (c.dayType === 'PUBHOL' || c.dayType === 'COMP' ? 'hol' : '');
      return '<div class="card" style="padding:.5rem .6rem;' +
        (cls === 'we' ? 'background:var(--day-we);' : cls === 'hol' ? 'background:var(--day-hol);' : '') + '">' +
        '<div class="row"><b>' + c.day + '</b><span class="sub">' + ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][c.dow] + '</span>' +
        (c.name ? '<span class="sub right" style="font-size:.72rem">' + h(c.name) + '</span>' : '') + '</div>' +
        (list.length ? list.map(function (r) {
          var red = r.flags.some(function (f) { return flagColor(f) === 'red'; });
          return '<div style="margin-top:.3rem;font-size:.84rem">' +
            '<b style="color:var(--brand-600)">' + h(r.shiftCode) + '</b> ' + h(unitName(r.unitId)) +
            (r.wardId ? ' · <span style="color:var(--accent)">' + h(wardShort(r.wardId)) + '</span>' : '') +
            '<div class="sub">' + h(r.shiftText) + ' · ' + num(r.amount) + ' บาท</div>' +
            (r.scanIn || r.scanOut ? '<div class="sub">สแกน ' + h(r.scanIn || '—') + ' – ' + h(r.scanOut || '—') + '</div>' : '') +
            (r.flags.length ? '<div style="margin-top:.2rem">' + flagChips(r.flags) + '</div>' : '') +
            (r.bookStatus === 'PENDING' ? '<button class="btn btn-sm btn-danger" style="margin-top:.3rem" onclick="cancelMine(\'' + r.id + '\')">ยกเลิกเวรนี้</button>' : '') +
            '</div>';
        }).join('') : '<div class="sub" style="margin-top:.3rem">—</div>') +
        '</div>';
    }).join('');

    var html = helpBox('my') +
      '<div class="grid g4" style="margin-bottom:.8rem">' +
      '<div class="stat"><b>' + num(d.total.shifts) + '</b><span>เวรในเดือน ' + h(d.ymTh) + '</span></div>' +
      '<div class="stat"><b>' + num(d.total.amount) + '</b><span>ค่าตอบแทนรวม (บาท)</span></div>' +
      '<div class="stat"><b>' + num(d.total.hours) + '</b><span>ชั่วโมงรวม</span></div>' +
      '<div class="stat"><b>' + h(d.me && d.me.homeWard ? d.me.homeWard : '—') + '</b><span>หน่วยต้นสังกัด (ลงเวรที่นี่ไม่ได้)</span></div>' +
      '</div>';

    if (d.booking && d.booking.open) {
      html += '<div class="note ok" style="margin-bottom:.8rem"><b>เปิดให้ลงบันทึกตารางเวร</b> ' +
        h(d.booking.from) + ' ถึง ' + h(d.booking.to) +
        ' <button class="btn btn-sm btn-pri" style="margin-left:.5rem" onclick="openSelfBook(\'' + d.ym + '\')">ลงบันทึกตารางเวรของฉัน</button></div>';
    } else if (d.booking) {
      html += '<div class="note" style="margin-bottom:.8rem">ช่วงลงบันทึกตารางเวรของเดือน ' + h(d.ymTh) + ' คือ ' +
        h(d.booking.from) + ' ถึง ' + h(d.booking.to) + ' · นอกช่วงนี้กรุณาแจ้งหัวหน้าหอ</div>';
    }
    html += '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">' + cells + '</div>';
    $('page').innerHTML = html;
  };
  api('getMySchedule', { ym: ym }, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function cancelMine(id) {
  confirmBox('ยกเลิกเวร', 'ยืนยันยกเลิกเวรนี้? (ยกเลิกได้เฉพาะเวรที่ยังไม่ได้รับการยืนยันจากหัวหน้าหอ)', function () {
    api('cancelBook', { id: id }).then(function () { toast('ยกเลิกแล้ว', 'ok'); PAGES.my(); }).catch(errToast);
  }, true);
}

function openSelfBook(ym) {
  var unitId = (S.boot.units[0] || {}).unitId;
  var days = new Date(+ym.split('-')[0], +ym.split('-')[1], 0).getDate();
  var body = '<div class="field"><label class="fl">หน่วยงาน</label><select id="sbUnit">' + unitOptions(unitId) + '</select></div>' +
    '<div class="field"><label class="fl">หน่วยที่ไปปฏิบัติ (สำหรับ IPD&amp;OPD)</label><select id="sbWard">' +
    '<option value="">— เลือกหน่วย —</option>' +
    (S.boot.wards || []).map(function (w) {
      return '<option value="' + w.wardId + '"' + (w.wardId === S.me.homeWardId ? ' disabled' : '') + '>' + h(w.name) + (w.wardId === S.me.homeWardId ? ' (หน่วยต้นสังกัดของท่าน)' : '') + '</option>';
    }).join('') + '</select></div>' +
    '<div class="field"><label class="fl">เลือกวันและรหัสเวร</label><div id="sbDays" class="row" style="gap:.25rem"></div></div>' +
    '<div class="sub">คลิกวันที่เพื่อเลือกเวร · เลือกได้หลายวันพร้อมกัน · เวรที่ลงจะมีสถานะ “รอหัวหน้าหอยืนยัน”</div>';
  var picked = {};
  modal({
    title: 'ลงบันทึกตารางเวร ' + thaiYmJs(ym), body: body, okText: 'บันทึก',
    onOpen: function (mask) {
      var box = mask.querySelector('#sbDays');
      var html = '';
      for (var d = 1; d <= days; d++) html += '<button class="btn btn-sm" data-d="' + d + '" style="min-width:46px">' + d + '</button>';
      box.innerHTML = html;
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          var d = +b.dataset.d;
          openCellPop({
            anchor: b, codes: ['ช', 'ช1', 'ช2', 'บ', 'บ1', 'บ2', 'ด', 'ด1', 'ด2'], code: picked[d] || '',
            needWard: false, title: 'วันที่ ' + d,
            onPick: function (code) {
              if (code) { picked[d] = code; b.classList.add('btn-pri'); b.textContent = d + ' ' + code; }
              else { delete picked[d]; b.classList.remove('btn-pri'); b.textContent = d; }
            }
          });
        });
      });
    },
    onOk: function (close, mask) {
      var unit = mask.querySelector('#sbUnit').value, ward = mask.querySelector('#sbWard').value;
      var items = Object.keys(picked).map(function (d) { return { day: +d, code: picked[d], wardId: ward }; });
      if (!items.length) { toast('ยังไม่ได้เลือกวัน', 'warn'); return; }
      api('saveMyBooking', { ym: ym, unitId: unit, items: items }).then(function (r) {
        toast('บันทึก ' + r.saved + ' เวร รอหัวหน้าหอยืนยัน', 'ok');
        if (r.warnings && r.warnings.length) toast(r.warnings.join(' · '), 'warn', 8000);
        close(); PAGES.my();
      }).catch(errToast);
    }
  });
}

/* ================================================================ ตารางเวร (หน้าหลักของระบบ) */
var G = { data: null, dirty: {}, ym: '', unitId: '' };
var SCAN_FLAGS = ['NO_SCAN', 'NO_IN', 'NO_OUT', 'SCAN_LATE', 'SCAN_EARLY', 'HOURS_SHORT', 'NO_ATTACH'];

PAGES.sched = function () {
  var ym = S.ym || thisYmJs();
  var units = (S.boot.units || []);
  var unitId = S.unitId || (units[0] || {}).unitId;
  S.unitId = unitId;
  $('topExtra').innerHTML =
    '<select id="gUnit" style="width:auto">' + unitOptions(unitId) + '</select>' +
    '<select id="gYm" style="width:auto">' + ymOptions(ym) + '</select>' +
    '<button class="btn btn-sm" id="gReload"><i class="bi bi-arrow-clockwise"></i></button>';
  $('gUnit').addEventListener('change', function () { S.unitId = this.value; PAGES.sched(); });
  $('gYm').addEventListener('change', function () { S.ym = this.value; PAGES.sched(); });
  $('gReload').addEventListener('click', function () { MEMO = {}; PAGES.sched(); });

  var draw = function (d) {
    G.data = d; G.ym = d.ym; G.unitId = d.unit.unitId; G.dirty = {};
    $('page').innerHTML = renderGrid(d);
    wireGrid();
  };
  api('getSchedule', { ym: ym, unitId: unitId }, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function renderGrid(d) {
  var days = d.calendar.length, needWard = d.unit.needWard;
  var html = helpBox('sched');

  html += '<div class="card" style="padding:.7rem .8rem;margin-bottom:.7rem"><div class="row">' +
    '<b>' + h(d.unit.name) + '</b>' + statusTag(d.period.status, d.period.statusTh) +
    (needWard ? '<span class="tag t-orange">ต้องระบุหน่วยที่ไปปฏิบัติทุกวัน</span>' : '') +
    (d.summary ? '<span class="sub">' + num(d.summary.shifts) + ' เวร · ' + num(d.summary.amount) + ' บาท</span>' : '') +
    '<div class="right row">' +
    (d.canEdit ? '<button class="btn btn-sm" id="gAdd"><i class="bi bi-person-plus"></i> เพิ่มบุคลากร</button>' : '') +
    (d.canEdit ? '<button class="btn btn-sm" id="gConfirm"><i class="bi bi-check2-all"></i> ยืนยันทั้งตาราง</button>' : '') +
    (d.canEdit ? '<button class="btn btn-sm btn-pri" id="gSave" disabled><i class="bi bi-save"></i> บันทึก</button>' : '') +
    '</div></div>' +
    (d.period.reason ? '<div class="note bad" style="margin-top:.5rem"><b>ถูกส่งกลับ:</b> ' + h(d.period.reason) + '</div>' : '') +
    (d.locked ? '<div class="note" style="margin-top:.5rem">รอบเดือนนี้ปิดแล้ว ดูได้อย่างเดียว</div>' : '') +
    '</div>';

  html += '<div class="schedwrap"><table class="sched" id="grid"><thead><tr>' +
    '<th class="nmh">บุคลากร (' + d.people.length + ' คน)</th>';
  d.calendar.forEach(function (c) {
    var cls = c.dayType === 'SAT' || c.dayType === 'SUN' ? ' we' : (c.dayType === 'PUBHOL' ? ' hol' : c.dayType === 'COMP' ? ' comp' : '');
    html += '<th class="day' + cls + '" id="dh' + c.day + '" title="' + h(c.name || '') + '">' + c.day +
      '<small>' + ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][c.dow] + '</small></th>';
  });
  html += '<th class="tot" style="text-align:right">รวม</th></tr></thead><tbody>';

  d.people.forEach(function (p, ri) {
    html += '<tr data-emp="' + p.empCode + '"><td class="nm"><b>' + h(p.empName) + '</b>' +
      '<span>' + h(p.empCode) + (p.homeWard ? ' · <span class="hw">สังกัด ' + h(p.homeWard) + '</span>' : '') + '</span></td>';
    for (var day = 1; day <= days; day++) {
      var c = p.cells[day], cal = d.calendar[day - 1];
      var cls = 'cell' + (cal.dayType === 'SAT' || cal.dayType === 'SUN' ? ' we' : (cal.dayType === 'PUBHOL' || cal.dayType === 'COMP' ? ' hol' : ''));
      var red = c && c.flags.some(function (f) { return flagColor(f) === 'red'; });
      // ธงเรื่องสแกนนิ้วไม่ระบายสีในหน้าตารางเวร (ไปแสดงที่หน้าตรวจการปฏิบัติงาน) กันตารางเป็นสีส้มทั้งแผ่น
      var orange = c && !red && c.flags.some(function (f) { return SCAN_FLAGS.indexOf(f) < 0; });
      if (red) cls += ' bad'; else if (orange) cls += ' warn';
      if (c && c.book === 'PENDING') cls += ' pend';
      var wtxt = '', wcls = 'wt';
      if (c && c.code) {
        if (c.wardId) { wtxt = wardShort(c.wardId); wcls += ' set'; }
        else if (needWard) { wtxt = 'ไม่ระบุ'; wcls += ' miss'; }
      }
      html += '<td class="' + cls + '" id="c' + ri + '_' + day + '" data-r="' + ri + '" data-d="' + day + '"' +
        (c && c.flags.length ? ' title="' + h(c.flags.map(flagText).join(' · ')) + '"' : '') + '>' +
        '<input maxlength="14" data-r="' + ri + '" data-d="' + day + '" value="' + h(c ? c.code : '') + '"' +
        (d.canEdit ? '' : ' disabled') + ' aria-label="' + h(p.empName) + ' วันที่ ' + day + '">' +
        '<span class="' + wcls + '" data-r="' + ri + '" data-d="' + day + '">' + h(wtxt) + '</span></td>';
    }
    html += '<td class="tot"><b>' + num(p.shifts) + '</b> เวร' +
      (p.amount != null ? '<span class="sub">' + num(p.amount) + ' บ.</span>' : '') + '</td></tr>';
  });
  if (!d.people.length) html += '<tr><td class="nm">—</td><td colspan="' + (days + 1) + '" style="padding:1.2rem;text-align:center;color:var(--muted)">ยังไม่มีบุคลากรในตารางนี้ · กด “เพิ่มบุคลากร” เพื่อเริ่ม</td></tr>';
  html += '</tbody><tfoot>' + quotaRows(d) + '</tfoot></table></div>';

  html += '<div class="legend">' +
    '<span><i style="background:var(--bad)"></i>ต้องแก้ไข</span>' +
    '<span><i style="background:var(--warn)"></i>ข้อสังเกต</span>' +
    '<span><i style="background:var(--accent)"></i>หน่วยที่ระบุเองวันนั้น</span>' +
    '<span><i style="background:var(--day-we)"></i>เสาร์-อาทิตย์</span>' +
    '<span><i style="background:var(--day-hol)"></i>นักขัตฤกษ์/ชดเชย</span>' +
    '<span>จุดส้มมุมขวาบน = รอหัวหน้าหอยืนยัน</span>' +
    '<span>ผลตรวจสแกนนิ้วดูที่หน้า “ตรวจการปฏิบัติงาน”</span></div>';
  html += '<div class="msgs" id="gMsgs"></div>';
  return html;
}

function quotaRows(d) {
  var out = '';
  ['ช', 'บ', 'ด'].forEach(function (s) {
    if (d.unit.slots.indexOf(s) < 0) return;
    out += '<tr><td class="lb">' + (s === 'ช' ? 'เช้า' : s === 'บ' ? 'บ่าย' : 'ดึก') + ' (หน่วยนี้/ทั้งฝ่าย)</td>';
    for (var day = 1; day <= d.calendar.length; day++) {
      var u = d.board.unit[s][day] || 0, dp = d.board.dept[s][day] || 0;
      var lu = d.board.limits.unit[s][day], ld = d.board.limits.dept[s][day];
      var cls = '';
      if ((lu != null && u > lu) || (ld != null && dp > ld)) cls = 'hot';
      else if ((lu != null && u === lu && u > 0) || (ld != null && dp === ld && dp > 0)) cls = 'full';
      out += '<td class="' + cls + '" title="หน่วยนี้ ' + u + (lu != null ? '/' + lu : '') + ' · ทั้งฝ่าย ' + dp + (ld != null ? '/' + ld : '') + '">' +
        (u || '·') + '</td>';
    }
    out += '<td class="tot"></td></tr>';
  });
  return out;
}

function wireGrid() {
  var tbl = $('grid');
  if (!tbl) return;
  var d = G.data, days = d.calendar.length;

  var markDirty = function (ri, day) {
    var p = d.people[ri];
    var c = p.cells[day] || (p.cells[day] = { code: '', wardId: '', flags: [], book: 'CONFIRMED' });
    G.dirty[p.empCode + '|' + day] = { empCode: p.empCode, day: day, code: c.code, wardId: c.wardId };
    var td = $('c' + ri + '_' + day);
    if (td) td.classList.add('dirty');
    var btn = $('gSave'); if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> บันทึก (' + Object.keys(G.dirty).length + ')'; }
  };
  var refreshWard = function (ri, day) {
    var p = d.people[ri], c = p.cells[day] || {};
    var td = $('c' + ri + '_' + day); if (!td) return;
    var wt = td.querySelector('.wt');
    if (!c.code) { wt.textContent = ''; wt.className = 'wt'; return; }
    if (c.wardId) { wt.textContent = wardShort(c.wardId); wt.className = 'wt set'; }
    else if (d.unit.needWard) {
      var prev = '';
      for (var k = day - 1; k >= 1; k--) { var pc = p.cells[k]; if (pc && pc.code && pc.wardId) { prev = pc.wardId; break; } }
      if (prev) { wt.textContent = wardShort(prev); wt.className = 'wt'; }
      else { wt.textContent = 'ไม่ระบุ'; wt.className = 'wt miss'; }
    } else { wt.textContent = ''; wt.className = 'wt'; }
  };

  tbl.addEventListener('input', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d) return;
    var ri = +el.dataset.r, day = +el.dataset.d, v = el.value.trim();
    var p = d.people[ri];
    var c = p.cells[day] || (p.cells[day] = { code: '', wardId: '', flags: [], book: 'CONFIRMED' });
    var cut = v.indexOf('/'); if (cut < 0) cut = v.indexOf(' ');
    if (cut >= 0) {
      var w = wardByText(v.slice(cut + 1));
      c.code = v.slice(0, cut);
      if (w) c.wardId = w;
      else if (v.slice(cut + 1).trim()) toast('ไม่รู้จักหน่วย "' + v.slice(cut + 1) + '"', 'warn', 2500);
    } else c.code = v;
    markDirty(ri, day); refreshWard(ri, day);
  });

  tbl.addEventListener('click', function (e) {
    var wt = e.target.closest ? e.target.closest('.wt') : null;
    if (!wt || !d.canEdit) return;
    var ri = +wt.dataset.r, day = +wt.dataset.d, p = d.people[ri];
    var c = p.cells[day] || (p.cells[day] = { code: '', wardId: '', flags: [], book: 'CONFIRMED' });
    openCellPop({
      anchor: wt, codes: d.codes, code: c.code, wardId: c.wardId, needWard: d.unit.needWard,
      title: p.empName + ' · วันที่ ' + day,
      onPick: function (code, wardId) {
        c.code = code; if (wardId !== undefined) c.wardId = wardId;
        var inp = tbl.querySelector('input[data-r="' + ri + '"][data-d="' + day + '"]');
        if (inp) inp.value = code;
        markDirty(ri, day); refreshWard(ri, day);
      }
    });
  });

  tbl.addEventListener('keydown', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d) return;
    var r = +el.dataset.r, day = +el.dataset.d, nr = r, nd = day;
    if (e.key === 'ArrowRight' || e.key === 'Enter') nd = Math.min(days, day + 1);
    else if (e.key === 'ArrowLeft') nd = Math.max(1, day - 1);
    else if (e.key === 'ArrowDown') nr = Math.min(d.people.length - 1, r + 1);
    else if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
    else if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveGrid(); return; }
    else return;
    e.preventDefault(); closePop();
    var n = tbl.querySelector('input[data-r="' + nr + '"][data-d="' + nd + '"]');
    if (n) { n.focus(); n.select(); }
  });

  /* วางจาก Excel ได้ทั้งบล็อก */
  tbl.addEventListener('paste', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.dataset.d) return;
    var txt = (e.clipboardData || window.clipboardData).getData('text') || '';
    if (!/[\t\n\r]/.test(txt)) return;
    e.preventDefault();
    var r0 = +el.dataset.r, d0 = +el.dataset.d, n = 0;
    txt.replace(/\r/g, '').split('\n').forEach(function (line, i) {
      line.split('\t').forEach(function (val, j) {
        var ri = r0 + i, day = d0 + j;
        if (ri >= d.people.length || day > days) return;
        var p = d.people[ri];
        var c = p.cells[day] || (p.cells[day] = { code: '', wardId: '', flags: [], book: 'CONFIRMED' });
        var v = String(val).trim(), cut = v.indexOf('/'); if (cut < 0) cut = v.indexOf(' ');
        if (cut >= 0) { var w = wardByText(v.slice(cut + 1)); c.code = v.slice(0, cut); if (w) c.wardId = w; }
        else c.code = v;
        var inp = tbl.querySelector('input[data-r="' + ri + '"][data-d="' + day + '"]');
        if (inp) inp.value = c.code;
        markDirty(ri, day); refreshWard(ri, day); n++;
      });
    });
    toast('วางข้อมูล ' + n + ' ช่อง — อย่าลืมกดบันทึก', 'ok');
  });

  if ($('gSave')) $('gSave').addEventListener('click', saveGrid);
  if ($('gAdd')) $('gAdd').addEventListener('click', addPerson);
  if ($('gConfirm')) $('gConfirm').addEventListener('click', function () {
    confirmBox('ยืนยันทั้งตาราง', 'ยืนยันเวรที่บุคลากรลงไว้ทั้งหมดของหน่วยงานนี้ (สถานะ “รอยืนยัน” จะกลายเป็น “ยืนยันแล้ว”)', function () {
      api('confirmBook', { ym: G.ym, unitId: G.unitId }).then(function (r) {
        toast('ยืนยัน ' + r.confirmed + ' เวร', 'ok');
        G.data = r.schedule; $('page').innerHTML = renderGrid(r.schedule); wireGrid();
      }).catch(errToast);
    });
  });
  showGridMsgs();
}

function showGridMsgs() {
  var d = G.data, msgs = [];
  d.people.forEach(function (p) {
    Object.keys(p.cells).forEach(function (day) {
      var c = p.cells[day];
      (c.flags || []).forEach(function (f) {
        if (SCAN_FLAGS.indexOf(f) >= 0) return;
        msgs.push({ c: flagColor(f), t: p.empName + ' วันที่ ' + day + ' — ' + flagText(f) });
      });
    });
  });
  var box = $('gMsgs'); if (!box) return;
  var seen = {}, uniq = msgs.filter(function (m) { var k = m.c + m.t; if (seen[k]) return false; seen[k] = 1; return true; });
  uniq.sort(function (a, b) { return a.c === b.c ? 0 : a.c === 'red' ? -1 : 1; });
  box.innerHTML = uniq.length
    ? uniq.slice(0, 12).map(function (m) { return '<div class="msg ' + m.c + '"><span class="dot"></span>' + h(m.t) + '</div>'; }).join('') +
      (uniq.length > 12 ? '<div class="msg" style="color:var(--muted)"><span class="dot" style="background:var(--muted)"></span>และอีก ' + (uniq.length - 12) + ' รายการ (ดูทั้งหมดที่หน้ารายงานติดตาม)</div>' : '')
    : '<div class="msg ok"><span class="dot"></span>ตรวจแล้วไม่พบข้อผิดพลาด ตารางนี้ส่งตรวจได้</div>';
}

function saveGrid() {
  var cells = Object.keys(G.dirty).map(function (k) { return G.dirty[k]; });
  if (!cells.length) { toast('ยังไม่มีการเปลี่ยนแปลง', 'warn'); return; }
  var btn = $('gSave'); if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก…'; }
  api('saveCells', { ym: G.ym, unitId: G.unitId, cells: cells }).then(function (r) {
    toast('บันทึก ' + r.saved + ' ช่อง' + (r.deleted ? ' · ลบ ' + r.deleted : ''), 'ok');
    if (r.warnings && r.warnings.length) toast(r.warnings.slice(0, 3).join(' · '), 'warn', 8000);
    G.data = r.schedule; G.dirty = {};
    $('page').innerHTML = renderGrid(r.schedule); wireGrid();
  }).catch(function (e) {
    errToast(e);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> บันทึก (' + Object.keys(G.dirty).length + ')'; }
  });
}

function addPerson() {
  modal({
    title: 'เพิ่มบุคลากรเข้าตาราง',
    body: '<div class="field"><label class="fl">ค้นหาจากรหัสพนักงานหรือชื่อ</label><input id="apQ" placeholder="เช่น 5501201 หรือ กมลชนก"></div>' +
      '<div id="apList" class="tbox" style="max-height:280px"></div>',
    okText: null,
    onOpen: function (mask, close) {
      var q = mask.querySelector('#apQ'), box = mask.querySelector('#apList'), t = null;
      var search = function () {
        api('searchEmployees', { q: q.value }).then(function (list) {
          box.innerHTML = list.length
            ? '<table class="tb"><tbody>' + list.map(function (e) {
                return '<tr><td><b>' + h(e.fullName) + '</b><div class="sub">' + h(e.empCode) + ' · ' + h(e.hrPosition || '') +
                  (e.wardName ? ' · สังกัด ' + h(e.wardName) : '') + '</div></td>' +
                  '<td class="n"><button class="btn btn-sm btn-pri" data-add="' + e.empCode + '" data-name="' + h(e.fullName) + '">เพิ่ม</button></td></tr>';
              }).join('') + '</tbody></table>'
            : '<div class="empty">ไม่พบรายชื่อ</div>';
          Array.prototype.forEach.call(box.querySelectorAll('[data-add]'), function (b) {
            b.addEventListener('click', function () {
              var code = b.dataset.add;
              if (G.data.people.some(function (p) { return p.empCode === code; })) { toast('มีอยู่ในตารางแล้ว', 'warn'); return; }
              G.data.people.push({ empCode: code, empName: b.dataset.name, cells: {}, shifts: 0, amount: 0, homeWard: '', red: 0, orange: 0 });
              $('page').innerHTML = renderGrid(G.data); wireGrid();
              toast('เพิ่ม ' + b.dataset.name + ' แล้ว — ลงเวรในแถวใหม่ได้เลย', 'ok');
              close();
            });
          });
        }).catch(errToast);
      };
      q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(search, 300); });
      search();
    }
  });
}

/* ================================================================ ตรวจการปฏิบัติงาน */
PAGES.work = function () {
  var ym = S.ym || thisYmJs(), unitId = S.unitId || (S.boot.units[0] || {}).unitId;
  $('topExtra').innerHTML =
    '<select id="wUnit" style="width:auto">' + unitOptions(unitId, true) + '</select>' +
    '<select id="wYm" style="width:auto">' + ymOptions(ym) + '</select>' +
    '<button class="btn btn-sm" id="wScan"><i class="bi bi-fingerprint"></i> ดึงเวลาสแกน</button>';
  $('wUnit').addEventListener('change', function () { S.unitId = this.value; PAGES.work(); });
  $('wYm').addEventListener('change', function () { S.ym = this.value; PAGES.work(); });
  $('wScan').addEventListener('click', function () {
    var b = this; b.disabled = true; b.textContent = 'กำลังดึง…';
    api('syncScans', { ym: S.ym || ym }).then(function (r) {
      toast('ดึงเวลาสแกน ' + r.days + ' วัน จาก ' + r.people + ' คน', 'ok');
      MEMO = {}; PAGES.work();
    }).catch(errToast).then(function () { b.disabled = false; b.innerHTML = '<i class="bi bi-fingerprint"></i> ดึงเวลาสแกน'; });
  });

  var draw = function (d) {
    var html = helpBox('work') +
      '<div class="card" style="padding:.7rem .8rem;margin-bottom:.7rem"><div class="row">' +
      '<b>' + h(d.unitName) + '</b>' + statusTag(d.period.status, d.period.statusTh) +
      '<span class="sub">' + d.rows.length + ' รายการ · มีข้อสังเกต ' + d.problems + '</span>' +
      (d.lastScanSync ? '<span class="sub">ดึงสแกนล่าสุด ' + h(d.lastScanSync.replace('T', ' ')) + '</span>' : '') +
      '<div class="right row">' +
      (d.canEdit ? '<button class="btn btn-sm btn-soft" id="wAll"><i class="bi bi-check2-square"></i> ตรงตามใบทั้งหมด</button>' : '') +
      '<button class="btn btn-sm" onclick="window.print()"><i class="bi bi-printer"></i> พิมพ์</button>' +
      '</div></div>' +
      (d.scanMode === 'block' ? '<div class="note bad" style="margin-top:.5rem">โหมดตรวจสแกน: <b>บล็อกการส่งตรวจ</b> — รายการที่สแกนไม่ครบต้องแก้ก่อน</div>' : '') +
      '</div>';

    html += '<div class="pillbar" style="margin-bottom:.6rem">' +
      '<button class="on" data-f="">ทั้งหมด</button>' +
      '<button data-f="problem">เฉพาะที่มีข้อสังเกต</button>' +
      '<button data-f="NO_SCAN">ไม่พบสแกน</button>' +
      '<button data-f="HOURS_SHORT">ชั่วโมงไม่ครบ</button>' +
      '<button data-f="OWN_WARD">ลงหน่วยตัวเอง</button>' +
      '<button data-f="NO_WARD">ไม่ระบุหน่วย</button></div><div id="wTable"></div>';
    $('page').innerHTML = html;

    var render = function (filter) {
      var rows = d.rows.filter(function (r) {
        if (!filter) return true;
        if (filter === 'problem') return r.flags.length;
        return r.flags.indexOf(filter) >= 0;
      });
      $('wTable').innerHTML = tableBox(
        ['วันที่', 'บุคลากร', 'หน่วยที่ไปปฏิบัติ', 'เวร', 'สแกนเข้า', 'สแกนออก', { t: 'ชม.', n: 1 }, 'สถานะ', { t: 'เงิน', n: 1 }, 'ข้อสังเกต', ''],
        rows.map(function (r) {
          return [
            h(r.date.slice(8)) + '/' + h(r.date.slice(5, 7)),
            '<b>' + h(r.empName) + '</b><div class="sub">' + h(r.empCode) + '</div>',
            h(r.wardName || '—'),
            '<b style="color:var(--brand-600)">' + h(r.shiftCode) + '</b><div class="sub">' + h(r.shiftText) + '</div>',
            h(r.scanIn || '—'), h(r.scanOut || '—'),
            r.scanHours == null ? '—' : num(r.scanHours, 2),
            r.workStatus === 'ABSENT' ? '<span class="tag t-red">ไม่มา</span>' : (r.workStatus === 'WORKED' ? '<span class="tag t-ok">ปฏิบัติงาน</span>' : '<span class="tag t-open">ตามตาราง</span>'),
            num(r.amount),
            flagChips(r.flags) + (r.hasAttach ? ' <i class="bi bi-paperclip" title="มีไฟล์แนบ"></i>' : ''),
            d.canEdit ? '<button class="btn btn-sm" onclick="editWork(\'' + r.id + '\')">แก้ไข</button>' : ''
          ];
        }),
        { empty: 'ไม่มีรายการตามเงื่อนไข', maxh: '62vh' });
    };
    render('');
    Array.prototype.forEach.call($('page').querySelectorAll('.pillbar button'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call($('page').querySelectorAll('.pillbar button'), function (x) { x.classList.remove('on'); });
        b.classList.add('on'); render(b.dataset.f);
      });
    });
    if ($('wAll')) $('wAll').addEventListener('click', function () {
      confirmBox('ตรงตามใบทั้งหมด', 'ยืนยันว่าทุกแถวปฏิบัติงานจริงตามตารางเวร (รายการที่ทำเครื่องหมาย “ไม่มา” ไว้จะไม่ถูกเปลี่ยน)', function () {
        api('markAllAsPlanned', { ym: d.ym, unitId: d.unitId }).then(function () { toast('บันทึกแล้ว', 'ok'); MEMO = {}; PAGES.work(); }).catch(errToast);
      });
    });
    window.WORKROWS = d.rows;
  };
  api('getWorkSheet', { ym: ym, unitId: unitId }, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function editWork(id) {
  var r = (window.WORKROWS || []).filter(function (x) { return x.id === id; })[0];
  if (!r) return;
  modal({
    title: 'แก้ไขการปฏิบัติงาน · ' + r.empName + ' วันที่ ' + r.date,
    body:
      '<div class="row"><div class="field" style="flex:1"><label class="fl">สถานะ</label><select id="ewSt">' +
      ['PLANNED|ตามตาราง', 'WORKED|ปฏิบัติงานจริง', 'ABSENT|ไม่มา (ไม่คิดค่าตอบแทน)'].map(function (x) {
        var a = x.split('|');
        return '<option value="' + a[0] + '"' + (r.workStatus === a[0] ? ' selected' : '') + '>' + a[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field" style="flex:1"><label class="fl">หน่วยที่ไปปฏิบัติ</label><select id="ewWard"><option value="">—</option>' +
      (S.boot.wards || []).map(function (w) { return '<option value="' + w.wardId + '"' + (w.wardId === r.wardId ? ' selected' : '') + '>' + h(w.name) + '</option>'; }).join('') +
      '</select></div></div>' +
      '<div class="row"><div class="field" style="flex:1"><label class="fl">เวลาเข้า (ถ้าต่างจากสแกน)</label><input id="ewIn" value="' + h(r.timeIn) + '" placeholder="เช่น 08:05"></div>' +
      '<div class="field" style="flex:1"><label class="fl">เวลาออก</label><input id="ewOut" value="' + h(r.timeOut) + '" placeholder="เช่น 16:10"></div></div>' +
      '<div class="field"><label class="fl">หมายเหตุ</label><input id="ewNote" value="' + h(r.note) + '"></div>' +
      '<div class="note" style="font-size:.84rem">สแกนจริง: เข้า ' + h(r.scanIn || '—') + ' · ออก ' + h(r.scanOut || '—') +
      (r.flags.length ? '<br>ข้อสังเกต: ' + h(r.flags.map(flagText).join(' · ')) : '') + '</div>' +
      '<div class="row" style="margin-top:.6rem"><button class="btn btn-sm" onclick="attachFor(\'' + r.empCode + '\',\'' + r.date + '\',\'' + r.ym + '\')"><i class="bi bi-paperclip"></i> ใบลืมสแกน / เอกสารแนบ</button>' +
      (S.me.isAdmin ? '<button class="btn btn-sm btn-danger" onclick="setExc(\'' + r.id + '\',' + (r.exception ? 'true' : 'false') + ')"><i class="bi bi-shield-exclamation"></i> ' + (r.exception ? 'ยกเลิกการยกเว้นกฎ' : 'ยกเว้นกฎให้แถวนี้') + '</button>' : '') +
      (r.exception ? '<div class="note" style="margin-top:.4rem">ยกเว้นกฎไว้: ' + h(r.excReason) + '</div>' : '') + '</div>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveWork', {
        ym: r.ym, items: [{
          id: id, workStatus: $('ewSt').value, wardId: $('ewWard').value,
          timeIn: $('ewIn').value, timeOut: $('ewOut').value, note: $('ewNote').value
        }]
      }).then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.work(); }).catch(errToast);
    }
  });
}

/** ผู้ดูแลระบบยกเว้นกฎ (เช่น จำเป็นต้องลงเวรที่หน่วยตัวเอง) — ต้องใส่เหตุผล ติดธงส้มถาวร */
function setExc(id, on) {
  if (on) {
    askPassword('ยกเลิกการยกเว้นกฎ', 'ให้แถวนี้กลับมาถูกตรวจตามกฎปกติ', function (pw, close) {
      api('setException', { id: id, on: false, reason: 'ยกเลิกการยกเว้น', password: pw })
        .then(function () { toast('ยกเลิกการยกเว้นแล้ว', 'ok'); close(); MEMO = {}; PAGES.work(); }).catch(errToast);
    });
    return;
  }
  modal({
    title: 'ยกเว้นกฎให้รายการนี้',
    body: '<div class="note">ใช้เมื่อจำเป็นจริง ๆ เท่านั้น เช่น หน่วยขาดคนหนักจนต้องให้ลงเวรที่หน่วยต้นสังกัดของตนเอง · ระบบจะติดธงส้ม “ผู้ดูแลระบบยกเว้นกฎให้” ไว้ถาวรและบันทึกในประวัติ</div>' +
      '<div class="field" style="margin-top:.6rem"><label class="fl">เหตุผล</label><input id="exR"></div>' +
      '<div class="field"><label class="fl">ยืนยันรหัสผ่านของท่าน</label><input type="password" id="exPw"></div>',
    okText: 'ยกเว้นกฎ',
    onOk: function (close) {
      api('setException', { id: id, on: true, reason: $('exR').value, password: $('exPw').value })
        .then(function () { toast('บันทึกการยกเว้นแล้ว', 'ok'); close(); MEMO = {}; PAGES.work(); }).catch(errToast);
    }
  });
}

function attachFor(empCode, date, ym) {
  modal({
    title: 'ไฟล์แนบ · ' + date,
    body: '<div class="field"><label class="fl">เลือกไฟล์ (รูปถ่ายหรือ PDF)</label><input type="file" id="atF" accept="image/*,application/pdf"></div>' +
      '<div class="field"><label class="fl">หมายเหตุ</label><input id="atNote" placeholder="เช่น ใบลืมสแกนลงนามแล้ว"></div>' +
      '<div id="atList" class="sub">กำลังโหลดรายการ…</div>',
    okText: 'อัปโหลด',
    onOpen: function (mask) {
      api('listAttachments', { ym: ym, empCode: empCode, date: date }).then(function (list) {
        mask.querySelector('#atList').innerHTML = list.length
          ? list.map(function (a) { return '<div class="row"><i class="bi bi-file-earmark"></i><a href="' + a.url + '" target="_blank" rel="noopener">' + h(a.fileName) + '</a><button class="btn btn-sm btn-danger right" onclick="delAttach(\'' + a.id + '\')">ลบ</button></div>'; }).join('')
          : 'ยังไม่มีไฟล์แนบ';
      }).catch(function () { });
    },
    onOk: function (close) {
      var f = $('atF').files[0];
      if (!f) { toast('ยังไม่ได้เลือกไฟล์', 'warn'); return; }
      if (f.size > 8 * 1024 * 1024) { toast('ไฟล์ใหญ่เกิน 8 MB', 'warn'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var b64 = String(rd.result).split(',')[1];
        api('uploadAttachment', { ym: ym, empCode: empCode, date: date, kind: 'MISS_SCAN', note: $('atNote').value, file: { name: f.name, mimeType: f.type, dataBase64: b64 } })
          .then(function () { toast('อัปโหลดแล้ว', 'ok'); close(); MEMO = {}; }).catch(errToast);
      };
      rd.readAsDataURL(f);
    }
  });
}
function delAttach(id) {
  api('deleteAttachment', { id: id }).then(function () { toast('ลบแล้ว', 'ok'); }).catch(errToast);
}

/* ================================================================ ส่งตรวจ / อนุมัติ */
PAGES.flow = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = '<select id="fYm" style="width:auto">' + ymOptions(ym) + '</select>';
  $('fYm').addEventListener('change', function () { S.ym = this.value; PAGES.flow(); });

  var draw = function (d) {
    var html = helpBox('flow') + '<div class="grid g2">';
    d.units.forEach(function (u) {
      html += '<div class="card"><div class="row"><h3>' + h(u.name) + '</h3>' + statusTag(u.status, u.statusTh) + '</div>' +
        '<div class="sub">' + u.rows + ' รายการ · ' + num(u.shifts) + ' เวร · ' + num(u.amount) + ' บาท</div>' +
        '<div class="row" style="margin-top:.4rem">' +
        (u.red ? '<span class="tag t-red">ต้องแก้ไข ' + u.red + '</span>' : '<span class="tag t-ok">ไม่มีรายการต้องแก้ไข</span>') +
        (u.orange ? '<span class="tag t-orange">ข้อสังเกต ' + u.orange + '</span>' : '') +
        (u.pending ? '<span class="tag t-orange">รอยืนยัน ' + u.pending + '</span>' : '') +
        '</div>' +
        (u.reason ? '<div class="note bad" style="margin-top:.5rem">' + h(u.reason) + '</div>' : '') +
        '<div class="sub" style="margin-top:.4rem">' +
        (u.submittedAt ? 'ส่งตรวจ ' + h(u.submittedAt.replace('T', ' ')) + ' โดย ' + h(u.submittedBy) + '<br>' : '') +
        (u.verifiedAt ? 'ตรวจแล้ว ' + h(u.verifiedAt.replace('T', ' ')) + ' โดย ' + h(u.verifiedBy) + '<br>' : '') +
        (u.closedAt ? 'ปิดรอบ ' + h(u.closedAt.replace('T', ' ')) + '<br>' : '') + '</div>' +
        '<div class="row" style="margin-top:.6rem">' +
        '<button class="btn btn-sm" onclick="openUnit(\'' + u.unitId + '\')">เปิดตาราง</button>' +
        (u.canSubmit && (u.status === 'OPEN' || u.status === 'RETURNED') ? '<button class="btn btn-sm btn-pri" onclick="doSubmit(\'' + d.ym + '\',\'' + u.unitId + '\')">ส่งตรวจ</button>' : '') +
        (u.canVerify && u.status === 'SUBMITTED' ? '<button class="btn btn-sm btn-pri" onclick="doVerify(\'' + d.ym + '\',\'' + u.unitId + '\')">ผ่านการตรวจ</button>' : '') +
        (u.canVerify && (u.status === 'SUBMITTED' || u.status === 'VERIFIED') ? '<button class="btn btn-sm btn-danger" onclick="doReturn(\'' + d.ym + '\',\'' + u.unitId + '\')">ส่งกลับแก้ไข</button>' : '') +
        (u.canClose && u.status === 'VERIFIED' ? '<button class="btn btn-sm btn-pri" onclick="doClose(\'' + d.ym + '\',\'' + u.unitId + '\')">ปิดรอบ</button>' : '') +
        (u.canClose && (u.status === 'CLOSED' || u.status === 'VERIFIED' || u.status === 'SUBMITTED') ? '<button class="btn btn-sm" onclick="doReopen(\'' + d.ym + '\',\'' + u.unitId + '\')">ย้อนสถานะ</button>' : '') +
        (d.isAdmin || d.isChief ? '<button class="btn btn-sm" onclick="doPayRef(\'' + d.ym + '\',\'' + u.unitId + '\',\'' + h(u.payRef) + '\')">เลขที่จ่าย ' + h(u.payRef || '—') + '</button>' : '') +
        '</div></div>';
    });
    html += '</div>';
    $('page').innerHTML = html;
  };
  api('getPeriods', { ym: ym }, { fresh: true, onCache: draw }).then(draw).catch(errToast);
};

function doSubmit(ym, unitId, force) {
  api('submitMonth', { ym: ym, unitId: unitId, force: !!force }).then(function (r) {
    if (r.ok) { toast('ส่งตรวจเรียบร้อย', 'ok'); MEMO = {}; PAGES.flow(); return; }
    modal({
      title: 'ยังส่งตรวจไม่ได้ — พบ ' + r.total + ' รายการที่ต้องแก้',
      body: '<div class="msgs">' + r.blockers.slice(0, 25).map(function (b) {
        return '<div class="msg red"><span class="dot"></span>' + h(b.date + ' ' + b.empName + ' — ' + b.text) + '</div>';
      }).join('') + '</div>' + (r.total > 25 ? '<div class="sub">และอีก ' + (r.total - 25) + ' รายการ</div>' : '') +
        (S.me.isAdmin ? '<div class="note" style="margin-top:.6rem">ผู้ดูแลระบบสามารถกด “ส่งทั้งที่ยังมีปัญหา” ได้ แต่จะบันทึกไว้ในประวัติ</div>' : ''),
      okText: S.me.isAdmin ? 'ส่งทั้งที่ยังมีปัญหา' : null,
      onOk: function (close) { close(); doSubmit(ym, unitId, true); }
    });
  }).catch(errToast);
}
function doVerify(ym, unitId) {
  confirmBox('ผ่านการตรวจ', 'ยืนยันว่าตรวจสอบตารางและชั่วโมงของหน่วยงานนี้เรียบร้อยแล้ว', function () {
    api('verifyMonth', { ym: ym, unitId: unitId }).then(function () { toast('บันทึกแล้ว', 'ok'); MEMO = {}; PAGES.flow(); }).catch(errToast);
  });
}
function doReturn(ym, unitId) {
  modal({
    title: 'ส่งกลับแก้ไข',
    body: '<div class="field"><label class="fl">เหตุผล (หน่วยงานจะเห็นข้อความนี้)</label><textarea id="rtR" rows="3"></textarea></div>',
    okText: 'ส่งกลับ',
    onOk: function (close) {
      api('returnMonth', { ym: ym, unitId: unitId, reason: $('rtR').value }).then(function () {
        toast('ส่งกลับแล้ว', 'ok'); close(); MEMO = {}; PAGES.flow();
      }).catch(errToast);
    }
  });
}
function doClose(ym, unitId) {
  askPassword('ปิดรอบเดือน', 'ปิดรอบแล้วจะล็อกข้อมูลของหน่วยงานนี้ และออกไฟล์ HRMi ได้', function (pw, close) {
    api('closeMonth', { ym: ym, unitId: unitId, password: pw }).then(function () {
      toast('ปิดรอบแล้ว', 'ok'); close(); MEMO = {}; PAGES.flow();
    }).catch(errToast);
  });
}
function doReopen(ym, unitId) {
  modal({
    title: 'ย้อนสถานะกลับเป็นกำลังบันทึก',
    body: '<div class="field"><label class="fl">เหตุผล</label><input id="roR"></div>' +
      '<div class="field"><label class="fl">ยืนยันรหัสผ่านของท่าน</label><input type="password" id="roPw"></div>',
    okText: 'ย้อนสถานะ',
    onOk: function (close) {
      api('reopenMonth', { ym: ym, unitId: unitId, reason: $('roR').value, password: $('roPw').value })
        .then(function () { toast('ย้อนสถานะแล้ว', 'ok'); close(); MEMO = {}; PAGES.flow(); }).catch(errToast);
    }
  });
}
function doPayRef(ym, unitId, cur) {
  modal({
    title: 'เลขที่เอกสารจ่าย (จาก HRMi)',
    body: '<div class="field"><label class="fl">เลขที่ เช่น 0202</label><input id="prV" value="' + h(cur === '—' ? '' : cur) + '"></div>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('savePayRef', { ym: ym, unitId: unitId, payRef: $('prV').value }).then(function () {
        toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.flow();
      }).catch(errToast);
    }
  });
}

/* ================================================================ เอกสารและไฟล์ */
PAGES.docs = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML = '<select id="dYm" style="width:auto">' + ymOptions(ym) + '</select>';
  $('dYm').addEventListener('change', function () { S.ym = this.value; PAGES.docs(); });

  var units = S.boot.units || [];
  var html = helpBox('docs') + '<div class="grid g2">';
  html += '<div class="card"><h3><i class="bi bi-file-earmark-pdf"></i> ตารางเวร + รายงานหน่วยปฏิบัติงาน</h3>' +
    '<p class="sub">PDF 2 แผ่น: แผ่นที่ 1 ตารางเวรรายวัน · แผ่นที่ 2 รายงานหน่วยปฏิบัติงาน (ใครไปหน่วยใดบ้าง)</p>' +
    '<div class="field"><label class="fl">หน่วยงาน</label><select id="pdUnit">' + unitOptions(S.unitId) + '</select></div>' +
    '<button class="btn btn-pri" id="pdGo"><i class="bi bi-download"></i> สร้างเอกสาร</button><div id="pdOut"></div></div>';
  html += '<div class="card"><h3><i class="bi bi-table"></i> สรุปค่าตอบแทน</h3>' +
    '<p class="sub">รายชื่อ จำนวนเวรแยกช่วง รหัสรายได้ และจำนวนเงิน พร้อมช่องลงนาม 3 จุด</p>' +
    '<div class="field"><label class="fl">หน่วยงาน</label><select id="smUnit"><option value="">ทุกหน่วยงาน</option>' + unitOptions('') + '</select></div>' +
    '<div class="row"><button class="btn btn-pri" id="smGo"><i class="bi bi-download"></i> สร้าง PDF</button>' +
    '<button class="btn" id="xlGo"><i class="bi bi-file-earmark-excel"></i> ไฟล์ Excel รายละเอียด</button></div><div id="smOut"></div></div>';
  html += '<div class="card"><h3><i class="bi bi-upload"></i> ไฟล์นำเข้า HRMi</h3>' +
    '<p class="sub">คอลัมน์: รหัสพนักงาน · เลขบัตร (0) · รหัสรายได้ · จำนวน · 0 · 0 · 0 — ออกได้เฉพาะหน่วยงานที่ปิดรอบแล้ว</p>' +
    '<div class="field"><label class="fl">รูปแบบ</label><select id="hrMode"><option value="split">แยกไฟล์ตามรหัสรายได้ (แนะนำ)</option><option value="single">รวมไฟล์เดียว</option></select></div>' +
    '<label class="chk" style="margin-bottom:.6rem"><input type="checkbox" id="hrForce"> ออกไฟล์ทดลอง (ยังไม่ปิดรอบ)</label>' +
    '<button class="btn btn-pri" id="hrGo"><i class="bi bi-download"></i> สร้างไฟล์ HRMi</button><div id="hrOut"></div></div>';
  html += '<div class="card"><h3><i class="bi bi-clock-history"></i> เอกสารที่เคยออก</h3><div id="exList" class="sub">กำลังโหลด…</div></div>';
  html += '</div>';
  $('page').innerHTML = html;

  var run = function (btnId, outId, action, payload, render) {
    $(btnId).addEventListener('click', function () {
      var b = this; b.disabled = true; var old = b.innerHTML; b.textContent = 'กำลังสร้าง…';
      api(action, payload()).then(function (r) {
        $(outId).innerHTML = render(r);
        toast('สร้างเอกสารเรียบร้อย', 'ok');
        loadEx();
      }).catch(errToast).then(function () { b.disabled = false; b.innerHTML = old; });
    });
  };
  run('pdGo', 'pdOut', 'exportSchedulePdf', function () { return { ym: S.ym || ym, unitId: $('pdUnit').value }; },
    function (r) { return downloadLinks([r]); });
  run('smGo', 'smOut', 'exportSummaryPdf', function () { return { ym: S.ym || ym, unitId: $('smUnit').value }; },
    function (r) { return downloadLinks([r]); });
  run('xlGo', 'smOut', 'exportExcel', function () { return { ym: S.ym || ym, unitId: $('smUnit').value }; },
    function (r) { return downloadLinks([r]); });
  run('hrGo', 'hrOut', 'exportHrmi', function () { return { ym: S.ym || ym, mode: $('hrMode').value, force: $('hrForce').checked }; },
    function (r) {
      return (r.test ? '<div class="note" style="margin:.5rem 0">ไฟล์ทดลอง — ยังไม่ได้ปิดรอบทุกหน่วยงาน</div>' : '') +
        tableBox(['รหัสรายได้', 'ชื่อ', { t: 'คน', n: 1 }, { t: 'จำนวน', n: 1 }],
          r.preview.map(function (x) { return [h(x.code), h(x.name), num(x.people), num(x.qty) + ' ' + h(x.unit)]; })) +
        downloadLinks(r.files) +
        '<div class="sub" style="margin-top:.4rem">ทั้งหมดอยู่ใน <a href="' + r.folderUrl + '" target="_blank" rel="noopener">โฟลเดอร์ Drive</a></div>';
    });

  var loadEx = function () {
    api('listExports', { ym: S.ym || ym }).then(function (list) {
      $('exList').innerHTML = list.length
        ? list.map(function (e) {
            return '<div class="row" style="font-size:.85rem"><span class="tag t-open">' + h(e.kind) + '</span>' +
              '<a href="' + e.url + '" target="_blank" rel="noopener">' + h(e.fileName) + '</a>' +
              '<span class="right sub">' + h(e.at.replace('T', ' ').slice(0, 16)) + ' · ' + h(e.by) + '</span></div>';
          }).join('')
        : 'ยังไม่มีเอกสารในเดือนนี้';
    }).catch(function () { });
  };
  loadEx();
};

/* ================================================================ รายงานติดตาม */
PAGES.report = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML =
    '<select id="rYm" style="width:auto">' + ymOptions(ym) + '</select>' +
    '<select id="rUnit" style="width:auto"><option value="">ทุกหน่วยงาน</option>' + unitOptions('') + '</select>' +
    '<button class="btn btn-sm" onclick="window.print()"><i class="bi bi-printer"></i> พิมพ์</button>';
  var load = function () {
    api('getReport', { ym: $('rYm').value, unitId: $('rUnit').value, onlyProblems: true }, { fresh: true }).then(function (d) {
      var html = helpBox('report') +
        '<div class="card" style="padding:.7rem .8rem;margin-bottom:.7rem"><div class="row">' +
        '<b>รายงานติดตาม ' + h(d.ymTh) + '</b><span class="sub">เลขที่ ' + h(d.refNo) + ' · พิมพ์โดย ' + h(d.printedBy) + ' เมื่อ ' + h(d.printedAt.replace('T', ' ').slice(0, 16)) + '</span></div></div>';
      html += '<div class="grid g4" style="margin-bottom:.7rem">' + d.flagCounts.slice(0, 8).map(function (f) {
        return '<div class="stat ' + (f.color === 'red' ? 'badish' : 'warnish') + '"><b>' + f.n + '</b><span>' + h(f.text) + '</span></div>';
      }).join('') + '</div>';
      html += tableBox(
        ['วันที่', 'บุคลากร', 'หน่วยงาน', 'หน่วยที่ไปปฏิบัติ', 'เวร', 'สแกน', { t: 'เงิน', n: 1 }, 'ข้อสังเกต'],
        d.rows.map(function (r) {
          return [h(r.date), '<b>' + h(r.empName) + '</b><div class="sub">' + h(r.empCode) + (r.homeWard ? ' · สังกัด ' + h(r.homeWard) : '') + '</div>',
            h(r.unitName), h(r.wardName || '—'), h(r.shiftCode),
            h((r.scanIn || '—') + ' – ' + (r.scanOut || '—')), num(r.amount),
            r.flags.map(function (f) { return '<span class="tag t-' + f.color + '">' + h(f.text) + '</span>'; }).join(' ')];
        }), { empty: 'ไม่พบรายการที่มีข้อสังเกต', maxh: '64vh' });
      html += '<div class="sub" style="margin-top:.5rem">แสดง ' + d.shown + ' จาก ' + d.all + ' รายการ</div>';
      $('page').innerHTML = html;
    }).catch(errToast);
  };
  $('rYm').addEventListener('change', load);
  $('rUnit').addEventListener('change', load);
  load();
};

/* ================================================================ รายงานหน่วยปฏิบัติงาน (แผ่นที่ 2) */
PAGES.wardrep = function () {
  var ym = S.ym || thisYmJs();
  $('topExtra').innerHTML =
    '<select id="q2Ym" style="width:auto">' + ymOptions(ym) + '</select>' +
    '<select id="q2Unit" style="width:auto"><option value="">ทุกหน่วยงาน</option>' + unitOptions('') + '</select>' +
    '<button class="btn btn-sm" onclick="window.print()"><i class="bi bi-printer"></i> พิมพ์</button>';
  var load = function () {
    api('getWardReport', { ym: $('q2Ym').value, unitId: $('q2Unit').value }, { fresh: true }).then(function (d) {
      var head = ['หน่วยที่ไปปฏิบัติ'];
      for (var i = 1; i <= d.days; i++) head.push({ t: String(i), n: 1 });
      head.push({ t: 'รวม', n: 1 });
      var rows = d.wards.map(function (w) {
        var r = [h(w.name)];
        for (var i = 1; i <= d.days; i++) r.push(w.days[i] ? num(w.days[i]) : '<span style="color:var(--line)">·</span>');
        r.push('<b>' + num(w.total) + '</b>');
        return r;
      });
      var foot = ['รวมทุกหน่วย'];
      for (var i = 1; i <= d.days; i++) {
        var s = 0; d.wards.forEach(function (w) { s += w.days[i] || 0; });
        foot.push(s ? num(s) : '·');
      }
      foot.push('<b>' + num(d.wards.reduce(function (a, w) { return a + w.total; }, 0)) + '</b>');

      var h2 = ['บุคลากร'].concat(d.wards.map(function (w) { return { t: w.short, n: 1 }; })).concat([{ t: 'รวมเวร', n: 1 }]);
      var r2 = d.people.map(function (p) {
        var r = ['<b>' + h(p.empName) + '</b><div class="sub">' + h(p.empCode) + '</div>'];
        d.wards.forEach(function (w) { r.push(p.wards[w.wardId] ? num(p.wards[w.wardId]) : '<span style="color:var(--line)">·</span>'); });
        r.push('<b>' + num(p.total) + '</b>');
        return r;
      });

      $('page').innerHTML = helpBox('wardrep') +
        '<div class="card" style="padding:.7rem .8rem;margin-bottom:.7rem"><b>รายงานหน่วยปฏิบัติงาน · ' + h(d.unitName) + ' · ' + h(d.ymTh) + '</b>' +
        '<div class="sub">ใช้เป็นแผ่นที่ 2 ของเอกสารรายงาน — สร้างไฟล์ PDF ได้ที่หน้า “เอกสารและไฟล์ HRMi”</div></div>' +
        '<h3 style="margin:.4rem 0">ตารางที่ 1 — จำนวนเวรรายหน่วยรายวัน</h3>' + tableBox(head, rows, { foot: foot, empty: 'ยังไม่มีข้อมูล' }) +
        '<h3 style="margin:1rem 0 .4rem">ตารางที่ 2 — บุคลากรไปปฏิบัติงานหน่วยใดบ้าง</h3>' + tableBox(h2, r2, { empty: 'ยังไม่มีข้อมูล' });
    }).catch(errToast);
  };
  $('q2Ym').addEventListener('change', load);
  $('q2Unit').addEventListener('change', load);
  load();
};
