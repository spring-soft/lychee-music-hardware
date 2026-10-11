---
name: esp-music-m5-web-console
description: esp-music M5 网页控制台——架构、27 个接口、以及四个踩过的坑（URL 解码/封面直出/SRAM 只剩 10KB/扫描去重）
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T04:01:41.258Z
---

**2026-09-25 完成 M5**：网页控制台。设备地址 `http://192.168.110.17/`（mDNS 未做），
设备热点 `ESP-Music-D638` / 密码 `esp-music`（SSID 取 MAC 后两字节自动生成）。
**不设鉴权**（用户明确要求："反正我在局域网里面"）。

**Why:** 这是本项目里唯一"双端"的里程碑 —— 后端 27 个 REST 接口 + 一个 1477 行的单页前端。
四个坑里有三个只有真机联调才会暴露，光看代码看不出来。

**How to apply：**

**1. 代码结构（分层）**
- 新增 `components/assets/`：把 assets 分区 mmap 从 `ui` 里**下沉**成独立组件，改名
  `ui_assets_*` → `assets_*`、`ui_asset_t` → `asset_t`、索引头 `ui_assets_index.h` → `assets_index.h`。
  理由：web_console 要发 assets 里的网页，但方案约定「ui / web_console 互不引用」，
  只有下沉成共同依赖才既满足分层又不重复实现 mmap。新增 `assets_get_by_name("index.html.gz")`。
- 新增 `components/web_console/`：esp_http_server，只调各模块公开接口（player_/subsonic_/
  net_mgr_/settings_），**不碰 LVGL 也不碰音频引擎内部** —— 所以"网页点下一首"和
  "按键按下一首"走的是同一条路。
- 前端在 `assets_src/web/index.html`，单文件零外部引用，gzip 后 **17KB** 进 assets 分区，
  httpd 把 mmap 指针直接 `httpd_resp_send()`（零拷贝）。
- `tools/gen_assets.py` 新增 `assets_src/web/*.html` → gzip → `FMT_WEB_GZ`。
  ⚠️ `name_to_id()` 必须去掉【所有】扩展名："index.html.gz" 只 splitext 一次会生成
  `ASSET_INDEX.HTML` 这种带点的非法 C 枚举名（编译报 `expected ',' before '.'`）。

**2. ⚠️ 坑一：esp_http_server 不做 URL 解码** → 中文搜索必坏
`httpd_req_get_url_query_str` 返回的是**原文**，`q=%E6%98%A5` 拿到的是字面量 `"%E6%98%A5"`。
我把它直接喂给 `subsonic_search()`（那边会再做一次 URL 编码），变成二次编码 →
**英文能搜、中文搜不到**（现象很迷惑）。
修法：web_console 里自己写 `url_decode()`，在 `query_str()` 里解一次。
**故意不把 `+` 转成空格** —— 前端用 `encodeURIComponent`（空格是 `%20`），
把 `+` 当空格会让"搜 a+b"出错。

**3. ⚠️ 坑二：封面代理必须转发【原始 JPEG】，不能给 RGB565**
`/api/cover` 是给浏览器的，浏览器不认 RGB565。所以 `subsonic.c` 拆成两层：
`subsonic_get_cover_raw()`（拿字节 + 校验 JPEG 魔数）和 `subsonic_get_cover_rgb565()`（前者 + 解码）。
实测 144px 封面 5172 字节，`Content-Type: image/jpeg`。
（WebP 那类取不到的直接 404，前端退占位图，**不要刷错误日志** —— 很常见。）

**4. ⚠️ 坑三：内部 SRAM 起播后只剩 10KB（最紧的资源）**
分解：开机 252KB → `内存[after]` 54KB → **起播后 10KB**。
- 起播吃掉约 46KB，是 **httpd + 流式 HTTP 客户端 + 解码器**。
  解码器（`esp_audio_simple_dec`，**预编译库**）**没有"内存区自己给"的接口**
  （翻过 `esp_audio_simple_dec.h`/`esp_audio_dec.h`，只有 `dec_cfg` 给编解码参数，
  没有任何 buffer/mem 注入点），所以**挪不到 PSRAM**，只能接受。
- httpd 自己约 20KB。已做的瘦身：`max_open_sockets=3`、`stack_size=4096`、
  `HTTPD_MAX_REQ_HDR_LEN=2048→768`、`HTTPD_MAX_URI_LEN=1024→384`
  （**这两个是每连接的成本**，乘 socket 数才是硬开销）。
