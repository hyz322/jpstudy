// 罗马音 → 平假名 实时转换，以及答案比对时的归一化。
(function () {
  const T = {};
  const add = (romaji, kana) => romaji.split(" ").forEach((r) => (T[r] = kana));
  const V = ["a", "i", "u", "e", "o"];
  const rows = {
    "": "あいうえお", k: "かきくけこ", s: "さしすせそ", t: "たちつてと", n: "なにぬねの", h: "はひふへほ",
    m: "まみむめも", r: "らりるれろ", g: "がぎぐげご", z: "ざじずぜぞ", d: "だぢづでど", b: "ばびぶべぼ", p: "ぱぴぷぺぽ",
  };
  for (const [c, ks] of Object.entries(rows)) V.forEach((v, i) => add(c + v, ks[i]));
  add("ya", "や"); add("yu", "ゆ"); add("yo", "よ"); add("yi", "い"); add("ye", "いぇ");
  add("wa", "わ"); add("wi", "うぃ"); add("wu", "う"); add("we", "うぇ"); add("wo", "を");
  add("shi", "し"); add("chi", "ち"); add("tsu", "つ"); add("fu", "ふ"); add("ji", "じ");
  add("si", "し"); add("ti", "ち"); add("tu", "つ"); add("hu", "ふ"); add("zi", "じ"); add("di", "ぢ"); add("du", "づ");
  const youon = { ky: "き", gy: "ぎ", sy: "し", sh: "し", zy: "じ", j: "じ", jy: "じ", ty: "ち", ch: "ち", cy: "ち", dy: "ぢ",
    ny: "に", hy: "ひ", by: "び", py: "ぴ", my: "み", ry: "り" };
  for (const [c, k] of Object.entries(youon)) {
    add(c + "a", k + "ゃ"); add(c + "u", k + "ゅ"); add(c + "o", k + "ょ");
    if (["sh", "j", "ch"].includes(c)) add(c + "e", k + "ぇ");
  }
  add("fa", "ふぁ"); add("fi", "ふぃ"); add("fe", "ふぇ"); add("fo", "ふぉ");
  add("thi", "てぃ"); add("dhi", "でぃ"); add("twu", "とぅ"); add("va", "ゔぁ"); add("vi", "ゔぃ"); add("vu", "ゔ");
  add("ve", "ゔぇ"); add("vo", "ゔぉ");
  const small = { a: "ぁ", i: "ぃ", u: "ぅ", e: "ぇ", o: "ぉ", ya: "ゃ", yu: "ゅ", yo: "ょ", tu: "っ", tsu: "っ", wa: "ゎ" };
  for (const [r, k] of Object.entries(small)) { add("x" + r, k); add("l" + r, k); }
  add("nn", "ん"); add("n'", "ん"); add("-", "ー");

  const KEYS = Object.keys(T);
  const isPrefix = (s) => KEYS.some((k) => k.startsWith(s));

  // final=false 时，末尾尚未完成的罗马音（如 "k"、"ky"、"n"）原样保留，等待后续输入
  function toKana(input, final) {
    const s = input.toLowerCase();
    let out = "";
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (!/[a-z'\-]/.test(c)) { out += input[i]; i++; continue; }
      const next = s[i + 1];
      if (c === "n") {
        if (next === undefined) { out += final ? "ん" : "n"; i++; continue; }
        if (next === "n" || next === "'") { out += "ん"; i += 2; continue; }
        if (!"aiueoy".includes(next)) { out += "ん"; i++; continue; }
      }
      if (c === next && /[bcdfghjkmpqrstvwxyz]/.test(c)) { out += "っ"; i++; continue; }
      let hit = false;
      for (let len = 4; len >= 1; len--) {
        const sub = s.substr(i, len);
        if (sub.length === len && T[sub]) { out += T[sub]; i += len; hit = true; break; }
      }
      if (hit) continue;
      const rest = s.slice(i);
      if (!final && isPrefix(rest)) { out += rest; break; }
      out += input[i];
      i++;
    }
    return out;
  }

  // 比对答案前的归一化：全半角统一、片假名转平假名、去掉空白和标点
  function normalize(s) {
    return String(s)
      .normalize("NFKC")
      .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
      .replace(/[\s　、。,.．，！!？?「」]/g, "")
      .toLowerCase();
  }

  // 给输入框挂上实时转换（中文/日文输入法组字期间不干预）
  function attach(el) {
    el.addEventListener("input", (e) => {
      if (e.isComposing || !JP.store.settings().romaji) return;
      if (el.selectionStart !== el.value.length) return;
      const v = toKana(el.value, false);
      if (v !== el.value) el.value = v;
    });
  }
  function finalize(el) {
    if (JP.store.settings().romaji) el.value = toKana(el.value, true);
    return el.value;
  }

  // 假名 → 罗马音（赫本式，长音按字母重复写，如 コーヒー → koohii）
  const R1 = {};
  const H = "あいうえお かきくけこ さしすせそ たちつてと なにぬねの はひふへほ まみむめも らりるれろ がぎぐげご ざじずぜぞ だぢづでど ばびぶべぼ ぱぴぷぺぽ".split(" ");
  const ROM = "a i u e o|ka ki ku ke ko|sa shi su se so|ta chi tsu te to|na ni nu ne no|ha hi fu he ho|ma mi mu me mo|ra ri ru re ro|ga gi gu ge go|za ji zu ze zo|da ji zu de do|ba bi bu be bo|pa pi pu pe po".split("|");
  H.forEach((row, i) => [...row].forEach((k, j) => (R1[k] = ROM[i].split(" ")[j])));
  Object.assign(R1, { や: "ya", ゆ: "yu", よ: "yo", わ: "wa", を: "o", ん: "n", ゔ: "vu", ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o", ゃ: "ya", ゅ: "yu", ょ: "yo", ゎ: "wa" });
  const R2 = { しゃ: "sha", しゅ: "shu", しぇ: "she", しょ: "sho", じゃ: "ja", じゅ: "ju", じぇ: "je", じょ: "jo", ちゃ: "cha", ちゅ: "chu", ちぇ: "che", ちょ: "cho",
    ぢゃ: "ja", ぢゅ: "ju", ぢょ: "jo", ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo", てぃ: "ti", でぃ: "di", とぅ: "tu", どぅ: "du", うぃ: "wi", うぇ: "we", うぉ: "wo",
    ゔぁ: "va", ゔぃ: "vi", ゔぇ: "ve", ゔぉ: "vo", いぇ: "ye" };
  "きぎにひびぴみり".split("").forEach((k) => {
    const c = R1[k].slice(0, -1);
    R2[k + "ゃ"] = c + "ya"; R2[k + "ゅ"] = c + "yu"; R2[k + "ょ"] = c + "yo";
  });
  function toRomaji(kana) {
    const s = String(kana).replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    let out = "", sokuon = false;
    for (let i = 0; i < s.length; i++) {
      const two = R2[s.slice(i, i + 2)];
      let r = two || R1[s[i]];
      if (two) i++;
      if (s[i] === "っ" && !two) { sokuon = true; continue; }
      if (s[i] === "ー") { const v = out.match(/[aiueo]$/); out += v ? v[0] : ""; continue; }
      if (r === undefined) { out += s[i]; sokuon = false; continue; }
      if (sokuon) { out += r.startsWith("ch") ? "t" : r[0]; sokuon = false; }
      if (out.endsWith("n") && s[i - (two ? 2 : 1)] === "ん" && /^[aiueoy]/.test(r)) out += "'";
      out += r;
    }
    return out;
  }

  JP.kana = { toKana, normalize, attach, finalize, toRomaji };
})();
