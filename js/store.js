// 本地存储：收藏、笔记、做题记录、设置。全部保存在浏览器 localStorage 中，可导出/导入 JSON 备份。
(function () {
  const KEY = "jpstudy.v1";
  const empty = () => ({ favorites: {}, notes: {}, history: {}, settings: { furigana: true, romaji: true } });
  let data = empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = Object.assign(empty(), JSON.parse(raw));
  } catch (e) {
    console.warn("读取本地数据失败，将使用空数据", e);
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      alert("保存失败：浏览器本地存储不可用或已满。");
    }
  };

  // 题目快照：自动生成的题目每次不同，所以收藏/笔记/记录时保存整道题
  const snap = (q) => JSON.parse(JSON.stringify(q));

  JP.store = {
    settings: () => data.settings,
    setSetting(k, v) { data.settings[k] = v; save(); },

    // 优先使用题库中的最新版本（手工题如有修订会同步），找不到则用快照
    resolve(id, fallback) {
      return JP.questions.find((q) => q.id === id) || fallback;
    },

    isFav: (id) => !!data.favorites[id],
    toggleFav(q) {
      if (data.favorites[q.id]) delete data.favorites[q.id];
      else data.favorites[q.id] = { q: snap(q), at: Date.now() };
      save();
      return !!data.favorites[q.id];
    },
    favorites: () => Object.entries(data.favorites).map(([id, f]) => ({ id, q: JP.store.resolve(id, f.q), at: f.at })),

    note: (id) => (data.notes[id] ? data.notes[id].text : ""),
    setNote(q, text) {
      if (text.trim()) data.notes[q.id] = { text, q: snap(q), at: Date.now() };
      else delete data.notes[q.id];
      save();
    },
    notes: () => Object.entries(data.notes).map(([id, n]) => ({ id, q: JP.store.resolve(id, n.q), text: n.text, at: n.at })),

    record(q, correct) {
      const h = data.history[q.id] || { tries: 0, right: 0, q: snap(q) };
      h.tries++;
      if (correct) h.right++;
      h.last = correct;
      h.at = Date.now();
      h.q = snap(q);
      data.history[q.id] = h;
      save();
    },
    // 错题本：最近一次答错的题（再次答对后自动移出）
    wrongs: () => Object.entries(data.history).filter(([, h]) => h.last === false)
      .map(([id, h]) => ({ id, q: JP.store.resolve(id, h.q), at: h.at, tries: h.tries, right: h.right })),
    removeWrong(id) {
      if (data.history[id]) { data.history[id].last = true; save(); }
    },
    history: () => data.history,

    exportJSON: () => JSON.stringify(data, null, 2),
    importJSON(text) {
      const obj = JSON.parse(text);
      if (!obj || typeof obj !== "object" || !obj.history) throw new Error("文件格式不正确");
      data = Object.assign(empty(), obj);
      save();
    },
    reset() { data = empty(); save(); },
  };
})();