- 实测 3 个 socket + `lru_purge_enable=true` 能扛 8 个并发请求（全 200，
  排队的那几个约 0.6~1.1s），播放不受影响。
- 10KB 连续跑不涨（无泄漏）。但这是**当前最紧的资源**，M7 加蓝牙（要 ~40KB）之前必须再想办法。

**5. ⚠️ 坑四：WiFi 扫描要异步 + 去重**
- `esp_wifi_scan_start(NULL, true)` 同步要 2~4 秒，**在 httpd 任务里会把网页请求卡死**。
  用 `false` + `WIFI_EVENT_SCAN_DONE` 事件取结果（`esp_wifi_scan_get_ap_records`）。
  实测扫描期间**播放完全没被影响**（欠载保持 0）。
- 结果**必须按 SSID 去重**（同名只留信号最强的）：用户家里是多个 AP 共用一个 SSID，
  实测 9 条里 7 条叫"香海合院"，不去重网页上是一串一模一样的名字，根本没法选。
  去重后 3 条。另：隐藏 SSID（空串）直接跳过。
- `/api/wifi/scan/result` 只把**第一个**同名项标成 `current`。

**6. seek 的实现（网页进度条要能拖）**
`seek` = 用 `subsonic_stream_url_at()` 带 `&timeOffset=<秒>` 重新起播，
**并且**要用 `audio_engine_set_pos_base(ms)` 把位置基准挪过去 ——
引擎自己数的帧是从 0 开始的，不设基准进度条会跳回 0。
⚠️ `audio_engine_play()` 内部会把基准清 0，所以**必须在 play 之后设**。
转码流没有 Accept-Ranges（见 [[esp-music-navidrome-verified]]），所以 seek 只能重转，
约 1 秒缓冲等待。

**7. 其它约定**
- 亮度真值放在 **player**（`player_set_brightness`/`player_brightness`），不放在 UI 里 ——
  网页和屏幕都能改，各存一份必然不一致。`/api/status` 里带 `bright` 字段供网页回读。
- `/api/config` **永不返回密码**，只返回 `pass_set: true/false`。
  保存前**必须真的 ping 一次**校验（错地址返回 400 + 明确原因）。
- 不给 id 的 `POST /api/star` = 操作当前正在放的歌；给了 id 就操作那一首（队列里同步更新）。
- `POST /api/play {"id":..}`：队列里有就跳过去；没有（搜索结果点的）就 `getSong` 取回元数据
  追加到队尾再播，这样"下一首"还能继续走。
- 前端每 1000ms 轮询 `/api/status`，**进度条靠 `performance.now()` 前端插值**再被 status 校正；
  不要降到 250ms（httpd 频繁醒会干扰音频）。

**6. 歌词（2026-09-25 加）**
- 后端 `subsonic_get_lyrics()` 把 Navidrome 的
  `subsonic-response.lyricsList.structuredLyrics[0].line[{start,value}]`
  **归一化**成 `{"synced":bool,"total":N,"lines":[{"t":ms,"text":"..."}]}`，
  前端只写一套解析。接口 `GET /api/lyrics?id=`。
- ⚠️ **没歌词时必须返回 ESP_OK + 空 lines（HTTP 200）**，不是错误 —— 大部分纯音乐都是这种。
  用户的服务器对纯音乐会给一行占位文本"此歌曲为没有填词的纯音乐，请您欣赏"，
  后端**识别并去掉**（`strstr("纯音乐")`）。实测三种情况都验过：
  纯音乐→total=0、无时间轴歌词→4 行 synced=false、正常→57 行 synced=true。
- 前端：播放 Tab 内的可滚动面板，当前行高亮、只在**行号变化**时滚一次（用已有的位置插值，
  零额外请求）、**点某一行 seek 到那句**（`POST /api/seek`，复用已有的 1.2s 静默期）、
  按**歌曲 id** 校验回复（不是 gen）防止快速切歌串歌词、LRU 缓存 8 首。
- 首行常是 LRC 元数据行（`<歌名> - <歌手>`），前端在"以 title 开头"时**只从显示里去掉**，
  不改后面的时间轴。

**7. 用户要求去掉播放页那个全宽「随机 30 首」按钮**（腾地方给歌词）。
⚠️ **歌曲 Tab 里的「随机 30 首」来源选项卡要保留** —— 它是"选来源"，和那个按钮不是一回事。

相关：[[esp-music-project]] [[esp-music-m4-keys-player]] [[esp-music-lcd-anim-cost]] [[esp-music-navidrome-verified]] [[esp32s3-i2s-no-apll]]

