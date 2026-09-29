/**
 * pages-users.js — ผู้ใช้และสิทธิ์ (v2) · ออกแบบใหม่ให้เพิ่มผู้ใช้ได้ง่าย ไม่ต้องคัดลอกวางจาก Excel
 *  เพิ่มทีละคน: ค้นหาชื่อ/รหัส (ไม่พบ → ค้นจาก SmartAPI) → คลิกเลือกบทบาท/ฝ่าย/หน่วยงาน → บันทึก
 *  เพิ่มหลายคน: วางรหัสพนักงาน → เลือกบทบาทชุดเดียว → ระบบรายงานผลรายคน
 */
var ROLE_INFO = {
  STAFF: { i: 'bi-person', d: 'ลงเวรของตนเอง ดูเวร ค่าตอบแทน และผลสแกนของตนเอง' },
  HEAD: { i: 'bi-person-workspace', d: 'จัดตารางเวร ยืนยันเวร ตรวจการปฏิบัติงาน และส่งตรวจ ของหน่วยงานที่ได้รับมอบหมาย' },
  CHIEF: { i: 'bi-person-check', d: 'ดูแลทุกหน่วยงานในฝ่าย: ตรวจผ่าน/ส่งกลับ ออกเอกสาร และจัดการผู้ใช้ในฝ่าย' },
  ADMIN: { i: 'bi-shield-lock', d: 'ผู้ดูแลระบบ/HR: ตั้งค่าทั้งหมด ปิดรอบ ออกไฟล์ HRMi และจัดการผู้ใช้ทุกคน' }
};
var USERS = [], U_FILTER = { q: '', role: '', dept: '', st: '' };

