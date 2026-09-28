/**
 * pages-admin.js — ตั้งค่าและข้อมูลหลัก · ผู้ใช้และสิทธิ์ · นำเข้าข้อมูล/คลัง · ประวัติการใช้งาน
 */

/* ================================================================ ตั้งค่าและข้อมูลหลัก */
PAGES.setup = function () {
  api('getAdminData', { ym: S.ym || thisYmJs() }, { fresh: true }).then(function (d) {
    window.ADM = d;
    var tabs = [
      ['units', 'หน่วยงาน'], ['wards', 'หน่วยปลายทาง (ward)'], ['positions', 'ตำแหน่ง'],
      ['rates', 'อัตรา / รหัสรายได้'], ['quotas', 'กรอบเวร'], ['cal', 'ปฏิทิน'], ['win', 'ช่วงลงตารางเวร'], ['opt', 'ค่าตั้งค่าระบบ']
    ];
    $('page').innerHTML = helpBox('setup') +
      '<div class="pillbar" style="margin-bottom:.7rem">' +
      tabs.map(function (t, i) { return '<button data-t="' + t[0] + '"' + (i === 0 ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('') +
      '</div><div id="admBody"></div>';
    Array.prototype.forEach.call($('page').querySelectorAll('.pillbar button'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call($('page').querySelectorAll('.pillbar button'), function (x) { x.classList.remove('on'); });
        b.classList.add('on'); admTab(b.dataset.t);
      });
    });
    admTab('units');
  }).catch(errToast);
};

function admTab(t) {
  var d = window.ADM, box = $('admBody');
  if (t === 'units') {
    box.innerHTML = '<div class="card"><div class="row"><h3>หน่วยงานที่เปิด Part Time</h3>' +
      '<button class="btn btn-sm btn-pri right" onclick="editUnit()">+ เพิ่มหน่วยงาน</button></div>' +
      tableBox(['รหัส', 'ชื่อหน่วยงาน', 'ต้องระบุ ward', 'ช่วงเวรที่ลงได้', 'สถานะ', ''],
        d.units.map(function (u) {
          return [h(u.unitId), '<b>' + h(u.name) + '</b>', u.needWard === 'TRUE' ? '<span class="tag t-orange">ต้องระบุ</span>' : '—',
            h(u.slots), u.active === 'FALSE' ? '<span class="tag t-arc">ปิด</span>' : '<span class="tag t-ok">เปิด</span>',
            '<button class="btn btn-sm" onclick=\'editUnit(' + JSON.stringify(u) + ')\'>แก้ไข</button>'];
        })) + '</div>';
  } else if (t === 'wards') {
    box.innerHTML = '<div class="card"><div class="row"><h3>หน่วยปลายทาง (ward / คลินิก)</h3>' +
      '<span class="sub">' + d.wards.length + ' หน่วย</span>' +
      '<button class="btn btn-sm right" onclick="doMergeWards()"><i class="bi bi-union"></i> รวมหน่วยที่ซ้ำ</button>' +
      '<button class="btn btn-sm btn-pri" onclick="editWard()">+ เพิ่ม</button></div>' +
      '<p class="sub">ชื่อจาก SmartAPI อาจสะกดต่างกัน เช่น IPD (19B) กับ IPD 19B — ใช้ปุ่ม “รวมหน่วยที่ซ้ำ” เพื่อยุบให้เหลือหน่วยเดียว</p>' +
      tableBox(['รหัส', 'ชื่อเต็ม', 'ตัวย่อที่แสดงในตาราง', 'ชื่ออื่นที่รวมไว้', 'สถานะ', ''],
        d.wards.map(function (w) {
          return [h(w.wardId), '<b>' + h(w.name) + '</b>', '<span class="tag t-clo">' + h(w.short) + '</span>',
            h(w.aliases || '—'), w.active === 'FALSE' ? '<span class="tag t-arc">ปิด</span>' : '<span class="tag t-ok">เปิด</span>',
            '<button class="btn btn-sm" onclick=\'editWard(' + JSON.stringify(w) + ')\'>แก้ไข</button>'];
        }), { maxh: '62vh' }) + '</div>';
  } else if (t === 'positions') {
    box.innerHTML = '<div class="card"><div class="row"><h3>ตำแหน่งและวิธีคิดค่าตอบแทน</h3>' +
      '<button class="btn btn-sm btn-pri right" onclick="editPos()">+ เพิ่มตำแหน่ง</button></div>' +
      '<p class="sub">ตำแหน่งที่คิดเป็น “ชั่วโมง” จะคำนวณจากชั่วโมงจริงของช่วงเวรที่ลง (ใช้กับเภสัชกร Part Time)</p>' +
      tableBox(['รหัส', 'ชื่อตำแหน่ง', 'คิดเป็น', 'คำที่ใช้จับคู่กับตำแหน่ง HR', 'สถานะ', ''],
        d.positions.map(function (p) {
          return [h(p.posId), '<b>' + h(p.name) + '</b>', p.payUnit === 'HOUR' ? '<span class="tag t-orange">ชั่วโมง</span>' : '<span class="tag t-clo">เวร</span>',
            h(p.match || '—'), p.active === 'FALSE' ? '<span class="tag t-arc">ปิด</span>' : '<span class="tag t-ok">เปิด</span>',
            '<button class="btn btn-sm" onclick=\'editPos(' + JSON.stringify(p) + ')\'>แก้ไข</button>'];
        })) + '</div>';
  } else if (t === 'rates') {
    box.innerHTML = '<div class="card"><div class="row"><h3>อัตราค่าตอบแทนและรหัสรายได้ HRMi</h3>' +
      '<button class="btn btn-sm btn-pri right" onclick="editRate()">+ เพิ่มอัตรา</button></div>' +
      (d.settings.rateNote ? '<div class="note">' + h(d.settings.rateNote) + '</div>' : '') +
      '<p class="sub">ระบบเลือกอัตราที่ “วันที่มีผล” ใกล้ที่สุดแต่ไม่เกินวันที่ของเวร — ขึ้นอัตราใหม่ให้เพิ่มแถวใหม่พร้อมวันที่มีผล ไม่ต้องลบของเดิม</p>' +
      tableBox(['หน่วยงาน', 'ตำแหน่ง', 'ช่วงเวร', 'รหัสรายได้', 'ชื่อรหัส', { t: 'อัตรา', n: 1 }, 'มีผลตั้งแต่', ''],
        d.rates.map(function (r) {
          return [h(unitName(r.unitId)), h(r.posId), '<b>' + h(r.slot) + '</b>', '<span class="tag t-clo">' + h(r.incomeCode) + '</span>',
            h(r.incomeName || '—'), num(r.amount), h(r.effectiveFrom),
            '<button class="btn btn-sm" onclick=\'editRate(' + JSON.stringify(r) + ')\'>แก้ไข</button>'];
        }), { maxh: '60vh' }) + '</div>';
  } else if (t === 'quotas') {
    box.innerHTML = '<div class="card"><div class="row"><h3>กรอบเวร (3 ชั้น)</h3>' +
      '<button class="btn btn-sm btn-pri right" onclick="editQuota()">+ เพิ่มกรอบ</button></div>' +
      '<p class="sub"><b>ทั้งฝ่าย</b> = เพดานรวมทุกหน่วยงานต่อวัน · <b>รายหน่วยงาน</b> = ของหน่วยนั้น · <b>ราย ward</b> = จำกัดหน่วยปลายทาง (เว้นว่าง = ไม่จำกัด) · เกินกรอบ = แดง ส่งตรวจไม่ได้</p>' +
      tableBox(['ระดับ', 'ของ', 'ช่วงเวร', 'ประเภทวัน', { t: 'ไม่เกิน', n: 1 }, 'มีผลตั้งแต่', ''],
        d.quotas.map(function (q) {
          var scope = { DEPT: 'ทั้งฝ่าย', UNIT: 'รายหน่วยงาน', WARD: 'ราย ward' }[q.scope] || q.scope;
          var ref = q.scope === 'UNIT' ? unitName(q.refId) : q.scope === 'WARD' ? wardName(q.refId) : 'ทุกหน่วย';
          return [h(scope), h(ref), '<b>' + h(q.slot) + '</b>',
            h({ ALL: 'ทุกวัน', WORKDAY: 'วันทำการ', HOLIDAY: 'วันหยุด' }[q.dayType] || q.dayType),
            num(q.lim), h(q.effectiveFrom),
            '<button class="btn btn-sm" onclick=\'editQuota(' + JSON.stringify(q) + ')\'>แก้ไข</button>'];
        }), { maxh: '60vh' }) + '</div>';
  } else if (t === 'cal') {
    box.innerHTML = '<div class="card"><div class="row"><h3>ปฏิทินวันหยุด</h3>' +
      '<button class="btn btn-sm btn-pri right" onclick="editCal()">+ เพิ่มวัน</button></div>' +
      '<p class="sub">วันหยุดไม่มีผลกับค่าตอบแทน ใช้แสดงสีในตารางและใช้กับกรอบเวรที่แยกวันทำการ/วันหยุด</p>' +
      tableBox(['วันที่', 'ประเภท', 'ชื่อวัน', ''],
        d.calendar.map(function (c) {
          return [h(c.date), h({ PUBHOL: 'นักขัตฤกษ์', COMP: 'ชดเชย', CLOSED: 'ปิดหน่วยงาน', WORKDAY: 'วันทำการ' }[c.dayType] || c.dayType),
            h(c.name), '<button class="btn btn-sm" onclick=\'editCal(' + JSON.stringify(c) + ')\'>แก้ไข</button>'];
        }), { maxh: '58vh' }) + '</div>';
  } else if (t === 'win') {
    box.innerHTML = '<div class="card"><div class="row"><h3>ช่วงเปิดให้บุคลากรลงบันทึกตารางเวร</h3>' +
      '<button class="btn btn-sm btn-pri right" onclick="editWin()">+ กำหนดช่วง</button></div>' +
      '<p class="sub">ถ้าไม่กำหนดรายเดือน ระบบใช้ค่าเริ่มต้น: วันที่ ' + h(d.settings.bookOpenDay) + ' ถึง ' + h(d.settings.bookCloseDay) + ' ของเดือนก่อนหน้า</p>' +
      tableBox(['เดือน', 'หน่วยงาน', 'เปิด', 'ปิด', 'หมายเหตุ', ''],
        d.windows.map(function (w) {
          return [h(thaiYmJs(w.ym)), h(w.unitId ? unitName(w.unitId) : 'ทุกหน่วยงาน'), h(w.openFrom), h(w.openTo), h(w.note || '—'),
            '<button class="btn btn-sm" onclick=\'editWin(' + JSON.stringify(w) + ')\'>แก้ไข</button>'];
        })) + '</div>';
  } else if (t === 'opt') {
    var st = d.settings;
    var f = function (key, label, hint, type) {
      var v = st[key];
      if (type === 'bool') {
        return '<label class="chk" style="display:flex;margin-bottom:.55rem"><input type="checkbox" data-k="' + key + '"' + (v ? ' checked' : '') + '>' +
          '<span>' + label + (hint ? ' <span class="sub">' + hint + '</span>' : '') + '</span></label>';
      }
      return '<div class="field"><label class="fl">' + label + (hint ? ' · <span class="sub">' + hint + '</span>' : '') + '</label>' +
        '<input data-k="' + key + '" value="' + h(v) + '"></div>';
    };
    box.innerHTML = '<div class="grid g2">' +
      '<div class="card"><h3>กติกาการทำงาน</h3>' +
      f('deadlineDay', 'เส้นตายวันที่', 'ของเดือนถัดไป') +
      f('multiShiftWarnAt', 'เตือนเมื่อลงกี่ช่วงเวรในวันเดียว', '0 = ไม่เตือน') +
      f('wardRuleEnabled', 'ห้ามลงเวรที่หน่วยต้นสังกัดของตนเอง', '', 'bool') +
      f('bookSelfEnabled', 'เปิดให้บุคลากรลงบันทึกตารางเวรเอง', '', 'bool') +
      f('staffSeeUnitSchedule', 'บุคลากรเห็นตารางรวมของหน่วย (เห็นเงินเฉพาะของตน)', '', 'bool') +
      f('bookOpenDay', 'ช่วงลงตารางเวรเริ่มวันที่', 'ของเดือนก่อน') +
      f('bookCloseDay', 'ถึงวันที่', 'ของเดือนก่อน') +
      '</div>' +
      '<div class="card"><h3>การตรวจสแกนนิ้ว</h3>' +
      '<div class="field"><label class="fl">โหมด</label><select data-k="scanMode">' +
      '<option value="note"' + (st.scanMode === 'note' ? ' selected' : '') + '>ติดข้อสังเกต (ส่งตรวจได้)</option>' +
      '<option value="block"' + (st.scanMode === 'block' ? ' selected' : '') + '>บล็อก (ต้องแก้ก่อนส่งตรวจ)</option></select></div>' +
      f('scanGraceInMin', 'สแกนเข้าช้าได้ (นาที)') +
      f('scanGraceOutMin', 'สแกนออกก่อนเวลาได้ (นาที)') +
      f('scanHoursTolMin', 'ชั่วโมงขาดได้ (นาที)') +
      '</div>' +
      '<div class="card"><h3>ผู้ลงนามในเอกสาร</h3>' +
      f('signer1Name', 'ชื่อผู้ลงนามที่ 1') + f('signer1Pos', 'ตำแหน่งที่ 1') +
      f('signer2Name', 'ชื่อผู้ลงนามที่ 2') + f('signer2Pos', 'ตำแหน่งที่ 2') +
      f('signer3Name', 'ชื่อผู้ลงนามที่ 3') + f('signer3Pos', 'ตำแหน่งที่ 3') +
      '</div>' +
      '<div class="card"><h3>อื่น ๆ</h3>' +
      f('rateNote', 'ข้อความเตือนบนหน้าอัตรา') +
      f('notifyEmail', 'อีเมลรับการแจ้งเตือนเส้นตาย') +
      f('reportPrefix', 'คำนำหน้าเลขที่รายงาน') +
      '<div class="row" style="margin-top:.6rem"><a class="btn btn-sm" href="' + d.dbUrl + '" target="_blank" rel="noopener"><i class="bi bi-table"></i> เปิด Google Sheet ฐานข้อมูล</a></div>' +
      '<div class="sub" style="margin-top:.5rem">บุคลากร ' + d.counts.employees + ' · บัญชี ' + d.counts.users + ' · เวร ' + d.counts.duties + ' · สแกน ' + d.counts.scans + ' แถว</div>' +
      '</div></div>' +
      '<div class="row" style="margin-top:.8rem"><button class="btn btn-pri" id="optSave"><i class="bi bi-save"></i> บันทึกค่าตั้งค่า</button></div>';
    $('optSave').addEventListener('click', function () {
      var items = {};
      Array.prototype.forEach.call(box.querySelectorAll('[data-k]'), function (el) {
        items[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
      });
      api('saveSettings', { items: items }).then(function () { toast('บันทึกค่าตั้งค่าแล้ว', 'ok'); MEMO = {}; }).catch(errToast);
    });
  }
}

/* ---- กล่องแก้ไขข้อมูลหลัก ---- */
function editUnit(u) {
  u = u || { unitId: '', name: '', needWard: 'FALSE', slots: 'ช,บ,ด', active: 'TRUE', ord: '' };
  modal({
    title: u.unitId ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงาน',
    body: '<div class="field"><label class="fl">ชื่อหน่วยงาน</label><input id="uN" value="' + h(u.name) + '"></div>' +
      '<div class="field"><label class="fl">ช่วงเวรที่ลงได้ (คั่นด้วย , )</label><input id="uS" value="' + h(u.slots) + '"></div>' +
      '<label class="chk"><input type="checkbox" id="uW"' + (u.needWard === 'TRUE' ? ' checked' : '') + '> ต้องระบุหน่วยที่ไปปฏิบัติ (ward) ทุกวัน</label><br>' +
      '<label class="chk"><input type="checkbox" id="uA"' + (u.active !== 'FALSE' ? ' checked' : '') + '> เปิดใช้งาน</label>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveUnit', { item: { unitId: u.unitId, name: $('uN').value, slots: $('uS').value, needWard: $('uW').checked, active: $('uA').checked, ord: u.ord } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}
function editWard(w) {
  w = w || { wardId: '', name: '', short: '', aliases: '', active: 'TRUE' };
  modal({
    title: w.wardId ? 'แก้ไขหน่วยปลายทาง' : 'เพิ่มหน่วยปลายทาง',
    body: '<div class="field"><label class="fl">ชื่อเต็ม</label><input id="wN" value="' + h(w.name) + '"></div>' +
      '<div class="field"><label class="fl">ตัวย่อที่แสดงในช่องตาราง</label><input id="wS" value="' + h(w.short) + '" placeholder="เช่น 19B"></div>' +
      '<div class="field"><label class="fl">ชื่ออื่นที่ให้ถือเป็นหน่วยเดียวกัน (คั่นด้วย | )</label><input id="wA" value="' + h(w.aliases) + '"></div>' +
      '<label class="chk"><input type="checkbox" id="wAc"' + (w.active !== 'FALSE' ? ' checked' : '') + '> เปิดใช้งาน</label>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveWard', { item: { wardId: w.wardId, name: $('wN').value, short: $('wS').value, aliases: $('wA').value, active: $('wAc').checked } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}
function doMergeWards() {
  var ws = window.ADM.wards;
  modal({
    title: 'รวมหน่วยที่สะกดต่างกัน',
    body: '<div class="field"><label class="fl">หน่วยหลักที่จะเก็บไว้</label><select id="mgKeep">' +
      ws.map(function (w) { return '<option value="' + w.wardId + '">' + h(w.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="fl">หน่วยที่จะยุบรวมเข้าไป (เลือกได้หลายรายการ)</label>' +
      '<select id="mgFrom" multiple size="10">' + ws.map(function (w) { return '<option value="' + w.wardId + '">' + h(w.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="note">เวรและทะเบียนบุคลากรที่อ้างหน่วยเหล่านั้นจะถูกย้ายมาที่หน่วยหลักทั้งหมด</div>',
    okText: 'รวมหน่วย',
    onOk: function (close) {
      var sel = Array.prototype.filter.call($('mgFrom').options, function (o) { return o.selected; }).map(function (o) { return o.value; });
      api('mergeWards', { keepId: $('mgKeep').value, mergeIds: sel }).then(function (r) {
        toast('รวมแล้ว · ย้ายเวร ' + r.duties + ' แถว บุคลากร ' + r.employees + ' คน', 'ok');
        close(); MEMO = {}; PAGES.setup();
      }).catch(errToast);
    }
  });
}
function editPos(p) {
  p = p || { posId: '', name: '', payUnit: 'SHIFT', match: '', active: 'TRUE' };
  modal({
    title: p.posId ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่ง',
    body: '<div class="field"><label class="fl">ชื่อตำแหน่ง</label><input id="pN" value="' + h(p.name) + '"></div>' +
      '<div class="field"><label class="fl">คิดค่าตอบแทนเป็น</label><select id="pU">' +
      '<option value="SHIFT"' + (p.payUnit !== 'HOUR' ? ' selected' : '') + '>เวร</option>' +
      '<option value="HOUR"' + (p.payUnit === 'HOUR' ? ' selected' : '') + '>ชั่วโมง</option></select></div>' +
      '<div class="field"><label class="fl">คำที่ใช้จับคู่กับตำแหน่งของ HR (คั่นด้วย , )</label><input id="pM" value="' + h(p.match) + '"></div>' +
      '<label class="chk"><input type="checkbox" id="pA"' + (p.active !== 'FALSE' ? ' checked' : '') + '> เปิดใช้งาน</label>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('savePosition', { item: { posId: p.posId, name: $('pN').value, payUnit: $('pU').value, match: $('pM').value, active: $('pA').checked } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}
function editRate(r) {
  r = r || { rateId: '', unitId: '', posId: '', slot: 'ช', incomeCode: '', incomeName: '', amount: '', effectiveFrom: '', active: 'TRUE' };
  modal({
    title: r.rateId ? 'แก้ไขอัตรา' : 'เพิ่มอัตรา',
    body: '<div class="row"><div class="field" style="flex:1"><label class="fl">หน่วยงาน</label><select id="rU">' + unitOptions(r.unitId) + '</select></div>' +
      '<div class="field" style="flex:1"><label class="fl">ตำแหน่ง</label><select id="rP">' +
      (S.boot.positions || []).map(function (p) { return '<option value="' + p.posId + '"' + (p.posId === r.posId ? ' selected' : '') + '>' + h(p.name) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field" style="width:90px"><label class="fl">ช่วงเวร</label><select id="rS">' +
      ['ช', 'บ', 'ด'].map(function (s) { return '<option' + (s === r.slot ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="row"><div class="field" style="flex:1"><label class="fl">รหัสรายได้ HRMi</label><input id="rC" value="' + h(r.incomeCode) + '"></div>' +
      '<div class="field" style="flex:1"><label class="fl">จำนวนเงินต่อเวร/ชั่วโมง</label><input id="rA" value="' + h(r.amount) + '" inputmode="decimal"></div></div>' +
      '<div class="field"><label class="fl">ชื่อรหัสรายได้</label><input id="rN" value="' + h(r.incomeName) + '"></div>' +
      '<div class="field"><label class="fl">มีผลตั้งแต่วันที่</label><input id="rE" type="date" value="' + h(r.effectiveFrom) + '"></div>' +
      '<div class="note">ขึ้นอัตราใหม่: เพิ่มแถวใหม่พร้อมวันที่มีผล ระบบจะใช้กับเวรตั้งแต่วันนั้นเป็นต้นไป ส่วนเดือนเก่ายังคิดด้วยอัตราเดิม</div>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveRate', {
        item: {
          rateId: r.rateId, unitId: $('rU').value, posId: $('rP').value, slot: $('rS').value,
          incomeCode: $('rC').value, incomeName: $('rN').value, amount: $('rA').value, effectiveFrom: $('rE').value
        }
      }).then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}
function editQuota(q) {
  q = q || { quotaId: '', scope: 'UNIT', refId: '', slot: 'ช', dayType: 'ALL', lim: '', effectiveFrom: '' };
  modal({
    title: q.quotaId ? 'แก้ไขกรอบเวร' : 'เพิ่มกรอบเวร',
    body: '<div class="field"><label class="fl">ระดับ</label><select id="qS">' +
      '<option value="DEPT"' + (q.scope === 'DEPT' ? ' selected' : '') + '>ทั้งฝ่าย (รวมทุกหน่วยงาน)</option>' +
      '<option value="UNIT"' + (q.scope === 'UNIT' ? ' selected' : '') + '>รายหน่วยงาน</option>' +
      '<option value="WARD"' + (q.scope === 'WARD' ? ' selected' : '') + '>ราย ward ปลายทาง</option></select></div>' +
      '<div class="field"><label class="fl">ของ</label><select id="qR"><option value="*">— ทุกหน่วย —</option>' +
      unitOptions(q.refId) + (S.boot.wards || []).map(function (w) { return '<option value="' + w.wardId + '"' + (w.wardId === q.refId ? ' selected' : '') + '>ward: ' + h(w.name) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="row"><div class="field" style="flex:1"><label class="fl">ช่วงเวร</label><select id="qL">' +
      ['ช', 'บ', 'ด'].map(function (s) { return '<option' + (s === q.slot ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="flex:1"><label class="fl">ประเภทวัน</label><select id="qD">' +
      [['ALL', 'ทุกวัน'], ['WORKDAY', 'วันทำการ'], ['HOLIDAY', 'วันหยุด']].map(function (x) {
        return '<option value="' + x[0] + '"' + (q.dayType === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field" style="flex:1"><label class="fl">ไม่เกิน (เวร/วัน)</label><input id="qN" value="' + h(q.lim) + '" inputmode="decimal"></div></div>' +
      '<div class="field"><label class="fl">มีผลตั้งแต่</label><input id="qE" type="date" value="' + h(q.effectiveFrom) + '"></div>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveQuota', { item: { quotaId: q.quotaId, scope: $('qS').value, refId: $('qR').value, slot: $('qL').value, dayType: $('qD').value, lim: $('qN').value, effectiveFrom: $('qE').value } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}
function editCal(c) {
  c = c || { date: '', dayType: 'PUBHOL', name: '' };
  modal({
    title: 'วันหยุด',
    body: '<div class="field"><label class="fl">วันที่</label><input id="cD" type="date" value="' + h(c.date) + '"></div>' +
      '<div class="field"><label class="fl">ประเภท</label><select id="cT">' +
      [['PUBHOL', 'นักขัตฤกษ์'], ['COMP', 'ชดเชย'], ['CLOSED', 'ปิดหน่วยงาน'], ['WORKDAY', 'วันทำการ (บังคับ)']].map(function (x) {
        return '<option value="' + x[0] + '"' + (c.dayType === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label class="fl">ชื่อวัน</label><input id="cN" value="' + h(c.name) + '"></div>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveCalendar', { item: { date: $('cD').value, dayType: $('cT').value, name: $('cN').value } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}
function editWin(w) {
  w = w || { bwId: '', ym: thisYmJs(), unitId: '', openFrom: '', openTo: '', note: '' };
  modal({
    title: 'ช่วงเปิดลงบันทึกตารางเวร',
    body: '<div class="field"><label class="fl">เดือนของตารางเวร</label><select id="bwY">' + ymOptions(w.ym, 2, 3) + '</select></div>' +
      '<div class="field"><label class="fl">หน่วยงาน</label><select id="bwU"><option value="">ทุกหน่วยงาน</option>' + unitOptions(w.unitId) + '</select></div>' +
      '<div class="row"><div class="field" style="flex:1"><label class="fl">เปิดวันที่</label><input id="bwF" type="date" value="' + h(w.openFrom) + '"></div>' +
      '<div class="field" style="flex:1"><label class="fl">ถึงวันที่</label><input id="bwT" type="date" value="' + h(w.openTo) + '"></div></div>' +
      '<div class="field"><label class="fl">หมายเหตุ</label><input id="bwN" value="' + h(w.note) + '"></div>',
    okText: 'บันทึก',
    onOk: function (close) {
      api('saveBookingWindow', { item: { bwId: w.bwId, ym: $('bwY').value, unitId: $('bwU').value, openFrom: $('bwF').value, openTo: $('bwT').value, note: $('bwN').value } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.setup(); }).catch(errToast);
    }
  });
}

/* ================================================================ ผู้ใช้และสิทธิ์ */
PAGES.users = function () {
  $('topExtra').innerHTML = '<button class="btn btn-sm btn-pri" onclick="editUser()">+ เพิ่มผู้ใช้</button>';
  api('listUsers', {}, { fresh: true }).then(function (list) {
    $('page').innerHTML = helpBox('users') + '<div class="card">' +
      '<div class="row"><h3>บัญชีผู้ใช้</h3><span class="sub">' + list.length + ' บัญชี</span>' +
      '<input id="uSearch" placeholder="ค้นหาชื่อ/รหัส" style="width:200px" class="right"></div>' +
      '<div id="uBody"></div></div>';
    var render = function (q) {
      var rows = list.filter(function (u) {
        if (!q) return true;
        return (u.name + ' ' + u.empCode).toLowerCase().indexOf(q.toLowerCase()) >= 0;
      });
      $('uBody').innerHTML = tableBox(['รหัส', 'ชื่อ', 'สิทธิ์', 'หน่วยงานที่ดูแล', 'สถานะ', 'เข้าใช้ล่าสุด', ''],
        rows.map(function (u) {
          return [h(u.empCode), '<b>' + h(u.name) + '</b>',
            u.roles.map(function (r) { return '<span class="tag t-clo">' + h(roleName(r)) + '</span>'; }).join(' '),
            u.units.map(function (x) { return h(unitName(x)); }).join(', ') || '—',
            (u.active ? '<span class="tag t-ok">ใช้งาน</span>' : '<span class="tag t-arc">ปิด</span>') +
            (u.mustChange ? ' <span class="tag t-orange">ต้องตั้งรหัสใหม่</span>' : ''),
            h(u.lastLogin ? u.lastLogin.replace('T', ' ').slice(0, 16) : '—'),
            '<button class="btn btn-sm" onclick=\'editUser(' + JSON.stringify(u) + ')\'>แก้ไข</button> ' +
            '<button class="btn btn-sm btn-danger" onclick="resetPw(\'' + u.empCode + '\')">รีเซ็ตรหัส</button>'];
        }), { maxh: '64vh' });
    };
    render('');
    $('uSearch').addEventListener('input', function () { render(this.value); });
  }).catch(errToast);
};

function editUser(u) {
  u = u || { empCode: '', name: '', roles: ['STAFF'], units: [], active: true };
  var roles = ['STAFF', 'HEAD', 'CHIEF', 'ADMIN'];
  modal({
    title: u.empCode ? 'แก้ไขสิทธิ์ · ' + u.name : 'เพิ่มผู้ใช้',
    body: (u.empCode ? '<div class="field"><label class="fl">รหัสพนักงาน</label><input value="' + h(u.empCode) + '" disabled></div>'
      : '<div class="field"><label class="fl">รหัสพนักงาน (ต้องมีในทะเบียนบุคลากร)</label><input id="usC"></div>') +
      '<div class="field"><label class="fl">สิทธิ์</label>' +
      roles.map(function (r) {
        return '<label class="chk" style="margin-right:.8rem"><input type="checkbox" class="usR" value="' + r + '"' +
          (u.roles.indexOf(r) >= 0 ? ' checked' : '') + '> ' + roleName(r) + '</label>';
      }).join('') + '</div>' +
      '<div class="field"><label class="fl">หน่วยงานที่ดูแล (สำหรับหัวหน้าหอ/ผู้บันทึก — เลือกได้หลายหน่วย)</label>' +
      '<select id="usU" multiple size="6">' + (S.boot.units || []).map(function (x) {
        return '<option value="' + x.unitId + '"' + (u.units.indexOf(x.unitId) >= 0 ? ' selected' : '') + '>' + h(x.name) + '</option>';
      }).join('') + '</select></div>' +
      '<label class="chk"><input type="checkbox" id="usA"' + (u.active ? ' checked' : '') + '> เปิดใช้งานบัญชี</label>' +
      '<div class="note" style="margin-top:.6rem">บัญชีใหม่: รหัสผ่านเริ่มต้น = รหัสพนักงาน ระบบจะบังคับตั้งรหัสใหม่เมื่อเข้าครั้งแรก</div>',
    okText: 'บันทึก',
    onOk: function (close, mask) {
      var rs = Array.prototype.filter.call(mask.querySelectorAll('.usR'), function (x) { return x.checked; }).map(function (x) { return x.value; });
      var us = Array.prototype.filter.call($('usU').options, function (o) { return o.selected; }).map(function (o) { return o.value; });
      api('saveUser', { item: { empCode: u.empCode || $('usC').value, roles: rs, units: us, active: $('usA').checked } })
        .then(function () { toast('บันทึกแล้ว', 'ok'); close(); MEMO = {}; PAGES.users(); }).catch(errToast);
    }
  });
}
function resetPw(empCode) {
  askPassword('รีเซ็ตรหัสผ่าน', 'ตั้งรหัสผ่านของ ' + empCode + ' กลับเป็นรหัสพนักงาน และบังคับให้ตั้งใหม่เมื่อเข้าครั้งถัดไป', function (pw, close) {
    api('resetPassword', { empCode: empCode, password: pw }).then(function (r) {
      toast(r.message, 'ok'); close(); PAGES.users();
    }).catch(errToast);
  });
}

/* ================================================================ นำเข้าข้อมูล / คลัง */
PAGES.data = function () {
  $('topExtra').innerHTML = '';
  $('page').innerHTML = helpBox('data') + '<div class="grid g2">' +
    '<div class="card"><h3><i class="bi bi-people"></i> ทะเบียนบุคลากร</h3>' +
    '<p class="sub">วางข้อมูลจาก Excel (บรรทัดแรกเป็นหัวคอลัมน์): <code>empCode, fullName, hrPosition, wardName</code></p>' +
    '<textarea id="imEmp" rows="6" placeholder="empCode&#9;fullName&#9;hrPosition&#9;wardName"></textarea>' +
    '<label class="chk" style="margin:.5rem 0"><input type="checkbox" id="imUser" checked> สร้างบัญชีเข้าระบบให้ด้วย (รหัสผ่าน = รหัสพนักงาน)</label>' +
    '<div class="row"><button class="btn btn-pri" id="imEmpGo">นำเข้าทะเบียน</button>' +
    '<button class="btn" id="syncEmp"><i class="bi bi-arrow-repeat"></i> ซิงก์จาก SmartAPI</button></div><div id="imEmpOut"></div></div>' +

    '<div class="card"><h3><i class="bi bi-calendar-week"></i> ตารางเวรย้อนหลัง</h3>' +
    '<p class="sub">คอลัมน์: <code>date, empCode, unitName, wardName, shiftCode</code> (หรือใช้ <code>ym</code> + <code>day</code>)<br>' +
    'ข้อมูลเก่าที่ไม่มี ward ให้เว้นว่างไว้ ระบบจะติดธง “นำเข้าจากระบบเดิม” ไม่กระทบเงินที่จ่ายไปแล้ว</p>' +
    '<textarea id="imDuty" rows="6" placeholder="date&#9;empCode&#9;unitName&#9;wardName&#9;shiftCode"></textarea>' +
    '<label class="chk" style="margin:.5rem 0"><input type="checkbox" id="imClose" checked> ตั้งสถานะเดือนที่นำเข้าเป็น “ปิดรอบ”</label>' +
    '<button class="btn btn-pri" id="imDutyGo">นำเข้าตารางเวร</button><div id="imDutyOut"></div></div>' +

    '<div class="card"><h3><i class="bi bi-archive"></i> คลังข้อมูลรายเดือน</h3>' +
    '<p class="sub">ย้ายเดือนที่ปิดรอบครบทุกหน่วยงานออกจากชีทหลัก ระบบยังอ่านย้อนหลังได้เหมือนเดิม</p>' +
    '<div class="row"><select id="arYm" style="width:auto">' + ymOptions(thisYmJs()) + '</select>' +
    '<button class="btn btn-pri" id="arGo">ย้ายเข้าคลัง</button></div><div id="arList" class="sub" style="margin-top:.5rem">กำลังโหลด…</div></div>' +

    '<div class="card"><h3><i class="bi bi-tools"></i> งานระบบ</h3>' +
    '<div class="row" style="gap:.4rem;flex-wrap:wrap">' +
    '<button class="btn" onclick="runJob(\'scan\')">ดึงเวลาสแกนเดือนนี้</button>' +
    '<button class="btn" onclick="runJob(\'emp\')">ซิงก์บุคลากร</button>' +
    '<button class="btn" onclick="runJob(\'warm\')">อุ่นแคช</button>' +
    '<button class="btn" onclick="runJob(\'triggers\')">ตั้ง Trigger อัตโนมัติ</button>' +
    '<button class="btn" onclick="runJob(\'testapi\')">ทดสอบ SmartAPI</button>' +
    '</div><div id="jobOut" class="sub" style="margin-top:.5rem"></div></div>' +
    '</div>';

  $('imEmpGo').addEventListener('click', function () {
    var p = csvToRows($('imEmp').value);
    if (!p.rows.length) { toast('ยังไม่มีข้อมูล', 'warn'); return; }
    api('importEmployees', { rows: p.rows, createUsers: $('imUser').checked }).then(function (r) {
      $('imEmpOut').innerHTML = '<div class="note ok" style="margin-top:.5rem">นำเข้า ' + r.employees + ' คน · สร้างบัญชี ' + r.users + ' · หน่วยใหม่ ' + r.newWards + '</div>';
      MEMO = {};
    }).catch(errToast);
  });
  $('syncEmp').addEventListener('click', function () { runJob('emp'); });
  $('imDutyGo').addEventListener('click', function () {
    var p = csvToRows($('imDuty').value);
    if (!p.rows.length) { toast('ยังไม่มีข้อมูล', 'warn'); return; }
    askPassword('นำเข้าตารางเวรย้อนหลัง', 'จะเพิ่ม ' + p.rows.length + ' แถวเข้าระบบ', function (pw, close) {
      api('importLegacy', { rows: p.rows, password: pw, closePeriods: $('imClose').checked }).then(function (r) {
        close();
        $('imDutyOut').innerHTML = '<div class="note ok" style="margin-top:.5rem">นำเข้า ' + r.added + ' แถว · ข้าม ' + r.skipped + ' แถว · ' + r.months + ' เดือน</div>' +
          (r.messages.length ? '<div class="msgs">' + r.messages.map(function (m) { return '<div class="msg orange"><span class="dot"></span>' + h(m) + '</div>'; }).join('') + '</div>' : '');
        MEMO = {};
      }).catch(errToast);
    });
  });
  $('arGo').addEventListener('click', function () {
    askPassword('ย้ายเข้าคลัง', 'ย้ายข้อมูลเดือน ' + thaiYmJs($('arYm').value) + ' ออกจากชีทหลัก', function (pw, close) {
      api('archiveMonth', { ym: $('arYm').value, password: pw }).then(function (r) {
        toast('ย้าย ' + r.rows + ' แถวเข้าคลังแล้ว', 'ok'); close(); loadArch();
      }).catch(errToast);
    });
  });
  var loadArch = function () {
    api('listArchives', {}).then(function (list) {
      $('arList').innerHTML = list.length ? list.map(function (a) {
        return '<div class="row"><span class="tag t-arc">' + h(a.ymTh) + '</span><span>' + a.rows + ' แถว</span>' +
          '<a class="right" href="' + a.url + '" target="_blank" rel="noopener">ไฟล์คลัง</a></div>';
      }).join('') : 'ยังไม่มีเดือนในคลัง';
    }).catch(function () { });
  };
  loadArch();
};

function runJob(job) {
  var out = $('jobOut'); if (out) out.textContent = 'กำลังทำงาน…';
  api('runJob', { job: job, ym: S.ym || thisYmJs() }).then(function (r) {
    if (out) out.textContent = r.message || JSON.stringify(r);
    toast('เรียบร้อย', 'ok'); MEMO = {};
  }).catch(function (e) { if (out) out.textContent = ''; errToast(e); });
}

/* ================================================================ ประวัติการใช้งาน */
PAGES.audit = function () {
  $('topExtra').innerHTML = '<input id="auQ" placeholder="กรองตามคำสั่ง เช่น SAVE" style="width:auto">';
  var load = function () {
    api('getAudit', { action: $('auQ').value }, { fresh: true }).then(function (list) {
      $('page').innerHTML = helpBox('audit') + tableBox(['เวลา', 'ผู้ใช้', 'คำสั่ง', 'เป้าหมาย', 'รายละเอียด'],
        list.map(function (r) {
          return [h(r.at.replace('T', ' ').slice(0, 19)), h(r.empCode), '<span class="tag t-open">' + h(r.action) + '</span>', h(r.target),
            '<span class="sub">' + h(String(r.detail).slice(0, 120)) + '</span>'];
        }), { maxh: '70vh', empty: 'ยังไม่มีประวัติ' });
    }).catch(errToast);
  };
  var t = null;
  $('auQ').addEventListener('input', function () { clearTimeout(t); t = setTimeout(load, 350); });
  load();
};
