# 2026-11-15 QQ 收藏歌单 → Navidrome 曲库 同步记录

## 结论先说

一次完整的"QQ 收藏补进本地曲库"落地了，并**固化成可复用工具**：

```bash
sync-fav --dry-run   # 只看还缺多少
sync-fav             # 真同步（默认 2 轮重试）
```

- 工具：`/opt/qqmusic/sync_fav.py`（仓库：`server/_scratch/ref/qqservice/tools/sync_fav.py`）
- 文档：`/opt/qqmusic/README-sync-favorites.md`（仓库：`deploy/README-sync-favorites.md`）
- 归档：`/opt/qqmusic/data/sync_report_2026-11-15.json` + 当天日志/结果 JSON

## 本次数据

| 项目 | 数值 |
|---|---|
| QQ 收藏 | 933 首 |
| Navidrome 同步前 | 813 首 |
| Navidrome 同步后 | **956 首**（+143） |
| 下载音质 | SQ 无损 flac 130 + HQ/最高可用 mp3 26 |
| 封面 | 154/156 内嵌封面（2 首 QQ 无封面） |
| 歌词 | 149/156 有 `.lrc`（7 首 QQ 本身无歌词） |
| 文件完整性 | ffprobe 全通过 |
| 无法下载 | 21 首付费单曲（`result=104003 无播放权限`，绿钻不够） |

## 流程（脚本 7 步）

1. 分页读 QQ 收藏（每页 100，带重试）
2. 读 Navidrome sqlite 建索引，按 **歌名 + 歌手(交集) + 时长(±3s)** 判重
3. 缺的按 40 首一批提交 `/v1/download/add`，排空再下一批
4. 多轮重试（QQ 接口偶发超时）
5. 补歌词：扫 `QQ下载/` 缺 `.lrc` 的音频，按文件名反查收藏 mid → `/v1/lyric`（纯文本 LRC）→ UTF-8 无 BOM
6. 质检：ffprobe 查内嵌封面/时长，统计歌词覆盖
7. 报告：`data/sync_report.json`（全量）+ `sync_noauth.json`（付费单曲清单）

## 本次踩的坑（都已修）

1. **下载器装盘校验路径写错**：检查 `MUSIC_DIR/name`，实际装在 `DL_DIR/name`
   → 每首都误报"装进曲库失败"，并且**歌词步骤被跳过**（表现：下了歌却没歌词）。
   修完补回 39 首歌词。
2. **曲库盘掉线保护**：exfat U 盘今天掉了 3 次（`Buffer I/O error` + 重新枚举 sda→sdb）。
   掉线时 `/mnt/usb/music` 会退化成根分区目录，继续写会撑爆 3.5G 系统、Navidrome 还会扫空。
   现在下载器发现盘没挂载会等 60 秒再明确失败；另加 `usb-watchdog.timer`（每 30 秒）
   自动挂回并拉起 Navidrome。
3. **`/v1/lyric` 是纯文本 LRC**，补歌词脚本一度按 JSON 解析 → 误判"QQ 无歌词 46 首"，
   修正后补回 39 首。
4. 批量脚本启动太快会撞上服务重启（收藏拉成 0 首）→ 已加"拉不到 100 首就报错退出"保护。

## 以后怎么用

```bash
sync-fav --dry-run       # 先看还缺多少
sync-fav                 # 同步
sync-fav --passes 3      # 接口超时多时多跑几轮
sync-fav-playlist        # 把收藏按原顺序做成 Navidrome 歌单「收藏」
```

已入库的会自动跳过，所以**可以随时重复跑**；买了会员后再跑一次即可补付费单曲。

---

## 同步成 Navidrome 歌单（保顺序）

用户要求：QQ 收藏的顺序原样搬到 Navidrome 的「收藏」歌单。

- 工具：`sync-fav-playlist`（`tools/sync_fav_playlist.py`）
- 结果：歌单「收藏」**849 首**（933 收藏里有 84 首曲库没有），**顺序与 QQ 逐首一致**
  （脚本自检 `order_ok=true`，第 1 首 We Don't Talk Anymore、最后 1 首 Montagem Nada Tropica）
- 同时把这 849 首打了星标

**踩的坑**：分批 `createPlaylist` / `updatePlaylist(songIdToAdd)` 写入时 Navidrome 是"前插"，
第一版做出来顺序整个反了（QQ 第一首跑到最后）。改成**一次性 POST 写入 + 回读校验**后正确。
另：这台 Navidrome 的 `getPlaylist` 会忽略 `songCount` 一次返回全部条目，分页循环会死循环。


---

## 补充：Navidrome 频繁重启的排查（同日发现并修复）

同步结束后检查 Navidrome 日志发现 **24 小时内重启了 102 次**，根因是**看门狗脚本自己的 bug**：

| 版本 | 判断方式 | 结果 |
|---|---|---|
| v1 | `findmnt -q /mnt/usb` | 这台机器的 findmnt **不支持 `-q`**，永远返回 1 → 每 30 秒误判"盘没挂载"→ 反复 `mount` 叠加挂载 → systemd 认为挂载点变了 → **每次把 Navidrome 停掉重启**（日志满屏 `Scan failed: context canceled`） |
| v2 | `mountpoint -q /mnt/usb` | 同样不稳，仍会误判 |
| **v3（现在）** | `grep -q " /mnt/usb " /proc/mounts` | 不依赖额外命令，**只在真没挂载时才 mount** |

修复后验证：Navidrome 连续运行 4 分钟 **0 重启**；全量扫描 `count=956`、DB 956 首、挂载唯一、1621 个文件。

另：这块板的 U 盘**会真的掉线**（供电/接触，内核出现 `Buffer I/O error` + 重新枚举 `sda→sdb`），
本次开机掉了 4 次。看门狗现在能自动挂回并重启 Navidrome 重新扫描；日志 `/var/log/usb-watchdog.log`。

