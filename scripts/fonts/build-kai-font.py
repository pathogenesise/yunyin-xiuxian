#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools>=4.50", "brotli>=1.1"]
# ///
"""
生成随游戏分发的楷体子集(public/fonts/lxgw-wenkai-subset.woff2)

用法:
    uv run scripts/fonts/build-kai-font.py                # 母体在缓存里就直接用
    uv run scripts/fonts/build-kai-font.py --master path/to/LXGWWenKai-Regular.ttf

为什么要有这个脚本
------------------
安卓不带楷体(iOS 有 Kaiti SC、Windows 有 KaiTi),而整套水墨味的标题、境界名都
压在楷体上 —— 所以字体得随包走。母体 24.4MB 太重,故裁成子集:只留游戏用得到的字
(源码里出现的全部字符)+ GB2312 全字集(覆盖日常汉字与玩家输入的名字),24.4MB → 1.5MB。

为什么仓库里放的是**产物**而不是构建时下载
----------------------------------------
产物本来就要随 APK 一起打包,构建时再下载只让仓库变小、产物一点没变,却把发版
流水线挂到外网上(实测从 GitHub 拉这 24MB 要五分钟以上、连续超时两次)。所以:
子集入库、母体不入库,要重做时用这个脚本 —— 下载只发生在**重新生成**这一次。

协议
----
霞鹜文楷(LXGW WenKai)为 SIL OFL 1.1。其 OFL 文本附了一条额外许可:子集化并转成
WOFF/WOFF2 用于网页字体分发时,**可以保留保留字体名**(霞鹜 / LXGW 等),只要不作为
可安装的桌面字体再分发 —— 本脚本正是这个用途。协议全文随字体一起放在
public/fonts/OFL.txt,再分发时别把它落下。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
import urllib.request

FONT_VERSION = "v1.522"
MASTER_URL = f"https://github.com/lxgw/LxgwWenKai/releases/download/{FONT_VERSION}/LXGWWenKai-Regular.ttf"
# 母体的 sha256:换版本时先改 URL 与这个哈希,再跑一次脚本
MASTER_SHA256 = "39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009"

ROOT = pathlib.Path(__file__).resolve().parents[2]
# 产物放 src/assets 而不是 public:style.css 里用相对 url() 引它,Vite 才会改写
# 成带 hash、且认得 base 的地址(vite.config 的 base 是 './',写死 /fonts/… 在
# GitHub Pages 那种子路径部署下会 404)。协议文本放 public,原样进产物。
OUT_FONT = ROOT / "src/assets/fonts/lxgw-wenkai-subset.woff2"
META = ROOT / "scripts/fonts/kai-subset.meta.json"
CHARS = ROOT / "scripts/fonts/kai-subset.chars.txt"
CACHE = pathlib.Path("/tmp/lxgw-wenkai-cache")

# 界面一定会用到、但未必出现在源码字面量里的字符:ASCII、常用标点与全角符号
EXTRA = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "　、。〈〉《》「」『』【】〔〕—…·～×÷％＋－°※→←↑↓√✕✓○●◆◇■□★☆"
)


def sha256_of(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_master(explicit: str | None) -> pathlib.Path:
    if explicit:
        path = pathlib.Path(explicit)
    else:
        CACHE.mkdir(parents=True, exist_ok=True)
        path = CACHE / f"LXGWWenKai-Regular-{FONT_VERSION}.ttf"
        if not path.exists():
            print(f"母体不在缓存,下载 {MASTER_URL}")
            urllib.request.urlretrieve(MASTER_URL, path)
    got = sha256_of(path)
    if got != MASTER_SHA256:
        sys.exit(f"母体 sha256 不符:\n  期望 {MASTER_SHA256}\n  实际 {got}\n换版本请同步更新脚本里的 URL 与哈希")
    return path


def needed_chars() -> set[str]:
    """游戏要用到的字 = 源码/模板里出现的全部字符 + 界面符号 + GB2312 全字集。"""
    chars: set[str] = set()
    for pattern in ("*.ts", "*.vue", "*.js"):
        for p in (ROOT / "src").rglob(pattern):
            chars |= set(p.read_text(encoding="utf-8", errors="ignore"))
    chars |= set((ROOT / "index.html").read_text(encoding="utf-8", errors="ignore"))
    chars |= set(EXTRA)
    # GB2312 全字集:一级 3755 + 二级 3008,覆盖日常汉字与绝大多数名字
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return {c for c in chars if not c.isspace()}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--master", help="母体 TTF 路径(不给就按上面的 URL 下载到缓存)")
    args = ap.parse_args()

    from fontTools import subset

    master = ensure_master(args.master)
    text = "".join(sorted(needed_chars()))
    CHARS.write_text(text, encoding="utf-8")

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.drop_tables += ["DSIG"]
    opts.notdef_outline = True
    font = subset.load_font(str(master), opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text=text)
    subsetter.subset(font)
    OUT_FONT.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(OUT_FONT), opts)

    META.write_text(
        json.dumps(
            {
                "source": "霞鹜文楷 LXGW WenKai",
                "version": FONT_VERSION,
                "url": MASTER_URL,
                "master_sha256": MASTER_SHA256,
                "license": "SIL OFL 1.1 —— 全文见 public/fonts/OFL.txt",
                "subset_chars": len(text),
                "subset_sha256": sha256_of(OUT_FONT),
                "subset_bytes": OUT_FONT.stat().st_size,
                "generated_by": "scripts/fonts/build-kai-font.py",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"字集 {len(text)} 字 → {OUT_FONT.relative_to(ROOT)} ({OUT_FONT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
