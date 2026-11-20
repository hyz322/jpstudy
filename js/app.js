// 页面渲染与交互：首页、学习、变形查询、刷题、复习本、设置（单词页面在 words_ui.js）。
(function () {
  const U = JP.util;
  const C = JP.conj;
  const S = JP.store;
  const K = JP.kana;
  const R = U.ruby;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const main = $("#main");
  const VERBS = JP.verbs.map(C.toVerb);
  const findVerb = (kanji) => VERBS.find((v) => v.kanji === kanji);
  const LETTERS = ["A", "B", "C", "D", "E"];
  const SUBJECTS = { verb: "动词", particle: "助词", word: "单词" };
  const subjOf = (x) => x.subject || "verb";
  const handOf = (subj) => JP.questions.filter((q) => subjOf(q) === subj);

  function applySettings() {
    document.body.classList.toggle("no-furigana", !S.settings().furigana);
  }

  // ============================ 路由 ============================
  function route() {
    const [page = "home", ...rest] = location.hash.slice(1).split("/");
    const arg = decodeURIComponent(rest.join("/"));
    $$("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    document.onkeydown = null;
    window.scrollTo(0, 0);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    ({ home: renderHome, learn: renderLearn, lookup: renderLookup, particles: renderParticles, practice: renderPractice, review: renderReview, settings: renderSettings, ...JP.pages }[page] || renderHome)(arg);
  }
  window.addEventListener("hashchange", route);

  // ============================ 首页 ============================
  function renderHome() {
    const hist = Object.values(S.history());
    const tries = hist.reduce((a, h) => a + h.tries, 0);
    const right = hist.reduce((a, h) => a + h.right, 0);
    main.innerHTML = `
      <div class="hero"><h1>${R("{動詞|どうし}・{助詞|じょし}・{単語|たんご}をマスターしよう")}</h1>
        <div class="muted">动词：分类、变形、敬语 · 助词：格助词、は/が、复合格助词 · 单词：读音、例句、联想记忆、词源拆解 · 讲义 + 分级刷题</div></div>
      <div class="home-grid">
        <a class="card home-card" href="#learn"><div class="icon">📖</div><h3>学习</h3><div class="muted">动词 ${JP.lessons.filter((l) => subjOf(l) === "verb").length} 课 + 助词 ${JP.lessons.filter((l) => subjOf(l) === "particle" && l.level).length} 课，另有 ${JP.particleUsages.length} 个助词的用法总表</div></a>
        <a class="card home-card" href="#words"><div class="icon">🗂️</div><h3>单词</h3><div class="muted">N5 ${JP.words.length} 词：读音、例句、联想记忆、词源拆解，另有单词卡片和单词测验</div></a>
        <a class="card home-card" href="#lookup"><div class="icon">🔍</div><h3>变形查询</h3><div class="muted">输入任意动词，查看全部变形和规则</div></a>
        <a class="card home-card" href="#practice"><div class="icon">✍️</div><h3>刷题</h3><div class="muted">动词 ${handOf("verb").length} 题 + 助词 ${handOf("particle").length} 题精编句子题，另有变形题、搭配题，五个难度</div></a>
        <a class="card home-card" href="#particles"><div class="icon">🧩</div><h3>助词查询</h3><div class="muted">${JP.particleUsages.length} 个助词、${JP.particleUsages.reduce((a, e) => a + e.usages.length, 0)} 种用法，可按关键词搜索</div></a>
        <a class="card home-card" href="#review"><div class="icon">⭐</div><h3>复习本</h3><div class="muted">收藏、笔记、错题本、做题统计</div></a>
      </div>
      <div class="card" style="margin-top:16px">
        <b>学习概况</b>
        <div class="stats-grid">
          <div class="stat"><b>${hist.length}</b><span class="muted">做过的题</span></div>
          <div class="stat"><b>${tries ? Math.round((right / tries) * 100) : 0}%</b><span class="muted">总正确率</span></div>
          <div class="stat"><b>${S.wrongs().length}</b><span class="muted">错题本</span></div>
          <div class="stat"><b>${S.favorites().length}</b><span class="muted">收藏</span></div>
          <div class="stat"><b>${S.notes().length}</b><span class="muted">笔记</span></div>
        </div>
      </div>`;
  }

  // ============================ 学习 ============================
  function conjTable(forms, verbNames) {
    const vs = verbNames.map(findVerb).filter(Boolean);
    return `<div class="tbl-wrap"><table class="conj"><thead><tr><th>动词</th><th>类别</th>${forms.map((f) => `<th>${C.FORM_NAME[f]}</th>`).join("")}</tr></thead><tbody>` +
      vs.map((v) => `<tr><td><a href="#lookup/${encodeURIComponent(v.kanji)}">${R(C.dress(v, v.kana).ruby)}</a></td><td>${["", "一类", "二类", "三类"][v.group]}</td>` +
        forms.map((f) => `<td>${C.conjugate(v, f).map((x) => R(x.ruby)).join(" / ")}</td>`).join("") + "</tr>").join("") +
      "</tbody></table></div>";
  }
  function pairsTable() {
    const r = (k, kana) => R(C.dress({ kanji: k, kana }, kana).ruby);
    return `<div class="tbl-wrap"><table class="conj"><thead><tr><th>自动词（〜が）</th><th>意思</th><th>他动词（〜を）</th><th>意思</th></tr></thead><tbody>` +
      JP.transPairs.map((p) => `<tr><td>${r(p[0], p[1])}</td><td>${p[4]}</td><td>${r(p[2], p[3])}</td><td>${p[5]}</td></tr>`).join("") + "</tbody></table></div>";
  }
  function keigoTable() {
    const kr = (w) => { const rd = JP.keigoReading[w]; return R(rd ? C.dress({ kanji: w, kana: rd }, rd).ruby : w); };
    return `<div class="tbl-wrap"><table class="conj"><thead><tr><th>普通动词</th><th>尊敬语（对方的动作）</th><th>谦让语（自己的动作）</th></tr></thead><tbody>` +
      JP.keigo.map((k) => `<tr><td>${R(C.dress({ kanji: k[0], kana: k[1] }, k[1]).ruby)}</td><td>${k[2].map(kr).join("、") || "—"}</td><td>${k[3].map(kr).join("、") || "—"}</td></tr>`).join("") +
      "</tbody></table></div>";
  }
  function collocTable() {
    return Object.entries(JP.collocRules).map(([key, rule]) => {
      const rows = JP.collocations.filter((c) => c[4] === key)
        .map((c) => `<tr><td>${R(c[0])}<b class="pt">${c[1]}</b>${R(c[2])}${c[5].length ? `<span class="gloss">（也可：${c[5].join("、")}）</span>` : ""}</td><td>${c[3]}</td></tr>`).join("");
      return `<h3>${rule.name}</h3><p class="muted">${rule.explain}</p><div class="tbl-wrap"><table class="conj"><tbody>${rows}</tbody></table></div>`;
    }).join("");
  }
  // 「用法总表」：每个助词一页，排在助词目录最前（level 0）
  JP.particleUsages.forEach((e) => JP.lessons.push({
    id: `pu-${e.p}`, subject: "particle", level: 0, particle: e.p, title: `「${e.p}」的全部用法`, body: `[[usage:${e.p}]]`,
  }));
  const num = (i) => "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"[i] || `${i + 1}.`;
  const rubyHTML = (html) => html.replace(/\{([^{}|<>]+)\|([^{}|<>]+)\}/g, JP.RUBY_HTML);
  function usageBlock(u, i, label = "") {
    return `<div class="usage"><div class="usage-head"><span class="num">${num(i)}</span>${label}<b>${u.name}</b>
        <span class="tag">${u.kind}</span><span class="tag lv">${u.jlpt}</span></div>
      <div class="conn">接续：${u.conn}</div><div class="desc">${u.desc}</div>
      ${u.ex.map(([ja, zh]) => `<div class="ex"><div class="ja">${ja}</div><div class="zh">${zh}</div></div>`).join("")}</div>`;
  }
  function usageHTML(p) {
    const e = JP.particleUsages.find((x) => x.p === p);
    if (!e) return "";
    return `<p>${e.summary}　<span class="muted">（共 ${e.usages.length} 种用法，读音：${e.romaji}）</span></p>
      <div class="usage-index">${e.usages.map((u, i) => `<span>${num(i)} ${u.name}</span>`).join("")}</div>
      ${e.usages.map((u, i) => usageBlock(u, i)).join("")}
      ${e.tips.map((t) => `<div class="tip">💡 ${t}</div>`).join("")}`;
  }
  function lessonHTML(body) {
    return body
      .replace(/\[\[usage:([^\]]+)\]\]/g, (_, p) => usageHTML(p))
      .replace(/\[\[colloc\]\]/g, collocTable)
      .replace(/\[\[conj:([^|\]]+)\|([^\]]+)\]\]/g, (_, f, v) => conjTable(f.split(","), v.split(",")))
      .replace(/\[\[pairs\]\]/g, pairsTable)
      .replace(/\[\[keigo\]\]/g, keigoTable)
      .replace(/<table class="(grid|pat)">/g, '<div class="tbl-wrap"><table class="$1">')
      .replace(/<\/table>(?!<\/div>)/g, "</table></div>")
      .replace(/\{([^{}|<>]+)\|([^{}|<>]+)\}/g, JP.RUBY_HTML);
  }
  function renderLearn(id) {
    let L = JP.lessons.find((l) => l.id === id);
    if (!L) {
      const subj = S.settings().learnSubject || "verb";
      L = JP.lessons.find((l) => l.id === S.settings()["lastLesson_" + subj]) || JP.lessons.find((l) => subjOf(l) === subj);
    }
    const subj = subjOf(L);
    S.setSetting("learnSubject", subj);
    S.setSetting("lastLesson_" + subj, L.id);
    const list = JP.lessons.filter((l) => subjOf(l) === subj).sort((a, b) => a.level - b.level);
    const idx = list.indexOf(L);
    const tabs = Object.entries(SUBJECTS).map(([k, name]) => {
      const first = JP.lessons.find((l) => l.id === S.settings()["lastLesson_" + k]) || JP.lessons.find((l) => subjOf(l) === k);
      return `<a href="#learn/${first.id}" class="${k === subj ? "active" : ""}">${name}</a>`;
    }).join("");
    const groups = [{ level: 0, title: "用法总表" }, ...JP.LEVELS.map((lv) => ({ level: lv.level, title: `${lv.name} · ${lv.jlpt}` }))];
    const toc = groups.filter((g) => list.some((l) => l.level === g.level)).map((g) => `<div class="lv-title">${g.title}</div>` +
      list.filter((l) => l.level === g.level).map((l) => `<a href="#learn/${l.id}" class="${l === L ? "active" : ""}">${l.title}</a>`).join("")).join("");
    const drillQs = L.particle ? JP.pdrill.forParticle(L.particle) : null;
    const practiceBtn = L.level === 0
      ? (drillQs.length ? `<button class="btn primary" id="go-practice">练习「${L.particle}」的用法辨析（${drillQs.length} 题）</button>` : "<span></span>")
      : `<button class="btn primary" id="go-practice">练习本级（${JP.LEVELS[L.level - 1].name}）</button>`;
    const prev = list[idx - 1], next = list[idx + 1];
    main.innerHTML = `<div class="learn">
      <aside class="card toc"><div class="subj-tabs">${tabs}</div>${toc}</aside>
      <article class="card lesson">
        <div class="row"><span class="tag">${SUBJECTS[subj]}</span><span class="tag lv">${L.level ? U.levelName(L.level) : "用法总表"}</span></div>
        <h2 style="margin-top:8px">${L.title}</h2>
        ${lessonHTML(L.body)}
        <div class="lesson-nav">
          ${prev ? `<a class="btn" href="#learn/${prev.id}">← ${prev.title}</a>` : "<span></span>"}
          ${practiceBtn}
          ${next ? `<a class="btn" href="#learn/${next.id}">${next.title} →</a>` : "<span></span>"}
        </div>
      </article></div>`;
    const gp = $("#go-practice");
    if (gp) gp.onclick = () => {
      if (drillQs) return startSession(drillQs, "practice", "用法辨析");
      S.setSetting("practiceCfg", { ...practiceCfg(), subject: subj, level: L.level, topic: "" });
      location.hash = "#practice";
    };
  }

  // ============================ 助词查询 ============================
  function renderParticles(arg) {
    const list = JP.particleUsages;
    main.innerHTML = `<div class="card"><h2>助词查询</h2>
      <div class="lookup-box"><input type="text" id="pq" placeholder="输入助词或中文关键词，例如 が、ni、原因、对象、转折" autocomplete="off"></div>
      <div class="chips" style="margin-top:12px">${list.map((e) => `<a class="chip ${e.p === arg ? "active" : ""}" href="#particles/${encodeURIComponent(e.p)}">${e.p}</a>`).join("")}</div>
    </div><div id="pq-res"></div>`;
    const input = $("#pq");
    K.attach(input);
    const showParticle = (p) => {
      $("#pq-res").innerHTML = `<div class="card lesson" style="margin-top:16px"><div class="row"><h2 style="margin:0">「${p}」的全部用法</h2><span class="spacer"></span>
        <a class="btn small" href="#learn/pu-${encodeURIComponent(p)}">在学习页打开</a></div>${rubyHTML(usageHTML(p))}</div>`;
    };
    const search = () => {
      const q = input.value.trim();
      if (!q) return arg ? showParticle(arg) : ($("#pq-res").innerHTML = '<div class="empty">点击上方的助词，或输入关键词搜索用法</div>');
      const kana = K.normalize(K.toKana(q, true));
      if (list.some((e) => e.p === kana)) return showParticle(kana);
      const hits = list.flatMap((e) => e.usages.filter((u) => [u.name, u.desc, u.kind, u.conn, ...u.ex.map((x) => x[1])].some((t) => t.includes(q)))
        .map((u) => [e, u]));
      $("#pq-res").innerHTML = hits.length
        ? `<div class="card lesson" style="margin-top:16px"><p class="muted">找到 ${hits.length} 条相关用法：</p>${hits.map(([e, u], i) =>
            rubyHTML(usageBlock(u, i, `<a class="pchip" href="#particles/${encodeURIComponent(e.p)}">${e.p}</a>`))).join("")}</div>`
        : '<div class="empty">没有找到相关用法</div>';
    };
    input.addEventListener("input", search);
    search();
  }

  // ============================ 变形查询 ============================
  function searchVerbs(q) {
    q = q.trim();
    if (!q) return [];
    const kana = K.normalize(K.toKana(q, true));
    return VERBS.filter((v) => v.kanji.includes(q) || v.kana.startsWith(kana) || v.meaning.includes(q)).slice(0, 40);
  }
  function verbDetail(v) {
    const rows = C.FORMS.map((f) => `<tr class="form-row"><td>${f.name}</td><td>${C.conjugate(v, f.key).map((x) => R(x.ruby)).join(" / ")}</td>
      <td><button class="btn small ghost">规则</button><div class="why">${R(C.explainForm(v, f.key))}</div></td></tr>`).join("");
    return `<div class="card" style="margin-top:16px">
      <div class="verb-head"><span class="big">${R(C.dress(v, v.kana).ruby)}</span><span class="tag">${C.groupName(v.group)}</span>${v.meaning ? `<span class="muted">${v.meaning}</span>` : ""}</div>
      <p>${R(C.explainGroup(v))}</p>
      <div class="tbl-wrap"><table><thead><tr><th>变形</th><th>结果</th><th style="width:45%">说明</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }
  function renderLookup(arg) {
    main.innerHTML = `<div class="card"><h2>变形查询</h2>
      <div class="lookup-box"><input type="text" id="lk" placeholder="输入动词：汉字 / 假名 / 罗马音 / 中文意思，例如 書く、かく、kaku、写" autocomplete="off"></div>
      <div class="hint">词库收录 ${VERBS.length} 个常用动词；不在词库中的动词，输入假名后选择类别也能查看变形。</div>
      <div class="results" id="lk-res"></div></div><div id="lk-detail"></div>`;
    const input = $("#lk");
    K.attach(input);
    const show = () => {
      const q = input.value;
      const res = searchVerbs(q);
      const kana = K.normalize(K.toKana(q, true));
      let html = res.map((v) => `<a class="result" href="#lookup/${encodeURIComponent(v.kanji)}">${R(C.dress(v, v.kana).ruby)}<small>${v.meaning}</small></a>`).join("");
      const exact = res.some((v) => v.kana === kana || v.kanji === q.trim());
      if (/^[ぁ-ん]+[うくぐすつぬぶむる]$/.test(kana) && !exact) {
        html += `<div class="row" style="width:100%;margin-top:8px"><span class="muted">按指定类别变形「${kana}」：</span>` +
          [1, 2, 3].map((g) => `<a class="btn small" href="#lookup/${encodeURIComponent(`custom:${kana}:${g}`)}">${["", "一类", "二类", "三类"][g]}</a>`).join("") + "</div>";
      }
      $("#lk-res").innerHTML = html || (q.trim() ? '<span class="muted">没有找到</span>' : "");
    };
    input.addEventListener("input", show);
    let v = null;
    if (arg.startsWith("custom:")) {
      const [, kana, g] = arg.split(":");
      const group = Number(g);
      if (group !== 3 || /(する|くる)$/.test(kana)) v = { kanji: kana, kana, group, meaning: "" };
      else $("#lk-detail").innerHTML = '<div class="card" style="margin-top:16px">三类动词只有「する」「くる」及其复合词。</div>';
    } else if (arg) {
      v = findVerb(arg);
    }
    if (v) {
      input.value = v.kanji;
      $("#lk-detail").innerHTML = verbDetail(v);
      $$(".form-row button").forEach((b) => (b.onclick = () => b.closest("tr").classList.toggle("open")));
    }
    show();
    input.focus();
  }

  // ============================ 判题工具 ============================
  function isCorrect(q, ans) {
    if (ans === undefined || ans === null) return false;
    if (q.type === "choice") return ans === q.answer;
    if (q.type === "input") return q.answer.some((a) => K.normalize(a) === K.normalize(ans));
    if (q.type === "order") return ans.length === q.answer.length && ans.every((x, i) => x === q.answer[i]);
    return false;
  }
  function orderSentence(q, order) {
    const parts = order.map((i) => q.options[i]);
    let k = 0;
    const s = q.q.replace(/＿＿＿/g, () => (k < parts.length ? `【${parts[k++]}】` : "＿＿＿"));
    return k ? s : parts.join(" ");
  }
  function answerText(q, ans) {
    if (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && !ans.length)) return "（未作答）";
    if (q.type === "choice") return `${LETTERS[ans]}. ${q.options[ans]}`;
    if (q.type === "input") return ans;
    return orderSentence(q, ans);
  }
  function correctText(q) {
    if (q.type === "choice") return `${LETTERS[q.answer]}. ${q.options[q.answer]}`;
    if (q.type === "input") return q.answer[0] + (q.answer.length > 1 ? `　<span class="muted">（也可：${q.answer.slice(1).map(U.escape).join("、")}）</span>` : "");
    return orderSentence(q, q.answer);
  }
  function tagsHTML(q) {
    return `<span class="tag">${SUBJECTS[subjOf(q)]}</span><span class="tag lv">${JP.LEVELS[q.level - 1].name}</span><span class="tag">${JP.TYPE_NAMES[q.type]}</span>` +
      `<span class="tag">${U.escape(q.topic)}</span>${q.gen ? `<span class="tag">${q.genLabel || "变形题"}</span>` : ""}`;
  }
  function explainHTML(q, ans, showVerdict) {
    const ok = isCorrect(q, ans);
    const note = S.note(q.id);
    // correctText 里 input 题的附加说明已是 HTML，其余文本需经 R() 渲染注音
    const corr = q.type === "input" ? correctText(q).replace(/^[^<]*/, (m) => R(m)) : R(correctText(q));
    return `<div class="feedback">
      ${showVerdict ? `<div class="verdict ${ok ? "ok" : "bad"}">${ok ? "✓ 回答正确" : "✗ 回答错误"}</div>` : ""}
      <dl class="kv">
        ${ans !== undefined ? `<dt>你的答案</dt><dd class="ja">${R(answerText(q, ans))}</dd>` : ""}
        <dt>正确答案</dt><dd class="ja">${corr}</dd>
        <dt>中文</dt><dd>${R(q.zh || "")}</dd>
      </dl>
      <div class="explain">${R(q.explain || "")}${q.wordId ? `<div><a href="#words/${encodeURIComponent(q.wordId)}">查看单词详情 →</a></div>` : ""}</div>
      ${note ? `<div class="note-view">📝 ${U.escape(note)}</div>` : ""}
    </div>`;
  }

  // ============================ 笔记弹窗 ============================
  function noteModal(html, text, save, onSaved) {
    const m = $("#modal");
    $("#modal-q").innerHTML = html;
    $("#modal-text").value = text;
    m.classList.remove("hidden");
    $("#modal-text").focus();
    const close = () => m.classList.add("hidden");
    $("#modal-cancel").onclick = close;
    $("#modal-save").onclick = () => { save($("#modal-text").value); close(); onSaved && onSaved(); };
    $("#modal-del").onclick = () => { save(""); close(); onSaved && onSaved(); };
  }
  const openNote = (q, onSaved) => noteModal(R(q.q), S.note(q.id), (t) => S.setNote(q, t), onSaved);
  JP.ui = { $, $$, noteModal };
  function favBtn(q) {
    const on = S.isFav(q.id);
    return `<button class="btn small ${on ? "on" : ""}" data-fav>${on ? "★ 已收藏" : "☆ 收藏"}</button>`;
  }
  function bindQButtons(root, q, rerender) {
    const fb = $("[data-fav]", root);
    if (fb) fb.onclick = () => { S.toggleFav(q); fb.outerHTML = favBtn(q); bindQButtons(root, q, rerender); };
    const nb = $("[data-note]", root);
    if (nb) nb.onclick = () => openNote(q, rerender);
  }

  // ============================ 刷题：设置 ============================
  function practiceCfg() {
    return Object.assign({ subject: "verb", level: 1, source: "mix", topic: "", mode: "practice", count: 10, wordTopic: "", wordType: "" }, S.settings().practiceCfg || {});
  }
  const subjectsOf = (cfg) => (cfg.subject === "mix" ? ["verb", "particle"] : [cfg.subject]);
  function renderPractice() {
    const cfg = practiceCfg();
    const save = () => S.setSetting("practiceCfg", cfg);
    const draw = () => {
      const levels = cfg.level ? [cfg.level] : [1, 2, 3, 4, 5];
      const subjects = subjectsOf(cfg);
      const hand = JP.questions.filter((q) => levels.includes(q.level) && subjects.includes(subjOf(q)));
      const topics = [...new Set(hand.map((q) => q.topic))];
      if (cfg.topic && !topics.includes(cfg.topic)) cfg.topic = "";
      const genName = { verb: "变形题（自动生成，无限）", particle: "搭配题＋用法辨析题（自动出题）", mix: "变形题＋搭配题＋辨析题" }[cfg.subject];
      const noColloc = cfg.subject !== "verb" && cfg.source !== "hand" && levels.every((l) => l > 3);
      const chip = (key, val, label) => `<button class="chip ${cfg[key] === val ? "active" : ""}" data-k="${key}" data-v="${val}">${label}</button>`;
      const W = JP.wordKit;
      const wordFields = `<div class="field"><label>单词范围</label><select id="wtopic"><option value="">全部单词（N5 ${JP.words.length} 词）</option>
          ${W.TOPICS.filter(([k]) => JP.words.some((w) => w.topic === k)).map(([k, n]) => `<option value="${k}" ${cfg.wordTopic === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="field"><label>题型</label><div class="chips">${chip("wordType", "", "随机混合")}${Object.entries(JP.wdrill.TYPES).map(([k, n]) => chip("wordType", k, n)).join("")}</div>
          <div class="hint">单词题全部由程序从词表自动出题，可以无限刷；听力题需要浏览器支持日语朗读。</div></div>`;
      main.innerHTML = `<div class="card q-card"><h2>刷题</h2>
        <div class="field"><label>科目</label><div class="chips">
          ${chip("subject", "verb", "动词")}${chip("subject", "particle", "助词")}${chip("subject", "word", "单词")}${chip("subject", "mix", "动词＋助词混合")}</div></div>
        ${cfg.subject === "word" ? wordFields : `<div class="field"><label>难度</label><div class="chips">
          ${JP.LEVELS.map((l) => chip("level", l.level, `${l.name} <span class="muted">${l.jlpt}</span>`)).join("")}${chip("level", 0, "全部混合")}</div></div>
        <div class="field"><label>题目来源</label><div class="chips">
          ${chip("source", "mix", "综合")}${chip("source", "hand", `句子题（${hand.length} 题）`)}${chip("source", "gen", genName)}</div></div>
        ${cfg.source === "hand" ? `<div class="field"><label>知识点</label><select id="topic"><option value="">全部知识点</option>
          ${topics.map((t) => `<option ${t === cfg.topic ? "selected" : ""}>${U.escape(t)}</option>`).join("")}</select></div>` : ""}`}
        <div class="field"><label>模式</label><div class="chips">
          ${chip("mode", "practice", "练习模式：每题立即判分讲解")}${chip("mode", "quiz", "测验模式：整组做完再看")}</div></div>
        <div class="field"><label>题量</label><div class="chips">${[10, 20, 30].map((n) => chip("count", n, `${n} 题`)).join("")}</div></div>
        <button class="btn primary" id="start">开始做题</button>
        ${noColloc ? '<p class="muted">搭配题只覆盖入门~进阶，中级、高级的助词自动题只有用法辨析题。</p>' : ""}
        ${hand.length === 0 && cfg.source !== "gen" && cfg.subject !== "word" ? '<p class="muted">该难度暂时没有句子题，将使用自动生成的题目。</p>' : ""}
      </div>`;
      $$(".chip").forEach((c) => (c.onclick = () => {
        const v = c.dataset.v;
        cfg[c.dataset.k] = /^\d+$/.test(v) ? Number(v) : v;
        save();
        draw();
      }));
      const ts = $("#topic");
      if (ts) ts.onchange = () => { cfg.topic = ts.value; save(); };
      const wt = $("#wtopic");
      if (wt) wt.onchange = () => { cfg.wordTopic = wt.value; save(); };
      $("#start").onclick = () => {
        const qs = buildSet(cfg);
        if (!qs.length) return alert("没有符合条件的题目。");
        startSession(qs, cfg.mode, "刷题");
      };
    };
    draw();
  }
  function buildSet(cfg) {
    if (cfg.subject === "word") return JP.wdrill.generate(cfg.count, { topic: cfg.wordTopic, type: cfg.wordType });
    const levels = cfg.level ? [cfg.level] : [1, 2, 3, 4, 5];
    const subjects = subjectsOf(cfg);
    const hand = U.shuffle(JP.questions.filter((q) => levels.includes(q.level) && subjects.includes(subjOf(q)) &&
      (!cfg.topic || cfg.source !== "hand" || q.topic === cfg.topic)));
    // 自动生成：动词出变形题，助词出搭配题（助词中级以上没有搭配题，会生成失败）
    const gen = (n) => {
      const out = [], ids = new Set();
      for (let tries = 0; out.length < n && tries < n * 20; tries++) {
        const subj = U.pick(subjects), lv = U.pick(levels);
        const q = (subj === "verb" ? JP.drill : JP.pdrill).generate(lv, 1)[0];
        if (q && !ids.has(q.id)) { ids.add(q.id); out.push(q); }
      }
      return out;
    };
    let picked;
    if (cfg.source === "hand") picked = hand.slice(0, cfg.count);
    else if (cfg.source === "gen") picked = gen(cfg.count);
    else {
      const h = hand.slice(0, Math.ceil(cfg.count / 2));
      picked = [...h, ...gen(cfg.count - h.length)];
    }
    // 自动生成的不够时，用句子题补足
    const rest = hand.filter((q) => !picked.includes(q));
    return U.shuffle([...picked, ...rest.slice(0, Math.max(0, cfg.count - picked.length))]);
  }

  // ============================ 刷题：答题过程 ============================
  let session = null;
  function startSession(qs, mode, title) {
    session = { qs, mode, title, idx: 0, answers: qs.map(() => undefined), judged: qs.map(() => false), done: false };
    if (location.hash !== "#practice/run") location.hash = "#practice/run";
    else drawQuestion();
  }
  // 从复习本等地方进入时用
  JP.startSession = startSession;

  const _renderPractice = renderPractice;
  renderPractice = function (arg) {
    if (arg === "run" && session) return session.done ? drawResult() : drawQuestion();
    _renderPractice();
  };

  function drawQuestion() {
    const s = session;
    const q = s.qs[s.idx];
    const ans = s.answers[s.idx];
    const judged = s.judged[s.idx];
    const quiz = s.mode === "quiz";
    let body = "";
    if (q.type === "choice") {
      body = `<div class="opts">${q.options.map((o, i) => {
        let cls = "";
        if (judged) cls = i === q.answer ? "correct" : i === ans ? "wrong" : "";
        else if (i === ans) cls = "selected";
        return `<button class="opt ${cls}" data-i="${i}" ${judged ? "disabled" : ""}><span class="key">${LETTERS[i]}</span><span>${R(o)}</span></button>`;
      }).join("")}</div>`;
    } else if (q.type === "input") {
      const cls = judged ? (isCorrect(q, ans) ? "correct" : "wrong") : "";
      body = `<div class="input-row"><input type="text" id="ans" class="${cls}" value="${U.escape(ans || "")}" autocomplete="off" ${judged ? "disabled" : ""} placeholder="在这里输入答案">
        ${!quiz && !judged ? '<button class="btn primary" id="submit">提交</button>' : ""}</div>
        <div class="hint">${S.settings().romaji ? `可直接输入罗马音自动转假名（如 kaite → かいて，ん 输入 nn${subjOf(q) === "particle" ? "；助词は・へ・を 分别输入 ha・he・wo" : ""}）；也可用输入法输入假名或汉字。` : "请用输入法输入假名或汉字。"}按 Enter 提交。</div>`;
    } else {
      const cur = ans || [];
      const cls = judged ? (isCorrect(q, cur) ? "correct" : "wrong") : "";
      body = `<div class="slots ${cls}" id="slots">${cur.map((i, k) => `<button class="frag" data-slot="${k}" ${judged ? "disabled" : ""}>${R(q.options[i])}</button>`).join("") || '<span class="muted">依次点击下面的片段，组成正确的句子</span>'}</div>
        <div class="frags">${q.options.map((o, i) => `<button class="frag ${cur.includes(i) ? "used" : ""}" data-frag="${i}" ${judged ? "disabled" : ""}><span class="n">${i + 1}</span>${R(o)}</button>`).join("")}</div>
        ${!judged ? `<div class="q-actions"><button class="btn small ghost" id="reset">重排</button>${!quiz ? `<button class="btn primary" id="submit" ${cur.length === q.options.length ? "" : "disabled"}>提交</button>` : ""}</div>` : ""}`;
    }
    const last = s.idx === s.qs.length - 1;
    let actions = "";
    if (quiz) {
      actions = `<button class="btn" id="prev" ${s.idx === 0 ? "disabled" : ""}>上一题</button>
        <button class="btn" id="next" ${last ? "disabled" : ""}>下一题</button><span class="spacer"></span>
        <button class="btn primary" id="finish">交卷</button>`;
    } else if (judged) {
      actions = `${favBtn(q)}<button class="btn small" data-note>📝 ${S.note(q.id) ? "编辑笔记" : "写笔记"}</button><span class="spacer"></span>
        <button class="btn primary" id="next">${last ? "查看本组结果" : "下一题 →"}</button>`;
    }
    const answered = s.answers.map((a) => a !== undefined && a !== "" && !(Array.isArray(a) && !a.length));
    main.innerHTML = `<div class="card q-card">
      <div class="progress"><div style="width:${((s.idx + (judged ? 1 : 0)) / s.qs.length) * 100}%"></div></div>
      <div class="q-top"><b>第 ${s.idx + 1} / ${s.qs.length} 题</b>${tagsHTML(q)}<span class="spacer"></span>
        <button class="btn small ghost" id="quit">退出</button></div>
      <div class="stem">${R(q.q)}${q.audio ? ` <button class="spk big" data-say="${U.escape(q.audio)}" title="朗读">${JP.wordKit.SPK_ICON}</button>` : ""}</div>
      ${body}
      ${judged && !quiz ? explainHTML(q, ans, true) : ""}
      <div class="q-actions">${actions}</div>
      ${quiz ? `<div class="q-grid">${s.qs.map((_, i) => `<button class="${answered[i] ? "done" : ""} ${i === s.idx ? "cur" : ""}" data-go="${i}">${i + 1}</button>`).join("")}</div>` : ""}
    </div>`;
    bindQuestion(q, quiz, judged);
    JP.bindSpeak();
    if (q.audio && !judged && s.spoken !== s.idx) { s.spoken = s.idx; JP.wordKit.speak(q.audio); }
  }

  function bindQuestion(q, quiz, judged) {
    const s = session;
    const go = (i) => { s.idx = i; drawQuestion(); window.scrollTo(0, 0); };
    const judge = () => {
      s.judged[s.idx] = true;
      S.record(q, isCorrect(q, s.answers[s.idx]));
      drawQuestion();
    };
    $("#quit").onclick = () => {
      if (s.mode === "quiz" && !confirm("退出后本次测验的作答不会保存，确定退出吗？")) return;
      session = null;
      location.hash = "#practice";
    };
    bindQButtons(main, q, drawQuestion);
    if (!judged) {
      if (q.type === "choice") {
        $$(".opt").forEach((b) => (b.onclick = () => {
          s.answers[s.idx] = Number(b.dataset.i);
          quiz ? drawQuestion() : judge();
        }));
      } else if (q.type === "input") {
        const input = $("#ans");
        K.attach(input);
        input.addEventListener("input", () => { s.answers[s.idx] = input.value; });
        input.addEventListener("change", () => { s.answers[s.idx] = K.finalize(input); });
        const submit = () => {
          s.answers[s.idx] = K.finalize(input).trim();
          if (!s.answers[s.idx]) return input.focus();
          judge();
        };
        input.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" || e.isComposing) return;
          e.preventDefault();
          if (quiz) { s.answers[s.idx] = K.finalize(input).trim(); if (s.idx < s.qs.length - 1) go(s.idx + 1); }
          else submit();
        });
        const sb = $("#submit");
        if (sb) sb.onclick = submit;
        input.focus();
      } else {
        const cur = () => (s.answers[s.idx] = s.answers[s.idx] || []);
        $$("[data-frag]").forEach((b) => (b.onclick = () => { cur().push(Number(b.dataset.frag)); drawQuestion(); }));
        $$("[data-slot]").forEach((b) => (b.onclick = () => { cur().splice(Number(b.dataset.slot), 1); drawQuestion(); }));
        $("#reset").onclick = () => { s.answers[s.idx] = []; drawQuestion(); };
        const sb = $("#submit");
        if (sb) sb.onclick = judge;
      }
    }
    const next = $("#next");
    if (next) next.onclick = () => {
      if (!quiz && s.idx === s.qs.length - 1) { s.done = true; drawResult(); } else go(s.idx + 1);
    };
    const prev = $("#prev");
    if (prev) prev.onclick = () => go(s.idx - 1);
    $$("[data-go]").forEach((b) => (b.onclick = () => go(Number(b.dataset.go))));
    const fin = $("#finish");
    if (fin) fin.onclick = () => {
      const left = s.answers.filter((a) => a === undefined || a === "" || (Array.isArray(a) && !a.length)).length;
      if (left && !confirm(`还有 ${left} 题没有作答，确定交卷吗？`)) return;
      s.qs.forEach((qq, i) => { s.judged[i] = true; S.record(qq, isCorrect(qq, s.answers[i])); });
      s.done = true;
      drawResult();
    };
    // 键盘：1-4 选择，练习模式下判完分按 Enter 下一题
    document.onkeydown = (e) => {
      if (!$("#modal").classList.contains("hidden") || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (!judged && q.type === "choice" && /^[1-4]$/.test(e.key)) { const b = $$(".opt")[Number(e.key) - 1]; b && b.click(); }
      if (judged && !quiz && e.key === "Enter" && next) { e.preventDefault(); next.click(); }
    };
  }

  function drawResult() {
    const s = session;
    const ok = s.qs.filter((q, i) => isCorrect(q, s.answers[i])).length;
    const wrongQs = s.qs.filter((q, i) => !isCorrect(q, s.answers[i]));
    main.innerHTML = `<div class="card q-card">
      <div class="score"><div class="num">${ok} / ${s.qs.length}</div><div class="muted">正确率 ${Math.round((ok / s.qs.length) * 100)}%</div></div>
      <div class="row" style="justify-content:center;margin:12px 0 4px">
        ${wrongQs.length ? '<button class="btn primary" id="redo">重做本组错题</button>' : ""}
        <button class="btn" id="again">再来一组</button><a class="btn ghost" href="#review">去复习本</a></div>
    </div>
    <div id="res-list" style="max-width:820px;margin:16px auto 0"></div>`;
    $("#res-list").innerHTML = s.qs.map((q, i) => resultItem(q, s.answers[i], i)).join("");
    bindItems($("#res-list"), s.qs, (i) => s.answers[i]);
    const redo = $("#redo");
    if (redo) redo.onclick = () => startSession(wrongQs, "practice", "重做错题");
    $("#again").onclick = () => { session = null; location.hash = "#practice"; };
  }

  function resultItem(q, ans, i, extra = "") {
    const ok = isCorrect(q, ans);
    return `<div class="card item ${ok ? "" : "open"}" data-idx="${i}">
      <div class="row">${ans !== undefined ? `<b style="color:var(--${ok ? "ok" : "bad"})">${ok ? "✓" : "✗"}</b>` : ""}${tagsHTML(q)}</div>
      <div class="stem">${R(q.q)}${q.audio ? ` <button class="spk" data-say="${U.escape(q.audio)}" title="朗读">${JP.wordKit.SPK_ICON}</button>` : ""}</div>
      ${extra}
      <div class="detail">${explainHTML(q, ans, false)}</div>
      <div class="q-actions"><button class="btn small ghost" data-toggle>展开/收起讲解</button>${favBtn(q)}
        <button class="btn small" data-note>📝 ${S.note(q.id) ? "编辑笔记" : "写笔记"}</button><span class="spacer"></span></div>
    </div>`;
  }
  function bindItems(root, qs, ansOf, after) {
    $$(".item", root).forEach((el) => {
      const i = Number(el.dataset.idx);
      const q = qs[i];
      const redraw = () => {
        const open = el.classList.contains("open");
        el.outerHTML = resultItem(q, ansOf(i), i);
        const fresh = $(`.item[data-idx="${i}"]`, root);
        fresh.classList.toggle("open", open);
        bindItems(root, qs, ansOf, after);
      };
      $("[data-toggle]", el).onclick = () => el.classList.toggle("open");
      bindQButtons(el, q, after || redraw);
    });
    JP.bindSpeak(root);
  }

  // ============================ 复习本 ============================
  let reviewTab = "fav";
  let reviewLevel = 0;
  let reviewSubject = "all";
  function renderReview() {
    const sources = {
      fav: { name: "收藏", list: S.favorites(), remove: (it) => S.toggleFav(it.q), removeLabel: "取消收藏" },
      notes: { name: "笔记", list: S.notes(), remove: (it) => S.setNote(it.q, ""), removeLabel: "删除笔记" },
      wrong: { name: "错题本", list: S.wrongs(), remove: (it) => S.removeWrong(it.id), removeLabel: "移出错题本" },
    };
    const tabBtn = (k, name, n) => `<button class="${reviewTab === k ? "active" : ""}" data-tab="${k}">${name}${n !== undefined ? `（${n}）` : ""}</button>`;
    const wordIds = [...new Set([...S.wordFavs(), ...S.wordNotes()].map((x) => x.id))].filter((id) => JP.wordKit.byId(id));
    const head = `<h2>复习本</h2><div class="tabs">${tabBtn("fav", "⭐ 收藏", sources.fav.list.length)}${tabBtn("notes", "📝 笔记", sources.notes.list.length)}
      ${tabBtn("wrong", "❌ 错题本", sources.wrong.list.length)}${tabBtn("words", "🗂️ 单词本", wordIds.length)}${tabBtn("stats", "📊 统计")}</div>`;
    if (reviewTab === "stats") {
      main.innerHTML = `<div class="card">${head}${statsHTML()}</div>`;
    } else if (reviewTab === "words") {
      main.innerHTML = `<div class="card">${head}<p class="muted" style="margin-top:0">在单词详情页收藏或写了笔记的单词。错题本、收藏里的单词题按上面的标签查看。</p>
        ${wordIds.length ? `<div class="row" style="margin-bottom:12px"><span class="spacer"></span><button class="btn primary" id="wb-cards">用单词卡片复习收藏的词</button></div>` : ""}
        ${wordIds.map((id) => {
          const w = JP.wordKit.byId(id), note = S.wordNote(id);
          return `<div class="wb-item"><a href="#words/${encodeURIComponent(id)}" class="ja">${R(w.w)}</a><span class="muted">${U.escape(w.zh)}</span>
            ${S.isWordFav(id) ? '<span class="star">★</span>' : ""}${note ? `<div class="note-view">📝 ${U.escape(note)}</div>` : ""}</div>`;
        }).join("") || '<div class="empty">这里还没有内容。在单词详情页点「☆ 收藏」或「📝 写笔记」即可加入。</div>'}</div>`;
      const wb = $("#wb-cards");
      if (wb) wb.onclick = () => { S.setSetting("cardCfg", { ...(S.settings().cardCfg || {}), range: "fav" }); location.hash = "#cards"; };
    } else {
      const src = sources[reviewTab];
      const items = src.list.filter((it) => it.q && (!reviewLevel || it.q.level === reviewLevel) &&
        (reviewSubject === "all" || subjOf(it.q) === reviewSubject)).sort((a, b) => b.at - a.at);
      const subjChips = [["all", "全部科目"], ...Object.entries(SUBJECTS)].map(([k, n]) => `<button class="chip ${reviewSubject === k ? "active" : ""}" data-subj="${k}">${n}</button>`).join("");
      const levelChips = [0, 1, 2, 3, 4, 5].map((l) => `<button class="chip ${reviewLevel === l ? "active" : ""}" data-lv="${l}">${l ? JP.LEVELS[l - 1].name : "全部难度"}</button>`).join("");
      main.innerHTML = `<div class="card">${head}
        <div class="chips" style="margin-bottom:10px">${subjChips}</div>
        <div class="row"><div class="chips">${levelChips}</div><span class="spacer"></span>
          ${items.length ? `<button class="btn primary" id="redo-all">把这 ${items.length} 题重做一遍</button>` : ""}</div>
        ${reviewTab === "wrong" ? '<p class="muted" style="margin-bottom:0">最近一次答错的题会进入错题本，之后再答对会自动移出。</p>' : ""}
      </div><div id="rv-list" style="margin-top:16px">${items.length ? "" : `<div class="empty">这里还没有内容。做题时点「☆ 收藏」或「📝 写笔记」即可加入。</div>`}</div>`;
      const list = $("#rv-list");
      list.innerHTML = items.map((it, i) => {
        const extra = reviewTab === "notes" ? `<div class="note-view">📝 ${U.escape(it.text)}</div>` :
          reviewTab === "wrong" ? `<div class="muted">做过 ${it.tries} 次，答对 ${it.right} 次</div>` : "";
        return resultItem(it.q, undefined, i, extra).replace('<span class="spacer"></span>', `<span class="spacer"></span>
          <button class="btn small" data-redo>重做此题</button><button class="btn small ghost" data-remove>${src.removeLabel}</button>`);
      }).join("");
      $$(".item", list).forEach((el) => el.classList.remove("open"));
      bindItems(list, items.map((it) => it.q), () => undefined, renderReview);
      $$(".item", list).forEach((el) => {
        const it = items[Number(el.dataset.idx)];
        $("[data-redo]", el).onclick = () => startSession([it.q], "practice", "复习");
        $("[data-remove]", el).onclick = () => { src.remove(it); renderReview(); };
      });
      $$("[data-lv]").forEach((b) => (b.onclick = () => { reviewLevel = Number(b.dataset.lv); renderReview(); }));
      $$("[data-subj]").forEach((b) => (b.onclick = () => { reviewSubject = b.dataset.subj; renderReview(); }));
      const ra = $("#redo-all");
      if (ra) ra.onclick = () => startSession(U.shuffle(items.map((it) => it.q)), "practice", "复习");
    }
    $$("[data-tab]").forEach((b) => (b.onclick = () => { reviewTab = b.dataset.tab; renderReview(); }));
  }
  function statsHTML() {
    const hist = Object.values(S.history()).filter((h) => h.q);
    const wh = hist.filter((h) => subjOf(h.q) === "word");
    const wTries = wh.reduce((a, h) => a + h.tries, 0), wRight = wh.reduce((a, h) => a + h.right, 0);
    const cards = JP.words.map((w) => S.card(w.id)).filter(Boolean);
    const wordStats = `<h3>单词</h3><div class="stats-grid">
      <div class="stat"><b>${cards.length} / ${JP.words.length}</b><span class="muted">卡片学过的词</span></div>
      <div class="stat"><b>${cards.filter((c) => c.box >= S.MASTER_BOX).length}</b><span class="muted">已掌握（连续认识 ${S.MASTER_BOX} 次以上）</span></div>
      <div class="stat"><b>${cards.filter((c) => c.due <= Date.now()).length}</b><span class="muted">到期待复习</span></div>
      <div class="stat"><b>${wTries ? Math.round((wRight / wTries) * 100) + "%" : "—"}</b><span class="muted">单词测验正确率（${wTries} 次）</span></div></div>`;
    return Object.entries(SUBJECTS).filter(([subj]) => subj !== "word").map(([subj, name]) => {
      const rows = JP.LEVELS.map((l) => {
        const hs = hist.filter((h) => h.q.level === l.level && subjOf(h.q) === subj);
        const tries = hs.reduce((a, h) => a + h.tries, 0);
        const right = hs.reduce((a, h) => a + h.right, 0);
        const handTotal = handOf(subj).filter((q) => q.level === l.level).length;
        const handDone = hs.filter((h) => !h.q.gen).length;
        const rate = tries ? Math.round((right / tries) * 100) : 0;
        return `<tr><td>${l.name}（${l.jlpt}）</td><td>${handDone} / ${handTotal}</td><td>${hs.filter((h) => h.q.gen).length}</td><td>${tries}</td>
          <td style="min-width:160px"><div class="row"><div class="bar" style="flex:1"><div style="width:${rate}%"></div></div>${tries ? rate + "%" : "—"}</div></td></tr>`;
      }).join("");
      return `<h3>${name}</h3><div class="tbl-wrap"><table><thead><tr><th>难度</th><th>句子题完成</th><th>做过的${subj === "verb" ? "变形题" : "搭配/辨析题"}</th><th>作答次数</th><th>正确率</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join("") + wordStats;
  }

  // ============================ 设置 ============================
  function renderSettings() {
    const st = S.settings();
    main.innerHTML = `<div class="card" style="max-width:720px;margin:0 auto"><h2>设置</h2>
      <div class="field"><label><input type="checkbox" id="s-furi" ${st.furigana ? "checked" : ""}> 显示振假名（汉字上方的读音）</label>
        <div class="hint">熟悉之后可以关掉，锻炼认读汉字。</div></div>
      <div class="field"><label><input type="checkbox" id="s-romaji" ${st.romaji ? "checked" : ""}> 填空题输入罗马音时自动转换为平假名</label>
        <div class="hint">如果你习惯用系统的日文输入法，可以关掉。</div></div>
      <h3>数据备份</h3>
      <p class="muted">收藏、笔记和做题记录只保存在当前浏览器里。换电脑、换浏览器或清理浏览器数据前，请先导出备份。</p>
      <div class="row"><button class="btn" id="s-export">导出备份</button>
        <label class="btn">导入备份<input type="file" id="s-import" accept=".json,application/json" hidden></label>
        <span class="spacer"></span><button class="btn ghost" id="s-reset" style="color:var(--bad)">清空所有数据</button></div>
      <h3>关于</h3>
      <p class="muted">句子题为参照 JLPT 题型与难度编写的原创题（动词 ${handOf("verb").length} 题、助词 ${handOf("particle").length} 题）；变形题由内置的 ${VERBS.length} 个常用动词自动生成，搭配题来自 ${JP.collocations.length} 组动词与助词的固定搭配，辨析题来自助词用法总表的例句；单词题由 ${JP.words.length} 个单词自动出题。单词的例句、联想记忆和词源拆解为原创整理，语源说法标注了可信度（构词明确 / 常见说法 / 有争议）。</p>
    </div>`;
    $("#s-furi").onchange = (e) => { S.setSetting("furigana", e.target.checked); applySettings(); };
    $("#s-romaji").onchange = (e) => S.setSetting("romaji", e.target.checked);
    $("#s-export").onclick = () => {
      const blob = new Blob([S.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `jpstudy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    $("#s-import").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then((t) => {
        try {
          if (!confirm("导入会覆盖当前的所有收藏、笔记和做题记录，确定继续吗？")) return;
          S.importJSON(t);
          applySettings();
          alert("导入成功");
          renderSettings();
        } catch (err) {
          alert("导入失败：" + err.message);
        }
      });
    };
    $("#s-reset").onclick = () => {
      if (confirm("确定清空所有收藏、笔记和做题记录吗？此操作不能撤销。")) { S.reset(); applySettings(); renderSettings(); }
    };
  }

  applySettings();
  route();
})();
