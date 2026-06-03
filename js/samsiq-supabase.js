(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://gzbpsiemdavaawqgkqtw.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_INU_YbD_m2n-dUxxIcvMuQ_mEmfYdNI';

  let client = null;
  let session = null;
  let profile = null;
  let bedriftId = null;

  var LOCAL_STORAGE_KEY = 'samsiq-local-projects';

  function formatSaveErr(err) {
    if (!err) return 'Ukjent feil';
    if (typeof err === 'string') return err;
    var parts = [];
    if (typeof err.message === 'string' && err.message && err.message !== '[object Object]') {
      parts.push(err.message);
    }
    if (err.code) parts.push('(' + err.code + ')');
    if (err.details) parts.push(err.details);
    if (err.hint) parts.push(err.hint);
    if (parts.length) return parts.join(' ');
    try { return JSON.stringify(err); } catch (_) { return 'Ukjent feil'; }
  }

  function isSetupSaveError(err) {
    var msg = formatSaveErr(err);
    return (
      msg.indexOf('42501') >= 0 ||
      msg.indexOf('PGRST202') >= 0 ||
      msg.indexOf('ensure_user_profile') >= 0 ||
      msg.indexOf('brukerprofiler') >= 0 ||
      msg.indexOf('Database mangler oppsett') >= 0 ||
      msg.indexOf('row-level security') >= 0 ||
      msg.indexOf('23503') >= 0
    );
  }

  function readLocalProjects() {
    try {
      var raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveProjectLocally(payload) {
    var records = readLocalProjects();
    var id = 'local-' + crypto.randomUUID();
    records.unshift({
      id: id,
      created_at: new Date().toISOString(),
      payload: payload
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records.slice(0, 20)));
    return id;
  }

  function getLocalProjectRecord(id) {
    return readLocalProjects().find(function (r) { return r.id === id; }) || null;
  }

  function logSaveFail(step, err, extra, runId) {
    var fields = {
      message: err && err.message,
      code: err && err.code,
      details: err && err.details,
      hint: err && err.hint
    };
    console.error('[samsiq] Supabase lagring —', step, fields, extra || '');
  }

  function throwSaveFail(step, err, extra) {
    logSaveFail(step, err, extra);
    throw new Error(formatSaveErr(err));
  }

  function isMissingRpcError(err) {
    if (!err) return false;
    return err.code === 'PGRST202' || err.code === '42883' ||
      (err.message && (err.message.indexOf('ensure_user_profile') >= 0 || err.message.indexOf('Could not find the function') >= 0));
  }

  async function ensureUserProfile() {
    if (!session) throw new Error('Ikke innlogget');
    var sb = getClient();
    var meta = session.user.user_metadata || {};
    var fullName = meta.full_name || meta.fullName || null;
    var profile = {
      id: session.user.id,
      email: session.user.email || '',
      full_name: fullName
    };
    var existingRes = await sb.from('users').select('id').eq('id', session.user.id).maybeSingle();
    if (existingRes.error) throwSaveFail('H2-users-select', existingRes.error, { userId: session.user.id });
    if (existingRes.data && existingRes.data.id) {
      var updateRes = await sb.from('users').update(profile).eq('id', session.user.id);
      if (updateRes.error) throwSaveFail('H2-users-update', updateRes.error, { userId: session.user.id });
      return;
    }
    var rpcRes = await sb.rpc('ensure_user_profile');
    if (!rpcRes.error) return;
    if (!isMissingRpcError(rpcRes.error)) throwSaveFail('H2-users-rpc', rpcRes.error, { userId: session.user.id });
    var insertRes = await sb.from('users').insert(profile);
    if (!insertRes.error) return;
    if (insertRes.error.code === '42501') {
      throw new Error('Database mangler oppsett for brukerprofiler. Kjør supabase/patch-ensure-user-profile.sql i Supabase SQL Editor, eller bruk Next.js med SUPABASE_SERVICE_ROLE_KEY.');
    }
    throwSaveFail('H2-users-insert', insertRes.error, { userId: session.user.id });
  }

  function getClient() {
    if (!client) {
      if (!global.supabase) throw new Error('Supabase SDK ikke lastet');
      client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  function initials(name, email) {
    const src = (name || email || '?').trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  }

  function updateAuthUI() {
    const statusEl = document.getElementById('auth-status');
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const subEl = document.getElementById('user-sub');
    const logoutBtn = document.getElementById('btn-logout');
    const landingLogin = document.getElementById('btn-landing-login');
    const landingOpen = document.getElementById('btn-landing-open');

    if (session && profile) {
      if (statusEl) statusEl.textContent = profile.email;
      if (avatarEl) avatarEl.textContent = initials(profile.full_name, profile.email);
      if (nameEl) nameEl.textContent = profile.full_name || profile.email.split('@')[0];
      if (subEl) subEl.textContent = 'Innlogget';
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (landingLogin) landingLogin.style.display = 'none';
      if (landingOpen) landingOpen.textContent = 'Åpne app';
    } else {
      if (statusEl) statusEl.textContent = 'Ikke innlogget';
      if (avatarEl) avatarEl.textContent = '?';
      if (nameEl) nameEl.textContent = 'Gjest';
      if (subEl) subEl.textContent = 'Logg inn for å lagre';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (landingLogin) landingLogin.style.display = 'inline-block';
      if (landingOpen) landingOpen.textContent = 'Logg inn';
    }
  }

  function openAuth(mode) {
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-modal-title');
    const submit = document.getElementById('auth-submit');
    const toggle = document.getElementById('auth-toggle');
    const nameRow = document.getElementById('auth-name-row');
    if (!modal) return;
    modal.dataset.mode = mode || 'login';
    if (title) title.textContent = mode === 'signup' ? 'Opprett konto' : 'Logg inn';
    if (submit) submit.textContent = mode === 'signup' ? 'Registrer' : 'Logg inn';
    if (toggle) toggle.textContent = mode === 'signup' ? 'Har du konto? Logg inn' : 'Ny bruker? Opprett konto';
    if (nameRow) nameRow.style.display = mode === 'signup' ? 'block' : 'none';
    document.getElementById('auth-error').textContent = '';
    modal.classList.add('active');
  }

  function closeAuth() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  }

  async function loadProfile() {
    if (!session) { profile = null; bedriftId = null; return; }
    const sb = getClient();
    const { data, error } = await sb.from('users').select('*').eq('id', session.user.id).maybeSingle();
    if (error) throw error;
    profile = data || { id: session.user.id, email: session.user.email, full_name: '' };

    const { data: links } = await sb.from('brukere_bedrifter').select('bedrift_id').eq('user_id', session.user.id).limit(1);
    bedriftId = links && links[0] ? links[0].bedrift_id : null;
  }

  async function ensureBedrift(produsentNavn) {
    if (!session) return null;
    if (bedriftId) return bedriftId;
    const sb = getClient();
    const navn = (produsentNavn || 'Min bedrift').trim() || 'Min bedrift';
    const { data: bedrift, error: bErr } = await sb.from('bedrifter').insert({ navn }).select('id').single();
    if (bErr) throwSaveFail('H5-bedrifter', bErr);
    const { error: linkErr } = await sb.from('brukere_bedrifter').insert({
      user_id: session.user.id,
      bedrift_id: bedrift.id,
      rolle: 'admin'
    });
    if (linkErr) throwSaveFail('H5-brukere_bedrifter', linkErr);
    bedriftId = bedrift.id;
    return bedriftId;
  }

  async function signIn(email, password) {
    const sb = getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    session = data.session;
    await loadProfile();
    updateAuthUI();
    await loadDashboardProjects();
    closeAuth();
    return session;
  }

  async function signUp(email, password, fullName) {
    const sb = getClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } }
    });
    if (error) throw error;
    if (data.session) {
      session = data.session;
      await loadProfile();
      updateAuthUI();
      closeAuth();
    }
    return data;
  }

  async function signOut() {
    const sb = getClient();
    await sb.auth.signOut();
    session = null;
    profile = null;
    bedriftId = null;
    global.currentProjectId = null;
    updateAuthUI();
    renderProjectList([]);
    if (global.showLanding) global.showLanding();
  }

  async function isCloudStorageReady() {
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/ensure_user_profile', {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: '{}'
      });
      var text = await res.text();
      return !text.includes('PGRST202');
    } catch (_) {
      return false;
    }
  }

  async function saveGeneratedProject(payload) {
    if (!session) throw new Error('Ikke innlogget');
    if (!(await isCloudStorageReady())) {
      var localId = saveProjectLocally(payload);
      global.currentProjectId = localId;
      await loadDashboardProjects();
      return localId;
    }
    const sb = getClient();
    await ensureUserProfile();
    var bId = bedriftId;

    const { data: prosjekt, error: pErr } = await sb.from('prosjekter').insert({
      user_id: session.user.id,
      bedrift_id: bId,
      maskin_id: null,
      navn: payload.prosjekt,
      kunde: payload.kunde,
      produsent: payload.produsent,
      ingenior: payload.ingenior,
      status: 'fullført',
      machine_data: payload.machineData,
      zip_filename: payload.zipFilename,
      zip_base64: null
    }).select('id').single();
    if (pErr) throwSaveFail('H3-prosjekter', pErr, { zipLen: 0 });

    for (var di = 0; di < payload.documents.length; di++) {
      var docItem = payload.documents[di];
      var docIns = await sb.from('dokumenter').insert({
        prosjekt_id: prosjekt.id,
        user_id: session.user.id,
        doc_type: docItem.docType,
        filename: docItem.filename,
        docx_base64: docItem.docx
      });
      if (docIns.error) throwSaveFail('H4-dokumenter', docIns.error, { rowIndex: di, docType: docItem.docType });
    }
    global.currentProjectId = prosjekt.id;
    await loadDashboardProjects();
    return prosjekt.id;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('no-NO');
    } catch (_) {
      return '';
    }
  }

  function renderProjectList(projects) {
    const list = document.getElementById('proj-list');
    const statProjects = document.getElementById('stat-projects');
    const statPackages = document.getElementById('stat-packages');
    const statHours = document.getElementById('stat-hours');
    if (statProjects) statProjects.textContent = String(projects.length);
    if (statPackages) statPackages.textContent = String(projects.length);
    if (statHours) statHours.textContent = String(projects.length * 4) + 't';
    if (!list) return;

    if (!projects.length) {
      list.innerHTML =
        '<div class="proj-card" onclick="showPanel(\'new\')">' +
        '<div class="proj-icon">+</div>' +
        '<div><div class="proj-name">Ingen prosjekter ennå</div>' +
        '<div class="proj-meta">Opprett ditt første prosjekt</div></div>' +
        '<span class="badge badge-new">Ny</span></div>';
      return;
    }

    list.innerHTML = projects.map(function (p) {
      const meta = (p.produsent || '—') + ' · ' + formatDate(p.created_at);
      const badge = p.status === 'fullført' ? 'badge-done' : 'badge-prog';
      return (
        '<div class="proj-card" data-project-id="' + p.id + '" onclick="SamsiqAuth.openProject(\'' + p.id + '\')">' +
        '<div class="proj-icon">📄</div>' +
        '<div><div class="proj-name">' + escapeHtml(p.navn) + '</div>' +
        '<div class="proj-meta">' + escapeHtml(meta) + '</div></div>' +
        '<span class="badge ' + badge + '">' + escapeHtml(p.status) + '</span></div>'
      );
    }).join('') +
      '<div class="proj-card" onclick="showPanel(\'new\')">' +
      '<div class="proj-icon">+</div>' +
      '<div><div class="proj-name">+ Opprett nytt prosjekt</div>' +
      '<div class="proj-meta">Klikk for å starte</div></div>' +
      '<span class="badge badge-new">Ny</span></div>';
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function loadDashboardProjects() {
    if (!session) { renderProjectList([]); return []; }
    var localSummaries = readLocalProjects().map(function (r) {
      return {
        id: r.id,
        navn: r.payload.prosjekt,
        produsent: r.payload.produsent || null,
        status: 'fullført',
        created_at: r.created_at,
        zip_filename: r.payload.zipFilename
      };
    });
    const sb = getClient();
    const { data, error } = await sb
      .from('prosjekter')
      .select('id, navn, produsent, status, created_at, zip_filename')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      renderProjectList(localSummaries);
      return localSummaries;
    }
    var merged = localSummaries.concat(data || []);
    merged.sort(function (a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    renderProjectList(merged.slice(0, 20));
    return merged;
  }

  async function openProject(projectId) {
    if (!session) return openAuth('login');
    var localRec = getLocalProjectRecord(projectId);
    if (localRec && global.JSZip) {
      var p = localRec.payload;
      var zipName = p.zipFilename || 'Samsiq.zip';
      var folderName = zipName.replace(/\.zip$/i, '') || 'Samsiq_export';
      var zip = new global.JSZip();
      var folder = zip.folder(folderName);
      (p.documents || []).forEach(function (doc) {
        var bytes = atob(doc.docx);
        var arr = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        folder.file(doc.filename, arr);
      });
      global.currentProjectId = projectId;
      global.zipData = {
        zip: await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' }),
        filename: zipName
      };
      document.getElementById('output-title').textContent =
        'Dokumentpakke — ' + (p.prosjekt || 'Prosjekt');
      global.showPanel('output');
      return;
    }
    const sb = getClient();
    const { data: prosjekt, error: pErr } = await sb
      .from('prosjekter')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();
    if (pErr) throw pErr;

    const { data: docs, error: dErr } = await sb
      .from('dokumenter')
      .select('doc_type, filename, docx_base64')
      .eq('prosjekt_id', projectId)
      .eq('user_id', session.user.id);
    if (dErr) throw dErr;

    global.currentProjectId = projectId;
    if (prosjekt.zip_base64) {
      global.zipData = { zip: prosjekt.zip_base64, filename: prosjekt.zip_filename || 'Samsiq.zip' };
    } else if (docs && docs.length && global.JSZip) {
      var zipName = prosjekt.zip_filename || 'Samsiq.zip';
      var folderName = zipName.replace(/\.zip$/i, '') || 'Samsiq_export';
      var zip = new global.JSZip();
      var folder = zip.folder(folderName);
      docs.forEach(function (doc) {
        var bytes = atob(doc.docx_base64);
        var arr = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        folder.file(doc.filename, arr);
      });
      global.zipData = { zip: await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' }), filename: zipName };
    } else {
      global.zipData = null;
    }

    document.getElementById('output-title').textContent =
      'Dokumentpakke — ' + (prosjekt.navn || 'Prosjekt');
    global.showPanel('output');
  }

  async function init() {
    const sb = getClient();
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session) await loadProfile();
    updateAuthUI();
    if (session) await loadDashboardProjects();

    if (global.showApp) {
      const origShowApp = global.showApp;
      global.showApp = function (skipAuth) {
        if (!skipAuth && !requireAuthForApp()) return;
        origShowApp();
      };
    }

    if (location.hash === '#app' || location.hash === '#new') {
      if (session) global.showApp(true);
      else openAuth('login');
    }

    sb.auth.onAuthStateChange(async function (_event, newSession) {
      session = newSession;
      if (session) await loadProfile();
      else { profile = null; bedriftId = null; }
      updateAuthUI();
      if (session) await loadDashboardProjects();
      else renderProjectList([]);
    });

    const form = document.getElementById('auth-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const modal = document.getElementById('auth-modal');
        const mode = modal ? modal.dataset.mode : 'login';
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value.trim();
        const errEl = document.getElementById('auth-error');
        errEl.textContent = '';
        try {
          if (mode === 'signup') {
            const res = await signUp(email, password, name);
            if (!res.session) {
              errEl.textContent = 'Konto opprettet. Sjekk e-post for bekreftelse, deretter logg inn.';
            }
          } else {
            await signIn(email, password);
            if (global.showApp) global.showApp(true);
          }
        } catch (err) {
          errEl.textContent = err.message || 'Innlogging feilet';
        }
      });
    }

    document.getElementById('auth-modal')?.addEventListener('click', function (e) {
      if (e.target.id === 'auth-modal') closeAuth();
    });
    document.getElementById('auth-close')?.addEventListener('click', closeAuth);
    document.getElementById('auth-toggle')?.addEventListener('click', function () {
      const modal = document.getElementById('auth-modal');
      openAuth(modal && modal.dataset.mode === 'signup' ? 'login' : 'signup');
    });
    document.getElementById('btn-logout')?.addEventListener('click', signOut);
    document.getElementById('btn-landing-login')?.addEventListener('click', function () { openAuth('login'); });
  }

  function requireAuthForApp(skipAuth) {
    if (skipAuth || session) return true;
    openAuth('login');
    return false;
  }

  global.SamsiqAuth = {
    init,
    isLoggedIn: function () { return !!session; },
    openAuth,
    closeAuth,
    signIn,
    signUp,
    signOut,
    saveGeneratedProject,
    saveProjectLocally,
    isSetupSaveError,
    isCloudStorageReady,
    formatSaveErr,
    loadDashboardProjects,
    openProject,
    requireAuthForApp
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
