---
name: esp-music-m7-ble-hid
description: esp-music M7 蓝牙 HID 遥控——NimBLE 主机任务必须自己启、广播 31 字节上限、把 BLE 塞进内部 SRAM 的逐阶段实测与任务栈搬迁
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T08:03:11.173Z
---

**2026-09-25 做的 M7**：K1-K4 当 BLE HID 遥控（Consumer Control）控制手机/电脑。
组件 `components/hid_remote/`，菜单第 8 项「蓝牙遥控」开关，`/api/hid` + `/api/hid/send?key=`。

**Why:** 这一轮的价值全在"两个不报错的坑"和"内部 SRAM 的账本"上 —— 蓝牙代码本身
只有 200 行，但定位花了大部分时间。

## 1. ⚠️⚠️ S3 上必须【自己】启动 NimBLE 主机任务
`esp_nimble_init()` 在 S3（`SOC_ESP_NIMBLE_CONTROLLER`）上**只初始化数据结构，不建任务**：
`ble_transport_hs_init()` 里只有一句 `ble_hs_init()`。必须再调

```c
esp_nimble_enable(nimble_host_task);   /* 任务里跑 nimble_port_run() */
```

**漏了它的症状**：串口一切正常（控制器起来了、MAC 打印了、"BLE 栈已起"），
**但永远不广播、手机永远扫不到，而且一个错误都不报。**

⚠️ 我一开始搜 `nimble_port_freertos_init` 有没有人调，结论是"没有 → 这任务大概是自动起的"
—— **错了**：IDF 示例调的是 `esp_nimble_enable(host_task)`（示例第 969 行），
`nimble_port_freertos_init()` 内部就是调它，两个名字是一回事。
**教训：查"谁启动了这个任务"要搜函数名 + 它可能的别名，别只搜一个名字就下结论。**

**顺序也不能反**：`esp_hidd_dev_init()` **之后**才 `esp_nimble_enable()`。
因为 esp_hidd 是在 dev_init 的【最后一行】才把 `ble_hs_cfg.sync_cb = nimble_host_synced`，
而 START 事件（开始广播的触发点）就是那个回调发的。反过来就永远收不到 START。

## 2. ⚠️ 广播数据（legacy adv）只有 31 字节
flags 3 + appearance 4 + UUID16 4 = 11，留给设备名 20 字节。
**"ESP-Music 遥控" 是 8 个汉字 = 24 字节，直接超限**：`ble_gap_adv_set_fields()` 返回
rc=4（BLE_HS_EMSGSIZE），广播数据根本没设上。
⚠️ **而我的代码没检查它的返回值，照样打印"广播中，等配对"** —— 日志看着完美，
手机就是扫不到。所以现在设备名是短的 ASCII：**`ESP-Music RC`**。
（顺带也避开"某些主机把 UTF-8 名字显示成乱码"。）

## 3. 内部 SRAM 的账本（这块板唯一紧的资源）
逐阶段实测（加 BLE 之前 → **做完所有优化之后**）：

| 阶段 | 优化前余量 | 现在 |
|---|---|---|
| 开机 | 231 KB | 231 KB |
| 音频引擎 init 后 | 198 KB | 198 KB |
| +WiFi 驱动 +UI | 134 KB | 134 KB |
| +WiFi 连上 | 42 KB | **88 KB** |
| +BLE 栈（吃 38 KB） | 7 KB | **50 KB** |
| +httpd +起播 | 3 KB（崩） | **21 KB**（DMA 13 KB） |
| 播放中稳定 | 崩 | **11 KB** |

**BLE 实际吃 38KB 内部 + 184KB PSRAM**（`MEM_ALLOC_MODE_EXTERNAL` 生效了）。
那 38KB 是控制器不可搬的部分（在 ISR 路径上），降不下去。

**腾内存的四个有效手段**（按收益）：
1. **任务栈搬 PSRAM**（最大一笔）：`xTaskCreatePinnedToCoreWithCaps(fn, name, stack, ...,
   xCoreID, MALLOC_CAP_SPIRAM)` —— 省下 decode 8K + fetch 6K + ui 8K 量级。
   ⚠️ **单位坑**：`idf_additions.h` 的注释说 `usStackDepth` 是 bytes，**是错的**：
   实现里是 `heap_caps_malloc(usStackDepth * sizeof(StackType_t))`，也就是和普通
   `xTaskCreate` 一样按**字（word）**算。照注释理解会分配 1/4 的栈 → 溢出。
   **按同样的常量传就对了。**
   ⚠️ **哪些任务不能搬**：写 NVS/FATFS 的（player、cover —— flash 写会短暂关 cache）、
   实时性最要紧的（`ae_out`，19 优先级，栈在 PSRAM 多一次外部 RAM 访问）。
