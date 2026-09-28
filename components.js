/**
 * components.js — ชิ้นส่วน UI ที่ใช้ซ้ำ: กล่องโต้ตอบ · ตัวเลือกเดือน/หน่วยงาน · ตัวเลือกหน่วยปลายทาง (ค้นหาได้)
 * ทุก popup วางไว้ใน document.body และไม่ใช้ backdrop-filter บน container (บทเรียนจาก SMC: ปุ่มกดไม่ได้)
 */

/* ---------------------------------------------------------------- กล่องโต้ตอบ */
function modal(opt) {
  var mask = document.createElement('div');
  mask.className = 'mask';
  mask.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true">' +
    '<header>' + h(opt.title || '') + '</header>' +
    '<div class="body">' + (opt.body || '') + '</div>' +
    '<footer>' +
    (opt.noClose ? '' : '<button class="btn" data-x>ยกเลิก</button>') +
    (opt.okText === null ? '' : '<button class="btn btn-pri" data-ok>' + h(opt.okText || 'ตกลง') + '</button>') +
    '</footer></div>';
  document.body.appendChild(mask);
  var close = function () { mask.remove(); };
  var x = mask.querySelector('[data-x]'); if (x) x.addEventListener('click', close);
  var ok = mask.querySelector('[data-ok]');
  if (ok) ok.addEventListener('click', function () { if (opt.onOk) opt.onOk(close, mask); else close(); });
  if (!opt.noClose) mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape' && !opt.noClose) { close(); document.removeEventListener('keydown', esc); }
  });
  var f = mask.querySelector('input,select,textarea'); if (f) setTimeout(function () { f.focus(); }, 50);
  if (opt.onOpen) opt.onOpen(mask, close);
  return { el: mask, close: close };
}

function confirmBox(title, text, onYes, danger) {
  modal({
    title: title,
    body: '<p style="margin:.2rem 0 .4rem">' + text + '</p>',
    okText: danger ? 'ยืนยันดำเนินการ' : 'ตกลง',
    onOk: function (close) { close(); onYes(); }
  });
}

/** ขอรหัสผ่านซ้ำสำหรับการกระทำสำคัญ */
function askPassword(title, text, onOk) {
  modal({
    title: title,
    body: '<p style="margin-top:0">' + text + '</p>' +
      '<div class="field"><label class="fl">ยืนยันรหัสผ่านของท่าน</label><input type="password" id="mkPw"></div>' +
      '<div class="field" id="mkReasonWrap" hidden><label class="fl">เหตุผล</label><input id="mkReason"></div>',
    okText: 'ยืนยัน',
    onOk: function (close) { onOk($('mkPw').value, close); }
  });
}

/* ---------------------------------------------------------------- ตัวเลือก */
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
function thaiYmJs(ym) {
  var M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var a = String(ym).split('-');
  return M[+a[1] - 1] + ' ' + (+a[0] + 543);
}
function thisYmJs() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}
function unitOptions(sel, onlyEditable) {
  var list = (S.boot.units || []).filter(function (u) {
    if (!onlyEditable) return true;
    var ce = S.me.canEditUnits;
    return ce === null || ce.indexOf(u.unitId) >= 0;
  });
  return list.map(function (u) {
    return '<option value="' + u.unitId + '"' + (u.unitId === sel ? ' selected' : '') + '>' + h(u.name) + '</option>';
  }).join('');
}
function unitName(id) {
  var u = (S.boot.units || []).filter(function (x) { return x.unitId === id; })[0];
  return u ? u.name : id;
}
function unitNeedWard(id) {
  var u = (S.boot.units || []).filter(function (x) { return x.unitId === id; })[0];
  return !!(u && u.needWard);
}
function wardName(id) {
  var w = (S.boot.wards || []).filter(function (x) { return x.wardId === id; })[0];
  return w ? w.name : id;
}
function wardShort(id) {
  var w = (S.boot.wards || []).filter(function (x) { return x.wardId === id; })[0];
  return w ? (w.short || w.name) : id;
}
function wardByText(txt) {
  var q = String(txt || '').trim().toLowerCase();
  if (!q) return null;
  var ws = S.boot.wards || [];
  var hit = ws.filter(function (w) { return String(w.short || '').toLowerCase() === q; })[0]
    || ws.filter(function (w) { return w.name.toLowerCase() === q; })[0]
    || ws.filter(function (w) { return w.name.toLowerCase().indexOf(q) >= 0; })[0];
  return hit ? hit.wardId : false;
}
function flagText(code) {
  var f = (S.boot.flags || []).filter(function (x) { return x.code === code; })[0];
  return f ? f.text : code;
}
function flagColor(code) {
  var f = (S.boot.flags || []).filter(function (x) { return x.code === code; })[0];
  return f ? f.color : 'orange';
}
function flagChips(flags) {
  return (flags || []).map(function (f) {
    return '<span class="tag t-' + flagColor(f) + '" title="' + h(flagText(f)) + '">' + h(flagText(f)) + '</span>';
  }).join(' ');
}
function statusTag(st, th) {
  var cls = { OPEN: 't-open', SUBMITTED: 't-sub', VERIFIED: 't-ver', CLOSED: 't-clo', RETURNED: 't-ret', ARCHIVED: 't-arc' }[st] || 't-open';
  return '<span class="tag ' + cls + '">' + h(th || st) + '</span>';
}

/* ---------------------------------------------------------------- แผงเลือกเวร + หน่วยปลายทาง */
var POP = null;
function closePop() { if (POP) { POP.remove(); POP = null; } }
document.addEventListener('click', function (e) {
  if (POP && !e.target.closest('.pop') && !e.target.closest('.wt')) closePop();
});
window.addEventListener('resize', closePop);

