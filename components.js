/**
 * components.js — ชิ้นส่วน UI ที่ใช้ซ้ำ (v2)
 * กล่องโต้ตอบ (Bootstrap Modal) · ส่วนหัวหน้า · ตัวเลือกเดือน/ฝ่าย/หน่วยงาน · ป้ายสถานะ · ขั้นตอนรอบเดือน
 * ตาราง · ชิปเลือกหลายรายการ · ตัวเลขนับขึ้น · แผงเลือกเวร+หน่วยปลายทาง
 * ทุก popup วางไว้ใน document.body (บทเรียนจาก SMC: ปุ่มกดไม่ได้เมื่ออยู่ใต้ container ที่มี transform)
 */

/* ---------------------------------------------------------------- กล่องโต้ตอบ */
var MDL = null;
/**
 * modal({title, sub, icon, iconCls, body, okText|null, cancelText, size:'sm|md|lg|xl', static:true, onOk(close, root), onOpen(root, close), onClose})
 */
function modal(o) {
  var el = $('mdl');
  if (!MDL) MDL = new bootstrap.Modal(el);
  var dlg = $('mdlDlg');
  dlg.className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (o.size === 'lg' ? ' modal-lg' : o.size === 'xl' ? ' modal-xl' : o.size === 'sm' ? ' modal-sm' : '');
  $('mdlTitle').textContent = o.title || '';
  $('mdlSub').textContent = o.sub || '';
  $('mdlSub').hidden = !o.sub;
  $('mdlIc').className = 'mdl-ic' + (o.iconCls ? ' ' + o.iconCls : '');
  $('mdlIc').innerHTML = '<i class="bi ' + (o.icon || 'bi-pencil-square') + '"></i>';
  $('mdlBody').innerHTML = o.body || '';
  $('mdlX').hidden = !!o.noClose;
  var foot = '';
  if (!o.noClose) foot += '<button type="button" class="btn btn-ghost" data-bs-dismiss="modal">' + h(o.cancelText || 'ยกเลิก') + '</button>';
  if (o.okText !== null) foot += '<button type="button" class="btn btn-brand" id="mdlOk">' + (o.okIcon ? '<i class="bi ' + o.okIcon + '"></i> ' : '') + h(o.okText || 'ตกลง') + '</button>';
  $('mdlFoot').innerHTML = foot;
  $('mdlFoot').hidden = !foot;
  var close = function () { MDL.hide(); };
  if ($('mdlOk')) $('mdlOk').onclick = function () { if (o.onOk) o.onOk(close, el); else close(); };
  el.setAttribute('data-bs-backdrop', o.noClose ? 'static' : 'true');
  el.setAttribute('data-bs-keyboard', o.noClose ? 'false' : 'true');
  MDL._config.backdrop = o.noClose ? 'static' : true;
  MDL._config.keyboard = !o.noClose;
  el.onkeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && $('mdlOk') && !o.noEnter) { e.preventDefault(); $('mdlOk').click(); }
  };
  var shown = function () {
    el.removeEventListener('shown.bs.modal', shown);
    var f = el.querySelector('.modal-body input:not([type=checkbox]):not([disabled]),.modal-body select,.modal-body textarea'); if (f && !o.noFocus) f.focus();
  };
  el.addEventListener('shown.bs.modal', shown);
  var hidden = function () { el.removeEventListener('hidden.bs.modal', hidden); closePop(); if (o.onClose) o.onClose(); };
  el.addEventListener('hidden.bs.modal', hidden);
  MDL.show();
  if (o.onOpen) o.onOpen(el, close);
  return { el: el, close: close };
}

