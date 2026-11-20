// 动词变形引擎：根据动词类别生成各种变形，并给出中文变形说明。
(function () {
  // 五段动词词尾 → [あ段, い段, え段, お段]
  const ROW = {
    う: ["わ", "い", "え", "お"], く: ["か", "き", "け", "こ"], ぐ: ["が", "ぎ", "げ", "ご"],
    す: ["さ", "し", "せ", "そ"], つ: ["た", "ち", "て", "と"], ぬ: ["な", "に", "ね", "の"],
    ぶ: ["ば", "び", "べ", "ぼ"], む: ["ま", "み", "め", "も"], る: ["ら", "り", "れ", "ろ"],
  };
  const TE = { う: "って", つ: "って", る: "って", く: "いて", ぐ: "いで", す: "して", ぬ: "んで", ぶ: "んで", む: "んで" };
  const TE_NAME = {
    う: "促音便", つ: "促音便", る: "促音便", く: "イ音便", ぐ: "イ音便",
    す: "す→して（不发生音便）", ぬ: "拨音便", ぶ: "拨音便", む: "拨音便",
  };
  const I_DAN = "いきぎしじちぢにひびぴみり";
  const E_DAN = "えけげせぜてでねへべぺめれ";

  const FORMS = [
    { key: "dict", name: "辞书形" },
    { key: "masu", name: "ます形" },
    { key: "masen", name: "ます形否定（ません）" },
    { key: "mashita", name: "ます形过去（ました）" },
    { key: "masendeshita", name: "ます形过去否定（ませんでした）" },
    { key: "mashou", name: "ましょう形" },
    { key: "masuStem", name: "ます形词干" },
    { key: "te", name: "て形" },
    { key: "ta", name: "た形" },
    { key: "nai", name: "ない形" },
    { key: "nakatta", name: "ない形过去（なかった）" },
    { key: "potential", name: "可能形" },
    { key: "volitional", name: "意志形" },
    { key: "ba", name: "假定形（ば）" },
    { key: "tara", name: "たら形" },
    { key: "imperative", name: "命令形" },
    { key: "prohibitive", name: "禁止形" },
    { key: "passive", name: "被动形" },
    { key: "causative", name: "使役形" },
    { key: "causpass", name: "使役被动形" },
  ];
  const FORM_NAME = Object.fromEntries(FORMS.map((f) => [f.key, f.name]));

  // 非意志动词：不适合练可能/意志/命令/被动/使役
  const NONVOL = new Set(("ある 要る できる 分かる 見える 違う 困る 足りる 咲く 降る 晴れる 曇る 乾く 込む 沸く 散る 間に合う " +
    "生まれる 消える 疲れる 冷える 焼ける 折れる 切れる 割れる 壊れる 汚れる 落ちる 治る 届く 始まる 終わる 閉まる " +
    "止まる 決まる 上がる 下がる 続く 見つかる 助かる 減る 増える 変わる 残る 鳴く 過ぎる 慣れる 焦る 限る").split(" "));

  function toVerb(v) {
    return Array.isArray(v) ? { kanji: v[0], kana: v[1], group: v[2], meaning: v[3], jlpt: v[4] } : v;
  }
  function irregularType(v) {
    if (v.group !== 3) return null;
    return v.kana.endsWith("くる") ? "kuru" : "suru";
  }
  function isIku(v) {
    return v.group === 1 && (v.kanji.endsWith("行く") || v.kana.endsWith("いく") && v.kanji === v.kana);
  }

  const SURU = {
    dict: ["する"], masu: ["します"], masen: ["しません"], mashita: ["しました"], masendeshita: ["しませんでした"],
    mashou: ["しましょう"], masuStem: ["し"], te: ["して"], ta: ["した"], nai: ["しない"], nakatta: ["しなかった"],
    potential: ["できる"], volitional: ["しよう"], ba: ["すれば"], tara: ["したら"], imperative: ["しろ", "せよ"],
    prohibitive: ["するな"], passive: ["される"], causative: ["させる"], causpass: ["させられる"],
  };
  const KURU = {
    dict: ["くる"], masu: ["きます"], masen: ["きません"], mashita: ["きました"], masendeshita: ["きませんでした"],
    mashou: ["きましょう"], masuStem: ["き"], te: ["きて"], ta: ["きた"], nai: ["こない"], nakatta: ["こなかった"],
    potential: ["こられる"], volitional: ["こよう"], ba: ["くれば"], tara: ["きたら"], imperative: ["こい"],
    prohibitive: ["くるな"], passive: ["こられる"], causative: ["こさせる"], causpass: ["こさせられる"],
  };

  // 只返回读音（平假名）。第一个是标准答案，其余为同样正确的写法。
  function kanaForms(v, form, groupOverride) {
    const group = groupOverride || v.group;
    const kana = v.kana;
    if (group === 3) {
      const type = irregularType(v);
      const head = kana.slice(0, -2);
      return (type === "kuru" ? KURU : SURU)[form].map((x) => head + x);
    }
    if (group === 2) {
      const s = kana.slice(0, -1);
      const t = {
        dict: [kana], masu: [s + "ます"], masen: [s + "ません"], mashita: [s + "ました"],
        masendeshita: [s + "ませんでした"], mashou: [s + "ましょう"], masuStem: [s], te: [s + "て"], ta: [s + "た"],
        nai: [s + "ない"], nakatta: [s + "なかった"], potential: [s + "られる"], volitional: [s + "よう"],
        ba: [s + "れば"], tara: [s + "たら"], imperative: kana === "くれる" ? ["くれ"] : [s + "ろ", s + "よ"],
        prohibitive: [kana + "な"], passive: [s + "られる"], causative: [s + "させる"], causpass: [s + "させられる"],
      };
      return t[form];
    }
    const last = kana.slice(-1);
    const b = kana.slice(0, -1);
    const [a, i, e, o] = ROW[last] || ROW["る"];
    const te = b + (isIku(v) && !groupOverride ? "って" : TE[last] || "って");
    const ta = te.replace(/て$/, "た").replace(/で$/, "だ");
    const aru = kana === "ある" && !groupOverride;
    const t = {
      dict: [kana], masu: [b + i + "ます"], masen: [b + i + "ません"], mashita: [b + i + "ました"],
      masendeshita: [b + i + "ませんでした"], mashou: [b + i + "ましょう"], masuStem: [b + i], te: [te], ta: [ta],
      nai: [aru ? "ない" : b + a + "ない"], nakatta: [aru ? "なかった" : b + a + "なかった"],
      potential: [b + e + "る"], volitional: [b + o + "う"], ba: [b + e + "ば"], tara: [ta + "ら"],
      imperative: [b + e], prohibitive: [kana + "な"], passive: [b + a + "れる"], causative: [b + a + "せる"],
      causpass: last === "す" ? [b + "させられる"] : [b + a + "される", b + a + "せられる"],
    };
    return t[form];
  }

  // 拆出“汉字部分 / 对应读音”，用于把读音形式还原成汉字写法与注音
  function headOf(v) {
    const K = v.kanji, R = v.kana;
    let s = 0;
    while (s < K.length && s < R.length && K[K.length - 1 - s] === R[R.length - 1 - s]) s++;
    return { kHead: K.slice(0, K.length - s), rHead: R.slice(0, R.length - s) };
  }
  function dress(v, kana) {
    if (v.kanji === "来る") {
      return { kana, kanji: "来" + kana.slice(1), ruby: `{来|${kana[0]}}${kana.slice(1)}` };
    }
    const { kHead, rHead } = headOf(v);
    if (!kHead || !kana.startsWith(rHead)) return { kana, kanji: kana, ruby: kana };
    const rest = kana.slice(rHead.length);
    return { kana, kanji: kHead + rest, ruby: `{${kHead}|${rHead}}${rest}` };
  }

  function conjugate(verb, form, groupOverride) {
    const v = toVerb(verb);
    return kanaForms(v, form, groupOverride).map((k) => dress(v, k));
  }

  function groupName(g) {
    return { 1: "一类动词（五段）", 2: "二类动词（一段）", 3: "三类动词（不规则：カ变・サ变）" }[g];
  }

  // 解释为什么属于这个类别
  function explainGroup(verb) {
    const v = toVerb(verb);
    const r = dress(v, v.kana).ruby;
    if (v.group === 3) {
      if (irregularType(v) === "kuru") return `「${r}」含「来る（くる）」，属于三类动词（カ变），变形不规则，需要单独记。`;
      if (v.kana === "する") return "「する」是三类动词（サ变），变形不规则，需要单独记。";
      return `「${r}」是「名词＋する」，属于三类动词（サ变），变形和「する」完全一样。`;
    }
    const last = v.kana.slice(-1);
    const prev = v.kana.slice(-2, -1);
    if (v.group === 2) {
      const dan = I_DAN.includes(prev) ? "い段" : "え段";
      return `「${r}」以「る」结尾，且「る」前面的「${prev}」是${dan}假名，属于二类动词（一段）。`;
    }
    if (last !== "る") return `「${r}」的词尾是「${last}」，不是「る」，所以一定是一类动词（五段）。`;
    if (I_DAN.includes(prev) || E_DAN.includes(prev)) {
      return `「${r}」以「る」结尾，且「る」前的「${prev}」在${I_DAN.includes(prev) ? "い" : "え"}段，看起来像二类，` +
        `但它是【例外的一类动词（五段）】，需要单独记住（同类的还有：帰る、入る、走る、知る、切る、要る、減る、喋る、滑る、蹴る、焦る、限る、散る 等）。`;
    }
    return `「${r}」以「る」结尾，但「る」前面的「${prev}」是あ/う/お段假名，所以是一类动词（五段）。`;
  }

  // 讲解某个变形是怎么得到的
  function explainForm(verb, form) {
    const v = toVerb(verb);
    const r = dress(v, v.kana).ruby;
    const ans = conjugate(v, form).map((x) => x.ruby).join(" / ");
    const fname = FORM_NAME[form];
    const head = `「${r}」是${groupName(v.group)}。`;
    let rule = "";
    if (v.group === 3) {
      const tbl = irregularType(v) === "kuru" ? KURU : SURU;
      rule = `三类动词不按规律变化，要直接记：${irregularType(v) === "kuru" ? "来る" : "する"}的${fname}是「${tbl[form].join(" / ")}」。` +
        (irregularType(v) === "kuru" ? "注意「来」的读音会在き・く・こ之间变化。" : "") +
        (v.kana !== "する" && irregularType(v) === "suru" ? "「名词＋する」只需把「する」部分照样变形。" : "");
    } else if (v.group === 2) {
      const s = v.kana.slice(0, -1);
      const add = {
        dict: "（辞书形就是原形）", masu: "ます", masen: "ません", mashita: "ました", masendeshita: "ませんでした",
        mashou: "ましょう", masuStem: "（什么都不加）", te: "て", ta: "た", nai: "ない", nakatta: "なかった",
        potential: "られる", volitional: "よう", ba: "れば", tara: "たら", imperative: "ろ（书面语也可用「よ」）",
        prohibitive: "", passive: "られる", causative: "させる", causpass: "させられる",
      }[form];
      rule = form === "prohibitive"
        ? "禁止形＝辞书形＋「な」。"
        : `二类动词去掉词尾「る」，得到词干「${s}」，再加「${add}」。` +
          (form === "potential" ? "注意：二类动词的可能形和被动形同形，口语里常见的「ら抜き」（如「食べれる」）在考试中不算标准形式。" : "") +
          (form === "imperative" && v.kana === "くれる" ? "（くれる是例外，命令形为「くれ」）" : "");
    } else {
      const last = v.kana.slice(-1);
      const [a, i, e, o] = ROW[last];
      const map = {
        dict: "辞书形就是原形。",
        masu: `把词尾「${last}」变成い段的「${i}」，再加「ます」。`,
        masen: `把词尾「${last}」变成い段的「${i}」，再加「ません」。`,
        mashita: `把词尾「${last}」变成い段的「${i}」，再加「ました」。`,
        masendeshita: `把词尾「${last}」变成い段的「${i}」，再加「ませんでした」。`,
        mashou: `把词尾「${last}」变成い段的「${i}」，再加「ましょう」。`,
        masuStem: `把词尾「${last}」变成い段的「${i}」就是ます形词干。`,
        te: isIku(v)
          ? "「行く」是唯一的例外：虽然以「く」结尾，て形却是「行って」（促音便），不是「行いて」。"
          : `词尾「${last}」→「${TE[last]}」（${TE_NAME[last]}）。口诀：う・つ・る→って；ぬ・ぶ・む→んで；く→いて；ぐ→いで；す→して。`,
        ta: isIku(v)
          ? "「行く」是例外：た形是「行った」。"
          : `た形的规则与て形完全相同，只是把「て/で」换成「た/だ」：词尾「${last}」→「${TE[last].replace("て", "た").replace("で", "だ")}」。`,
        nai: v.kana === "ある"
          ? "「ある」是例外：ない形不是「あらない」，而是直接用「ない」。"
          : `把词尾「${last}」变成あ段的「${a}」，再加「ない」。` + (last === "う" ? "注意：「う」结尾变成「わ」，不是「あ」。" : ""),
        nakatta: v.kana === "ある"
          ? "「ある」是例外：过去否定是「なかった」。"
          : `先变成ない形（词尾→あ段「${a}」＋ない），再把「ない」变成「なかった」。` + (last === "う" ? "「う」结尾变成「わ」。" : ""),
        potential: `把词尾「${last}」变成え段的「${e}」，再加「る」。变形后是二类动词。`,
        volitional: `把词尾「${last}」变成お段的「${o}」，再加「う」。`,
        ba: `把词尾「${last}」变成え段的「${e}」，再加「ば」。`,
        tara: "たら形＝た形＋「ら」。",
        imperative: `把词尾「${last}」变成え段的「${e}」。命令形语气很强，多用于口号、标识或男性口语。`,
        prohibitive: "禁止形＝辞书形＋「な」。",
        passive: `把词尾「${last}」变成あ段的「${a}」，再加「れる」。` + (last === "う" ? "「う」结尾变成「わ」。" : ""),
        causative: `把词尾「${last}」变成あ段的「${a}」，再加「せる」。` + (last === "う" ? "「う」结尾变成「わ」。" : ""),
        causpass: last === "す"
          ? "使役形「〜させる」再变被动「〜させられる」。以「す」结尾的五段动词不能用缩略形（不能说「〜さされる」）。"
          : `标准形：使役形「${a}せる」→被动「${a}せられる」；五段动词常用缩略形「${a}される」。两种都正确。`,
      };
      rule = map[form];
    }
    return `${head}${rule}\n${fname}：${ans}`;
  }

  JP.conj = { FORMS, FORM_NAME, NONVOL, toVerb, conjugate, dress, explainGroup, explainForm, groupName, kanaForms };
})();
