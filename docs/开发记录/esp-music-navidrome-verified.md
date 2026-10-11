---
name: esp-music-navidrome-verified
description: esp-music 与用户 Navidrome 实测确认的事实（版本/扩展/转码行为/鉴权踩坑）
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T03:17:46.470Z
---

**2026-09-24 实机验证**（esp-music 固件 ↔ 用户 Navidrome）。这些是从真实响应里读出来的，不是文档推断。

**Why:** 每个都直接决定实现方式（尤其"转码流没有 Range"这一条决定 seek 怎么做），而且其中两条已经让我踩了一次坑。

**How to apply:**

- **服务器**：`navidrome 0.63.2-SNAPSHOT (be10f89)`，Subsonic API v1.16.1，`openSubsonic: true`。
  地址 `http://192.168.0.110:4533`，账号 `<Navidrome 用户名>` / `<Navidrome 密码>`
  （⚠️ 真值在 `firmware/sdkconfig.local` 里，那个文件已 gitignore、不进仓库）。
  **注意：这套账号密码是 Navidrome 的，不是 WiFi 的**（曾把两者搞混，导致 WiFi 连不上 reason=201）。
- **OpenSubsonic 扩展（实测列表）**：`transcodeOffset v1`、`songLyrics v1+v2`、`transcoding v1`、`playbackReport v1`、`indexBasedQueue v1`、`formPost v1`。
  → seek 走 `timeOffset`、歌词有毫秒时间轴，两条设计前提都成立。**没有** apiKeyAuthentication → 只能用 `u+p` 或 `u+t+s`。
- **曲库是 FLAC 为主**（随机 30 首里大多数是 flac，也有 ogg）。所以"服务端转 mp3"不只是权宜，是主路径。
- **转码流的行为**：`/rest/stream.view?id=..&format=mp3&maxBitRate=192&estimateContentLength=true`
  → HTTP 200，`Content-Length ≈ 时长 × 24KB/s`（182 秒的歌 = 4,491,018 字节），**`Accept-Ranges: no`**。
  ⇒ **转码流不能靠 HTTP Range 做 seek**，必须 `&timeOffset=<秒>`（`transcodeOffset` 扩展）。
  ⇒ `f=json` 对 stream 无意义但无害；`estimateContentLength=true` 能拿到长度估计。
- **踩过的坑：JSON 响应体可能是 chunked（无 Content-Length）**，按 8KB 固定缓冲读会让 30 首歌的 JSON 被截断 → `cJSON_Parse` 失败。**必须动态增长缓冲**（上限留 96KB）。
- 取歌用 `getRandomSongs.view?size=N`（Navidrome 服务端上限 500）；返回字段 `id/title/artist/album/duration(秒)/suffix/size/coverArt/starred`。**请求封面要用 `coverArt` 字段而不是歌曲 id**。
- 实测吞吐/稳定性：一首先 128KB 预取 + 108KB PCM 起播预取，**underrun 0**；RSSI -55~-66 dBm，信道 11。

相关：[[esp-music-project]] [[esp-music-audio-click-sources]]

---

## 2026-09-25 补：换住址后的新地址 + 两个新踩的坑

- **新地址**：`http://192.168.110.29:4533`（用户换了住处，服务器地址变了）。
  换地址要同时改 `sdkconfig.local` **和** 设备 NVS —— 见 [[esp-music-sdkconfig-local-trap]]。
- **另一台机器上跑 curl 的鉴权片段**（排查/比对服务器行为时用，不用再翻代码拼 md5）：
  ```bash
  SALT=$(printf '%08x' $RANDOM)
  T=$(printf '%s' "<密码>${SALT}" | md5sum | cut -d' ' -f1)
  AUTH="u=<账号>&t=${T}&s=${SALT}&v=1.16.1&c=esp-music&f=json"
  curl -s "http://192.168.110.29:4533/rest/getStarred2.view?${AUTH}"
  ```
  （`c=esp-music` 必须带，且不能用 `DSub`/`SubMusic` —— legacy 客户端会拿到被裁剪的响应。）
- **⚠️ 坑：`getCoverArt` 对某些专辑会原样透传 WebP，并且【无视 size 参数】。**
  实测 `getCoverArt.view?id=al-65xR0BEKG77PgHYnPkNXFR_0&size=72` → HTTP 200，
  `Content-Type: image/webp`，**69228 字节**（= 原尺寸，不是 72px）。
  前 16 字节 `5249 4646 ... 5745 4250 5650 3858` = `RIFF....WEBPVP8X`。
  服务端日志侧的报错是 `JPEG_DEC: JPEG segment format error` / `JPEG 头解析失败: -5`，屏上表现是"这首歌没封面"。
  **Why:** Navidrome 的图像处理库（Go 的 `disintegration/imaging`）没有 WebP 解码器，
  内嵌封面是 WebP 的专辑它转不了码，只能把原图透传 —— 所以**在 Navidrome 侧无解**，任何 size 都一样。
  **How to apply（客户端侧两道闸，都已在 `subsonic.c` 实现）：**
  1. **下载前按 Content-Length 卡上限**（`http_get_body_lim`，72px 给 16KB 余量）：
     超了连读都不读就放弃 —— 否则每次播到这个专辑都白下 69KB（切歌频繁时很可观）。
     chunked（无 Content-Length）的情况在读取循环里也要卡。
  2. **下完验魔数**必须是 `FF D8`（JPEG）才喂给解码器。
  3. UI 侧再把这类 `coverArt` id 记进**黑名单**（`ui.c` 的 `s_cover_bad[]`，24 条），
     不要每次切歌都重试一遍。
  **为什么有些封面正常**：那些专辑的内嵌封面本来就是 JPEG/PNG，Navidrome 能转码并按 size 缩放（实测 1.3~1.8KB）。
- **`star.view` / `unstar.view` 可用**：设备侧长按 K1 收藏后，`getStarred2` 立刻能查到（实测"冷门 - Ice Paper"在列）。
  响应体很小（139 字节），只看 `"status":"ok"`。
