#!/usr/bin/env python3
"""推公开仓库之前：查一遍**将要提交的内容**里有没有真实凭据。

为什么这个仓库特别需要它：这里装的正是 docs/（开发记录会引用真实配置值）和
pcb/（含 firmware 源码快照，里面有 sdkconfig/sdkconfig.local 那种带密码的文件）。
2026-10-11 首次提交前就是靠这套检查拦下来的：
  · docs/开发记录/esp-music-navidrome-verified.md 里 Navidrome 账号密码是明文
  · pcb/fw_src/lychee-music-backup-20260925/esp-music/sdkconfig{,.local} 带着明文密码
    （这两个靠 .gitignore 挡的）

⚠️ 检查方式是**只看 git 实际会提交的那份内容**，而不是"扫目录里有没有密码"。
   因为上面那两个 sdkconfig 确实含密码，但已被忽略、进不了提交；
   按目录扫会一直报假警，把真问题淹掉。

用法：
    python3 tools/audit_secrets.py          # 扫"暂存区 == 下次提交"的内容
    python3 tools/audit_secrets.py --history # 再扫一遍【全部提交历史】

⚠️ 真值从 firmware/sdkconfig.local 现读，**不写死在本脚本里**（脚本要进仓库）。
   那个文件已 gitignore。读不到就只报"无法审计"，不会假装通过。
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))

# sdkconfig.local 的候选位置：本仓库（hardware）放在 firmware/ 下；
# 在固件仓库里跑的话就是仓库根。
LOCAL_CANDIDATES = [
    os.path.join(ROOT, "firmware", "sdkconfig.local"),
    os.path.join(ROOT, "sdkconfig.local"),
]

# 这些键的值算"凭据/个人信息"，命中即失败
KEYS = {
    "CONFIG_APP_WIFI_SSID":     "WiFi 名",
    "CONFIG_APP_WIFI_PASSWORD": "WiFi 密码",
    "CONFIG_APP_NAV_USER":      "Navidrome 用户名",
    "CONFIG_APP_NAV_PASS":      "Navidrome 密码",
}

# 二进制/压缩文件跳过（命中也不好判断，它们另有 gitignore 兜底）
SKIP_EXT = {".pdf", ".png", ".jpg", ".jpeg", ".zip", ".bin", ".bmp", ".gif",
            ".b64", ".epro2", ".epro", ".rar", ".7z", ".ttf", ".woff", ".woff2"}


def read_local():
    for p in LOCAL_CANDIDATES:
        if not os.path.exists(p):
            continue
        out = {}
        for line in open(p, encoding="utf-8", errors="replace"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"')
        return p, out
    return None, {}


def git(*args):
    p = subprocess.run(["git", "-C", ROOT] + list(args), capture_output=True)
    return p.returncode, p.stdout, p.stderr


def scan(paths, secrets, label):
    print("\n===== %s =====" % label)
    hits = 0
    n = 0
    for rel in paths:
        p = rel if os.path.isabs(rel) else os.path.join(ROOT, rel)
        if os.path.splitext(p)[1].lower() in SKIP_EXT or not os.path.isfile(p):
            continue
        n += 1
        try:
            data = open(p, "rb").read()
        except OSError:
            continue
        for k, v in secrets.items():
            c = data.count(v.encode("utf-8"))
            if c:
                hits += 1
                try:
                    shown = os.path.relpath(p, ROOT)
                except ValueError:
                    shown = p
                print("  !! %s  <- %s (%d 处)" % (shown, KEYS[k], c))
    print("  扫了 %d 个文本文件，命中 %d" % (n, hits))
    return hits


def main():
    if not os.path.isdir(os.path.join(ROOT, ".git")):
        print("FAILED: %s 不是 git 仓库" % ROOT)
        return 1

    src, vals = read_local()
    if not src:
        print("FAILED: 找不到 sdkconfig.local（试过 %s）—— 无法审计" % ", ".join(LOCAL_CANDIDATES))
        return 1
    secrets = {k: vals[k] for k in KEYS if len(vals.get(k, "")) >= 6}
    print("真值来源: %s" % src)
    print("拿 %d 个真实值去扫：%s" % (len(secrets), ", ".join(KEYS[k] for k in secrets) or "（无）"))

    total = 0

    # ---- 1. 将要提交的内容（暂存区）----
    # 先 git add -A 把工作区同步进暂存区（纯本地、可 git reset 回退），
    # 这样 ls-files 给出的就是"下一次 commit == 会推上去的东西"。
    git("add", "-A")
    rc, outz, _ = git("ls-files", "-z")
    paths = [p.decode("utf-8", "replace") for p in outz.split(b"\x00") if p]
    total += scan(paths, secrets, "将要提交的文件（%d 个）" % len(paths))

    # ---- 2. 历史（可选）----
    if "--history" in sys.argv:
        print("\n===== 历史（全部分支）=====")
        for k, v in secrets.items():
            rc, out, _ = git("log", "--all", "--oneline", "-S", v)
            n = len([l for l in out.splitlines() if l.strip()])
            print("  %-26s %s" % (KEYS[k], "命中 %d 个提交  <== 要看！" % n if n else "未出现 OK"))
            total += n

    print()
    if total:
        print("FAILED: 有 %d 处凭据会被推上去 —— 先处理再推送！" % total)
        return 1
    print("OK: 会推上去的内容里没有任何真实凭据")
    return 0


if __name__ == "__main__":
    sys.exit(main())
