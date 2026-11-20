// 助词自动出题：
//  ·「搭配题」从动词—助词固定搭配表中抽题（只覆盖入门~进阶）；
//  ·「辨析题」从用法总表的例句中抽题，问句中助词属于哪种用法（覆盖全部难度）。
(function () {
  const U = JP.util;
  const POOL = ["に", "で", "を", "が", "と", "へ", "から"];
  const JLPT_LEVEL = { N5: 1, N4: 3, N3: 4, N2: 5, N1: 5 };

  function collocQuestion(level, c) {
    const [noun, particle, verb, zh, ruleKey, alt] = c;
    const rule = JP.collocRules[ruleKey];
    const type = Math.random() < 0.5 ? "input" : "choice";
    const altNote = alt.length ? `（这里用「${alt.join("」「")}」也正确）` : "";
    const base = {
      id: `PG-${U.plain(noun)}-${U.plain(verb)}-${type}`, level, subject: "particle", gen: true, genLabel: "搭配题",
      topic: rule.name, q: `（${zh}）${noun}＿＿＿${verb}`, zh,
      explain: `${rule.explain}\n正确搭配：${noun}${particle}${verb}${altNote}`,
    };
    if (type === "input") return { ...base, type, answer: [particle, ...alt] };
    const wrong = U.shuffle(POOL.filter((p) => p !== particle && !alt.includes(p))).slice(0, 3);
    const options = U.shuffle([particle, ...wrong]);
    return { ...base, type, options, answer: options.indexOf(particle) };
  }

  // 例句中 <b>…</b> 标出的助词改成【…】，因为题干会被转义显示
  const mark = (ja) => ja.replace(/<b>(.*?)<\/b>/g, "【$1】");

  const conflict = (p, a, b) => JP.usageConflicts.some(([cp, x, y]) => cp === p && ((x === a && y === b) || (x === b && y === a)));

  // 选项不足 3 个（互斥对排除后）时返回 null
  function usageQuestion(level, entry, usage, exIdx) {
    const [ja, zh] = usage.ex[exIdx];
    const others = U.shuffle(entry.usages.filter((u) => u !== usage && !conflict(entry.p, u.name, usage.name))).slice(0, 3).map((u) => u.name);
    if (others.length < 2) return null;
    const options = U.shuffle([usage.name, ...others]);
    return {
      id: `UG-${entry.p}-${usage.name}-${exIdx}`, level, subject: "particle", gen: true, genLabel: "辨析题", type: "choice",
      topic: `${entry.p}（用法辨析）`, q: `下面句子中的「${entry.p}」是哪种用法？\n${mark(ja)}`, options,
      answer: options.indexOf(usage.name), zh,
      explain: `这里的「${entry.p}」是「${usage.name}」（${usage.kind}，${usage.jlpt}）。\n接续：${usage.conn}\n${usage.desc}` +
        (entry.tips.length ? `\n${entry.tips.map((t) => t.replace(/<\/?b>/g, "")).join("\n")}` : ""),
    };
  }

  // 辨析题需要同一助词至少有 3 种用法才能组成选项
  function usagePool(level, particle) {
    return JP.particleUsages
      .filter((e) => e.usages.length >= 3 && (!particle || e.p === particle))
      .flatMap((e) => e.usages.filter((u) => particle || JLPT_LEVEL[u.jlpt] <= level).map((u) => [e, u]));
  }

  function generate(level, n) {
    const colloc = level <= 3 ? JP.collocations.filter((c) => JP.collocRules[c[4]].level <= level) : [];
    const usages = usagePool(level);
    const out = [];
    for (let i = 0; i < n; i++) {
      const useColloc = colloc.length && (!usages.length || Math.random() < 0.5);
      if (useColloc) out.push(collocQuestion(level, U.pick(colloc)));
      else {
        for (let t = 0; t < 10; t++) {
          const [e, u] = U.pick(usages);
          const q = usageQuestion(level, e, u, Math.floor(Math.random() * u.ex.length));
          if (q) { out.push(q); break; }
        }
      }
    }
    return out;
  }

  // 某个助词的全部用法辨析题（用法总表页的“练习”按钮用）
  function forParticle(p) {
    const pool = usagePool(5, p);
    return U.shuffle(pool.flatMap(([e, u]) => u.ex.map((_, i) => usageQuestion(JLPT_LEVEL[u.jlpt], e, u, i))).filter(Boolean));
  }

  JP.pdrill = { generate, forParticle };
})();
