# Keka-style Profile & Timesheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Two independent subsystems.** Tasks 1–6 = Timesheet Grid. Tasks 7–14 = Profile Customisation. Either block can be done and tested on its own without touching the other.

**Goal:** Replace the chip-based weekly timesheet with a Keka-style project×day grid, and replace the read-only profile with a 5-tab editable profile with photo upload and document storage.

**Architecture:** All changes are inside one file — `index.html` (~4500 lines, vanilla JS/HTML/CSS, no build step). The timesheet rewrites `renderWeek` / `buildWeekRows` / `collectWeekEntries` while preserving the `yt_logs` localStorage format so History, Approvals, and Analytics continue working. Profile adds a `yt_profile_<name>` localStorage key.

**Tech Stack:** Vanilla JS (ES5), HTML5, CSS3, localStorage. No server required — open `index.html` directly in a browser to test.

---

## File Map

All changes to: `index.html`

| Lines | What changes |
|---|---|
| CSS block (~line 12–554) | Add timesheet grid CSS + profile tab CSS |
| `#view-timesheet` (~773–810) | Replace with grid table skeleton |
| `#view-profile` (~1115–1148) | Replace with tabbed layout |
| `go()` function (~2299–2316) | Add `timesheet` and update `profile` handlers |
| `showApp()` (~2276) | Replace `renderWeek()` call |
| `changeWeek()` (~2435–2439) | Replace `renderWeek()` call |
| `renderWeek()` + `buildWeekRows()` + `renderChips()` + `updateWeekProgress()` (~2441–2578) | Delete these 4 functions, replace with new grid functions |
| `collectWeekEntries()` + `autosaveDraft()` + `saveDraft()` + `submitWeek()` (~2631–2672) | Rewrite all four |
| `loadProfile()` + `buildHeatmap()` + `buildMonthlySummary()` (~3460–3534) | Rewrite `loadProfile()`, keep `buildHeatmap()` + `buildMonthlySummary()` unchanged |
| After line ~3534 | Add all new profile JS functions |

---

## ── PART 1: TIMESHEET GRID ──────────────────────────────────────

---

### Task 1: Add Timesheet Grid CSS

**Files:**
- Modify: `index.html` — CSS block, insert before the closing `</style>` tag (around line 553)

- [ ] **Step 1: Locate the closing `</style>` tag**

  Search for `</style>` — it appears around line 554, just before `<script src="https://accounts.google.com/...">`. Insert the following block immediately before it.

- [ ] **Step 2: Insert the CSS**

```css
/* ── TIMESHEET GRID ── */
.ts-grid{width:100%;border-collapse:collapse;font-size:12.5px}
.ts-grid th,.ts-grid td{border:1px solid var(--border);padding:0}
.ts-col-proj{width:180px;min-width:150px;text-align:left}
.ts-col-day{min-width:90px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--green-bg2);padding:8px 6px}
.ts-col-day.ts-today{background:var(--green-bg);color:var(--brand)}
.ts-day-num{font-weight:400;text-transform:none;letter-spacing:0;display:block;margin-top:2px;color:var(--text-muted)}
.ts-col-total{width:72px;min-width:72px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--green-bg2);padding:8px 6px}
.ts-head-row th{background:var(--green-bg2)}
.ts-status-row td{padding:5px 6px;background:#FAFCFF}
.ts-status-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;padding:6px 12px!important;text-align:left}
.ts-status-cell{text-align:center}
.ts-status-sel{border:1.5px solid var(--border);border-radius:6px;padding:4px 6px;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;outline:none;width:100%;max-width:90px;transition:.15s}
.ts-st-present{background:var(--green-bg);color:var(--brand);border-color:var(--green-border)}
.ts-st-wfh{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
.ts-st-leave{background:#FEF3C7;color:#92400E;border-color:#FDE68A}
.ts-st-holiday{background:var(--gold-bg);color:var(--gold-txt);border-color:#FCD34D}
.ts-proj-row td{vertical-align:middle}
.ts-proj-name-cell{padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:40px}
.ts-proj-nm{font-size:12.5px;font-weight:600;color:var(--text-dark);flex:1;line-height:1.3}
.ts-remove-btn{background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:15px;padding:0 2px;line-height:1;flex-shrink:0;transition:.1s}
.ts-remove-btn:hover{color:var(--red)}
.ts-hours-cell{text-align:center;padding:4px 5px}
.ts-hours-cell.ts-cell-disabled{background:#F9F9F9}
.ts-hours-inp{width:70px;padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:13px;font-weight:700;color:var(--text-dark);background:#fff;outline:none;text-align:center;transition:.15s}
.ts-hours-inp:focus{border-color:var(--brand)}
.ts-hours-inp:disabled{background:#F3F4F6;color:#C4C9D4;cursor:not-allowed;border-color:var(--border)}
.ts-hours-inp::-webkit-inner-spin-button,.ts-hours-inp::-webkit-outer-spin-button{opacity:0}
.ts-row-total{text-align:center;font-size:12px;font-weight:700;color:var(--brand);padding:6px 8px;background:var(--green-bg2)}
.ts-add-row td{padding:10px 12px;border-top:2px dashed var(--green-border)}
.ts-add-proj-btn{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--brand);background:none;border:1px dashed var(--green-border);border-radius:5px;padding:4px 10px;cursor:pointer;font-family:inherit;transition:.15s}
.ts-add-proj-btn:hover{background:var(--green-bg);border-color:var(--brand)}
.ts-totals-row td{background:var(--green-bg2);padding:7px 8px;font-weight:700}
.ts-totals-label{font-size:11.5px;font-weight:700;color:var(--text-dark);padding-left:12px!important}
.ts-day-total{text-align:center;font-size:12.5px;color:var(--text-dark)}
.ts-dt-green{color:var(--brand)}
.ts-dt-amber{color:var(--amber)}
.ts-week-total-cell{text-align:center;font-size:13px;font-weight:800;color:var(--brand)}

/* ── PROFILE TABS ── */
.prof-layout{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start}
.prof-photo-wrap{position:relative;width:64px;height:64px;margin:0 auto 12px;cursor:pointer}
.prof-photo-img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.2);display:none}
.prof-tabs{display:flex;gap:4px;flex-wrap:wrap;padding:14px 18px 0;border-bottom:1px solid var(--green-border)}
.prof-tab-btn{padding:7px 16px;border-radius:8px 8px 0 0;border:1.5px solid transparent;border-bottom:none;background:transparent;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--text-muted);cursor:pointer;transition:.15s;margin-bottom:-1px}
.prof-tab-btn:hover{color:var(--brand);background:var(--green-bg2)}
.prof-tab-btn.active{background:var(--surface);border-color:var(--green-border);color:var(--brand)}
.prof-tab-content-inner{padding:18px 20px}
.prof-section-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--green-border)}
.prof-section-title{font-size:14px;font-weight:700;color:var(--brand)}
.prof-field-row{display:grid;grid-template-columns:160px 1fr;align-items:start;padding:10px 0;border-bottom:1px solid var(--border);gap:12px}
.prof-field-row:last-child{border-bottom:none}
.prof-field-label{font-size:12px;font-weight:600;color:var(--text-muted);padding-top:2px}
.prof-field-value{font-size:13px;color:var(--text-dark);word-break:break-word}
.prof-field-value.masked{font-family:monospace;letter-spacing:.1em}
.prof-field-input{width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-family:inherit;font-size:13px;color:var(--text-body);background:var(--surface);outline:none;transition:.15s}
.prof-field-input:focus{border-color:var(--brand)}
.prof-field-input[rows]{resize:vertical;min-height:60px}
.edu-entry{background:var(--green-bg2);border:1px solid var(--green-border);border-radius:8px;padding:12px 14px;margin-bottom:10px;position:relative}
.edu-entry-del{position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:16px;padding:0;line-height:1}
.edu-entry-del:hover{color:var(--red)}
.doc-slot{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);gap:12px;flex-wrap:wrap}
.doc-slot:last-child{border-bottom:none}
.doc-slot-name{font-size:13px;font-weight:600;color:var(--text-dark);min-width:140px}
.doc-slot-status{font-size:12px;color:var(--text-muted);flex:1}
.doc-slot-status.uploaded{color:var(--brand);font-weight:600}
.doc-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}
@media(max-width:768px){.prof-layout{grid-template-columns:1fr}}
```

