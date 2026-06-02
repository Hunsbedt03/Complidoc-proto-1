(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://gzbpsiemdavaawqgkqtw.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_INU_YbD_m2n-dUxxIcvMuQ_mEmfYdNI';

  let client = null;
  let session = null;
  let profile = null;
  let bedriftId = null;

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
    if (bErr) throw bErr;
    const { error: linkErr } = await sb.from('brukere_bedrifter').insert({
      user_id: session.user.id,
      bedrift_id: bedrift.id,
      rolle: 'admin'
    });
    if (linkErr) throw linkErr;
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

  async function saveGeneratedProject(payload) {
    if (!session) throw new Error('Ikke innlogget');
    const sb = getClient();
    const bId = await ensureBedrift(payload.produsent);

    const { data: maskin, error: mErr } = await sb.from('maskiner').insert({
      user_id: session.user.id,
      bedrift_id: bId,
      navn: payload.maskin,
      serienummer: payload.serienr,
      beskrivelse: payload.beskrivelse,
      drivsystem: payload.drivsystem,
      styring: payload.styring,
      installasjonsmiljo: payload.installasjonsmiljo,
      tiltenkt_bruk: payload.tiltenktbruk,
      standarder: payload.standarder,
      marked: payload.marked
    }).select('id').single();
    if (mErr) throw mErr;

    const { data: prosjekt, error: pErr } = await sb.from('prosjekter').insert({
      user_id: session.user.id,
      bedrift_id: bId,
      maskin_id: maskin.id,
      navn: payload.prosjekt,
      kunde: payload.kunde,
      produsent: payload.produsent,
      ingenior: payload.ingenior,
      status: 'fullført',
      machine_data: payload.machineData,
      zip_filename: payload.zipFilename,
      zip_base64: payload.zipBase64
    }).select('id').single();
    if (pErr) throw pErr;

    const docRows = payload.documents.map(function (d) {
      return {
        prosjekt_id: prosjekt.id,
        user_id: session.user.id,
        doc_type: d.docType,
        filename: d.filename,
        docx_base64: d.docx
      };
    });
    const { error: dErr } = await sb.from('dokumenter').insert(docRows);
    if (dErr) throw dErr;

    global.currentProjectId = prosjekt.id;
    await loadDashboardProjects();
    // #region agent log
    fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8fd491'},body:JSON.stringify({sessionId:'8fd491',location:'samsiq-supabase.js:saveGeneratedProject',message:'project saved',data:{hypothesisId:'SB-1',projectId:prosjekt.id,docCount:docRows.length},timestamp:Date.now()})}).catch(function(){});
    // #endregion
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
    const sb = getClient();
    const { data, error } = await sb
      .from('prosjekter')
      .select('id, navn, produsent, status, created_at, zip_filename')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    renderProjectList(data || []);
    return data || [];
  }

  async function openProject(projectId) {
    if (!session) return openAuth('login');
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
    global.zipData = prosjekt.zip_base64
      ? { zip: prosjekt.zip_base64, filename: prosjekt.zip_filename || 'Samsiq.zip' }
      : null;

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

    // #region agent log
    fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8fd491'},body:JSON.stringify({sessionId:'8fd491',location:'samsiq-supabase.js:init',message:'auth init',data:{hypothesisId:'SB-2',hasSession:!!session},timestamp:Date.now()})}).catch(function(){});
    // #endregion

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
            // #region agent log
            fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8fd491'},body:JSON.stringify({sessionId:'8fd491',location:'samsiq-supabase.js:signIn',message:'login ok',data:{hypothesisId:'SB-3'},timestamp:Date.now()})}).catch(function(){});
            // #endregion
            if (global.showApp) global.showApp(true);
          }
        } catch (err) {
          // #region agent log
          fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8fd491'},body:JSON.stringify({sessionId:'8fd491',location:'samsiq-supabase.js:authForm',message:'auth error',data:{hypothesisId:'SB-4',error:String(err.message||err).slice(0,120)},timestamp:Date.now()})}).catch(function(){});
          // #endregion
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
    loadDashboardProjects,
    openProject,
    requireAuthForApp
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
