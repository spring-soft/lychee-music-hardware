// 功能分区重排：把 49 个元件按「主控/音频/电源/按键/显示」五个区重新摆放
// 坐标单位 0.01 inch (10 mil)。摆完后必须删除全部网络端口并重跑接线。


// 布局表：位号 -> [x, y]
const LAYOUT = {
  // ── 区1 主控（左上）─────────────────────────
  U1:  [500, 700],
  C2:  [250, 400], C6: [250, 520], C12: [250, 640],
  R4:  [250, 780], R5: [250, 900],

  // ── 区2 音频（右上）─────────────────────────
  FB1: [1200, 320], FB2: [1360, 320],
  C13: [1200, 460], C8:  [1360, 460],
  C14: [1200, 600], C9:  [1360, 600],
  C3:  [1200, 740], C7:  [1360, 740],
  C17: [1560, 320], C18: [1560, 440],
  C19: [1720, 320], C20: [1720, 440],
  C15: [1900, 320], C16: [1900, 440],
  U2:  [1560, 740],
  R10: [1200, 880], R11: [1360, 880],
  J2:  [2050, 740],

  // ── 区3 电源（左下）─────────────────────────
  J1:  [400, 2000],
  U3:  [750, 1880],
  R1:  [560, 1780], R2: [700, 1780], R3: [840, 1780],
  C10: [560, 2120], C11: [720, 2120],
  C4:  [560, 2240], C5:  [720, 2240],
  C1:  [400, 2320],

  // ── 区4 按键（中下）─────────────────────────
  R6:  [1300, 1880], R7: [1470, 1880], R8: [1640, 1880], R9: [1810, 1880],
  SW1: [1300, 2080], SW2: [1470, 2080], SW3: [1640, 2080],
  SW4: [1810, 2080], SW5: [1980, 2080], SW6: [2150, 2080],

  // ── 区5 显示（右下）─────────────────────────
  R12: [2450, 1800], R13: [2450, 1950], R14: [2450, 2100],
  Q1:  [2620, 2150],
  J3:  [2820, 2000],
};

const pages = await eda.dmt_Schematic.getAllSchematicPagesInfo();
await eda.dmt_EditorControl.openDocument(pages[0].uuid);
await new Promise(r => setTimeout(r, 2000));

const comps = (await eda.sch_PrimitiveComponent.getAll()).filter(c => c.componentType === 'part');
const idByDes = {};
for (const c of comps) if (c.designator) idByDes[c.designator] = c.primitiveId;

const moved = [], missing = [];
for (const [des, [x, y]] of Object.entries(LAYOUT)) {
  const id = idByDes[des];
  if (!id) { missing.push(des); continue; }
  await eda.sch_PrimitiveComponent.modify(id, { x, y });
  moved.push(des);
}

return {
  assumedProjectOpen: true,
  partCount: comps.length,
  moved: moved.length,
  missing,
  unplacedDesignators: comps.map(c => c.designator).filter(d => !LAYOUT[d]),
};