- [ ] **Step 3: Verify in browser**

  Open `index.html` → navigate to Timesheet. The page should look the same as before (new CSS classes aren't used yet). No console errors. ✓

---

### Task 2: Replace `#view-timesheet` HTML

**Files:**
- Modify: `index.html` lines 773–810 — replace `#view-timesheet` inner content

- [ ] **Step 1: Find the block to replace**

  Locate lines 773–810. The block starts with `<div class="view" id="view-timesheet">` and ends just before `<!--  HISTORY  -->` at line 812. Replace the entire inner content (keeping the outer `<div class="view" id="view-timesheet">` wrapper) with:

```html
    <div class="view" id="view-timesheet">
      <div class="page-header">
        <div class="page-title">Weekly Timesheet</div>
        <div class="page-sub">Log your hours by project for each working day</div>
      </div>

      <!-- Week nav + progress -->
      <div class="week-progress-wrap">
        <div class="week-header">
          <div class="week-nav">
            <button class="week-nav-btn" onclick="changeWeek(-1)">&#8249;</button>
            <span class="week-label" id="week-label">Week of &mdash;</span>
            <button class="week-nav-btn" id="btn-next-week" onclick="changeWeek(1)">&#8250;</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-outline btn-sm" onclick="saveDraft()">Save Draft</button>
            <button class="btn btn-gold btn-sm" onclick="submitWeek()">Submit for Approval</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11.5px;font-weight:600;color:var(--text-muted)">Weekly Progress</span>
          <span style="font-size:12px;font-weight:700;color:var(--text-dark)" id="week-progress-label">0h / 45h</span>
        </div>
        <div class="week-progress-bar"><div class="week-progress-fill" id="week-progress-fill" style="width:0%"></div></div>
      </div>

      <!-- Grid card -->
      <div class="card">
        <div style="overflow-x:auto">
          <table class="ts-grid" id="ts-grid"></table>
        </div>
        <div class="week-footer">
          <div class="week-total-txt" id="week-total-txt">Total: <strong>0h</strong></div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="saveDraft()">Save Draft</button>
            <button class="btn btn-gold btn-sm" onclick="submitWeek()">Submit for Approval</button>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Verify in browser**

  Navigate to Timesheet. You should see the week nav + progress bar, and an empty card below (the `<table id="ts-grid">` is empty — it gets populated by JS in Task 3). No console errors. ✓

---

### Task 3: Add Timesheet Grid Core JS

**Files:**
- Modify: `index.html` — insert after the closing `}` of `function buildMonthlySummary` (~line 3534), before `//  FOCUS TIMER`

- [ ] **Step 1: Insert the following functions after `buildMonthlySummary`**

