# ESP-Music

自研 WiFi 音乐播放器 —— 自己画的板 + 自己写的固件。

```
Navidrome ──WiFi──> ESP32-S3-N16R8 ──I2S──> ES8388 ──> 3.5mm 耳机
                         │
                         ├── ST7735 160×128 彩屏 (LVGL)
                         ├── 4 个按键 + 旋转编码器
                         └── 网页控制台
```

**先读 [`交接说明.md`](交接说明.md)** —— 项目全貌、引脚表、编译方式、坑、下一步都在那里。

---

## 快速导航

| 我想… | 去哪 |
|---|---|
| 看懂整个项目 | [`交接说明.md`](交接说明.md) |
| **编固件** | `cd firmware && /e/Espressif/idf.sh build` |
| 改固件代码 | `firmware\components\`（15 个组件）/ `firmware\main\app_main.c` |
| 看硬件设计 | `pcb\`（工程包 `.epro2` / Gerber / BOM / 引脚表）|
| 了解设计思路 | `docs\开发记录\方案与进度（正式）.md`（47KB，最全）|
| 快速浏览全部代码 | `docs\esp-music-全部代码.txt`（带行号索引，省 token）|
| 查踩过的坑 | `docs\开发记录\`（19 篇专题）+ `docs\踩坑与设计记忆\`（见下方说明）|
| **做 TF 卡 / 编码器 / 离线模式** | `docs\踩坑与设计记忆\esp-music-tfcard-plan.md` ＋ `docs\开发记录\esp-music-m9-offline-tf.md` |

> ⚠️ `docs\踩坑与设计记忆\` 目录在交接时**丢失过**（原计划的精选 10 篇没跟过来）。
> 2026-10-06 先重建了其中最关键的一篇：`esp-music-tfcard-plan.md`（TF 卡/编码器方案）。
> 其余 9 篇只剩 `README`/`交接说明` 里的引用，**迄今仍未找回** —— 看到悬空引用别奇怪。


---

## 三条铁律

1. **别提交 `sdkconfig.local` / `sdkconfig`** —— 里面有明文 WiFi 和 Navidrome 密码。
2. **编固件别直接敲 `idf.py`** —— 用 `/e/Espressif/idf.sh`（绕开中文用户名 + Git Bash 两个坑）。
3. **内部 SRAM 只有 308KB** —— 加任何新组件/页面前先做内存核算，BLE 已砍就是被它逼的。

---

## 状态

**面包板与 PCB 是两条独立分支**（各自把板型钉死在 `sdkconfig.forced` 里，互不干扰）：

| 分支 | 内容 | 状态 |
|---|---|---|
| `breadboard` | **原版 + 24bit 输出**：无编码器 / TF 卡 / 离线模式 | ✅ 已实机验证，面包板上跑的就是它 |
| `v2-pcb` | M9 全部功能：旋转编码器、TF 卡离线曲库、在线/离线双模式、收藏同步、网页接口 **+ 24bit 输出** | 🚧 编译通过，**等板子做出来才能真机验证** |

### 🎵 24bit 解码（2026-10-07，两条分支都有）

改动前整条链路写死 16bit，24bit FLAC 被压成 16bit 才进 DAC。现在：

- **>16bit 的源** → 24bit 输出（**32bit 槽 + MSB 左对齐**，ES8388 `0x17=0x00`）
- **≤16bit 的源** → 16bit 输出（与改动前**逐字节相同**）
- 回退：`audio_engine.c` 顶部 `#define AUDIO_OUT_ALLOW_24BIT 0`
- ⚠️ 为什么不用 24bit 槽：`bclk_div = mclk/(2×槽位宽)` 必须整除（256/48 非整数），32bit 槽才整除
- ⚠️ **听感上基本听不出来**（−96dB 级差异埋在模拟噪声地板下）；真正的瓶颈是 MCLK 抖动
- 详情：`docs\开发记录\esp-music-24bit.md`（含真机抓出的两个 bug 与修法）

```bash
git switch breadboard   # 面包板线（原版）
git switch v2-pcb       # PCB 线（M9）
```

⚠️ **切分支后必须删 `firmware/sdkconfig` 再编译**（它是生成物，跨分支会残留旧配置）。

### 编译与烧录

```bash
cd firmware
# 只改代码（大多数情况）——不要 fullclean
/e/Espressif/idf.sh build && /e/Espressif/idf.sh -p COM4 app-flash monitor

# 换板型 / 切分支 —— 必须 fullclean
/e/Espressif/idf.sh fullclean && /e/Espressif/idf.sh build
```

实测：改一个 `.c` → **30.9 秒**；什么都没改 → **1.9 秒**；全量 → **181 秒**（约 3 分钟，
2033 个目标文件）；开了 ccache 后全量热缓存 **122 秒**（省 33%）。
`app-flash` 只烧 app 分区（约 50 秒），全量烧要 ~2.5 分钟（每次都会重写 1.8MB 的 assets）。

- 📌 板子到货后的**校准清单（10 项）**：`docs\开发记录\esp-music-m9-offline-tf.md` 第 7 节
- ⏳ v2-pcb 线还没做：离线 seek（现在是"从头重播"）、标签解析（离线时长/封面）、卡热插拔

