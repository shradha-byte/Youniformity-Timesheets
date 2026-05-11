// ============================================================
//  YCPL HR Module — plug-in for internal portal (index.html)
//
//  ADD TO index.html (after module-crm.js):
//       <script src="module-hr.js"></script>
//
//  REQUIRES in index.html:
//    var SCRIPT_URL = 'your-portal-api.gs-url';
//    Functions: api(action, payload), go(view, el), toast(msg, type)
// ============================================================

(function () {
  'use strict';

  // ── Module state ─────────────────────────────────────────────
  var _offerRows = [];
  var _hrRows    = [];

  // Kanban stage order
  var STAGES = [
    'New Candidate',
    'Pre-Offer Sent',
    'Offer Sent',
    'Offer Accepted',
    'Onboarded',
    'Active',
    'Exit Initiated',
    'Offboarded',
  ];

  // ── Boot ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  function _init() {
    _injectStyles();
    _injectViews();
    _injectNav();
    _hookGlobalGo();
  }


  // ══════════════════════════════════════════════════════════════
  // NAV INJECTION — "HR" section
  // ══════════════════════════════════════════════════════════════

  function _injectNav() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    var section = document.createElement('div');
    section.className = 'sidebar-section';
    section.id = 'hr-nav-section';
    section.innerHTML =
      '<div class="sidebar-label">HR</div>' +
      '<div class="nav-item" id="nav-hr-pipeline" onclick="hrGo(\'hr-pipeline\',this)" data-view="hr-pipeline">' +
        '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<rect x="3" y="3" width="4" height="18" rx="1"/>' +
          '<rect x="10" y="7" width="4" height="14" rx="1"/>' +
          '<rect x="17" y="11" width="4" height="10" rx="1"/>' +
        '</svg> HR Pipeline' +
      '</div>' +
      '<div class="nav-item" id="nav-hr-onboarding" onclick="hrGo(\'hr-onboarding\',this)" data-view="hr-onboarding">' +
        '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
          '<circle cx="12" cy="7" r="4"/>' +
          '<line x1="18" y1="8" x2="23" y2="13"/>' +
          '<line x1="23" y1="8" x2="18" y2="13"/>' +
        '</svg> Onboarding' +
      '</div>' +
      '<div class="nav-item" id="nav-hr-offboarding" onclick="hrGo(\'hr-offboarding\',this)" data-view="hr-offboarding">' +
        '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M17 16l4-4m0 0l-4-4m4 4H7"/>' +
          '<path d="M3 21v-2a4 4 0 0 1 4-4h4"/>' +
          '<path d="M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>' +
        '</svg> Offboarding' +
      '</div>';

    // Insert before Management section, or after Business section (crm)
    var mgr = document.getElementById('mgr-section');
    var crm = document.getElementById('crm-nav-section');
    if (mgr)       sidebar.insertBefore(section, mgr);
    else if (crm)  crm.parentNode.insertBefore(section, crm.nextSibling);
    else           sidebar.appendChild(section);
  }


  // ══════════════════════════════════════════════════════════════
  // VIEW INJECTION
  // ══════════════════════════════════════════════════════════════

  function _injectViews() {
    var main = document.querySelector('.main-content') || document.querySelector('main') || document.body;

    // Pipeline view
    var pipeline = document.createElement('div');
    pipeline.id        = 'view-hr-pipeline';
    pipeline.className = 'view-section';
    pipeline.style.display = 'none';
    pipeline.innerHTML = _pipelineHTML();
    main.appendChild(pipeline);

    // Onboarding view (add candidate)
    var onboarding = document.createElement('div');
    onboarding.id        = 'view-hr-onboarding';
    onboarding.className = 'view-section';
    onboarding.style.display = 'none';
    onboarding.innerHTML = _onboardingHTML();
    main.appendChild(onboarding);

    // Offboarding view
    var offboarding = document.createElement('div');
    offboarding.id        = 'view-hr-offboarding';
    offboarding.className = 'view-section';
    offboarding.style.display = 'none';
    offboarding.innerHTML = _offboardingHTML();
    main.appendChild(offboarding);

    // Add candidate modal
    var modal = document.createElement('div');
    modal.id        = 'hr-candidate-modal';
    modal.className = 'hr-modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = _candidateModalHTML();
    document.body.appendChild(modal);
  }


  // ══════════════════════════════════════════════════════════════
  // NAV ROUTING
  // ══════════════════════════════════════════════════════════════

  window.hrGo = function (viewId, el) {
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
    if (el) el.classList.add('active');

    // Hide all view-section elements
    document.querySelectorAll('.view-section').forEach(function (v) { v.style.display = 'none'; });

    var view = document.getElementById('view-' + viewId);
    if (view) view.style.display = 'block';

    if (viewId === 'hr-pipeline')    _loadPipeline();
    if (viewId === 'hr-onboarding')  _loadOnboarding();
    if (viewId === 'hr-offboarding') _loadOffboarding();
  };

  function _hookGlobalGo() {
    var orig = window.go;
    window.go = function (viewId, el) {
      // Deactivate HR nav items when navigating away
      if (viewId && viewId.indexOf('hr-') !== 0) {
        document.querySelectorAll('#hr-nav-section .nav-item').forEach(function (n) { n.classList.remove('active'); });
      }
      if (typeof orig === 'function') orig(viewId, el);
    };
  }


  // ══════════════════════════════════════════════════════════════
  // PIPELINE — DATA LOADING
  // ══════════════════════════════════════════════════════════════

  function _loadPipeline() {
    var board = document.getElementById('hr-kanban-board');
    if (board) board.innerHTML = '<p class="hr-loading">Loading pipeline…</p>';

    _apiCall('getHRPipeline', {}, function (data) {
      if (data.error) {
        if (board) board.innerHTML = '<p class="hr-error">Error: ' + _esc(data.error) + '</p>';
        return;
      }
      _offerRows = data.offerRows || [];
      _hrRows    = data.hrRows    || [];
      _renderKanban();
    });
  }


  // ══════════════════════════════════════════════════════════════
  // PIPELINE — KANBAN RENDER
  // ══════════════════════════════════════════════════════════════

  function _stageOf(row, source) {
    if (source === 'offer') {
      var offerSent  = row['Offer Sent Date'] || row['Offer Sent'] || '';
      var formStatus = row['Form Sent Status'] || '';
      var offerSub   = row['Offer Submitted Date'] || '';
      var addedHRID  = row['Added / HRID'] || row['ADDED_HRID'] || '';

      if (addedHRID) return null; // moved to HR Sheet — don't show in offer stages
      if (offerSub)  return 'Offer Accepted';
      if (offerSent) return 'Offer Sent';
      if (formStatus === 'Form Sent' || formStatus === 'Submitted') return 'Pre-Offer Sent';
      return 'New Candidate';
    }
    // source === 'hr'
    var status     = row['Status']           || '';
    var personalD  = row['Personal Details'] || '';
    var exitStatus = row['Exit Form Status'] || '';

    if (status === 'Exited')                    return 'Offboarded';
    if (exitStatus && exitStatus !== '')        return 'Exit Initiated';
    if (personalD === 'Submitted')              return 'Active';
    if (personalD === 'Form Sent' || personalD) return 'Onboarded';
    return 'Active';
  }

  function _getRowIndex(row, source) {
    // Returns the 1-based row index on the respective sheet
    // We store it as a meta field when reading — or derive from order
    return row._rowIdx || 0;
  }

  function _renderKanban() {
    var board = document.getElementById('hr-kanban-board');
    if (!board) return;

    // Build stage buckets
    var buckets = {};
    STAGES.forEach(function (s) { buckets[s] = []; });

    // Index offer rows
    _offerRows.forEach(function (r, idx) {
      var stage = _stageOf(r, 'offer');
      if (stage) {
        r._source  = 'offer';
        r._rowIdx  = idx + 2; // 1-based row in sheet (row 1 = header)
        buckets[stage].push(r);
      }
    });

    // Index HR rows
    _hrRows.forEach(function (r, idx) {
      var stage = _stageOf(r, 'hr');
      if (stage) {
        r._source = 'hr';
        r._rowIdx = idx + 2;
        buckets[stage].push(r);
      }
    });

    var html = '';
    STAGES.forEach(function (stage) {
      var cards = buckets[stage];
      html +=
        '<div class="hr-kanban-col">' +
        '<div class="hr-kanban-col-header">' +
          '<span class="hr-kanban-col-title">' + _esc(stage) + '</span>' +
          '<span class="hr-kanban-col-count">' + cards.length + '</span>' +
        '</div>' +
        '<div class="hr-kanban-cards">';
      cards.forEach(function (card) {
        html += _renderCard(card, stage);
      });
      html += '</div></div>';
    });

    board.innerHTML = html || '<p class="hr-empty">No candidates in pipeline.</p>';
  }

  function _renderCard(row, stage) {
    var name    = _esc(row['Name'] || row['name'] || '(unnamed)');
    var pos     = _esc(row['Position'] || '');
    var dept    = _esc(row['Department'] || '');
    var joining = _esc(row['Joining Date'] || '');
    var hrid    = _esc(row['HRID'] || row['HR ID'] || '');
    var source  = row._source;
    var rowIdx  = row._rowIdx;

    var actions = _cardActions(stage, source, rowIdx, row);

    return '<div class="hr-card">' +
      '<div class="hr-card-name">' + (hrid ? '<span class="hr-card-hrid">' + hrid + '</span> ' : '') + name + '</div>' +
      (pos  ? '<div class="hr-card-meta">' + pos  + (dept ? ' · ' + dept : '') + '</div>' : '') +
      (joining ? '<div class="hr-card-date">Joining: ' + joining + '</div>' : '') +
      (actions ? '<div class="hr-card-actions">' + actions + '</div>' : '') +
      '</div>';
  }

  function _cardActions(stage, source, rowIdx, row) {
    if (!rowIdx) return '';
    var btns = '';
    if (stage === 'New Candidate') {
      btns += _btn('Send Pre-Offer Form', 'hrAction("sendPreOfferForm",' + rowIdx + ')');
      btns += _btn('Generate Offer', 'hrAction("generateOffer",' + rowIdx + ')', 'primary');
    } else if (stage === 'Pre-Offer Sent') {
      btns += _btn('Generate Offer Letter', 'hrAction("generateOffer",' + rowIdx + ')', 'primary');
    } else if (stage === 'Offer Sent' || stage === 'Offer Accepted') {
      btns += _btn('Add to HR Sheet', 'hrAction("addToHRSheet",' + rowIdx + ')', 'primary');
    } else if (stage === 'Onboarded') {
      btns += _btn('Generate Contract + NDA', 'hrAction("generateOnboarding",' + rowIdx + ')', 'primary');
    } else if (stage === 'Active') {
      btns += _btn('Generate Exp. Letter', 'hrAction("generateExpLetter",' + rowIdx + ')');
      btns += _btn('Initiate Exit', 'hrAction("initiateExit",' + rowIdx + ')', 'danger');
    } else if (stage === 'Exit Initiated') {
      btns += _btn('Generate Exp. Letter', 'hrAction("generateExpLetter",' + rowIdx + ')', 'primary');
    }
    return btns;
  }

  function _btn(label, onclick, type) {
    var cls = 'hr-btn' + (type ? ' hr-btn-' + type : '');
    return '<button class="' + cls + '" onclick="' + onclick + '">' + _esc(label) + '</button>';
  }

  window.hrAction = function (action, row) {
    var confirmed = true;
    if (action === 'initiateExit') {
      confirmed = confirm('Initiate exit for this employee? An exit feedback form will be emailed.');
    }
    if (!confirmed) return;

    var btn = event && event.target;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    _apiCall(action, { row: row }, function (data) {
      if (btn) { btn.disabled = false; btn.textContent = _actionLabel(action); }
      if (data.error) {
        _toast('Error: ' + data.error, 'error');
      } else {
        _toast(_actionSuccessMsg(action, data), 'success');
        // Reload pipeline to reflect new state
        setTimeout(function () { _loadPipeline(); }, 800);
      }
    });
  };

  function _actionLabel(action) {
    var map = {
      sendPreOfferForm:   'Send Pre-Offer Form',
      generateOffer:      'Generate Offer Letter',
      addToHRSheet:       'Add to HR Sheet',
      generateOnboarding: 'Generate Contract + NDA',
      generateExpLetter:  'Generate Exp. Letter',
      initiateExit:       'Initiate Exit',
    };
    return map[action] || action;
  }

  function _actionSuccessMsg(action, data) {
    if (action === 'addToHRSheet')   return '✅ Added to HR Sheet as ' + (data.hrid || '');
    if (action === 'generateOffer')  return '✅ Offer letter sent!';
    if (action === 'generateOnboarding') return '✅ Contract + NDA sent!';
    if (action === 'generateExpLetter')  return '✅ Experience letter sent!';
    if (action === 'initiateExit')   return '✅ Exit form sent!';
    if (action === 'sendPreOfferForm') return '✅ Pre-offer verification form sent!';
    return '✅ Done';
  }


  // ══════════════════════════════════════════════════════════════
  // ONBOARDING VIEW (Add Candidate)
  // ══════════════════════════════════════════════════════════════

  function _loadOnboarding() {
    // Nothing to load — static form
  }

  window.hrOpenAddCandidate = function () {
    var modal = document.getElementById('hr-candidate-modal');
    if (modal) {
      modal.style.display = 'flex';
      var form = document.getElementById('hr-candidate-form');
      if (form) form.reset();
    }
  };

  window.hrCloseModal = function () {
    var modal = document.getElementById('hr-candidate-modal');
    if (modal) modal.style.display = 'none';
  };

  window.hrSubmitCandidate = function () {
    var form = document.getElementById('hr-candidate-form');
    if (!form) return;
    var data = {};
    var inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function (el) { if (el.name) data[el.name] = el.value; });

    if (!data.name) { _toast('Name is required', 'error'); return; }
    if (!data.email) { _toast('Email is required', 'error'); return; }
    if (!data.empType) { _toast('Employment Type is required', 'error'); return; }

    var btn = document.getElementById('hr-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }

    _apiCall('addCandidate', data, function (resp) {
      if (btn) { btn.disabled = false; btn.textContent = 'Add Candidate'; }
      if (resp.error) {
        _toast('Error: ' + resp.error, 'error');
      } else {
        _toast('✅ Candidate added to Offer Sheet (' + (resp.offerId || '') + ')', 'success');
        hrCloseModal();
      }
    });
  };


  // ══════════════════════════════════════════════════════════════
  // OFFBOARDING VIEW
  // ══════════════════════════════════════════════════════════════

  function _loadOffboarding() {
    var container = document.getElementById('hr-offboarding-list');
    if (!container) return;
    container.innerHTML = '<p class="hr-loading">Loading active employees…</p>';

    _apiCall('getHRPipeline', {}, function (data) {
      if (data.error) { container.innerHTML = '<p class="hr-error">Error: ' + _esc(data.error) + '</p>'; return; }
      var active = (data.hrRows || []).filter(function (r) {
        return (r['Status'] || '').trim() === 'Active';
      });
      if (active.length === 0) {
        container.innerHTML = '<p class="hr-empty">No active employees found.</p>';
        return;
      }
      var html = '<table class="hr-table"><thead><tr>' +
        '<th>HRID</th><th>Name</th><th>Position</th><th>Department</th><th>Joining Date</th><th>Action</th>' +
        '</tr></thead><tbody>';
      active.forEach(function (r, idx) {
        var rowIdx = idx + 2;
        html += '<tr>' +
          '<td>' + _esc(r['HRID']||'')          + '</td>' +
          '<td>' + _esc(r['Name']||'')           + '</td>' +
          '<td>' + _esc(r['Position']||'')       + '</td>' +
          '<td>' + _esc(r['Department']||'')     + '</td>' +
          '<td>' + _esc(r['Joining Date']||'')   + '</td>' +
          '<td><button class="hr-btn hr-btn-danger" onclick="hrAction(\'initiateExit\',' + rowIdx + ')">Initiate Exit</button></td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    });
  }


  // ══════════════════════════════════════════════════════════════
  // API CALL
  // ══════════════════════════════════════════════════════════════

  function _apiCall(action, payload, callback) {
    // Use the global api() function from index.html if available, else fetch directly
    if (typeof api === 'function') {
      api(action, payload)
        .then(function (data) { callback(data); })
        .catch(function (err) { callback({ error: err.message || String(err) }); });
      return;
    }
    // Fallback: direct fetch
    var url   = (typeof SCRIPT_URL !== 'undefined') ? SCRIPT_URL : '';
    var method = (action === 'addCandidate') ? 'POST' : 'GET';
    var opts   = { method: method };
    if (method === 'POST') {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body    = JSON.stringify(Object.assign({ action: action }, payload));
      url          = url;
    } else {
      var params = Object.keys(payload).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]);
      });
      url = url + '?action=' + encodeURIComponent(action) + (params.length ? '&' + params.join('&') : '');
    }
    fetch(url, opts)
      .then(function (r) { return r.json(); })
      .then(function (data) { callback(data); })
      .catch(function (err) { callback({ error: err.message || String(err) }); });
  }


  // ══════════════════════════════════════════════════════════════
  // HTML TEMPLATES
  // ══════════════════════════════════════════════════════════════

  function _pipelineHTML() {
    return '<div class="hr-view-header">' +
      '<h2 class="hr-view-title">HR Pipeline</h2>' +
      '<button class="hr-btn hr-btn-primary" onclick="hrOpenAddCandidate()">+ Add Candidate</button>' +
      '<button class="hr-btn" onclick="_loadPipeline()" style="margin-left:8px;" id="hr-refresh-btn">↻ Refresh</button>' +
      '</div>' +
      '<div id="hr-kanban-board" class="hr-kanban-board"></div>';
  }

  function _onboardingHTML() {
    return '<div class="hr-view-header">' +
      '<h2 class="hr-view-title">Onboarding</h2>' +
      '</div>' +
      '<div class="hr-onboarding-content">' +
      '<div class="hr-onboarding-card">' +
      '<h3>Add New Candidate</h3>' +
      '<p>Add a candidate to the Offer Sheet pipeline. After adding, use the HR Pipeline view to send the pre-offer form and generate the offer letter.</p>' +
      '<button class="hr-btn hr-btn-primary" onclick="hrOpenAddCandidate()">+ Add Candidate</button>' +
      '</div>' +
      '<div class="hr-onboarding-card">' +
      '<h3>HR Pipeline</h3>' +
      '<p>Track all candidates from offer to active status. Take actions like generating offer letters, contracts, and NDA.</p>' +
      '<button class="hr-btn" onclick="hrGo(\'hr-pipeline\', document.getElementById(\'nav-hr-pipeline\'))">View Pipeline</button>' +
      '</div>' +
      '</div>';
  }

  function _offboardingHTML() {
    return '<div class="hr-view-header">' +
      '<h2 class="hr-view-title">Offboarding</h2>' +
      '</div>' +
      '<div id="hr-offboarding-list" class="hr-offboarding-list"><p class="hr-loading">Loading…</p></div>';
  }

  function _candidateModalHTML() {
    var depts   = ['Sustainability','Marketing','Digital Innovation','Operations','Finance','HR','Management','Design','Data Science','Liaison','IT'];
    var deptOpts = depts.map(function (d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');

    return '<div class="hr-modal">' +
      '<div class="hr-modal-header">' +
        '<h3>Add New Candidate</h3>' +
        '<button class="hr-modal-close" onclick="hrCloseModal()">✕</button>' +
      '</div>' +
      '<form id="hr-candidate-form" onsubmit="event.preventDefault(); hrSubmitCandidate();">' +
      '<div class="hr-form-grid">' +

      '<div class="hr-form-group">' +
        '<label>Name <span class="req">*</span></label>' +
        '<input type="text" name="name" placeholder="As HR entered" required>' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Email <span class="req">*</span></label>' +
        '<input type="email" name="email" placeholder="candidate@email.com" required>' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Legal Name</label>' +
        '<input type="text" name="legalName" placeholder="As per Aadhaar">' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Date of Birth</label>' +
        '<input type="date" name="dob">' +
      '</div>' +

      '<div class="hr-form-group">' +
        '<label>Employment Type <span class="req">*</span></label>' +
        '<select name="empType" required>' +
          '<option value="">Select…</option>' +
          '<option value="Employee">Employee</option>' +
          '<option value="Internship">Internship</option>' +
          '<option value="Live Project">Live Project</option>' +
          '<option value="Honorary">Honorary</option>' +
        '</select>' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Role Type</label>' +
        '<select name="roleType">' +
          '<option value="">Select…</option>' +
          '<option value="Paid">Paid</option>' +
          '<option value="Unpaid">Unpaid</option>' +
        '</select>' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Gender</label>' +
        '<select name="gender">' +
          '<option value="">Select…</option>' +
          '<option value="Male">Male</option>' +
          '<option value="Female">Female</option>' +
          '<option value="Other">Other</option>' +
        '</select>' +
      '</div>' +

      '<div class="hr-form-group">' +
        '<label>Position</label>' +
        '<input type="text" name="position" placeholder="e.g. Sustainability Intern">' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Department</label>' +
        '<select name="department">' +
          '<option value="">Select…</option>' +
          deptOpts +
        '</select>' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Reporting To</label>' +
        '<input type="text" name="reportingTo" placeholder="Mr. Manoj Kumar, COO">' +
      '</div>' +

      '<div class="hr-form-group">' +
        '<label>Joining Date</label>' +
        '<input type="date" name="joiningDate">' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Duration (months, interns only)</label>' +
        '<input type="number" name="duration" min="1" max="24" placeholder="e.g. 3">' +
      '</div>' +
      '<div class="hr-form-group">' +
        '<label>Stipend / Salary (₹/mo)</label>' +
        '<input type="number" name="stipend" min="0" placeholder="0 for unpaid">' +
      '</div>' +

      '</div>' + // hr-form-grid

      '<div class="hr-modal-footer">' +
        '<button type="button" class="hr-btn" onclick="hrCloseModal()">Cancel</button>' +
        '<button type="submit" class="hr-btn hr-btn-primary" id="hr-submit-btn">Add Candidate</button>' +
      '</div>' +
      '</form>' +
      '</div>';
  }


  // ══════════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════════

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _toast(msg, type) {
    if (typeof toast === 'function') { toast(msg, type); return; }
    console.log('[HR Module]', msg);
  }


  // ══════════════════════════════════════════════════════════════
  // STYLES
  // ══════════════════════════════════════════════════════════════

  function _injectStyles() {
    var css = `
      /* ── HR Kanban Board ───────────────────────────────── */
      .hr-view-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px 12px;
        flex-wrap: wrap;
      }
      .hr-view-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text, #1a1a2e);
        margin: 0;
        flex: 1;
      }

      .hr-kanban-board {
        display: flex;
        gap: 12px;
        padding: 0 24px 24px;
        overflow-x: auto;
        min-height: 500px;
        align-items: flex-start;
      }
      .hr-kanban-col {
        flex: 0 0 220px;
        background: var(--card-bg, #f5f6fa);
        border-radius: 10px;
        padding: 0 0 12px;
        min-height: 200px;
      }
      .hr-kanban-col-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 2px solid var(--green, #1A5C2E);
      }
      .hr-kanban-col-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--green, #1A5C2E);
      }
      .hr-kanban-col-count {
        background: var(--green, #1A5C2E);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        min-width: 20px;
        text-align: center;
      }
      .hr-kanban-cards {
        padding: 10px 8px 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .hr-card {
        background: var(--card-bg2, #fff);
        border-radius: 8px;
        padding: 10px 12px;
        border: 1px solid var(--border, #e8eaf6);
        box-shadow: 0 1px 3px rgba(0,0,0,.06);
      }
      .hr-card-hrid {
        font-size: 10px;
        font-weight: 700;
        color: var(--green, #1A5C2E);
        background: rgba(26,92,46,.1);
        padding: 1px 5px;
        border-radius: 4px;
      }
      .hr-card-name {
        font-weight: 600;
        font-size: 13px;
        color: var(--text, #1a1a2e);
        margin-bottom: 3px;
      }
      .hr-card-meta {
        font-size: 11px;
        color: var(--text-muted, #888);
        margin-bottom: 2px;
      }
      .hr-card-date {
        font-size: 11px;
        color: var(--gold, #C8922A);
        margin-bottom: 6px;
      }
      .hr-card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }

      /* ── Buttons ───────────────────────────────────────── */
      .hr-btn {
        background: var(--card-bg, #f0f0f5);
        color: var(--text, #333);
        border: 1px solid var(--border, #ddd);
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
      }
      .hr-btn:hover { filter: brightness(.95); }
      .hr-btn:disabled { opacity: .5; cursor: not-allowed; }
      .hr-btn-primary {
        background: var(--green, #1A5C2E);
        color: #fff;
        border-color: var(--green, #1A5C2E);
      }
      .hr-btn-danger {
        background: #c0392b;
        color: #fff;
        border-color: #c0392b;
      }

      /* ── Loading / Error / Empty ───────────────────────── */
      .hr-loading, .hr-error, .hr-empty {
        padding: 24px;
        text-align: center;
        color: var(--text-muted, #888);
        font-size: 14px;
      }
      .hr-error { color: #c0392b; }

      /* ── Table ─────────────────────────────────────────── */
      .hr-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        margin-top: 8px;
      }
      .hr-table th {
        background: var(--green, #1A5C2E);
        color: #fff;
        font-weight: 600;
        padding: 9px 12px;
        text-align: left;
      }
      .hr-table td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border, #eee);
        vertical-align: middle;
      }
      .hr-table tbody tr:hover { background: rgba(0,0,0,.02); }

      /* ── Offboarding list ──────────────────────────────── */
      .hr-offboarding-list {
        padding: 0 24px 24px;
      }

      /* ── Onboarding cards ──────────────────────────────── */
      .hr-onboarding-content {
        padding: 0 24px 24px;
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }
      .hr-onboarding-card {
        background: var(--card-bg2, #fff);
        border-radius: 12px;
        border: 1px solid var(--border, #e8eaf6);
        padding: 24px;
        flex: 1 1 280px;
        max-width: 380px;
      }
      .hr-onboarding-card h3 {
        margin: 0 0 8px;
        font-size: 15px;
        font-weight: 700;
        color: var(--green, #1A5C2E);
      }
      .hr-onboarding-card p {
        font-size: 13px;
        color: var(--text-muted, #888);
        margin: 0 0 16px;
        line-height: 1.5;
      }

      /* ── Modal ─────────────────────────────────────────── */
      .hr-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.45);
        z-index: 9000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .hr-modal {
        background: var(--card-bg2, #fff);
        border-radius: 14px;
        width: 100%;
        max-width: 680px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
      }
      .hr-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px 16px;
        border-bottom: 1px solid var(--border, #eee);
        position: sticky;
        top: 0;
        background: var(--card-bg2, #fff);
        z-index: 1;
      }
      .hr-modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--text, #1a1a2e);
      }
      .hr-modal-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: var(--text-muted, #888);
        padding: 4px;
        border-radius: 4px;
      }
      .hr-modal-close:hover { background: var(--hover, #f0f0f5); }
      .hr-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 24px 20px;
        border-top: 1px solid var(--border, #eee);
        position: sticky;
        bottom: 0;
        background: var(--card-bg2, #fff);
      }
      .hr-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        padding: 20px 24px;
      }
      @media (max-width: 540px) { .hr-form-grid { grid-template-columns: 1fr; } }
      .hr-form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .hr-form-group label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-muted, #555);
      }
      .hr-form-group input,
      .hr-form-group select,
      .hr-form-group textarea {
        padding: 8px 10px;
        border: 1px solid var(--border, #ddd);
        border-radius: 6px;
        font-size: 13px;
        background: var(--input-bg, #fafafa);
        color: var(--text, #333);
        outline: none;
        transition: border .15s;
      }
      .hr-form-group input:focus,
      .hr-form-group select:focus { border-color: var(--green, #1A5C2E); }
      .req { color: #e74c3c; }
    `;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

})();