```js
// ── TIMESHEET GRID ────────────────────────────────────────────

function tsLoadState() {
  var ws = new Date(currentWeekStart).toISOString().slice(0,10);
  var raw = localStorage.getItem('yt_ts_'+currentUser.name+'_'+ws);
  if (!raw) return {rows:{}, statuses:{}};
  try { return JSON.parse(raw); } catch(e) { return {rows:{}, statuses:{}}; }
}

function tsSaveState() {
  var ws = new Date(currentWeekStart).toISOString().slice(0,10);
  var rows = {};
  document.querySelectorAll('.ts-proj-row').forEach(function(tr) {
    var pn = tr.dataset.proj;
    if (!pn) return;
    rows[pn] = {};
    tr.querySelectorAll('.ts-hours-inp').forEach(function(inp) {
      var v = parseFloat(inp.value) || 0;
      if (v > 0) rows[pn][inp.dataset.date] = v;
    });
  });
  var statuses = {};
  document.querySelectorAll('.ts-status-sel').forEach(function(sel) {
    statuses[sel.dataset.date] = sel.value;
  });
  localStorage.setItem('yt_ts_'+currentUser.name+'_'+ws, JSON.stringify({rows:rows, statuses:statuses}));
}

function renderTimesheetGrid() {
  var ws     = new Date(currentWeekStart);
  var wsStr  = ws.toISOString().slice(0,10);
  var today  = new Date().toISOString().slice(0,10);
  var thisWS = getWeekStart(new Date());

  // Week label
  var we  = new Date(ws); we.setDate(we.getDate()+4); // Friday
  var fmt = function(d){ return d.getDate()+' '+d.toLocaleString('default',{month:'short'}); };
  var lbl = document.getElementById('week-label');
  if (lbl) lbl.textContent = 'Week of '+fmt(ws)+' – '+fmt(we)+', '+we.getFullYear();

  var nextBtn = document.getElementById('btn-next-week');
  if (nextBtn) { nextBtn.disabled = wsStr >= thisWS; nextBtn.style.opacity = wsStr >= thisWS ? '.35' : '1'; }

  // Mon–Fri dates
  var days = [];
  for (var i = 0; i < 5; i++) {
    var d = new Date(ws); d.setDate(d.getDate()+i);
    days.push(d);
  }

  // Assigned active projects for this user
  var projs = (JSON.parse(localStorage.getItem('yt_projects')||'null')||[])
    .filter(function(p){ return (p.assignedTo||[]).indexOf(currentUser.name) > -1 && p.status === 'active'; });

  // Saved grid state (draft)
  var state       = tsLoadState();
  var savedRows   = state.rows    || {};
  var savedSts    = state.statuses || {};

  // Build project name list: assigned + any extra in saved state
  var projNames = projs.map(function(p){ return p.name; });
  Object.keys(savedRows).forEach(function(pn){ if (projNames.indexOf(pn) < 0) projNames.push(pn); });
  if (!projNames.length) projNames = [''];

  var DSHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // ── HEAD ROW ──
  var thead = '<thead><tr class="ts-head-row"><th class="ts-col-proj"></th>';
  days.forEach(function(d) {
    var ds = d.toISOString().slice(0,10);
    thead += '<th class="ts-col-day'+(ds===today?' ts-today':'')+'" data-date="'+ds+'">'
      +DSHORT[d.getDay()]+'<span class="ts-day-num">'+d.getDate()+' '+d.toLocaleString('default',{month:'short'})+'</span></th>';
  });
  thead += '<th class="ts-col-total">Total</th></tr>';

  // ── STATUS ROW ──
  thead += '<tr class="ts-status-row"><td class="ts-status-label">Status</td>';
  days.forEach(function(d) {
    var ds   = d.toISOString().slice(0,10);
    var isHol = !!HOLIDAYS[ds];
    var def  = isHol ? 'holiday' : 'present';
    var st   = savedSts[ds] !== undefined ? savedSts[ds] : def;
    var opts = ['present','wfh','leave','holiday'].map(function(s){
      return '<option value="'+s+'"'+(st===s?' selected':'')+'>'+{present:'Present',wfh:'WFH',leave:'Leave',holiday:'Holiday'}[s]+'</option>';
    }).join('');
    thead += '<td class="ts-status-cell"><select class="ts-status-sel ts-st-'+st
      +'" data-date="'+ds+'"'+(isHol?' disabled':'')+' onchange="onTsStatusChange(this)">'+opts+'</select></td>';
  });
  thead += '<td></td></tr></thead>';

  // ── TBODY ──
  var tbody = '<tbody id="ts-tbody">';
  projNames.forEach(function(pn) {
    tbody += buildTsProjectRow(pn, days, savedRows[pn]||{}, savedSts);
  });
  tbody += '</tbody>';

  // ── TFOOT ──
  var tfoot = '<tfoot><tr class="ts-add-row"><td colspan="'+(days.length+2)+'">'
    +'<button class="ts-add-proj-btn" onclick="addTsProjectRow()">+ Add Project</button></td></tr>'
    +'<tr class="ts-totals-row"><td class="ts-totals-label">Daily Total</td>';
  days.forEach(function(d) {
    tfoot += '<td class="ts-day-total" id="ts-dt-'+d.toISOString().slice(0,10)+'">—</td>';
  });
  tfoot += '<td class="ts-week-total-cell" id="ts-week-total">—</td></tr></tfoot>';

  var grid = document.getElementById('ts-grid');
  if (!grid) return;
  grid.innerHTML = thead + tbody + tfoot;

  updateTsProgress();
}

function buildTsProjectRow(pn, days, savedHours, savedSts) {
  var rowTotal = 0;
  var cells = '';
  days.forEach(function(d) {
    var ds       = d.toISOString().slice(0,10);
    var st       = savedSts[ds] || (HOLIDAYS[ds] ? 'holiday' : 'present');
    var disabled = st === 'leave' || st === 'holiday';
    var hours    = savedHours[ds] || 0;
    if (!disabled && hours > 0) rowTotal += hours;
    cells += '<td class="ts-hours-cell'+(disabled?' ts-cell-disabled':'')+'">'
      +'<input class="ts-hours-inp" type="number" min="0" max="24" step="0.5"'
      +' data-date="'+ds+'" data-proj="'+escHtml(pn)+'"'
      +' value="'+(hours > 0 ? hours : '')+'"'
      +(disabled ? ' disabled' : '')
      +' oninput="onTsHoursChange(this)" placeholder="—">'
      +'</td>';
  });
  return '<tr class="ts-proj-row" data-proj="'+escHtml(pn)+'">'
    +'<td class="ts-proj-name-cell">'
    +'<span class="ts-proj-nm">'+(pn ? escHtml(pn) : '<em style="color:var(--text-faint)">Project name</em>')+'</span>'
    +'<button class="ts-remove-btn" onclick="removeTsProjectRow(this)" title="Remove row">×</button>'
    +'</td>'
    +cells
    +'<td class="ts-row-total">'+(rowTotal > 0 ? rowTotal.toFixed(1)+'h' : '—')+'</td>'
    +'</tr>';
}

function updateTsProgress() {
  // Daily totals
  document.querySelectorAll('.ts-status-sel').forEach(function(sel) {
    var ds  = sel.dataset.date;
    var sum = 0;
    document.querySelectorAll('.ts-hours-inp[data-date="'+ds+'"]:not(:disabled)').forEach(function(inp){
      sum += parseFloat(inp.value) || 0;
    });
    var el = document.getElementById('ts-dt-'+ds);
    if (el) {
      el.textContent = sum > 0 ? sum.toFixed(1)+'h' : '—';
      el.className = 'ts-day-total'+(sum >= 7.5 && sum <= 9 ? ' ts-dt-green' : sum > 0 && sum < 6 ? ' ts-dt-amber' : '');
    }
  });

  // Week total
  var total = 0;
  document.querySelectorAll('.ts-hours-inp:not(:disabled)').forEach(function(inp){
    total += parseFloat(inp.value) || 0;
  });
  var target = 45;
  var pct    = Math.min(100, (total/target)*100);
  var fill   = document.getElementById('week-progress-fill');
  if (fill) { fill.style.width = pct+'%'; fill.className = 'week-progress-fill'+(total > target ? ' over' : ''); }
  var plbl   = document.getElementById('week-progress-label');
  if (plbl)  plbl.textContent = total.toFixed(1)+'h / '+target+'h';
  var tot    = document.getElementById('week-total-txt');
  if (tot)   tot.innerHTML = 'Total: <strong>'+total.toFixed(1)+'h</strong>';
  var wkTot  = document.getElementById('ts-week-total');
  if (wkTot) wkTot.textContent = total > 0 ? total.toFixed(1)+'h' : '—';
}
```

- [ ] **Step 2: Verify in browser**

  Navigate to Timesheet. The grid table should now render with Mon–Fri columns, a status strip, and your assigned projects as rows (or one empty row if no projects assigned). Dropdowns in the status strip should be styled green/blue/gold. No console errors. ✓

---

### Task 4: Add Timesheet Event Handlers

**Files:**
- Modify: `index.html` — insert immediately after the functions added in Task 3

- [ ] **Step 1: Insert these functions**

