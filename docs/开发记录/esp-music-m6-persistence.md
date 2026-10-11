---
name: esp-music-m6-persistence
description: esp-music M6 落盘（cache 分区 FATFS）：两个静默失败的 bug、8.3 文件名、不能用 mtime 做 LRU、续播打包成一个 NVS 键
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T06:59:15.660Z
---

**2026-09-25 做的 M6**：最近播放/收藏落盘到 `cache` 分区（FATFS + 磨损均衡）+
收藏跟 Navidrome 双向一致 + 开机续播上次位置 + 封面缓存。新增组件 `components/store/`。

**Why:** 这一轮的 bug **全是"静默失败"**，比崩溃难查得多 —— 两个都是我自己写的东西
返回错误码但没打日志，表现成"功能看起来没生效"。记下来免得重犯。

**1. ⚠️⚠️ FATFS 的 `rename` 【不覆盖】已存在的目标**
`ff.c` 的 `f_rename` 走 `follow_path(path_new)`，发现同名就返回 **FR_EXIST**
（VFS 翻成 errno 17）。所以"写 .TMP 再 rename"这种原子写法**只有开机后第一次成功**，
之后每次都被拒。实测症状：`E store: 写 STAR.SC 失败（errno 17，累计 1 次）`，
而设备照常运行、只是数据再也没更新过。
**修法**：rename 失败且 `errno == EEXIST` 时先 `unlink(path)` 再 rename。
中间有个极短空窗（既无旧文件也无新文件），但**永远不会留下半个文件** —— 半个才是真损坏。

**2. ⚠️⚠️ 校验 8.3 文件名时别把整个路径当一段**
`build_tmp()` 里我图省事用 `name_is_83(out + strlen("/fs") + 1)` 校验了
"COVER/08D1A2B3.TMP" 这种**含 `/` 的整串** → `/` 被判非法 → 返回 INVALID_ARG。
后果：**所有子目录里的文件（封面缓存）写入全部静默失败**，`/fs/COVER` 永远是 0 个文件。
**教训：这种"提前失败"的分支必须打日志**，否则你只会看到"缓存没生效"而毫无线索。

**3. ⚠️ 长文件名是关着的（`CONFIG_FATFS_LFN_NONE=y`）→ 名字必须严格 8.3**
实测 `create_name` 在 `i >= ni` 时直接 `return FR_INVALID_NAME` —— **超长是创建【失败】，
不是截断**（名字 ≤8 字符、扩展名 ≤3）。所以项目里统一用大写短名：
`RECENT.RC` / `STAR.SC` / `PEND.OP` / `RESUME.RS` / `COVER/<8位哈希>.565`。
（`recent.json` 这种 11 字符的名字**就是不合法的**。）
刻意不打开长文件名：要多一套 LFN 缓冲，而内部 SRAM 已经很紧。
封面文件名是 cover id 的 FNV-1a 32 位哈希 → 会撞 → **文件头里再存一份原 cover id**，
读的时候对一下，撞了就当没缓存（不至于显示错封面）。

**4. ⚠️ 不能用 mtime 做 LRU 淘汰**
设备**没有 RTC 也没有 SNTP**，`time()` 返回的是"开机以来的秒数"。
FATFS 的 DOS 时间把年份钳在 1980 以上但保留时分秒 —— 所以同一轮开机内相对顺序是对的，
**可一旦重启时钟归零，上一轮写的文件就比刚写的"更新"**，按 mtime 淘汰会先删掉最新的那批。
改用**目录顺序**（FAT 的 `f_open` 复用最靠前的空闲目录项，所以越靠前越旧）做 FIFO 淘汰。

**5. 续播位置打包成【一个】NVS 键**
`resume` = `"<歌曲id>|<毫秒>"`。拆成 `lastid` + `lastpos` 两个键的话，
"换成新歌"和"位置归零"是两次写入，中间掉电会得到"新歌 + 上一首的位置"。
一个键一次写入，不存在这种中间态。每 20 秒记一次（`settings_set_str` 立即落盘）。
⚠️ 开机续播**只在"队列第一首恰好是上次那首"时才接**（换了来源接着放反而不合常理）。

**6. FATFS 的 RAM 不占内部 SRAM**（对 M7 很重要）
`CONFIG_FATFS_ALLOC_PREFER_EXTRAM=y`（默认 y）让 FATFS 的缓冲走 PSRAM；
`CONFIG_WL_SECTOR_SIZE=4096` 时 WL 用的是 `WL_Flash`（没有大缓冲，`wl_mount` 只 malloc
一个很小的对象）。实测起播后内部 SRAM **还是 10~14KB，跟 M5 记录的一样**，
没有因为加了文件系统更糟。**M7 的 BLE（约 40KB）依旧放不下，问题状态不变。**
（`CONFIG_FATFS_PER_FILE_CACHE=y` → 每个 FIL 带 4KB 缓冲，靠 EXTRAM 那个开关进 PSRAM。）

**7. 首次上电分区是空白 → 必须 `format_if_mount_failed = true`**
`wl_mount()` 对空白分区**总是成功**（只是分配对象、识别 flash），
真正失败的是 FATFS 读引导扇区（FR_NO_FILESYSTEM）→ 这时才格式化。
实测格式化 + 挂载约 10ms 级，6MB 分区给出 5920KB 可用。开机排在**播放之前**（step 6/7）。

**8. 收藏双向一致的做法**
- `player` 里维护一份本地镜像（64 首，跟 `SUB_SONGS_MAX` 对齐）+ 一个**待重试队列**。
- 收藏/取消收藏：**先改本地（界面立刻翻）→ 再推服务器 → 推不出去就排队**，
  每分钟补发一次，同一首只留最后的意图（先收藏又取消 = 什么都不用发）。
  以前是"服务器写失败就什么都不做"，用户按收藏会看起来毫无反应。
- 切到"我的收藏"来源时强制对一次账；`/api/starred` 直接读本地镜像（毫秒级返回），
  同时**异步**踢一次刷新，`/api/status` 里带 `starred.gen` —— 前端看到 gen 变了
  就静默重拉（不要清空列表，否则点一次心形整页闪一下"正在加载"）。

**实测验收（2026-09-25）**：
- ✅ 落盘：`收藏已落盘（18 首）`、`最近播放已落盘（N 条）`，`fails=0`
- ✅ 重启恢复：两次连续重启都 `cache 恢复到内存：最近播放 N / 收藏 18 / 待重试 0`
- ✅ 续播：`续播：... 从 151857ms 接着放`，与上一次落盘的位置**一模一样**（毫秒级对得上）
- ✅ 封面缓存：`封面命中缓存: mf-vCRUAX3ntWjoFjEZzmoI9Z_6a5a2cb6`，目录计数 1→2 增长
- ✅ 双向：API 取消收藏 → 本地镜像立刻少一首 → 强制对账后**服务器给的列表里也没有了**；
  再收藏 → 服务器列表里回来了；全程 `pending=0 synced=true`
- ⚠️ **没做故障注入**：`/api/config` 会先 ping 校验再保存，没法把 host 改成不可达来
  制造"收藏发不出去"的场景；改 WiFi SSID 会让设备离开局域网、失去 Web 控制台（只能靠
  SoftAP 救），所以**待重试队列的在线补发没有被真机验证过**，只验了它的落盘管道。

相关：[[esp-music-project]] [[esp-music-m4-keys-player]] [[esp-music-m5-web-console]]
[[esp-music-navidrome-verified]] [[esp-music-lcd-text-and-state]]
