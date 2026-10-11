const out = {};
const P = o => o ? Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(k=>k!=='constructor') : 'none';
out.manufacture = P(eda.pcb_ManufactureData);
out.comp = P(eda.pcb_PrimitiveComponent);
out.pad = P(eda.pcb_PrimitivePad);
out.net = P(eda.pcb_Net);
out.formatConv = P(eda.sys_FormatConversion);
return out;
