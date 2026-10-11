# ESP-Music　M9：TF 卡离线曲库 + 旋转编码器 + 在线/离线双模式

> 2026-10-06。这一轮是**为 V2（PCB）板提前写代码**：板子还没做好，所以目标是
> "写完 + 编译通过 + 逻辑可静态验证"，真机验证等板到货（清单见文末第 7 节）。

---

## 0. 一句话结论

固件现在是**一份代码、两种板型**：面包板变体把新硬件全部编成空实现（行为与今天等价），
V2 变体才真的编入编码器、TF 卡与离线模式。切换只需 `sdkconfig.local` 里一行板型开关。

### 怎么编 V2（PCB）固件

**用 `firmware/tools/build_v2.sh`**（2026-10-06 新增），别手改 `sdkconfig.local`：

```bash
cd /e/program/esp-music/firmware
tools/build_v2.sh                        # 等价于 build
tools/build_v2.sh -p COM5 flash monitor  # 烧录
```

它临时往 `sdkconfig.forced` 加一行 `CONFIG_BOARD_VARIANT_BREADBOARD=n`
（`sync_sdkconfig.py` 先应用 local 再应用 forced，所以 forced 能压过板型），
编完/失败/被 Ctrl-C 都会在 trap 里把那行撤掉，**全程不碰含密码的 `sdkconfig.local`**。
换板型会自动先 `fullclean`（引脚宏影响多个组件的条件编译，增量编译会留旧目标文件）。

面包板变体不需要脚本，直接 `/e/Espressif/idf.sh build` 就是。

⚠️ **第一版已功能完整，但一行都没在真机上跑过** —— 全部是编译验证。
上板第一轮要做的就是文末第 7 节那份校准清单。

---

## 1. 双线隔离机制（用户明确要求"两条线不要互相干扰"）

三层，从外到内：

| 层 | 机制 | 位置 |
|---|---|---|
| 1 | `CONFIG_BOARD_VARIANT_BREADBOARD` 仍是唯一板型真相源 | `main/Kconfig.projbuild` |
| 2 | `BOARD_HAS_ENCODER` / `BOARD_HAS_TF` **由板型派生**（不是各自一个 Kconfig bool） | `components/board/include/board.h` |
| 3 | 派生为 0 时：编码器 PCNT 代码不编译、SD 驱动编成空实现、`ui_keys_encoder_init()` 是空函数 | 各组件 `#if` |

**为什么派生而不是给两个 Kconfig 开关**（这条踩过同类的坑）：
`sdkconfig` 里一旦写进过某个符号的值，Kconfig 的 `default` 就**不会**再跟着板型重新求值 ——
换板型后必然留下"面包板变体 + 硬件开关=开"这种自相矛盾的状态。
派生就没有这个状态：改板型那一行，两个开关一起变。

调试覆盖用 `CONFIG_BOARD_FORCE_ENCODER` / `CONFIG_BOARD_FORCE_TF`（`default n`，
往 `sdkconfig.local` 里加一行即开）—— 想提前在面包板上接一个 EC11 / microSD 模块验证时用。

---

## 2. 编码器（`components/encoder/`，新）

- 硬件：HYCW03-2.8D-5P-S，增量式 **12 节点 / 12 脉冲**；`ENC_A=IO9` `ENC_B=IO10` `ENC_SW=IO11`。
  接线表确认 A/B/SW **各有 10k 外部上拉**（R18/R19/R20），A/B 还各挂 100nF 到地（C26/C27），
  编码器公共端接地 → 与 K1-K4 一样**低电平有效**。
- 解码：**PCNT 硬件**，IDF 标准两通道 x4 接法（A 相边沿 + B 相电平，另一通道对调），
  1us 毛刺滤波；20ms 轮询 `get_count` + `clear_count`。
- 一格 = 4 个计数（12 脉冲/12 节点 → 一格一个正交周期 → 4 个边沿）。
  **`ENCODER_PULSES_PER_DETENT` 是唯一需要真机校准的常数**（`encoder.c` 顶部）。
- 加速：一轮攒到 3 格 ×2、6 格 ×4；单次上限 20 步（防异常尖峰）。
- 按下走既有 `espressif/button`（700ms 长按，与 K1-K4 一致）。

**UI 键位表**（`ui_keys.c` 的 `enc_rotate_one` / `enc_press_short`，**只在一处判**）：

