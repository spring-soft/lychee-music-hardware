const P = o => o ? Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(k=>k!=='constructor') : 'none';
const out = { dmtSchematic: P(eda.dmt_Schematic), schComp: P(eda.sch_PrimitiveComponent) };
try { const s = await eda.dmt_Schematic.getAllSchematicsInfo(); out.schematics = s; } catch(e){ out.schErr = e.message; }
return out;