PAGES.users = function () {
  api('listUsers', {}, { fresh: true }).then(function (list) {
    USERS = list;
    var cnt = function (r) { return list.filter(function (u) { return u.roles.indexOf(r) >= 0; }).length; };
    var html = pageHead('bi-people', 'ผู้ใช้และสิทธิ์', GUIDE.users.lead,
      '<button class="btn btn-ghost" onclick="openBulkUsers()"><i class="bi bi-people"></i> เพิ่มหลายคน</button><button class="btn btn-brand" onclick="openAddUser()"><i class="bi bi-person-plus"></i> เพิ่มผู้ใช้</button>');
    html += '<div class="stats">' + statCard('bi-people', list.length, 'บัญชีทั้งหมด' + (S.me.isAdmin ? '' : ' (ในฝ่ายของท่าน)')) +
      statCard('bi-person-workspace', cnt('HEAD'), 'หัวหน้าหน่วย / ผู้บันทึก', 'info') + statCard('bi-person-check', cnt('CHIEF'), 'หัวหน้าฝ่าย', 'acc') +
      statCard('bi-key', list.filter(function (u) { return u.mustChange; }).length, 'ยังไม่ได้ตั้งรหัสผ่านใหม่', 'warn') + '</div>';
    html += '<div class="card-x"><div class="d-flex gap-2 flex-wrap align-items-center mb-3">' +
      '<div class="input-group" style="max-width:300px"><span class="input-group-text"><i class="bi bi-search"></i></span><input class="form-control" id="uQ" placeholder="ค้นหาชื่อ รหัส ตำแหน่ง" value="' + h(U_FILTER.q) + '"></div>' +
      '<select class="sel-chip" id="uR"><option value="">ทุกบทบาท</option>' + ['STAFF', 'HEAD', 'CHIEF', 'ADMIN'].map(function (r) { return '<option value="' + r + '"' + (U_FILTER.role === r ? ' selected' : '') + '>' + h(roleName(r)) + '</option>'; }).join('') + '</select>' +
      '<select class="sel-chip" id="uD">' + deptOptions(U_FILTER.dept, 'ทุกฝ่าย') + '<option value="-"' + (U_FILTER.dept === '-' ? ' selected' : '') + '>ยังไม่ระบุฝ่าย</option></select>' +
      '<select class="sel-chip" id="uS"><option value="">ทุกสถานะ</option><option value="on"' + (U_FILTER.st === 'on' ? ' selected' : '') + '>ใช้งาน</option><option value="off"' + (U_FILTER.st === 'off' ? ' selected' : '') + '>ปิดบัญชี</option><option value="new"' + (U_FILTER.st === 'new' ? ' selected' : '') + '>ยังไม่ตั้งรหัสใหม่</option></select>' +
      '<span class="small-muted ms-auto" id="uCount"></span></div><div id="uBody"></div></div>';
    $('view').innerHTML = html;
    countUp($('view'));
    var t = null;
    $('uQ').addEventListener('input', function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { U_FILTER.q = v; renderUsers(); }, 200); });
    $('uR').addEventListener('change', function () { U_FILTER.role = this.value; renderUsers(); });
    $('uD').addEventListener('change', function () { U_FILTER.dept = this.value; renderUsers(); });
    $('uS').addEventListener('change', function () { U_FILTER.st = this.value; renderUsers(); });
    renderUsers();
  }).catch(errToast);
};
function renderUsers() {
  var f = U_FILTER, q = f.q.toLowerCase();
  var rows = USERS.filter(function (u) {
    if (q && (u.name + ' ' + u.empCode + ' ' + (u.hrPosition || '') + ' ' + (u.wardName || '')).toLowerCase().indexOf(q) < 0) return false;
    if (f.role && u.roles.indexOf(f.role) < 0) return false;
    if (f.dept === '-' && u.depts.length) return false;
    if (f.dept && f.dept !== '-' && u.depts.indexOf(f.dept) < 0 && u.depts.indexOf('*') < 0) return false;
    if (f.st === 'on' && !u.active) return false;
    if (f.st === 'off' && u.active) return false;
    if (f.st === 'new' && !u.mustChange) return false;
    return true;
  });
  $('uCount').textContent = 'แสดง ' + rows.length + ' จาก ' + USERS.length + ' บัญชี';
  $('uBody').innerHTML = tableBox(['บุคลากร', 'บทบาท', 'ฝ่าย', 'หน่วยงานที่ดูแล', 'สถานะ', 'เข้าใช้ล่าสุด', ''], rows.slice(0, 400).map(function (u) {
    var k = reg('u' + u.empCode, u);
    return [personCell(u.name, h(u.empCode) + (u.hrPosition ? ' · ' + h(u.hrPosition) : '') + (u.wardName ? ' · ' + h(u.wardName) : '')),
      '<div class="flagbox" style="max-width:230px">' + u.roles.filter(function (r) { return r !== 'STAFF' || u.roles.length === 1; }).map(function (r) { return '<span class="tag role-' + r + '"><i class="bi ' + ROLE_INFO[r].i + '"></i>' + h(roleName(r).split(' / ')[0]) + '</span>'; }).join('') + '</div>',
      u.depts.length ? '<div class="stack">' + u.depts.map(function (d) { return d === '*' ? '<span class="dchip">ทุกฝ่าย</span>' : deptChip(d); }).join('') + '</div>' : '<span class="tag t-orange">ยังไม่ระบุ</span>',
      u.units.length ? '<div class="flagbox" style="max-width:200px">' + u.units.map(function (x) { return '<span class="tag t-info">' + h(unitName(x)) + '</span>'; }).join(' ') + '</div>' : '<span class="small-muted">—</span>',
      '<div class="stack">' + (u.active ? '<span class="tag t-ok"><i class="bi bi-check-circle"></i>ใช้งาน</span>' : '<span class="tag t-arc"><i class="bi bi-slash-circle"></i>ปิดบัญชี</span>') +
        (u.mustChange ? '<span class="tag t-orange" title="ยังไม่ได้เข้าใช้/ตั้งรหัสผ่านใหม่"><i class="bi bi-key"></i>รหัสเริ่มต้น</span>' : '') + '</div>',
      '<span class="small-muted">' + h(u.lastLogin ? thaiDT(u.lastLogin) : 'ยังไม่เคยเข้า') + '</span>',
      u.canEdit ? '<div class="d-flex gap-1 justify-content-end"><button class="btn btn-sm btn-soft" onclick="openEditUser(REG[\'' + k + '\'])"><i class="bi bi-pencil"></i> แก้ไข</button>' +
        '<div class="dropdown"><button class="btn btn-sm btn-ghost btn-icon" data-bs-toggle="dropdown" aria-label="เพิ่มเติม"><i class="bi bi-three-dots"></i></button><ul class="dropdown-menu dropdown-menu-end">' +
        '<li><a class="dropdown-item" href="#" onclick="resetPw(\'' + u.empCode + '\');return false"><i class="bi bi-key me-2"></i>รีเซ็ตรหัสผ่าน</a></li>' +
        '<li><a class="dropdown-item" href="#" onclick="toggleUser(\'' + u.empCode + '\',' + (u.active ? 'false' : 'true') + ');return false"><i class="bi ' + (u.active ? 'bi-slash-circle' : 'bi-check-circle') + ' me-2"></i>' + (u.active ? 'ปิดบัญชี' : 'เปิดบัญชี') + '</a></li>' +
        (S.me.isAdmin ? '<li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-danger" href="#" onclick="delUser(\'' + u.empCode + '\');return false"><i class="bi bi-trash me-2"></i>ลบบัญชี</a></li>' : '') +
        '</ul></div></div>' : '<span class="small-muted" title="แก้ได้โดยผู้ดูแลระบบ"><i class="bi bi-lock"></i></span>'];
  }), { maxh: '64vh', empty: 'ไม่พบบัญชีตามเงื่อนไข', emptyIcon: 'bi-person-x', emptyText: 'ลองล้างตัวกรอง หรือกด “เพิ่มผู้ใช้”' });
}