| 页面 | 旋转 | 按 |
|---|---|---|
| 播放页 | 下一首 / 上一首 | 播放暂停 |
| 列表页 | 下/上一行 | 播放选中 |
| 菜单 / 来源 / 设置 | 下/上移 | 确认（含两段确认） |
| 音量页 | 音量 ±5（顺时针=加） | 静音切换 |
| 搜索方式 / 结果页 | 下/上移 | 确认 |
| 搜索输入页 | 光标**向右** / 向左 | 输入该字母 |
| 蓝牙遥控页 | 对端上/下一首 | 对端播放暂停 |
| 系统信息 / 内存页 | 无 | 无 |
| 任意页**长按** | — | 回播放器（直接复用 `k4_navigate(3,true)`） |

⚠️ 搜索输入页是**横向**光标（用户指定 K1=向右），所以"顺时针→K1"与列表页相反；
这里按页面显式映射，别想找统一规律。
⚠️ **K1/K2 语义一律没动** —— 面包板上它们是唯一入口，删了就没法用。

---

## 3. TF 卡（`components/sd_card/`，新）

- `TF_CS=IO12` `TF_MISO=IO13` `TF_CD=IO14`；**与屏幕共用 SPI2**（CLK=IO4 / MOSI=IO5），靠 CS 区分。
- **懒挂载 + 用完卸载**：进离线模式才挂，回在线就卸。
  理由：在线模式起播后内部 SRAM 只剩 10~15KB，而 SDSPI+SDMMC 要在内部 RAM 再吃一份。
  卸载就是把这份内存还回来 —— 这是"两条线互不干扰"在内存上的落地。
- `format_if_mount_failed = false`（**这一行是整份代码里最不能改的**：卡上是用户的音乐）。
- 只读用户文件；本组件一个字节都不写（写索引的是 musiclib，且只写它自己那一个文件）。

### 3.1 顺带解决掉的高风险项

交接文档第 8 节把"把 SPI2 初始化从 `ui_display.c` 提到 `board.c`"列为**高风险**。
核实后**不需要搬时序**：`esp_vfs_fat_sdspi_mount()` 内部调 `sdspi_host_init_device()`，
只要求总线**已初始化**（`sdspi_host.h` 的注释写明了），而总线在开机第 3 步 `ui_start()`
就建好了，SD 挂载是用户触发、远在其后。

所以只做了一处薄封装：`ui_display.c` 里那行 `spi_bus_initialize(...)` 改成调
`board_spi_bus_init()`（幂等、参数不变），让"总线归谁"有个说法，**零时序变化**。

**唯一的实质差异**：`miso_io_num` 从 `-1` 改成 `BOARD_PIN_TF_MISO(13)`
（屏幕是只写设备用不到 MISO，而 SDSPI 必须有）。GPIO13 在本工程无其它占用。
其余字段（SCLK/MOSI/`max_transfer_sz=5120`/DMA 通道）与原来完全一致。

---

## 4. 离线曲库（`components/musiclib/`，新）

- 元数据来自**文件名**（用户已确认）：`艺术家 - 标题.ext`，以**第一个** `" - "` 切分
  （这样 `Artist - Title - Remix` 的 Remix 留在标题里）；去前导音轨号
  （数字后必须跟 `- . _ )` 才算音轨号，否则 `2002年的第一场雪` 会被切坏）。
- 不解析 ID3/FLAC 标签 → **离线曲目的时长在首次播放前是未知的**（显示 `--:--`）。
- 索引：`/sdcard/ESP-MUSIC.IDX`，头部 `magic + version + count + rec_size + CRC32`，
  记录是紧凑的 `musiclib_rec_t`（≈372B/首）。
  ⚠️ 刻意**不做"写 TMP 再改名"**那种原子写：索引可重建，用 CRC 校验不过就当"没有索引"
  提示重扫，比在卡上多做一次 rename 更简单也更不容易出新 bug。
- 常驻 **PSRAM**：2000 首 × 372B ≈ 744KB（索引数组一次性分配）。
- 扫描任务：core 0 / 优先级 3 / **栈在 PSRAM**，用显式目录栈（深 8 / 栈容 24）迭代遍历。
- 搜索**不需要拼音索引**：屏上拼音输入法输出的已经是汉字，所以只做 UTF-8 子串匹配
  （ASCII 忽略大小写）。这一条省掉整整一套拼音倒排。