2. `CONFIG_ESP_WIFI_IRAM_OPT=n` + `CONFIG_ESP_WIFI_RX_IRAM_OPT=n`：WiFi 收包快路径
   代码从 IRAM 挪回 flash（XIP），**换来约 17KB 内部 SRAM**。192kbps 的音频流完全不在乎。
3. `CONFIG_SPIRAM_TRY_ALLOCATE_WIFI_LWIP=y` + `CONFIG_LWIP_TCP_WND_DEFAULT/SND_BUF_DEFAULT`
   16K→8K（**每条连接**的窗口，是 WiFi 连上后那几十 KB 的主因）。
4. LVGL 的两块画布**必须是内部 DMA RAM**（PSRAM 画布配 SPI DMA 要再加 bounce buffer），
   所以它的行数直接吃内部 RAM：40 行 = 25KB → **16 行 = 17KB**。

**⚠️ 内存见底的症状是 `abort()` 重启循环，不是优雅降级**：
```
E lwip_arch: thread_sem_init: out of memory
E esp-tls: getaddrinfo() returns 202      (EAI_MEMORY)
E HTTP_CLIENT: Connection failed, sock < 0
abort() was called at PC 0x40389d17 on core 0
rst:0xc (RTC_SW_CPU_RST)
```
看到 `内存[after] 内部SRAM 0KB DMA可用 0KB` 就是这个下场。

## 4. 配置机制的两个补丁（否则改了不生效）
- 新增 `sdkconfig.forced`（非敏感但必须压过 menuconfig 残留的开关），和 `sdkconfig.local`
  走同一条覆盖路径。**顺手修了 `sync_sdkconfig.py` 的一个真 bug**：原来只处理
  `CONFIG_X=...` 行，不管 `# CONFIG_X is not set` —— 于是"把没开的选项打开"会追加一行
  `CONFIG_X=y`，跟原来那行 `is not set` 并存，confgen 以哪行为准不是你能控制的。
- **只改 `sdkconfig.forced` 不会触发 cmake reconfigure**，那段 `execute_process` 就不跑，
  配置静默不生效（实测踩到）。加了 `set_property(DIRECTORY APPEND PROPERTY
  CMAKE_CONFIGURE_DEPENDS ...)`。
- ⚠️ 又发现一个潜伏 bug：`CONFIG_LWIP_MAX_SOCKETS` **实际生效是 10**，
  而 `sdkconfig.defaults` 里早就写了 16（老陷阱的又一次现身）。10 个 socket 不够
  httpd 要的 6+3，加音频流和元数据要 11 个 —— 症状就是 `sock < 0`。

## 5. 交互设计（用户 2026-09-25 晚改过一轮，这里是最终形态）
用户原话：「把蓝牙控制放到菜单第一个，不要和音乐播放混在一起」「用蓝牙控制还要显示
歌名？你没办法获取到我播放什么，所以不用显示」「进入控制后除了 3 个按键控制播放，
长按 K2 进入音量调整和音乐播放器保持一致」。

所以「蓝牙控制」是**一个独立模式**（不是一个开关）：
- **菜单第 1 项**「蓝牙控制」进入（顶掉原来的排列，其余项顺延）。
- 进去就切到 **`UI_PAGE_BT` 独立页面**，**不显示本机歌名/封面/进度/歌词** ——
  对方在放什么我们根本不知道，显示本机的歌只会误导。（底图复用 `bg_info` + `ASSET_IC_BT`。）
- 键位：**K1 下一首 ｜ K2 播放/暂停 ｜ K3 上一首 ｜ K2 长按 音量（和播放器一致）｜
  K4 退出模式**。K1/K2/K3 的长按一律吞掉（不吞的话"长按 K1 收藏"会一边收藏本机
  一边给对方发下一首）。没连上对端时**也吞掉**，绝不掉回本机控制（那就又混在一起了）。
- 音量页有个 **remote 变体**（`ui_vol_set_remote`）：加减/静音发给对方；
  **不显示数字和进度条**（对方的音量读不到，摆个假值比不摆更误导），
  大号数字显示 `--`、hint 显示"发给对方"。
