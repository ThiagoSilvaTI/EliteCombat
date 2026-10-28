(function () {
  "use strict";

  const TURMA_LABEL = {
    baby: "Baby",
    kids: "Kids",
    jovem_adulto: "Jovem/Adulto",
  };

  /* ---------- Ícones SVG ---------- */
  const ICONS = {
    shark: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 36c8-2 14-6 20-12 4-4 8-10 14-10 4 0 6 2 8 6l10 4-8 2 6 6-10-1 4 6-12-3c-6 4-14 6-22 6-4 0-8-1-10-4z" fill="currentColor"/>
      <circle cx="40" cy="22" r="1.6" fill="#0a0a0a"/>
      <path d="M22 30l-4 8 8-4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
    announcement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>`,
    shirt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 3l4 3-2 4-2-1v12H8V9L6 10 4 6l4-3 2 2h4l2-2z"/>
    </svg>`,
    clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/>
      <path d="M9 12h6M9 16h6"/>
    </svg>`,
    card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20M6 15h4"/>
    </svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
    </svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </svg>`,
  };

  let token = sessionStorage.getItem("elite_token") || "";
  let currentUser = null;
  let canPost = false;
  let currentView = "comunicados";
  let uniformsCache = [];

  const $ = (id) => document.getElementById(id);

  function showLoading(on) {
    $("loadingOverlay").classList.toggle("hidden", !on);
  }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro na requisição.");
    return data;
  }

    function initLogo() {
    // Adiciona um timestamp para forçar o navegador a baixar a imagem nova
    const logoUrl = "logo.png?v=" + new Date().getTime();
    const imgs = document.querySelectorAll('img[src^="logo.png"]');

    imgs.forEach((img) => {
      // Se a imagem já estiver carregada no cache
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("loaded");
        atualizarLogoTopbar();
        return;
      }

      // Se ainda não carregou, escuta o evento de load
      img.addEventListener("load", () => {
        img.classList.add("loaded");
        atualizarLogoTopbar();
      });

      // Escuta o erro (caso o arquivo não exista)
      img.addEventListener("error", () => {
        img.classList.remove("loaded");
      });

      // Força o recarregamento caso tenha dado erro anteriormente
      if (img.complete && img.naturalWidth === 0) {
        img.src = logoUrl;
      }
    });
  }

  function atualizarLogoTopbar() {
    const topImg = $("logoImgTop");
    const topEmoji = $("topbarEmoji");
    if (topImg && topEmoji) {
      topImg.src = "logo.png?v=" + new Date().getTime(); // Cache-bust na topbar também
      topImg.classList.remove("hidden");
      topEmoji.classList.add("hidden");
    }
  }

  function turmaBadge(t) {
    if (t === "baby") return "badge-baby";
    if (t === "kids") return "badge-kids";
    return "badge-jovem";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatPhone(p) {
    const d = String(p || "").replace(/\D/g, "");
    if (d.length === 13 && d.startsWith("55")) {
      const r = d.slice(2);
      return `(${r.slice(0, 2)}) ${r.slice(2, 7)}-${r.slice(7)}`;
    }
    return p || "—";
  }

  function showAuth(panel) {
    $("authRoot").classList.remove("hidden");
    $("appRoot").classList.remove("active");
    ["loginPanel", "registerPanel"].forEach((id) => {
  $(id).classList.toggle("hidden", id !== panel);
});
  }

  function showApp() {
    $("authRoot").classList.add("hidden");
    $("appRoot").classList.add("active");
    renderNav();
    renderView(currentView);
  }

  function navConfig() {
    const prof = currentUser?.role === "professor";
    const items = [
      { id: "comunicados", label: "Comunicados", icon: ICONS.announcement },
      { id: "uniformes", label: "Uniformes", icon: ICONS.shirt },
    ];
    if (prof) {
      items.push(
        { id: "chamada", label: "Chamada", icon: ICONS.clipboard },
        { id: "pagamentos", label: "Pagamentos", icon: ICONS.card },
        { id: "delegacao", label: "Delegação", icon: ICONS.users }
      );
    }
    items.push({ id: "perfil", label: "Perfil", icon: ICONS.user });
    return items;
  }

  function renderNav() {
    const items = navConfig();
    const turma = currentUser.role === "professor"
      ? "Professor"
      : TURMA_LABEL[currentUser.turma] || "Aluno";
    $("topUserLine").textContent = `${currentUser.name} · ${turma}`;

    const sidebar = $("sidebarNav");
    const bottom = $("bottomNav");
    sidebar.innerHTML = "";
    bottom.innerHTML = "";

    items.forEach((item) => {
      const sb = document.createElement("button");
      sb.type = "button";
      sb.className = "nav-item" + (currentView === item.id ? " active" : "");
      sb.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
      sb.addEventListener("click", () => switchView(item.id));
      sidebar.appendChild(sb);

      const mb = document.createElement("button");
      mb.type = "button";
      mb.className = currentView === item.id ? "active" : "";
      mb.innerHTML = `<span class="ico">${item.icon}</span>${item.label}`;
      mb.addEventListener("click", () => switchView(item.id));
      bottom.appendChild(mb);
    });
  }

  function switchView(id) {
    currentView = id;
    renderNav();
    renderView(id);
  }

  async function renderView(view) {
    const main = $("mainView");
    main.classList.remove("view-enter");
    void main.offsetWidth;
    main.classList.add("view-enter");

    try {
      if (view === "comunicados") main.innerHTML = await htmlComunicados();
      else if (view === "uniformes") main.innerHTML = htmlUniformes();
      else if (view === "chamada") main.innerHTML = htmlChamada();
      else if (view === "pagamentos") main.innerHTML = htmlPagamentos();
      else if (view === "delegacao") main.innerHTML = htmlDelegacao();
      else if (view === "perfil") main.innerHTML = htmlPerfil();
      bindView(view);
    } catch (e) {
      main.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  }

  async function htmlComunicados() {
    const data = await api("/api/announcements");
    canPost = data.canPost;
    let html = `
      <div class="page-head">
        <h2>Comunicados</h2>
        <p>Eventos, aulas, uniformes e avisos da academia</p>
      </div>`;

    if (canPost) {
      html += `
        <div class="panel delay-1">
          <h3>Novo comunicado</h3>
          <label>Título</label>
          <input type="text" id="annTitle" />
          <label>Tipo</label>
          <select id="annType">
            <option value="geral">Geral</option>
            <option value="evento">Evento / data</option>
            <option value="aula">Aviso de aula</option>
            <option value="uniforme">Pedido de uniforme</option>
          </select>
          <label>Turma</label>
          <select id="annTurma">
            <option value="all">Todas</option>
            <option value="baby">Baby</option>
            <option value="kids">Kids</option>
            <option value="jovem_adulto">Jovem/Adulto</option>
          </select>
          <label>Mensagem</label>
          <textarea id="annBody" rows="4"></textarea>
          <button type="button" class="btn btn-primary btn-sm" id="btnPublish">Publicar</button>
        </div>`;
    }

    if (!data.announcements.length) {
      html += `<div class="empty-state"><span class="empty-icon">${ICONS.shark}</span>Nenhum comunicado ainda.</div>`;
      return html;
    }

    html += `<div class="card-list">`;
    data.announcements.forEach((a, i) => {
      const turma = a.turmaTarget === "all" ? "Todas" : TURMA_LABEL[a.turmaTarget] || a.turmaTarget;
      html += `
        <article class="ann-card ${a.read ? "" : "unread"}" style="animation-delay:${i * 0.05}s">
          <div class="meta">
            <span class="pill">${escapeHtml(a.type)}</span>
            ${escapeHtml(turma)} · ${formatDate(a.createdAt)} · ${escapeHtml(a.authorName)}
          </div>
          <h4>${escapeHtml(a.title)}</h4>
          <p>${escapeHtml(a.body)}</p>
          ${!a.read ? `<button type="button" class="btn btn-blue btn-sm mark-read" data-id="${a.id}">Marcar como lido</button>` : ""}
        </article>`;
    });
    html += `</div>`;
    return html;
  }

  function htmlUniformes() {
    let html = `
      <div class="page-head">
        <h2>Uniformes</h2>
        <p>Equipamentos oficiais Elite Combat</p>
      </div>
      <div class="uniform-grid">`;
    uniformsCache.forEach((u) => {
      const hasVideo = !!(u.video || u.youtube);
      const thumb = u.image
        ? `<img src="${escapeHtml(u.image)}" alt="${escapeHtml(u.name)}"
               loading="lazy"
               onerror="this.parentElement.classList.add('no-image');this.remove()" />`
        : ICONS.shirt;
      html += `
        <div class="uniform-item ${hasVideo ? "has-video" : ""}"
             ${hasVideo ? `data-video-id="${escapeHtml(u.id)}"` : ""}>
          <div class="thumb">${thumb}</div>
          <h4>${escapeHtml(u.name)}</h4>
          <p>${escapeHtml(u.desc)}</p>
        </div>`;
    });
    html += `</div>`;
    return html;
  }

  function htmlChamada() {
    const today = new Date().toISOString().slice(0, 10);
    return `
      <div class="page-head">
        <h2>Chamada</h2>
        <p>Lista alfabética por turma</p>
      </div>
      <div class="panel">
        <label>Turma</label>
        <select id="attTurma">
          <option value="all">Todas</option>
          <option value="baby">Baby</option>
          <option value="kids">Kids</option>
          <option value="jovem_adulto">Jovem/Adulto</option>
        </select>
        <label>Data</label>
        <input type="date" id="attDate" value="${today}" />
        <button type="button" class="btn btn-primary btn-sm" id="btnLoadAtt">Carregar lista</button>
      </div>
      <div id="attArea"></div>`;
  }

  function htmlPagamentos() {
    const now = new Date();
    return `
      <div class="page-head">
        <h2>Mensalidade</h2>
        <p>Confirme pagamentos dos alunos</p>
      </div>
      <div class="panel">
        <label>Mês</label>
        <input type="number" id="payMonth" min="1" max="12" value="${now.getMonth() + 1}" />
        <label>Ano</label>
        <input type="number" id="payYear" value="${now.getFullYear()}" />
        <label>Turma</label>
        <select id="payTurma">
          <option value="all">Todas</option>
          <option value="baby">Baby</option>
          <option value="kids">Kids</option>
          <option value="jovem_adulto">Jovem/Adulto</option>
        </select>
        <button type="button" class="btn btn-primary btn-sm" id="btnLoadPay">Atualizar</button>
      </div>
      <div id="payArea"></div>`;
  }

  function htmlDelegacao() {
    return `
      <div class="page-head">
        <h2>Delegação</h2>
        <p>Alunos autorizados a enviar comunicados</p>
      </div>
      <div id="delArea"><div class="empty-state"><span class="empty-icon">${ICONS.clock}</span>Carregando…</div></div>`;
  }

  function htmlPerfil() {
    const prof = currentUser.role === "professor";
    let role = prof ? "Professor" : "Aluno";
    return `
      <div class="page-head">
        <h2>Perfil</h2>
        <p>Lute Como Um Tubarão</p>
      </div>
      <div class="panel profile-grid">
        <div class="row"><span>Nome</span><strong>${escapeHtml(currentUser.name)}</strong></div>
        <div class="row"><span>WhatsApp</span><strong>${formatPhone(currentUser.phone)}</strong></div>
        <div class="row"><span>Idade</span><strong>${currentUser.age}</strong></div>
        <div class="row"><span>Turma</span>
          ${prof ? '<span class="badge badge-prof">—</span>' : `<span class="badge ${turmaBadge(currentUser.turma)}">${TURMA_LABEL[currentUser.turma]}</span>`}
        </div>
        <div class="row"><span>Função</span><strong>${role}</strong></div>
      </div>
      <p style="color:var(--muted);font-size:0.85rem;margin-top:1rem">
        Dados salvos no servidor local. Acesse pelo mesmo endereço na rede para compartilhar com outros dispositivos.
      </p>`;
  }

    /* ---------- Modal de vídeo do uniforme ---------- */

  function openVideoModal(uniform) {
    const modal = $("videoModal");
    const title = $("videoModalTitle");
    const player = $("videoModalPlayer");
    if (!modal || !player) return;

    title.textContent = uniform.name;
    player.innerHTML = "";

    if (uniform.video) {
      // vídeo local
      const vid = document.createElement("video");
      vid.src = uniform.video;
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      vid.addEventListener("error", () => {
        player.innerHTML = `<div class="empty-state" style="height:100%">
          <span class="empty-icon">${ICONS.xCircle}</span>
          Vídeo indisponível.
        </div>`;
      });
      player.appendChild(vid);
    } else if (uniform.youtube) {
      // embed do YouTube
      const iframe = document.createElement("iframe");
      iframe.src =
        `https://www.youtube.com/embed/${encodeURIComponent(uniform.youtube)}?autoplay=1&rel=0`;
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      player.appendChild(iframe);
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeVideoModal() {
    const modal = $("videoModal");
    const player = $("videoModalPlayer");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    if (player) player.innerHTML = ""; // pausa o vídeo ao fechar
    document.body.style.overflow = "";
  }

  function bindVideoModal() {
    const modal = $("videoModal");
    if (!modal || modal.dataset.bound === "1") return;
    modal.dataset.bound = "1";

    $("videoModalClose").addEventListener("click", closeVideoModal);
    modal.querySelector(".video-modal-backdrop").addEventListener("click", closeVideoModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) closeVideoModal();
    });
  }

  function bindView(view) {
    if (view === "comunicados") {
      $("btnPublish")?.addEventListener("click", async () => {
        try {
          showLoading(true);
          await api("/api/announcements", {
            method: "POST",
            body: JSON.stringify({
              title: $("annTitle").value.trim(),
              body: $("annBody").value.trim(),
              type: $("annType").value,
              turmaTarget: $("annTurma").value,
            }),
          });
          await renderView("comunicados");
        } catch (e) {
          alert(e.message);
        } finally {
          showLoading(false);
        }
      });
      document.querySelectorAll(".mark-read").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await api("/api/announcements/" + btn.dataset.id + "/read", { method: "POST" });
            await renderView("comunicados");
          } catch (e) {
            alert(e.message);
          }
        });
      });
    }

    if (view === "chamada") {
      $("btnLoadAtt")?.addEventListener("click", loadAttendance);
    }

    if (view === "pagamentos") {
      $("btnLoadPay")?.addEventListener("click", loadPayments);
      loadPayments();
    }

    if (view === "delegacao") {
      loadDelegation();
    }

    if (view === "uniformes") {
      bindVideoModal();
      document.querySelectorAll(".uniform-item.has-video").forEach((el) => {
        el.addEventListener("click", () => {
          const u = uniformsCache.find((x) => x.id === el.dataset.videoId);
          if (u) openVideoModal(u);
        });
      });
    }
  }

  async function loadAttendance() {
    const turma = $("attTurma").value;
    const date = $("attDate").value;
    const [studentsRes, attRes] = await Promise.all([
      api("/api/students?turma=" + encodeURIComponent(turma)),
      api("/api/attendance?turma=" + encodeURIComponent(turma) + "&date=" + encodeURIComponent(date)),
    ]);
    const records = attRes.records || {};
    const area = $("attArea");
    if (!studentsRes.students.length) {
      area.innerHTML = `<div class="empty-state"><span class="empty-icon">${ICONS.clipboard}</span>Nenhum aluno nesta turma.</div>`;
      return;
    }
    let html = "";
    studentsRes.students.forEach((s) => {
      const chk = records[s.id] ? "checked" : "";
      html += `
        <div class="list-row">
          <input type="checkbox" id="s_${s.id}" data-id="${s.id}" ${chk} />
          <label for="s_${s.id}">${escapeHtml(s.name)}</label>
        </div>`;
    });
    html += `<button type="button" class="btn btn-primary" id="btnSaveAtt" style="margin-top:0.75rem">Salvar chamada</button>`;
    area.innerHTML = html;
    $("btnSaveAtt").addEventListener("click", async () => {
      const rec = {};
      area.querySelectorAll("[data-id]").forEach((el) => {
        rec[el.dataset.id] = el.checked;
      });
      try {
        showLoading(true);
        await api("/api/attendance", {
          method: "PUT",
          body: JSON.stringify({ turma, date, records: rec }),
        });
        alert("Chamada salva.");
      } catch (e) {
        alert(e.message);
      } finally {
        showLoading(false);
      }
    });
  }

  async function loadPayments() {
    const month = Number($("payMonth").value);
    const year = Number($("payYear").value);
    const turma = $("payTurma").value;
    const data = await api(
      `/api/payments?month=${month}&year=${year}&turma=${encodeURIComponent(turma)}`
    );
    const area = $("payArea");
    if (!data.rows.length) {
      area.innerHTML = `<div class="empty-state"><span class="empty-icon">${ICONS.card}</span>Nenhum aluno.</div>`;
      return;
    }
    let html = "";
    data.rows.forEach((row) => {
      const s = row.student;
      html += `
        <div class="list-row">
          <div style="flex:1">
            <strong>${escapeHtml(s.name)}</strong><br/>
            <small style="color:var(--muted)">${TURMA_LABEL[s.turma]}</small>
          </div>
          <span class="badge ${row.confirmed ? "badge-jovem" : "badge-baby"}">${row.confirmed ? "Pago" : "Pendente"}</span>
          <button type="button" class="btn btn-sm ${row.confirmed ? "btn-ghost" : "btn-blue"} toggle-pay"
            data-id="${s.id}">${row.confirmed ? "Desfazer" : "Confirmar"}</button>
        </div>`;
    });
    area.innerHTML = html;
    area.querySelectorAll(".toggle-pay").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api("/api/payments/toggle", {
            method: "POST",
            body: JSON.stringify({ studentId: btn.dataset.id, month, year }),
          });
          loadPayments();
        } catch (e) {
          alert(e.message);
        }
      });
    });
  }

  async function loadDelegation() {
    const [studentsRes, delRes] = await Promise.all([
      api("/api/students?turma=all"),
      api("/api/delegation"),
    ]);
    const set = new Set(delRes.delegatedStudentIds);
    const area = $("delArea");
    if (!studentsRes.students.length) {
      area.innerHTML = `<div class="empty-state"><span class="empty-icon">${ICONS.users}</span>Cadastre alunos primeiro.</div>`;
      return;
    }
    let html = "";
    studentsRes.students.forEach((s) => {
      html += `
        <div class="list-row">
          <input type="checkbox" class="del-cb" id="d_${s.id}" data-id="${s.id}" ${set.has(s.id) ? "checked" : ""} />
          <label for="d_${s.id}">${escapeHtml(s.name)} (${TURMA_LABEL[s.turma]})</label>
        </div>`;
    });
    html += `<button type="button" class="btn btn-primary" id="btnSaveDel" style="margin-top:0.75rem">Salvar</button>`;
    area.innerHTML = html;
    $("btnSaveDel").addEventListener("click", async () => {
      const ids = [];
      area.querySelectorAll(".del-cb:checked").forEach((cb) => ids.push(cb.dataset.id));
      try {
        await api("/api/delegation", {
          method: "PUT",
          body: JSON.stringify({ delegatedStudentIds: ids }),
        });
        alert("Permissões salvas.");
      } catch (e) {
        alert(e.message);
      }
    });
  }

  async function refreshSession() {
    if (!token) return false;
    try {
      const data = await api("/api/me");
      currentUser = data.user;
      canPost = data.canPost;
      return true;
    } catch {
      token = "";
      sessionStorage.removeItem("elite_token");
      return false;
    }
  }

  async function bootstrap() {
    initLogo();
    try {
      const boot = await api("/api/bootstrap");
            uniformsCache = boot.uniforms || [];
      if (token && (await refreshSession())) {
        showApp();
        return;
      }
    } catch {
      /* server offline */
    }
    showAuth("loginPanel");
    const hint = $("registerHint");
    try {
      const boot = await fetch("/api/bootstrap").then((r) => r.json());
      if (!boot.hasUsers) {
        hint.textContent = "Primeiro cadastro: você será o professor";
        hint.classList.remove("hidden");
      }
    } catch {
      $("loginError").textContent = "Servidor offline. Execute: npm start na pasta ELITE APP";
      $("loginError").classList.remove("hidden");
    }
  }

  $("goRegister").addEventListener("click", async () => {
    showAuth("registerPanel");
    try {
      const boot = await api("/api/bootstrap");
      const hint = $("registerHint");
      if (!boot.hasUsers) {
        hint.textContent = "Primeiro cadastro: você será o professor";
        hint.classList.remove("hidden");
      } else hint.classList.add("hidden");
    } catch (_) {}
  });

  $("goLogin").addEventListener("click", () => showAuth("loginPanel"));

  $("btnLogin").addEventListener("click", async () => {
    $("loginError").classList.add("hidden");
    try {
      showLoading(true);
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          phone: $("loginPhone").value,
          password: $("loginPassword").value.trim(),
        }),
      });
      token = data.token;
      sessionStorage.setItem("elite_token", token);
      currentUser = data.user;
      currentView = "comunicados";
      showApp();
    } catch (e) {
      $("loginError").textContent = e.message;
      $("loginError").classList.remove("hidden");
    } finally {
      showLoading(false);
    }
  });

    $("btnRegister").addEventListener("click", async () => {
    $("registerError").classList.add("hidden");

    const pw = $("regPassword").value;
    const pw2 = $("regPasswordConfirm").value;

    if (pw.length < 6) {
      $("registerError").textContent = "A senha deve ter pelo menos 6 caracteres.";
      $("registerError").classList.remove("hidden");
      return;
    }
    if (pw !== pw2) {
      $("registerError").textContent = "As senhas não coincidem.";
      $("registerError").classList.remove("hidden");
      return;
    }

    try {
      showLoading(true);
      await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: $("regName").value.trim(),
          phone: $("regPhone").value,
          age: Number($("regAge").value),
          password: pw,
        }),
      });
      alert("Cadastro realizado! Faça login com sua senha.");
      showAuth("loginPanel");
      $("loginPhone").value = $("regPhone").value;
      $("loginPassword").value = "";
      $("loginPassword").focus();
    } catch (e) {
      $("registerError").textContent = e.message;
      $("registerError").classList.remove("hidden");
    } finally {
      showLoading(false);
    }
  });

  $("btnLogout").addEventListener("click", async () => {
    try {
      await api("/api/logout", { method: "POST" });
    } catch (_) {}
    token = "";
    sessionStorage.removeItem("elite_token");
    currentUser = null;
    showAuth("loginPanel");
  });

  bootstrap();
})();