// 单词页面：单词列表、单词详情、单词卡片。路由由 app.js 调用 JP.pages.words / JP.pages.cards。
(function () {
  const U = JP.util;
  const W = JP.wordKit;
  const S = JP.store;
  const K = JP.kana;
  const rh = (s) => String(s).replace(/\{([^{}|<>]+)\|([^{}|<>]+)\}/g, JP.RUBY_HTML).replace(/\n/g, "<br>");
  const ui = () => JP.ui;
  const $ = (sel, el) => ui().$(sel, el);
  const $$ = (sel, el) => ui().$$(sel, el);
  const main = document.getElementById("main");
  const spk = (text, cls = "") => `<button class="spk ${cls}" data-say="${U.escape(W.plain(text))}" title="朗读">${W.SPK_ICON}</button>`;

  let noVoiceWarned = false;
  function bindSpeak(root = main) {
    $$("[data-say]", root).forEach((b) => (b.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!W.speak(b.dataset.say) && !noVoiceWarned) {
        noVoiceWarned = true;
        alert("你的浏览器或系统没有日语语音，暂时无法朗读。\n电脑上可以用 Chrome / Edge，或在系统设置里安装日语语音；手机一般自带。");
      }
    }));
  }

  // ============================ 列表 ============================
  const groupsOf = (mode) => (mode === "pos" ? W.POS : W.TOPICS).filter(([k]) => JP.words.some((w) => w[mode] === k));
  function tile(w) {
    return `<a class="wtile" href="#words/${encodeURIComponent(w.id)}"><span class="ja">${rh(w.w)}</span><span class="zh">${U.escape(w.zh)}</span>${S.isWordFav(w.id) ? '<i class="star">★</i>' : ""}</a>`;
  }
  function search(q) {
    q = q.trim();
    const kana = K.normalize(K.toKana(q, true));
    const lower = q.toLowerCase();
    return JP.words.filter((w) => W.plain(w.w).includes(q) || (kana && K.normalize(w.kana).startsWith(kana)) ||
      (/^[a-z']+$/.test(lower) && K.toRomaji(w.kana).startsWith(lower)) || w.zh.includes(q));
  }
  function renderList() {
    const st = S.settings();
    const mode = st.wordGroup === "pos" ? "pos" : "topic";
    const groups = groupsOf(mode);
    const filter = groups.some(([k]) => k === st.wordFilter) ? st.wordFilter : "";
    const cards = JP.words.map((w) => S.card(w.id)).filter(Boolean);
    const now = Date.now();
    main.innerHTML = `<div class="card">
      <div class="row"><h2 style="margin:0">单词</h2><span class="muted">N5 · 共 ${JP.words.length} 词</span><span class="spacer"></span>
        <a class="btn primary" href="#cards">🃏 单词卡片${cards.filter((c) => c.due <= now).length ? `（${cards.filter((c) => c.due <= now).length} 个待复习）` : ""}</a>
        <button class="btn" id="w-quiz">✍️ 单词测验</button></div>
      <div class="lookup-box" style="margin-top:14px"><input type="text" id="wq" placeholder="搜索：汉字 / 假名 / 罗马音 / 中文，例如 友達、ともだち、tomodachi、朋友" autocomplete="off"></div>
      <div class="row" style="margin-top:12px"><span class="muted">分组方式：</span>
        <div class="seg"><button data-mode="topic" class="${mode === "topic" ? "active" : ""}">按主题</button><button data-mode="pos" class="${mode === "pos" ? "active" : ""}">按词性</button></div></div>
      <div class="chips" style="margin-top:12px">
        <button class="chip ${filter ? "" : "active"}" data-g="">全部</button>
        ${groups.map(([k, name]) => `<button class="chip ${filter === k ? "active" : ""}" data-g="${k}">${name} <span class="muted">${JP.words.filter((w) => w[mode] === k).length}</span></button>`).join("")}
      </div></div><div id="w-res" style="margin-top:16px"></div>`;
    const input = $("#wq");
    K.attach(input);
    const draw = () => {
      const q = input.value.trim();
      if (q) {
        const hits = search(q);
        $("#w-res").innerHTML = hits.length
          ? `<div class="card"><p class="muted" style="margin-top:0">找到 ${hits.length} 个词</p><div class="wgrid">${hits.map(tile).join("")}</div></div>`
          : '<div class="empty">没有找到</div>';
        return;
      }
      $("#w-res").innerHTML = groups.filter(([k]) => !filter || k === filter).map(([k, name]) => {
        const ws = JP.words.filter((w) => w[mode] === k);
        return `<div class="card"><h3 style="margin-top:0">${name} <span class="muted" style="font-weight:normal">${ws.length}</span></h3><div class="wgrid">${ws.map(tile).join("")}</div></div>`;
      }).join("");
    };
    input.addEventListener("input", draw);
    draw();
    $$("[data-mode]").forEach((b) => (b.onclick = () => { S.setSetting("wordGroup", b.dataset.mode); S.setSetting("wordFilter", ""); renderList(); }));
    $$("[data-g]").forEach((b) => (b.onclick = () => { S.setSetting("wordFilter", b.dataset.g); renderList(); }));
    $("#w-quiz").onclick = () => {
      const cfg = Object.assign({}, S.settings().practiceCfg || {}, { subject: "word", wordTopic: mode === "topic" ? filter : "" });
      S.setSetting("practiceCfg", cfg);
      location.hash = "#practice";
    };
  }

  // ============================ 详情 ============================
  function partsHTML(p, w) {
    const [label, cls] = W.CERT[p.cert] || W.CERT["通说"];
    return `<div class="card"><div class="row"><h3 style="margin:0">词源拆解</h3><span class="tag ${cls}">${label}</span></div>
      <p class="formula">${U.escape(w.kana)} = ${p.rows.map((r) => U.escape(r[0])).join(" + ")}</p>
      <div class="tbl-wrap"><table class="parts"><thead><tr><th>部分</th><th>汉字</th><th>意思</th><th>说明</th></tr></thead><tbody>
        ${p.rows.map((r) => `<tr><td class="ja"><b>${U.escape(r[0])}</b></td><td class="ja">${U.escape(r[1] || "—")}</td><td>${rh(r[2])}</td><td>${rh(r[3] || "")}</td></tr>`).join("")}
      </tbody></table></div>
      ${p.sum ? `<p>合起来就是：<b>${rh(p.sum)}</b></p>` : ""}
      ${p.origin ? `<p class="muted">${rh(p.origin)}</p>` : ""}</div>`;
  }
  function kanjiHTML(w) {
    const ks = W.kanjiOf(w);
    if (!ks.length) return "";
    return `<div class="card"><h3 style="margin-top:0">汉字解析</h3>${ks.map((k) => {
      const info = JP.kanji[k] || {};
      const others = JP.words.filter((x) => x !== w && W.plain(x.w).includes(k)).slice(0, 12);
      return `<div class="kanji-row"><div class="kanji-big">${k}</div><div>
        <div><span class="muted">字义</span> ${U.escape(info.zh || "—")}　<span class="muted">音读</span> <span class="ja">${U.escape(info.on || "—")}</span>　<span class="muted">训读</span> <span class="ja">${U.escape(info.kun || "—")}</span></div>
        ${others.length ? `<div class="kanji-words"><span class="muted">含这个字的词：</span>${others.map((x) => `<a href="#words/${encodeURIComponent(x.id)}">${rh(x.w)}</a>`).join("")}</div>` : ""}
      </div></div>`;
    }).join("")}</div>`;
  }
  // 联想记忆、读音记法共用：推荐的排第一，其余放在 more 提示下
  function mnHTML(title, list, more) {
    if (!list || !list.length) return "";
    const ms = list.slice().sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0));
    return `<div class="card"><h3 style="margin-top:0">${title}</h3>
      ${ms.map((m, k) => `${k === 1 ? `<p class="muted" style="margin:14px 0 6px">${more}</p>` : ""}
        <div class="mn ${m.best ? "best" : ""}"><span class="tag ${m.best ? "lv" : ""}">${m.best ? "推荐 · " : ""}${U.escape(m.type)}</span> ${rh(m.text)}</div>`).join("")}</div>`;
  }
  function renderDetail(w) {
    const st = S.settings();
    const mode = st.wordGroup === "pos" ? "pos" : "topic";
    const sibs = JP.words.filter((x) => x[mode] === w[mode]);
    const i = sibs.indexOf(w), prev = sibs[i - 1], next = sibs[i + 1];
    const verbLink = /^verb/.test(w.pos) && JP.verbs.some((v) => v[0] === W.plain(w.w))
      ? `<a class="btn small" href="#lookup/${encodeURIComponent(W.plain(w.w))}">查看全部变形 →</a>` : "";
    const note = S.wordNote(w.id);
    main.innerHTML = `<div class="word-page">
      <div class="card">
        <div class="row"><a href="#words" class="muted">← 单词列表</a><span class="spacer"></span>
          <button class="btn small ${S.isWordFav(w.id) ? "on" : ""}" id="w-fav">${S.isWordFav(w.id) ? "★ 已收藏" : "☆ 收藏"}</button>
          <button class="btn small" id="w-note">📝 ${note ? "编辑笔记" : "写笔记"}</button></div>
        <div class="word-head"><span class="big">${rh(w.w)}</span>${spk(w.kana, "big")}</div>
        <div class="row"><span class="ja">${U.escape(w.kana)}</span><span class="muted">${K.toRomaji(w.kana)}</span>
          <span class="tag">${W.posName(w.pos)}</span><span class="tag">${W.topicName(w.topic)}</span><span class="tag lv">${w.jlpt}</span></div>
        <div class="word-zh">${U.escape(w.zh)}</div>
        ${w.note ? `<div class="tip">💡 ${rh(w.note)}</div>` : ""}
        ${verbLink}
        ${note ? `<div class="note-view">📝 ${U.escape(note)}</div>` : ""}
      </div>
      ${mnHTML("读音怎么记", w.rd, "也可以这样记：")}
      <div class="card"><h3 style="margin-top:0">例句</h3>
        ${w.ex.map(([ja, zh]) => `<div class="wex"><div class="ja">${rh(ja)} ${spk(ja)}</div><div class="zh">${U.escape(zh)}</div></div>`).join("")}</div>
      ${mnHTML("联想记忆", w.mn, "记不住的话，还可以这样记：")}
      ${w.parts ? partsHTML(w.parts, w) : ""}
      ${w.loan ? `<div class="card"><h3 style="margin-top:0">外来语出处</h3><p>来自${U.escape(w.loan.lang)}「<b>${U.escape(w.loan.src)}</b>」${w.loan.note ? `：${rh(w.loan.note)}` : ""}</p></div>` : ""}
      ${kanjiHTML(w)}
      <div class="lesson-nav">
        ${prev ? `<a class="btn" href="#words/${encodeURIComponent(prev.id)}">← ${rh(prev.w)}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#words/${encodeURIComponent(next.id)}">${rh(next.w)} →</a>` : "<span></span>"}
      </div></div>`;
    bindSpeak();
    $("#w-fav").onclick = () => { S.toggleWordFav(w.id); renderDetail(w); };
    $("#w-note").onclick = () => ui().noteModal(`${rh(w.w)}　${U.escape(w.zh)}`, S.wordNote(w.id), (t) => S.setWordNote(w.id, t), () => renderDetail(w));
  }

  // ============================ 单词卡片 ============================
  let deck = null;
  function cardCfg() {
    return Object.assign({ range: "all", topic: "", dir: "ja", count: 20 }, S.settings().cardCfg || {});
  }
  function inRange(cfg) {
    if (cfg.range === "fav") return JP.words.filter((w) => S.isWordFav(w.id));
    if (cfg.range === "topic") return JP.words.filter((w) => w.topic === cfg.topic);
    return JP.words;
  }
  function renderCardsHome() {
    const cfg = cardCfg();
    const save = () => S.setSetting("cardCfg", cfg);
    const now = Date.now();
    const ws = inRange(cfg);
    const due = ws.filter((w) => S.card(w.id) && S.card(w.id).due <= now);
    const fresh = ws.filter((w) => !S.card(w.id));
    const mastered = ws.filter((w) => S.card(w.id) && S.card(w.id).box >= S.MASTER_BOX);
    const chip = (k, v, label) => `<button class="chip ${cfg[k] === v ? "active" : ""}" data-k="${k}" data-v="${v}">${label}</button>`;
    main.innerHTML = `<div class="card q-card"><div class="row"><h2 style="margin:0">单词卡片</h2><span class="spacer"></span><a href="#words" class="muted">← 单词列表</a></div>
      <p class="muted">先看正面回想，再翻开核对。点「认识」会隔几天再出现（1、2、4、7、15、30 天，越熟间隔越长），点「不认识」会在本组里很快再出现。</p>
      <div class="field"><label>范围</label><div class="chips">${chip("range", "all", "全部单词")}${chip("range", "topic", "按主题")}${chip("range", "fav", `收藏的词（${S.wordFavs().length}）`)}</div>
        ${cfg.range === "topic" ? `<select id="c-topic" style="margin-top:10px">${W.TOPICS.filter(([k]) => JP.words.some((w) => w.topic === k)).map(([k, n]) => `<option value="${k}" ${cfg.topic === k ? "selected" : ""}>${n}</option>`).join("")}</select>` : ""}</div>
      <div class="field"><label>方向</label><div class="chips">${chip("dir", "ja", "看日语 → 想意思")}${chip("dir", "zh", "看中文 → 想日语")}</div></div>
      <div class="field"><label>每组</label><div class="chips">${[10, 20, 30].map((n) => chip("count", n, `${n} 张`)).join("")}</div></div>
      <div class="stats-grid"><div class="stat"><b>${due.length}</b><span class="muted">到期待复习</span></div><div class="stat"><b>${fresh.length}</b><span class="muted">还没学过</span></div>
        <div class="stat"><b>${mastered.length}</b><span class="muted">已掌握</span></div><div class="stat"><b>${ws.length}</b><span class="muted">范围内共计</span></div></div>
      <div class="q-actions"><button class="btn primary" id="c-start" ${due.length + fresh.length ? "" : "disabled"}>开始（先复习到期的，再学新词）</button>
        ${!due.length && !fresh.length && ws.length ? '<button class="btn" id="c-extra">没有到期的卡片，随便复习一组</button>' : ""}</div>
    </div>`;
    if (cfg.range === "topic" && !cfg.topic) { cfg.topic = $("#c-topic").value; save(); }
    $$("[data-k]").forEach((c) => (c.onclick = () => { const v = c.dataset.v; cfg[c.dataset.k] = /^\d+$/.test(v) ? Number(v) : v; save(); renderCardsHome(); }));
    const ts = $("#c-topic");
    if (ts) ts.onchange = () => { cfg.topic = ts.value; save(); renderCardsHome(); };
    const start = (list) => { deck = { cfg, queue: list.map((w) => w.id), flipped: false, known: 0, unknown: 0, total: list.length, done: false }; drawCard(); };
    $("#c-start").onclick = () => start([...due.sort((a, b) => S.card(a.id).due - S.card(b.id).due), ...fresh].slice(0, cfg.count));
    const ex = $("#c-extra");
    if (ex) ex.onclick = () => start(U.shuffle(ws).slice(0, cfg.count));
  }
  function drawCard() {
    const d = deck;
    if (!d.queue.length) {
      d.done = true;
      main.innerHTML = `<div class="card q-card"><div class="score"><div class="num">完成！</div>
        <div class="muted">本组 ${d.total} 张：一次就认识 ${d.known} 张，重来 ${d.unknown} 次</div></div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" id="c-again">再来一组</button><a class="btn ghost" href="#words">回到单词列表</a></div></div>`;
      $("#c-again").onclick = () => { deck = null; renderCardsHome(); };
      return;
    }
    const w = W.byId(d.queue[0]);
    const ja = d.cfg.dir === "ja";
    const best = W.bestOf(w.mn);
    const rd = W.bestOf(w.rd);
    const front = ja ? `<div class="card-word ja">${U.escape(W.plain(w.w))}</div>${spk(w.kana, "big")}`
      : `<div class="card-word">${U.escape(w.zh)}</div><div class="muted">${W.posName(w.pos)}</div>`;
    const back = `<div class="card-back">
      ${ja ? "" : `<div class="word-head" style="justify-content:center"><span class="big">${rh(w.w)}</span>${spk(w.kana, "big")}</div>`}
      <div><span class="ja">${U.escape(w.kana)}</span>　<span class="muted">${K.toRomaji(w.kana)}</span>　<span class="tag">${W.posName(w.pos)}</span></div>
      <div class="word-zh">${U.escape(w.zh)}</div>
      ${rd ? `<div class="mn best"><span class="tag lv">读音 · ${U.escape(rd.type)}</span> ${rh(rd.text)}</div>` : ""}
      ${best ? `<div class="mn"><span class="tag">${U.escape(best.type)}</span> ${rh(best.text)}</div>` : ""}
      ${w.ex[0] ? `<div class="wex"><div class="ja">${rh(w.ex[0][0])} ${spk(w.ex[0][0])}</div><div class="zh">${U.escape(w.ex[0][1])}</div></div>` : ""}
      <a href="#words/${encodeURIComponent(w.id)}" target="_blank">查看完整详情 ↗</a></div>`;
    main.innerHTML = `<div class="card q-card flashcard">
      <div class="progress"><div style="width:${((d.total - new Set(d.queue).size) / d.total) * 100}%"></div></div>
      <div class="q-top"><b>剩余 ${d.queue.length} 张</b><span class="tag">${W.topicName(w.topic)}</span><span class="spacer"></span><button class="btn small ghost" id="c-quit">结束</button></div>
      <div class="card-front">${front}</div>
      ${d.flipped ? back : ""}
      <div class="q-actions" style="justify-content:center">
        ${d.flipped ? '<button class="btn big-btn bad" id="c-no">✗ 不认识 <span class="muted">1</span></button><button class="btn big-btn good" id="c-yes">✓ 认识 <span class="muted">2</span></button>'
          : '<button class="btn primary big-btn" id="c-flip">翻开看答案 <span>空格</span></button>'}
      </div></div>`;
    bindSpeak();
    const grade = (known) => {
      const id = d.queue.shift();
      S.gradeCard(id, known);
      if (known) { if (!d.missed || !d.missed.has(id)) d.known++; }
      else {
        d.unknown++;
        (d.missed = d.missed || new Set()).add(id);
        d.queue.splice(Math.min(3, d.queue.length), 0, id);
      }
      d.flipped = false;
      drawCard();
    };
    const flip = () => { d.flipped = true; drawCard(); };
    $("#c-quit").onclick = () => { deck = null; renderCardsHome(); };
    if (d.flipped) { $("#c-no").onclick = () => grade(false); $("#c-yes").onclick = () => grade(true); }
    else $("#c-flip").onclick = flip;
    document.onkeydown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (!d.flipped && (e.key === " " || e.key === "Enter")) { e.preventDefault(); flip(); }
      else if (d.flipped && e.key === "1") grade(false);
      else if (d.flipped && e.key === "2") grade(true);
    };
  }

  JP.pages = Object.assign(JP.pages || {}, {
    words(arg) {
      const w = arg && W.byId(arg);
      if (w) renderDetail(w);
      else renderList();
    },
    cards() {
      if (deck && !deck.done) drawCard();
      else renderCardsHome();
    },
  });
  JP.bindSpeak = bindSpeak;
})();