```js
function onTsStatusChange(sel) {
  var ds  = sel.dataset.date;
  var st  = sel.value;
  // Update colour class on the select
  sel.className = sel.className.replace(/ts-st-\w+/, '') + ' ts-st-'+st;
  // Enable/disable column inputs
  var disabled = st === 'leave' || st === 'holiday';
  document.querySelectorAll('.ts-hours-inp[data-date="'+ds+'"]').forEach(function(inp) {
    inp.disabled = disabled;
    if (disabled) inp.value = '';
    inp.closest('td').className = 'ts-hours-cell'+(disabled ? ' ts-cell-disabled' : '');
  });
  // Update row totals
  document.querySelectorAll('.ts-proj-row').forEach(function(tr) {
    var rowTotal = 0;
    tr.querySelectorAll('.ts-hours-inp:not(:disabled)').forEach(function(i){ rowTotal += parseFloat(i.value)||0; });
    var tc = tr.querySelector('.ts-row-total');
    if (tc) tc.textContent = rowTotal > 0 ? rowTotal.toFixed(1)+'h' : '—';
  });
  updateTsProgress();
  tsSaveState();
}

function onTsHoursChange(inp) {
  // Update row total
  var row = inp.closest('tr.ts-proj-row');
  if (row) {
    var rowTotal = 0;
    row.querySelectorAll('.ts-hours-inp:not(:disabled)').forEach(function(i){ rowTotal += parseFloat(i.value)||0; });
    var tc = row.querySelector('.ts-row-total');
    if (tc) tc.textContent = rowTotal > 0 ? rowTotal.toFixed(1)+'h' : '—';
  }
  updateTsProgress();
  tsSaveState();
}

function addTsProjectRow() {
  var days = [];
  document.querySelectorAll('.ts-head-row .ts-col-day').forEach(function(th){
    days.push(new Date(th.dataset.date+'T12:00:00'));
  });
  var savedSts = {};
  document.querySelectorAll('.ts-status-sel').forEach(function(sel){ savedSts[sel.dataset.date] = sel.value; });

  // Projects already in grid
  var inGrid = [];
  document.querySelectorAll('.ts-proj-row').forEach(function(tr){ if (tr.dataset.proj) inGrid.push(tr.dataset.proj); });

  // Assigned projects not yet added
  var available = (JSON.parse(localStorage.getItem('yt_projects')||'null')||[])
    .filter(function(p){ return (p.assignedTo||[]).indexOf(currentUser.name) > -1 && p.status === 'active' && inGrid.indexOf(p.name) < 0; });

  var pn;
  if (available.length) {
    var opts = available.map(function(p,i){ return (i+1)+'. '+p.name; }).join('\n');
    var choice = window.prompt('Add project — enter number or type a name:\n\n'+opts, '1');
    if (!choice) return;
    var idx = parseInt(choice.trim()) - 1;
    pn = (!isNaN(idx) && idx >= 0 && idx < available.length) ? available[idx].name : choice.trim();
  } else {
    pn = window.prompt('No unassigned projects available. Enter a custom project name:');
  }
  if (!pn || !pn.trim()) return;
  pn = pn.trim();

  var tbody = document.getElementById('ts-tbody');
  if (tbody) {
    tbody.insertAdjacentHTML('beforeend', buildTsProjectRow(pn, days, {}, savedSts));
    tsSaveState();
  }
}

function removeTsProjectRow(btn) {
  var row = btn.closest('tr.ts-proj-row');
  if (row) { row.remove(); tsSaveState(); updateTsProgress(); }
}
```

- [ ] **Step 2: Verify in browser**

  - Changing a status dropdown to "Leave" should grey out that column's inputs and clear their values. ✓
  - Typing hours in a cell should update the row total on the right and the daily total at the bottom. ✓
  - Clicking "+ Add Project" should prompt, then add a new row. ✓
  - Clicking `×` on a row should remove it. ✓

---

### Task 5: Rewrite Save / Submit and Wire Up Navigation

**Files:**
- Modify: `index.html` — several targeted replacements

- [ ] **Step 1: Replace `collectWeekEntries` and `autosaveDraft` (lines ~2631–2654)**

  Delete `collectWeekEntries()` and `autosaveDraft()` entirely and replace with:

```js
function collectTsEntries() {
  var statuses = {};
  document.querySelectorAll('.ts-status-sel').forEach(function(sel){ statuses[sel.dataset.date] = sel.value; });
  var byDate = {};
  document.querySelectorAll('.ts-hours-inp:not(:disabled)').forEach(function(inp) {
    var date = inp.dataset.date, proj = inp.dataset.proj, hours = parseFloat(inp.value)||0;
    if (!hours) return;
    if (!byDate[date]) byDate[date] = {tasks:[], total:0};
    byDate[date].tasks.push({task:proj, hours:hours});
    byDate[date].total += hours;
  });
  var entries = [];
  Object.keys(byDate).forEach(function(date) {
    var d  = byDate[date];
    if (!d.total) return;
    var st = statuses[date] || 'present';
    entries.push({date:date, hours:d.total, tasks:JSON.stringify(d.tasks), notes:'', wfh:st==='wfh'?'wfh':'office', dayStatus:st});
  });
  return entries;
}
```

- [ ] **Step 2: Replace `saveDraft()` (lines ~2657–2662)**

```js
function saveDraft() {
  tsSaveState();
  var entries = collectTsEntries();
  if (!entries.length) { toast('Add hours to at least one project first','error'); return; }
  Promise.all(entries.map(function(e){
    return api('submitLog', Object.assign({name:currentUser.name}, e, {status:'draft'}));
  })).then(function(results){ toast('Draft saved — '+results.length+' day(s)','success'); });
}
```

- [ ] **Step 3: Replace `submitWeek()` (lines ~2664–2672)**

```js
function submitWeek() {
  tsSaveState();
  var entries = collectTsEntries();
  if (!entries.length) { toast('Add hours to at least one project first','error'); return; }
  Promise.all(entries.map(function(e){
    return api('submitLog', Object.assign({name:currentUser.name}, e, {status:'pending'}));
  })).then(function(results){
    toast(results.length+' day(s) submitted for approval','success');
    renderTimesheetGrid();
    loadDashboardStats();
  });
}
```

- [ ] **Step 4: Update `changeWeek()` (~line 2435–2439)**

  Replace:
  ```js
  function changeWeek(dir) {
    currentWeekStart=new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate()+dir*7);
    renderWeek();
  }
  ```
  With:
  ```js
  function changeWeek(dir) {
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate()+dir*7);
    renderTimesheetGrid();
  }
  ```

- [ ] **Step 5: Replace `renderWeek()` call in `showApp()` (~line 2276)**

  Find the line `renderWeek();` inside `showApp()` and change it to `renderTimesheetGrid();`

- [ ] **Step 6: Delete old functions `renderWeek`, `buildWeekRows`, `renderChips`, `updateWeekProgress`, `getChipsForDate`, `updateDayTotal`, `removeChip`, `setWFH`, `getWFHMode` (lines ~2441–2578)**

  These are all replaced by the new grid functions. Delete the entire block.

- [ ] **Step 7: Add timesheet handler to `go()` (~line 2299)**

  In `go()`, after the `if (viewName==='history')` line, add:
  ```js
  if (viewName==='timesheet')       { renderTimesheetGrid(); }
  ```

- [ ] **Step 8: Verify in browser**

  - Navigate to Timesheet — grid renders with this week's Mon–Fri. ✓
  - Enter hours for a few projects, click "Save Draft" — toast "Draft saved". ✓
  - Navigate away and back — grid re-renders (draft state is gone from DOM but re-loaded from localStorage). ✓
  - Click "Submit for Approval" — toast with count, grid re-renders. ✓
  - Use `←` / `→` week arrows — label and grid update correctly. ✓
  - Go to Submission History — past submitted entries still show. ✓

