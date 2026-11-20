// 自动出题：基于动词词库和变形引擎，按难度生成无限的变形练习题。
(function () {
  const C = JP.conj;
  const U = JP.util;

  // 各难度可出的题目种类（重复出现的种类出现频率更高）及词库范围
  const LEVEL_KINDS = {
    1: { kinds: ["group", "group", "masu", "masen", "mashita", "masendeshita", "mashou", "toDict"], minJlpt: 5 },
    2: { kinds: ["te", "te", "ta", "ta", "nai", "nakatta", "toDict", "group"], minJlpt: 4 },
    3: { kinds: ["potential", "volitional", "ba", "tara", "imperative", "prohibitive"], minJlpt: 4, vol: true },
    4: { kinds: ["passive", "causative", "causpass", "causpass", "trans", "trans"], minJlpt: 3, vol: true },
    5: { kinds: ["sonkei", "kenjou", "keigoReverse", "oninaru", "osuru"] },
  };
  const ROW = {
    う: "わいうえお", く: "かきくけこ", ぐ: "がぎぐげご", す: "さしすせそ", つ: "たちつてと",
    ぬ: "なにぬねの", ぶ: "ばびぶべぼ", む: "まみむめも", る: "らりるれろ",
  };
  const ROW_FORMS = new Set(["masu", "masen", "mashita", "masendeshita", "mashou", "nai", "nakatta", "potential",
    "volitional", "ba", "imperative", "passive", "causative", "causpass"]);
  const CONFUSE = {
    potential: ["passive", "causative"], passive: ["potential", "causative"], causative: ["passive", "causpass"],
    causpass: ["causative", "passive"], volitional: ["imperative", "ba"], imperative: ["volitional", "ba"],
    ba: ["tara", "imperative"], tara: ["te", "ba"], prohibitive: ["nai"], nakatta: ["nai", "masendeshita"],
    masendeshita: ["masen", "nakatta"], mashita: ["ta"], masen: ["nai"],
  };

  const uniq = (a) => [...new Set(a)];

  function pool(level) {
    const cfg = LEVEL_KINDS[level];
    return JP.verbs.map(C.toVerb).filter((v) => v.jlpt >= (cfg.minJlpt || 1) && (!cfg.vol || !C.NONVOL.has(v.kanji)));
  }

  function makeChoice(base, correctRuby, wrongRubies) {
    const opts = U.shuffle([correctRuby, ...U.shuffle(uniq(wrongRubies)).slice(0, 3)]);
    return { ...base, type: "choice", options: opts, answer: opts.indexOf(correctRuby) };
  }

  // 学习者容易写错的形式
  function wrongKana(v, form) {
    const correct = C.kanaForms(v, form);
    const out = [];
    const last = v.kana.slice(-1);
    const b = v.kana.slice(0, -1);
    if (v.group === 1 && last === "る") out.push(...C.kanaForms(v, form, 2));
    if (v.group === 2) out.push(...C.kanaForms(v, form, 1));
    if (v.group === 1 && ["te", "ta", "tara"].includes(form)) {
      const suf = { te: ["って", "いて", "いで", "して", "んで"], ta: ["った", "いた", "いだ", "した", "んだ"], tara: ["ったら", "いたら", "いだら", "したら", "んだら"] }[form];
      suf.forEach((s) => out.push(b + s));
      out.push(b + ROW[last][1] + { te: "て", ta: "た", tara: "たら" }[form]);
    }
    if (v.group === 1 && ROW_FORMS.has(form)) {
      const c = correct[0];
      const pos = b.length;
      for (const ch of ROW[last]) out.push(c.slice(0, pos) + ch + c.slice(pos + 1));
      if (last === "う") out.push(c.slice(0, pos) + "あ" + c.slice(pos + 1));
    }
    if (v.group === 3) {
      const head = v.kana.slice(0, -2);
      const c = correct[0].slice(head.length);
      const chars = v.kana.endsWith("くる") ? "かきくこ" : "さしすせ";
      for (const ch of chars) out.push(head + ch + c.slice(1));
      if (form === "potential") out.push(head + (v.kana.endsWith("くる") ? "これる" : "しれる"));
    }
    if (form === "causpass") out.push(correct[0].replace(/(さ|させ|せ)られる$|される$/, "せれる"));
    (CONFUSE[form] || []).forEach((f) => out.push(...C.kanaForms(v, f)));
    return uniq(out).filter((k) => k && !correct.includes(k) && k !== v.kana);
  }

  function formQuestion(v, form, level) {
    const correct = C.conjugate(v, form);
    const base = C.dress(v, v.kana).ruby;
    const fname = C.FORM_NAME[form];
    const type = Math.random() < 0.5 ? "input" : "choice";
    const common = {
      id: `G-${form}-${v.kanji}-${type}`, level, gen: true, topic: fname,
      zh: `${v.kanji}（${v.kana}）：${v.meaning}`, explain: C.explainForm(v, form),
    };
    if (type === "input") {
      return { ...common, type, q: `写出「${base}」的${fname}。`, answer: uniq(correct.flatMap((c) => [c.kana, c.kanji])) };
    }
    let wrong = wrongKana(v, form).map((k) => C.dress(v, k).ruby);
    if (wrong.length < 3) {
      const extra = ["masu", "te", "nai", "ta", "dict"].filter((f) => f !== form).flatMap((f) => C.conjugate(v, f).map((x) => x.ruby));
      wrong = uniq([...wrong, ...extra.filter((r) => !correct.some((c) => c.ruby === r))]);
    }
    return makeChoice({ ...common, q: `「${base}」的${fname}是哪一个？` }, correct[0].ruby, wrong);
  }

  function groupQuestion(v, level) {
    const opts = ["一类（五段）", "二类（一段）", "三类（カ变・サ变）"];
    return {
      id: `G-group-${v.kanji}`, level, gen: true, type: "choice", topic: "动词分类",
      q: `「${C.dress(v, v.kana).ruby}」属于哪一类动词？`, options: opts, answer: v.group - 1,
      zh: `${v.kanji}（${v.kana}）：${v.meaning}`, explain: C.explainGroup(v),
    };
  }

  function toDictQuestion(v, level) {
    const masu = C.conjugate(v, "masu")[0];
    const stem = C.kanaForms(v, "masuStem")[0];
    const correct = C.conjugate(v, "dict")[0];
    const type = Math.random() < 0.5 ? "input" : "choice";
    const explain = `${C.explainGroup(v)}\n` + {
      1: `一类动词的ます形是把词尾变成い段；反过来，把ます前的い段假名「${stem.slice(-1)}」变回う段，就是辞书形。`,
      2: "二类动词的ます形是去掉る加ます；反过来，去掉ます加る，就是辞书形。",
      3: "三类动词要直接记：します→する，きます→くる。",
    }[v.group] + `\n辞书形：${correct.ruby}`;
    const common = { id: `G-toDict-${v.kanji}-${type}`, level, gen: true, topic: "ます形→辞书形", zh: `${v.kanji}（${v.kana}）：${v.meaning}`, explain };
    if (type === "input") {
      return { ...common, type, q: `写出「${masu.ruby}」的辞书形。`, answer: uniq([correct.kana, correct.kanji]) };
    }
    const iRow = Object.entries(ROW).find(([, r]) => r[1] === stem.slice(-1));
    const cands = [stem + "る", stem.slice(0, -1) + "る", stem + "う", iRow ? stem.slice(0, -1) + iRow[0] : ""];
    if (v.group === 3) cands.push(stem + "る", "す", "しる", "きる", "こる");
    const wrong = uniq(cands).filter((k) => k && k !== correct.kana).map((k) => C.dress(v, k).ruby);
    return makeChoice({ ...common, q: `「${masu.ruby}」的辞书形是哪一个？` }, correct.ruby, wrong);
  }

  function keigoRuby(word) {
    const r = JP.keigoReading[word];
    return r ? C.dress({ kanji: word, kana: r }, r).ruby : word;
  }
  function baseRuby(k) {
    const v = JP.verbs.map(C.toVerb).find((x) => x.kanji === k[0]);
    return v ? C.dress(v, v.kana).ruby : C.dress({ kanji: k[0], kana: k[1] }, k[1]).ruby;
  }
  function keigoExplain(k) {
    return `「${baseRuby(k)}」的尊敬语：${k[2].map(keigoRuby).join("、") || "无专用词（用「お〜になる」等）"}；` +
      `谦让语：${k[3].map(keigoRuby).join("、") || "无专用词"}。\n` +
      "尊敬语用来抬高对方（上司、客人、长辈）的动作，主语是对方；谦让语用来压低自己或己方的动作，主语是自己。";
  }

  function keigoQuestion(kind, level) {
    const idx = kind === "sonkei" ? 2 : 3;
    const label = kind === "sonkei" ? "尊敬语" : "谦让语";
    const k = U.pick(JP.keigo.filter((x) => x[idx].length));
    const correct = U.pick(k[idx]);
    const own = k[2 + 3 - idx] || [];
    const others = JP.keigo.flatMap((x) => [...x[2], ...x[3]]).filter((w) => !k[idx].includes(w));
    const wrong = uniq([...U.shuffle(own).slice(0, 2), ...U.shuffle(others)]).filter((w) => w !== correct).slice(0, 3);
    return makeChoice({
      id: `G-${kind}-${k[0]}-${correct}`, level, gen: true, topic: label,
      q: `「${baseRuby(k)}」的${label}是哪一个？`, zh: `${k[0]}（${k[1]}）`, explain: keigoExplain(k),
    }, keigoRuby(correct), wrong.map(keigoRuby));
  }

  function keigoReverseQuestion(level) {
    const kindIdx = Math.random() < 0.5 ? 2 : 3;
    const label = kindIdx === 2 ? "尊敬语" : "谦让语";
    const k = U.pick(JP.keigo.filter((x) => x[kindIdx].length));
    const word = U.pick(k[kindIdx]);
    const owners = JP.keigo.filter((x) => x[kindIdx].includes(word));
    const wrong = U.shuffle(JP.keigo.filter((x) => !x[2].includes(word) && !x[3].includes(word))).slice(0, 3);
    return makeChoice({
      id: `G-keigoRev-${word}-${k[0]}`, level, gen: true, topic: label,
      q: `「${keigoRuby(word)}」是哪个动词的${label}？`, zh: `${word}（${JP.keigoReading[word] || word}）`,
      explain: `「${keigoRuby(word)}」是${owners.map(baseRuby).join("、")}的${label}。\n` + owners.map(keigoExplain).join("\n"),
    }, baseRuby(k), wrong.map(baseRuby));
  }

  function oQuestion(kind, level) {
    const list = JP.verbs.map(C.toVerb).filter((v) => JP.oVerbs.includes(v.kanji));
    const v = U.pick(list);
    const stem = C.conjugate(v, "masuStem")[0];
    const dict = C.dress(v, v.kana);
    const tail = kind === "oninaru" ? "になる" : "する";
    const label = kind === "oninaru" ? "尊敬语（お〜になる）" : "谦让语（お〜する）";
    const type = Math.random() < 0.5 ? "input" : "choice";
    const explain = kind === "oninaru"
      ? `「お＋ます形词干＋になる」是尊敬语，用于抬高对方的动作，例如「部長がお${stem.kanji}になる」。\n` +
        `「${stem.ruby}」是「${dict.ruby}」的ます形词干，所以是「お${stem.ruby}になる」。\n` +
        `注意：「お${stem.ruby}になられる」是二重敬语（把尊敬语再变成尊敬语），不规范；「お${stem.ruby}する」是谦让语，方向相反。`
      : `「お＋ます形词干＋する」是谦让语，用于自己为对方做的动作，例如「私がお${stem.kanji}します」。\n` +
        `「${stem.ruby}」是「${dict.ruby}」的ます形词干，所以是「お${stem.ruby}する」。\n` +
        `注意：「お${stem.ruby}になる」是尊敬语，用于对方的动作；「お${stem.ruby}される」把谦让语和尊敬混在一起，是常见的误用。`;
    const common = { id: `G-${kind}-${v.kanji}-${type}`, level, gen: true, topic: kind === "oninaru" ? "お〜になる" : "お〜する", zh: `${v.kanji}（${v.kana}）：${v.meaning}`, explain };
    if (type === "input") {
      return { ...common, type, q: `把「${dict.ruby}」变成${label}。`, answer: [`お${stem.kana}${tail}`, `お${stem.kanji}${tail}`] };
    }
    const wrong = kind === "oninaru"
      ? [`お${stem.ruby}する`, `お${dict.ruby}になる`, `お${stem.ruby}になられる`]
      : [`お${stem.ruby}になる`, `お${dict.ruby}する`, `お${stem.ruby}される`];
    return makeChoice({ ...common, q: `「${dict.ruby}」的${label}是哪一个？` }, `お${stem.ruby}${tail}`, wrong);
  }

  // 自他动词配对里的词不一定在词库中，按规则推断类别（はいる・へる・きる 是五段例外）
  function teOf(kanji, kana) {
    const known = JP.verbs.find((x) => x[0] === kanji);
    const prev = kana.slice(-2, -1);
    const ichidan = kana.endsWith("る") && "いきぎしじちにひびみりえけげせぜてでねへべめれ".includes(prev) &&
      !["はいる", "へる", "きる"].includes(kana);
    const group = known ? known[2] : ichidan ? 2 : 1;
    return C.conjugate({ kanji, kana, group }, "te")[0].kanji;
  }

  function transQuestion(level) {
    const p = U.pick(JP.transPairs);
    const toTrans = Math.random() < 0.5;
    const r = (k, kana) => C.dress({ kanji: k, kana }, kana).ruby;
    const from = toTrans ? r(p[0], p[1]) : r(p[2], p[3]);
    const correct = toTrans ? r(p[2], p[3]) : r(p[0], p[1]);
    const ending = (toTrans ? p[3] : p[1]).slice(-2);
    const others = JP.transPairs.filter((x) => x !== p).map((x) => (toTrans ? [x[2], x[3]] : [x[0], x[1]]));
    const similar = U.shuffle(others.filter((x) => x[1].endsWith(ending)));
    const wrong = uniq([...similar, ...U.shuffle(others)].map((x) => r(x[0], x[1]))).filter((w) => w !== correct);
    return makeChoice({
      id: `G-trans-${p[0]}-${toTrans ? "t" : "i"}`, level, gen: true, type: "choice", topic: "自他动词",
      q: toTrans ? `「${from}」（自动词：${p[4]}）对应的他动词是？` : `「${from}」（他动词：${p[5]}）对应的自动词是？`,
      zh: `${p[0]}：${p[4]}　／　${p[2]}：${p[5]}`,
      explain: `自动词「${r(p[0], p[1])}」表示「${p[4]}」，主语是事物本身，用「〜が${p[0]}」；` +
        `他动词「${r(p[2], p[3])}」表示「${p[5]}」，有人对事物施加动作，用「〜を${p[2]}」。\n` +
        `自动词＋ている表示状态（〜が${teOf(p[0], p[1])}いる）；` +
        `他动词＋てある表示有人有意做了之后留下的状态（〜が${teOf(p[2], p[3])}ある）。`,
    }, correct, wrong);
  }

  function makeOne(level) {
    const kind = U.pick(LEVEL_KINDS[level].kinds);
    if (kind === "sonkei" || kind === "kenjou") return keigoQuestion(kind, level);
    if (kind === "keigoReverse") return keigoReverseQuestion(level);
    if (kind === "oninaru" || kind === "osuru") return oQuestion(kind, level);
    if (kind === "trans") return transQuestion(level);
    const v = U.pick(pool(level));
    if (kind === "group") return groupQuestion(v, level);
    if (kind === "toDict") return toDictQuestion(v, level);
    return formQuestion(v, kind, level);
  }

  function generate(level, n) {
    const out = [];
    const ids = new Set();
    for (let tries = 0; out.length < n && tries < n * 30; tries++) {
      const q = makeOne(level);
      if (!ids.has(q.id) && (q.type !== "choice" || q.options.length >= 3)) {
        ids.add(q.id);
        out.push(q);
      }
    }
    return out;
  }

  JP.drill = { generate };
})();
