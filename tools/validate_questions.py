#!/usr/bin/env python3
"""校验 js/data/q_l*.js（动词）与 q_p*.js（助词）中的手工题目数据。用法：python3 tools/validate_questions.py [文件...]"""
import glob
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIX = "JP.addQuestions("
RUBY = re.compile(r"\{([^{}|]+)\|([^{}|]+)\}")


def check_text(s, where, errs):
    stripped = RUBY.sub("", s)
    if "{" in stripped or "}" in stripped or "|" in stripped:
        errs.append(f"{where}: 振假名标注格式错误：{s}")


def load(path):
    src = open(path, encoding="utf-8").read().strip()
    if not src.startswith(PREFIX) or not src.endswith(");"):
        raise ValueError("文件必须以 JP.addQuestions( 开头、以 ); 结尾")
    return json.loads(src[len(PREFIX):-2])


def validate(path, seen_ids, errs):
    try:
        items = load(path)
    except Exception as e:  # noqa: BLE001
        errs.append(f"{path}: 无法解析：{e}")
        return []
    for i, q in enumerate(items):
        where = f"{os.path.basename(path)}[{i}] {q.get('id', '?')}"
        for key in ("id", "level", "type", "topic", "q", "answer", "zh", "explain"):
            if key not in q:
                errs.append(f"{where}: 缺少字段 {key}")
        # 动词题 id 前缀 L，助词题 id 前缀 P 且必须带 subject: "particle"
        prefix = "P" if os.path.basename(path).startswith("q_p") else "L"
        if not re.fullmatch(prefix + r"[1-5]-\d{3}", str(q.get("id", ""))):
            errs.append(f"{where}: id 格式错误（应为 {prefix}<难度>-<三位序号>）")
        elif not q["id"].startswith(f"{prefix}{q.get('level')}-"):
            errs.append(f"{where}: id 与 level 不一致")
        if prefix == "P" and q.get("subject") != "particle":
            errs.append(f"{where}: 助词题必须有 \"subject\": \"particle\"")
        if q.get("id") in seen_ids:
            errs.append(f"{where}: id 重复")
        seen_ids.add(q.get("id"))
        t = q.get("type")
        ans = q.get("answer")
        opts = q.get("options")
        if t == "choice":
            if not (isinstance(opts, list) and len(opts) == 4):
                errs.append(f"{where}: choice 需要 4 个选项")
            elif len(set(opts)) != 4:
                errs.append(f"{where}: 选项有重复")
            if not (isinstance(ans, int) and 0 <= ans <= 3):
                errs.append(f"{where}: choice 的 answer 必须是 0~3")
        elif t == "input":
            if not (isinstance(ans, list) and ans and all(isinstance(a, str) and a for a in ans)):
                errs.append(f"{where}: input 的 answer 必须是非空字符串数组")
            elif any("{" in a or "|" in a for a in ans):
                errs.append(f"{where}: input 的 answer 不能含振假名标注")
        elif t == "order":
            if not (isinstance(opts, list) and len(opts) >= 3):
                errs.append(f"{where}: order 至少需要 3 个片段")
            elif not (isinstance(ans, list) and sorted(ans) == list(range(len(opts)))):
                errs.append(f"{where}: order 的 answer 必须是 options 下标的排列")
            elif ans == list(range(len(opts))):
                errs.append(f"{where}: order 的片段没有打乱")
        else:
            errs.append(f"{where}: 未知题型 {t}")
        for key in ("q", "zh", "explain", "topic"):
            if isinstance(q.get(key), str):
                check_text(q[key], f"{where}.{key}", errs)
        for o in opts or []:
            check_text(o, f"{where}.options", errs)
    return items


def main():
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, "js/data/q_[lp]*.js")))
    errs, seen, all_items = [], set(), []
    for f in files:
        all_items += validate(f, seen, errs)
    by_level = Counter(q.get("level") for q in all_items)
    by_type = Counter(q.get("type") for q in all_items)
    print(f"共 {len(all_items)} 题；按难度 {dict(sorted(by_level.items()))}；按题型 {dict(by_type)}")
    choice_pos = Counter(q["answer"] for q in all_items if q.get("type") == "choice" and isinstance(q.get("answer"), int))
    print(f"选择题正确答案位置分布：{dict(sorted(choice_pos.items()))}")
    if errs:
        print(f"\n发现 {len(errs)} 个问题：")
        for e in errs:
            print("  - " + e)
        sys.exit(1)
    print("校验通过")


if __name__ == "__main__":
    main()
