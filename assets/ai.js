/* ============================================================
   拾页 · 大模型实时找书（浏览器直连，自带 Key）
   - 不做任何服务端转发：请求从你的浏览器直接发往所选厂商
   - Key 只存在本机 localStorage，随「清除」一起删掉
   ============================================================ */
(function (global) {
  "use strict";

  const CONFIG_KEY = "shiye-ai-config-v1";
  const BOOKS_KEY = "shiye-ai-books-v1";
  const MAX_BOOKS = 60;
  const TIMEOUT_MS = 60000;

  const PROVIDERS = [
    {
      id: "deepseek",
      label: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      models: ["deepseek-chat", "deepseek-reasoner"],
      note: "便宜、中文稳，推荐先试。"
    },
    {
      id: "moonshot",
      label: "Moonshot 月之暗面",
      baseUrl: "https://api.moonshot.cn/v1",
      model: "moonshot-v1-8k",
      models: ["moonshot-v1-8k", "moonshot-v1-32k", "kimi-latest"],
      note: "长上下文，中文书感不错。"
    },
    {
      id: "zhipu",
      label: "智谱 GLM",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-4-flash",
      models: ["glm-4-flash", "glm-4-plus", "glm-4-air"],
      note: "glm-4-flash 有免费额度。"
    },
    {
      id: "dashscope",
      label: "通义千问",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      models: ["qwen-plus", "qwen-max", "qwen-turbo"],
      note: "走 OpenAI 兼容模式。"
    },
    {
      id: "siliconflow",
      label: "SiliconFlow",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "Qwen/Qwen2.5-72B-Instruct",
      models: ["Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-V3"],
      note: "聚合开源模型。"
    },
    {
      id: "ark",
      label: "火山方舟",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "doubao-pro-32k",
      models: ["doubao-pro-32k", "doubao-pro-128k"],
      note: "模型名通常要填推理接入点 ID（ep-…）。"
    },
    {
      id: "openai",
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      models: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
      note: "境内网络通常需要自备代理。"
    },
    {
      id: "custom",
      label: "自定义",
      baseUrl: "",
      model: "",
      models: [],
      note: "任何 OpenAI 兼容的 /chat/completions 端点。"
    }
  ];

  const PALETTES = [
    { bg: "#182b2e", fg: "#f2e8d5", accent: "#c79a5b" },
    { bg: "#2c1916", fg: "#ecd9c5", accent: "#b8513d" },
    { bg: "#243642", fg: "#eef1e8", accent: "#c4aa7a" },
    { bg: "#8d3b2c", fg: "#f8e8d0", accent: "#e8b96d" },
    { bg: "#364b3f", fg: "#f2ead9", accent: "#d6a35e" },
    { bg: "#4c4a2f", fg: "#f2e8ce", accent: "#d25f3a" },
    { bg: "#1d2b45", fg: "#f4f0e6", accent: "#d8a33f" },
    { bg: "#2b2b2b", fg: "#e8dfcf", accent: "#a03333" },
    { bg: "#6d5341", fg: "#f4e8d6", accent: "#c9a06b" },
    { bg: "#23424a", fg: "#efe6d7", accent: "#c45b40" },
    { bg: "#382a3f", fg: "#f0e4d1", accent: "#c26a5a" },
    { bg: "#5c3a25", fg: "#f5e6cd", accent: "#d4a24b" },
    { bg: "#354047", fg: "#eadfc9", accent: "#b9533c" },
    { bg: "#263b3c", fg: "#f1ead8", accent: "#84a59d" },
    { bg: "#4b5b4c", fg: "#f2e9d8", accent: "#caa66e" },
    { bg: "#51342c", fg: "#f3e6d6", accent: "#c08c5f" }
  ];

  const KIND_META = {
    web: { label: "网络小说", en: "WEB FICTION" },
    literary: { label: "现实向文学", en: "LITERARY FICTION" },
    genre: { label: "类型出版", en: "GENRE FICTION" }
  };

  const LENGTH_META = {
    short: { label: "短篇", order: 1 },
    medium: { label: "中篇", order: 2 },
    long: { label: "长篇", order: 3 },
    epic: { label: "超长篇", order: 4 }
  };

  const STATUS_LABEL = { completed: "已完结", ongoing: "连载中" };
  const CONFIDENCE_LABEL = { high: "确认度 高", medium: "确认度 中", low: "确认度 低" };
  const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

  const DEFAULT_CONFIG = {
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    key: "",
    temperature: 0.6,
    count: 6,
    enabled: true
  };

  const memoryCache = new Map();
  let bookStore = loadBooks();

  /* ---------------- 小工具 ---------------- */

  function providerById(id) {
    return PROVIDERS.find(function (item) { return item.id === id; }) || PROVIDERS[0];
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      const value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // 存储被禁时仍可在内存里用。
    }
  }

  function loadBooks() {
    const list = readJson(BOOKS_KEY, []);
    const map = new Map();
    if (Array.isArray(list)) {
      list.forEach(function (book) {
        if (book && book.id) map.set(book.id, book);
      });
    }
    return map;
  }

  function persistBooks() {
    const list = Array.from(bookStore.values()).slice(-MAX_BOOKS);
    writeJson(BOOKS_KEY, list);
  }

  function hashString(text) {
    let hash = 0;
    const value = String(text || "");
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
    }
    return hash;
  }

  function compact(text) {
    return String(text || "").toLowerCase().replace(/[\s\-—_:：·,，.。!！?？「」『』《》()（）"'’“”]+/g, "");
  }

  function clean(text, max) {
    let value = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    if (max && value.length > max) value = value.slice(0, max).replace(/[，,、。]$/, "") + "…";
    return value;
  }

  function asArray(value, limit) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const out = [];
    value.forEach(function (item) {
      const text = clean(item, 24);
      if (!text || seen.has(text)) return;
      seen.add(text);
      out.push(text);
    });
    return out.slice(0, limit || 6);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  /* ---------------- 配置 ---------------- */

  function getConfig() {
    const stored = readJson(CONFIG_KEY, null);
    if (!stored || typeof stored !== "object") return Object.assign({}, DEFAULT_CONFIG);
    return Object.assign({}, DEFAULT_CONFIG, stored);
  }

  function saveConfig(patch) {
    const next = Object.assign({}, getConfig(), patch || {});
    next.temperature = Math.min(1.4, Math.max(0, Number(next.temperature) || 0.6));
    next.count = Math.min(10, Math.max(3, Number(next.count) || 6));
    writeJson(CONFIG_KEY, next);
    return next;
  }

  function clearConfig() {
    try {
      global.localStorage.removeItem(CONFIG_KEY);
    } catch (error) {
      // ignore
    }
    memoryCache.clear();
  }

  function isConfigured(config) {
    const conf = config || getConfig();
    return Boolean(conf.key && conf.baseUrl && conf.model);
  }

  /* ---------------- 数据规范化 ---------------- */

  function normalizeBook(raw, context) {
    if (!raw || typeof raw !== "object") return null;
    const title = clean(raw.title || raw.name, 48);
    if (!title) return null;

    const author = clean(raw.author, 32) || "作者待核实";
    const kind = KIND_META[raw.kind] ? raw.kind : "genre";
    const status = STATUS_LABEL[raw.status] ? raw.status : "completed";
    const length = LENGTH_META[raw.length] ? raw.length : "long";
    const confidence = CONFIDENCE_RANK[raw.confidence] ? raw.confidence : "medium";
    const themes = asArray(raw.themes, 3);
    const tags = asArray(raw.tags, 6);
    const palette = PALETTES[hashString(title + author) % PALETTES.length];
    const id = "ai-" + hashString(compact(title) + "|" + compact(author)).toString(36);

    const linked = context && context.findEditorial
      ? context.findEditorial(title, author)
      : null;

    return {
      id: linked ? linked.id : id,
      aiId: id,
      ai: true,
      aiLinked: Boolean(linked),
      title: title,
      author: author,
      year: clean(raw.year, 12),
      platform: clean(raw.platform, 24) || (kind === "web" ? "网络平台" : "出版"),
      kind: kind,
      status: status,
      length: length,
      themes: themes.length ? themes : tags.slice(0, 3),
      tags: tags.length ? tags : themes,
      summary: clean(raw.summary, 90),
      hook: clean(raw.hook, 60) || clean(raw.summary, 60),
      review: clean(raw.why || raw.reason, 120),
      pros: asArray([clean(raw.why, 60)].concat(tags.slice(0, 2)), 3),
      cons: asArray([clean(raw.caution || raw.cons, 40)], 2),
      mood: asArray(themes.slice(0, 2).concat(["AI 现场推荐"]), 3),
      contentNote: clean(raw.caution || raw.contentNote, 60),
      scores: null,
      score: null,
      confidence: confidence,
      confidenceLabel: CONFIDENCE_LABEL[confidence],
      note: clean(raw.note, 60),
      query: clean(context && context.query, 80),
      kindLabel: KIND_META[kind].label,
      kindEn: KIND_META[kind].en,
      statusLabel: status === "ongoing" ? STATUS_LABEL[status] : (kind === "web" ? "已完结" : "已出版"),
      lengthLabel: LENGTH_META[length].label,
      lengthOrder: LENGTH_META[length].order,
      palette: palette,
      mark: title.slice(0, 1),
      index: 0,
      foundAt: Date.now()
    };
  }

  function rememberBooks(books) {
    books.forEach(function (book) {
      if (book && book.aiId) bookStore.set(book.aiId, book);
    });
    persistBooks();
  }

  /* ---------------- 提示词 ---------------- */

  function buildSystemPrompt() {
    return [
      "你是「拾页」书房里的选书顾问，为中文读者推荐小说。",
      "硬性规则：",
      "1. 只推荐你确信真实存在的书，书名与作者必须对得上；不确定就少写，绝不编造。",
      "2. 优先中文原创小说（网络小说、现实向文学、类型出版），也可以是确有中文版的外国小说。",
      "3. 只输出 JSON，不要前言、解释或 Markdown 代码块标记。",
      "4. 输出结构：{\"books\":[{\"title\":\"\",\"author\":\"\",\"year\":\"\",\"kind\":\"web|literary|genre\",\"status\":\"completed|ongoing\",\"length\":\"short|medium|long|epic\",\"platform\":\"\",\"themes\":[\"\"],\"tags\":[\"\"],\"hook\":\"\",\"summary\":\"\",\"why\":\"\",\"caution\":\"\",\"confidence\":\"high|medium|low\"}]}",
      "5. 字段长度：hook ≤ 40 字（一句话钩子）；summary ≤ 70 字；why ≤ 70 字（为什么这本书契合此刻的诉求）；caution ≤ 30 字（可能的劝退点，可以不写）。",
      "6. themes 2–3 个，tags 3–6 个，都用中文短语。confidence 表示你对这本书信息准确度的把握。",
      "7. 书名不得重复。实在没有合适的，返回 {\"books\":[]}。"
    ].join("\n");
  }

  function buildUserPrompt(request) {
    const lines = ["读者现在想要的：", request.query || "（没写具体诉求，按泛泛的好书推荐）"];
    if (request.chips && request.chips.length) lines.push("已勾选偏好：" + request.chips.join(" / "));
    if (request.kind && request.kind !== "all") lines.push("类型偏好：" + (KIND_META[request.kind] ? KIND_META[request.kind].label : request.kind));
    if (request.status && request.status !== "all") lines.push("阅读状态：" + (request.status === "ongoing" ? "连载中" : "已完结 / 已出版"));
    if (request.length && request.length !== "all") lines.push("篇幅偏好：" + (LENGTH_META[request.length] ? LENGTH_META[request.length].label : request.length));
    if (request.exclude && request.exclude.length) lines.push("明确不要：" + request.exclude.join(" / "));
    if (request.avoid && request.avoid.length) lines.push("已经看过、不要重复推荐：" + request.avoid.slice(0, 20).join(" / "));
    lines.push("请推荐 " + (request.count || 6) + " 本，按契合度从高到低排列，直接给 JSON。");
    return lines.join("\n");
  }

  /* ---------------- 网络 ---------------- */

  function endpointOf(baseUrl) {
    const base = String(baseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return "";
    if (/\/chat\/completions$/.test(base)) return base;
    return base + "/chat/completions";
  }

  function describeError(status, body) {
    let detail = "";
    try {
      const parsed = typeof body === "string" ? JSON.parse(body) : body;
      detail = (parsed && (parsed.error && (parsed.error.message || parsed.error.code) || parsed.message)) || "";
    } catch (error) {
      detail = String(body || "").slice(0, 180);
    }
    detail = clean(detail, 200);
    if (status === 401 || status === 403) {
      return { code: "auth", message: "Key 被拒（" + status + "）", hint: detail || "检查 API Key 是否正确、是否有该模型权限。" };
    }
    if (status === 404) {
      return { code: "notfound", message: "接口或模型不存在（404）", hint: detail || "检查 Base URL 是否以 /v1 结尾，模型名是否拼对。" };
    }
    if (status === 429) {
      return { code: "rate", message: "触发限流或额度用尽（429）", hint: detail || "等一会儿再试，或换一个厂商。" };
    }
    if (status === 402 || /insufficient|balance|quota/i.test(detail)) {
      return { code: "balance", message: "账户余额或额度不足", hint: detail };
    }
    return { code: "http", message: "接口返回 " + status, hint: detail };
  }

  function networkError(error) {
    const text = String(error && error.message || error || "");
    if (/abort/i.test(text)) {
      return { code: "aborted", message: "已停止", hint: "" };
    }
    if (/failed to fetch|networkerror|load failed/i.test(text)) {
      return {
        code: "cors",
        message: "请求发不出去",
        hint: "多半是厂商不允许浏览器直连（CORS），或本机网络被拦。可以换一个厂商，或改填自己的中转 Base URL。"
      };
    }
    return { code: "network", message: "网络异常", hint: text.slice(0, 160) };
  }

  /* ---------------- 响应解析（容错） ---------------- */

  function extractJson(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1] : raw;
    const attempts = [body];

    const firstBrace = body.indexOf("{");
    const lastBrace = body.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) attempts.push(body.slice(firstBrace, lastBrace + 1));

    const firstBracket = body.indexOf("[");
    const lastBracket = body.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      const arrayText = body.slice(firstBracket, lastBracket + 1);
      attempts.push(arrayText);
      attempts.push('{"books":' + arrayText + "}");
    }

    for (let index = 0; index < attempts.length; index += 1) {
      const candidate = attempts[index];
      try {
        const parsed = JSON.parse(candidate);
        if (parsed) return parsed;
      } catch (error) {
        try {
          const repaired = candidate
            .replace(/,\s*([}\]])/g, "$1")
            .replace(/[\u0000-\u001f]+/g, " ");
          const parsed = JSON.parse(repaired);
          if (parsed) return parsed;
        } catch (innerError) {
          // 继续尝试下一种切法
        }
      }
    }
    return null;
  }

  function pickList(parsed) {
    if (!parsed) return [];
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.books)) return parsed.books;
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (parsed.books && typeof parsed.books === "object") return Object.values(parsed.books);
    return [];
  }

  /* ---------------- 主流程 ---------------- */

  function cacheKey(request) {
    return [
      compact(request.query),
      (request.chips || []).join(","),
      request.kind || "all",
      request.status || "all",
      request.length || "all"
    ].join("|");
  }

  function search(request, handlers) {
    const hooks = handlers || {};
    const config = getConfig();
    const startedAt = Date.now();

    if (!isConfigured(config)) {
      const error = {
        code: "config",
        message: "还没配置模型",
        hint: "点「设置」填一个 API Key。Key 只存在你自己的浏览器里。"
      };
      if (hooks.onError) hooks.onError(error);
      return { abort: function () {} };
    }

    const key = cacheKey(request);
    if (!request.force && memoryCache.has(key)) {
      const cached = memoryCache.get(key);
      if (hooks.onStatus) hooks.onStatus("用上一次的结果（点「换一批」可以重新检索）");
      if (hooks.onDone) hooks.onDone(Object.assign({}, cached, { cached: true }));
      return { abort: function () {} };
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = global.setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    const count = request.count || config.count || 6;
    const payload = {
      model: config.model,
      stream: true,
      temperature: Math.min(1.3, Math.max(0.2, Number(request.temperature == null ? config.temperature : request.temperature))),
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(Object.assign({}, request, { count: count })) }
      ]
    };

    let raw = "";
    let closed = false;

    function finish(books, extra) {
      if (closed) return;
      closed = true;
      global.clearTimeout(timer);
      rememberBooks(books);
      const result = Object.assign({
        books: books,
        raw: raw,
        model: config.model,
        provider: config.provider,
        elapsed: Date.now() - startedAt
      }, extra || {});
      memoryCache.set(key, result);
      if (hooks.onDone) hooks.onDone(result);
    }

    function fail(error) {
      if (closed) return;
      closed = true;
      global.clearTimeout(timer);
      if (timedOut) {
        error = { code: "timeout", message: "等了 60 秒没回", hint: "换个更快的模型，或把推荐数量调少。" };
      }
      if (hooks.onError) hooks.onError(error);
    }

    if (hooks.onStatus) hooks.onStatus("正在问 " + config.model + " …");

    (async function () {
      let response;
      try {
        response = await fetch(endpointOf(config.baseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
            Authorization: "Bearer " + config.key
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } catch (error) {
        fail(networkError(error));
        return;
      }

      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch (error) {
          body = "";
        }
        fail(describeError(response.status, body));
        return;
      }

      const type = String(response.headers.get("content-type") || "");
      let buffer = "";

      if (!response.body || type.indexOf("text/event-stream") < 0) {
        try {
          buffer = await response.text();
        } catch (error) {
          fail(networkError(error));
          return;
        }
        const parsed = extractJson(buffer);
        const list = pickList(parsed);
        raw = buffer;
        if (!list.length) {
          fail({
            code: "empty",
            message: "模型没给出可用的书单",
            hint: "换个说法或换个模型再试；也可能是额度或审核拦下了内容。"
          });
          return;
        }
        finish(list.map(function (item) {
          return normalizeBook(item, request);
        }).filter(Boolean));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let pending = "";

      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          pending += decoder.decode(chunk.value, { stream: true });
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() || "";
          for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index].trim();
            if (!line || line.indexOf("data:") !== 0) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            let json;
            try {
              json = JSON.parse(data);
            } catch (error) {
              continue;
            }
            const choice = json.choices && json.choices[0];
            const delta = choice && (choice.delta || choice.message);
            const piece = delta && (delta.content || delta.reasoning_content);
            if (piece) {
              raw += piece;
              if (hooks.onDelta) hooks.onDelta(piece, raw);
            }
          }
        }
      } catch (error) {
        fail(timedOut ? { code: "timeout" } : networkError(error));
        return;
      }

      const parsed = extractJson(raw);
      const list = pickList(parsed);
      if (!list.length) {
        fail({
          code: "parse",
          message: "模型这次的输出没能解析成书单",
          hint: "再试一次，或换一个更听话的模型（如 DeepSeek / GLM-4）。"
        });
        return;
      }

      const books = list.map(function (item) {
        return normalizeBook(item, request);
      }).filter(Boolean);

      if (!books.length) {
        fail({
          code: "empty",
          message: "这一批没有可用的书目",
          hint: "把诉求说得更具体一点，比如加上类型或氛围词。"
        });
        return;
      }

      finish(books);
    })();

    return {
      abort: function () {
        try {
          controller.abort();
        } catch (error) {
          // ignore
        }
      }
    };
  }

  function testConnection() {
    const config = getConfig();
    if (!isConfigured(config)) {
      return Promise.reject({
        code: "config",
        message: "还没填 Key",
        hint: "先填 API Key 再测试。"
      });
    }
    const controller = new AbortController();
    const timer = global.setTimeout(function () { controller.abort(); }, 20000);
    return fetch(endpointOf(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.key
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        max_tokens: 16,
        messages: [{ role: "user", content: "只回答两个字：在的" }]
      }),
      signal: controller.signal
    }).then(async function (response) {
      global.clearTimeout(timer);
      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch (error) {
          body = "";
        }
        throw describeError(response.status, body);
      }
      const text = await response.text();
      const parsed = extractJson(text);
      const reply = parsed && parsed.choices && parsed.choices[0] &&
        (parsed.choices[0].message && parsed.choices[0].message.content);
      return { ok: true, reply: clean(reply, 40) || "已连通" };
    }).catch(function (error) {
      global.clearTimeout(timer);
      if (error && error.code) throw error;
      throw networkError(error);
    });
  }

  global.ShiyeAI = {
    PROVIDERS: PROVIDERS,
    KIND_META: KIND_META,
    LENGTH_META: LENGTH_META,
    CONFIDENCE_LABEL: CONFIDENCE_LABEL,
    PROVIDER_BY_ID: providerById,
    getConfig: getConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    isConfigured: isConfigured,
    testConnection: testConnection,
    search: search,
    getBook: function (id) {
      return bookStore.get(id) || null;
    },
    allBooks: function () {
      return Array.from(bookStore.values()).sort(function (a, b) {
        return (b.foundAt || 0) - (a.foundAt || 0);
      });
    },
    forgetBook: function (id) {
      bookStore.delete(id);
      persistBooks();
    },
    clearHistory: function () {
      bookStore = new Map();
      memoryCache.clear();
      writeJson(BOOKS_KEY, []);
    },
    clearCache: function () {
      memoryCache.clear();
    },
    normalizeBook: normalizeBook,
    buildUserPrompt: buildUserPrompt,
    endpointOf: endpointOf,
    dateStamp: function (time) {
      const date = new Date(time || Date.now());
      return pad(date.getMonth() + 1) + "." + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
