#!/usr/bin/env python3
"""校验单词数据（js/data/words_*.js）和汉字表（js/data/kanji*.js）。
用法：python3 tools/validate_words.py [--need-rd]（--need-rd：非外来语的词缺少读音记法 rd 时报错）"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "js" / "data"
APP = (ROOT / "js" / "words.js").read_text(encoding="utf-8")
TOPICS = re.findall(r'\["(\w+)", "[^"]+"\]', APP.split("const POS")[0])
POS = re.findall(r'\["(\w+)", "[^"]+"\]', APP.split("const POS")[1].split("const CERT")[0])
CERTS = {"确定", "通说", "有争议"}
RD_TYPES = {"语源", "拆词", "音读规律", "谐音", "联想"}
RUBY = re.compile(r"\{([^{}|]+)\|([^{}|]+)\}")
KANJI = re.compile(r"[一-鿿々]")
KANA = re.compile(r"^[ぁ-ゖァ-ヺー]+$")


def load(path, func):
    text = path.read_text(encoding="utf-8")
    m = re.search(func + r"\((.*)\)\s*;\s*$", text, re.S)
    body = m.group(1)
    if func == "JP.addWords":
        body = re.sub(r',\s*"N\d"\s*$', "", body.strip())
    return json.loads(body)


def bare_kanji(s):
    """去掉注音标记和 HTML 后，注音之外是否还有汉字"""
    return KANJI.findall(RUBY.sub("", re.sub(r"<[^>]+>", "", s)))


def main():
    errors = []
    kanji = {}
    for f in sorted(DATA.glob("kanji*.js")):
        for k, v in load(f, "JP.addKanji").items():
            if k in kanji and kanji[k] != v:
                errors.append(f"{f.name}: 汉字「{k}」与其他汉字文件中的条目不一致")
            kanji[k] = v
    words = []
    for f in sorted(DATA.glob("words_*.js")):
        for w in load(f, "JP.addWords"):
            words.append((f.name, w))
    ids = set()
    seen = {}
    for fname, w in words:
        wid = w.get("id", "?")
        err = lambda msg: errors.append(f"{fname} {wid}: {msg}")
        for k in ("id", "w", "kana", "pos", "topic", "zh", "ex", "mn"):
            if not w.get(k):
                err(f"缺少字段 {k}")
        if wid in ids:
            err("id 重复")
        ids.add(wid)
        key = (w.get("w"), w.get("kana"))
        if key in seen:
            err(f"与 {seen[key]} 是同一个词")
        seen[key] = wid
        if w.get("pos") not in POS:
            err(f"词性 {w.get('pos')} 不在列表中")
        if w.get("topic") not in TOPICS:
            err(f"主题 {w.get('topic')} 不在列表中")
        if not KANA.match(w.get("kana", "")):
            err("kana 必须全是假名")
        reading = RUBY.sub(r"\2", w.get("w", ""))
        if reading != w.get("kana"):
            err(f"w 的读音「{reading}」与 kana「{w.get('kana')}」不一致")
        if bare_kanji(w.get("w", "")):
            err("w 中有汉字没有注音")
        for ch in re.findall(r"[\u4e00-\u9fff]", RUBY.sub(r"\1", w.get("w", ""))):
            if ch not in kanji:
                err(f"汉字表缺少「{ch}」")
        exs = w.get("ex", [])
        if len(exs) != 2:
            err(f"例句应为 2 句，现在是 {len(exs)} 句")
        for ja, zh in exs:
            if bare_kanji(ja):
                err(f"例句有汉字没有注音：{ja}")
            if ja.count("<b>") != 1 or ja.count("</b>") != 1:
                err(f"例句必须用 <b> 标出目标词且只标一处：{ja}")
            if not zh:
                err(f"例句缺少翻译：{ja}")
        mn = w.get("mn", [])
        if sum(1 for m in mn if m.get("best")) != 1:
            err("联想记忆必须恰好有一条 best")
        for m in mn:
            if not m.get("type") or not m.get("text"):
                err("联想记忆缺少 type 或 text")
        rd = w.get("rd")
        if rd is not None:
            if not 1 <= len(rd) <= 2:
                err("读音记法 rd 应为 1~2 条")
            if sum(1 for m in rd if m.get("best")) != 1:
                err("读音记法 rd 必须恰好有一条 best")
            for m in rd:
                if m.get("type") not in RD_TYPES or not m.get("text"):
                    err(f"读音记法 rd 的 type 必须是 {RD_TYPES}，且要有 text")
        elif "--need-rd" in sys.argv and not w.get("loan"):
            err("缺少读音记法 rd")
        p = w.get("parts")
        if p:
            if p.get("cert") not in CERTS:
                err(f"parts.cert 必须是 {CERTS}")
            if not p.get("rows") or any(len(r) != 4 for r in p["rows"]):
                err("parts.rows 每行必须是 [假名, 汉字, 意思, 说明]")
            elif "".join(r[0] for r in p["rows"]) != w.get("kana"):
                err("parts 各部分假名拼起来与 kana 不一致")
        loan = w.get("loan")
        if loan and not (loan.get("lang") and loan.get("src")):
            err("loan 缺少 lang 或 src")
    for k, v in kanji.items():
        if not v.get("zh") or not v.get("on") and not v.get("kun"):
            errors.append(f"kanji.js {k}: 缺少字义或读音")
    print(f"单词 {len(words)} 个，汉字 {len(kanji)} 个")
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print("校验通过")


if __name__ == "__main__":
    main()