---

## ── PART 2: PROFILE CUSTOMISATION ──────────────────────────────

---

### Task 6: Replace `#view-profile` HTML

**Files:**
- Modify: `index.html` lines 1115–1148 — replace `#view-profile` inner content

- [ ] **Step 1: Replace the entire `#view-profile` div**

```html
    <div class="view" id="view-profile">
      <div class="page-header">
        <div class="page-title">My Profile</div>
        <div class="page-sub">Manage your personal details, documents, and work information</div>
      </div>
      <div class="prof-layout">

        <!-- Left sidebar -->
        <div>
          <div class="profile-card">
            <div class="profile-top">
              <div class="prof-photo-wrap" onclick="document.getElementById('prof-photo-input').click()">
                <div class="profile-avatar" id="prof-av"></div>
                <img class="prof-photo-img" id="prof-photo-img" alt="Profile photo">
              </div>
              <input type="file" id="prof-photo-input" accept="image/*" style="display:none" onchange="onProfPhotoChange(this)">
              <div class="profile-nm" id="prof-name"></div>
              <div class="profile-dept" id="prof-dept"></div>
              <div class="profile-type" id="prof-type"></div>
              <div style="margin-top:10px">
                <button class="btn btn-outline btn-sm" style="font-size:11px" onclick="document.getElementById('prof-photo-input').click()">Change Photo</button>
              </div>
            </div>
            <div id="profile-stats"></div>
          </div>

          <div class="card" style="margin-top:14px">
            <div class="card-header"><div class="card-title">Activity Heatmap</div><div class="card-sub">Hours logged &mdash; last 12 weeks</div></div>
            <div class="card-body">
              <div style="display:flex;gap:4px;margin-bottom:8px;font-size:10.5px;color:var(--text-faint)">
                <span style="flex:1">Mon</span><span style="flex:1">Tue</span><span style="flex:1">Wed</span><span style="flex:1">Thu</span><span style="flex:1">Fri</span>
              </div>
              <div class="heatmap-wrap"><div class="heatmap-grid" id="heatmap-grid"></div></div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--text-muted)">
                Less
                <div style="width:11px;height:11px;border-radius:2px;background:#EBEDF0"></div>
                <div style="width:11px;height:11px;border-radius:2px;background:#9BE9A8"></div>
                <div style="width:11px;height:11px;border-radius:2px;background:#40C463"></div>
                <div style="width:11px;height:11px;border-radius:2px;background:#216E39"></div>
                More
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <div class="card-header"><div class="card-title">Monthly Summary</div></div>
            <div id="monthly-summary"></div>
          </div>
        </div>

        <!-- Right: tabs -->
        <div class="card" style="overflow:visible">
          <div class="prof-tabs" id="prof-tabs">
            <button class="prof-tab-btn active" data-tab="personal"   onclick="switchProfTab('personal',this)">Personal</button>
            <button class="prof-tab-btn"        data-tab="work"       onclick="switchProfTab('work',this)">Work Info</button>
            <button class="prof-tab-btn"        data-tab="bank"       onclick="switchProfTab('bank',this)">Bank &amp; PAN</button>
            <button class="prof-tab-btn"        data-tab="education"  onclick="switchProfTab('education',this)">Education</button>
            <button class="prof-tab-btn"        data-tab="documents"  onclick="switchProfTab('documents',this)">Documents</button>
          </div>
          <div id="prof-tab-content"></div>
        </div>

      </div>
    </div>
```

- [ ] **Step 2: Verify in browser**

  Navigate to Profile. You should see the sidebar (avatar + stats), heatmap card, monthly summary card on the left, and the 5-tab panel on the right. The tab content is empty — populated in later tasks. No console errors. ✓

---

### Task 7: Profile Data Helpers + Photo Upload + `loadProfile()` rewrite

**Files:**
- Modify: `index.html` — replace `loadProfile()` at ~line 3460

- [ ] **Step 1: Replace the existing `loadProfile()` function (lines ~3460–3496) with**

```js
// ── PROFILE ───────────────────────────────────────────────────

function loadProfileData() {
  var raw = localStorage.getItem('yt_profile_'+currentUser.name);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch(e) { return {}; }
}

function saveProfileData(updates) {
  var existing = loadProfileData();
  Object.keys(updates).forEach(function(k){ existing[k] = updates[k]; });
  localStorage.setItem('yt_profile_'+currentUser.name, JSON.stringify(existing));
}

function loadProfile() {
  var profData = loadProfileData();

  // Sidebar: avatar / photo
  var inits   = currentUser.name.split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();
  var avEl    = document.getElementById('prof-av');
  var photoEl = document.getElementById('prof-photo-img');
  if (avEl) avEl.textContent = inits;
  if (profData.photo && photoEl) {
    photoEl.src = profData.photo; photoEl.style.display = 'block';
    if (avEl) avEl.style.display = 'none';
  } else {
    if (photoEl) photoEl.style.display = 'none';
    if (avEl)    avEl.style.display    = '';
  }

  var el;
  el = document.getElementById('prof-name'); if (el) el.textContent = currentUser.name;
  el = document.getElementById('prof-dept'); if (el) el.textContent = currentUser.dept || '';
  el = document.getElementById('prof-type');
  if (el) el.textContent = ({admin:'Admin',manager:'Manager',employee:'Employee',intern:'Intern'}[currentUser.role] || currentUser.type || 'Employee');

  // Load stats + heatmap (reuses existing helpers below)
  loadProfileStats();

  // Render the active tab
  switchProfTab(activeProfTab);
}

function onProfPhotoChange(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { toast('Photo too large — max 2 MB','error'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    saveProfileData({photo: e.target.result});
    var photoEl = document.getElementById('prof-photo-img');
    var avEl    = document.getElementById('prof-av');
    if (photoEl) { photoEl.src = e.target.result; photoEl.style.display = 'block'; }
    if (avEl)    avEl.style.display = 'none';
    toast('Profile photo updated','success');
  };
  reader.readAsDataURL(file);
}

function loadProfileStats() {
  var months = [], now = new Date();
  for (var i = 0; i < 3; i++) {
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toISOString().slice(0,7));
  }
  Promise.all(months.map(function(m){ return api('getMyLogs',{name:currentUser.name,month:m}); })).then(function(results) {
    var allLogs = [];
    results.forEach(function(r){ allLogs = allLogs.concat(r.logs||[]); });
    var totalH   = allLogs.reduce(function(s,l){ return s+(parseFloat(l.hours)||0); },0);
    var wfhDays  = allLogs.filter(function(l){ return l.wfh==='wfh'; }).length;
    var approved = allLogs.filter(function(l){ return l.status==='approved'; }).length;
    var streak   = 0, day = new Date();
    while (true) {
      var ds = day.toISOString().slice(0,10), dow = day.getDay();
      if (dow===0||dow===6||HOLIDAYS[ds]) { day.setDate(day.getDate()-1); continue; }
      if (allLogs.find(function(l){ return l.date===ds; })) { streak++; day.setDate(day.getDate()-1); } else break;
    }
    var avgHrs = allLogs.length ? totalH/allLogs.length : 0;
    var ps = document.getElementById('profile-stats');
    if (ps) ps.innerHTML = [
      ['Total Hours (3mo)', totalH.toFixed(1)+'h'],
      ['Days Logged',       allLogs.length+' days'],
      ['Approved Logs',     approved],
      ['WFH Days',          wfhDays],
      ['Avg Hours/Day',     avgHrs.toFixed(1)+'h'],
      ['Current Streak',    streak+' days'],
      ['Employee Type',     currentUser.type||'Full-time'],
      ['Department',        currentUser.dept||'—']
    ].map(function(r){
      return '<div class="profile-stat-row"><span class="ps-label">'+r[0]+'</span><span class="ps-val">'+r[1]+'</span></div>';
    }).join('');
    buildHeatmap(allLogs);
    buildMonthlySummary(results, months);
  });
}

var activeProfTab = 'personal';

function switchProfTab(tabName, btn) {
  activeProfTab = tabName;
  document.querySelectorAll('.prof-tab-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  var content  = document.getElementById('prof-tab-content');
  if (!content) return;
  var profData = loadProfileData();
  var html = '';
  if      (tabName==='personal')  html = renderPersonalTab(profData, false);
  else if (tabName==='work')      html = renderWorkTab(profData, false);
  else if (tabName==='bank')      html = renderBankTab(profData, false);
  else if (tabName==='education') html = renderEducationTab(profData, false);
  else if (tabName==='documents') html = renderDocumentsTab(profData);
  content.innerHTML = '<div class="prof-tab-content-inner">'+html+'</div>';
}

function enterProfEditMode(tab) {
  var content  = document.getElementById('prof-tab-content');
  if (!content) return;
  var profData = loadProfileData();
  var html = '';
  if      (tab==='personal')  html = renderPersonalTab(profData, true);
  else if (tab==='work')      html = renderWorkTab(profData, true);
  else if (tab==='bank')      html = renderBankTab(profData, true);
  else if (tab==='education') html = renderEducationTab(profData, true);
  content.innerHTML = '<div class="prof-tab-content-inner">'+html+'</div>';
}
```