**FATFS 长文件名是前提**（`sdkconfig.forced`）：TF 卡上是用户自己的音乐，
名字几乎必然是长的带中文的，而非 LFN 配置下超 8 字符是**打不开**（`FR_INVALID_NAME`），
不是截断 —— 关着 LFN 连一个文件都读不出来。

```
CONFIG_FATFS_LFN_NONE=n      # 必须显式写 =n：sync_sdkconfig.py 是按行覆盖的
CONFIG_FATFS_LFN_HEAP=y      # FF_USE_LFN=3：缓冲在堆上（不是栈，不进 BSS）
CONFIG_FATFS_API_ENCODING_UTF_8=y   # readdir/f_open 直接吃 UTF-8，中文不乱码
CONFIG_FATFS_MAX_LFN=255
```
配合既有的 `CONFIG_FATFS_ALLOC_PREFER_EXTRAM=y`，那份 512B 的 LFN 工作缓冲走 PSRAM，
**不吃内部 SRAM**；真正的增量是 flash 里的 `ffunicode.c` 码表。
对既有 `cache` 分区向后兼容（LFN 是 8.3 的超集，`store` 的 `name_is_83` 保持不动）。

---

## 5. 在线 / 离线双模式（`player`）

- 单一真相源：`player_mode()`；持久化在 NVS `cfg/mode`（**立即落盘**，不是 lazy ——
  用户切完可能马上断电）。快照 `player_status_t.mode` 供 UI/网页只读。
- **来源枚举刻意不变**：同一个 `RECENT/STARRED/RANDOM` 在两种模式下指向不同数据源。
  于是 NVS 的来源下标、来源二级菜单、网页 `/api/sources` 全都不用改。
- **歌单分开的实现是"文件名随模式切换"**，不是内存里两份列表：
  `f_recent()`/`f_star()` 按 `s_mode` 返回 `RECENT.RC|STAR.SC`（在线）
  或 `RECOF.RC|STAROF.SC`（离线）。切换时**先按旧模式存盘 → 再改 s_mode → 再载新文件**
  （顺序反了就会把在线列表写进离线文件）。
  好处：省约 75KB PSRAM，收藏/最近播放那套代码一行都不用分叉。
- 播放分派：`start_index_from()` 看 `song.path[0]` ——
  非空走 `ae_source_file_new()`（本地文件），空走原来的 URL + HTTP。
- **离线 seek 降级为"从头播"**并打日志：`ae_source_t` 没有 seek，压缩流也没法把毫秒
  换算成文件偏移。真要做需要 decode-and-discard（后续项，见 `audio_source_file.c` 顶部）。
- 离线收藏是**纯本地行为**：写离线列表，不推服务器、不进待重试队列；
  `pend_retry_tick()` 在离线模式下直接返回。
- 缓冲：`sub_song_t` 新增 `char path[192]`（并一起落盘，JSON 键 `"p"`）。
  `sizeof(sub_song_t)` 468 → 660B，代价见第 6 节。

### 5.1 UI 落点（用户指定"插在设置上面"）

主菜单 `MENU_N` 5 → 6，正好填满一屏（原第 6 行的空位变成"系统信息"，不再有空行）：

```
0 来源: X   1 搜索   2 屏幕亮度   3 模式: 在线/离线   4 设置   5 系统信息
```

"模式"项 K3 **两段确认**（第一次变成"切到离线？再按K3"，再按才切；一移动光标就取消）。
⚠️ 文案宽度：菜单行只有 136px / 12px 字，`模式: 离线？再按K3确认` 约 158px 会被截掉"确认"，
所以确认态换成 `切到离线？再按K3`（约 92px）。

设置二级菜单 `SET_N` 1 → 2：

```
0 重连 WiFi
1 在线模式 →「同步收藏到离线」／离线模式 →「扫描 TF 卡」
```
确认态从"一个 bool"改成"记哪一项在确认"（`s_set_confirm_sel`）——
加到两项之后，一个 bool 会让"在第 1 项确认完、移到第 2 项"带着确认态。

### 5.2 设置页第 2 项的真实现（两个动作都在这一个位置）