/** ส่วนเลือกสิทธิ์ (ใช้ทั้งเพิ่ม/แก้ไข/เพิ่มหลายคน) */
function grantForm(g, bulk) {
  var admin = S.me.isAdmin, cd = S.me.chiefDepts;
  var roles = ['STAFF', 'HEAD', 'CHIEF', 'ADMIN'].filter(function (r) { return admin || r === 'STAFF' || r === 'HEAD'; });
  var depts = (S.boot.depts || []).filter(function (d) { return cd === null || (cd || []).indexOf(d.deptId) >= 0; });
  var units = (S.boot.units || []).filter(function (u) { return cd === null || (cd || []).indexOf(u.deptId) >= 0; });
  return '<div class="form-label mt-1">บทบาท <span class="small-muted">(คลิกเลือกได้หลายบทบาท — ทุกคนเป็น “บุคลากร” อยู่แล้ว)</span></div>' +
    '<div class="role-card" data-chips="roles">' + roles.map(function (r) {
      var on = (g.roles || []).indexOf(r) >= 0 || r === 'STAFF';
      return '<label class="chip' + (on ? ' on' : '') + (r === 'STAFF' ? ' dis' : '') + '"><input type="checkbox" value="' + r + '"' + (on ? ' checked' : '') + (r === 'STAFF' ? ' disabled' : '') + '><i class="bi bi-check-lg ck"></i>' +
        '<b><i class="bi ' + ROLE_INFO[r].i + '"></i>' + h(roleName(r)) + '</b><small>' + ROLE_INFO[r].d + '</small></label>';
    }).join('') + '</div>' +
    '<div class="form-label mt-3">ฝ่าย <span class="small-muted" id="gDeptHint">— บุคลากร: ฝ่ายที่สังกัด (ลงเวรเองได้เฉพาะหน่วยงานในฝ่ายนี้) · หัวหน้าฝ่าย: ฝ่ายที่ดูแล</span></div>' +
    chipGroup('depts', depts.map(function (d) { return { v: d.deptId, t: d.name, color: d.color }; }).concat(admin ? [{ v: '*', t: 'ทุกฝ่าย' }] : []), g.depts || []) +
    (bulk ? '<div class="form-text">ไม่เลือก = ระบบจัดเข้าฝ่ายให้อัตโนมัติจากตำแหน่ง/หน่วยงานของ HR</div>' : '') +
    '<div id="gUnitsWrap" class="mt-3"' + ((g.roles || []).indexOf('HEAD') >= 0 ? '' : ' hidden') + '><div class="form-label">หน่วยงานที่ดูแล (สำหรับหัวหน้าหน่วย / ผู้บันทึก) *</div>' +
    (S.boot.depts || []).map(function (d) {
      var us = units.filter(function (u) { return u.deptId === d.deptId; });
      if (!us.length) return '';
      return '<div class="small-muted mt-2 mb-1">' + deptChip(d.deptId) + '</div>' + chipGroup('units', us.map(function (u) { return { v: u.unitId, t: u.name }; }), g.units || []);
    }).join('') + '</div>';
}
function wireGrant(root) {
  wireChips(root, function (name) {
    if (name === 'roles') root.querySelector('#gUnitsWrap').hidden = chipValues(root, 'roles').indexOf('HEAD') < 0;
  });
}
function readGrant(root) {
  var units = []; $$('[data-chips="units"] input:checked', root).forEach(function (x) { units.push(x.value); });
  var roles = ['STAFF'].concat(chipValues(root, 'roles').filter(function (r) { return r !== 'STAFF'; }));
  return { roles: roles, depts: chipValues(root, 'depts'), units: roles.indexOf('HEAD') >= 0 ? units : [] };
}
function checkGrantJs(g) {
  if (g.roles.indexOf('HEAD') >= 0 && !g.units.length) return 'หัวหน้าหน่วย / ผู้บันทึก ต้องเลือกหน่วยงานที่ดูแลอย่างน้อย 1 หน่วย';
  if (g.roles.indexOf('CHIEF') >= 0 && !g.depts.length) return 'หัวหน้าฝ่ายต้องเลือกฝ่ายที่ดูแล (หรือ “ทุกฝ่าย”)';
  return '';
}

