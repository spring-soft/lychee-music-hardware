const out = {};
const SCH = '382a0d6dce1f2e0c';   // V2 (Board1_1) 的原理图
// 找页面 uuid
const pages = await eda.dmt_Schematic.getAllSchematicPagesInfo();
out.页面 = (pages||[]).filter(p => p.parentSchematicUuid === SCH).map(p=>({uuid:p.uuid,name:p.name}));
const page = (pages||[]).find(p => p.parentSchematicUuid === SCH);
if (!page) return { err:'未找到 V2 原理图页面', 全部页面:(pages||[]).map(p=>p.parentSchematicUuid+':'+p.name) };
await eda.dmt_EditorControl.openDocument(page.uuid);
await new Promise(r=>setTimeout(r,4500));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
out.元件数 = comps.length;
// 现有元件的坐标范围，用来找空白处
const xs = comps.map(c=>c.x), ys = comps.map(c=>c.y);
out.现有坐标范围 = { x: Math.min(...xs)+'~'+Math.max(...xs), y: Math.min(...ys)+'~'+Math.max(...ys) };
// 找右侧空白列
out.右侧空位建议 = { x: Math.max(...xs) + 300, y: Math.max(...ys) };
return out;
