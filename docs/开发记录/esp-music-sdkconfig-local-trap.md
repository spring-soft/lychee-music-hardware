---
name: esp-music-sdkconfig-local-trap
description: 改 sdkconfig.defaults/local 对已存在的 sdkconfig 无效——换 WiFi 后设备还连旧网络的坑与修法
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T02:46:25.035Z
---

**坑（2026-09-25 实际踩到）**：用户换了住处，我把 `~/esp-music/sdkconfig.local` 里的 `CONFIG_APP_WIFI_SSID` 改成新 SSID 后重新 `idf.py build && flash`，设备**还是去连旧网络**（串口 `net: STA 已启动，SSID="<当时的旧 WiFi 名>"`，reason=201 NO_AP_FOUND 重试 8 次后放弃）。

**Why:** IDF 的 `SDKCONFIG_DEFAULTS`（cmake 里 `set(SDKCONFIG_DEFAULTS ...)`）**只在 `sdkconfig` 不存在、或某个符号还没被赋值时才生效**。`sdkconfig` 一旦生成过，里面的值就固化了；改 defaults 文件再 build **不会**覆盖它。这一步很容易误判成"WiFi 密码错了"或"设备没收到新固件"——其实固件是新的，只是编译进去的配置还是旧的。

**How to apply:**

1. **判断方法**：`grep '^CONFIG_APP_WIFI_SSID' sdkconfig` —— 看生成出来的 `sdkconfig` 而不是 defaults 文件。
2. **已修**：`tools/sync_sdkconfig.py` + 顶层 `CMakeLists.txt` 里在 `include(project.cmake)` 之前 `execute_process` 跑它，把 `sdkconfig.local` 里的 `CONFIG_*` 强制写进 `sdkconfig`。脚本**只在真值有差异时才写文件**（否则每次 configure 都改 sdkconfig，会不停触发重新 configure）。这样"改 sdkconfig.local → build"才符合直觉。
3. **另一半坑**：`net_mgr` 是 **NVS 优先、Kconfig 兜底**。光改 sdkconfig 还不够——设备 NVS（命名空间 `net`，在 nvs 分区 `0xA000`/`0x6000`）里存着旧凭据时仍然用旧的。要么在网页控制台（M5）改，要么擦掉重来：
   ```
   python -m esptool --chip esp32s3 -p /dev/ttyACM0 -b 460800 erase_region 0xA000 0x6000
   ```
   擦 NVS 是安全的：esp-music 只往里读，没有要保留的数据（WiFi 校准数据丢了只会让下次开机慢一点）。
4. 同类教训：`grep` 出来的 `sdkconfig` 值和 `sdkconfig.defaults` 不一致时，**永远信 `sdkconfig`**。

相关：[[esp-music-project]] [[esp-music-m4-keys-player]]