- [ ] **Step 2: Verify in browser**

  Navigate to Profile. Avatar and stats should populate as before. The 5 tabs appear. Clicking "Personal" tab shows an empty content area (tab renderers added in next tasks). No console errors. ✓

---

### Task 8: Personal Tab

**Files:**
- Modify: `index.html` — insert after `enterProfEditMode` function added in Task 7

- [ ] **Step 1: Insert**

```js
function renderPersonalTab(profData, editMode) {
  var p = profData.personal || {};
  var fields = [
    {key:'dob',           label:'Date of Birth',       type:'date',     value:p.dob||''},
    {key:'bloodGroup',    label:'Blood Group',         type:'select',   value:p.bloodGroup||'',   opts:['','A+','A-','B+','B-','O+','O-','AB+','AB-']},
    {key:'marital',       label:'Marital Status',      type:'select',   value:p.marital||'',      opts:['','Single','Married','Divorced','Widowed']},
    {key:'gender',        label:'Gender',              type:'select',   value:p.gender||currentUser.gender||'', opts:['','Male','Female','Non-binary','Prefer not to say']},
    {key:'phone',         label:'Phone',               type:'tel',      value:p.phone||''},
    {key:'address',       label:'Home Address',        type:'textarea', value:p.address||''},
    {key:'emergencyName', label:'Emergency Contact',   type:'text',     value:p.emergencyName||''},
    {key:'emergencyPhone',label:'Emergency Phone',     type:'tel',      value:p.emergencyPhone||''},
    {key:'emergencyRel',  label:'Relationship',        type:'text',     value:p.emergencyRel||''}
  ];
  var rows = '<div class="prof-field-row"><span class="prof-field-label">Full Name</span><span class="prof-field-value">'+escHtml(currentUser.name)+'</span></div>';
  fields.forEach(function(f) {
    var inp = '';
    if (editMode) {
      if (f.type === 'select') {
        inp = '<select class="prof-field-input" data-key="'+f.key+'">'
          +f.opts.map(function(o){ return '<option value="'+o+'"'+(f.value===o?' selected':'')+'>'+( o||'— select —')+'</option>'; }).join('')
          +'</select>';
      } else if (f.type === 'textarea') {
        inp = '<textarea class="prof-field-input" data-key="'+f.key+'" rows="3">'+escHtml(f.value)+'</textarea>';
      } else {
        inp = '<input class="prof-field-input" type="'+f.type+'" data-key="'+f.key+'" value="'+escHtml(f.value)+'">';
      }
    }
    rows += '<div class="prof-field-row"><span class="prof-field-label">'+f.label+'</span>'
      +(editMode ? inp : '<span class="prof-field-value">'+(f.value || '<span style="color:var(--text-faint)">Not set</span>')+'</span>')
      +'</div>';
  });
  var hd = '<div class="prof-section-hd"><span class="prof-section-title">Personal Details</span>';
  if (editMode) {
    hd += '<div style="display:flex;gap:8px">'
      +'<button class="btn btn-outline btn-sm" onclick="switchProfTab(\'personal\')">Cancel</button>'
      +'<button class="btn btn-primary btn-sm" onclick="savePersonalTab()">Save Changes</button></div>';
  } else {
    hd += '<button class="btn btn-outline btn-sm" onclick="enterProfEditMode(\'personal\')">Edit</button>';
  }
  return hd+'</div>'+rows;
}

function savePersonalTab() {
  var data = {};
  document.querySelectorAll('#prof-tab-content [data-key]').forEach(function(el){ data[el.dataset.key] = el.value; });
  saveProfileData({personal: data});
  toast('Personal details saved','success');
  switchProfTab('personal');
}
```

- [ ] **Step 2: Verify in browser**

  Click "Personal" tab → fields show with "Not set" placeholders. Click "Edit" → fields become inputs. Change a value, click "Save Changes" → toast success, returns to read mode, value persists on re-open. ✓

---

### Task 9: Work Info Tab

**Files:**
- Modify: `index.html` — insert after `savePersonalTab`

- [ ] **Step 1: Insert**