| 模式 | 行文字 | 按两次 K3 之后 |
|---|---|---|
| 离线 | `扫描 TF 卡` / 扫描时 `扫描中 N 首` / 扫完 `扫描 TF 卡（N 首）` | `musiclib_scan_start()` —— 后台任务，UI 每 250ms 读进度重画 |
| 在线 | `同步收藏到离线` / 同步时 `同步中` / 之后 `上次同步 已同步/总数` | `player_sync_to_offline()` —— 见下 |

**同步的实现要点**（`player.c` 的 `handle_sync_to_offline`）：
同步是**在线模式下**触发的，但要在卡上的曲库里找 —— 而在线模式平时是**卸载**卡的
（内存取舍）。所以同步会**临时挂卡 → 载索引 → 匹配 → 写离线收藏文件 → 卸卡清索引**，
结束就把内部 SRAM 还原，不会让"同步一下"永久多占一份 SD 驱动内存。

匹配用 `musiclib_match()`：先按「标题 + 艺术家」都归一化后比对，**两遍**——
第一遍要求艺术家也能对上，第一遍颗粒无收才退回"只比标题"
（在线元数据的艺术家常带 `feat. X`，卡上却是干净的名字）。
已经被收藏过的不会重复添加。**只写离线收藏文件，在线收藏一个字节都不动。**

### 5.3 网页控制台（新增 3 个接口）

| 接口 | 方法 | 作用 |
|---|---|---|
| `/api/mode` | GET / POST | 读 / 切模式（`online`/`offline`/`0`/`1` 都认，JSON 体与 query 都收）。切换是异步的，立即返回 `changed`，前端轮询 `/api/status` |
| `/api/scan` | GET / POST | POST 起扫描，GET 查进度。**刻意的设计**：`musiclib_scan_start()` 对"正在扫"和"卡没挂上"返回同一个 `ESP_ERR_INVALID_STATE`，所以这里事后自己判一次并给出 `why`：`started` / `busy` / `no_card` / `not_mounted`（"稍等"和"去插卡"对用户是两回事） |
| `/api/sync_offline` | GET / POST | 收藏同步的启动与进度 |

同时扩展：`/api/status` 加 `mode` / `mode_name` / `lib{...}`；`/api/debug` 加 `sd{...}` 与 `musiclib{...}`（真机排障主要看这两个）。
`/api/search` **按模式分派** —— 离线时搜本地曲库。这一条不是优化而是契约：
在线搜出来的歌没有本地路径，点它会走 HTTP 播放，于是"离线模式"下放出网络流、
还会被排进本地队列让"下一首"串台。

⚠️ **`max_uri_handlers` 从 32 提到了 40，实际用了 38 条**（新增三个接口各占 GET+POST 两个槽，
共 6 个）。**只剩 2 个余量** —— 以后再加路由必须同时改这个数，否则 `httpd_start` 会失败、
整个网页控制台起不来。

模式变化由 `ui_mode_follow()` 跟随，**必须由 `ui.c` 的 tick 无条件调用**
（和 `ui_bt_mode_follow` 同一个坑：塞进 `ui_pages_tick()` 的话，停在播放页时根本不跑）。

---

## 6. 实测数据（本轮）

| 项 | 数值 |
|---|---|
| 面包板变体固件（最终） | 2,494,352 B（P3 时）→ 之后 P6/P7 的改动也在这条线上 |
| V2 变体固件（含 SDSPI/SDMMC/曲库/离线模式/网页接口） | **2,548,048 B**（app 分区 3,145,728 B，用 81.0%，剩约 19%） |
| 编码器真实代码的增量 | +2,240 B（V2 vs 面包板，同一阶段对比） |
| LFN 对新旧配置 | 编译无 error；`CONFIG_FATFS_LFN_HEAP/API_ENCODING_UTF_8` 已进 `build/config/sdkconfig.h` |
| 新增 UI 汉字 | 266 → **280 个**，逐个核对 **全部已在 `charset.txt`（7311 字，GB2312+假名）里** → **无需重造字体** |
| 两变体编译 | 面包板 & V2 各自 `fullclean && build` 通过，**零新增警告** |

### 6.2 顺手挖出一个既有 bug：网页控制台的路由槽位本来就爆了

`httpd` 是**按 method 分别占槽**的（`/api/quality`、`/api/wifi`、`/api/hid` 都是 GET+POST 两条），
而改之前 `uris[]` 里是 **33 条**，`cfg.max_uri_handlers` 却是 **32** —— 于是**最后注册的那条
`/api/hid/send` 从注册起就一直失败**（`ESP_ERR_HTTPD_HANDLERS_FULL`），代码里只留一行
`ESP_LOGE`，网页看到的就是 404。

