---
name: esp-music-project
description: 新工程 esp-music——脱离 esp-claw 的纯原生 ESP-IDF 音乐终端（本地播放+网页控制台+屏键UI+蓝牙遥控）
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T02:46:12.277Z
---

**2026-09-24 立项**：把设备上跑在 esp-claw/Lua 里的音乐功能，重写成一个**纯原生 ESP-IDF 工程**（新目录 `~/esp-music/`，不含 esp-claw / Lua / GMF）。完整方案在 **`~/.claude/plans/navidrome-cheerful-pelican.md`**（已获用户批准）。

**Why:** 现有实现的坑全部来自框架——Lua 200 local 上限导致脚本分片、`SKILL.md` 超限让 `app_claw_start` abort、主循环饿死 LVGL、**GMF 音频组件内存破坏 bug 导致 FLAC 直传必崩**、`managed_components` 补丁一拉依赖就丢；且 esp-claw 已把 app 分区吃到 93%。详见 [[esp-claw-navidrome-streaming]]、[[k3-voice-chat-script-gotchas]]。

**How to apply（关键决策，都是用户逐条确认过的）：**

- **功能范围**：本地播放（Navidrome 拉流→ES8388）+ 网页控制台 + 屏幕按键 UI + 蓝牙 HID 遥控；**不做**语音对话(ASR/AI)、**不做** IM 通道。设备定位从「AI 助手」变成「纯音乐终端」。
- **UI**：用户要**浅色系**、要好看、要流畅不卡。播放页 = 顶栏符号+**只显歌名(截断、不带作者)** + 封面 72×72 + 右侧歌词区 + 底部进度条；列表页 5 行；**不要按键提示行**。
- **按键**（⚠️ **2026-09-25 M4 落地时改过两处**，以 [[esp-music-m4-keys-player]] 为准）：**K1=下一首、K3=上一首**、K2=播放/暂停；长按 K1=收藏、K2=音量页、K3=列表页、K4=菜单。
  - 改动①：播放页 **K4 短按 = 循环来源**（原方案是"切显示模式"）——用户说过"不要歌词了歌词显示不下"，bg_play_b/c 两张底图因此闲置；改成换来源后一键直达"随机 30 首/收藏/最近"，正好是他要的。
  - 改动②：列表页 **K1/K2 长按 = 连滚**（原方案是"长按切来源"）——两者会打架（长按先触发切来源、接着 HOLD 又滚行）。换来源改由播放页 K4 短按和菜单页前三项承担。
- **网页**：**不设鉴权**（用户要求）、**默认开 SoftAP**；手写单页 HTML（免构建、必须离线可用，不能依赖 CDN）。功能含 WiFi 扫描点选且**不重启生效**、Navidrome 地址/账号/密码、一键随机 30、最近播放、收藏（与 Navidrome 双向同步）。
- **音频**：`esp_audio_codec`（2.5.0）逐帧解码 + 两条 PSRAM ring + 三任务，**绕开 GMF**；位置由「已交给 DMA 的 PCM 帧数」推导（进度条/歌词/seek 都靠它）；**默认让服务端转 `format=mp3`**（只给 `maxBitRate` 时 Navidrome 会给 **Opus**），FLAC 直传为可选；seek 走 `timeOffset`（仅在真转码时生效，否则回落 Range）。
- **纠正一处**：ESP32-S3 **没有硬件 ASRC**，主路径**不做重采样**，改为首次拿到采样率时重配 I2S 时钟。
- **分区表刻意对齐 esp-claw**（表在 `0x9000`、nvs 在 `0xA000`、app 在 `0x20000`），将来整片还原就是一条命令、不留残表。见 [[esp-claw-firmware-backup-20260924]]。
- **里程碑 M0–M8**：M1（本地文件出声）之前不碰 Navidrome——先把"解码→ring→I2S→ES8388"用本地文件打通，让故障可二分定位。

相关：[[esp-claw-firmware-backup-20260924]] [[esp-claw-pinmap-es8388]] [[esp-claw-audio-quality-tuning]] [[esp32s3-coreboard-v14-pinout]]
