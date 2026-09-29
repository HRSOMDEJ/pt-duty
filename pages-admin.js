/**
 * pages-admin.js — ตั้งค่าและข้อมูลหลัก · นำเข้าข้อมูล/งานระบบ · ประวัติการใช้งาน (v2)
 * (ผู้ใช้และสิทธิ์อยู่ที่ pages-users.js)
 */

/* ================================================================ ตั้งค่าและข้อมูลหลัก */
var ADM_TAB = 'depts';
PAGES.setup = function () {
  api('getAdminData', { ym: S.ym || thisYmJs() }, { fresh: true }).then(function (d) {
    window.ADM = d;
    var tabs = [
      ['depts', 'ฝ่าย', 'bi-diagram-3', d.depts.length], ['units', 'หน่วยงาน', 'bi-buildings', d.units.length], ['wards', 'หน่วยปลายทาง', 'bi-geo-alt', d.wards.length],
      ['shifts', 'รหัสเวร', 'bi-clock-history', (d.shiftCodes || []).length], ['positions', 'ตำแหน่ง', 'bi-person-vcard', d.positions.length], ['rates', 'อัตรา / รหัสรายได้', 'bi-cash-coin', d.rates.length], ['quotas', 'กรอบเวร', 'bi-bar-chart-steps', d.quotas.length],
      ['cal', 'ปฏิทินวันหยุด', 'bi-calendar-heart', d.calendar.length], ['win', 'ช่วงลงตารางเวร', 'bi-calendar-range', d.windows.length], ['opt', 'ค่าตั้งค่าระบบ', 'bi-gear', '']
    ];
    $('view').innerHTML = pageHead('bi-sliders', 'ตั้งค่าและข้อมูลหลัก', GUIDE.setup.lead,
        '<a class="btn btn-ghost" href="' + h(d.dbUrl) + '" target="_blank" rel="noopener"><i class="bi bi-table"></i> เปิดฐานข้อมูล</a>') +
      '<div class="pills" id="admTabs">' + tabs.map(function (t) {
        return '<button data-t="' + t[0] + '"' + (t[0] === ADM_TAB ? ' class="on"' : '') + '><i class="bi ' + t[2] + '"></i>' + t[1] + (t[3] !== '' ? ' <span class="cnt">' + t[3] + '</span>' : '') + '</button>';
      }).join('') + '</div><div id="admBody"></div>';
    $$('#admTabs button').forEach(function (b) {
      b.addEventListener('click', function () { $$('#admTabs button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); ADM_TAB = b.dataset.t; admTab(ADM_TAB); });
    });
    admTab(ADM_TAB);
  }).catch(errToast);
};
function admReload() { MEMO = {}; api('bootstrap', {}).then(function (b) { S.boot = b; S.me = b.me; }).catch(function () { }).then(function () { PAGES.setup(); }); }
function admCard(icon, title, sub, btn, body) {
  return '<div class="card-x"><div class="card-h"><h3><i class="bi ' + icon + '"></i> ' + title + '</h3>' + (sub ? '<span class="sub">' + sub + '</span>' : '') + (btn ? '<div class="r">' + btn + '</div>' : '') + '</div>' + body + '</div>';
}
function onOff(v) { return v === 'FALSE' ? '<span class="tag t-arc"><i class="bi bi-pause-circle"></i>ปิด</span>' : '<span class="tag t-ok"><i class="bi bi-check-circle"></i>เปิด</span>'; }
function editBtn(fn, obj) { return '<button class="btn btn-sm btn-soft" onclick="' + fn + '(REG[\'' + reg(fn + Math.random().toString(36).slice(2, 8), obj) + '\'])"><i class="bi bi-pencil"></i> แก้ไข</button>'; }
function admDeptName(id) { var x = (window.ADM.depts || []).filter(function (d) { return d.deptId === id; })[0]; return x ? x.name : id; }
function admDeptColor(id) { var x = (window.ADM.depts || []).filter(function (d) { return d.deptId === id; })[0]; return (x && x.color) || '#0e9f8f'; }
function admDeptChip(id) { return '<span class="dchip" style="--dc:' + h(admDeptColor(id)) + '">' + h(admDeptName(id)) + '</span>'; }
function admUnitName(id) { var x = (window.ADM.units || []).filter(function (u) { return u.unitId === id; })[0]; return x ? x.name : id; }

function admTab(t) {
  var d = window.ADM, box = $('admBody'), admin = d.isAdmin;
  if (t === 'depts') {
    box.innerHTML = noteBox('acc', 'bi-diagram-3', '<b>ระบบรองรับหลายฝ่าย</b> — หน่วยงานทุกหน่วยสังกัดฝ่ายใดฝ่ายหนึ่ง · หัวหน้าฝ่ายเห็นและตรวจได้เฉพาะหน่วยงานในฝ่ายของตน · บุคลากรลงเวรเองได้เฉพาะหน่วยงานในฝ่ายของตน · เพิ่มฝ่ายใหม่ได้โดยไม่ต้องแก้โค้ด', 'mb-3') +
      '<div class="grid-auto anim" style="--min:300px">' + d.depts.map(function (x) {
        var us = d.units.filter(function (u) { return u.deptId === x.deptId; }), on = us.filter(function (u) { return u.active !== 'FALSE'; }).length;
        return '<div class="dept-card" style="--dc:' + h(x.color || '#0e9f8f') + '"><h4><i class="bi bi-diagram-3-fill"></i>' + h(x.name) + '<span class="ms-auto">' + onOff(x.active) + '</span></h4>' +
          '<div class="small-muted mb-2">' + h(x.deptId) + ' · ลงนามโดย: ' + h(x.chiefTitle || '—') + (x.chiefName ? ' (' + h(x.chiefName) + ')' : '') + '</div>' +
          '<div class="dm"><div><b>' + us.length + '</b><span>หน่วยงาน</span></div><div><b>' + on + '</b><span>เปิดใช้</span></div><div><b style="font-size:.85rem">' + h(x.match || '—') + '</b><span>คำจับคู่ HR</span></div></div>' +
          (x.note ? '<div class="small-muted mt-2">' + h(x.note) + '</div>' : '') +
          '<div class="d-flex gap-2 mt-3">' + (admin ? editBtn('editDept', x) : '') + '<button class="btn btn-sm btn-ghost" onclick="ADM_TAB=\'units\';PAGES.setup()"><i class="bi bi-buildings"></i> ดูหน่วยงาน</button>' +
          (admin ? '<button class="btn btn-sm btn-ghost" onclick="editUnit({deptId:\'' + x.deptId + '\'})"><i class="bi bi-plus-lg"></i> เพิ่มหน่วยงาน</button>' : '') + '</div></div>';
      }).join('') + (admin ? '<button class="card-x hov d-flex flex-column align-items-center justify-content-center gap-2" style="border-style:dashed;min-height:180px;color:var(--brand-600)" onclick="editDept()"><i class="bi bi-plus-circle" style="font-size:2rem"></i><b>เพิ่มฝ่ายใหม่</b><span class="small-muted">เช่น ฝ่ายเทคนิคการแพทย์ ฝ่ายรังสีวิทยา</span></button>' : '') + '</div>';
  } else if (t === 'units') {
    var groups = d.depts.map(function (x) {
      var us = d.units.filter(function (u) { return u.deptId === x.deptId; });
      return admCard('bi-buildings', h(x.name), us.length + ' หน่วยงาน', admin ? '<button class="btn btn-sm btn-brand" onclick="editUnit({deptId:\'' + x.deptId + '\'})"><i class="bi bi-plus-lg"></i> เพิ่มหน่วยงาน</button>' : '',
        tableBox(['รหัส', 'ชื่อหน่วยงาน', 'ช่วงเวร', 'ระบุหน่วยที่ไปปฏิบัติ', 'ตำแหน่งที่รับ', 'สถานะ', ''], us.map(function (u) {
          return [h(u.unitId), '<b>' + h(u.name) + '</b>' + (u.note ? '<div class="small-muted" style="white-space:normal;max-width:320px">' + h(u.note) + '</div>' : ''),
            String(u.slots || '').split(',').map(shiftBadge).join(' '), u.needWard === 'TRUE' ? '<span class="tag t-acc"><i class="bi bi-geo-alt"></i>ต้องระบุ</span>' : '—',
            u.posIds ? String(u.posIds).split(',').map(function (p) { return '<span class="tag t-open">' + h(p) + '</span>'; }).join(' ') : '<span class="small-muted">ทุกตำแหน่ง</span>',
            onOff(u.active), admin ? editBtn('editUnit', u) : ''];
        }), { empty: 'ฝ่ายนี้ยังไม่มีหน่วยงาน', emptyIcon: 'bi-buildings' }));
    }).join('');
    box.innerHTML = groups;
  } else if (t === 'wards') {
    box.innerHTML = admCard('bi-geo-alt', 'หน่วยปลายทาง (ward / คลินิก)', d.wards.length + ' หน่วย',
      (admin ? '<button class="btn btn-sm btn-ghost" onclick="doMergeWards()"><i class="bi bi-union"></i> รวมหน่วยที่ซ้ำ</button>' : '') + '<button class="btn btn-sm btn-brand" onclick="editWard()"><i class="bi bi-plus-lg"></i> เพิ่ม</button>',
      noteBox('info', 'bi-info-circle', 'ชื่อจาก SmartAPI อาจสะกดต่างกัน เช่น IPD (19B) กับ IPD 19B — ใช้ “รวมหน่วยที่ซ้ำ” เพื่อยุบให้เหลือหน่วยเดียว (เวร ทะเบียน และกรอบเวรจะย้ายตามให้)', 'mb-3') +
      '<input class="form-control mb-2" id="wSearch" placeholder="ค้นหาหน่วยปลายทาง…"><div id="wBody"></div>');
    var rw = function (q) {
      $('wBody').innerHTML = tableBox(['รหัส', 'ชื่อเต็ม', 'ตัวย่อในตาราง', 'ชื่ออื่นที่รวมไว้', 'สถานะ', ''],
        d.wards.filter(function (w) { return !q || (w.name + ' ' + w.short + ' ' + w.aliases).toLowerCase().indexOf(q.toLowerCase()) >= 0; }).map(function (w) {
          return [h(w.wardId), '<b>' + h(w.name) + '</b>', '<span class="tag t-acc">' + h(w.short) + '</span>', '<span class="small-muted">' + h(w.aliases || '—') + '</span>', onOff(w.active), editBtn('editWard', w)];
        }), { maxh: '60vh', empty: 'ไม่พบหน่วยปลายทาง' });
    };
    rw(''); $('wSearch').addEventListener('input', function () { rw(this.value); });
  } else if (t === 'positions') {
    box.innerHTML = admCard('bi-person-vcard', 'ตำแหน่งและวิธีคิดค่าตอบแทน', '', admin ? '<button class="btn btn-sm btn-brand" onclick="editPos()"><i class="bi bi-plus-lg"></i> เพิ่มตำแหน่ง</button>' : '',
      noteBox('info', 'bi-calculator', 'ตำแหน่งที่คิดเป็น <b>ชั่วโมง</b> คำนวณจากชั่วโมงของช่วงเวรที่ลง (เช่น เภสัชกร Part Time) · “คำจับคู่” ใช้เดาตำแหน่งจากชื่อตำแหน่งของ HR อัตโนมัติ', 'mb-3') +
      tableBox(['รหัส', 'ชื่อตำแหน่ง', 'คิดเป็น', 'คำจับคู่กับตำแหน่ง HR', 'สถานะ', ''], d.positions.map(function (p) {
        return [h(p.posId), '<b>' + h(p.name) + '</b>', p.payUnit === 'HOUR' ? '<span class="tag t-acc"><i class="bi bi-clock"></i>ชั่วโมง</span>' : '<span class="tag t-clo"><i class="bi bi-calendar"></i>เวร</span>',
          h(p.match || '—'), onOff(p.active), admin ? editBtn('editPos', p) : ''];
      })));
  } else if (t === 'rates') {
    var filt = '<select class="form-select form-select-sm" id="rtDept" style="width:auto">' + '<option value="">ทุกฝ่าย</option>' + d.depts.map(function (x) { return '<option value="' + x.deptId + '">' + h(x.name) + '</option>'; }).join('') + '</select>';
    box.innerHTML = admCard('bi-cash-coin', 'อัตราค่าตอบแทนและรหัสรายได้ HRMi', '', filt + (admin ? '<button class="btn btn-sm btn-brand" onclick="editRate()"><i class="bi bi-plus-lg"></i> เพิ่มอัตรา</button>' : ''),
      (d.settings.rateNote ? noteBox('warn', 'bi-exclamation-triangle', h(d.settings.rateNote), 'mb-2') : '') +
      noteBox('info', 'bi-calendar-event', 'ระบบเลือกอัตราที่ “วันที่มีผล” ล่าสุดที่ไม่เกินวันที่ของเวร — ขึ้นอัตราใหม่ให้ <b>เพิ่มแถวใหม่</b> พร้อมวันที่มีผล ไม่ต้องลบของเดิม', 'mb-3') + '<div id="rtBody"></div>');
    var rr = function (dep) {
      $('rtBody').innerHTML = tableBox(['หน่วยงาน', 'ตำแหน่ง', 'ช่วง', 'รหัสรายได้', 'ชื่อรหัส', { t: 'อัตรา', n: 1 }, 'มีผลตั้งแต่', 'สถานะ', ''],
        d.rates.filter(function (r) { var u = d.units.filter(function (x) { return x.unitId === r.unitId; })[0]; return !dep || (u && u.deptId === dep); }).map(function (r) {
          return ['<b>' + h(admUnitName(r.unitId)) + '</b>', h(r.posId), shiftBadge(r.slot), '<span class="tag t-clo">' + h(r.incomeCode) + '</span>', '<span class="small-muted">' + h(r.incomeName || '—') + '</span>',
            '<b>' + num(r.amount) + '</b>', h(thaiDate(r.effectiveFrom)), onOff(r.active), admin ? editBtn('editRate', r) : ''];
        }), { maxh: '58vh', empty: 'ยังไม่มีอัตรา', emptyIcon: 'bi-cash-coin' });
    };
    rr(''); $('rtDept').addEventListener('change', function () { rr(this.value); });
  } else if (t === 'shifts') {
    var sc = d.shiftCodes || [], today = todayStr();
    var cur = {}; sc.forEach(function (r) { if ((r.effectiveFrom || '') <= today && (!cur[r.code] || (r.effectiveFrom || '') >= (cur[r.code].effectiveFrom || ''))) cur[r.code] = r; });
    var LO = 360, HI = 1920, pc = function (m) { return ((m - LO) / (HI - LO) * 100).toFixed(2) + '%'; };
    var bar = function (r) {
      var df = shiftDefOfJs(r); if (!df) return '';
      return '<div class="tl" title="06:00 → 08:00 วันถัดไป"><i class="tl-s-' + h(df.slot) + '" style="left:' + pc(Math.max(LO, df.start)) + ';width:calc(' + pc(Math.min(HI, df.end)) + ' - ' + pc(Math.max(LO, df.start)) + ')"></i><span class="mid" style="left:' + pc(1440) + '"></span></div>';
    };
    var st = d.settings;
    box.innerHTML = '<div class="d-grid gap-3">' +
      admCard('bi-clock-history', 'รหัสเวร', 'กำหนดรหัส ช่วงเวลา จำนวนเวร การนับกรอบ และวิธีคิดเงิน', admin ? '<button class="btn btn-sm btn-brand" onclick="editShift()"><i class="bi bi-plus-lg"></i> เพิ่มรหัสเวร</button>' : '',
        noteBox('info', 'bi-lightbulb', '<b>กลุ่มช่วงเวร</b> (เช้า/บ่าย/ดึก) ใช้จับคู่ <b>อัตรา/รหัสรายได้</b> และ <b>กรอบเวร</b> · <b>นับกรอบ</b> ครึ่งเวร = 0.5 ของกรอบช่วงนั้น · แก้ความหมายรหัสแล้วไม่อยากให้กระทบเดือนเก่า ให้กด <b>เพิ่มฉบับใหม่</b> พร้อมวันที่มีผล', 'mb-3') +
        tableBox(['รหัส', 'ชื่อ', 'กลุ่ม', 'เวลา', { t: 'นับเวร', n: 1 }, { t: 'นับกรอบ', n: 1 }, 'คิดเงิน', 'มีผลตั้งแต่', 'สถานะ', ''], sc.map(function (r) {
          var df = shiftDefOfJs(r), old = cur[r.code] && cur[r.code] !== r && (r.effectiveFrom || '') < (cur[r.code].effectiveFrom || '');
          return ['<span style="font-size:1.05rem">' + shiftBadge(r.code) + '</span>' + (old ? ' <span class="tag t-arc">ฉบับเก่า</span>' : (r.effectiveFrom || '') > today ? ' <span class="tag t-info">ฉบับถัดไป</span>' : ''),
            '<b>' + h(r.name) + '</b>' + (r.note ? '<div class="small-muted">' + h(r.note) + '</div>' : ''),
            h(SLOT_NAME[r.slot] || r.slot),
            '<div class="t">' + (df ? m2hm(df.start) + '–' + m2hm(df.end, true) + (df.start >= 1440 ? ' <span class="small-muted">(หลังเที่ยงคืน)</span>' : df.end > 1440 ? ' <span class="small-muted">(ข้ามคืน)</span>' : '') : '<span class="text-danger">เวลาไม่ถูกต้อง</span>') + '</div>' + bar(r),
            '<b>' + num(r.value) + '</b>', '<b>' + num(r.quota === '' ? r.value : r.quota) + '</b>',
            h({ '': 'ตามตำแหน่ง', SHIFT: 'รายเวร', HOUR: 'รายชั่วโมง' }[r.pay || ''] || r.pay), h(thaiDate(r.effectiveFrom)), onOff(r.active),
            admin ? '<div class="d-flex gap-1">' + editBtn('editShift', r) + '<button class="btn btn-sm btn-ghost" title="เพิ่มฉบับใหม่ (มีผลตั้งแต่วันที่ใหม่)" onclick="editShift(REG[\'' + reg('nv' + Math.random().toString(36).slice(2, 8), Object.assign({}, r, { scId: '', effectiveFrom: '', _newVer: true })) + '\'])"><i class="bi bi-plus-square"></i></button></div>' : ''];
        }), { maxh: '60vh', cls: 'sc-tbl' })) +
      '<div class="grid-auto" style="--min:320px">' +
      admCard('bi-magic', 'ทดลองพิมพ์รหัส', '', '', '<input class="form-control form-control-lg mb-2" id="scTry" placeholder="เช่น ช1บ1 หรือ ชบ" value="ช1บ1"><div id="scOut"></div>') +
      admCard('bi-layers', 'เวรผสม', 'พิมพ์รหัสต่อกัน เช่น ชบ · ช1บ1', '',
        '<div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="cbAllow"' + (st.allowCombo !== false ? ' checked' : '') + (admin ? '' : ' disabled') + '><label class="form-check-label" for="cbAllow">อนุญาตให้ลงเวรผสมในวันเดียว<div class="form-text mt-0">ห้ามช่วงเวลาทับกันเสมอ</div></label></div>' +
        '<label class="form-label">ผสมได้สูงสุด (ช่วง/วัน)</label><input class="form-control mb-3" id="cbMax" inputmode="numeric" value="' + h(st.comboMax || 3) + '"' + (admin ? '' : ' disabled') + '>' +
        '<label class="form-label">ปุ่มลัดเวรผสมในป๊อปเลือกเวร</label><input class="form-control mb-1" id="cbQuick" value="' + h(st.comboQuick || '') + '"' + (admin ? '' : ' disabled') + '><div class="form-text mb-3">คั่นด้วย , เช่น ชบ,บด,ชบด,ช1บ1</div>' +
        (admin ? '<button class="btn btn-brand w-100" id="cbSave"><i class="bi bi-save"></i> บันทึกกติกาเวรผสม</button>' : '')) +
      '</div></div>';
    var tryIt = function () {
      var v = $('scTry').value.trim(), r = parseShiftJs(v, today);
      if (r.empty) { $('scOut').innerHTML = ''; return; }
      if (r.err) { $('scOut').innerHTML = noteBox('bad', 'bi-x-octagon', h(r.err)); return; }
      var val = 0, q = {}, hrs = 0;
      r.segs.forEach(function (g) { val += g.value; hrs += (g.end - g.start) / 60; q[g.slot] = (q[g.slot] || 0) + g.quota; });
      $('scOut').innerHTML = '<div class="d-grid gap-1">' + r.segs.map(function (g) { return '<div class="d-flex gap-2 align-items-center">' + shiftBadge(g.code) + '<span>' + h(g.name) + '</span><span class="ms-auto small-muted">' + m2hm(g.start) + '–' + m2hm(g.end, true) + '</span></div>'; }).join('') + '</div>' +
        '<div class="hr-sum"><span>นับ <b>' + num(val) + '</b> เวร</span><span><b>' + num(hrs) + '</b> ชั่วโมง</span><span>กรอบ: ' + Object.keys(q).map(function (k) { return h(k) + ' <b>' + num(q[k]) + '</b>'; }).join(' · ') + '</span></div>';
    };
    $('scTry').addEventListener('input', tryIt); tryIt();
    if ($('cbSave')) $('cbSave').addEventListener('click', function () {
      var items = { allowCombo: $('cbAllow').checked, comboMax: $('cbMax').value, comboQuick: $('cbQuick').value.replace(/\s+/g, '') };
      act({ action: 'saveSettings', payload: { items: items }, title: 'กำลังบันทึกกติกาเวรผสม', icon: 'bi-layers', done: 'บันทึกเรียบร้อย' }).then(admReload).catch(function () { });
    });
  } else if (t === 'quotas') {
    box.innerHTML = admCard('bi-bar-chart-steps', 'กรอบเวร (3 ชั้น)', '', '<button class="btn btn-sm btn-brand" onclick="editQuota()"><i class="bi bi-plus-lg"></i> เพิ่มกรอบ</button>',
      '<div class="flow-map mb-3">' + [['bi-diagram-3', 'ทั้งฝ่าย', 'เพดานรวมทุกหน่วยงานในฝ่ายต่อวัน'], ['bi-buildings', 'รายหน่วยงาน', 'เพดานของหน่วยงานนั้น'], ['bi-geo-alt', 'ราย ward', 'จำกัดหน่วยปลายทาง (ไม่ตั้ง = ไม่จำกัด)']]
        .map(function (x) { return '<div class="fm"><b><i class="bi ' + x[0] + ' text-brand"></i> ' + x[1] + '</b><small>' + x[2] + '</small></div>'; }).join('') + '</div>' +
      noteBox('bad', 'bi-x-octagon', 'เกินกรอบชั้นใดชั้นหนึ่ง = <b>สีแดง</b> ส่งตรวจไม่ได้ · แยกวันทำการ/วันหยุดได้', 'mb-3') +
      tableBox(['ระดับ', 'ของ', 'ช่วงเวร', 'ประเภทวัน', { t: 'ไม่เกิน (คน/วัน)', n: 1 }, 'มีผลตั้งแต่', ''], d.quotas.map(function (q) {
        var scope = { DEPT: 'ทั้งฝ่าย', UNIT: 'รายหน่วยงาน', WARD: 'ราย ward' }[q.scope] || q.scope;
        var ref = q.scope === 'UNIT' ? h(admUnitName(q.refId)) : q.scope === 'WARD' ? h(wardName(q.refId)) : (q.refId === '*' ? 'ทุกฝ่าย (รุ่นเก่า)' : admDeptChip(q.refId));
        return ['<span class="tag t-open">' + h(scope) + '</span>', ref, shiftBadge(q.slot), h({ ALL: 'ทุกวัน', WORKDAY: 'วันทำการ', HOLIDAY: 'วันหยุด' }[q.dayType] || q.dayType),
          '<b>' + num(q.lim) + '</b>', h(thaiDate(q.effectiveFrom)), editBtn('editQuota', q)];
      }), { maxh: '56vh' }));
  } else if (t === 'cal') {
    box.innerHTML = admCard('bi-calendar-heart', 'ปฏิทินวันหยุด', 'แสดงตั้งแต่ 6 เดือนก่อน', '<button class="btn btn-sm btn-brand" onclick="editCal()"><i class="bi bi-plus-lg"></i> เพิ่มวัน</button>',
      noteBox('info', 'bi-info-circle', 'วันหยุดไม่มีผลกับค่าตอบแทน ใช้แสดงสีในตาราง/เอกสาร และใช้กับกรอบเวรที่แยกวันทำการ/วันหยุด', 'mb-3') +
      tableBox(['วันที่', 'ประเภท', 'ชื่อวัน', ''], d.calendar.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (c) {
        var tp = { PUBHOL: ['t-red', 'นักขัตฤกษ์'], COMP: ['t-orange', 'ชดเชย'], CLOSED: ['t-arc', 'ปิดหน่วยงาน'], WORKDAY: ['t-info', 'วันทำการ'] }[c.dayType] || ['t-open', c.dayType];
        return ['<b>' + h(thaiDate(c.date)) + '</b>', '<span class="tag ' + tp[0] + '">' + tp[1] + '</span>', h(c.name), editBtn('editCal', c)];
      }), { maxh: '58vh' }));
  } else if (t === 'win') {
    box.innerHTML = admCard('bi-calendar-range', 'ช่วงเปิดให้บุคลากรลงบันทึกตารางเวร', '', '<button class="btn btn-sm btn-brand" onclick="editWin()"><i class="bi bi-plus-lg"></i> กำหนดช่วง</button>',
      noteBox('info', 'bi-info-circle', 'ถ้าไม่กำหนดรายเดือน ระบบใช้ค่าเริ่มต้น: วันที่ <b>' + h(d.settings.bookOpenDay) + '</b> ถึง <b>' + h(d.settings.bookCloseDay) + '</b> ของเดือนก่อนหน้า', 'mb-3') +
      tableBox(['เดือนของตารางเวร', 'หน่วยงาน', 'เปิด', 'ปิด', 'หมายเหตุ', ''], d.windows.map(function (w) {
        return ['<b>' + h(thaiYmJs(w.ym)) + '</b>', h(w.unitId ? admUnitName(w.unitId) : 'ทุกหน่วยงาน'), h(thaiDate(w.openFrom)), h(thaiDate(w.openTo)), h(w.note || '—'), editBtn('editWin', w)];
      }), { empty: 'ยังไม่ได้กำหนดช่วงรายเดือน — ใช้ค่าเริ่มต้น', emptyIcon: 'bi-calendar-range' }));
  } else if (t === 'opt') {
    var st = d.settings;
    var f = function (key, label, hint, type) {
      var v = st[key];
      if (type === 'bool') return '<div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="op_' + key + '" data-k="' + key + '"' + (v ? ' checked' : '') + (admin ? '' : ' disabled') + '><label class="form-check-label" for="op_' + key + '">' + label + (hint ? '<div class="form-text mt-0">' + hint + '</div>' : '') + '</label></div>';
      return '<div class="mb-3"><label class="form-label">' + label + '</label><input class="form-control" data-k="' + key + '" value="' + h(v == null ? '' : v) + '"' + (admin ? '' : ' disabled') + '>' + (hint ? '<div class="form-text">' + hint + '</div>' : '') + '</div>';
    };
    box.innerHTML = '<div class="grid-auto" style="--min:320px">' +
      admCard('bi-rulers', 'กติกาการทำงาน', '', '', f('deadlineDay', 'เส้นตายวันที่ (ของเดือนถัดไป)') + f('multiShiftWarnAt', 'เตือนเมื่อลงกี่ช่วงเวรในวันเดียว', '0 = ไม่เตือน') +
        f('wardRuleEnabled', 'ห้ามลงเวรที่หน่วยต้นสังกัดของตนเอง', '', 'bool') + f('bookSelfEnabled', 'เปิดให้บุคลากรลงบันทึกตารางเวรเอง', '', 'bool') +
        f('staffSeeUnitSchedule', 'บุคลากรเห็นตารางรวมของหน่วย', 'เห็นเงินเฉพาะของตนเองเสมอ', 'bool') + '<div class="row g-2"><div class="col">' + f('bookOpenDay', 'ลงตารางเวรเริ่มวันที่') + '</div><div class="col">' + f('bookCloseDay', 'ถึงวันที่') + '</div></div>') +
      admCard('bi-fingerprint', 'การตรวจสแกนนิ้ว', '', '', '<div class="mb-3"><label class="form-label">โหมด</label><select class="form-select" data-k="scanMode"' + (admin ? '' : ' disabled') + '>' +
        '<option value="note"' + (st.scanMode === 'note' ? ' selected' : '') + '>ติดข้อสังเกต (ส่งตรวจได้)</option><option value="block"' + (st.scanMode === 'block' ? ' selected' : '') + '>บล็อก (ต้องแก้ก่อนส่งตรวจ)</option></select></div>' +
        f('scanGraceInMin', 'สแกนเข้าช้าได้ (นาที)') + f('scanGraceOutMin', 'สแกนออกก่อนเวลาได้ (นาที)') + f('scanHoursTolMin', 'ชั่วโมงขาดได้ (นาที)')) +
      admCard('bi-pen', 'ผู้ลงนามในเอกสาร', '', '', noteBox('info', 'bi-info-circle', 'ผู้ลงนามที่ 3 เว้นว่างไว้ = ใช้ชื่อและตำแหน่งหัวหน้าของแต่ละฝ่าย (แท็บ “ฝ่าย”)', 'mb-3') +
        '<div class="row g-2"><div class="col-6">' + f('signer1Name', 'ชื่อผู้ลงนามที่ 1') + '</div><div class="col-6">' + f('signer1Pos', 'ตำแหน่งที่ 1') + '</div>' +
        '<div class="col-6">' + f('signer2Name', 'ชื่อผู้ลงนามที่ 2') + '</div><div class="col-6">' + f('signer2Pos', 'ตำแหน่งที่ 2') + '</div>' +
        '<div class="col-6">' + f('signer3Name', 'ชื่อผู้ลงนามที่ 3') + '</div><div class="col-6">' + f('signer3Pos', 'ตำแหน่งที่ 3') + '</div></div>') +
      admCard('bi-three-dots', 'อื่น ๆ', '', '', f('rateNote', 'ข้อความเตือนบนหน้าอัตรา') + f('notifyEmail', 'อีเมลรับการแจ้งเตือนเส้นตาย') + f('reportPrefix', 'คำนำหน้าเลขที่รายงาน') +
        '<div class="small-muted">บุคลากร ' + num(d.counts.employees) + ' · บัญชี ' + num(d.counts.users) + ' · เวร ' + num(d.counts.duties) + ' · สแกน ' + num(d.counts.scans) + ' แถว</div>') +
      '</div>' + (admin ? '<div class="mt-3"><button class="btn btn-brand btn-lg" id="optSave"><i class="bi bi-save"></i> บันทึกค่าตั้งค่า</button></div>' : noteBox('info', 'bi-lock', 'ค่าตั้งค่าระบบแก้ได้โดยผู้ดูแลระบบ', 'mt-3'));
    if ($('optSave')) $('optSave').addEventListener('click', function () {
      var items = {};
      $$('[data-k]', box).forEach(function (el) { items[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
      act({ action: 'saveSettings', payload: { items: items }, title: 'กำลังบันทึกค่าตั้งค่า', icon: 'bi-gear', done: 'บันทึกค่าตั้งค่าเรียบร้อย' }).then(admReload).catch(function () { });
    });
  }
}

/* ---- กล่องแก้ไขข้อมูลหลัก ---- */
var COLORS = ['#0e9f8f', '#7c5cff', '#ff7a59', '#2563eb', '#f5a524', '#e84393', '#10915f', '#0b5f86'];
function editDept(x) {
  x = x || { deptId: '', name: '', short: '', match: '', chiefTitle: '', chiefName: '', color: COLORS[(window.ADM.depts || []).length % COLORS.length], active: 'TRUE', note: '' };
  modal({
    title: x.deptId ? 'แก้ไขฝ่าย' : 'เพิ่มฝ่ายใหม่', icon: 'bi-diagram-3', sub: x.deptId ? x.deptId : 'หลังเพิ่มฝ่ายแล้ว ให้เพิ่มหน่วยงาน อัตรา และผู้ใช้ของฝ่ายนั้น',
    body: '<div class="row g-3"><div class="col-md-7"><label class="form-label">ชื่อฝ่าย *</label><input class="form-control" id="dN" value="' + h(x.name) + '" placeholder="เช่น ฝ่ายเภสัชกรรม"></div>' +
      '<div class="col-md-5"><label class="form-label">ชื่อย่อ</label><input class="form-control" id="dS" value="' + h(x.short) + '" placeholder="เช่น เภสัชกรรม"></div>' +
      '<div class="col-md-7"><label class="form-label">ตำแหน่งหัวหน้าฝ่าย (ผู้ลงนามในเอกสาร)</label><input class="form-control" id="dT" value="' + h(x.chiefTitle) + '" placeholder="เช่น หัวหน้าฝ่ายเภสัชกรรม"></div>' +
      '<div class="col-md-5"><label class="form-label">ชื่อหัวหน้าฝ่าย</label><input class="form-control" id="dC" value="' + h(x.chiefName) + '"></div>' +
      '<div class="col-12"><label class="form-label">คำที่ใช้จับคู่กับฝ่าย/ตำแหน่งจาก HR (คั่นด้วย , )</label><input class="form-control" id="dM" value="' + h(x.match) + '" placeholder="เช่น เภสัช">' +
      '<div class="form-text">ใช้จัดบุคลากรใหม่เข้าฝ่ายอัตโนมัติ เช่น ตำแหน่ง “เภสัชกร” มีคำว่า “เภสัช”</div></div>' +
      '<div class="col-12"><label class="form-label">สีประจำฝ่าย</label><div class="d-flex gap-2 flex-wrap" id="dCol">' + COLORS.map(function (c) {
        return '<button type="button" class="btn btn-icon" data-c="' + c + '" style="background:' + c + ';border:3px solid ' + (c === x.color ? 'var(--ink)' : 'transparent') + '"></button>';
      }).join('') + '</div></div>' +
      '<div class="col-12"><label class="form-label">หมายเหตุ</label><input class="form-control" id="dNo" value="' + h(x.note) + '"></div>' +
      '<div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="dA"' + (x.active !== 'FALSE' ? ' checked' : '') + '><label class="form-check-label" for="dA">เปิดใช้งานฝ่ายนี้</label></div></div></div>',
    okText: 'บันทึก', okIcon: 'bi-save',
    onOpen: function (root) {
      $$('#dCol button', root).forEach(function (b) { b.addEventListener('click', function () { x.color = b.dataset.c; $$('#dCol button', root).forEach(function (y) { y.style.borderColor = y === b ? 'var(--ink)' : 'transparent'; }); }); });
    },
    onOk: function (close) {
      var item = { deptId: x.deptId, name: $('dN').value, short: $('dS').value, chiefTitle: $('dT').value, chiefName: $('dC').value, match: $('dM').value, color: x.color, note: $('dNo').value, active: $('dA').checked, ord: x.ord };
      if (!item.name.trim()) { alertBox('ยังไม่ได้ใส่ชื่อฝ่าย', 'กรุณาใส่ชื่อฝ่าย', 'warning'); return; }
      close();
      act({ action: 'saveDept', payload: { item: item }, title: 'กำลังบันทึกฝ่าย', text: h(item.name), icon: 'bi-diagram-3',
        done: function (r) { return x.deptId ? 'บันทึกฝ่ายเรียบร้อย' : { title: 'เพิ่ม' + item.name + 'เรียบร้อย', html: 'ขั้นต่อไป: เพิ่มหน่วยงาน → กำหนดอัตรา/รหัสรายได้ → เพิ่มผู้ใช้ของฝ่าย', ok: 'รับทราบ' }; } })
        .then(admReload).catch(function () { });
    }
  });
}
function editUnit(u) {
  u = Object.assign({ unitId: '', name: '', deptId: (window.ADM.depts[0] || {}).deptId, needWard: 'FALSE', slots: 'ช,บ,ด', posIds: '', active: 'TRUE', ord: '', note: '' }, u || {});
  var d = window.ADM;
  modal({
    title: u.unitId ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงาน', icon: 'bi-buildings', sub: u.unitId || '', size: 'lg',
    body: '<div class="row g-3"><div class="col-md-7"><label class="form-label">ชื่อหน่วยงาน *</label><input class="form-control" id="uN" value="' + h(u.name) + '"></div>' +
      '<div class="col-md-5"><label class="form-label">สังกัดฝ่าย *</label><select class="form-select" id="uD">' + d.depts.map(function (x) { return '<option value="' + x.deptId + '"' + (x.deptId === u.deptId ? ' selected' : '') + '>' + h(x.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-12"><label class="form-label">ช่วงเวรที่ลงได้</label>' + chipGroup('slots', [{ v: 'ช', t: 'เช้า', d: '08–16' }, { v: 'บ', t: 'บ่าย', d: '16–24' }, { v: 'ด', t: 'ดึก', d: '24–08' }], String(u.slots).split(',')) + '</div>' +
      '<div class="col-12"><label class="form-label">ตำแหน่งที่หน่วยงานนี้รับ (ไม่เลือก = ทุกตำแหน่ง)</label>' +
      chipGroup('pos', d.positions.map(function (p) { return { v: p.posId, t: p.name, d: p.payUnit === 'HOUR' ? 'ชม.' : '' }; }), String(u.posIds || '').split(',').filter(Boolean)) +
      '<div class="form-text">บุคลากรลงเวรเองได้เฉพาะหน่วยงานที่รับตำแหน่งของตน</div></div>' +
      '<div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="uW"' + (u.needWard === 'TRUE' ? ' checked' : '') + '><label class="form-check-label" for="uW">ต้องระบุ <b>หน่วยที่ไปปฏิบัติ</b> (ward ปลายทาง) ทุกวัน — เช่น IPD&amp;OPD</label></div>' +
      '<div class="form-check form-switch mt-2"><input class="form-check-input" type="checkbox" id="uA"' + (u.active !== 'FALSE' ? ' checked' : '') + '><label class="form-check-label" for="uA">เปิดใช้งาน</label></div></div>' +
      '<div class="col-12"><label class="form-label">หมายเหตุ</label><input class="form-control" id="uNo" value="' + h(u.note || '') + '"></div></div>' +
      (u.unitId ? '' : noteBox('warn', 'bi-cash-coin', 'อย่าลืมเพิ่ม <b>อัตรา/รหัสรายได้</b> ของหน่วยงานนี้ (แท็บ “อัตรา”) ไม่เช่นนั้นเวรจะติดธงแดง “ไม่พบอัตรา”', 'mt-3')),
    okText: 'บันทึก', okIcon: 'bi-save',
    onOpen: function (root) { wireChips(root); },
    onOk: function (close, root) {
      var item = { unitId: u.unitId, name: $('uN').value, deptId: $('uD').value, slots: chipValues(root, 'slots').join(','), posIds: chipValues(root, 'pos'), needWard: $('uW').checked, active: $('uA').checked, ord: u.ord, note: $('uNo').value };
      if (!item.name.trim()) { alertBox('ยังไม่ได้ใส่ชื่อ', 'กรุณาใส่ชื่อหน่วยงาน', 'warning'); return; }
      if (!item.slots) { alertBox('ยังไม่ได้เลือกช่วงเวร', 'เลือกช่วงเวรที่ลงได้อย่างน้อย 1 ช่วง', 'warning'); return; }
      close();
      act({ action: 'saveUnit', payload: { item: item }, title: 'กำลังบันทึกหน่วยงาน', text: h(item.name), icon: 'bi-buildings', done: 'บันทึกหน่วยงานเรียบร้อย' }).then(admReload).catch(function () { });
    }
  });
}
function editWard(w) {
  w = w || { wardId: '', name: '', short: '', aliases: '', active: 'TRUE' };
  modal({
    title: w.wardId ? 'แก้ไขหน่วยปลายทาง' : 'เพิ่มหน่วยปลายทาง', icon: 'bi-geo-alt',
    body: '<label class="form-label">ชื่อเต็ม *</label><input class="form-control mb-3" id="wN" value="' + h(w.name) + '" placeholder="เช่น IPD (19A)">' +
      '<label class="form-label">ตัวย่อที่แสดงในช่องตาราง</label><input class="form-control mb-3" id="wS" value="' + h(w.short) + '" placeholder="เช่น 19A (เว้นว่าง = ระบบตั้งให้)">' +
      '<label class="form-label">ชื่ออื่นที่ให้ถือเป็นหน่วยเดียวกัน (คั่นด้วย | )</label><input class="form-control mb-3" id="wA" value="' + h(w.aliases) + '">' +
      '<div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="wAc"' + (w.active !== 'FALSE' ? ' checked' : '') + '><label class="form-check-label" for="wAc">เปิดใช้งาน</label></div>',
    okText: 'บันทึก', okIcon: 'bi-save',
    onOk: function (close) {
      var item = { wardId: w.wardId, name: $('wN').value, short: $('wS').value, aliases: $('wA').value, active: $('wAc').checked };
      close();
      act({ action: 'saveWard', payload: { item: item }, title: 'กำลังบันทึกหน่วยปลายทาง', icon: 'bi-geo-alt', done: 'บันทึกเรียบร้อย', quiet: true }).then(admReload).catch(function () { });
    }
  });
}
function doMergeWards() {
  var ws = window.ADM.wards;
  modal({
    title: 'รวมหน่วยที่สะกดต่างกัน', icon: 'bi-union', iconCls: 'acc',
    body: '<label class="form-label">หน่วยหลักที่จะเก็บไว้</label><select class="form-select mb-3" id="mgKeep">' + ws.map(function (w) { return '<option value="' + w.wardId + '">' + h(w.name) + '</option>'; }).join('') + '</select>' +
      '<label class="form-label">หน่วยที่จะยุบรวมเข้าไป (คลิกเลือกได้หลายรายการ)</label>' +
      '<div style="max-height:260px;overflow:auto">' + chipGroup('merge', ws.map(function (w) { return { v: w.wardId, t: w.name }; }), []) + '</div>' +
      noteBox('warn', 'bi-exclamation-triangle', 'เวร ทะเบียนบุคลากร และกรอบเวรที่อ้างหน่วยเหล่านั้นจะถูกย้ายมาที่หน่วยหลักทั้งหมด — ย้อนกลับไม่ได้', 'mt-3'),
    okText: 'รวมหน่วย', okIcon: 'bi-union', size: 'lg',
    onOpen: function (root) { wireChips(root); },
    onOk: function (close, root) {
      var sel = chipValues(root, 'merge'), keep = $('mgKeep').value;
      if (!sel.filter(function (x) { return x !== keep; }).length) { alertBox('ยังไม่ได้เลือก', 'เลือกหน่วยที่จะรวมอย่างน้อย 1 หน่วย (ที่ไม่ใช่หน่วยหลัก)', 'warning'); return; }
      close();
      act({ action: 'mergeWards', payload: { keepId: keep, mergeIds: sel }, title: 'กำลังรวมหน่วยปลายทาง', icon: 'bi-union', steps: ['ย้ายเวรที่อ้างหน่วยเดิม', 'ย้ายทะเบียนบุคลากร', 'ย้ายกรอบเวรและลบหน่วยซ้ำ'],
        done: function (r) { return { title: 'รวมหน่วยเรียบร้อย', html: 'ย้ายเวร ' + r.duties + ' แถว · บุคลากร ' + r.employees + ' คน' }; } }).then(admReload).catch(function () { });
    }
  });
}
/** เพิ่ม/แก้รหัสเวร (v2.3) */
function editShift(x) {
  var isNew = !x || !x.scId;
  x = x || { scId: '', code: '', name: '', slot: 'ช', start: '08:00', end: '16:00', nextDay: 'FALSE', value: '1', quota: '', pay: '', active: 'TRUE', ord: '', effectiveFrom: '', note: '' };
  var ver = !!x._newVer;
  modal({
    title: ver ? 'เพิ่มฉบับใหม่ของรหัส ' + x.code : isNew ? 'เพิ่มรหัสเวร' : 'แก้ไขรหัสเวร ' + x.code, icon: 'bi-clock-history', size: 'lg',
    sub: ver ? 'ฉบับใหม่มีผลตั้งแต่วันที่ที่ระบุ เดือนก่อนหน้ายังคิดตามฉบับเดิม' : 'ใช้ได้ทันทีกับทุกหน้า: ตารางเวร ลงเวรเอง เอกสาร และไฟล์ HRMi',
    body: '<div class="row g-3">' +
      '<div class="col-md-3"><label class="form-label">รหัส *</label><input class="form-control form-control-lg" id="scC" maxlength="6" value="' + h(x.code) + '"' + (ver ? ' readonly' : '') + ' placeholder="เช่น ช4"></div>' +
      '<div class="col-md-5"><label class="form-label">ชื่อเรียก</label><input class="form-control form-control-lg" id="scN" value="' + h(x.name) + '" placeholder="เช่น เช้าพิเศษ"></div>' +
      '<div class="col-md-4"><label class="form-label">กลุ่มช่วงเวร *</label><select class="form-select form-select-lg" id="scS">' + ['ช', 'บ', 'ด'].map(function (s) { return '<option value="' + s + '"' + (s === x.slot ? ' selected' : '') + '>' + s + ' · ' + SLOT_NAME[s] + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-6 col-md-3"><label class="form-label">เวลาเริ่ม</label><input class="form-control" id="scB" inputmode="numeric" placeholder="HH:MM" value="' + h(x.start) + '"></div>' +
      '<div class="col-6 col-md-3"><label class="form-label">เวลาเลิก</label><input class="form-control" id="scE" value="' + h(x.end) + '" placeholder="HH:MM หรือ 24:00"></div>' +
      '<div class="col-md-6 d-flex align-items-end"><div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="scX"' + (x.nextDay === 'TRUE' ? ' checked' : '') + '><label class="form-check-label" for="scX">เริ่มหลังเที่ยงคืน (เช้ามืดของวันถัดไป)<div class="form-text mt-0">เช่น เวรดึก ลงวันที่ 5 = 00:00–08:00 ของวันที่ 6</div></label></div></div>' +
      '<div class="col-6 col-md-3"><label class="form-label">นับเป็น (เวร)</label><input class="form-control" id="scV" inputmode="decimal" value="' + h(x.value) + '"><div class="form-text">ใช้คิดเงินและยอด HRMi</div></div>' +
      '<div class="col-6 col-md-3"><label class="form-label">นับกรอบ</label><input class="form-control" id="scQ" inputmode="decimal" value="' + h(x.quota) + '" placeholder="เท่ากับนับเวร"><div class="form-text">ครึ่งเวร = 0.5</div></div>' +
      '<div class="col-md-6"><label class="form-label">วิธีคิดค่าตอบแทน</label>' + chipGroup('scP', [{ v: '', t: 'ตามตำแหน่ง' }, { v: 'SHIFT', t: 'รายเวร' }, { v: 'HOUR', t: 'รายชั่วโมง' }], [x.pay || ''], { single: true }) + '</div>' +
      '<div class="col-6 col-md-3"><label class="form-label">มีผลตั้งแต่</label><input class="form-control" id="scF" type="date" value="' + h(x.effectiveFrom === '2020-01-01' && !ver ? '' : x.effectiveFrom) + '"></div>' +
      '<div class="col-6 col-md-3"><label class="form-label">ลำดับแสดง</label><input class="form-control" id="scO" inputmode="numeric" value="' + h(x.ord) + '"></div>' +
      '<div class="col-md-6"><label class="form-label">หมายเหตุ</label><input class="form-control" id="scT" value="' + h(x.note) + '"></div>' +
      '<div class="col-12"><div id="scPrev"></div></div></div>' +
      noteBox('info', 'bi-cash-coin', 'รหัสรายได้/อัตรา: ระบบหาอัตราที่ตั้งไว้ <b>เฉพาะรหัสนี้</b> ก่อน (แท็บอัตรา › ช่วงเวร = รหัสนี้) ถ้าไม่มีจะใช้อัตราของกลุ่มช่วงเวร', 'mt-3') +
      (!isNew && !ver ? '<div class="d-flex justify-content-between align-items-center mt-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="scA"' + (x.active !== 'FALSE' ? ' checked' : '') + '><label class="form-check-label" for="scA">เปิดใช้งาน</label></div><button type="button" class="btn btn-sm btn-ghost text-danger" id="scDel"><i class="bi bi-trash"></i> ลบ</button></div>' : ''),
    okText: 'บันทึกรหัสเวร', okIcon: 'bi-save',
    onOpen: function (root) {
      wireChips(root);
      var prev = function () {
        var r = { code: $('scC').value, name: $('scN').value, slot: $('scS').value, start: $('scB').value, end: $('scE').value, nextDay: $('scX').checked ? 'TRUE' : 'FALSE', value: $('scV').value, quota: $('scQ').value };
        var df = shiftDefOfJs(r);
        $('scPrev').innerHTML = df ? '<div class="hr-sum"><span>' + shiftBadge(r.code || '?') + ' ' + h(SLOT_NAME[r.slot]) + '</span><span><b>' + m2hm(df.start) + '–' + m2hm(df.end, true) + '</b>' + (df.start >= 1440 ? ' ของวันถัดไป' : df.end > 1440 ? ' (ข้ามคืน)' : '') + '</span><span><b>' + num((df.end - df.start) / 60) + '</b> ชม.</span><span>นับ <b>' + num(df.value) + '</b> เวร · กรอบ <b>' + num(df.quota) + '</b></span></div>' : noteBox('bad', 'bi-x-octagon', 'เวลาไม่ถูกต้อง ใช้รูปแบบ HH:MM');
      };
      $$('input,select', root).forEach(function (el) { el.addEventListener('input', prev); el.addEventListener('change', prev); });
      prev();
      if ($('scDel')) $('scDel').addEventListener('click', function () {
        confirmX({ title: 'ลบรหัส ' + x.code + '?', html: 'ลบได้เฉพาะรหัสที่ยังไม่มีเวรใช้ — ถ้ามีเวรใช้แล้วให้ปิดใช้งานแทน', ok: 'ลบ', danger: true }).then(function (y) {
          if (!y) return;
          bootstrap.Modal.getOrCreateInstance($('mdl')).hide();
          act({ action: 'saveShiftCode', payload: { remove: true, item: { scId: x.scId } }, title: 'กำลังลบรหัสเวร', icon: 'bi-trash', done: 'ลบรหัสเวรแล้ว' }).then(scAfter).catch(function () { });
        });
      });
    },
    onOk: function (close, root) {
      var item = { scId: ver ? '' : x.scId, code: $('scC').value.trim(), name: $('scN').value.trim(), slot: $('scS').value, start: $('scB').value, end: $('scE').value.trim(), nextDay: $('scX').checked,
        value: $('scV').value, quota: $('scQ').value, pay: chipValues(root, 'scP')[0] || '', effectiveFrom: $('scF').value || (isNew && !ver ? '' : x.effectiveFrom), ord: $('scO').value, note: $('scT').value, active: $('scA') ? $('scA').checked : true };
      if (ver && !$('scF').value) { alertBox('ใส่วันที่มีผล', 'ฉบับใหม่ต้องระบุวันที่เริ่มมีผล', 'warning'); return; }
      if (!item.code) { alertBox('ยังไม่ได้ใส่รหัส', 'กรุณาใส่รหัสเวร', 'warning'); return; }
      close();
      act({ action: 'saveShiftCode', payload: { item: item }, title: 'กำลังบันทึกรหัสเวร', text: h(item.code) + ' · ' + h(item.start) + '–' + h(item.end), icon: 'bi-clock-history',
        steps: ['ตรวจรูปแบบรหัสและเวลา', 'บันทึกลงฐานข้อมูล', 'ปรับการคำนวณทุกหน้าให้ใช้ค่าใหม่'], done: 'บันทึกรหัสเวรเรียบร้อย' }).then(scAfter).catch(function () { });
    }
  });
}
function scAfter() { scReset(); admReload(); }
function editPos(p) {
  p = p || { posId: '', name: '', payUnit: 'SHIFT', match: '', active: 'TRUE' };
  modal({
    title: p.posId ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่ง', icon: 'bi-person-vcard',
    body: '<label class="form-label">ชื่อตำแหน่ง *</label><input class="form-control mb-3" id="pN" value="' + h(p.name) + '">' +
      '<label class="form-label">คิดค่าตอบแทนเป็น</label>' + chipGroup('pu', [{ v: 'SHIFT', t: 'เวร', d: 'เช่น พยาบาล' }, { v: 'HOUR', t: 'ชั่วโมง', d: 'เช่น เภสัชกร' }], [p.payUnit === 'HOUR' ? 'HOUR' : 'SHIFT'], { single: true }) +
      '<label class="form-label mt-3">คำที่ใช้จับคู่กับตำแหน่งของ HR (คั่นด้วย , )</label><input class="form-control mb-3" id="pM" value="' + h(p.match) + '">' +
      '<div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="pA"' + (p.active !== 'FALSE' ? ' checked' : '') + '><label class="form-check-label" for="pA">เปิดใช้งาน</label></div>',
    okText: 'บันทึก', okIcon: 'bi-save',
    onOpen: function (root) { wireChips(root); },
    onOk: function (close, root) {
      var item = { posId: p.posId, name: $('pN').value, payUnit: chipValues(root, 'pu')[0] || 'SHIFT', match: $('pM').value, active: $('pA').checked };
      close();
      act({ action: 'savePosition', payload: { item: item }, title: 'กำลังบันทึกตำแหน่ง', icon: 'bi-person-vcard', done: 'บันทึกเรียบร้อย', quiet: true }).then(admReload).catch(function () { });
    }
  });
}
function editRate(r) {
  var d = window.ADM;
  r = r || { rateId: '', unitId: '', posId: '', slot: 'ช', incomeCode: '', incomeName: '', amount: '', effectiveFrom: '', active: 'TRUE' };
  var uopts = d.depts.map(function (x) {
    return '<optgroup label="' + h(x.name) + '">' + d.units.filter(function (u) { return u.deptId === x.deptId; }).map(function (u) { return '<option value="' + u.unitId + '"' + (u.unitId === r.unitId ? ' selected' : '') + '>' + h(u.name) + (u.active === 'FALSE' ? ' (ปิด)' : '') + '</option>'; }).join('') + '</optgroup>';
  }).join('');
  modal({
    title: r.rateId ? 'แก้ไขอัตรา' : 'เพิ่มอัตรา', icon: 'bi-cash-coin', size: 'lg',
    body: '<div class="row g-3"><div class="col-md-5"><label class="form-label">หน่วยงาน</label><select class="form-select" id="rU">' + uopts + '</select></div>' +
      '<div class="col-md-4"><label class="form-label">ตำแหน่ง</label><select class="form-select" id="rP">' + d.positions.map(function (p) { return '<option value="' + p.posId + '"' + (p.posId === r.posId ? ' selected' : '') + '>' + h(p.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-md-3"><label class="form-label">ช่วงเวร / รหัสเวร</label><select class="form-select" id="rS"><optgroup label="กลุ่มช่วงเวร">' + [['ช', 'เช้า'], ['บ', 'บ่าย'], ['ด', 'ดึก']].map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === r.slot ? ' selected' : '') + '>' + s[0] + ' · ' + s[1] + '</option>'; }).join('') + '</optgroup><optgroup label="เฉพาะรหัสเวร">' +
        (d.shiftCodes || []).filter(function (x, i, a) { return ['ช', 'บ', 'ด'].indexOf(x.code) < 0 && a.findIndex(function (y) { return y.code === x.code; }) === i; }).map(function (x) { return '<option value="' + h(x.code) + '"' + (x.code === r.slot ? ' selected' : '') + '>' + h(x.code) + ' · ' + h(x.name) + '</option>'; }).join('') + '</optgroup></select></div>' +
      '<div class="col-md-4"><label class="form-label">รหัสรายได้ HRMi *</label><input class="form-control" id="rC" value="' + h(r.incomeCode) + '" placeholder="เช่น R631-6"></div>' +
      '<div class="col-md-4"><label class="form-label">จำนวนเงินต่อเวร/ชั่วโมง *</label><input class="form-control" id="rA" value="' + h(r.amount) + '" inputmode="decimal"></div>' +
      '<div class="col-md-4"><label class="form-label">มีผลตั้งแต่วันที่</label><input class="form-control" id="rE" type="date" value="' + h(r.effectiveFrom) + '"></div>' +
      '<div class="col-12"><label class="form-label">ชื่อรหัสรายได้</label><input class="form-control" id="rN" value="' + h(r.incomeName) + '"></div></div>' +
      noteBox('info', 'bi-calendar-event', 'ขึ้นอัตราใหม่: เพิ่มแถวใหม่พร้อมวันที่มีผล ระบบใช้กับเวรตั้งแต่วันนั้นเป็นต้นไป เดือนเก่ายังคิดอัตราเดิม', 'mt-3') +
      (r.rateId ? '<div class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" id="rAc"' + (r.active !== 'FALSE' ? ' checked' : '') + '><label class="form-check-label" for="rAc">ใช้งานอัตรานี้</label></div>' : ''),
    okText: 'บันทึก', okIcon: 'bi-save',
    onOk: function (close) {
      var item = { rateId: r.rateId, unitId: $('rU').value, posId: $('rP').value, slot: $('rS').value, incomeCode: $('rC').value.trim(), incomeName: $('rN').value, amount: $('rA').value, effectiveFrom: $('rE').value, active: $('rAc') ? $('rAc').checked : true, note: r.note || '' };
      if (!item.incomeCode || item.amount === '' || isNaN(+item.amount)) { alertBox('ข้อมูลไม่ครบ', 'กรุณาใส่รหัสรายได้และจำนวนเงินให้ถูกต้อง', 'warning'); return; }
      close();
      act({ action: 'saveRate', payload: { item: item }, title: 'กำลังบันทึกอัตรา', text: h(item.incomeCode) + ' · ' + num(item.amount) + ' บาท', icon: 'bi-cash-coin', done: 'บันทึกอัตราเรียบร้อย' }).then(admReload).catch(function () { });
    }
  });
}
function editQuota(q) {
  var d = window.ADM;
  q = q || { quotaId: '', scope: 'UNIT', refId: '', slot: 'ช', dayType: 'ALL', lim: '', effectiveFrom: '' };
  var refOpts = function (scope) {
    if (scope === 'DEPT') return d.depts.map(function (x) { return '<option value="' + x.deptId + '"' + (x.deptId === q.refId ? ' selected' : '') + '>' + h(x.name) + '</option>'; }).join('');
    if (scope === 'UNIT') return d.units.map(function (u) { return '<option value="' + u.unitId + '"' + (u.unitId === q.refId ? ' selected' : '') + '>' + h(u.name) + ' · ' + h(admDeptName(u.deptId)) + '</option>'; }).join('');
    return d.wards.map(function (w) { return '<option value="' + w.wardId + '"' + (w.wardId === q.refId ? ' selected' : '') + '>' + h(w.name) + '</option>'; }).join('');
  };
  modal({
    title: q.quotaId ? 'แก้ไขกรอบเวร' : 'เพิ่มกรอบเวร', icon: 'bi-bar-chart-steps',
    body: '<label class="form-label">ระดับ</label>' + chipGroup('scope', [{ v: 'DEPT', t: 'ทั้งฝ่าย' }, { v: 'UNIT', t: 'รายหน่วยงาน' }, { v: 'WARD', t: 'ราย ward' }], [q.scope], { single: true }) +
      '<label class="form-label mt-3">ของ</label><select class="form-select mb-3" id="qR">' + refOpts(q.scope) + '</select>' +
      '<div class="row g-2"><div class="col-4"><label class="form-label">ช่วงเวร</label><select class="form-select" id="qL">' + ['ช', 'บ', 'ด'].map(function (s) { return '<option' + (s === q.slot ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-4"><label class="form-label">ประเภทวัน</label><select class="form-select" id="qD">' + [['ALL', 'ทุกวัน'], ['WORKDAY', 'วันทำการ'], ['HOLIDAY', 'วันหยุด']].map(function (x) { return '<option value="' + x[0] + '"' + (q.dayType === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-4"><label class="form-label">ไม่เกิน (คน/วัน)</label><input class="form-control" id="qN" value="' + h(q.lim) + '" inputmode="decimal"></div></div>' +
      '<label class="form-label mt-3">มีผลตั้งแต่</label><input class="form-control" id="qE" type="date" value="' + h(q.effectiveFrom) + '">',
    okText: 'บันทึก', okIcon: 'bi-save',
    onOpen: function (root) { wireChips(root, function (n, v) { if (n === 'scope') { q.scope = v[0] || 'UNIT'; $('qR').innerHTML = refOpts(q.scope); } }); },
    onOk: function (close, root) {
      var item = { quotaId: q.quotaId, scope: chipValues(root, 'scope')[0] || 'UNIT', refId: $('qR').value, slot: $('qL').value, dayType: $('qD').value, lim: $('qN').value, effectiveFrom: $('qE').value };
      if (item.lim === '' || isNaN(+item.lim)) { alertBox('ตัวเลขไม่ถูกต้อง', 'กรุณาใส่จำนวนคนสูงสุดต่อวัน', 'warning'); return; }
      close();
      act({ action: 'saveQuota', payload: { item: item }, title: 'กำลังบันทึกกรอบเวร', icon: 'bi-bar-chart-steps', done: 'บันทึกกรอบเวรเรียบร้อย', quiet: true }).then(admReload).catch(function () { });
    }
  });
}
function editCal(c) {
  var isNew = !c;
  c = c || { date: '', dayType: 'PUBHOL', name: '' };
  modal({
    title: 'วันหยุด', icon: 'bi-calendar-heart',
    body: '<label class="form-label">วันที่</label><input class="form-control mb-3" id="cD" type="date" value="' + h(c.date) + '"' + (isNew ? '' : ' disabled') + '>' +
      '<label class="form-label">ประเภท</label><select class="form-select mb-3" id="cT">' + [['PUBHOL', 'นักขัตฤกษ์'], ['COMP', 'ชดเชย'], ['CLOSED', 'ปิดหน่วยงาน'], ['WORKDAY', 'วันทำการ (บังคับ)']].map(function (x) {
        return '<option value="' + x[0] + '"' + (c.dayType === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select><label class="form-label">ชื่อวัน</label><input class="form-control" id="cN" value="' + h(c.name) + '">' +
      (isNew ? '' : '<button class="btn btn-danger-soft btn-sm mt-3" id="cDel"><i class="bi bi-trash"></i> ลบวันนี้ออกจากปฏิทิน</button>'),
    okText: 'บันทึก', okIcon: 'bi-save',
    onOpen: function (root, close) {
      if ($('cDel')) $('cDel').addEventListener('click', function () {
        close();
        act({ action: 'saveCalendar', payload: { remove: true, item: { date: c.date } }, title: 'กำลังลบวันหยุด', icon: 'bi-trash', done: 'ลบแล้ว', quiet: true }).then(admReload).catch(function () { });
      });
    },
    onOk: function (close) {
      var item = { date: $('cD').value, dayType: $('cT').value, name: $('cN').value };
      if (!item.date) { alertBox('ยังไม่ได้เลือกวันที่', 'กรุณาเลือกวันที่', 'warning'); return; }
      close();
      act({ action: 'saveCalendar', payload: { item: item }, title: 'กำลังบันทึกวันหยุด', icon: 'bi-calendar-heart', done: 'บันทึกเรียบร้อย', quiet: true }).then(admReload).catch(function () { });
    }
  });
}
function editWin(w) {
  var d = window.ADM;
  w = w || { bwId: '', ym: thisYmJs(), unitId: '', openFrom: '', openTo: '', note: '' };
  modal({
    title: 'ช่วงเปิดลงบันทึกตารางเวร', icon: 'bi-calendar-range',
    body: '<div class="row g-3"><div class="col-6"><label class="form-label">เดือนของตารางเวร</label><select class="form-select" id="bwY">' + ymOptions(w.ym, 2, 3) + '</select></div>' +
      '<div class="col-6"><label class="form-label">หน่วยงาน</label><select class="form-select" id="bwU"><option value="">ทุกหน่วยงาน</option>' + d.units.map(function (u) { return '<option value="' + u.unitId + '"' + (u.unitId === w.unitId ? ' selected' : '') + '>' + h(u.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-6"><label class="form-label">เปิดวันที่</label><input class="form-control" id="bwF" type="date" value="' + h(w.openFrom) + '"></div>' +
      '<div class="col-6"><label class="form-label">ถึงวันที่</label><input class="form-control" id="bwT" type="date" value="' + h(w.openTo) + '"></div>' +
      '<div class="col-12"><label class="form-label">หมายเหตุ</label><input class="form-control" id="bwN" value="' + h(w.note) + '"></div></div>',
    okText: 'บันทึก', okIcon: 'bi-save',
    onOk: function (close) {
      var item = { bwId: w.bwId, ym: $('bwY').value, unitId: $('bwU').value, openFrom: $('bwF').value, openTo: $('bwT').value, note: $('bwN').value };
      if (!item.openFrom || !item.openTo) { alertBox('ข้อมูลไม่ครบ', 'กรุณาเลือกวันเปิดและวันปิด', 'warning'); return; }
      close();
      act({ action: 'saveBookingWindow', payload: { item: item }, title: 'กำลังบันทึกช่วงลงตารางเวร', icon: 'bi-calendar-range', done: 'บันทึกเรียบร้อย', quiet: true }).then(admReload).catch(function () { });
    }
  });
}

/* ================================================================ นำเข้าข้อมูล / งานระบบ */
PAGES.data = function () {
  $('view').innerHTML = pageHead('bi-database-gear', 'นำเข้าข้อมูล / งานระบบ', GUIDE.data.lead) +
    '<div class="grid-auto anim" style="--min:340px">' +
    admCard('bi-tools', 'งานระบบ', '', '', '<div class="d-grid gap-2">' +
      [['upgrade', 'bi-arrow-up-circle', 'อัปเกรดฐานข้อมูล', 'รัน 1 ครั้งหลังอัปเดตโค้ดหลังบ้าน (ปลอดภัย รันซ้ำได้)'], ['health', 'bi-heart-pulse', 'ตรวจสุขภาพระบบ', 'ดูจำนวนข้อมูล หน่วยงานที่ยังไม่มีอัตรา'],
        ['scan', 'bi-fingerprint', 'ดึงเวลาสแกนเดือนนี้', 'ปกติระบบดึงให้อัตโนมัติทุกคืน'], ['emp', 'bi-arrow-repeat', 'ซิงก์ทะเบียนบุคลากร', 'อัปเดตชื่อ ตำแหน่ง หน่วยงานจาก SmartAPI'],
        ['testapi', 'bi-plug', 'ทดสอบ SmartAPI', 'ตรวจการเชื่อมต่อ'], ['warm', 'bi-lightning-charge', 'อุ่นแคช', 'ทำให้ระบบตอบเร็วขึ้นหลังอัปเดต'], ['triggers', 'bi-alarm', 'ตั้งงานอัตโนมัติ', 'งานกลางคืน 01:00 และอุ่นแคชทุก 4 ชม.']]
        .map(function (j) { return '<button class="btn btn-ghost justify-content-start text-start" onclick="runJob(\'' + j[0] + '\',\'' + h(j[2]) + '\')"><i class="bi ' + j[1] + ' fs-5 text-brand"></i><span><b>' + j[2] + '</b><br><span class="small-muted">' + j[3] + '</span></span></button>'; }).join('') + '</div>') +
    admCard('bi-people', 'ทะเบียนบุคลากร', '', '', noteBox('acc', 'bi-lightbulb', 'เพิ่มผู้ใช้ทีละคนหรือหลายคน ใช้หน้า <a href="#users" onclick="go(\'users\');return false">ผู้ใช้และสิทธิ์</a> ง่ายกว่า — ช่องนี้สำหรับนำเข้าทะเบียนจำนวนมากจาก Excel', 'mb-3') +
      '<p class="small-muted">วางข้อมูลจาก Excel (บรรทัดแรกเป็นหัวคอลัมน์): <code>empCode</code> <code>fullName</code> <code>hrPosition</code> <code>wardName</code></p>' +
      '<textarea class="form-control" id="imEmp" rows="5" placeholder="empCode&#9;fullName&#9;hrPosition&#9;wardName"></textarea>' +
      '<div class="form-check form-switch my-2"><input class="form-check-input" type="checkbox" id="imUser" checked><label class="form-check-label" for="imUser">สร้างบัญชีเข้าระบบให้ด้วย (รหัสผ่าน = รหัสพนักงาน · จัดเข้าฝ่ายอัตโนมัติ)</label></div>' +
      '<button class="btn btn-brand" id="imEmpGo"><i class="bi bi-upload"></i> นำเข้าทะเบียน</button>') +
    admCard('bi-calendar-week', 'ตารางเวรย้อนหลัง', '', '', '<p class="small-muted">คอลัมน์: <code>date</code> <code>empCode</code> <code>unitName</code> <code>wardName</code> <code>shiftCode</code> (หรือใช้ <code>ym</code> + <code>day</code>) · ข้อมูลเก่าที่ไม่มี ward เว้นว่างได้</p>' +
      '<textarea class="form-control" id="imDuty" rows="5" placeholder="date&#9;empCode&#9;unitName&#9;wardName&#9;shiftCode"></textarea>' +
      '<div class="form-check form-switch my-2"><input class="form-check-input" type="checkbox" id="imClose" checked><label class="form-check-label" for="imClose">ตั้งสถานะเดือนที่นำเข้าเป็น “ปิดรอบ”</label></div>' +
      '<button class="btn btn-brand" id="imDutyGo"><i class="bi bi-upload"></i> นำเข้าตารางเวร</button>') +
    admCard('bi-archive', 'คลังข้อมูลรายเดือน', '', '', '<p class="small-muted">ย้ายเดือนที่ปิดรอบครบทุกหน่วยงานออกจากชีทหลัก ระบบยังอ่านย้อนหลังได้เหมือนเดิม (ระบบย้ายให้อัตโนมัติเมื่อปิดรอบครบ 45 วัน)</p>' +
      '<div class="d-flex gap-2 mb-3"><select class="form-select" id="arYm" style="width:auto">' + ymOptions(thisYmJs()) + '</select><button class="btn btn-brand" id="arGo"><i class="bi bi-archive"></i> ย้ายเข้าคลัง</button></div><div id="arList"><div class="skeleton" style="height:2em"></div></div>') +
    '</div>';

  $('imEmpGo').addEventListener('click', function () {
    var p = csvToRows($('imEmp').value);
    if (!p.rows.length) { alertBox('ยังไม่มีข้อมูล', 'วางข้อมูลจาก Excel พร้อมหัวคอลัมน์', 'info'); return; }
    act({ action: 'importEmployees', payload: { rows: p.rows, createUsers: $('imUser').checked }, title: 'กำลังนำเข้าทะเบียนบุคลากร', text: p.rows.length + ' แถว', icon: 'bi-people',
      steps: ['ตรวจรหัสพนักงาน', 'จับคู่หน่วยปลายทางและตำแหน่ง', 'สร้างบัญชีผู้ใช้'],
      done: function (r) { return { title: 'นำเข้าเรียบร้อย', html: 'บุคลากร <b>' + r.employees + '</b> คน · บัญชีใหม่ <b>' + r.users + '</b> · หน่วยปลายทางใหม่ <b>' + r.newWards + '</b>' }; } })
      .then(function () { MEMO = {}; $('imEmp').value = ''; }).catch(function () { });
  });
  $('imDutyGo').addEventListener('click', function () {
    var p = csvToRows($('imDuty').value);
    if (!p.rows.length) { alertBox('ยังไม่มีข้อมูล', 'วางข้อมูลจาก Excel พร้อมหัวคอลัมน์', 'info'); return; }
    askPassword('นำเข้าตารางเวรย้อนหลัง', 'จะเพิ่ม <b>' + p.rows.length + '</b> แถวเข้าระบบ').then(function (v) {
      if (!v) return;
      act({ action: 'importLegacy', payload: { rows: p.rows, password: v.password, closePeriods: $('imClose').checked }, title: 'กำลังนำเข้าตารางเวรย้อนหลัง', text: p.rows.length + ' แถว', icon: 'bi-calendar-week',
        steps: ['ตรวจวันที่และรหัสเวร', 'จับคู่หน่วยงานและหน่วยปลายทาง', 'บันทึกและปิดรอบ'],
        done: function (r) {
          return { title: 'นำเข้า ' + r.added + ' แถว', icon: r.skipped ? 'warning' : 'success', html: 'ข้าม ' + r.skipped + ' แถว · ' + r.months + ' เดือน' +
            (r.messages.length ? '<div class="res-list mt-2">' + r.messages.map(function (m) { return '<div class="warn"><i class="bi bi-exclamation-triangle"></i>' + h(m) + '</div>'; }).join('') + '</div>' : '') };
        } }).then(function () { MEMO = {}; }).catch(function () { });
    });
  });
  $('arGo').addEventListener('click', function () {
    askPassword('ย้ายเข้าคลัง', 'ย้ายข้อมูลเดือน <b>' + thaiYmJs($('arYm').value, true) + '</b> ออกจากชีทหลัก').then(function (v) {
      if (!v) return;
      act({ action: 'archiveMonth', payload: { ym: $('arYm').value, password: v.password }, title: 'กำลังย้ายเข้าคลัง', icon: 'bi-archive', done: function (r) { return 'ย้าย ' + r.rows + ' แถวเข้าคลังแล้ว'; } })
        .then(loadArch).catch(function () { });
    });
  });
  var loadArch = function () {
    api('listArchives', {}).then(function (list) {
      $('arList').innerHTML = list.length ? '<div class="d-grid gap-1">' + list.map(function (a) {
        return '<div class="d-flex align-items-center gap-2 small"><span class="tag t-arc">' + h(a.ymTh) + '</span><span>' + num(a.rows) + ' แถว</span><a class="ms-auto" href="' + h(a.url) + '" target="_blank" rel="noopener">ไฟล์คลัง</a></div>';
      }).join('') + '</div>' : '<span class="small-muted">ยังไม่มีเดือนในคลัง</span>';
    }).catch(function () { $('arList').innerHTML = ''; });
  };
  loadArch();
};
function runJob(job, label) {
  act({ action: 'runJob', payload: { job: job, ym: S.ym || thisYmJs() }, title: 'กำลังทำงาน: ' + (label || job), icon: 'bi-gear-wide-connected',
    done: function (r) {
      var msg = r.message || (r.days !== undefined ? 'ดึงสแกน ' + r.days + ' วัน จาก ' + r.people + ' คน' : r.found !== undefined && r.asked !== undefined ? 'ตรวจ ' + r.asked + ' คน พบ ' + r.found + ' · พ้นสภาพ ' + r.stopped : r.tokenLen ? 'เชื่อมต่อได้ (' + r.ms + ' ms) · ตัวอย่าง ' + r.sample + (r.found ? ' พบข้อมูล' : ' ไม่พบ') : JSON.stringify(r));
      return { title: 'เรียบร้อย', html: '<pre style="text-align:left;white-space:pre-wrap;font-family:inherit;font-size:.88rem;background:var(--surface-2);padding:10px;border-radius:12px;margin:0">' + h(msg) + '</pre>' };
    } }).then(function () { MEMO = {}; if (job === 'upgrade') api('bootstrap', {}).then(function (b) { S.boot = b; S.me = b.me; drawMenu(); }).catch(function () { }); }).catch(function () { });
}

/* ================================================================ ประวัติการใช้งาน */
var ACT_TH = { LOGIN: 'เข้าสู่ระบบ', SAVE_CELLS: 'บันทึกตารางเวร', SELF_BOOK: 'ลงเวรเอง', CONFIRM_BOOK: 'ยืนยันเวร', CANCEL_BOOK: 'ยกเลิกเวร', SAVE_WORK: 'แก้การปฏิบัติงาน', MARK_WORKED: 'ตรงตามใบ',
  ADD_USER: 'เพิ่มผู้ใช้', EDIT_USER: 'แก้สิทธิ์ผู้ใช้', ADD_USERS_BULK: 'เพิ่มผู้ใช้หลายคน', DISABLE_USER: 'ปิดบัญชี', ENABLE_USER: 'เปิดบัญชี', DELETE_USER: 'ลบบัญชี', RESET_PASSWORD: 'รีเซ็ตรหัสผ่าน', CHANGE_PASSWORD: 'เปลี่ยนรหัสผ่าน',
  SAVE_DEPT: 'บันทึกฝ่าย', SAVE_UNIT: 'บันทึกหน่วยงาน', SAVE_RATE: 'บันทึกอัตรา', SAVE_QUOTA: 'บันทึกกรอบเวร', SAVE_SETTINGS: 'บันทึกค่าตั้งค่า', EXPORT_HRMI: 'ออกไฟล์ HRMi', EXPORT_PDF: 'ออก PDF', EXCEPTION: 'ยกเว้นกฎ', REOPEN: 'ย้อนสถานะ' };
PAGES.audit = function () {
  $('topExtra').innerHTML = '<div class="input-group input-group-sm" style="width:240px"><span class="input-group-text"><i class="bi bi-search"></i></span><input class="form-control" id="auQ" placeholder="กรองตามคำสั่ง เช่น USER"></div>';
  var load = function () {
    api('getAudit', { action: $('auQ').value.trim().toUpperCase() }, { fresh: true }).then(function (list) {
      $('view').innerHTML = pageHead('bi-clock-history', 'ประวัติการใช้งาน', GUIDE.audit.lead, '<span class="small-muted">แสดงล่าสุด ' + list.length + ' รายการ</span>') +
        tableBox(['เวลา', 'ผู้ใช้', 'การกระทำ', 'เป้าหมาย', { t: 'รายละเอียด', wrap: 1 }], list.map(function (r) {
          var a = String(r.action), tone = /DELETE|RETURN|REOPEN|DISABLE|EXCEPTION/.test(a) ? 't-red' : /PERIOD_CLOSED|EXPORT|ADD/.test(a) ? 't-ok' : /LOGIN/.test(a) ? 't-open' : 't-info';
          return [h(thaiDT(r.at)), '<b>' + h(r.empCode) + '</b>', '<span class="tag ' + tone + '">' + h(ACT_TH[a] || a) + '</span>', h(r.target), '<span class="small-muted">' + h(String(r.detail).slice(0, 160)) + '</span>'];
        }), { maxh: '70vh', empty: 'ยังไม่มีประวัติ', emptyIcon: 'bi-clock-history' });
    }).catch(errToast);
  };
  var t = null;
  $('auQ').addEventListener('input', function () { clearTimeout(t); t = setTimeout(load, 400); });
  load();
};