已核实（`git show HEAD` 数出来正好 33 条、末条是 `/api/hid/send`），并已放宽到 **40**
（现在 39 条），代码里加了"改这几行要一起数"的注释。
⚠️ 现在只剩 **1 个槽位余量** —— 以后再加路由必须同时改 `max_uri_handlers`，
否则又会出现"新接口静默 404"这种最难查的现象。

### 6.1 字库这件事值得单独记一笔

原本担心"新增中文要重跑 lv_font_conv + 源字体（Linux 上的 `DroidSansFallbackFull.ttf`，
本机没有）"会变成阻塞项。实际不是：字库是**按 GB2312 字符集**生成的（`charset.txt` 7311 字），
而 UI 新增的那些字（模/离/扫/描/卡/切/跳/过/请…）**全是 GB2312 常用字，早就在字库里**，
只是没被 `ui_text_chars.h` 列进去（那个文件只列"UI 源码里实际用到的"）。
所以只需要重跑纯 Python 的 `tools/gen_ui_text.py`（秒级、无网络、无字体依赖）。

---

## 7. ⚠️ 真机到货后的校准清单（板子到了照着做）

| # | 项 | 位置 | 期望 / 做法 |
|---|---|---|---|
| 1 | **屏幕方向/色序/偏移** | `ui_display.c` 的 `s_mirror_x/y`、`s_swap_xy`、`s_invert`、`s_bgr`、`gap_x/y` | 这几个值是按**面包板那块屏的批次**实测的。同款屏不同批次仍可能不同 → 用 `UI_CALIBRATE` 开机色带自校准跑一次 |
| 2 | **LCD SPI 时钟 40MHz** | `ui_display.c` 的 `io_cfg.pclk_hz` | ⚠️ **不是预判问题，是最便宜的排查旋钮，且排在最后**。接线表已核对：V2 屏线**直连、无串阻**（每条只有 `J3.x + U1.x` 两个连接点，BOM 里所有电阻都对得上别的用途），整条链路唯一的阻尼就是 ESP32 输出阻抗。面包板用同款屏+同控制器在 40MHz 能跑（证据偏向"没问题"），但**面包板跑通不能严格证明 PCB 跑通**——杜邦线的分布电容会把边沿变圆、顺手压掉振铃，PCB+FPC 的边沿更陡。**只在"花屏/随机噪点/偶尔一行歪"时才降**到 20~30MHz；偏色查色序、整体偏移查 mirror/gap，都与时钟无关。代价：整屏 40KB，40MHz ≈ 8ms、20MHz ≈ 16ms |
| 3 | **ES8388 音量曲线** | `board_vol_set()` 的模拟/数字混合阈值 | 原阈值是按**带 PAM8406 功放**的面包板定的；V2 去掉功放改成耳放直推，同样百分比听感会变，要重听一遍 |
| 4 | **编码器每格计数** | `encoder.c` 的 `ENCODER_PULSES_PER_DETENT`（默认 4） | 拧一格看串口 `encoder_raw_counts()` 涨几个：涨 4 对；涨 2 改 2；涨 8 改 8 |
| 5 | **编码器方向** | `encoder.c` 两个通道的 `edge_action` | 顺时针却是"上一首"就把两个通道的 INCREASE/DECREASE 对调 |
| 6 | **RC 时间常数** | 硬件（10k × 100nF ≈ 1ms）+ PCNT 1us 滤波 | 快速旋转若丢格，考虑减小 C26/C27；先看 `encoder_clamped_counts()` 是否为 0 |
| 7 | **SD 挂载与吞吐** | `sd_card.c` 的 `host.max_freq_khz = 20000` | 挂不上先看日志的 errno；播放卡顿就压到 10MHz |
| 8 | **SD 与屏幕共用 SPI2 的争用** | — | 离线播放时同时有封面/动画刷新，看欠载计数（`audio_engine_underruns()`）是否上涨 |
| 9 | **内存余量** | 串口 `SRAM[...]` 每阶段打点 | 重点看"进离线模式（挂卡）后内部 SRAM 掉多少"；若见底就把 SD 时钟降下来或缩短索引 |
| 10 | **不存在的路径** | `favorites` 里指向已删文件 | 应表现为"这首播不了 → 自动跳下一首"，不是卡死 |