```js
function renderWorkTab(profData, editMode) {
  var w        = profData.work || {};
  var isAdmin  = currentUser.role === 'admin';
  var empIdx   = DEMO_USERS.findIndex(function(u){ return u.name === currentUser.name; });
  var empId    = 'YU-'+String(empIdx+1).padStart(3,'0');

  var readOnly = [
    {label:'Employee ID',   value:empId},
    {label:'Department',    value:currentUser.dept||'—'},
    {label:'Designation',   value:currentUser.type||'—'},
    {label:'Reporting To',  value:currentUser.reportsTo||'—'},
    {label:'Employment',    value:currentUser.type||'Full-time'}
  ];
  var rows = readOnly.map(function(f){
    return '<div class="prof-field-row"><span class="prof-field-label">'+f.label+'</span>'
      +'<span class="prof-field-value">'+escHtml(f.value)+'</span></div>';
  }).join('');

  // Joining date — admin-editable only
  if (editMode && isAdmin) {
    rows += '<div class="prof-field-row"><span class="prof-field-label">Joining Date</span>'
      +'<input class="prof-field-input" type="date" data-key="joiningDate" value="'+(w.joiningDate||'')+'"></div>';
  } else {
    rows += '<div class="prof-field-row"><span class="prof-field-label">Joining Date</span>'
      +'<span class="prof-field-value">'+(w.joiningDate||'<span style="color:var(--text-faint)">Not set</span>')+'</span></div>';
  }

  // Work location — always employee-editable
  var locVal = w.workLocation || 'WFH';
  if (editMode) {
    rows += '<div class="prof-field-row"><span class="prof-field-label">Work Location</span>'
      +'<select class="prof-field-input" data-key="workLocation">'
      +['WFH','Office','Hybrid'].map(function(l){ return '<option value="'+l+'"'+(locVal===l?' selected':'')+'>'+l+'</option>'; }).join('')
      +'</select></div>';
  } else {
    rows += '<div class="prof-field-row"><span class="prof-field-label">Work Location</span>'
      +'<span class="prof-field-value">'+escHtml(locVal)+'</span></div>';
  }

  var hd = '<div class="prof-section-hd"><span class="prof-section-title">Work Info</span>';
  if (editMode) {
    hd += '<div style="display:flex;gap:8px">'
      +'<button class="btn btn-outline btn-sm" onclick="switchProfTab(\'work\')">Cancel</button>'
      +'<button class="btn btn-primary btn-sm" onclick="saveWorkTab()">Save Changes</button></div>';
  } else {
    hd += '<button class="btn btn-outline btn-sm" onclick="enterProfEditMode(\'work\')">Edit</button>';
  }
  return hd+'</div>'+rows;
}

function saveWorkTab() {
  var data = {};
  document.querySelectorAll('#prof-tab-content [data-key]').forEach(function(el){ data[el.dataset.key] = el.value; });
  saveProfileData({work: data});
  toast('Work info saved','success');
  switchProfTab('work');
}
```

- [ ] **Step 2: Verify in browser**

  Click "Work Info" tab → read-only fields show employee ID, dept, reporting manager. "Work Location" shows WFH. Click Edit → only Work Location is an editable select (for non-admin users). Save → persists. ✓

---

### Task 10: Bank & PAN Tab

**Files:**
- Modify: `index.html` — insert after `saveWorkTab`

- [ ] **Step 1: Insert**

```js
function maskValue(str, showLast) {
  if (!str) return '<span style="color:var(--text-faint)">Not set</span>';
  showLast = showLast || 4;
  if (str.length <= showLast) return str;
  return '•'.repeat(str.length - showLast) + str.slice(-showLast);
}

function renderBankTab(profData, editMode) {
  var b      = profData.bank || {};
  var fields = [
    {key:'bankName',    label:'Bank Name',     type:'text',   value:b.bankName||'',    mask:false},
    {key:'accountNo',   label:'Account No.',   type:'text',   value:b.accountNo||'',   mask:true},
    {key:'ifsc',        label:'IFSC Code',     type:'text',   value:b.ifsc||'',        mask:false},
    {key:'accountType', label:'Account Type',  type:'select', value:b.accountType||'', mask:false, opts:['','Savings','Current']},
    {key:'pan',         label:'PAN Number',    type:'text',   value:b.pan||'',         mask:true}
  ];
  var rows = fields.map(function(f) {
    if (editMode) {
      var inp = f.type === 'select'
        ? '<select class="prof-field-input" data-key="'+f.key+'">'
            +f.opts.map(function(o){ return '<option value="'+o+'"'+(f.value===o?' selected':'')+'>'+( o||'— select —')+'</option>'; }).join('')
            +'</select>'
        : '<input class="prof-field-input" type="text" data-key="'+f.key+'" value="'+escHtml(f.value)+'"'
            +(f.key==='pan'||f.key==='ifsc'?' style="text-transform:uppercase"':'')+' placeholder="'+f.label+'">';
      return '<div class="prof-field-row"><span class="prof-field-label">'+f.label+'</span>'+inp+'</div>';
    }
    var disp = f.mask ? maskValue(f.value) : (f.value || '<span style="color:var(--text-faint)">Not set</span>');
    return '<div class="prof-field-row"><span class="prof-field-label">'+f.label+'</span>'
      +'<span class="prof-field-value'+(f.mask&&f.value?' masked':'')+'">'+disp+'</span></div>';
  }).join('');

  var hd = '<div class="prof-section-hd"><span class="prof-section-title">Bank &amp; PAN Details</span>';
  if (editMode) {
    hd += '<div style="display:flex;gap:8px">'
      +'<button class="btn btn-outline btn-sm" onclick="switchProfTab(\'bank\')">Cancel</button>'
      +'<button class="btn btn-primary btn-sm" onclick="saveBankTab()">Save Changes</button></div>';
  } else {
    hd += '<button class="btn btn-outline btn-sm" onclick="enterProfEditMode(\'bank\')">Edit</button>';
  }
  return hd+'</div>'+rows;
}

function saveBankTab() {
  var data = {};
  document.querySelectorAll('#prof-tab-content [data-key]').forEach(function(el){ data[el.dataset.key] = el.value; });
  if (data.pan)  data.pan  = data.pan.toUpperCase();
  if (data.ifsc) data.ifsc = data.ifsc.toUpperCase();
  saveProfileData({bank: data});
  toast('Bank details saved','success');
  switchProfTab('bank');
}
```

- [ ] **Step 2: Verify in browser**

  Click "Bank & PAN" tab → all fields show "Not set". Click Edit → inputs appear. Enter a 16-digit account number and PAN, save. Return to read mode — account number and PAN should be masked (shows last 4 digits only). ✓

---

### Task 11: Education Tab

**Files:**
- Modify: `index.html` — insert after `saveBankTab`

- [ ] **Step 1: Insert**

