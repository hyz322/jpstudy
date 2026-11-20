#!/usr/bin/env python3
"""把读音记法 rd 写进单词文件（js/data/words_*.js）。
用法：python3 tools/add_rd.py rd.json
rd.json 的格式：{"W5-body-01": [{"type": "联想", "text": "……", "best": true}], ...}
rd 放在该词 "mn" 的前面；已经有 rd 的词会被替换。其他内容原样保留。"""
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "js" / "data"


def block(items):
    lines = ",\n".join("      " + json.dumps(m, ensure_ascii=False) for m in items)
    return f'    "rd": [\n{lines}\n    ],\n'


def main():
    todo = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    done = set()
    for f in sorted(DATA.glob("words_*.js")):
        text = f.read_text(encoding="utf-8")
        changed = False
        for wid, items in todo.items():
            m = re.search(r'^    "id": "' + re.escape(wid) + '",', text, re.M)
            if not m:
                continue
            end = text.find('\n  }', m.end())
            body = text[m.start():end]
            old = re.search(r'^    "rd": \[\n.*?^    \],\n', body, re.M | re.S)
            if old:
                body = body[:old.start()] + block(items) + body[old.end():]
            else:
                pos = re.search(r'^    "mn": \[', body, re.M).start()
                body = body[:pos] + block(items) + body[pos:]
            text = text[:m.start()] + body + text[end:]
            done.add(wid)
            changed = True
        if changed:
            f.write_text(text, encoding="utf-8")
    missing = set(todo) - done
    print(f"写入 {len(done)} 个词" + (f"；找不到这些 id：{sorted(missing)}" if missing else ""))
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
