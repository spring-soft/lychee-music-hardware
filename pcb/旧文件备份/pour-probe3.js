const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = { tries: [] };
const polyR = eda.pcb_MathPolygon.createPolygon(['R', 300, 300, 1600, 1300, 0, 0]);
const polyL = eda.pcb_MathPolygon.createPolygon([300,300,'L',1900,300,'L',1900,1600,'L',300,1600]);
const src = polyR.getSource();

const mk = (label, fn) => { try { const r = fn(); out.tries.push({ label, type: r===undefined?'undefined':typeof r, keys: r&&Object.keys(r), val: r?JSON.stringify(r).slice(0,160):null }); return r; } catch(e){ out.tries.push({ label, err: e.message.slice(0,80) }); return null; } };

const c1 = mk('createComplexPolygon(polygon对象)', () => eda.pcb_MathPolygon.createComplexPolygon(polyR));
const c2 = mk('createComplexPolygon(数组包polygon)', () => eda.pcb_MathPolygon.createComplexPolygon([polyR]));
const c3 = mk('createComplexPolygon(源数组)', () => eda.pcb_MathPolygon.createComplexPolygon(src));
const c4 = mk('createComplexPolygon(源数组数组)', () => eda.pcb_MathPolygon.createComplexPolygon([src]));

// 拿任一非空结果去建铺铜
const cand = [c1,c2,c3,c4].find(x => x);
const T = async (label, fn) => { try { const r = await fn(); out.tries.push({ label, ok: !!r }); } catch(e){ out.tries.push({ label, err: e.message.slice(0,80) }); } };
if (cand) {
  await T('铺铜(complex, 层1)', () => eda.pcb_PrimitivePour.create('GND', 1, cand));
  await T('铺铜(complex, 层16)', () => eda.pcb_PrimitivePour.create('GND', 16, cand));
}
out.pourCount = (await eda.pcb_PrimitivePour.getAll() || []).length;
return out;
