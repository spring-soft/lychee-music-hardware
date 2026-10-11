---
name: esp-music-display-calibration
description: esp-music 这块 ST7735 的正确显示参数（invert/RGB/字节序三者组合）+ 一次定位法
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-24T16:19:08.310Z
---

**2026-09-25** 实测定下 esp-music 屏幕（ST7735 160×128）的正确参数：

```
mirror_x=1  mirror_y=0  swap_xy=1          （沿用 esp-claw 验证过的组合）
invert = 0                                  （反相必须关）
bgr    = false（即 LCD_RGB_ELEMENT_ORDER_RGB）
显示格式 = LV_COLOR_FORMAT_RGB565_SWAPPED    ← 关键：这块屏要【高字节在前】的 RGB565
```

**Why:** 一开始抄了 esp-claw `esp32_S3_DevKitC_1_breadboard` 变体的 `invert_color: true`，而且**没意识到字节序问题**。两个错误叠加（反相 + 红蓝互换 + 字节颠倒），上屏表现为"**整体偏紫**"，用户只说"页面是紫的太丑"，很难反推到根因。

**How to apply（下次遇到屏偏色，直接照这个流程）：**

1. **别猜，做色带自校准**：屏幕上画 4 条色带（白/红/绿/蓝，各 28px）+ 底部深灰条上一个大号组号，每 6 秒轮换一组参数（invert 开/关 × BGR 开/关），日志打 `校准组合 N/4`。用户只需报"数字是几的时候四条颜色正常"。**一次烧录就能定位**，比来回改代码试快得多。
2. **判读表**（用户报"看到什么颜色"→ 对应什么错）：

   | 现象 | 结论 |
   |---|---|
   | 白变黑、图标黑底变白（整屏负片） | invert 错 |
   | 红↔蓝 互换，绿正常 | BGR/RGB 错 |
   | 送 白/红/绿/蓝 → 显示 白/**蓝**/**红**/**绿** | **字节序颠倒**（每像素高低字节反了） |
   | 送 白/红/绿/蓝 → 显示 白/红/蓝/绿 | 字节序颠倒 **+** BGR，两层叠加 |

   字节序颠倒的判别特征：红→蓝、绿→红、蓝→绿这种"循环错位"。
3. **修字节序**：这条 IDF 的 `esp_lcd_panel_io_spi_config_t` **没有** swap color bytes 标志 → 用 LVGL 侧的 `lv_display_set_color_format(disp, LV_COLOR_FORMAT_RGB565_SWAPPED)`。
4. **运行时改 RGB/BGR 只能重建 panel**：esp_lcd 没有运行时接口，但 ST7735 驱动的 MADCTL 是 init 时设的 → 用公开 API `esp_lcd_panel_del()` + `esp_lcd_new_panel_st7735()` 重建（记得重设 gap/mirror/swap/invert/disp_on）。
5. **图标素材必须带 alpha（RGB565A8）**：RGBA 的 PNG 若直接 `convert("RGB")`，透明区会变成**黑色方块**，上屏就是"图标外面一圈黑块"。`tools/gen_assets.py` 现在按源 PNG 是否 RGBA 自动输出 RGB565A8（fmt=2），LVGL 会把它混合到背景上。

相关：[[esp-music-project]] [[esp-music-navidrome-verified]]
