// ============================================================
//  YCPL CRM Module — plug-in for internal portal (index.html)
//
//  ADD TO index.html (3 lines only):
//  1. Before closing </body>:
//       <script src="module-crm.js"></script>
//
//  That's it. The module injects its own nav, views, and styles.
//
//  REQUIRES in index.html:
//    var SCRIPT_URL = 'your-portal-api.gs-url';   ← set this
//    Functions: api(action, payload), go(view, el), toast(msg, type)
// ============================================================

(function () {
  'use strict';

  // ── Module state ─────────────────────────────────────────────
  var _clients  = [];
  var _projects = [];  // client-master projects
  var _leads    = [];
  var _activeClient = null;

  var STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

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
  // NAV INJECTION
  // Inserts a "Business" section before the Management section
  // ══════════════════════════════════════════════════════════════

  function _injectNav() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    var section = document.createElement('div');
    section.className = 'sidebar-section';
    section.id = 'crm-nav-section';
    section.innerHTML =
      '<div class="sidebar-label">Business</div>' +
      '<div class="nav-item" id="nav-crm-clients" onclick="crmGo(\'clients\',this)" data-view="clients">' +
        '<span class="nav-icon">🏢</span> Clients' +
      '</div>' +
      '<div class="nav-item" id="nav-crm-leads" onclick="crmGo(\'leads\',this)" data-view="leads">' +
        '<span class="nav-icon">🎯</span> Leads Pipeline' +
      '</div>';

    var mgr = document.getElementById('mgr-section');
    if (mgr) sidebar.insertBefore(section, mgr);
    else      sidebar.appendChild(section);
  }


  // ══════════════════════════════════════════════════════════════
  // VIEW INJECTION
  // Appends views to <main class="main-content">
  // ══════════════════════════════════════════════════════════════

  function _injectViews() {
    var main = document.querySelector('main.main-content') || document.querySelector('.main-content');
    if (!main) return;

    var views = [
      { id: 'view-clients',       html: _clientsHTML()      },
      { id: 'view-client-detail', html: _clientDetailHTML() },
      { id: 'view-leads',         html: _leadsHTML()         }
    ];

    views.forEach(function (v) {
      var div = document.createElement('div');
      div.className = 'view';
      div.id = v.id;
      div.innerHTML = v.html;
      main.appendChild(div);
    });

    // Lead modal (sits outside main, at body level)
    var modal = document.createElement('div');
    modal.id = 'crm-modal';
    modal.className = 'crm-modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = _leadModalHTML();
    document.body.appendChild(modal);
  }


  // ══════════════════════════════════════════════════════════════
  // NAVIGATION
  // crmGo wraps the portal's go() — handles show/hide + data load
  // ══════════════════════════════════════════════════════════════

  window.crmGo = function (view, el) {
    // go() handles: hide all .view, show target, deactivate all .nav-item, activate el
    if (typeof go === 'function') go(view, el);

    if (view === 'clients') _loadClients();
    if (view === 'leads')   _loadLeads();
  };

  // Back button from client detail → clients list
  window.crmBackToClients = function () {
    crmGo('clients', document.getElementById('nav-crm-clients'));
  };

  // When portal's own nav items are clicked, deactivate CRM nav items
  function _hookGlobalGo() {
    var origGo = window.go;
    if (typeof origGo !== 'function') return;
    window.go = function (view, el) {
      origGo(view, el);
      // If it's not a CRM view, clear CRM nav active states
      var crmViews = ['clients', 'client-detail', 'leads'];
      if (crmViews.indexOf(view) === -1) {
        document.querySelectorAll('#crm-nav-section .nav-item').forEach(function (n) {
          n.classList.remove('active');
        });
      }
    };
  }


  // ══════════════════════════════════════════════════════════════
  // CLIENTS — list
  // ══════════════════════════════════════════════════════════════

  function _loadClients() {
    var list = document.getElementById('crm-client-list');
    if (!list) return;
    list.innerHTML = '<div class="crm-loading">Loading clients…</div>';

    if (!window.SCRIPT_URL && typeof SCRIPT_URL === 'undefined') {
      list.innerHTML = '<div class="crm-empty">⚠️ Set SCRIPT_URL in index.html to connect to live data.</div>';
      return;
    }

    api('getClients', {}).then(function (res) {
      if (res.error) { list.innerHTML = '<div class="crm-empty">Error: ' + _esc(res.error) + '</div>'; return; }
      _clients = res.clients || [];
      _renderClientCards(list, _clients);
      // Load project counts in background
      api('getClientProjects', {}).then(function (r) {
        _projects = r.projects || [];
        _updateProjectCounts();
      });
    }).catch(function () {
      list.innerHTML = '<div class="crm-empty">Could not load clients. Check SCRIPT_URL and API deployment.</div>';
    });
  }

  function _renderClientCards(container, clients) {
    if (!clients.length) {
      container.innerHTML = '<div class="crm-empty">No clients found.</div>';
      return;
    }
    container.innerHTML = clients.map(function (c) {
      var id       = c['Client_id'] || '';
      var name     = c['Client Name'] || '—';
      var industry = c['Industry Type'] || '';
      var city     = c['City'] || '';
      var state    = c['State'] || '';
      var location = [city, state].filter(Boolean).join(', ');
      var contact  = c['Primary Contact'] || '';

      return '<div class="crm-client-card" onclick="crmOpenClient(\'' + _esc(id) + '\')">' +
        '<div class="crm-card-header">' +
          '<div class="crm-avatar">' + (name[0] || '?').toUpperCase() + '</div>' +
          '<div class="crm-card-title-block">' +
            '<div class="crm-client-name">' + _esc(name) + '</div>' +
            '<div class="crm-client-id">' + _esc(id) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="crm-card-tags">' +
          (industry ? '<span class="crm-tag">' + _esc(industry) + '</span>' : '') +
          (location ? '<span class="crm-tag crm-tag-muted">📍 ' + _esc(location) + '</span>' : '') +
        '</div>' +
        '<div class="crm-card-footer">' +
          '<span class="crm-contact-name">' + _esc(contact) + '</span>' +
          '<span class="crm-proj-count" id="crm-pc-' + _esc(id) + '">—</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function _updateProjectCounts() {
    _clients.forEach(function (c) {
      var clientName = c['Client Name'] || '';
      var count = _projects.filter(function (p) {
        return (p['Client Name'] || '') === clientName;
      }).length;
      var el = document.getElementById('crm-pc-' + (c['Client_id'] || ''));
      if (el) el.textContent = count + ' project' + (count !== 1 ? 's' : '');
    });
  }

  window.crmFilterClients = function (query) {
    var q = String(query).toLowerCase();
    var filtered = _clients.filter(function (c) {
      return (c['Client Name']    || '').toLowerCase().includes(q) ||
             (c['Industry Type']  || '').toLowerCase().includes(q) ||
             (c['City']           || '').toLowerCase().includes(q) ||
             (c['Primary Contact']|| '').toLowerCase().includes(q);
    });
    _renderClientCards(document.getElementById('crm-client-list'), filtered);
  };


  // ══════════════════════════════════════════════════════════════
  // CLIENTS — detail
  // ══════════════════════════════════════════════════════════════

  window.crmOpenClient = function (clientId) {
    var client = _clients.find(function (c) { return c['Client_id'] === clientId; });
    if (!client) return;
    _activeClient = client;

    var name     = client['Client Name']       || '—';
    var legal    = client['Legal Name']        || name;
    var industry = client['Industry Type']     || '—';
    var address  = client['Address']           || '';
    var city     = client['City']              || '';
    var state    = client['State']             || '';
    var gst      = client['Company GST']       || '—';
    var url      = client['Client URL']        || '';
    var c1       = client['Primary Contact']   || '—';
    var e1       = client['Email_primary']     || '';
    var c2       = client['Secondary Contact'] || '';
    var e2       = client['Email_secondary']   || '';

    _setText('crm-detail-name',     name);
    _setText('crm-detail-legal',    legal);
    _setText('crm-detail-industry', industry);
    _setText('crm-detail-location', [address, city, state].filter(Boolean).join(', ') || '—');
    _setText('crm-detail-gst',      gst);
    var urlEl = document.getElementById('crm-detail-url');
    if (urlEl) urlEl.innerHTML = url
      ? '<a href="' + _esc(url) + '" target="_blank" rel="noopener">' + _esc(url) + '</a>'
      : '—';
    _setText('crm-detail-c1', c1 + (e1 ? '  ·  ' + e1 : ''));
    _setText('crm-detail-c2', c2 ? c2 + (e2 ? '  ·  ' + e2 : '') : '—');

    // Load projects for this client
    var tbody = document.getElementById('crm-proj-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="crm-empty-cell">Loading…</td></tr>';

    var clientProjects = _projects.filter(function (p) { return p['Client Name'] === name; });
    if (clientProjects.length) {
      _renderProjectRows(clientProjects);
    } else {
      // Fetch fresh
      api('getClientProjects', { client: name }).then(function (res) {
        _renderProjectRows(res.projects || []);
      });
    }

    // Switch to detail view
    if (typeof go === 'function') go('client-detail', null);
  };

  function _renderProjectRows(projects) {
    var tbody = document.getElementById('crm-proj-tbody');
    if (!tbody) return;
    if (!projects.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="crm-empty-cell">No projects on record for this client.</td></tr>';
      return;
    }
    tbody.innerHTML = projects.map(function (p) {
      var status      = p['Status'] || '—';
      var statusClass = 'crm-status-' + status.toLowerCase().replace(/[\s/]+/g, '-');
      return '<tr>' +
        '<td>' + _esc(p['Project_id'] || '') + '</td>' +
        '<td>' + _esc(p['Type of Project'] || '') + '</td>' +
        '<td><span class="crm-badge ' + statusClass + '">' + _esc(status) + '</span></td>' +
        '<td>' + _fmtDate(p['Start Date']) + '</td>' +
        '<td>' + _fmtDate(p['End Date'])   + '</td>' +
        '<td>' + _fmtCurrency(p['Project Amount']) + '</td>' +
      '</tr>';
    }).join('');
  }


  // ══════════════════════════════════════════════════════════════
  // LEADS — kanban
  // ══════════════════════════════════════════════════════════════

  function _loadLeads() {
    STAGES.forEach(function (s) {
      var col = document.getElementById('crm-kanban-' + _slug(s));
      if (col) col.innerHTML = '<div class="crm-kanban-empty">…</div>';
    });

    if (!window.SCRIPT_URL && typeof SCRIPT_URL === 'undefined') {
      STAGES.forEach(function (s) {
        var col = document.getElementById('crm-kanban-' + _slug(s));
        if (col) col.innerHTML = '<div class="crm-kanban-empty">Set SCRIPT_URL to load leads.</div>';
      });
      return;
    }

    api('getLeads', {}).then(function (res) {
      if (res.error) return;
      _leads = res.leads || [];
      _renderKanban();
    }).catch(function () {});
  }

  function _renderKanban() {
    STAGES.forEach(function (s) {
      var slug       = _slug(s);
      var col        = document.getElementById('crm-kanban-' + slug);
      var countEl    = document.getElementById('crm-kanban-count-' + slug);
      var stageLeads = _leads.filter(function (l) { return l['Stage'] === s; });

      if (countEl) countEl.textContent = stageLeads.length;
      if (!col) return;

      if (!stageLeads.length) {
        col.innerHTML = '<div class="crm-kanban-empty">No leads</div>';
        return;
      }
      col.innerHTML = stageLeads.map(function (l) {
        var lid = _esc(l['Lead_id'] || '');
        return '<div class="crm-kanban-card" onclick="crmEditLead(\'' + lid + '\')">' +
          '<div class="crm-kcard-company">' + _esc(l['Company'] || '—') + '</div>' +
          (l['Contact'] ? '<div class="crm-kcard-sub">' + _esc(l['Contact']) + '</div>' : '') +
          (l['Value']   ? '<div class="crm-kcard-val">₹' + _esc(String(l['Value'])) + '</div>' : '') +
          (l['Service'] ? '<span class="crm-kcard-tag">' + _esc(l['Service']) + '</span>' : '') +
        '</div>';
      }).join('');
    });
  }


  // ══════════════════════════════════════════════════════════════
  // LEAD MODAL — new + edit
  // ══════════════════════════════════════════════════════════════

  window.crmNewLead = function () { _openLeadModal(null); };

  window.crmEditLead = function (leadId) {
    var lead = _leads.find(function (l) { return l['Lead_id'] === leadId; });
    _openLeadModal(lead || null);
  };

  function _openLeadModal(lead) {
    var modal = document.getElementById('crm-modal');
    if (!modal) return;
    var f = document.getElementById('crm-lead-form');
    if (!f) return;

    document.getElementById('crm-modal-title').textContent = lead ? 'Edit Lead' : 'New Lead';

    var fields = ['Lead_id', 'Company', 'Contact', 'Email', 'Phone',
                  'Industry', 'Service', 'Stage', 'Value', 'Source', 'Notes'];
    fields.forEach(function (field) {
      var el = f.querySelector('[name="' + field + '"]');
      if (el) el.value = lead ? (lead[field] || '') : (field === 'Stage' ? 'Prospect' : '');
    });
    modal.style.display = 'flex';
  }

  window.crmCloseModal = function () {
    var modal = document.getElementById('crm-modal');
    if (modal) modal.style.display = 'none';
  };

  // Close on overlay click
  document.addEventListener('click', function (e) {
    var modal = document.getElementById('crm-modal');
    if (modal && e.target === modal) crmCloseModal();
  });

  window.crmSaveLead = function () {
    var f = document.getElementById('crm-lead-form');
    if (!f) return;
    var data = {};
    new FormData(f).forEach(function (v, k) { data[k] = v; });
    if (!data['Company']) {
      if (typeof toast === 'function') toast('Company name is required', 'error');
      return;
    }

    var btn = f.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    api('saveLead', data).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = 'Save Lead'; }
      if (res && res.error) {
        if (typeof toast === 'function') toast('Error: ' + res.error, 'error');
        return;
      }
      crmCloseModal();
      if (typeof toast === 'function') toast('Lead saved', 'success');
      _loadLeads();
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Save Lead'; }
      if (typeof toast === 'function') toast('Network error. Try again.', 'error');
    });
  };


  // ══════════════════════════════════════════════════════════════
  // HTML TEMPLATES
  // ══════════════════════════════════════════════════════════════

  function _clientsHTML() {
    return '' +
      '<div class="crm-page-header">' +
        '<div>' +
          '<h2 class="crm-page-title">Clients</h2>' +
          '<p class="crm-page-sub">All client accounts — click a card to view projects</p>' +
        '</div>' +
        '<input class="crm-search" id="crm-client-search" placeholder="Search clients…" ' +
          'oninput="crmFilterClients(this.value)">' +
      '</div>' +
      '<div class="crm-client-grid" id="crm-client-list"></div>';
  }

  function _clientDetailHTML() {
    return '' +
      '<div class="crm-page-header">' +
        '<div>' +
          '<button class="crm-back-btn" onclick="crmBackToClients()">← Back to Clients</button>' +
          '<h2 class="crm-page-title" id="crm-detail-name"></h2>' +
          '<p class="crm-page-sub" id="crm-detail-legal"></p>' +
        '</div>' +
      '</div>' +
      '<div class="crm-detail-grid">' +
        '<div class="crm-info-card">' +
          '<div class="crm-section-label">Company Info</div>' +
          '<div class="crm-info-row"><span>Industry</span><span id="crm-detail-industry"></span></div>' +
          '<div class="crm-info-row"><span>Location</span><span id="crm-detail-location"></span></div>' +
          '<div class="crm-info-row"><span>GST</span><span id="crm-detail-gst"></span></div>' +
          '<div class="crm-info-row"><span>Website</span><span id="crm-detail-url"></span></div>' +
        '</div>' +
        '<div class="crm-info-card">' +
          '<div class="crm-section-label">Contacts</div>' +
          '<div class="crm-info-row"><span>Primary</span><span id="crm-detail-c1"></span></div>' +
          '<div class="crm-info-row"><span>Secondary</span><span id="crm-detail-c2"></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="crm-info-card" style="margin-top:0">' +
        '<div class="crm-section-label">Projects</div>' +
        '<div class="crm-table-wrap">' +
          '<table class="crm-table">' +
            '<thead><tr>' +
              '<th>ID</th><th>Type</th><th>Status</th>' +
              '<th>Start</th><th>End</th><th>Amount</th>' +
            '</tr></thead>' +
            '<tbody id="crm-proj-tbody"></tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  function _leadsHTML() {
    var colsHTML = STAGES.map(function (s) {
      var slug    = _slug(s);
      var accent  = s === 'Won' ? 'var(--brand,#1A5C2E)' : s === 'Lost' ? '#c0392b' : 'var(--navy,#12172b)';
      return '<div class="crm-kanban-col">' +
        '<div class="crm-kanban-header" style="border-top:3px solid ' + accent + '">' +
          '<span>' + s + '</span>' +
          '<span class="crm-kanban-badge" id="crm-kanban-count-' + slug + '">0</span>' +
        '</div>' +
        '<div class="crm-kanban-body" id="crm-kanban-' + slug + '"></div>' +
      '</div>';
    }).join('');

    return '' +
      '<div class="crm-page-header">' +
        '<div>' +
          '<h2 class="crm-page-title">Leads Pipeline</h2>' +
          '<p class="crm-page-sub">Track prospects from first contact to close</p>' +
        '</div>' +
        '<button class="crm-btn-primary" onclick="crmNewLead()">+ New Lead</button>' +
      '</div>' +
      '<div class="crm-kanban">' + colsHTML + '</div>';
  }

  function _leadModalHTML() {
    var stageOpts = STAGES.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
    return '' +
      '<div class="crm-modal-box">' +
        '<div class="crm-modal-header">' +
          '<h3 id="crm-modal-title">New Lead</h3>' +
          '<button class="crm-modal-close" onclick="crmCloseModal()">✕</button>' +
        '</div>' +
        '<form id="crm-lead-form" onsubmit="crmSaveLead();return false;">' +
          '<input type="hidden" name="Lead_id">' +
          '<div class="crm-form-grid">' +
            '<div class="crm-form-group crm-col-2">' +
              '<label>Company <span class="crm-req">*</span></label>' +
              '<input name="Company" placeholder="Company name" required>' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Contact Person</label>' +
              '<input name="Contact" placeholder="Full name">' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Email</label>' +
              '<input name="Email" type="email" placeholder="contact@company.com">' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Phone</label>' +
              '<input name="Phone" placeholder="+91 98765 43210">' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Industry</label>' +
              '<input name="Industry" placeholder="e.g. Manufacturing">' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Service Interested In</label>' +
              '<input name="Service" placeholder="e.g. EcoVadis, UEBT">' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Stage</label>' +
              '<select name="Stage">' + stageOpts + '</select>' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Deal Value (₹)</label>' +
              '<input name="Value" type="number" min="0" placeholder="0">' +
            '</div>' +
            '<div class="crm-form-group">' +
              '<label>Lead Source</label>' +
              '<input name="Source" placeholder="e.g. Referral, LinkedIn">' +
            '</div>' +
            '<div class="crm-form-group crm-col-2">' +
              '<label>Notes</label>' +
              '<textarea name="Notes" rows="3" placeholder="Any context or next steps…"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="crm-modal-footer">' +
            '<button type="button" class="crm-btn-secondary" onclick="crmCloseModal()">Cancel</button>' +
            '<button type="submit" class="crm-btn-primary">Save Lead</button>' +
          '</div>' +
        '</form>' +
      '</div>';
  }


  // ══════════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════════

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _slug(s) {
    return s.toLowerCase().replace(/\s+/g, '-');
  }

  function _setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function _fmtDate(v) {
    if (!v) return '—';
    try {
      var d = new Date(v);
      return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return String(v); }
  }

  function _fmtCurrency(v) {
    if (!v && v !== 0) return '—';
    var n = parseFloat(v);
    return isNaN(n) ? String(v) : '₹' + n.toLocaleString('en-IN');
  }


  // ══════════════════════════════════════════════════════════════
  // STYLES
  // ══════════════════════════════════════════════════════════════

  function _injectStyles() {
    var s = document.createElement('style');
    s.id = 'crm-module-styles';
    s.textContent = [
      /* Layout */
      '.crm-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}',
      '.crm-page-title{font-size:22px;font-weight:700;color:var(--navy,#12172b);margin:0 0 2px}',
      '.crm-page-sub{color:#777;font-size:13px;margin:0}',
      '.crm-loading{color:#aaa;padding:48px;text-align:center;font-size:14px}',
      '.crm-empty{color:#bbb;padding:48px;text-align:center;font-size:14px}',
      '.crm-req{color:#c0392b}',

      /* Buttons */
      '.crm-btn-primary{background:var(--brand,#1A5C2E);color:#fff;border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}',
      '.crm-btn-primary:hover{opacity:.88}',
      '.crm-btn-secondary{background:none;border:1px solid #dde;padding:9px 18px;border-radius:8px;font-size:13px;cursor:pointer;color:#555}',
      '.crm-btn-secondary:hover{background:#f5f5f5}',
      '.crm-back-btn{background:none;border:1px solid #dde;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;color:#555;margin-bottom:10px;display:inline-block}',
      '.crm-back-btn:hover{background:#f5f5f5}',
      '.crm-search{padding:9px 14px;border:1px solid #dde;border-radius:8px;font-size:13px;width:220px;font-family:inherit}',
      '.crm-search:focus{outline:none;border-color:var(--brand,#1A5C2E);box-shadow:0 0 0 3px rgba(26,92,46,.1)}',

      /* Client cards grid */
      '.crm-client-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:16px}',
      '.crm-client-card{background:#fff;border:1px solid #e8eaf0;border-radius:12px;padding:18px;cursor:pointer;transition:box-shadow .15s,transform .15s}',
      '.crm-client-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.09);transform:translateY(-2px)}',
      '.crm-card-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}',
      '.crm-avatar{width:42px;height:42px;border-radius:10px;background:var(--navy,#12172b);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0}',
      '.crm-card-title-block .crm-client-name{font-weight:600;font-size:14px;color:#1a1a2e;line-height:1.3}',
      '.crm-card-title-block .crm-client-id{font-size:11px;color:#aaa;margin-top:2px}',
      '.crm-card-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}',
      '.crm-tag{background:#f0f2ff;color:#3d4580;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:500}',
      '.crm-tag-muted{background:#f5f5f5;color:#777}',
      '.crm-card-footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f0f0f0;padding-top:10px;font-size:12px;color:#888}',
      '.crm-proj-count{background:#f0f4ff;color:#3d4580;padding:2px 9px;border-radius:10px;font-weight:600;font-size:11px}',

      /* Client detail */
      '.crm-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}',
      '.crm-info-card{background:#fff;border:1px solid #e8eaf0;border-radius:12px;padding:20px;margin-bottom:16px}',
      '.crm-section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#aaa;margin-bottom:14px}',
      '.crm-info-row{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid #f5f5f5;font-size:13px;gap:12px}',
      '.crm-info-row:last-child{border-bottom:none}',
      '.crm-info-row>span:first-child{color:#999;flex-shrink:0}',
      '.crm-info-row>span:last-child{color:#222;font-weight:500;text-align:right;word-break:break-word}',
      '.crm-table-wrap{overflow-x:auto}',
      '.crm-table{width:100%;border-collapse:collapse;font-size:13px}',
      '.crm-table th{text-align:left;padding:9px 12px;background:#f9fafb;color:#888;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #eee}',
      '.crm-table td{padding:10px 12px;border-bottom:1px solid #f5f5f5;color:#333}',
      '.crm-table tr:last-child td{border-bottom:none}',
      '.crm-table tr:hover td{background:#fafafe}',
      '.crm-empty-cell{text-align:center;color:#bbb;padding:28px!important}',

      /* Status badges */
      '.crm-badge{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600;display:inline-block}',
      '.crm-status-active{background:#e8f5e9;color:#2e7d32}',
      '.crm-status-closed{background:#f5f5f5;color:#888}',
      '.crm-status-yet-to-start{background:#fff8e1;color:#e65100}',
      '.crm-status-on-hold{background:#fce4ec;color:#c62828}',

      /* Kanban */
      '.crm-kanban{display:flex;gap:14px;overflow-x:auto;padding-bottom:16px;align-items:flex-start;min-height:480px}',
      '.crm-kanban-col{flex:0 0 210px;background:#f8f9fb;border-radius:12px;overflow:hidden}',
      '.crm-kanban-header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;font-weight:600;font-size:13px;color:#333}',
      '.crm-kanban-badge{background:#e0e0e0;color:#666;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:700}',
      '.crm-kanban-body{padding:8px;display:flex;flex-direction:column;gap:8px;min-height:300px}',
      '.crm-kanban-empty{color:#ccc;font-size:12px;text-align:center;padding:24px 8px}',
      '.crm-kanban-card{background:#fff;border-radius:8px;padding:12px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.07);border:1px solid #eee;transition:box-shadow .15s}',
      '.crm-kanban-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.1)}',
      '.crm-kcard-company{font-weight:600;font-size:13px;color:#1a1a2e;margin-bottom:3px}',
      '.crm-kcard-sub{font-size:11px;color:#999;margin-bottom:5px}',
      '.crm-kcard-val{font-size:12px;font-weight:700;color:var(--brand,#1A5C2E);margin-top:4px}',
      '.crm-kcard-tag{font-size:10px;background:#f0f2ff;color:#3d4580;padding:2px 8px;border-radius:10px;display:inline-block;margin-top:4px}',

      /* Lead modal */
      '.crm-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}',
      '.crm-modal-box{background:#fff;border-radius:16px;width:560px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.2)}',
      '.crm-modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px 16px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:1}',
      '.crm-modal-header h3{margin:0;font-size:17px;color:var(--navy,#12172b)}',
      '.crm-modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;line-height:1;padding:2px}',
      '.crm-modal-close:hover{color:#333}',
      '.crm-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;padding:20px 24px}',
      '.crm-form-group{display:flex;flex-direction:column;gap:5px}',
      '.crm-form-group label{font-size:12px;font-weight:600;color:#666}',
      '.crm-form-group input,.crm-form-group select,.crm-form-group textarea{padding:9px 11px;border:1px solid #dde;border-radius:7px;font-size:13px;font-family:inherit;color:#222;background:#fff}',
      '.crm-form-group input:focus,.crm-form-group select:focus,.crm-form-group textarea:focus{outline:none;border-color:var(--brand,#1A5C2E);box-shadow:0 0 0 3px rgba(26,92,46,.1)}',
      '.crm-col-2{grid-column:span 2}',
      '.crm-modal-footer{display:flex;gap:10px;justify-content:flex-end;padding:14px 24px 20px;border-top:1px solid #eee;position:sticky;bottom:0;background:#fff}',

      /* Responsive */
      '@media(max-width:768px){.crm-detail-grid{grid-template-columns:1fr}.crm-form-grid{grid-template-columns:1fr}.crm-col-2{grid-column:span 1}.crm-search{width:160px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

})();