- 本机音乐**继续播放**（只换界面，不打断音频）—— 用户没要求停。

**模式不存 NVS**：这是"当前在干什么"而不是设置。存了的话重启会落在遥控界面、
按键全发给对方，用户会以为设备坏了。

## 5.5 菜单结构（用户 2026-09-25 晚又改过一轮）
主菜单从 8 项压到 **6 项**：`蓝牙控制 <状态>` / `来源: <当前来源>` / `播放 / 暂停` /
`屏幕亮度` / `重连 WiFi` / `系统信息`。正好一屏，不再滚动。

- 三个"来源: X"合成**一项**（冒号后显示当前来源，动态刷新），按 K3 进
  **`UI_PAGE_SRC` 二级菜单**（`ui_srcmenu_*`）：K1/K2 选、**K3 确定并退回主菜单**、
  K4 返回上级。
- 二级菜单里给当前来源标 `（当前）`，`最近播放` 为空时标 `（空）` —— 不标的话
  用户会奇怪"为什么选了没反应"（空来源会退回随机 30 首）。
- ⚠️ **二级菜单的长按 K4 要回【上级菜单】不是播放页**（它是菜单的下级），
  `key_long` 里单独判了 `UI_PAGE_SRC`。
- 动态项（蓝牙状态、当前来源）靠 `menu_render()` 里的字符串比对标脏 ——
  比对的是"状态串|来源名"，任一变了就整页重刷，所以来源切换后 250ms 内会自己更新。

## 5.6 遥控音量页：不显示数值，只做示意
用户原话：「获取不到对方音量的你不要显示这个了就显示个示意就好了」。
所以遥控音量页：大号字显示 **`+ -`**（静态示意，Montserrat 的 ASCII），
右上角显示**刚才那个键发出去了没**（`已发 ＋` / `已发 －` / `已静音` / `发给对方`），
**进度条藏起来**（任何填充位置都在暗示一个具体音量值，那是假的）。
⚠️ 大号字用 `lv_font_montserrat_24`，**只能用 ASCII `+`/`-`**；全角 `＋`/`－`
在 CJK 字库里（0xFF00-0xFFEF 段），小字提示用它没问题 —— 两处字体不一样，别搞混。

## 6. ⚠️ 踩到的坑：`ui_pages_tick()` 在播放页【不跑】
`ui_bt_mode_follow()`（模式→页面的跟随逻辑）一开始塞在 `ui_pages_tick()` 里，
**结果"网页切了模式但屏幕一直不动"** —— 因为 `ui.c` 的 `ui_tick_cb()` 是
`if (s_page == UI_PAGE_PLAY) play_refresh(); else { ...; ui_pages_tick(); }`，
而开机后正好停在播放页。**加页面跟随逻辑必须挂在无条件执行的地方。**
（诊断线索：`ui_page_show()` 会打 `页面 → N`，日志里一条都没有 → 说明根本没换页。）

## 7. 验收状态（2026-09-25）
- ✅ 广播、连接、发键、模式切换、页面跟随全部实测通过；0 错误 0 重启；
  加蓝牙后欠载 0、播放中内部 SRAM 11KB
- ✅ `POST /api/hid {"on":true}` → `页面 → 5`；`{"on":false}` → `页面 → 0`
- ✅ `/api/hid/send?key=next|play|prev|volup|voldn|mute|stop|ff|rew`
- ⚠️ **没验证的**：① 对端（手机/电脑）真的做出反应 —— 我自己笔记本的蓝牙
  soft blocked（`rfkill unblock bluetooth` 要 root）；② 遥控页和遥控音量页的
  **像素内容**（只验证到"页面切过去了"，没做屏幕回读）；③ 按键的物理路径
  （K1-K4 真按下去）—— 需要用户实机按。
- ⚠️ 有个设备反复以**变化的随机地址**连上来（`47:D4:AB:12:85:A2` /
  `7C:3C:3C:20:C9:8A` / `5D:98:6F:65:68:B9`），像是手机的随机地址轮换。
  是谁没确认 —— 如果是用户的手机，说明配对其实早就成功了。

相关：[[esp-music-project]] [[esp-music-m6-persistence]] [[esp-music-m4-keys-player]]
[[esp-music-m5-web-console]] [[esp-music-screen-readback]] [[esp-music-sdkconfig-local-trap]]
