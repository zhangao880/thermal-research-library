(function () {
  "use strict";

  const config = window.PAPER_HUB_CONFIG || {};
  const STORAGE_KEY = "thermal-research-hub-v1";
  const ALLOWED_CATEGORIES = ["医疗散热", "余热回收", "热泵与储热", "竞赛与综述", "其他"];
  const ALLOWED_STATUSES = ["待核验", "已核验", "已摘要", "已精读", "已引用"];
  const ALLOWED_DATA_TYPES = ["实验", "仿真", "综述", "案例", "标准/指南", "其他"];
  const CATEGORY_ACCENTS = {
    "医疗散热": "#ef8267",
    "余热回收": "#69b79f",
    "热泵与储热": "#d1a649",
    "竞赛与综述": "#8e83c2",
    "其他": "#8a9a96"
  };

  const state = {
    papers: [],
    client: null,
    session: null,
    cloud: false,
    loaded: false,
    editingId: null,
    view: localStorage.getItem("paper-hub-view") || "grid",
    filters: {
      query: "",
      category: "all",
      status: "all"
    },
    sort: "updated_desc"
  };

  const el = {};

  function cacheElements() {
    [
      "sidebar", "mobileMenu", "mobileBackdrop", "searchInput", "openImport", "openAdd",
      "heroAdd", "openGuide", "clearFilters", "sortSelect", "paperGrid", "emptyState",
      "emptyTitle", "emptyText", "emptyAdd", "activeFilters", "resultCount", "paperDialog",
      "paperDialogTitle", "paperForm", "paperId", "fieldTitle", "fieldTitleEn", "fieldAuthors",
      "fieldYear", "fieldVenue", "fieldDoi", "fieldUrl", "fieldCategory", "fieldStatus",
      "fieldDataType", "fieldTags", "fieldMedicalScene", "fieldThermalRoute", "fieldMethods",
      "fieldKeyFinding", "fieldLimitations", "fieldNotes", "fieldRelevance", "relevanceValue",
      "deletePaper", "savePaper", "importDialog", "importDrop", "importFile", "importText",
      "runImport", "downloadTemplate", "settingsDialog", "settingsStatus", "configPreview",
      "exportData", "authDialog", "authForm", "authEmail", "guideDialog", "toastRegion",
      "openSettings", "authButton", "modeTitle", "modeDescription", "navTotal", "statTotal",
      "statRead", "statReadRate", "statPending", "statRecent"
    ].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "paper-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function splitList(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return String(item).trim(); }).filter(Boolean);
    }
    return String(value || "")
      .split(/[;；\n]+/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function splitTags(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return String(item).trim(); }).filter(Boolean);
    }
    return String(value || "")
      .split(/[;,；，\n]+/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function normalizeForSearch(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function normalizeCategory(value) {
    return ALLOWED_CATEGORIES.includes(value) ? value : "其他";
  }

  function normalizeStatus(value) {
    return ALLOWED_STATUSES.includes(value) ? value : "待核验";
  }

  function normalizeDataType(value) {
    return ALLOWED_DATA_TYPES.includes(value) ? value : "其他";
  }

  function normalizeRecord(record) {
    const yearNumber = Number(record.year);
    const relevanceNumber = Number(record.relevance);
    return {
      title: String(record.title || record["中文题名"] || "").trim(),
      title_en: String(record.title_en || record["英文题名"] || "").trim(),
      authors: splitList(record.authors || record.author || record["作者"] || record["第一作者"]),
      year: Number.isFinite(yearNumber) && yearNumber >= 1800 && yearNumber <= 2100 ? yearNumber : null,
      venue: String(record.venue || record.journal || record["来源"] || record["期刊"] || "").trim(),
      doi: String(record.doi || "").trim(),
      url: String(record.url || record.link || "").trim(),
      category: normalizeCategory(record.category || record["分类"]),
      status: normalizeStatus(record.status || record["状态"]),
      data_type: normalizeDataType(record.data_type || record["数据类型"] || record.type),
      tags: splitTags(record.tags || record.keywords || record["关键词"]),
      medical_scene: String(record.medical_scene || record["医疗场景"] || "").trim(),
      thermal_route: String(record.thermal_route || record["散热余热路线"] || record["路线"] || "").trim(),
      methods: String(record.methods || record.method || record["方法"] || "").trim(),
      key_finding: String(record.key_finding || record["一句话结论"] || record.conclusion || "").trim(),
      limitations: String(record.limitations || record["局限"] || record["局限与待核验"] || "").trim(),
      notes: String(record.notes || record["笔记"] || record["我的笔记"] || "").trim(),
      relevance: Number.isFinite(relevanceNumber) ? Math.min(5, Math.max(1, relevanceNumber)) : 3
    };
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = Array.isArray(window.PAPER_HUB_SEED) ? window.PAPER_HUB_SEED : [];
        const timestamp = nowIso();
        state.papers = seed.map(function (paper) {
          const normalized = normalizeRecord(paper);
          return Object.assign({
            id: uid(),
            created_at: timestamp,
            updated_at: timestamp
          }, normalized);
        });
        if (state.papers.length) saveLocal();
        return;
      }
      const parsed = JSON.parse(raw);
      state.papers = Array.isArray(parsed) ? parsed.map(function (paper) {
        const normalized = normalizeRecord(paper);
        return Object.assign({}, paper, normalized, {
          id: paper.id || uid(),
          created_at: paper.created_at || nowIso(),
          updated_at: paper.updated_at || paper.created_at || nowIso()
        });
      }) : [];
    } catch (error) {
      state.papers = [];
      toast("本机数据读取失败，已使用空论文库。原始数据未被覆盖。", "error");
      console.error(error);
    }
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.papers));
  }

  function updateModeDisplay() {
    if (state.cloud && state.session) {
      el.modeTitle.textContent = "云端已连接";
      el.modeDescription.textContent = state.session.user.email || "多设备同步已开启";
      el.authButton.innerHTML = "<span>◉</span> 退出云端";
      el.settingsStatus.textContent = "云端数据库已配置并登录。论文数据会同步到 Supabase。";
      el.settingsStatus.classList.add("online");
    } else if (state.cloud) {
      el.modeTitle.textContent = "等待登录";
      el.modeDescription.textContent = "登录后启用云端同步";
      el.authButton.innerHTML = "<span>◎</span> 登录云端";
      el.settingsStatus.textContent = "Supabase 已配置，但当前没有登录。登录后才能读取或写入云端论文。";
      el.settingsStatus.classList.remove("online");
    } else {
      el.modeTitle.textContent = "本机模式";
      el.modeDescription.textContent = config.supabaseUrl ? "云端连接暂不可用" : "数据只保存在当前浏览器";
      el.authButton.innerHTML = "<span>◎</span> 登录云端";
      el.settingsStatus.textContent = config.supabaseUrl
        ? "已填写 Supabase 配置，但客户端未能启动。请检查网络和 CDN 加载。"
        : "当前未配置 Supabase。数据保存在本机浏览器中，不会自动上传。";
      el.settingsStatus.classList.remove("online");
    }

    el.configPreview.value = [
      "Supabase URL: " + (config.supabaseUrl || "未配置"),
      "Anon key: " + (config.supabaseAnonKey ? "已填写（已隐藏）" : "未配置"),
      "运行模式: " + (state.cloud ? (state.session ? "云端已登录" : "云端待登录") : "本机模式"),
      "当前论文数: " + state.papers.length
    ].join("\n");
  }

  async function initCloud() {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      toast("Supabase 客户端未加载，已退回本机模式。", "error");
      return;
    }

    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    state.cloud = true;

    const result = await state.client.auth.getSession();
    if (result.error) {
      toast("读取登录状态失败：" + result.error.message, "error");
    }
    state.session = result.data && result.data.session ? result.data.session : null;

    state.client.auth.onAuthStateChange(function (event, session) {
      const previousUserId = state.session && state.session.user ? state.session.user.id : null;
      state.session = session;
      const currentUserId = session && session.user ? session.user.id : null;
      updateModeDisplay();

      if (event === "SIGNED_OUT") {
        state.papers = [];
        state.loaded = true;
        render();
      } else if (session && previousUserId !== currentUserId) {
        window.setTimeout(loadCloudPapers, 0);
      }
    });

    if (state.session) {
      await loadCloudPapers();
    } else {
      state.loaded = true;
    }
  }

  async function loadCloudPapers() {
    if (!state.client || !state.session) {
      return;
    }
    el.paperGrid.innerHTML = '<div class="empty-state" style="display:grid"><p>正在读取云端论文库…</p></div>';
    const result = await state.client
      .from("papers")
      .select("*")
      .order("updated_at", { ascending: false });

    if (result.error) {
      state.papers = [];
      state.loaded = true;
      render();
      toast("云端读取失败：" + result.error.message + "。请确认已运行建库 SQL。", "error");
      return;
    }

    state.papers = result.data || [];
    const seedFlag = state.session && state.session.user
      ? "paper-hub-cloud-seed-v1-" + state.session.user.id
      : "";
    const shouldSeed = state.papers.length === 0 && seedFlag && !localStorage.getItem(seedFlag);
    if (shouldSeed && Array.isArray(window.PAPER_HUB_SEED) && window.PAPER_HUB_SEED.length) {
      const seedResult = await state.client
        .from("papers")
        .insert(window.PAPER_HUB_SEED.map(normalizeRecord))
        .select();
      if (seedResult.error) {
        toast("云端已连接，但精选文献初始化失败：" + seedResult.error.message, "error");
      } else {
        state.papers = seedResult.data || [];
        localStorage.setItem(seedFlag, "done");
        toast("已向云端论文库载入 " + state.papers.length + " 篇精选文献。", "success");
      }
    }
    state.loaded = true;
    render();
  }

  async function init() {
    cacheElements();
    bindEvents();
    setupDialogClosing();

    if (config.supabaseUrl && config.supabaseAnonKey) {
      try {
        await initCloud();
      } catch (error) {
        state.cloud = false;
        toast("云端初始化失败，已使用本机模式：" + error.message, "error");
      }
    }

    if (!state.cloud) {
      loadLocal();
      state.loaded = true;
    }

    if (!state.loaded) {
      state.loaded = true;
    }
    updateModeDisplay();
    render();
  }

  function bindEvents() {
    el.searchInput.addEventListener("input", function (event) {
      state.filters.query = event.target.value.trim();
      render();
    });

    document.querySelectorAll("[data-category]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.filters.category = button.dataset.category;
        state.filters.status = "all";
        document.querySelectorAll("[data-category]").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        closeMobileMenu();
        render();
      });
    });

    document.querySelectorAll("[data-status]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.filters.status = state.filters.status === button.dataset.status ? "all" : button.dataset.status;
        state.filters.category = "all";
        document.querySelectorAll("[data-category]").forEach(function (item) {
          item.classList.toggle("active", item.dataset.category === "all");
        });
        closeMobileMenu();
        render();
      });
    });

    el.clearFilters.addEventListener("click", clearFilters);
    el.sortSelect.addEventListener("change", function (event) {
      state.sort = event.target.value;
      render();
    });

    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.view = button.dataset.view;
        localStorage.setItem("paper-hub-view", state.view);
        document.querySelectorAll("[data-view]").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        renderPapers();
      });
    });

    el.paperGrid.addEventListener("click", function (event) {
      const card = event.target.closest("[data-paper-id]");
      if (card) {
        openPaperDialog(card.dataset.paperId);
      }
    });

    el.paperGrid.addEventListener("keydown", function (event) {
      const card = event.target.closest("[data-paper-id]");
      if (card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openPaperDialog(card.dataset.paperId);
      }
    });

    el.openAdd.addEventListener("click", function () { openPaperDialog(); });
    el.heroAdd.addEventListener("click", function () { openPaperDialog(); });
    el.emptyAdd.addEventListener("click", function () {
      if (state.cloud && !state.session) {
        el.authDialog.showModal();
      } else {
        openPaperDialog();
      }
    });

    el.paperForm.addEventListener("submit", savePaper);
    el.deletePaper.addEventListener("click", deleteCurrentPaper);
    el.fieldRelevance.addEventListener("input", function () {
      el.relevanceValue.textContent = el.fieldRelevance.value + " / 5";
    });

    el.openImport.addEventListener("click", function () {
      if (!ensureWriteAccess()) return;
      el.importDialog.showModal();
    });
    el.runImport.addEventListener("click", runImport);
    el.downloadTemplate.addEventListener("click", downloadCsvTemplate);
    el.importFile.addEventListener("change", readImportFile);
    ["dragenter", "dragover"].forEach(function (name) {
      el.importDrop.addEventListener(name, function (event) {
        event.preventDefault();
        el.importDrop.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (name) {
      el.importDrop.addEventListener(name, function (event) {
        event.preventDefault();
        el.importDrop.classList.remove("dragging");
      });
    });
    el.importDrop.addEventListener("drop", function (event) {
      const file = event.dataTransfer.files[0];
      if (file) readImportText(file);
    });

    el.openSettings.addEventListener("click", function () {
      updateModeDisplay();
      el.settingsDialog.showModal();
    });
    el.exportData.addEventListener("click", exportJson);
    el.authButton.addEventListener("click", handleAuthButton);
    el.authForm.addEventListener("submit", sendMagicLink);
    el.openGuide.addEventListener("click", function () { el.guideDialog.showModal(); });

    el.mobileMenu.addEventListener("click", openMobileMenu);
    el.mobileBackdrop.addEventListener("click", closeMobileMenu);

    document.addEventListener("keydown", function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        el.searchInput.focus();
        el.searchInput.select();
      }
    });
  }

  function setupDialogClosing() {
    document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = document.getElementById(button.dataset.closeDialog);
        if (dialog && dialog.open) dialog.close();
      });
    });

    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  function openMobileMenu() {
    el.sidebar.classList.add("open");
    el.mobileBackdrop.classList.add("show");
  }

  function closeMobileMenu() {
    el.sidebar.classList.remove("open");
    el.mobileBackdrop.classList.remove("show");
  }

  function clearFilters() {
    state.filters = { query: "", category: "all", status: "all" };
    el.searchInput.value = "";
    document.querySelectorAll("[data-category]").forEach(function (item) {
      item.classList.toggle("active", item.dataset.category === "all");
    });
    render();
  }

  function paperMatches(paper) {
    if (state.filters.category !== "all" && paper.category !== state.filters.category) {
      return false;
    }
    if (state.filters.status !== "all" && paper.status !== state.filters.status) {
      return false;
    }

    const query = normalizeForSearch(state.filters.query);
    if (!query) return true;

    const haystack = normalizeForSearch([
      paper.title,
      paper.title_en,
      (paper.authors || []).join(" "),
      paper.year,
      paper.venue,
      paper.doi,
      paper.url,
      paper.category,
      paper.status,
      paper.data_type,
      (paper.tags || []).join(" "),
      paper.medical_scene,
      paper.thermal_route,
      paper.methods,
      paper.key_finding,
      paper.limitations,
      paper.notes
    ].join(" "));

    return query.split(" ").every(function (word) { return haystack.includes(word); });
  }

  function getVisiblePapers() {
    const papers = state.papers.filter(paperMatches);
    const sorters = {
      updated_desc: function (a, b) { return new Date(b.updated_at || 0) - new Date(a.updated_at || 0); },
      year_desc: function (a, b) { return (b.year || 0) - (a.year || 0); },
      year_asc: function (a, b) { return (a.year || 9999) - (b.year || 9999); },
      title_asc: function (a, b) { return String(a.title || "").localeCompare(String(b.title || ""), "zh-CN"); },
      relevance_desc: function (a, b) { return (b.relevance || 0) - (a.relevance || 0); }
    };
    return papers.slice().sort(sorters[state.sort] || sorters.updated_desc);
  }

  function render() {
    updateStats();
    renderActiveFilters();
    renderPapers();
    updateModeDisplay();
  }

  function updateStats() {
    const currentYear = new Date().getFullYear();
    const windowYears = Number(config.recentYearWindow) || 5;
    const readCount = state.papers.filter(function (paper) {
      return paper.status === "已精读" || paper.status === "已引用";
    }).length;
    const pendingCount = state.papers.filter(function (paper) {
      return paper.status === "待核验";
    }).length;
    const recentCount = state.papers.filter(function (paper) {
      return paper.year && paper.year >= currentYear - windowYears + 1;
    }).length;

    el.navTotal.textContent = state.papers.length;
    el.statTotal.textContent = state.papers.length;
    el.statRead.textContent = readCount;
    el.statReadRate.textContent = "完成率 " + (state.papers.length ? Math.round(readCount / state.papers.length * 100) : 0) + "%";
    el.statPending.textContent = pendingCount;
    el.statRecent.textContent = recentCount;

    document.querySelectorAll("[data-count-category]").forEach(function (node) {
      node.textContent = state.papers.filter(function (paper) {
        return paper.category === node.dataset.countCategory;
      }).length;
    });
    document.querySelectorAll("[data-count-status]").forEach(function (node) {
      node.textContent = state.papers.filter(function (paper) {
        return paper.status === node.dataset.countStatus;
      }).length;
    });
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.filters.query) {
      chips.push({ label: "搜索：" + state.filters.query, key: "query" });
    }
    if (state.filters.category !== "all") {
      chips.push({ label: state.filters.category, key: "category" });
    }
    if (state.filters.status !== "all") {
      chips.push({ label: state.filters.status, key: "status" });
    }

    el.activeFilters.innerHTML = chips.map(function (chip) {
      return '<span class="filter-chip">' + escapeHtml(chip.label) +
        '<button type="button" data-clear-filter="' + escapeHtml(chip.key) + '" aria-label="移除筛选">×</button></span>';
    }).join("");

    el.activeFilters.querySelectorAll("[data-clear-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        const key = button.dataset.clearFilter;
        if (key === "query") {
          state.filters.query = "";
          el.searchInput.value = "";
        } else {
          state.filters[key] = "all";
        }
        render();
      });
    });
  }

  function renderPapers() {
    const visible = getVisiblePapers();
    el.resultCount.textContent = visible.length + " 篇文献";
    el.paperGrid.classList.toggle("table-view", state.view === "table");
    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.view === state.view);
    });

    if (visible.length === 0) {
      el.paperGrid.innerHTML = "";
      el.emptyState.hidden = false;
      if (state.cloud && !state.session) {
        el.emptyTitle.textContent = "请先登录云端论文库";
        el.emptyText.textContent = "登录后会从 Supabase 同步论文；未登录时不会读取或写入任何云端数据。";
      } else if (state.papers.length && (state.filters.query || state.filters.category !== "all" || state.filters.status !== "all")) {
        el.emptyTitle.textContent = "没有符合条件的论文";
        el.emptyText.textContent = "尝试清空搜索或筛选条件。";
      } else {
        el.emptyTitle.textContent = "文献库还是空的";
        el.emptyText.textContent = "从一篇真正读过的论文开始。先录入基本信息，再逐步补充热源、热汇、方法和局限。";
      }
      return;
    }

    el.emptyState.hidden = true;
    el.paperGrid.innerHTML = visible.map(renderPaperCard).join("");
  }

  function renderPaperCard(paper) {
    const accent = CATEGORY_ACCENTS[paper.category] || CATEGORY_ACCENTS["其他"];
    const tags = (paper.tags || []).slice(0, 2).map(function (tag) {
      return '<span class="tag">' + escapeHtml(tag) + "</span>";
    }).join("");
    const relevanceDots = [1, 2, 3, 4, 5].map(function (value) {
      return '<i class="' + (value <= Number(paper.relevance || 0) ? "on" : "") + '"></i>';
    }).join("");
    const authorText = (paper.authors || []).join("、") || "作者待核验";
    const venueText = [paper.year || "年份待核验", paper.venue || "来源待核验"].join(" · ");
    const finding = paper.key_finding || "尚未填写一句话结论。打开详情补充方法与证据。";

    return [
      '<article class="paper-card" data-paper-id="' + escapeHtml(paper.id) + '" tabindex="0" role="button" aria-label="打开论文：' + escapeHtml(paper.title || "未命名") + '" style="--card-accent:' + escapeHtml(accent) + '">',
      '  <div class="card-top">',
      '    <span class="paper-category">' + escapeHtml(paper.category || "其他") + " · " + escapeHtml(paper.data_type || "待分类") + "</span>",
      '    <span class="status-badge ' + escapeHtml(paper.status || "待核验") + '">' + escapeHtml(paper.status || "待核验") + "</span>",
      "  </div>",
      '  <div class="paper-title">' + escapeHtml(paper.title || "未命名论文") + "</div>",
      '  <div class="paper-meta"><span>' + escapeHtml(authorText) + "</span><span>" + escapeHtml(venueText) + "</span></div>",
      '  <p class="paper-finding ' + (paper.key_finding ? "" : "empty") + '">' + escapeHtml(finding) + "</p>",
      '  <div class="paper-bottom">' + tags + '<span class="relevance" title="相关性 ' + escapeHtml(paper.relevance || 0) + '/5">' + relevanceDots + "</span></div>",
      "</article>"
    ].join("");
  }

  function ensureWriteAccess() {
    if (!state.cloud) return true;
    if (state.session) return true;
    toast("请先登录云端论文库。", "error");
    el.authDialog.showModal();
    return false;
  }

  function openPaperDialog(id) {
    if (state.cloud && !state.session) {
      el.authDialog.showModal();
      return;
    }

    const paper = id ? state.papers.find(function (item) { return item.id === id; }) : null;
    state.editingId = paper ? paper.id : null;
    el.paperDialogTitle.textContent = paper ? "编辑论文" : "新增论文";
    el.deletePaper.hidden = !paper;
    setFormValues(paper || {
      category: config.defaultCategory || "医疗散热",
      status: "待核验",
      data_type: "实验",
      relevance: 3
    });
    el.paperDialog.showModal();
    window.setTimeout(function () { el.fieldTitle.focus(); }, 30);
  }

  function setFormValues(paper) {
    el.paperId.value = paper.id || "";
    el.fieldTitle.value = paper.title || "";
    el.fieldTitleEn.value = paper.title_en || "";
    el.fieldAuthors.value = (paper.authors || []).join("；");
    el.fieldYear.value = paper.year || "";
    el.fieldVenue.value = paper.venue || "";
    el.fieldDoi.value = paper.doi || "";
    el.fieldUrl.value = paper.url || "";
    el.fieldCategory.value = normalizeCategory(paper.category);
    el.fieldStatus.value = normalizeStatus(paper.status);
    el.fieldDataType.value = normalizeDataType(paper.data_type);
    el.fieldTags.value = (paper.tags || []).join("；");
    el.fieldMedicalScene.value = paper.medical_scene || "";
    el.fieldThermalRoute.value = paper.thermal_route || "";
    el.fieldMethods.value = paper.methods || "";
    el.fieldKeyFinding.value = paper.key_finding || "";
    el.fieldLimitations.value = paper.limitations || "";
    el.fieldNotes.value = paper.notes || "";
    el.fieldRelevance.value = paper.relevance || 3;
    el.relevanceValue.textContent = el.fieldRelevance.value + " / 5";
  }

  function collectFormRecord() {
    return normalizeRecord({
      title: el.fieldTitle.value,
      title_en: el.fieldTitleEn.value,
      authors: el.fieldAuthors.value,
      year: el.fieldYear.value,
      venue: el.fieldVenue.value,
      doi: el.fieldDoi.value,
      url: el.fieldUrl.value,
      category: el.fieldCategory.value,
      status: el.fieldStatus.value,
      data_type: el.fieldDataType.value,
      tags: el.fieldTags.value,
      medical_scene: el.fieldMedicalScene.value,
      thermal_route: el.fieldThermalRoute.value,
      methods: el.fieldMethods.value,
      key_finding: el.fieldKeyFinding.value,
      limitations: el.fieldLimitations.value,
      notes: el.fieldNotes.value,
      relevance: el.fieldRelevance.value
    });
  }

  async function savePaper(event) {
    event.preventDefault();
    if (!ensureWriteAccess()) return;

    const record = collectFormRecord();
    if (!record.title) {
      toast("中文题名不能为空。", "error");
      el.fieldTitle.focus();
      return;
    }

    el.savePaper.disabled = true;
    el.savePaper.textContent = "正在保存…";
    try {
      if (state.cloud) {
        let result;
        if (state.editingId) {
          result = await state.client
            .from("papers")
            .update(record)
            .eq("id", state.editingId)
            .select()
            .single();
        } else {
          result = await state.client
            .from("papers")
            .insert(record)
            .select()
            .single();
        }
        if (result.error) throw result.error;
        const index = state.papers.findIndex(function (paper) { return paper.id === result.data.id; });
        if (index >= 0) state.papers[index] = result.data;
        else state.papers.unshift(result.data);
      } else {
        const timestamp = nowIso();
        if (state.editingId) {
          const index = state.papers.findIndex(function (paper) { return paper.id === state.editingId; });
          if (index >= 0) {
            state.papers[index] = Object.assign({}, state.papers[index], record, { updated_at: timestamp });
          }
        } else {
          state.papers.unshift(Object.assign({
            id: uid(),
            created_at: timestamp,
            updated_at: timestamp
          }, record));
        }
        saveLocal();
      }
      el.paperDialog.close();
      render();
      toast(state.editingId ? "论文信息已更新。" : "论文已加入文献库。", "success");
    } catch (error) {
      toast("保存失败：" + error.message, "error");
      console.error(error);
    } finally {
      el.savePaper.disabled = false;
      el.savePaper.textContent = "保存到论文库";
    }
  }

  async function deleteCurrentPaper() {
    if (!state.editingId || !ensureWriteAccess()) return;
    const paper = state.papers.find(function (item) { return item.id === state.editingId; });
    if (!paper) return;
    if (!window.confirm("确定删除《" + paper.title + "》吗？此操作无法撤销。")) return;

    el.deletePaper.disabled = true;
    try {
      if (state.cloud) {
        const result = await state.client.from("papers").delete().eq("id", state.editingId);
        if (result.error) throw result.error;
      } else {
        state.papers = state.papers.filter(function (item) { return item.id !== state.editingId; });
        saveLocal();
      }
      if (state.cloud) {
        state.papers = state.papers.filter(function (item) { return item.id !== state.editingId; });
      }
      el.paperDialog.close();
      render();
      toast("论文已删除。", "success");
    } catch (error) {
      toast("删除失败：" + error.message, "error");
    } finally {
      el.deletePaper.disabled = false;
    }
  }

  function getPaperKey(paper) {
    if (paper.doi) {
      return "doi:" + String(paper.doi).toLowerCase().replace(/^https?:\/\/doi.org\//, "").trim();
    }
    return "title:" + normalizeForSearch(paper.title) + "|" + String(paper.year || "");
  }

  async function runImport() {
    if (!ensureWriteAccess()) return;
    const text = el.importText.value.trim();
    if (!text) {
      toast("请先选择文件或粘贴导入内容。", "error");
      return;
    }

    el.runImport.disabled = true;
    el.runImport.textContent = "正在解析…";
    try {
      const records = parseImportText(text, el.importFile.files[0] ? el.importFile.files[0].name : "");
      if (!records.length) throw new Error("没有识别到可导入的文献记录。");

      const existingKeys = new Set(state.papers.map(getPaperKey));
      const fresh = [];
      for (const rawRecord of records) {
        const record = normalizeRecord(rawRecord);
        if (!record.title) continue;
        const key = getPaperKey(record);
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        fresh.push(record);
      }

      if (!fresh.length) {
        toast("所有记录都已存在，未重复导入。");
        return;
      }

      if (state.cloud) {
        const result = await state.client.from("papers").insert(fresh).select();
        if (result.error) throw result.error;
        state.papers = (result.data || []).concat(state.papers);
      } else {
        const timestamp = nowIso();
        const localPapers = fresh.map(function (record) {
          return Object.assign({ id: uid(), created_at: timestamp, updated_at: timestamp }, record);
        });
        state.papers = localPapers.concat(state.papers);
        saveLocal();
      }

      el.importDialog.close();
      el.importText.value = "";
      el.importFile.value = "";
      render();
      toast("成功导入 " + fresh.length + " 篇论文，跳过重复记录。", "success");
    } catch (error) {
      toast("导入失败：" + error.message, "error");
      console.error(error);
    } finally {
      el.runImport.disabled = false;
      el.runImport.textContent = "开始导入";
    }
  }

  function readImportFile(event) {
    const file = event.target.files[0];
    if (file) readImportText(file);
  }

  function readImportText(file) {
    if (file.size > 5 * 1024 * 1024) {
      toast("文件超过 5 MB，请拆分后导入。", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      el.importText.value = String(reader.result || "");
      toast("文件已读入，请检查后点击“开始导入”。");
    };
    reader.onerror = function () {
      toast("文件读取失败。", "error");
    };
    reader.readAsText(file, "utf-8");
  }

  function parseImportText(text, filename) {
    const lowerName = String(filename || "").toLowerCase();
    const trimmed = text.trim();
    if (lowerName.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
      return parseJsonImport(trimmed);
    }
    if (lowerName.endsWith(".bib") || trimmed.startsWith("@")) {
      return parseBibtex(trimmed);
    }
    return parseCsv(text);
  }

  function parseJsonImport(text) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.papers)) return parsed.papers;
    if (parsed && typeof parsed === "object") return [parsed];
    throw new Error("JSON 必须是论文对象数组，或包含 papers 数组。");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(field);
        if (row.some(function (value) { return value.trim() !== ""; })) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    row.push(field);
    if (row.some(function (value) { return value.trim() !== ""; })) rows.push(row);

    if (rows.length < 2) return [];
    const headers = rows[0].map(function (header) {
      return header.replace(/^\uFEFF/, "").trim();
    });
    return rows.slice(1).map(function (values) {
      const record = {};
      headers.forEach(function (header, index) {
        record[header] = (values[index] || "").trim();
      });
      return record;
    });
  }

  function parseBibtex(text) {
    const entryRegex = /@\w+\s*\{[\s\S]*?\n\}/g;
    const matches = text.match(entryRegex) || [];
    return matches.map(function (entry) {
      const fields = {};
      const fieldRegex = /(\w+)\s*=\s*\{([\s\S]*?)\}\s*,?/g;
      let match;
      while ((match = fieldRegex.exec(entry)) !== null) {
        fields[match[1].toLowerCase()] = match[2]
          .replace(/[{}]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      return {
        title: fields.title || "",
        authors: fields.author ? fields.author.split(/\s+and\s+/i) : [],
        year: fields.year || "",
        venue: fields.journal || fields.booktitle || fields.publisher || "",
        doi: fields.doi || "",
        url: fields.url || "",
        key_finding: fields.abstract || "",
        category: "其他",
        status: "待核验"
      };
    });
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsvTemplate() {
    const headers = [
      "中文题名", "英文题名", "作者", "年份", "来源", "DOI", "链接", "分类", "状态",
      "数据类型", "关键词", "医疗场景", "散热余热路线", "方法", "一句话结论", "局限", "笔记", "相关性"
    ];
    const example = [
      "请替换为原文题名", "Original title", "作者1；作者2", "2026", "期刊或会议", "", "",
      "医疗散热", "待核验", "实验", "关键词1；关键词2", "", "", "", "", "", "", "3"
    ];
    downloadFile(
      "热研库_文献导入模板.csv",
      "\uFEFF" + headers.map(csvCell).join(",") + "\r\n" + example.map(csvCell).join(",") + "\r\n",
      "text/csv;charset=utf-8"
    );
  }

  function exportJson() {
    downloadFile(
      "热研库_备份_" + new Date().toISOString().slice(0, 10) + ".json",
      JSON.stringify({ exported_at: nowIso(), papers: state.papers }, null, 2),
      "application/json;charset=utf-8"
    );
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  async function handleAuthButton() {
    if (state.cloud && state.session) {
      const result = await state.client.auth.signOut();
      if (result.error) {
        toast("退出失败：" + result.error.message, "error");
      } else {
        toast("已退出云端论文库。");
      }
      return;
    }
    if (!state.cloud) {
      updateModeDisplay();
      el.settingsDialog.showModal();
      return;
    }
    el.authDialog.showModal();
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    if (!state.client) {
      toast("尚未配置线上数据库。", "error");
      return;
    }
    const email = el.authEmail.value.trim();
    const submit = el.authForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "正在发送…";
    try {
      const result = await state.client.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: window.location.href.split("#")[0]
        }
      });
      if (result.error) throw result.error;
      el.authDialog.close();
      toast("登录链接已发送，请检查邮箱。", "success");
    } catch (error) {
      toast("登录链接发送失败：" + error.message, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "发送登录链接";
    }
  }

  function toast(message, type) {
    if (!el.toastRegion) return;
    const node = document.createElement("div");
    node.className = "toast " + (type || "");
    node.textContent = message;
    el.toastRegion.appendChild(node);
    window.setTimeout(function () {
      node.remove();
    }, type === "error" ? 6500 : 4200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
