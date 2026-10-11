---
name: esp-music-lcd-anim-cost
description: LVGL 动画的刷新代价实测——opa 样式必须动画结束清掉，否则刷新量涨 4 倍
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T04:41:24.002Z
---

**结论：LVGL 里给对象设了 `opa` 样式后，动画结束必须把它清掉，否则那个对象会被一直重绘。**

**Why（2026-09-25 实测）**：给 esp-music 的屏幕加动画时，5 秒窗口的刷新量从 **~7KB 涨到 ~50KB（4 倍）**。
逐项 A/B 定位到唯一原因是**封面淡入**（72×72 不透明度 0→255）。
机制：**只要对象上存在 opa 样式，LVGL 就走图层/混合路径**，样式留着 = 每帧重绘整个对象。
动画本身只有 240ms 可以接受，**留下的样式才是问题**。

**How to apply:**

```c
static void anim_clear_opa_cb(lv_anim_t *a)
{
    lv_obj_remove_local_style_prop((lv_obj_t *)a->var, LV_STYLE_OPA, 0);
}
/* lv_anim_set_ready_cb(&a, anim_clear_opa_cb); */
```
加上这一行之后，**全部动画保留，刷新量回到基线**（5~9 次 / 7~14 KB 每 5 秒）。

**A/B 的踩坑教训（比结论更值钱）**：
- **两次测量必须是同一首歌**。歌名/作者过长时用的是 `LV_LABEL_LONG_MODE_SCROLL_CIRCULAR`，
  它会持续重绘；而队列是每次开机重新随机抽的，**直接对比两次开机的数字是无效的**。
  我第一次就是这么比的，差点得出"动画让刷新量涨 4 倍"的错误结论。
- 正确做法：给动画加一个 `#define UI_ANIM 0/1` 编译开关，**同一首歌**下开关各测一遍。
  这个开关最后保留在 `components/ui/src/ui.c` 里（以后加动画都用它量一遍）。
- **判据看哪个数**：`[ui] lv_timer 最坏 X ms | 5 秒内刷新 N 次 / K KB（整屏=40KB）`。
  整屏一次 = 40KB，所以 K 是几十 KB 说明在反复重绘；K 很小而 lv_timer 很大，
  说明是在等上一次 DMA 完成（另一类问题）。

**各动画的面积代价（实测可接受）**：播放/暂停钮 32×32 ≈ 2KB/帧、提示条 150×22 ≈ 6.6KB/帧、
封面 72×72 ≈ 10KB/帧、**全屏淡入 40KB/帧**（所以页面切换只给 180ms，约 5~6 帧）。
SPI 40MHz 的带宽其实很宽（11KB/s 只占 0.03%），**真正的瓶颈是 UI 任务被重绘占住的时间**
（`lv_timer` 最坏耗时），所以判据看时间而不是字节数。

相关：[[esp-music-m4-keys-player]] [[esp-music-m5-web-console]]