/* ---------------------------------------------------------------- เพิ่มผู้ใช้ทีละคน */
function openAddUser() {
  var picked = null;
  modal({
    title: 'เพิ่มผู้ใช้', icon: 'bi-person-plus', size: 'lg', sub: 'ขั้นที่ 1 ค้นหาบุคลากร → ขั้นที่ 2 เลือกบทบาทและหน่วยงาน',
    body: '<div id="auStep1"><div class="input-group input-group-lg mb-2"><span class="input-group-text"><i class="bi bi-search"></i></span>' +
      '<input class="form-control" id="auQ" placeholder="พิมพ์รหัสพนักงาน หรือ ชื่อ-สกุล" autocomplete="off"><button class="btn btn-brand" id="auGo">ค้นหา</button></div>' +
      '<div class="form-text mb-3"><i class="bi bi-lightbulb"></i> พิมพ์รหัสพนักงานเต็มแล้วกด Enter — ถ้ายังไม่มีในทะเบียน ระบบจะค้นจาก SmartAPI ของ HR ให้อัตโนมัติ</div>' +
      '<div id="auList" class="emp-list"></div>' +
      '<div class="text-center mt-3"><a href="#" id="auManual" class="small"><i class="bi bi-pencil-square"></i> ไม่พบ? เพิ่มด้วยการกรอกข้อมูลเอง</a></div></div>' +
      '<div id="auStep2" hidden></div>',
    okText: 'บันทึกผู้ใช้', okIcon: 'bi-save', noEnter: true,
    onOpen: function (root) {
      $('mdlOk').disabled = true;
      var q = root.querySelector('#auQ'), box = root.querySelector('#auList'), t = null;
      var search = function (remote) {
        var v = q.value.trim(); if (!v) { box.innerHTML = ''; return; }
        box.innerHTML = '<div class="skeleton" style="height:60px"></div><div class="skeleton" style="height:60px"></div>' + (remote ? '<div class="small-muted text-center"><span class="spinner-border spinner-border-sm"></span> กำลังค้นหาใน SmartAPI…</div>' : '');
        api('lookupEmployee', { q: v, remote: remote }).then(function (r) {
          if (!r.list.length) {
            box.innerHTML = emptyBox('bi-person-x', 'ไม่พบ “' + v + '”', /^\d{4,10}$/.test(v) ? (r.remoteError ? 'SmartAPI: ' + h(r.remoteError) : 'ไม่พบทั้งในทะเบียนและ SmartAPI') + ' — กด “เพิ่มด้วยการกรอกข้อมูลเอง” ด้านล่างได้' : 'ลองพิมพ์รหัสพนักงานเต็ม 7 หลัก เพื่อค้นจาก SmartAPI');
            return;
          }
          box.innerHTML = (r.remote ? noteBox('acc', 'bi-cloud-check', 'พบจาก <b>SmartAPI</b> ของ HR — ระบบจะเพิ่มเข้าทะเบียนให้เมื่อบันทึก', 'mb-1') : '') + r.list.map(function (e, i) {
            return '<div class="emp-item" style="--d:' + i + '" data-i="' + i + '"><div class="avatar">' + h(initials(e.fullName)) + '</div><div class="ei"><b>' + h(e.fullName) + '</b>' +
              '<small>' + h(e.empCode) + ' · ' + h(e.hrPosition || posName(e.posId)) + (e.wardName ? ' · ' + h(e.wardName) : '') + '</small>' +
              '<div class="d-flex gap-1 flex-wrap mt-1">' + (e.guessDept ? deptChip(e.guessDept) : '') + (e.user.exists ? e.user.roles.map(function (x) { return '<span class="tag role-' + x + '">' + h(roleName(x)) + '</span>'; }).join('') : '<span class="tag t-open">ยังไม่มีบัญชี</span>') + '</div></div>' +
              '<span class="btn btn-sm ' + (e.user.exists ? 'btn-soft' : 'btn-brand') + '">' + (e.user.exists ? '<i class="bi bi-pencil"></i> แก้สิทธิ์' : '<i class="bi bi-plus-lg"></i> เลือก') + '</span></div>';
          }).join('');
          $$('.emp-item', box).forEach(function (el) { el.addEventListener('click', function () { choose(r.list[+el.dataset.i]); }); });
        }).catch(function (e) { box.innerHTML = noteBox('bad', 'bi-x-octagon', h(e.message)); });
      };
      var choose = function (e) {
        picked = e;
        var g = e.user.exists ? { roles: e.user.roles, depts: e.user.depts, units: e.user.units } : { roles: ['STAFF'], depts: e.guessDept ? [e.guessDept] : [], units: [] };
        root.querySelector('#auStep1').hidden = true;
        var s2 = root.querySelector('#auStep2'); s2.hidden = false;
        s2.innerHTML = '<div class="sel-emp mb-3"><div class="avatar lg">' + h(initials(e.fullName)) + '</div><div class="flex-grow-1"><b style="font-size:1.08rem">' + h(e.fullName) + '</b>' +
          '<div class="small-muted">' + h(e.empCode) + ' · ' + h(e.hrPosition || posName(e.posId)) + (e.wardName ? ' · สังกัด ' + h(e.wardName) : '') + '</div>' +
          '<div class="small-muted">' + (e.user.exists ? '<i class="bi bi-info-circle"></i> มีบัญชีอยู่แล้ว — กำลังแก้ไขสิทธิ์' : '<i class="bi bi-stars"></i> บัญชีใหม่ · รหัสผ่านเริ่มต้น = รหัสพนักงาน') + (e.source === 'SmartAPI' ? ' · ข้อมูลจาก SmartAPI' : '') + '</div></div>' +
          '<button class="btn btn-sm btn-ghost" id="auBack"><i class="bi bi-arrow-left"></i> เปลี่ยนคน</button></div>' +
          '<div class="mb-3"><label class="form-label">ตำแหน่งสำหรับคิดค่าตอบแทน</label><select class="form-select" id="auPos">' + (S.boot.positions || []).map(function (p) { return '<option value="' + p.posId + '"' + (p.posId === e.posId ? ' selected' : '') + '>' + h(p.name) + '</option>'; }).join('') + '</select></div>' +
          grantForm(g) + '<label class="form-label mt-3">หมายเหตุ (ถ้ามี)</label><input class="form-control" id="auNote">';
        wireGrant(s2);
        $('mdlOk').disabled = false;
        $('mdlTitle').textContent = e.user.exists ? 'แก้ไขสิทธิ์ผู้ใช้' : 'เพิ่มผู้ใช้';
        s2.querySelector('#auBack').addEventListener('click', function () { picked = null; s2.hidden = true; root.querySelector('#auStep1').hidden = false; $('mdlOk').disabled = true; q.focus(); });
      };
      q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { search(false); }, 350); });
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); search(true); } });
      root.querySelector('#auGo').addEventListener('click', function () { search(true); });
      root.querySelector('#auManual').addEventListener('click', function (ev) {
        ev.preventDefault();
        Swal.fire({
          title: 'เพิ่มบุคลากรด้วยตนเอง', icon: 'info',
          html: '<div style="text-align:left"><label class="form-label">รหัสพนักงาน *</label><input id="mnC" class="form-control mb-2" inputmode="numeric" value="' + h(/^\d+$/.test(q.value.trim()) ? q.value.trim() : '') + '">' +
            '<label class="form-label">ชื่อ-สกุล (มีคำนำหน้า) *</label><input id="mnN" class="form-control mb-2" placeholder="เช่น นางสาว สมใจ ดีมาก">' +
            '<label class="form-label">ตำแหน่ง (ตาม HR)</label><input id="mnP" class="form-control mb-2" placeholder="เช่น พยาบาลวิชาชีพ">' +
            '<label class="form-label">หน่วยต้นสังกัด (ward)</label><input id="mnW" class="form-control" placeholder="เช่น IPD (19A)"></div>',
          showCancelButton: true, confirmButtonText: 'ถัดไป', cancelButtonText: 'ยกเลิก', reverseButtons: true,
          preConfirm: function () {
            var c = $('mnC').value.trim(), n = $('mnN').value.trim();
            if (!/^\d{3,10}$/.test(c)) { Swal.showValidationMessage('รหัสพนักงานต้องเป็นตัวเลข'); return false; }
            if (!n) { Swal.showValidationMessage('กรุณากรอกชื่อ-สกุล'); return false; }
            return { empCode: c, fullName: n, hrPosition: $('mnP').value.trim(), wardName: $('mnW').value.trim() };
          }
        }).then(function (r) {
          if (!r.isConfirmed) return;
          choose({ empCode: r.value.empCode, fullName: r.value.fullName, hrPosition: r.value.hrPosition, wardName: r.value.wardName, posId: '', guessDept: '', source: 'กรอกเอง', manual: true, user: { exists: false } });
        });
      });
      setTimeout(function () { q.focus(); }, 300);
    },
    onOk: function (close, root) {
      if (!picked) return;
      var g = readGrant(root), err = checkGrantJs(g);
      if (err) { alertBox('ตรวจสอบสิทธิ์', err, 'warning'); return; }
      var item = { empCode: picked.empCode, roles: g.roles, depts: g.depts, units: g.units, posId: $('auPos').value, note: $('auNote').value, active: true };
      if (picked.manual) { item.fullName = picked.fullName; item.hrPosition = picked.hrPosition; item.wardName = picked.wardName; }
      close();
      saveUserAct(item, picked.fullName);
    }
  });
}
function saveUserAct(item, name) {
  act({ action: 'saveUser', payload: { item: item }, title: 'กำลังบันทึกผู้ใช้', text: h(name) + ' · ' + h(item.empCode), icon: 'bi-person-check',
    steps: ['ตรวจสิทธิ์ของผู้ทำรายการ', 'ตรวจ/เพิ่มทะเบียนบุคลากร', 'บันทึกบทบาท ฝ่าย และหน่วยงาน'],
    done: function (r) {
      return { title: r.created ? 'เพิ่มผู้ใช้เรียบร้อย' : 'บันทึกสิทธิ์เรียบร้อย', html: h(r.message) + (r.created ? '<div class="note info mt-3" style="text-align:left"><i class="bi bi-send"></i><div>แจ้งผู้ใช้: เข้าระบบด้วย<b>รหัสพนักงาน</b>ทั้งช่องผู้ใช้และรหัสผ่าน แล้วตั้งรหัสใหม่</div></div>' : '<div class="small-muted mt-2">สิทธิ์ใหม่มีผลทันที</div>') };
    } }).then(function () { MEMO = {}; PAGES.users(); }).catch(function () { });
}
function openEditUser(u) {
  modal({
    title: 'แก้ไขสิทธิ์ผู้ใช้', icon: 'bi-person-gear', size: 'lg',
    body: '<div class="sel-emp mb-3"><div class="avatar lg">' + h(initials(u.name)) + '</div><div class="flex-grow-1"><b style="font-size:1.08rem">' + h(u.name) + '</b>' +
      '<div class="small-muted">' + h(u.empCode) + (u.hrPosition ? ' · ' + h(u.hrPosition) : '') + (u.wardName ? ' · สังกัด ' + h(u.wardName) : '') + '</div>' +
      '<div class="small-muted">เข้าใช้ล่าสุด: ' + h(u.lastLogin ? thaiDT(u.lastLogin) : 'ยังไม่เคยเข้า') + (u.phone ? ' · โทร ' + h(u.phone) : '') + '</div></div></div>' +
      grantForm(u) +
      '<div class="row g-3 mt-1"><div class="col-md-8"><label class="form-label">หมายเหตุ</label><input class="form-control" id="euNote" value="' + h(u.note || '') + '"></div>' +
      '<div class="col-md-4 d-flex align-items-end"><div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="euA"' + (u.active ? ' checked' : '') + '><label class="form-check-label" for="euA">เปิดใช้งานบัญชี</label></div></div></div>',
    okText: 'บันทึกสิทธิ์', okIcon: 'bi-save', noEnter: true,
    onOpen: function (root) { wireGrant(root); },
    onOk: function (close, root) {
      var g = readGrant(root), err = checkGrantJs(g);
      if (err) { alertBox('ตรวจสอบสิทธิ์', err, 'warning'); return; }
      close();
      saveUserAct({ empCode: u.empCode, roles: g.roles, depts: g.depts, units: g.units, note: $('euNote').value, active: $('euA').checked }, u.name);
    }
  });
}

