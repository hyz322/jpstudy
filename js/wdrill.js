// 单词自动出题：看词选意思、看意思选词、汉字选读音、听发音选意思。
(function () {
  const U = JP.util;
  const W = JP.wordKit;
  const TYPES = {
    meaning: "看词选意思",
    word: "看意思选词",
    reading: "汉字选读音",
    listen: "听发音选意思",
  };
  const hasKanji = (w) => W.kanjiOf(w).length > 0;

  // 干扰项：优先同词性，排除意思重叠（或读音相同）的词，避免出现两个正确答案
  function distractors(w, ok, n = 3) {
    const pool = JP.words.filter((x) => x !== w && ok(x));
    const same = U.shuffle(pool.filter((x) => x.pos === w.pos));
    const other = U.shuffle(pool.filter((x) => x.pos !== w.pos));
    const out = [];
    for (const x of [...same, ...other]) {
      if (out.length >= n) break;
      if (!out.some((y) => W.overlap(x, y) || y.kana === x.kana)) out.push(x);
    }
    return out.length === n ? out : null;
  }

  function explain(w) {
    const ex = w.ex[0];
    const best = W.bestOf(w.mn);
    const rd = W.bestOf(w.rd);
    return `${W.plain(w.w)}（${w.kana} / ${JP.kana.toRomaji(w.kana)}）：${w.zh}　〔${W.posName(w.pos)}〕` +
      (ex ? `\n例：${ex[0].replace(/<[^>]+>/g, "")}　${ex[1]}` : "") +
      (rd ? `\n读音：${rd.text.replace(/<[^>]+>/g, "")}` : "") +
      (best ? `\n记忆：${best.text.replace(/<[^>]+>/g, "")}` : "");
  }

  function make(w, type) {
    const base = { id: `WG-${w.id}-${type}`, level: W.level(w), subject: "word", gen: true, genLabel: TYPES[type], type: "choice",
      topic: W.topicName(w.topic), wordId: w.id, zh: w.zh, explain: explain(w) };
    let others, options, correct, q, audio;
    if (type === "meaning" || type === "listen") {
      others = distractors(w, (x) => !W.overlap(x, w) && x.kana !== w.kana);
      if (!others) return null;
      correct = w.zh;
      options = U.shuffle([correct, ...others.map((x) => x.zh)]);
      if (type === "meaning") q = `「${w.w}」是什么意思？`;
      else { q = "听发音，选出正确的意思（点喇叭按钮可以重听）"; audio = w.kana; }
    } else if (type === "word") {
      others = distractors(w, (x) => !W.overlap(x, w));
      if (!others) return null;
      correct = w.w;
      options = U.shuffle([correct, ...others.map((x) => x.w)]);
      q = `「${w.zh}」用日语怎么说？`;
    } else {
      if (!hasKanji(w)) return null;
      const len = w.kana.length;
      // 同一写法有多种读音的词（如 一日：いちにち／ついたち）不能互相做干扰项
      others = distractors(w, (x) => x.kana !== w.kana && W.plain(x.w) !== W.plain(w.w) && Math.abs(x.kana.length - len) <= 1);
      if (!others) return null;
      correct = w.kana;
      options = U.shuffle([correct, ...others.map((x) => x.kana)]);
      q = `「${W.plain(w.w)}」的读音是？`;
    }
    return { ...base, q, options, answer: options.indexOf(correct), ...(audio ? { audio } : {}) };
  }

  // opts：{ topic, type, level }；type 为空时随机题型
  function generate(n, opts = {}) {
    const pool = JP.words.filter((w) => (!opts.topic || w.topic === opts.topic) && (!opts.level || W.level(w) <= opts.level));
    const out = [], ids = new Set();
    for (let t = 0; out.length < n && t < n * 20 && pool.length; t++) {
      const type = opts.type || U.pick(Object.keys(TYPES));
      const q = make(U.pick(pool), type);
      if (q && !ids.has(q.id)) { ids.add(q.id); out.push(q); }
    }
    return out;
  }

  JP.wdrill = { TYPES, generate, make };
})();
