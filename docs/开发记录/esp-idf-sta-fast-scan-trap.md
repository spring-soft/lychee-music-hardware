---
name: esp-idf-sta-fast-scan-trap
description: ESP-IDF 的 STA 默认是 FAST_SCAN——mesh/多路由环境下会随机连到弱节点，必须显式设 ALL_CHANNEL_SCAN + BY_SIGNAL
metadata:
  node_type: memory
  type: project
---

**2026-09-25 在 esp-music 上踩到的坑，值得单独记：这是"看起来像设备坏了"的经典案例。**

## 现象
播放**每几秒钟卡一下**。查下来：
- 网络取流只有 **9 KB/s**（需要 24 KB/s，源是 mp3@192k），`ring_in` 一直是 0
- 设备的 **RSSI 报 -70 dBm**，而同一台服务器用笔记本拉流有 **2383 KB/s**（完全正常）
- 让设备扫一次 WiFi：**同一个 SSID「香海合院」最强的那个是 -22 dBm**！
  —— 也就是说设备连的不是最强的那个 AP

## 根因：`wifi_config_t wc = {0}` 的默认值是 `WIFI_FAST_SCAN`
```c
wifi_config_t wc = {0};            /* ← 全 0，scan_method = WIFI_FAST_SCAN */
wc.sta.ssid = ...
wc.sta.password = ...
esp_wifi_set_config(WIFI_IF_STA, &wc);
```
`WIFI_FAST_SCAN` = **扫到第一个同名的 AP 就连，立刻停**。
⚠️ 而 `sort_method = WIFI_CONNECT_AP_BY_SIGNAL`（"按信号选最强"）**只在
`scan_method = WIFI_ALL_CHANNEL_SCAN` 时才生效** —— 光设 sort_method 没用。
默认 sort_method 虽然也是 0（= BY_SIGNAL），但 FAST_SCAN 下根本不看它。

**后果**：家里有多台同名路由 / mesh 节点时，设备**每次重新关联都可能随机挑一个**。
之前运气好挑到 -23 dBm 的（信道 1），某次重连后挑中了 -70 dBm 的（信道 6）
→ 取流速率崩到 9KB/s → 播放每几秒卡一下。
**用户的第一反应是"被你改坏了"，其实是个潜伏的配置 bug** —— 只要 WiFi 重连一次就可能踩中。
（我一开始还往"缓冲不够/服务器跟不上/BLE 共存"上猜，都是错的；
**决定性的一步是"让设备扫一次 WiFi 看周围"** —— 它自己就知道旁边有个强得多的 AP。）

## 正确的配置（两处 STA 配置都要加：开机初始化 + 运行时切网）
```c
wc.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;        /* 扫完所有信道再决定 */
wc.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;    /* 选信号最强的那个 BSS */
```
代价：开机多约 1 秒（扫 13 个信道 vs 碰到就连）—— 换取"永远连最强的节点"，很值。

## 怎么快速判断"是网络问题还是设备问题"
1. **同一台服务器，用笔记本/手机直接拉同一个流**测速率（esp-music 里有现成脚本套路：
   读 `sdkconfig.local` 拿 host/账号、md5 拼 token、`stream.view?format=mp3`）。
   笔记本拿 2MB/s、设备拿 9KB/s → **锅在设备这一侧**。
2. **让设备自己扫一次 WiFi**（`/api/wifi/scan` 是 **GET** 不是 POST），看当前连的
   SSID 在扫描结果里是不是最强的那一个。这一步直接定位到"连错节点了"。
3. 设备侧的速率打点见 [[esp-music-position-and-stream-breaks]]（每 30 秒一行
   `[速率] 网络取流 / 解码消耗 / ring_in / ring_pcm`，一有欠载就当场打）。

相关：[[esp-music-m5-web-console]] [[esp-music-position-and-stream-breaks]] [[esp-music-boot-time]]