/* ---------------------------------------------------------------- เพิ่มหลายคน */
function openBulkUsers() {
  modal({
    title: 'เพิ่มผู้ใช้หลายคนพร้อมกัน', icon: 'bi-people', size: 'lg', sub: 'วางรหัสพนักงาน แล้วเลือกสิทธิ์ชุดเดียวให้ทุกคน',
    body: '<label class="form-label">รหัสพนักงาน <span class="small-muted">(คั่นด้วยเว้นวรรค จุลภาค หรือขึ้นบรรทัดใหม่ — คัดลอกทั้งคอลัมน์จาก Excel มาวางได้เลย)</span></label>' +
      '<textarea class="form-control" id="buC" rows="5" placeholder="5501201&#10;5512388&#10;5533470"></textarea><div class="form-text" id="buN">ยังไม่มีรหัส</div>' +
      grantForm({ roles: ['STAFF'], depts: [], units: [] }, true) +
      noteBox('info', 'bi-info-circle', 'คนที่มีบัญชีอยู่แล้ว: ระบบ <b>เพิ่ม</b>บทบาท/ฝ่าย/หน่วยงานให้ (ไม่ลบของเดิม) · รหัสที่ไม่มีในทะเบียน ระบบค้นจาก SmartAPI ให้อัตโนมัติ', 'mt-3'),
    okText: 'เพิ่มผู้ใช้ทั้งหมด', okIcon: 'bi-people', noEnter: true,
    onOpen: function (root) {
      wireGrant(root);
      root.querySelector('#buC').addEventListener('input', function () {
        var n = (this.value.match(/\d{4,10}/g) || []).filter(function (v, i, a) { return a.indexOf(v) === i; }).length;
        root.querySelector('#buN').innerHTML = n ? 'พบรหัส <b>' + n + '</b> รายการ' : 'ยังไม่มีรหัส';
      });
    },
    onOk: function (close, root) {
      var codes = (root.querySelector('#buC').value.match(/\d{4,10}/g) || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
      if (!codes.length) { alertBox('ยังไม่มีรหัสพนักงาน', 'วางรหัสพนักงานอย่างน้อย 1 รายการ', 'info'); return; }
      var g = readGrant(root), err = checkGrantJs(g);
      if (err) { alertBox('ตรวจสอบสิทธิ์', err, 'warning'); return; }
      close();
      act({ action: 'saveUsersBulk', payload: { codes: codes, roles: g.roles, depts: g.depts, units: g.units }, title: 'กำลังเพิ่มผู้ใช้ ' + codes.length + ' คน', icon: 'bi-people',
        steps: ['ตรวจรหัสพนักงาน', 'ค้นข้อมูลที่ไม่มีในทะเบียนจาก SmartAPI', 'สร้าง/อัปเดตบัญชี', 'สรุปผลรายคน'],
        done: function (r) {
          var c = r.counts, ic = { created: ['ok', 'bi-person-plus'], updated: ['ok', 'bi-person-check'], notfound: ['bad', 'bi-person-x'], skipped: ['warn', 'bi-slash-circle'] };
          return { icon: c.notfound || c.skipped ? 'warning' : 'success', title: 'เพิ่มใหม่ ' + c.created + ' · อัปเดต ' + c.updated + (c.notfound ? ' · ไม่พบ ' + c.notfound : '') + (c.skipped ? ' · ข้าม ' + c.skipped : ''),
            html: '<div class="res-list">' + r.results.map(function (x) { var k = ic[x.status]; return '<div class="' + k[0] + '"><i class="bi ' + k[1] + '"></i><span><b>' + h(x.empCode) + '</b> ' + h(x.name || '') + ' — ' + h(x.message) + '</span></div>'; }).join('') + '</div>' };
        } }).then(function () { MEMO = {}; PAGES.users(); }).catch(function () { });
    }
  });
}

/* ---------------------------------------------------------------- ปิด/เปิด · รีเซ็ต · ลบ */
function toggleUser(code, on) {
  var u = USERS.filter(function (x) { return x.empCode === code; })[0] || { name: code };
  confirmX({ title: (on ? 'เปิด' : 'ปิด') + 'บัญชี ' + u.name + '?', html: on ? 'ผู้ใช้จะเข้าระบบได้อีกครั้ง' : 'ผู้ใช้จะถูกออกจากระบบทันทีและเข้าใช้ไม่ได้ · ประวัติเวรยังอยู่ครบ', ok: on ? 'เปิดบัญชี' : 'ปิดบัญชี', danger: !on })
    .then(function (y) {
      if (!y) return;
      act({ action: 'setUserActive', payload: { empCode: code, active: on }, title: 'กำลัง' + (on ? 'เปิด' : 'ปิด') + 'บัญชี', icon: on ? 'bi-check-circle' : 'bi-slash-circle', done: (on ? 'เปิด' : 'ปิด') + 'บัญชีเรียบร้อย', quiet: true })
        .then(function () { MEMO = {}; PAGES.users(); }).catch(function () { });
    });
}
function resetPw(code) {
  var u = USERS.filter(function (x) { return x.empCode === code; })[0] || { name: code };
  askPassword('รีเซ็ตรหัสผ่าน', 'ตั้งรหัสผ่านของ <b>' + h(u.name) + '</b> กลับเป็นรหัสพนักงาน (' + h(code) + ') และบังคับให้ตั้งใหม่เมื่อเข้าครั้งถัดไป', { ok: 'รีเซ็ตรหัสผ่าน' }).then(function (v) {
    if (!v) return;
    act({ action: 'resetPassword', payload: { empCode: code, password: v.password }, title: 'กำลังรีเซ็ตรหัสผ่าน', icon: 'bi-key', done: function (r) { return { title: 'รีเซ็ตรหัสผ่านเรียบร้อย', html: h(r.message) }; } })
      .then(function () { MEMO = {}; PAGES.users(); }).catch(function () { });
  });
}
function delUser(code) {
  var u = USERS.filter(function (x) { return x.empCode === code; })[0] || { name: code };
  askPassword('ลบบัญชี ' + u.name, noteBox('bad', 'bi-trash', 'ลบเฉพาะบัญชีเข้าระบบ — ทะเบียนบุคลากรและประวัติเวรยังอยู่ครบ · ถ้าแค่ไม่ให้เข้าใช้ชั่วคราว แนะนำ “ปิดบัญชี” แทน'), { ok: 'ลบบัญชี' }).then(function (v) {
    if (!v) return;
    act({ action: 'deleteUser', payload: { empCode: code, password: v.password }, title: 'กำลังลบบัญชี', icon: 'bi-trash', done: 'ลบบัญชีเรียบร้อย' })
      .then(function () { MEMO = {}; PAGES.users(); }).catch(function () { });
  });
}