---

## 2026-09-25 上机后第二轮：**"点歌要顿一下"的三个真因**（有实测数字）

用户的反馈是"点列表里的歌要顿一下才播，网页也卡一下"。查下来是三件事叠加，
**没有一件是"播放慢"**，全是连接层的问题：

**① httpd 默认走 HTTP/1.1 长连接，且没有服务端强制关闭的开关。**
⚠️ `httpd_config_t.keep_alive_enable` 是 **TCP keepalive（SO_KEEPALIVE）**，不是 HTTP 的
`Connection: keep-alive` —— 名字极具误导性，看代码会以为默认是关的。
后果：浏览器保持连接不放，而设备 `max_open_sockets` 有限 → 新的请求排队等 LRU 踢人 + 重连。
**修法：每个响应都 `httpd_resp_set_hdr(req, "Connection", "close")`**（我封了个 `no_keepalive()`）。
实测 6 并发 POST：**0.6~1.1s → 0.26s**。代价是每请求多一次 TCP 握手（局域网 ~2ms），非常划算。

**② `CONFIG_LWIP_MAX_SOCKETS` 是【全局】上限，默认 10 —— 我们刚好顶爆。**
httpd 需要 `max_open_sockets + 3`（IDF 源码注释写明"3 sockets are reserved for internal working"），
我给 6 → 9 个；再加音频流 1 个 + 元数据 keep-alive 1 个 = **11 > 10**。
于是间歇性 `socket()` 失败 → 新连接的 SYN 被丢 → 客户端等 **TCP 初始重传 1 秒**。
**辨识特征**：绝大多数请求 20~70ms，**偶尔冒出 1.06s / 1.3s 的尖峰**。
改成 `CONFIG_LWIP_MAX_SOCKETS=16` 后并发不再丢请求。
（残留的偶发 ~300ms 是 WiFi 层抖动，不是 socket，软件层面无解。）

**③ 点队列外的歌会多一次 `getSong` 往返（实测 200~800ms）。**
队列里没有的歌（搜索结果、收藏列表里点的）要去服务器取元数据。
**修法：`POST /api/play` 现在接受可选的 `title/artist/album/cover/dur_s/starred`** ——
前端把列表里已有的字段一起发过来，设备侧 `player_play_song(&meta)` 直接用，不再请求。
**实测 POST 24ms 返回**，设备日志里直接就是流请求。
⚠️ 前端为此加了体积保险：字段加起来超 700 字节就退回只发 `{id}`；
`BODY_MAX` 相应从 1024 提到 **2048**（缓冲在 PSRAM，不影响内部 SRAM）。
剩下的 ~300ms 是"重连流 + 起播预取"的固有代价（换歌路径里还有 120+60ms 的防爆音静音等待）。

**4. 两个容易误判的指标**
- **`underruns` 是【每首歌重置】的计数器**（`audio_engine_play()` 里 `s_underruns = 0`），
  不是累计值。看到"欠载 7"先别慌，静置 15 秒不涨就是压测那一轮burst造成的。
- **WiFi 扫描不会断音**：扫描 3 秒期间欠载保持 0，`ring_in` 一直满着 128KB ——
  预取缓冲把它吃掉了。这条专门验过。

**5. 前端（第二轮重构）**
用户嫌"所有功能都在一个竖列上太繁琐"，改成**底部三 Tab（播放/歌曲/设置）+ 常驻迷你播放条**。
代码在 `assets_src/web/index.html`，**Tab 栏是 JS 动态生成的**（HTML 里是空 `<nav>`），
所以一旦 JS 早期抛异常整页空白 —— 没法渲染浏览器时，**值得做的静态检查**是：
把 JS 里所有 `$('id')` / `getElementById` 引用的 id 和 HTML 里声明/模板生成的 id 对一遍
（能抓出"引用不存在的元素 → null 崩 → 白屏"），再确认 `init` 的调用分支
（`if(document.readyState==='loading') addEventListener('DOMContentLoaded',init) else init()`）。
性能上要求前端：**最多 2 个请求在飞**（设备 socket 宝贵，这条是延迟关键）、
列表**事件委托 + 单次最多 60 行**、换歌**只改两行 class** 不重建整表、
**点行不等 POST 返回**就乐观更新。
实测 6 并发 status：总耗时 0.14s，单次 90~136ms。
⚠️ 页面体积：未压缩 **74355 字节**，gzip 后 **21712 字节**（gzip 约 29%）。