```js
function renderEducationTab(profData, editMode) {
  var edu = profData.education || [];
  var hd  = '<div class="prof-section-hd"><span class="prof-section-title">Education</span>';
  if (editMode) {
    hd += '<div style="display:flex;gap:8px">'
      +'<button class="btn btn-outline btn-sm" onclick="switchProfTab(\'education\')">Cancel</button>'
      +'<button class="btn btn-primary btn-sm" onclick="saveEducationTab()">Save Changes</button></div>';
  } else {
    hd += '<button class="btn btn-outline btn-sm" onclick="enterProfEditMode(\'education\')">Edit</button>';
  }
  hd += '</div>';

  if (!edu.length && !editMode) {
    return hd + '<div class="empty"><div class="empty-text">No education entries yet. Click Edit to add.</div></div>';
  }

  var entries = edu.map(function(e, i) {
    if (editMode) {
      return '<div class="edu-entry" data-idx="'+i+'">'
        +'<button class="edu-entry-del" onclick="removeEduEntry(this)" title="Remove">×</button>'
        +'<div class="row2" style="gap:10px;margin-bottom:10px">'
        +'<div><label style="font-size:11px;font-weight:600;color:var(--text-muted)">Degree / Qualification</label>'
        +'<input class="prof-field-input" style="margin-top:4px" type="text" data-edu="'+i+'" data-field="degree" value="'+escHtml(e.degree||'')+'"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:var(--text-muted)">Year</label>'
        +'<input class="prof-field-input" style="margin-top:4px" type="text" data-edu="'+i+'" data-field="year" value="'+escHtml(e.year||'')+'"></div>'
        +'</div>'
        +'<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:600;color:var(--text-muted)">Institution / University</label>'
        +'<input class="prof-field-input" style="margin-top:4px" type="text" data-edu="'+i+'" data-field="institution" value="'+escHtml(e.institution||'')+'"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:var(--text-muted)">Grade / Score</label>'
        +'<input class="prof-field-input" style="margin-top:4px" type="text" data-edu="'+i+'" data-field="grade" value="'+escHtml(e.grade||'')+'"></div>'
        +'</div>';
    }
    return '<div class="edu-entry">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text-dark)">'+escHtml(e.degree||'—')+'</div>'
      +'<div style="font-size:12px;color:var(--text-muted);margin-top:3px">'+escHtml(e.institution||'—')+'</div>'
      +'<div style="font-size:11px;color:var(--text-faint);margin-top:2px">'+escHtml(e.year||'')+(e.grade?' · '+escHtml(e.grade):'')+'</div>'
      +'</div>';
  }).join('');

  var addBtn = editMode ? '<button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="addEduEntry()">+ Add Education</button>' : '';
  return hd + entries + addBtn;
}

function addEduEntry() {
  var profData = loadProfileData();
  var edu = (profData.education || []).concat([{degree:'',institution:'',year:'',grade:''}]);
  saveProfileData({education: edu});
  enterProfEditMode('education');
}

function removeEduEntry(btn) {
  var idx      = parseInt(btn.closest('.edu-entry').dataset.idx);
  var profData = loadProfileData();
  var edu      = profData.education || [];
  edu.splice(idx, 1);
  saveProfileData({education: edu});
  enterProfEditMode('education');
}

function saveEducationTab() {
  var entries = [];
  document.querySelectorAll('#prof-tab-content .edu-entry[data-idx]').forEach(function(entry) {
    var e = {};
    entry.querySelectorAll('[data-field]').forEach(function(inp){ e[inp.dataset.field] = inp.value.trim(); });
    if (e.degree || e.institution) entries.push(e);
  });
  saveProfileData({education: entries});
  toast('Education saved','success');
  switchProfTab('education');
}
```

- [ ] **Step 2: Verify in browser**

  Click "Education" tab → shows "No entries yet" message. Click Edit → "+ Add Education" button appears. Click it → new entry form appends. Fill in degree/institution/year/grade, click Save → read-mode shows the card. Click Edit again → `×` button removes it. ✓

---

### Task 12: Documents Tab

**Files:**
- Modify: `index.html` — insert after `saveEducationTab`

- [ ] **Step 1: Insert**

```js
var PROF_DOC_SLOTS = [
  {key:'aadhaar',    name:'Aadhaar Card'},
  {key:'pan',        name:'PAN Card'},
  {key:'passport',   name:'Passport'},
  {key:'offerLetter',name:'Offer Letter'},
  {key:'degree',     name:'Degree Certificate'},
  {key:'other',      name:'Other Document'}
];

function renderDocumentsTab(profData) {
  var docs = profData.documents || {};
  var hd   = '<div class="prof-section-hd"><span class="prof-section-title">Documents</span>'
    +'<span style="font-size:11px;color:var(--text-faint)">PDF, JPG, PNG &mdash; max 2 MB each</span></div>';
  var slots = PROF_DOC_SLOTS.map(function(s) {
    var doc = docs[s.key];
    return '<div class="doc-slot">'
      +'<span class="doc-slot-name">'+s.name+'</span>'
      +(doc
        ? '<span class="doc-slot-status uploaded">'+escHtml(doc.name)+'</span>'
          +'<div class="doc-actions">'
          +'<a class="btn btn-outline btn-sm" href="'+doc.data+'" target="_blank" rel="noopener">View</a>'
          +'<button class="btn btn-danger btn-sm" onclick="removeDoc(\''+s.key+'\')">Remove</button>'
          +'</div>'
        : '<span class="doc-slot-status">Not uploaded</span>'
          +'<div class="doc-actions">'
          +'<label class="btn btn-outline btn-sm" style="cursor:pointer">Upload'
          +'<input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="uploadDoc(this,\''+s.key+'\')">'
          +'</label>'
          +'</div>'
      )
      +'</div>';
  }).join('');
  return hd + slots;
}

function uploadDoc(input, key) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { toast('File too large — max 2 MB','error'); input.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var profData = loadProfileData();
    var docs     = profData.documents || {};
    docs[key]    = {name: file.name, data: e.target.result};
    saveProfileData({documents: docs});
    toast(file.name+' uploaded','success');
    switchProfTab('documents');
  };
  reader.readAsDataURL(file);
}

function removeDoc(key) {
  if (!confirm('Remove this document?')) return;
  var profData     = loadProfileData();
  var docs         = profData.documents || {};
  delete docs[key];
  saveProfileData({documents: docs});
  toast('Document removed','success');
  switchProfTab('documents');
}
```

- [ ] **Step 2: Verify in browser**

  Click "Documents" tab → 6 slots show "Not uploaded" + Upload button each. Click Upload on "Aadhaar Card" → pick a PNG/PDF under 2 MB → toast "uploaded", slot updates to show filename + View/Remove buttons. Click View → opens in new tab. Click Remove → confirm dialog → slot returns to "Not uploaded". ✓

---

## Self-Review Checklist (for implementer)

After completing all tasks, verify:

- [ ] Timesheet: grid renders on app load and after week navigation
- [ ] Timesheet: Leave/Holiday columns are disabled and greyed
- [ ] Timesheet: daily totals colour correctly (green 7.5–9h, amber <6h)
- [ ] Timesheet: "Save Draft" persists to localStorage and toast fires
- [ ] Timesheet: "Submit for Approval" writes to `yt_logs` and Approvals view shows them
- [ ] Timesheet: Submission History view still reads and renders correctly
- [ ] Profile: all 5 tabs load without errors for every user in DEMO_USERS
- [ ] Profile: photo upload updates avatar across sidebar
- [ ] Profile: bank fields display masked in read mode
- [ ] Profile: documents upload, view, and remove correctly
- [ ] Profile: Work Info tab only shows joining-date edit to admins
- [ ] No JS errors in browser console across all views
