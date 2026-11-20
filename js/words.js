// 单词模块的公共部分：主题、词性、查找、朗读。
(function () {
  const U = JP.util;

  const TOPICS = [
    ["greet", "寒暄·常用语"], ["people", "人物·家人"], ["body", "身体·健康"], ["time", "时间·日期"], ["number", "数字·数量"],
    ["food", "饮食"], ["home", "住所·家居"], ["town", "城市·场所"], ["transport", "交通·出行"], ["school", "学校·工作"],
    ["shop", "购物·金钱"], ["clothes", "衣物·随身物品"], ["nature", "自然·天气·动植物"], ["hobby", "娱乐·爱好"],
    ["place", "方位·指示"], ["question", "疑问词"], ["action", "动作·行为"], ["state", "性质·状态"], ["func", "副词·接续词·其他"],
  ];
  const POS = [
    ["noun", "名词"], ["pron", "代词"], ["verb1", "动词·一类"], ["verb2", "动词·二类"], ["verb3", "动词·三类"],
    ["iadj", "イ形容词"], ["naadj", "ナ形容词"], ["adv", "副词"], ["rentai", "连体词"], ["conj", "接续词"],
    ["num", "数词·量词"], ["affix", "接头·接尾词"], ["expr", "寒暄·惯用语"], ["interj", "感叹词"],
  ];
  const CERT = {
    确定: ["构词明确", "ok"],
    通说: ["常见说法", "info"],
    有争议: ["语源有争议", "warn"],
  };

  const isKanji = (ch) => /[\u4e00-\u9fff]/.test(ch);
  // 去掉注音和 <b> 等标记的纯文本
  const plain = (s) => U.plain(String(s).replace(/<[^>]+>/g, ""));
  const byId = (id) => JP.words.find((w) => w.id === id);
  const kanjiOf = (w) => [...new Set([...plain(w.w)].filter(isKanji))];
  const level = (w) => ({ N5: 1, N4: 3, N3: 4, N2: 5, N1: 5 }[w.jlpt] || 1);
  // 中文释义拆成义项，用于判断两个词的意思是否重叠
  const senses = (w) => w.zh.split(/[、，,；;／/（）()]/).map((x) => x.trim()).filter(Boolean);
  const overlap = (a, b) => a.zh === b.zh || senses(a).some((x) => senses(b).includes(x));

  // 浏览器自带的日语语音合成；没有日语语音时返回 false
  let voice = null;
  const pickVoice = () => {
    if (!("speechSynthesis" in window)) return null;
    const vs = speechSynthesis.getVoices().filter((v) => /^ja/i.test(v.lang));
    return vs.find((v) => /google|kyoko|o-ren|haruka|nanami/i.test(v.name)) || vs[0] || null;
  };
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => (voice = pickVoice());
  function speak(text) {
    if (!("speechSynthesis" in window)) return false;
    voice = voice || pickVoice();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plain(text));
    u.lang = "ja-JP";
    if (voice) u.voice = voice;
    u.rate = 0.9;
    speechSynthesis.speak(u);
    return !!voice || speechSynthesis.getVoices().length === 0;
  }

  // 朗读按钮的图标（不用 emoji，各系统显示大小不一致）
  const SPK_ICON = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/></svg>';

  JP.wordKit = {
    SPK_ICON,
    TOPICS, POS, CERT,
    topicName: (k) => (TOPICS.find((t) => t[0] === k) || [, k])[1],
    posName: (k) => (POS.find((t) => t[0] === k) || [, k])[1],
    plain, byId, kanjiOf, level, senses, overlap, isKanji, speak,
  };
})();