/**
 * เปิดแผงเลือก — opt: {anchor, codes, code, wardId, needWard, onPick(code, wardId), title}
 */
function openCellPop(opt) {
  closePop();
  var pop = document.createElement('div');
  pop.className = 'pop';
  var quick = (opt.codes || []).filter(function (c) { return c.length <= 2; });
  var combos = (opt.codes || []).filter(function (c) { return c.length > 2; });
  var wards = S.boot.wards || [];
  pop.innerHTML =
    '<h4>' + h(opt.title || 'เลือกเวร') + '</h4>' +
    '<div class="qs">' + quick.map(function (c) {
      return '<button data-c="' + c + '"' + (c === opt.code ? ' class="on"' : '') + '>' + c + '</button>';
    }).join('') + '<button data-c="">ล้าง</button></div>' +
    (combos.length ? '<h4>รหัสผสม</h4><div class="qs">' + combos.slice(0, 12).map(function (c) {
      return '<button data-c="' + c + '"' + (c === opt.code ? ' class="on"' : '') + '>' + c + '</button>';
    }).join('') + '</div>' : '') +
    (opt.needWard
      ? '<h4>หน่วยที่ไปปฏิบัติของวันนี้</h4>' +
        '<input id="popSearch" placeholder="พิมพ์เพื่อค้นหา เช่น 19A" style="margin-bottom:.3rem">' +
        '<select id="popWard" size="6">' +
        '<option value="">— ใช้หน่วยเดิมจากวันก่อนหน้า —</option>' +
        wards.map(function (w) {
          return '<option value="' + w.wardId + '"' + (w.wardId === opt.wardId ? ' selected' : '') + '>' + h(w.name) + '</option>';
        }).join('') + '</select>' +
        '<div class="hint">พิมพ์ในช่องตารางว่า <b>ช/19A</b> ก็เลือกหน่วยได้เช่นกัน</div>'
      : '') +
    '<div class="r2"><button class="btn btn-sm" data-cancel>ปิด</button><button class="btn btn-sm btn-pri" data-ok>ตกลง</button></div>';
  document.body.appendChild(pop);
  POP = pop;

  var r = opt.anchor.getBoundingClientRect();
  var top = window.scrollY + r.bottom + 6;
  var left = Math.min(window.scrollX + r.left - 100, window.scrollX + document.documentElement.clientWidth - 266);
  pop.style.left = Math.max(window.scrollX + 8, left) + 'px';
  pop.style.top = top + 'px';
  if (top + pop.offsetHeight > window.scrollY + window.innerHeight) {
    pop.style.top = Math.max(window.scrollY + 8, window.scrollY + r.top - pop.offsetHeight - 6) + 'px';
  }

  var chosen = opt.code;
  Array.prototype.forEach.call(pop.querySelectorAll('.qs button'), function (b) {
    b.addEventListener('click', function () {
      chosen = b.dataset.c;
      Array.prototype.forEach.call(pop.querySelectorAll('.qs button'), function (x) { x.classList.toggle('on', x === b); });
      if (!opt.needWard) { opt.onPick(chosen, opt.wardId); closePop(); }
    });
  });
  var srch = pop.querySelector('#popSearch');
  if (srch) {
    srch.addEventListener('input', function () {
      var q = srch.value.trim().toLowerCase(), sel = pop.querySelector('#popWard');
      Array.prototype.forEach.call(sel.options, function (o) {
        o.hidden = !!q && o.value !== '' && o.text.toLowerCase().indexOf(q) < 0;
      });
      var vis = Array.prototype.filter.call(sel.options, function (o) { return !o.hidden && o.value; });
      if (q && vis.length) sel.value = vis[0].value;
    });
  }
  pop.querySelector('[data-cancel]').addEventListener('click', closePop);
  pop.querySelector('[data-ok]').addEventListener('click', function () {
    var w = pop.querySelector('#popWard');
    opt.onPick(chosen, w ? w.value : opt.wardId);
    closePop();
  });
}

/* ---------------------------------------------------------------- ตัวช่วยอื่น */
function tableBox(head, rows, opt) {
  opt = opt || {};
  if (!rows.length) return '<div class="empty">' + h(opt.empty || 'ไม่มีข้อมูล') + '</div>';
  return '<div class="tbox" ' + (opt.maxh ? 'style="max-height:' + opt.maxh + '"' : '') + '><table class="tb"><thead><tr>' +
    head.map(function (x) { return '<th' + (x.n ? ' class="n"' : '') + '>' + h(x.t || x) + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        var n = head[i] && head[i].n ? ' class="n"' : '';
        return '<td' + n + '>' + (c == null ? '' : c) + '</td>';
      }).join('') + '</tr>';
    }).join('') +
    '</tbody>' + (opt.foot ? '<tfoot><tr>' + opt.foot.map(function (c, i) {
      var n = head[i] && head[i].n ? ' class="n"' : '';
      return '<td' + n + '>' + (c == null ? '' : c) + '</td>';
    }).join('') + '</tr></tfoot>' : '') + '</table></div>';
}

function downloadLinks(files) {
  return files.map(function (f) {
    return '<div class="row" style="margin-top:.35rem"><i class="bi bi-file-earmark-spreadsheet"></i>' +
      '<a href="' + f.url + '" target="_blank" rel="noopener">' + h(f.fileName) + '</a>' +
      '<a class="btn btn-sm right" href="' + f.download + '" target="_blank" rel="noopener"><i class="bi bi-download"></i> ดาวน์โหลด</a></div>';
  }).join('');
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