/* ---------------------------------------------------------------- ส่วนหัวของหน้า + คำชี้แจง */
function pageHead(icon, title, desc, actions) {
  return '<div class="page-head"><div class="ph-ic"><i class="bi ' + icon + '"></i></div>' +
    '<div class="ph-txt"><h1>' + h(title) + '</h1><p>' + (desc || '') + '</p></div>' +
    (actions ? '<div class="ph-act">' + actions + '</div>' : '') + '</div>' + howtoBox(S.page);
}
function emptyBox(icon, title, text, action) {
  return '<div class="empty"><div class="ei"><i class="bi ' + (icon || 'bi-inbox') + '"></i></div><b>' + h(title || 'ยังไม่มีข้อมูล') + '</b>' +
    (text ? '<div>' + text + '</div>' : '') + (action ? '<div class="mt-3">' + action + '</div>' : '') + '</div>';
}
function noteBox(kind, icon, html, cls) {
  return '<div class="note ' + (kind || '') + (cls ? ' ' + cls : '') + '"><i class="bi ' + (icon || 'bi-info-circle') + '"></i><div>' + html + '</div></div>';
}

/* ---------------------------------------------------------------- ตัวเลือก */
function thaiYmJs(ym, full) {
  var M = full ? ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    : ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var a = String(ym).split('-');
  return M[+a[1] - 1] + ' ' + (+a[0] + 543);
}
function thaiDate(d) {
  if (!d) return '';
  var a = String(d).slice(0, 10).split('-');
  var M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return (+a[2]) + ' ' + M[+a[1] - 1] + ' ' + String(+a[0] + 543).slice(-2);
}
function thaiDT(s) { if (!s) return '—'; return thaiDate(s) + ' ' + String(s).slice(11, 16); }
function thisYmJs() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
function ymOptions(sel, back, fwd) {
  var now = new Date(), out = [];
  back = back === undefined ? 14 : back; fwd = fwd === undefined ? 2 : fwd;
  for (var i = -back; i <= fwd; i++) {
    var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    var ym = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    out.push('<option value="' + ym + '"' + (ym === sel ? ' selected' : '') + '>' + thaiYmJs(ym) + '</option>');
  }
  return out.reverse().join('');
}
function ymSelect(id, sel) { return '<select class="sel-chip" id="' + id + '" title="เดือน">' + ymOptions(sel) + '</select>'; }
function deptOf(id) { return ((S.boot && S.boot.depts) || []).filter(function (d) { return d.deptId === id; })[0] || null; }
function deptName(id) { var d = deptOf(id); return d ? d.name : (id === '*' ? 'ทุกฝ่าย' : id || '—'); }
function deptColor(id) { var d = deptOf(id); return (d && d.color) || '#0e9f8f'; }
function deptChip(id) { return '<span class="dchip" style="--dc:' + h(deptColor(id)) + '">' + h(deptName(id)) + '</span>'; }
function unitObj(id) { return ((S.boot && S.boot.units) || []).filter(function (x) { return x.unitId === id; })[0] || null; }
function unitName(id) { var u = unitObj(id); return u ? u.name : id; }
function unitNeedWard(id) { var u = unitObj(id); return !!(u && u.needWard); }
function unitDept(id) { var u = unitObj(id); return u ? u.deptId : ''; }
function canEditUnitJs(id) { var ce = S.me.canEditUnits; return ce === null || (ce || []).indexOf(id) >= 0; }
function isChiefOfJs(id) { var cd = S.me.chiefDepts; return cd === null || (cd || []).indexOf(unitDept(id)) >= 0; }
function myUnitsFor(mode) {
  var list = (S.boot.units || []);
  if (mode === 'edit') return list.filter(function (u) { return canEditUnitJs(u.unitId); });
  if (mode === 'manage') return list.filter(function (u) { return canEditUnitJs(u.unitId) || isChiefOfJs(u.unitId); });
  if (mode === 'book') return list.filter(function (u) { return (S.me.bookUnits || []).indexOf(u.unitId) >= 0; });
  return list;
}
/** ตัวเลือกหน่วยงานจัดกลุ่มตามฝ่าย */
function unitOptions(sel, list, allLabel) {
  list = list || S.boot.units || [];
  var out = allLabel ? '<option value="">' + h(allLabel) + '</option>' : '';
  (S.boot.depts || []).forEach(function (d) {
    var us = list.filter(function (u) { return u.deptId === d.deptId; });
    if (!us.length) return;
    out += '<optgroup label="' + h(d.name) + '">' + us.map(function (u) {
      return '<option value="' + u.unitId + '"' + (u.unitId === sel ? ' selected' : '') + '>' + h(u.name) + '</option>';
    }).join('') + '</optgroup>';
  });
  var orphan = list.filter(function (u) { return !deptOf(u.deptId); });
  out += orphan.map(function (u) { return '<option value="' + u.unitId + '"' + (u.unitId === sel ? ' selected' : '') + '>' + h(u.name) + '</option>'; }).join('');
  return out;
}
function deptOptions(sel, allLabel, only) {
  var list = (S.boot.depts || []).filter(function (d) { return !only || only.indexOf(d.deptId) >= 0; });
  return (allLabel ? '<option value="">' + h(allLabel) + '</option>' : '') +
    list.map(function (d) { return '<option value="' + d.deptId + '"' + (d.deptId === sel ? ' selected' : '') + '>' + h(d.name) + '</option>'; }).join('');
}
function pickUnit(list) {
  var ids = list.map(function (u) { return u.unitId; });
  if (S.unitId && ids.indexOf(S.unitId) >= 0) return S.unitId;
  return (list[0] || {}).unitId || '';
}
function wardName(id) { var w = (S.boot.wards || []).filter(function (x) { return x.wardId === id; })[0]; return w ? w.name : id; }
function wardShort(id) { var w = (S.boot.wards || []).filter(function (x) { return x.wardId === id; })[0]; return w ? (w.short || w.name) : id; }
function wardByText(txt) {
  var q = String(txt || '').trim().toLowerCase();
  if (!q) return null;
  var ws = S.boot.wards || [];
  var hit = ws.filter(function (w) { return String(w.short || '').toLowerCase() === q; })[0]
    || ws.filter(function (w) { return w.name.toLowerCase() === q; })[0]
    || ws.filter(function (w) { return w.name.toLowerCase().indexOf(q) >= 0; })[0];
  return hit ? hit.wardId : false;
}
function posName(id) { var p = (S.boot.positions || []).filter(function (x) { return x.posId === id; })[0]; return p ? p.name : (id || '—'); }
function flagText(code) { var f = (S.boot.flags || []).filter(function (x) { return x.code === code; })[0]; return f ? f.text : code; }
function flagColor(code) { var f = (S.boot.flags || []).filter(function (x) { return x.code === code; })[0]; return f ? f.color : 'orange'; }
function flagChips(flags) {
  return (flags || []).map(function (f) {
    return '<span class="tag t-' + flagColor(f) + '" title="' + h(flagText(f)) + '"><i class="bi ' + (flagColor(f) === 'red' ? 'bi-x-octagon' : 'bi-exclamation-triangle') + '"></i>' + h(flagText(f)) + '</span>';
  }).join(' ');
}
var ST_INFO = {
  OPEN: ['t-open', 'bi-pencil'], SUBMITTED: ['t-sub', 'bi-send'], VERIFIED: ['t-ver', 'bi-patch-check'],
  CLOSED: ['t-clo', 'bi-lock'], RETURNED: ['t-ret', 'bi-arrow-return-left'], ARCHIVED: ['t-arc', 'bi-archive']
};
function statusTag(st, th) {
  var x = ST_INFO[st] || ST_INFO.OPEN;
  return '<span class="tag ' + x[0] + '"><i class="bi ' + x[1] + '"></i>' + h(th || st) + '</span>';
}
/** ขั้นตอนรอบเดือน: กำลังบันทึก → ส่งตรวจ → ตรวจแล้ว → ปิดรอบ */
function pipeline(st) {
  var order = ['OPEN', 'SUBMITTED', 'VERIFIED', 'CLOSED'];
  var names = ['กำลังบันทึก', 'ส่งตรวจ', 'ตรวจผ่าน', 'ปิดรอบ'];
  var icons = ['bi-pencil', 'bi-send', 'bi-patch-check', 'bi-lock'];
  var at = st === 'ARCHIVED' ? 4 : st === 'RETURNED' ? 0 : order.indexOf(st);
  return '<div class="pipe">' + order.map(function (s, i) {
    var cls = i < at || st === 'ARCHIVED' || (st === 'CLOSED' && i === 3) ? 'done' : i === at ? 'now' : '';
    if (st === 'RETURNED' && i === 0) cls = 'ret';
    return '<div class="st ' + cls + '"><i class="bi ' + (cls === 'done' ? 'bi-check-lg' : st === 'RETURNED' && i === 0 ? 'bi-arrow-return-left' : icons[i]) + '"></i>' +
      (st === 'RETURNED' && i === 0 ? 'ส่งกลับแก้ไข' : names[i]) + '</div>';
  }).join('') + '</div>';
}
function shiftBadge(code) {
  var c = String(code || '');
  var k = c.charAt(0);
  return '<span class="sc ' + (/[ชบด]/.test(k) && c.length <= 2 ? 'sc-' + k : '') + '">' + h(c || '—') + '</span>';
}
function personCell(name, sub, av) {
  return '<div class="person">' + (av === false ? '' : '<div class="avatar sm">' + h(initials(name)) + '</div>') + '<div style="min-width:0"><b>' + h(name) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
}
function statCard(icon, value, label, tone, raw) {
  return '<div class="stat ' + (tone ? 't-' + tone : '') + '"><div class="si"><i class="bi ' + icon + '"></i></div><div>' +
    '<b' + (raw ? ' class="raw"' : ' data-count="' + (+value || 0) + '"') + '>' + (raw ? value : num(value)) + '</b><span>' + label + '</span></div></div>';
}
/** ตัวเลขนับขึ้น */
function countUp(root) {
  $$('[data-count]', root || document).forEach(function (el) {
    var to = +el.dataset.count, dec = to % 1 ? 2 : 0, t0 = null, dur = 700;
    if (!to) { el.textContent = num(0); return; }
    var step = function (ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? num(to * e, 0) : num(to);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------------------------------------------------------------- ชิปเลือกหลายรายการ */
/** chipGroup(name, items:[{v,t,d,sub,dis}], selected[], {single}) */
function chipGroup(name, items, selected, o) {
  o = o || {};
  selected = selected || [];
  return '<div class="chips" data-chips="' + name + '"' + (o.single ? ' data-single="1"' : '') + '>' + items.map(function (it) {
    var on = selected.indexOf(it.v) >= 0;
    return '<label class="chip' + (on ? ' on' : '') + (it.dis ? ' dis' : '') + '"' + (it.color ? ' style="--dc:' + h(it.color) + '"' : '') + ' title="' + h(it.sub || '') + '">' +
      '<input type="checkbox" value="' + h(it.v) + '"' + (on ? ' checked' : '') + (it.dis ? ' disabled' : '') + '><i class="bi bi-check-lg ck"></i>' +
      (it.color ? '<span class="dchip" style="--dc:' + h(it.color) + ';padding:0;background:none"></span>' : '') + h(it.t) + (it.d ? ' <span class="cd">' + h(it.d) + '</span>' : '') + '</label>';
  }).join('') + '</div>';
}
function wireChips(root, onChange) {
  $$('[data-chips]', root).forEach(function (g) {
    g.addEventListener('change', function (e) {
      var inp = e.target; if (inp.tagName !== 'INPUT') return;
      if (g.dataset.single && inp.checked) $$('input', g).forEach(function (x) { if (x !== inp) { x.checked = false; x.closest('.chip').classList.remove('on'); } });
      inp.closest('.chip').classList.toggle('on', inp.checked);
      if (onChange) onChange(g.dataset.chips, chipValues(root, g.dataset.chips));
    });
  });
}
function chipValues(root, name) {
  var g = (root || document).querySelector('[data-chips="' + name + '"]');
  return g ? $$('input:checked', g).map(function (x) { return x.value; }) : [];
}

/* ---------------------------------------------------------------- ตาราง */
function tableBox(head, rows, opt) {
  opt = opt || {};
  if (!rows.length) return opt.emptyHtml || emptyBox(opt.emptyIcon || 'bi-inbox', opt.empty || 'ไม่มีข้อมูล', opt.emptyText || '');
  return '<div class="tbox" ' + (opt.maxh ? 'style="max-height:' + opt.maxh + '"' : '') + '><table class="tb"><thead><tr>' +
    head.map(function (x) { return '<th' + (x.n ? ' class="n"' : '') + (x.w ? ' style="width:' + x.w + '"' : '') + '>' + h(x.t || x) + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    rows.map(function (r) {
      var attrs = r._attrs || '';
      return '<tr ' + attrs + '>' + (r.cells || r).map(function (c, i) {
        var cl = []; if (head[i] && head[i].n) cl.push('n'); if (head[i] && head[i].wrap) cl.push('wrap');
        return '<td' + (cl.length ? ' class="' + cl.join(' ') + '"' : '') + '>' + (c == null ? '' : c) + '</td>';
      }).join('') + '</tr>';
    }).join('') +
    '</tbody>' + (opt.foot ? '<tfoot><tr>' + opt.foot.map(function (c, i) {
      var n = head[i] && head[i].n ? ' class="n"' : '';
      return '<td' + n + '>' + (c == null ? '' : c) + '</td>';
    }).join('') + '</tr></tfoot>' : '') + '</table></div>';
}
function downloadLinks(files) {
  return '<div class="d-grid gap-2 mt-3">' + files.map(function (f) {
    return '<div class="d-flex align-items-center gap-2 p-2 rounded-3" style="background:var(--surface-2);border:1px solid var(--line-2)"><i class="bi bi-file-earmark-check fs-5 text-brand"></i>' +
      '<a class="flex-grow-1 text-truncate" href="' + h(f.url) + '" target="_blank" rel="noopener">' + h(f.fileName) + '</a>' +
      (f.download ? '<a class="btn btn-sm btn-soft" href="' + h(f.download) + '" target="_blank" rel="noopener"><i class="bi bi-download"></i> ดาวน์โหลด</a>' : '') + '</div>';
  }).join('') + '</div>';
}
function csvToRows(text) {
  var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
  if (!lines.length) return { head: [], rows: [] };
  var split = function (l) {
    if (l.indexOf('\t') >= 0) return l.split('\t');
    var out = [], cur = '', q = false;
    for (var i = 0; i < l.length; i++) {
      var ch = l[i];
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  var head = split(lines[0]).map(function (x) { return x.trim(); });
  var rows = lines.slice(1).map(function (l) {
    var a = split(l), o = {};
    head.forEach(function (k, i) { o[k] = (a[i] || '').trim(); });
    return o;
  });
  return { head: head, rows: rows };
}
/** ทะเบียนข้อมูลที่ปุ่มในตารางอ้างถึง (แทนการฝัง JSON ใน onclick ซึ่งพังเมื่อมีเครื่องหมาย ') */
var REG = {};
function reg(key, obj) { REG[key] = obj; return key; }

/* ---------------------------------------------------------------- แผงเลือกเวร + หน่วยปลายทาง */
var POP = null;
function closePop() { if (POP) { POP.remove(); POP = null; } }
document.addEventListener('mousedown', function (e) {
  if (POP && !e.target.closest('.pop') && !e.target.closest('.wt') && !e.target.closest('[data-pop]')) closePop();
});
window.addEventListener('resize', closePop);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

/**
 * opt: {anchor, codes, code, wardId, needWard, onPick(code, wardId), title, homeWardId, sub}
 */
function openCellPop(opt) {
  closePop();
  var pop = document.createElement('div');
  pop.className = 'pop';
  var codes = opt.codes || [];
  var singles = codes.filter(function (c) { return c.length === 1; });
  var halves = codes.filter(function (c) { return c.length === 2 && /[12]$/.test(c); });
  var combos = codes.filter(function (c) { return c.length > 1 && !/^[ชบด][12]$/.test(c); });
  var wards = S.boot.wards || [];
  var btn = function (c) { return '<button type="button" data-c="' + c + '"' + (c === opt.code ? ' class="on"' : '') + '>' + c + '</button>'; };
  pop.innerHTML =
    '<div class="pt">' + h(opt.title || 'เลือกเวร') + '</div>' + (opt.sub ? '<div class="small-muted" style="margin:-6px 0 8px">' + opt.sub + '</div>' : '') +
    '<h4><i class="bi bi-clock"></i> เต็มเวร</h4><div class="qs">' + singles.map(btn).join('') + '<button type="button" class="clr" data-c=""><i class="bi bi-eraser"></i> ล้าง</button></div>' +
    (halves.length ? '<h4><i class="bi bi-circle-half"></i> ครึ่งเวร (0.5)</h4><div class="qs">' + halves.map(btn).join('') + '</div>' : '') +
    (combos.length ? '<h4><i class="bi bi-layers"></i> รหัสผสม</h4><div class="qs">' + combos.filter(function (c) { return !/[12]/.test(c); }).concat(combos.filter(function (c) { return /[12]/.test(c); }).slice(0, 6)).map(btn).join('') + '</div>' : '') +
    (opt.needWard
      ? '<h4><i class="bi bi-geo-alt"></i> หน่วยที่ไปปฏิบัติของวันนี้</h4>' +
        '<input class="form-control form-control-sm mb-2" id="popSearch" placeholder="พิมพ์ค้นหา เช่น 19A, CCU">' +
        '<select class="form-select form-select-sm" id="popWard" size="6">' +
        '<option value="">— ใช้หน่วยเดิมจากวันก่อนหน้า —</option>' +
        wards.map(function (w) {
          var home = opt.homeWardId && w.wardId === opt.homeWardId;
          return '<option value="' + w.wardId + '"' + (w.wardId === opt.wardId ? ' selected' : '') + (home ? ' disabled' : '') + '>' + h(w.name) + (home ? ' (ต้นสังกัด — ลงไม่ได้)' : '') + '</option>';
        }).join('') + '</select>' +
        '<div class="hint"><i class="bi bi-lightbulb"></i> พิมพ์ในช่องตารางว่า <b>ช/19A</b> ก็ระบุหน่วยได้เช่นกัน</div>'
      : '') +
    '<div class="r2"><button type="button" class="btn btn-sm btn-ghost" data-cancel>ปิด</button><button type="button" class="btn btn-sm btn-brand" data-ok><i class="bi bi-check2"></i> ใช้ค่านี้</button></div>';
  document.body.appendChild(pop);
  POP = pop;

  var r = opt.anchor.getBoundingClientRect();
  var top = window.scrollY + r.bottom + 6;
  var left = Math.min(window.scrollX + r.left - 110, window.scrollX + document.documentElement.clientWidth - 302);
  pop.style.left = Math.max(window.scrollX + 8, left) + 'px';
  pop.style.top = top + 'px';
  if (r.bottom + pop.offsetHeight + 10 > window.innerHeight) {
    pop.style.top = Math.max(window.scrollY + 8, window.scrollY + r.top - pop.offsetHeight - 6) + 'px';
  }

  var chosen = opt.code;
  $$('.qs button', pop).forEach(function (b) {
    b.addEventListener('click', function () {
      chosen = b.dataset.c;
      $$('.qs button', pop).forEach(function (x) { x.classList.toggle('on', x === b && !!chosen); });
      if (!opt.needWard || !chosen) { opt.onPick(chosen, chosen ? opt.wardId : ''); closePop(); }
    });
  });
  var srch = pop.querySelector('#popSearch');
  if (srch) {
    srch.addEventListener('input', function () {
      var q = srch.value.trim().toLowerCase(), sel = pop.querySelector('#popWard');
      $$('option', sel).forEach(function (o) { o.hidden = !!q && o.value !== '' && o.text.toLowerCase().indexOf(q) < 0; });
      var vis = $$('option', sel).filter(function (o) { return !o.hidden && o.value && !o.disabled; });
      if (q && vis.length) sel.value = vis[0].value;
    });
    srch.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); pop.querySelector('[data-ok]').click(); } });
    setTimeout(function () { srch.focus(); }, 30);
  }
  var wsel = pop.querySelector('#popWard');
  if (wsel) wsel.addEventListener('dblclick', function () { pop.querySelector('[data-ok]').click(); });
  pop.querySelector('[data-cancel]').addEventListener('click', closePop);
  pop.querySelector('[data-ok]').addEventListener('click', function () {
    var w = pop.querySelector('#popWard');
    opt.onPick(chosen, w ? w.value : opt.wardId);
    closePop();
  });
}