### 7.1 ⚠️ 上板看到"屏不对"时，按症状分流（别一上来就降频）

新板第一次点亮，绝大多数"屏坏了"其实是**校准值**问题，而且**看起来都很像**。按这张表查能省一轮：

| 现象 | 先查 | 跟 SPI 时钟有关吗 |
|---|---|---|
| 整体偏色（发紫、红蓝互换、变负片） | **BGR / invert 色序** → 跑 `UI_CALIBRATE` 色带自校准。面包板上就踩过"整体偏紫"，根因是字节序+通道顺序两个错叠在一起 | 无关 |
| 图像整体偏移、边缘多一条、镜像反了 | **mirror_x/y / swap_xy / gap_x/y** | 无关 |
| **花屏、随机噪点、闪一下就对了** | **SPI 时钟**（第 2 项）← 这才是降频的对象 | ✔ |
| 偶尔一行歪、局部错位 | 时钟或走线 | ✔ |
| 有背光但全黑 | 接线 / RST / CS / 背光极性 —— 跟时钟无关 | 无关 |

**已知未做（明确列为后续）**：
- **离线 seek 仍是"从头重播"**（这一版刻意不做）。理由：`ae_source_t` 没有 seek，
  压缩流没法把"毫秒"换算成文件偏移，唯一正确的做法是 decode-and-discard
  （在 decode 任务里解出来丢掉直到目标位置）—— 那要动**全工程最精细、
  也是唯一被真机充分验证过**的那条音频管道（解码/预缓冲/欠载统计/位置推算）。
  为了一个"快进"去冒回归在线播放的风险不划算，等板子到了、那套管道能随时实测时再做。
  现在的行为是有日志的（`离线模式不支持快进：这首从头播`），不是静默失效。
- 标签解析（离线曲目的时长显示 `--:--`、封面用占位图）
- 卡热插拔自动重挂
- 把 TF 卡当在线缓存、K1/K2 语义重定义

---

## 8. 这一轮踩到的工具坑（都不是产品 bug，但很费时间）

1. **⚠️⚠️ 不要用 PowerShell 的 `Get-Content` / `Set-Content` 改 UTF-8 文件。**
   我改 `sdkconfig.local` 里一行板型，中文注释被按 ANSI 读入、再按 ANSI 写出 →
   文件变成 GBK，`kconfgen` 直接 `UnicodeDecodeError` 挂掉（configure 失败）。
   正确做法：用 `[System.IO.File]::ReadAllText/WriteAllText` + 显式 UTF-8(无 BOM)，
   或者干脆用文件编辑工具；**更稳的是根本别碰那个文件**。
   最终验证 V2 变体用的是"往 `sdkconfig.forced` 临时加一行板型"——
   `sync_sdkconfig.py` 先应用 local 再应用 forced，所以 forced 能覆盖，全程不碰凭据文件。

2. **`components/<name>/` 下有目录但缺 `CMakeLists.txt`，IDF 会直接 CMake Error**
   （报 "does not contain a CMakeLists.txt file"，且两个变体一起失败）。
   新增组件时三件套要一起建。

3. **`cmd | tail -N` 会吞掉退出码**：`bash -c 'build | tail'` 的 `$?` 是 `tail` 的。
   必须把输出重定向到文件、再 `echo "EXIT=$?"`，否则"exit 0"是假的。
   （本项目还额外踩了一次：PowerShell 双引号里 `$?` 会先被 PowerShell 展开成 `True`。）

4. **`.NET` 静态方法的相对路径按【进程】当前目录解析**，不是 PowerShell 的 `location`。
   混着用 `cd` 和 `[IO.File]` 会得到莫名其妙的 FileNotFound。统一用绝对路径。

---

## 9. 相关文档

- [[esp-music-m4-keys-player]]：K4 统一出口那条教训（编码器分发沿用了同样的"只在一处判"）
- [[esp-music-m6-persistence]]：FATFS 8.3 / rename 不覆盖 / 不能用 mtime 做 LRU
- [[esp-music-fonts]]：字库吃 PSRAM（约 24 字节/字形）、4bpp 的必要性
- [[esp-music-display-calibration]]：色带自校准怎么用
- `docs/踩坑与设计记忆/esp-music-tfcard-plan.md`：本轮的原始计划（已一并重建）
