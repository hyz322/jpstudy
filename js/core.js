// 全局命名空间与通用工具。页面以 file:// 打开，所以不用 ES module，全部挂在 window.JP 上。
window.JP = {
  questions: [],
  addQuestions(list) {
    this.questions.push(...list);
  },
  LEVELS: [
    { level: 1, name: "入门", jlpt: "N5" },
    { level: 2, name: "基础", jlpt: "N5~N4" },
    { level: 3, name: "进阶", jlpt: "N4" },
    { level: 4, name: "中级", jlpt: "N3" },
    { level: 5, name: "高级", jlpt: "N2~N1" },
  ],
  TYPE_NAMES: { choice: "选择", input: "填空", order: "排序" },
  RUBY_HTML: '<span class="rb">$1<span class="rt">$2</span></span>',
};

JP.util = {
  escape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
  // {漢字|かな} → 注音（假名悬浮在汉字上方，不撑开汉字宽度），其余文本转义；\n → <br>
  ruby(s) {
    return JP.util
      .escape(s)
      .replace(/\{([^{}|]+)\|([^{}|]+)\}/g, JP.RUBY_HTML)
      .replace(/\n/g, "<br>");
  },
  // 去掉注音标记，只保留汉字
  plain(s) {
    return String(s).replace(/\{([^{}|]+)\|([^{}|]+)\}/g, "$1");
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  levelName(level) {
    const l = JP.LEVELS.find((x) => x.level === level);
    return l ? `${l.name}（${l.jlpt}）` : "";
  },
};
