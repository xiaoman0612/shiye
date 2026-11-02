(function () {
  "use strict";

  const Engine = window.NovelEngine;
  const DATA = window.NOVEL_DATA;
  const AI = window.ShiyeAI;
  const STORAGE_KEY = "shiye-shelf-v1";
  const THEME_KEY = "shiye-theme";

  const $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  const $$ = function (selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  };

  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.6L6 21V4.75Z"></path></svg>',
    read: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"></path><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"></path></svg>',
    ebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="3" width="14" height="18" rx="1.5"></rect><path d="M9 18h6M9 7h6"></path></svg>',
    review: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v12H9l-4 4V4Z"></path><path d="M9 8h6M9 11h4"></path></svg>',
    buy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14l-1 12H6L5 8Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>',
    library: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 21V8l8-5 8 5v13M2 21h20M9 21v-6h6v6M7 10h1M16 10h1"></path></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"></path></svg>'
  };

  const RESOURCE_ICONS = {
    read: ICONS.read,
    ebook: ICONS.ebook,
    review: ICONS.review,
    buy: ICONS.buy,
    library: ICONS.library
  };

  const state = {
    query: "",
    chips: new Set(),
    kind: "all",
    status: "all",
    length: "all",
    sort: "match",
    parsed: null,
    results: [],
    saved: loadSaved(),
    activeBookId: null,
    returnFocus: null,
    bookDialogOpen: false,
    toastTimer: null
  };

  const aiState = {
    enabled: false,
    configured: false,
    busy: false,
    books: [],
    error: null,
    meta: "",
    statusText: "",
    handle: null,
    lastRequest: null,
    dirty: false
  };

  const els = {
    query: $("#query"),
    searchForm: $("#searchForm"),
    clearQuery: $("#clearQuery"),
    quickChips: $("#quickChips"),
    clearChips: $("#clearChips"),
    kindFilter: $("#kindFilter"),
    statusFilter: $("#statusFilter"),
    lengthFilter: $("#lengthFilter"),
    sortSelect: $("#sortSelect"),
    filterToggle: $("#filterToggle"),
    advancedFilters: $("#advancedFilters"),
    resetFilters: $("#resetFilters"),
    activeCriteria: $("#activeCriteria"),
    results: $("#results"),
    resultsTitle: $("#resultsTitle"),
    resultsEyebrow: $("#resultsEyebrow"),
    resultsCount: $("#resultsCount"),
    featuredMount: $("#featuredMount"),
    bookGrid: $("#bookGrid"),
    emptyState: $("#emptyState"),
    emptyCopy: $("#emptyCopy"),
    resultsFootnote: $("#resultsFootnote"),
    emptyReset: $("#emptyReset"),
    emptyLucky: $("#emptyLucky"),
    luckyBtn: $("#luckyBtn"),
    shelfCount: $("#shelfCount"),
    openShelf: $("#openShelf"),
    shelfDialog: $("#shelfDialog"),
    shelfBody: $("#shelfBody"),
    openAbout: $("#openAbout"),
    aboutDialog: $("#aboutDialog"),
    bookDialog: $("#bookDialog"),
    bookModalBody: $("#bookModalBody"),
    dailyCover: $("#dailyCover"),
    dailyTitle: $("#dailyTitle"),
    dailyAuthor: $("#dailyAuthor"),
    dailyLine: $("#dailyLine"),
    dailyDate: $("#dailyDate"),
    dailyOpen: $("#dailyOpen"),
    themeToggle: $("#themeToggle"),
    toast: $("#toast"),
    aiResults: $("#aiResults"),
    aiResultsTitle: $("#aiResultsTitle"),
    aiMeta: $("#aiMeta"),
    aiGrid: $("#aiGrid"),
    aiStatus: $("#aiStatus"),
    aiStatusText: $("#aiStatusText"),
    aiStop: $("#aiStop"),
    aiAgain: $("#aiAgain"),
    aiClose: $("#aiClose"),
    aiDisclaimer: $("#aiDisclaimer"),
    aiToggle: $("#aiToggle"),
    aiToggleHint: $("#aiToggleHint"),
    aiModelChip: $("#aiModelChip"),
    aiOpenSettings: $("#aiOpenSettings"),
    openAI: $("#openAI"),
    heroAI: $("#heroAI"),
    aiDialog: $("#aiDialog"),
    aiForm: $("#aiForm"),
    aiProviders: $("#aiProviders"),
    aiBaseUrl: $("#aiBaseUrl"),
    aiBaseHint: $("#aiBaseHint"),
    aiModel: $("#aiModel"),
    aiModelList: $("#aiModelList"),
    aiKey: $("#aiKey"),
    aiCount: $("#aiCount"),
    aiCountValue: $("#aiCountValue"),
    aiTemp: $("#aiTemp"),
    aiTempValue: $("#aiTempValue"),
    aiTest: $("#aiTest"),
    aiTestResult: $("#aiTestResult"),
    aiForget: $("#aiForget")
  };

  const dailyBook = Engine.getDaily(new Date());

  // 编辑书库优先；模型现场找到的书存在 ShiyeAI 里，两处都能被同一个 id 解析。
  function bookById(id) {
    return Engine.getBook(id) || (AI ? AI.getBook(id) : null);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function loadSaved() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return Array.from(new Set(parsed.filter(function (id) {
        return typeof id === "string" && Boolean(bookById(id));
      })));
    } catch (error) {
      return [];
    }
  }

  function persistSaved() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved));
    } catch (error) {
      // A blocked localStorage should never block the reading experience.
    }
  }

  function isSaved(id) {
    return state.saved.includes(id);
  }

  function getSavedBooks() {
    return state.saved.map(function (id) {
      return bookById(id);
    }).filter(Boolean);
  }

  function titleClass(title) {
    if (title.length >= 10) return "is-xlong";
    if (title.length >= 7) return "is-long";
    return "";
  }

  function coverHTML(book, compact) {
    const className = compact ? "edition-cover compact" : "edition-cover";
    return [
      '<div class="' + className + " " + titleClass(book.title) + '"',
      ' style="--cover-bg:' + escapeHTML(book.palette.bg) + ";--cover-fg:" + escapeHTML(book.palette.fg) + ";--cover-accent:" + escapeHTML(book.palette.accent) + '"',
      ' aria-hidden="true">',
      '<div class="cover-top"><span class="cover-kind">' + escapeHTML(book.kindEn) + " · " + escapeHTML(book.statusLabel) + '</span><span class="cover-seal">拾</span></div>',
      '<span class="cover-mark">' + escapeHTML(book.mark) + "</span>",
      '<div class="cover-title"><span class="cover-rule"></span>',
      '<span class="cover-title-text">' + escapeHTML(book.title) + "</span>",
      '<span class="cover-author">' + escapeHTML(book.author) + " 著</span></div>",
      book.ai ? "" : '<span class="cover-index">NO.' + String(book.index + 1).padStart(2, "0") + "</span>",
      "</div>"
    ].join("");
  }

  function coverStyle(book) {
    return "--cover-bg:" + escapeHTML(book.palette.bg) +
      ";--cover-fg:" + escapeHTML(book.palette.fg) +
      ";--cover-accent:" + escapeHTML(book.palette.accent);
  }

  function saveButtonHTML(book, withLabel) {
    const saved = isSaved(book.id);
    return [
      '<button class="save-button' + (saved ? " is-saved" : "") + '" type="button"',
      ' data-save-id="' + escapeHTML(book.id) + '"',
      ' aria-pressed="' + String(saved) + '"',
      ' aria-label="' + (saved ? "将《" + escapeHTML(book.title) + "》移出书架" : "将《" + escapeHTML(book.title) + "》存入书架") + '">',
      ICONS.bookmark,
      withLabel ? '<span class="save-label">' + (saved ? "已存入书架" : "存入书架") + "</span>" : "",
      "</button>"
    ].join("");
  }

  function resourceLinkHTML(link, compact) {
    const icon = RESOURCE_ICONS[link.type] || ICONS.external;
    return [
      '<a class="' + (compact ? "resource-link" : "resource-card") + (link.primary ? " primary-resource" : "") + '"',
      ' href="' + escapeHTML(link.url) + '"',
      ' target="_blank" rel="noopener noreferrer">',
      compact ? icon : '<span class="resource-icon">' + icon + "</span>",
      compact
        ? "<span>" + escapeHTML(link.label) + "</span>"
        : '<span class="resource-text"><strong>' + escapeHTML(link.label) + "</strong><span>" + escapeHTML(link.note) + "</span></span>",
      compact ? "" : ICONS.external,
      "</a>"
    ].join("");
  }

  function themeChips(book, matched) {
    const labels = (matched && matched.length ? matched : book.themes).slice(0, 4);
    return labels.map(function (label) {
      return '<span class="theme-tag">' + escapeHTML(label) + "</span>";
    }).join("");
  }

  function resultForBook(id) {
    return state.results.find(function (entry) {
      return entry.book.id === id;
    }) || null;
  }

  function formatMatch(match) {
    return match ? String(match) + "% 契合" : "";
  }

  function setStats() {
    const stats = Engine.getStats();
    $("#statBooks").textContent = String(stats.all);
    $("#statWeb").textContent = String(stats.web);
    $("#statLiterary").textContent = String(stats.literary);
    $("#statGenres").textContent = String(stats.genre);
    const aboutBooks = $("#aboutBooks");
    if (aboutBooks) aboutBooks.textContent = String(stats.all);
  }

  function renderQuickChips() {
    els.quickChips.innerHTML = Engine.getQuickChips().map(function (chip) {
      const active = state.chips.has(chip.id);
      return '<button class="chip" type="button" data-chip-id="' + escapeHTML(chip.id) + '" aria-pressed="' + String(active) + '">' +
        escapeHTML(chip.label) + "</button>";
    }).join("");
    els.clearChips.hidden = state.chips.size === 0;
  }

  function renderKindFilter() {
    els.kindFilter.innerHTML = Engine.KIND_FILTERS.map(function (item) {
      return '<button class="segment" type="button" data-kind="' + escapeHTML(item.id) + '" aria-pressed="' +
        String(state.kind === item.id) + '">' + escapeHTML(item.label) + "</button>";
    }).join("");
  }

  function populateSelects() {
    els.statusFilter.innerHTML = Engine.STATUS_FILTERS.map(function (item) {
      return '<option value="' + escapeHTML(item.id) + '">' + escapeHTML(item.label) + "</option>";
    }).join("");
    els.lengthFilter.innerHTML = Engine.LENGTH_FILTERS.map(function (item) {
      return '<option value="' + escapeHTML(item.id) + '">' + escapeHTML(item.label) + "</option>";
    }).join("");
  }

  function syncControls() {
    renderKindFilter();
    els.statusFilter.value = state.status;
    els.lengthFilter.value = state.length;
    els.sortSelect.value = state.sort;
    els.clearQuery.hidden = !els.query.value;
    els.clearChips.hidden = state.chips.size === 0;
    $$(".chip[data-chip-id]", els.quickChips).forEach(function (button) {
      button.setAttribute("aria-pressed", String(state.chips.has(button.dataset.chipId)));
    });
  }

  function renderActiveCriteria() {
    if (!hasConditions() || (state.parsed && state.parsed.unrecognized)) {
      els.activeCriteria.hidden = true;
      els.activeCriteria.innerHTML = "";
      return;
    }

    const labels = Engine.getCriteria(state.parsed, {
      kind: state.kind,
      status: state.status,
      length: state.length
    });

    if (!labels.length && state.parsed) {
      if (state.parsed.openEnded) labels.push("凭感觉翻翻");
      if (state.parsed.textMatches && state.parsed.textMatches.length) {
        labels.push("书名 / 作者：" + state.query);
      }
      if (!labels.length && state.query) labels.push("自由描述");
    }

    if (!labels.length) {
      els.activeCriteria.hidden = true;
      els.activeCriteria.innerHTML = "";
      return;
    }

    const chips = labels.map(function (label) {
      const exclude = label.indexOf("排除 ") === 0;
      return '<span class="criteria-chip' + (exclude ? " exclude" : "") + '">' + escapeHTML(label) + "</span>";
    }).join("");

    els.activeCriteria.innerHTML = '<span class="criteria-label">本次线索</span>' + chips +
      '<button class="link-button" type="button" id="clearAllCriteria" style="margin-left:auto">全部清空</button>';
    els.activeCriteria.hidden = false;
  }

  function hasConditions() {
    return Boolean(state.query.trim()) ||
      state.chips.size > 0 ||
      state.kind !== "all" ||
      state.status !== "all" ||
      state.length !== "all";
  }

  function renderDaily() {
    if (!dailyBook) return;
    const now = new Date();
    els.dailyDate.textContent = String(now.getMonth() + 1).padStart(2, "0") + "." + String(now.getDate()).padStart(2, "0");
    els.dailyCover.setAttribute("style", coverStyle(dailyBook));
    els.dailyCover.innerHTML =
      '<span class="mini-kind">' + escapeHTML(dailyBook.kindEn) + "</span>" +
      '<span class="mini-mark">' + escapeHTML(dailyBook.mark) + "</span>" +
      '<span class="mini-title">' + escapeHTML(dailyBook.title) + "</span>";
    els.dailyTitle.textContent = dailyBook.title;
    els.dailyAuthor.textContent = dailyBook.author + " · " + dailyBook.kindLabel;
    els.dailyLine.textContent = dailyBook.hook;
  }

  function render() {
    renderResults();
    renderActiveCriteria();
    syncControls();
  }

  function getCuratedEntries() {
    return Engine.getCurated().map(function (book) {
      return { book: book, match: null, matched: [], textHit: false };
    });
  }

  function sortedCurated(entries) {
    const list = entries.slice();
    if (state.sort === "score") {
      list.sort(function (a, b) { return b.book.score - a.book.score; });
    } else if (state.sort === "length") {
      list.sort(function (a, b) {
        return a.book.lengthOrder - b.book.lengthOrder || b.book.score - a.book.score;
      });
    }
    return list;
  }

  function renderResults() {
    if (!state.parsed) state.parsed = Engine.parse(state.query, Array.from(state.chips));
    const conditions = hasConditions();
    const curated = !conditions;
    let results;

    if (curated) {
      results = sortedCurated(getCuratedEntries());
    } else {
      results = Engine.recommend(state.parsed, {
        kind: state.kind,
        status: state.status,
        length: state.length
      }, state.sort);
    }

    state.results = results;
    const displayLimit = 12;
    const displayed = results.slice(0, displayLimit);
    const featured = displayed[0] || null;
    const rest = displayed.slice(1);

    els.resultsEyebrow.textContent = curated ? "EDITOR'S SHELF" : "YOUR MATCHES";

    if (state.parsed.unrecognized && conditions) {
      els.resultsTitle.textContent = "换个说法，再翻一次";
      els.resultsCount.textContent = "0 本";
      els.featuredMount.innerHTML = "";
      els.bookGrid.innerHTML = "";
      els.emptyCopy.textContent = "我还没学会这个说法。试试输入具体的类型、氛围或书名，例如「克苏鲁」「群像」「已完结」「像《活着》那样」。";
      els.emptyState.hidden = false;
      els.resultsFootnote.hidden = true;
      return;
    }

    if (curated) {
      els.resultsTitle.textContent = "先从这里翻起";
      els.resultsCount.textContent = results.length + " 本编辑精选";
    } else if (results.length) {
      const exactCount = results.filter(function (entry) {
        return (entry.match || 0) >= 90;
      }).length;
      let countText = results.length + " 本相关";
      if (exactCount === results.length) {
        countText = results.length + " 本完全命中";
      } else if (exactCount > 0) {
        countText += " · " + exactCount + " 本完全命中";
      } else if (results.some(function (entry) { return Boolean(entry.match); })) {
        countText += " · 部分匹配";
      }
      els.resultsTitle.textContent = "为你翻到这些书";
      els.resultsCount.textContent = countText;
    } else {
      els.resultsTitle.textContent = "这一格，暂时空着";
      els.resultsCount.textContent = "0 本";
    }

    if (!featured) {
      els.featuredMount.innerHTML = "";
      els.bookGrid.innerHTML = "";
      els.emptyCopy.textContent = conditions
        ? "这些条件叠在一起，书库里暂时没有合适的故事。试试去掉一个条件，或者换一个更宽的词。"
        : "书库好像被谁搬空了，刷新页面再试一次。";
      els.emptyState.hidden = false;
      els.resultsFootnote.hidden = true;
      return;
    }

    els.emptyState.hidden = true;
    els.featuredMount.innerHTML = featuredHTML(featured);
    els.bookGrid.innerHTML = rest.map(function (entry, index) {
      return cardHTML(entry, index);
    }).join("");

    const notes = [];
    if (!curated) {
      const fullMatches = results.filter(function (entry) {
        return (entry.match || 0) >= 90;
      }).length;
      if (!results.some(function (entry) { return Boolean(entry.match); })) {
        notes.push("当前条件下按编辑评分排序。");
      } else if (fullMatches === 0) {
        notes.push("没有书完全命中全部偏好，以下是部分匹配。");
      } else if (fullMatches < results.length) {
        notes.push("其中 " + fullMatches + " 本完全命中，其余为部分匹配。");
      }
      if (results.length > displayLimit) {
        notes.push("共 " + results.length + " 本，展示前 " + displayLimit + " 本。");
      }
      notes.push("匹配度表示与你口味的吻合程度，不是作品评分。");
    } else {
      notes.push("编辑精选 · 点开任意一本，查看完整书评与正版资源。");
    }
    els.resultsFootnote.textContent = notes.join(" ");
    els.resultsFootnote.hidden = false;
  }

  function featuredHTML(entry) {
    const book = entry.book;
    const links = Engine.getLinks(book);
    const matched = entry.matched || [];
    const scoreFacts = [
      ["设定", book.scores[0]],
      ["人物", book.scores[1]],
      ["后劲", book.scores[4]]
    ].map(function (pair) {
      return '<span class="score-fact"><span>' + pair[0] + "</span><strong>" + pair[1].toFixed(1) + "</strong></span>";
    }).join("");

    const kicker = entry.match
      ? '<span class="match-pill">' + formatMatch(entry.match) + "</span>"
      : '<span class="kind-pill">编辑主推</span>';

    return [
      '<article class="featured" style="' + coverStyle(book) + '">',
      '<div class="featured-visual">',
      coverHTML(book),
      '<p class="featured-caption">「' + escapeHTML(book.mood[0]) + "」<br>" + escapeHTML(book.mood[1]) + "</p>",
      "</div>",
      '<div class="featured-content">',
      '<div class="featured-kicker">' + kicker,
      '<span class="kind-pill">' + escapeHTML(book.kindLabel) + "</span>",
      '<span class="meta-inline">' + escapeHTML(book.statusLabel) + " · " + escapeHTML(book.lengthLabel) + " · " + escapeHTML(book.year) + "</span></div>",
      '<h2 class="featured-title" id="featuredTitle">' + escapeHTML(book.title) + "</h2>",
      '<p class="featured-author">' + escapeHTML(book.author) + " · " + escapeHTML(book.platform) + "</p>",
      '<p class="featured-line">' + escapeHTML(book.hook) + "</p>",
      '<div class="theme-row">' + themeChips(book, matched) + "</div>",
      '<div class="featured-review"><div class="review-label-row"><span class="review-label">拾页编辑评 / SHIYE REVIEW</span><span class="review-source">非平台官方评分</span></div>',
      "<p>" + escapeHTML(book.review) + "</p></div>",
      '<div class="score-strip"><div class="score-main"><strong>' + book.score.toFixed(1) + '</strong><span>/ 10 拾页评分</span></div><div class="score-facts">' + scoreFacts + "</div></div>",
      '<div class="review-columns"><div class="review-column"><h4>值得</h4><ul>' +
        book.pros.slice(0, 2).map(function (pro) { return "<li>" + escapeHTML(pro) + "</li>"; }).join("") +
        '</ul></div><div class="review-column cons"><h4>留意</h4><ul>' +
        book.cons.slice(0, 1).map(function (con) { return "<li>" + escapeHTML(con) + "</li>"; }).join("") +
        "</ul></div></div>",
      '<div class="resource-strip">' + links.slice(0, 3).map(function (link) {
        return resourceLinkHTML(link, true);
      }).join("") + "</div>",
      '<div class="featured-actions"><button class="cta-button" type="button" data-open-book="' + escapeHTML(book.id) + '">查看完整书评与资源 ' + ICONS.arrow + "</button>" +
        saveButtonHTML(book, true) + "</div>",
      "</div>",
      "</article>"
    ].join("");
  }

  function cardHTML(entry, index) {
    const book = entry.book;
    const matched = entry.matched || [];
    const labels = (matched.length ? matched : book.themes).slice(0, 3);
    const tags = labels.map(function (label) {
      return '<span class="card-tag">' + escapeHTML(label) + "</span>";
    }).join("");

    return [
      '<article class="book-card" style="--i:' + index + '">',
      '<button class="card-cover-button" type="button" data-open-book="' + escapeHTML(book.id) + '" aria-label="查看《' +
        escapeHTML(book.title) + "》的完整书评与资源\">" + coverHTML(book, true) + "</button>",
      '<div class="card-main">',
      '<div class="card-topline"><span>' + escapeHTML(book.kindLabel) + '</span><span class="dot"></span><span>' +
        escapeHTML(book.statusLabel) + '</span><span class="dot"></span><span>' + escapeHTML(book.lengthLabel) +
        "</span>" + (entry.match ? '<span class="card-match">' + formatMatch(entry.match) + "</span>" : "") + "</div>",
      '<h3 class="card-title"><button type="button" data-open-book="' + escapeHTML(book.id) + '">' + escapeHTML(book.title) + "</button></h3>",
      '<p class="card-author">' + escapeHTML(book.author) + " · " + escapeHTML(book.year) + "</p>",
      '<p class="card-line">' + escapeHTML(book.summary) + "</p>",
      '<div class="card-tags">' + tags + "</div>",
      '<div class="card-bottom"><div class="card-score"><strong>' + book.score.toFixed(1) +
        '</strong><span>拾页评分</span></div><button class="card-detail" type="button" data-open-book="' +
        escapeHTML(book.id) + '">书评与资源 ' + ICONS.arrow + "</button></div>",
      "</div>",
      saveButtonHTML(book, false).replace("save-button", "card-save save-button"),
      "</article>"
    ].join("");
  }

  function modalHTML(book) {
    const links = Engine.getLinks(book);
    const similar = Engine.getSimilar(book.id, 3);
    const entry = resultForBook(book.id);
    const isAI = Boolean(book.ai);
    const scoreLabels = ["设定", "人物", "节奏", "文字", "后劲"];
    const scores = Array.isArray(book.scores) ? book.scores : [];
    const bars = scores.map(function (score, index) {
      return '<div class="score-bar-row"><span>' + scoreLabels[index] + '</span><div class="score-bar-track"><div class="score-bar-fill" style="width:' +
        (score * 10) + '%"></div></div><strong>' + score.toFixed(1) + "</strong></div>";
    }).join("");

    const aiNote = isAI
      ? '<div class="ai-callout"><div class="ai-callout-head"><span class="ai-pill">' +
        escapeHTML(book.confidenceLabel || "模型生成") + "</span><strong>未经拾页核实</strong></div><p>这本书由 " +
        escapeHTML(AI ? AI.getConfig().model : "大模型") + " 现场推荐，拾页编辑没有读过它；" +
        (book.note ? "模型自述：" + escapeHTML(book.note) + "；" : "") +
        "请点下方「豆瓣读书」核对书名与作者，再决定要不要花时间。" +
        (book.query ? "本次检索诉求：「" + escapeHTML(book.query) + "」" : "") + "</p>" +
        '<button class="link-button" type="button" data-forget-book="' + escapeHTML(book.aiId || book.id) + '">不再保留这条推荐</button></div>'
      : "";

    const similarHTML = similar.length
      ? '<div class="similar-grid">' + similar.map(function (item) {
        return '<button class="similar-card" type="button" data-open-book="' + escapeHTML(item.id) + '">' +
          '<span class="similar-cover" style="' + coverStyle(item) + '"><span>' + escapeHTML(item.mark) + "</span></span>" +
          '<span class="similar-text"><strong>' + escapeHTML(item.title) + "</strong><span>" + escapeHTML(item.kindLabel) + " · " + item.score.toFixed(1) + "</span></span></button>";
      }).join("") + "</div>"
      : '<p class="resource-note">' + (isAI ? "这是模型现场推荐的书，书库里暂时算不出相近条目。" : "书库里暂时没有足够相近的作品。") + "</p>";

    return [
      '<div class="modal-book" style="' + coverStyle(book) + '">',
      '<div class="modal-book-visual">',
      coverHTML(book),
      '<p class="modal-visual-caption"><span>拾页签</span>「' + escapeHTML(book.mood[0]) + "」<br>" + escapeHTML(book.mood[1]) + " · " + escapeHTML(book.mood[2]) + "</p>",
      '<div class="modal-visual-meta"><span>' + escapeHTML(book.kindLabel) + "</span><span>" + escapeHTML(book.statusLabel) +
        "</span><span>" + escapeHTML(book.lengthLabel) + "</span></div>",
      '<div class="modal-visual-footer"><span>SHIYE READING ROOM</span><span>' +
        (isAI ? "MODEL PICK" : "NO." + String(book.index + 1).padStart(2, "0")) + "</span></div>",
      "</div>",
      '<div class="modal-book-content">',
      '<div class="modal-kicker"><span class="kind-pill">' + escapeHTML(book.kindLabel) + "</span>" +
        (isAI ? '<span class="ai-pill">AI 现场推荐</span>' : "") +
        (entry && entry.match ? '<span class="match-pill">' + formatMatch(entry.match) + "</span>" : "") +
        '<span class="meta-inline">' + escapeHTML(book.year) + " · " + escapeHTML(book.platform) + "</span></div>",
      '<h2 class="modal-title" id="bookModalTitle">' + escapeHTML(book.title) + "</h2>",
      '<p class="modal-author">' + escapeHTML(book.author) + (book.words ? " · " + escapeHTML(book.words) : "") + "</p>",
      '<p class="modal-summary">' + escapeHTML(book.summary) + "</p>",
      '<p class="modal-hook">' + escapeHTML(book.hook) + "</p>",
      '<section class="modal-section"><div class="modal-section-heading"><div><p class="eyebrow">' + (isAI ? "MODEL'S TAKE" : "EDITOR'S REVIEW") + "</p><h3>" + (isAI ? "模型推荐理由" : "拾页编辑评") + "</h3></div>" +
        (book.score == null ? "" : '<div class="modal-score"><strong>' + book.score.toFixed(1) + '</strong><span>/ 10</span></div>') +
        '</div>' + aiNote + '<p class="modal-review">' + escapeHTML(book.review) + "</p>" +
        (bars ? '<div class="score-bars">' + bars + "</div>" : "") +
        '<div class="review-columns modal-review-columns"><div class="review-column"><h4>值得</h4><ul>' +
        book.pros.map(function (pro) { return "<li>" + escapeHTML(pro) + "</li>"; }).join("") +
        '</ul></div><div class="review-column cons"><h4>留意</h4><ul>' +
        book.cons.map(function (con) { return "<li>" + escapeHTML(con) + "</li>"; }).join("") +
        "</ul></div></div>" +
        '<div class="mood-row">' + book.mood.map(function (mood) {
          return '<span class="mood-chip">' + escapeHTML(mood) + "</span>";
        }).join("") + "</div>" +
        (book.contentNote ? '<div class="content-note"><strong>内容提示</strong><span>' + escapeHTML(book.contentNote) + "</span></div>" : "") +
        '<p class="resource-note">' + (isAI ? "以上入口是按书名生成的平台站内搜索，用来核对这本书是否真实存在。" : "评分与书评为拾页编辑视角，非豆瓣或平台官方评分。读者评价可点开豆瓣读书继续看。") + "</p></section>",
      '<section class="modal-section"><div class="modal-section-heading"><div><p class="eyebrow">WHERE TO READ</p><h3>正版阅读与延伸</h3></div></div>' +
        '<div class="resource-grid">' + links.map(function (link) { return resourceLinkHTML(link, false); }).join("") + "</div>" +
        '<p class="resource-note">入口为各平台站内搜索页；版权、库存与连载状态以平台为准。拾页不提供盗版下载。</p></section>',
      '<section class="modal-section"><div class="modal-section-heading"><div><p class="eyebrow">READ NEXT</p><h3>相似作品</h3></div></div>' + similarHTML + "</section>",
      '<div class="modal-actions">' +
        '<button class="cta-button" type="button" data-copy-book="' + escapeHTML(book.id) + '">复制安利文案 ' + ICONS.spark + "</button>" +
        saveButtonHTML(book, true) +
        "</div>",
      "</div>",
      "</div>"
    ].join("");
  }

  function openBook(id, trigger) {
    const book = bookById(id);
    if (!book) return;

    state.activeBookId = id;
    if (!state.bookDialogOpen) {
      state.returnFocus = trigger || document.activeElement;
    }

    els.bookModalBody.innerHTML = modalHTML(book);
    if (!els.bookDialog.open) {
      els.bookDialog.showModal();
      state.bookDialogOpen = true;
    } else {
      const panel = $(".modal-panel", els.bookDialog);
      if (panel) panel.scrollTop = 0;
    }
    document.body.classList.add("is-locked");
    syncSaveButtons();
    try {
      window.history.replaceState(null, "", "#book=" + encodeURIComponent(id));
    } catch (error) {
      // file:// and embedded views may disallow history writes.
    }
  }

  function openShelf() {
    renderShelf();
    if (!els.shelfDialog.open) els.shelfDialog.showModal();
    document.body.classList.add("is-locked");
  }

  function renderShelf() {
    const books = getSavedBooks();
    if (!books.length) {
      els.shelfBody.innerHTML = '<div class="shelf-empty"><p class="empty-mark" aria-hidden="true">空</p><h3>书架还空着。</h3><p>遇到心动的那本，点一下书签就能把它留在这里。</p><button class="cta-button" type="button" id="shelfBrowse">去翻几本 ' + ICONS.arrow + "</button></div>";
      const browse = $("#shelfBrowse");
      if (browse) {
        browse.addEventListener("click", function () {
          els.shelfDialog.close();
          $("#matcher").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return;
    }

    els.shelfBody.innerHTML = '<div class="shelf-list">' + books.map(function (book) {
      const meta = book.score == null
        ? escapeHTML(book.confidenceLabel || "AI 推荐") + " · 未核实"
        : book.score.toFixed(1);
      return '<article class="shelf-item"><div class="shelf-cover" style="' + coverStyle(book) + '"><span>' + escapeHTML(book.mark) +
        "</span></div><div><h3>" + escapeHTML(book.title) + "</h3><p>" + escapeHTML(book.author) + " · " + escapeHTML(book.kindLabel) +
        " · " + meta + '</p></div><div class="shelf-actions"><button type="button" data-open-book="' +
        escapeHTML(book.id) + '">查看</button><button type="button" data-remove-saved="' + escapeHTML(book.id) +
        "\">移出</button></div></article>";
    }).join("") + "</div>";
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function syncBodyLock() {
    const open = Boolean(document.querySelector("dialog[open]"));
    document.body.classList.toggle("is-locked", open);
    if (!open) {
      state.bookDialogOpen = false;
      state.activeBookId = null;
      try {
        if (window.location.hash.indexOf("#book=") === 0) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      } catch (error) {
        // Ignore history restrictions in embedded views.
      }
    }
  }

  function syncSaveButtons() {
    $$("[data-save-id]").forEach(function (button) {
      const id = button.dataset.saveId;
      const saved = isSaved(id);
      button.classList.toggle("is-saved", saved);
      button.setAttribute("aria-pressed", String(saved));
      const label = $(".save-label", button);
      if (label) label.textContent = saved ? "已存入书架" : "存入书架";
      const book = bookById(id);
      if (book) {
        button.setAttribute("aria-label", saved ? "将《" + book.title + "》移出书架" : "将《" + book.title + "》存入书架");
      }
    });
    els.shelfCount.textContent = String(state.saved.length);
  }

  function toggleSave(id) {
    const book = bookById(id);
    if (!book) return;
    if (isSaved(id)) {
      state.saved = state.saved.filter(function (savedId) { return savedId !== id; });
      showToast("已把《" + book.title + "》移出书架");
    } else {
      state.saved = [id].concat(state.saved);
      showToast("《" + book.title + "》已放入书架");
    }
    persistSaved();
    syncSaveButtons();
    if (els.shelfDialog.open) renderShelf();
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2200);
  }

  async function copyBook(id, trigger) {
    const book = bookById(id);
    if (!book) return;
    const text = [
      "《" + book.title + "》 / " + book.author,
      book.hook,
      book.score == null
        ? "AI 现场推荐 · 未经核实，读前请先核对作者与书名"
        : "拾页评分 " + book.score.toFixed(1) + "/10 · " + book.kindLabel + " · " + book.statusLabel,
      "书评与正版资源：拾页 · 小说推荐工具"
    ].join("\n");

    function feedback(message) {
      if (!trigger || !trigger.isConnected) return;
      const original = trigger.innerHTML;
      trigger.textContent = message;
      window.setTimeout(function () {
        if (trigger.isConnected) trigger.innerHTML = original;
      }, 1800);
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      feedback("已复制");
      showToast("安利文案已复制，去分享给同好");
    } catch (error) {
      feedback("复制失败");
      showToast("复制没成功，可以手动选中书名分享");
    }
  }

  /* ---------------- AI 实时找书 ---------------- */

  let aiProviderDraft = "deepseek";

  function plain(value) {
    return String(value == null ? "" : value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  }

  function findEditorial(title, author) {
    const target = plain(title);
    if (!target) return null;
    const books = Engine.getBooks();
    const exact = books.find(function (book) { return plain(book.title) === target; });
    if (exact) return exact;
    return books.find(function (book) {
      return plain(book.title).indexOf(target) === 0 && author && plain(book.author) === plain(author);
    }) || null;
  }

  function aiErrorMessage(error) {
    const message = (error && error.message) || "检索失败";
    const hint = (error && error.hint) || "";
    return hint ? message + " · " + hint : message;
  }

  function aiCardHTML(book, index) {
    const links = Engine.getLinks(book);
    const review = links.find(function (link) { return link.type === "review"; });
    const read = links.find(function (link) { return link.type === "read"; });
    const tags = (book.tags || []).slice(0, 4).map(function (tag) {
      return '<span class="ai-card-tag">' + escapeHTML(tag) + "</span>";
    }).join("");
    const metaBits = [book.kindLabel, book.statusLabel, book.lengthLabel, book.year].filter(Boolean);

    return [
      '<article class="ai-card" style="--i:' + index + ";" + coverStyle(book) + '">',
      '<div class="ai-card-cover">' + coverHTML(book, true) + "</div>",
      '<div class="ai-card-main">',
      '<div class="ai-card-top"><span class="ai-pill">模型生成</span>',
      '<span class="ai-confidence ' + escapeHTML(book.confidence || "medium") + '">' + escapeHTML(book.confidenceLabel || "") + "</span>",
      '<span class="ai-card-meta">' + escapeHTML(metaBits.join(" · ")) + "</span></div>",
      '<h3 class="ai-card-title"><button type="button" data-open-book="' + escapeHTML(book.id) + '">' + escapeHTML(book.title) + "</button></h3>",
      '<p class="ai-card-author">' + escapeHTML(book.author) + (book.platform ? " · " + escapeHTML(book.platform) : "") + "</p>",
      '<p class="ai-card-why">' + escapeHTML(book.review || book.hook || book.summary || "") + "</p>",
      tags ? '<div class="ai-card-tags">' + tags + "</div>" : "",
      '<div class="ai-card-actions">',
      review ? '<a class="resource-link" href="' + escapeHTML(review.url) + '" target="_blank" rel="noopener noreferrer">' + ICONS.review + "<span>豆瓣核对</span></a>" : "",
      read ? '<a class="resource-link" href="' + escapeHTML(read.url) + '" target="_blank" rel="noopener noreferrer">' + ICONS.read + "<span>去找这本</span></a>" : "",
      saveButtonHTML(book, true),
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }

  function showAIStatus(text, options) {
    const opts = options || {};
    els.aiResults.hidden = false;
    els.aiStatus.hidden = false;
    els.aiStatus.classList.toggle("is-error", Boolean(opts.error));
    els.aiStatusText.textContent = text;
    els.aiStop.hidden = !aiState.busy;
  }

  function hideAIStatus() {
    els.aiStatus.hidden = true;
    els.aiStatus.classList.remove("is-error");
    els.aiStop.hidden = true;
  }

  function renderAIResults() {
    const hasBooks = aiState.books.length > 0;
    els.aiResults.hidden = !(hasBooks || aiState.busy || Boolean(aiState.error));
    els.aiGrid.innerHTML = aiState.books.map(aiCardHTML).join("");
    els.aiMeta.textContent = aiState.meta;
    els.aiAgain.hidden = !hasBooks;
    els.aiAgain.disabled = aiState.busy;
    els.aiClose.hidden = !(hasBooks || Boolean(aiState.error));
    els.aiDisclaimer.hidden = !hasBooks;
    syncSaveButtons();
  }

  function stopAISearch() {
    if (aiState.handle) {
      try {
        aiState.handle.abort();
      } catch (error) {
        // ignore
      }
    }
    aiState.handle = null;
    aiState.busy = false;
  }

  function collapseAI() {
    stopAISearch();
    aiState.books = [];
    aiState.error = null;
    aiState.meta = "";
    els.aiGrid.innerHTML = "";
    els.aiMeta.textContent = "";
    hideAIStatus();
    els.aiResults.hidden = true;
  }

  function startAISearch(options) {
    const opts = options || {};
    if (!aiState.enabled) return;
    if (!state.query && !state.chips.size) return;
    if (aiState.busy) {
      if (!opts.force) return;
      stopAISearch();
    }

    const config = AI.getConfig();
    const request = {
      query: state.query,
      chips: Array.from(state.chips).map(function (id) {
        const chip = Engine.QUICK_CHIPS.find(function (item) { return item.id === id; });
        return chip ? chip.label : id;
      }),
      kind: state.kind,
      status: state.status,
      length: state.length,
      exclude: (state.parsed && state.parsed.exclusions) ? state.parsed.exclusions.map(function (item) {
        return item.label || item.id || "";
      }).filter(Boolean) : [],
      avoid: state.results.slice(0, 10).map(function (entry) { return entry.book.title; })
        .concat(aiState.books.map(function (book) { return book.title; })),
      count: config.count,
      temperature: config.temperature + (opts.force ? 0.2 : 0),
      force: Boolean(opts.force),
      findEditorial: findEditorial
    };

    aiState.lastRequest = request;
    aiState.error = null;
    aiState.busy = true;
    aiState.meta = "";
    if (!opts.keep) aiState.books = [];
    renderAIResults();
    showAIStatus("正在把诉求交给 " + config.model + " …");

    aiState.handle = AI.search(request, {
      onStatus: function (text) {
        if (!aiState.busy) return;
        showAIStatus(text);
      },
      onDelta: function (piece, raw) {
        if (!aiState.busy) return;
        showAIStatus("模型正在写书单… 已收到 " + String(raw.length) + " 字");
      },
      onDone: function (result) {
        aiState.busy = false;
        aiState.handle = null;
        aiState.books = result.books || [];
        aiState.meta = [
          result.model,
          (result.elapsed / 1000).toFixed(1) + " 秒",
          AI.dateStamp(),
          result.cached ? "上次结果" : ""
        ].filter(Boolean).join(" · ");
        hideAIStatus();
        renderAIResults();
      },
      onError: function (error) {
        aiState.busy = false;
        aiState.handle = null;
        aiState.error = error || { message: "检索失败" };
        aiState.meta = "";
        renderAIResults();
        showAIStatus(aiErrorMessage(aiState.error), { error: true });
        if (aiState.error.code === "config" || aiState.error.code === "auth") {
          showToast("模型没接通，点「设置」补一下 Key");
        }
      }
    });
  }

  function syncAIBar() {
    const config = AI ? AI.getConfig() : null;
    aiState.configured = Boolean(config && AI.isConfigured(config));
    aiState.enabled = aiState.configured && Boolean(config.enabled);
    els.aiToggle.setAttribute("aria-pressed", String(aiState.enabled));
    els.aiToggle.classList.toggle("is-on", aiState.enabled);
    els.aiModelChip.textContent = aiState.configured ? config.model : "未接入模型";
    els.aiModelChip.classList.toggle("is-live", aiState.configured);
    els.aiToggleHint.textContent = !aiState.configured
      ? "未接入模型 · 搜索时让大模型现场再找一遍"
      : (aiState.enabled
        ? "已接入 " + config.model + " · 搜索时同时问一次模型"
        : "已接入 " + config.model + " · 当前关闭");
  }

  function updateAIRanges() {
    els.aiCountValue.textContent = els.aiCount.value;
    els.aiTempValue.textContent = Number(els.aiTemp.value).toFixed(1);
  }

  function renderAIProviders(activeId) {
    aiProviderDraft = activeId || "deepseek";
    els.aiProviders.innerHTML = AI.PROVIDERS.map(function (provider) {
      return '<button class="chip" type="button" data-provider="' + escapeHTML(provider.id) + '" aria-pressed="' +
        String(provider.id === aiProviderDraft) + '">' + escapeHTML(provider.label) + "</button>";
    }).join("");
    applyProviderHint();
  }

  function applyProviderHint() {
    const provider = AI.PROVIDER_BY_ID(aiProviderDraft);
    if (!provider) return;
    els.aiBaseHint.innerHTML = "请求会发往 <code>" + escapeHTML(AI.endpointOf(provider.baseUrl || "https://…")) +
      "</code>。" + escapeHTML(provider.note || "");
    els.aiModelList.innerHTML = (provider.models || []).map(function (model) {
      return '<option value="' + escapeHTML(model) + '"></option>';
    }).join("");
  }

  function openAISettings() {
    const config = AI.getConfig();
    renderAIProviders(config.provider);
    els.aiBaseUrl.value = config.baseUrl || "";
    els.aiModel.value = config.model || "";
    els.aiKey.value = config.key || "";
    els.aiCount.value = String(config.count || 6);
    els.aiTemp.value = String(config.temperature == null ? 0.6 : config.temperature);
    updateAIRanges();
    els.aiTestResult.textContent = "";
    els.aiTestResult.className = "ai-test-result";
    els.aiForget.hidden = !config.key;
    if (!els.aiDialog.open) els.aiDialog.showModal();
    document.body.classList.add("is-locked");
  }

  function readAIDraft() {
    const provider = AI.PROVIDER_BY_ID(aiProviderDraft);
    return {
      provider: aiProviderDraft,
      baseUrl: (els.aiBaseUrl.value.trim() || (provider && provider.baseUrl) || ""),
      model: (els.aiModel.value.trim() || (provider && provider.model) || ""),
      key: els.aiKey.value.trim(),
      count: Number(els.aiCount.value) || 6,
      temperature: Number(els.aiTemp.value) || 0.6
    };
  }

  function aiToggleFlow() {
    if (!aiState.configured) {
      openAISettings();
      showToast("先填一个 API Key，模型才能替你找书");
      return;
    }
    const next = !aiState.enabled;
    AI.saveConfig({ enabled: next });
    syncAIBar();
    showToast(next ? "AI 实时找书已开启" : "AI 实时找书已关闭");
    if (next && (state.query || state.chips.size)) startAISearch({});
  }

  function aiFocusEntry(trigger) {
    const target = $("#matcher");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(function () {
      if (els.query) els.query.focus({ preventScroll: true });
    }, 320);
    if (!aiState.configured) {
      window.setTimeout(function () {
        if (!aiState.configured) openAISettings();
      }, 520);
    }
  }

  function scrollToResults() {
    const target = (els.aiResults && !els.aiResults.hidden) ? els.aiResults : els.results;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function commitQuery() {
    state.query = els.query.value.trim();
    state.parsed = Engine.parse(state.query, Array.from(state.chips));
  }

  function runSearch(options) {
    const opts = options || {};
    commitQuery();
    if (opts.syncMeta) {
      if (state.parsed.status) state.status = state.parsed.status;
      if (state.parsed.length) state.length = state.parsed.length;
      if (state.parsed.kind) state.kind = state.parsed.kind;
    }
    render();
    if (opts.ai) {
      startAISearch({ force: Boolean(opts.force) });
    } else {
      collapseAI();
    }
    if (opts.scroll) scrollToResults();
  }

  function resetAll(options) {
    const opts = options || {};
    state.query = "";
    state.chips.clear();
    state.kind = "all";
    state.status = "all";
    state.length = "all";
    state.sort = "match";
    els.query.value = "";
    state.parsed = Engine.parse("", []);
    els.advancedFilters.hidden = true;
    els.filterToggle.setAttribute("aria-expanded", "false");
    render();
    if (opts.scroll) {
      $("#matcher").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function randomBook() {
    const pool = state.results.length
      ? state.results.map(function (entry) { return entry.book; })
      : Engine.getCurated();
    const book = pool[Math.floor(Math.random() * pool.length)];
    if (book) openBook(book.id, els.luckyBtn);
  }

  function applyTheme(theme, persist) {
    const next = theme === "night" ? "night" : "paper";
    if (next === "night") {
      document.documentElement.dataset.theme = "night";
    } else {
      delete document.documentElement.dataset.theme;
    }
    els.themeToggle.setAttribute("aria-pressed", String(next === "night"));
    els.themeToggle.setAttribute("aria-label", next === "night" ? "切换到日间模式" : "切换到夜间模式");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "night" ? "#171613" : "#f2ede3");
    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        // Ignore storage restrictions.
      }
    }
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "night" ? "night" : "paper";
  }

  function openFromHash() {
    if (window.location.hash.indexOf("#book=") !== 0) return;
    const id = decodeURIComponent(window.location.hash.slice(6));
    if (bookById(id)) {
      openBook(id, null);
    }
  }

  function bindEvents() {
    els.searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      runSearch({ syncMeta: true, scroll: true, ai: true });
    });

    els.query.addEventListener("input", function () {
      els.clearQuery.hidden = !els.query.value;
    });

    els.query.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && els.query.value) {
        els.query.value = "";
        els.clearQuery.hidden = true;
        commitQuery();
        render();
      }
    });

    els.clearQuery.addEventListener("click", function () {
      els.query.value = "";
      els.clearQuery.hidden = true;
      state.query = "";
      state.parsed = Engine.parse("", Array.from(state.chips));
      render();
      els.query.focus();
    });

    els.quickChips.addEventListener("click", function (event) {
      const button = event.target.closest("[data-chip-id]");
      if (!button) return;
      const id = button.dataset.chipId;
      if (state.chips.has(id)) state.chips.delete(id);
      else state.chips.add(id);
      runSearch({ syncMeta: true });
    });

    els.clearChips.addEventListener("click", function () {
      state.chips.clear();
      runSearch({ syncMeta: false });
    });

    els.kindFilter.addEventListener("click", function (event) {
      const button = event.target.closest("[data-kind]");
      if (!button) return;
      state.kind = button.dataset.kind;
      runSearch({ syncMeta: false });
    });

    els.statusFilter.addEventListener("change", function () {
      state.status = els.statusFilter.value;
      runSearch({ syncMeta: false });
    });

    els.lengthFilter.addEventListener("change", function () {
      state.length = els.lengthFilter.value;
      runSearch({ syncMeta: false });
    });

    els.sortSelect.addEventListener("change", function () {
      state.sort = els.sortSelect.value;
      commitQuery();
      render();
    });

    els.filterToggle.addEventListener("click", function () {
      const open = els.advancedFilters.hidden;
      els.advancedFilters.hidden = !open;
      els.filterToggle.setAttribute("aria-expanded", String(open));
    });

    els.resetFilters.addEventListener("click", function () {
      resetAll({ scroll: false });
      showToast("已回到编辑精选");
    });

    els.luckyBtn.addEventListener("click", randomBook);
    els.emptyLucky.addEventListener("click", randomBook);

    els.emptyReset.addEventListener("click", function () {
      resetAll({ scroll: false });
      els.results.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.dailyOpen.addEventListener("click", function () {
      if (dailyBook) openBook(dailyBook.id, els.dailyOpen);
    });

    els.themeToggle.addEventListener("click", function () {
      const next = currentTheme() === "night" ? "paper" : "night";
      applyTheme(next, true);
    });

    els.openShelf.addEventListener("click", openShelf);

    els.openAbout.addEventListener("click", function () {
      if (!els.aboutDialog.open) els.aboutDialog.showModal();
      document.body.classList.add("is-locked");
    });

    $$("[data-scroll]").forEach(function (button) {
      button.addEventListener("click", function () {
        const target = $(button.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.addEventListener("click", function (event) {
      const closeButton = event.target.closest("[data-close-dialog]");
      if (closeButton) {
        closeDialog(closeButton.closest("dialog"));
        return;
      }

      const saveButton = event.target.closest("[data-save-id]");
      if (saveButton) {
        event.preventDefault();
        event.stopPropagation();
        toggleSave(saveButton.dataset.saveId);
        return;
      }

      const removeButton = event.target.closest("[data-remove-saved]");
      if (removeButton) {
        event.preventDefault();
        toggleSave(removeButton.dataset.removeSaved);
        return;
      }

      const copyButton = event.target.closest("[data-copy-book]");
      if (copyButton) {
        event.preventDefault();
        copyBook(copyButton.dataset.copyBook, copyButton);
        return;
      }

      const criteriaReset = event.target.closest("#clearAllCriteria");
      if (criteriaReset) {
        resetAll({ scroll: false });
        return;
      }

      const forgetButton = event.target.closest("[data-forget-book]");
      if (forgetButton) {
        event.preventDefault();
        if (AI) AI.forgetBook(forgetButton.dataset.forgetBook);
        if (els.bookDialog.open) closeDialog(els.bookDialog);
        showToast("已从本地缓存里删掉这条推荐");
        return;
      }

      const opener = event.target.closest("[data-open-book]");
      if (opener) {
        event.preventDefault();
        let restoreTo = opener;
        if (els.shelfDialog.open) {
          els.shelfDialog.close();
          restoreTo = els.openShelf;
        }
        openBook(opener.dataset.openBook, restoreTo);
      }
    });

    [els.bookDialog, els.shelfDialog, els.aboutDialog, els.aiDialog].forEach(function (dialog) {
      if (!dialog) return;
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener("close", function () {
        syncBodyLock();
        if (dialog === els.bookDialog && state.returnFocus && state.returnFocus.isConnected) {
          try {
            state.returnFocus.focus({ preventScroll: true });
          } catch (error) {
            // Older browsers may not support focus options.
          }
        }
      });
    });

    window.addEventListener("hashchange", function () {
      if (window.location.hash.indexOf("#book=") === 0) openFromHash();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "/" && document.activeElement !== els.query && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        els.query.focus();
      }
    });

    /* ---- AI 实时找书 ---- */
    els.openAI.addEventListener("click", function () { aiFocusEntry(els.openAI); });
    if (els.heroAI) els.heroAI.addEventListener("click", function () { aiFocusEntry(els.heroAI); });
    els.aiToggle.addEventListener("click", aiToggleFlow);
    els.aiOpenSettings.addEventListener("click", openAISettings);
    els.aiClose.addEventListener("click", function () {
      collapseAI();
      showToast("已收起模型结果");
    });
    els.aiAgain.addEventListener("click", function () {
      startAISearch({ force: true, keep: true });
    });
    els.aiStop.addEventListener("click", function () {
      stopAISearch();
      hideAIStatus();
      showToast("已停下这次检索");
    });
    els.aiProviders.addEventListener("click", function (event) {
      const button = event.target.closest("[data-provider]");
      if (!button) return;
      aiProviderDraft = button.dataset.provider;
      const provider = AI.PROVIDER_BY_ID(aiProviderDraft);
      renderAIProviders(aiProviderDraft);
      if (provider && provider.baseUrl) els.aiBaseUrl.value = provider.baseUrl;
      if (provider && provider.model) els.aiModel.value = provider.model;
    });
    els.aiCount.addEventListener("input", updateAIRanges);
    els.aiTemp.addEventListener("input", updateAIRanges);
    els.aiTest.addEventListener("click", function () {
      const draft = readAIDraft();
      AI.saveConfig(draft);
      els.aiTest.disabled = true;
      els.aiTestResult.className = "ai-test-result is-pending";
      els.aiTestResult.textContent = "正在连接 " + AI.endpointOf(draft.baseUrl) + " …";
      AI.testConnection().then(function (result) {
        els.aiTestResult.className = "ai-test-result is-ok";
        els.aiTestResult.textContent = "连上了 · " + (result.reply || "模型有回应");
      }).catch(function (error) {
        els.aiTestResult.className = "ai-test-result is-bad";
        els.aiTestResult.textContent = aiErrorMessage(error);
      }).then(function () {
        els.aiTest.disabled = false;
      });
    });
    els.aiForget.addEventListener("click", function () {
      if (!window.confirm("清除后要重新填 Key，确定吗？")) return;
      AI.clearConfig();
      AI.clearHistory();
      syncAIBar();
      collapseAI();
      openAISettings();
      showToast("配置与本地缓存已清除");
    });
    els.aiForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const draft = readAIDraft();
      if (!draft.baseUrl || !draft.model || !draft.key) {
        els.aiTestResult.className = "ai-test-result is-bad";
        els.aiTestResult.textContent = "接口地址、模型、Key 三项都要填。";
        return;
      }
      AI.saveConfig(Object.assign({}, draft, { enabled: true }));
      syncAIBar();
      closeDialog(els.aiDialog);
      showToast(draft.model + " 已接入");
      if (state.query || state.chips.size) startAISearch({});
    });
  }

  function init() {
    let storedTheme = null;
    try {
      storedTheme = window.localStorage.getItem(THEME_KEY);
    } catch (error) {
      storedTheme = null;
    }
    applyTheme(storedTheme || "paper", false);

    setStats();
    populateSelects();
    renderQuickChips();
    renderKindFilter();
    renderDaily();
    state.parsed = Engine.parse("", []);
    state.bookDialogOpen = false;
    render();
    syncSaveButtons();
    syncAIBar();
    bindEvents();

    if (window.location.hash) {
      window.setTimeout(openFromHash, 120);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
