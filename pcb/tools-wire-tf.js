const out = { ports: [], flags: [], errs: [] };
await eda.dmt_EditorControl.openDocument('43ecd6bbed92787b');
await new Promise(r=>setTimeout(r,4500));

const P = async (net, x, y) => {
  try { const r = await eda.sch_PrimitiveComponent.createNetPort('BI', net, x, y);
        out.ports.push(net+'@'+x+','+y+(r?' ✓':' ✗')); }
  catch(e){ out.errs.push('P '+net+'@'+x+','+y+': '+e.message.slice(0,50)); }
};
const F = async (type, net, x, y) => {
  try { const r = await eda.sch_PrimitiveComponent.createNetFlag(type, net, x, y);
        out.flags.push(type+'/'+net+'@'+x+','+y+(r?' ✓':' ✗')); }
  catch(e){ out.errs.push('F '+net+'@'+x+','+y+': '+e.message.slice(0,50)); }
};

// ① U1 侧（ESP32 空闲脚）
await P('TF_CS',   500, 560);   // U1 IO12
await P('TF_MISO', 510, 560);   // U1 IO13
await P('TF_CD',   520, 560);   // U1 IO14

// ② TF 卡座侧
await P('TF_CS',   3350, 2030); // 脚2  CD/DAT3
await P('TF_MISO', 3350, 1980); // 脚7  DAT0
await P('TF_CD',   3350, 1960); // 脚9  CD
await P('LCD_SCLK',3350, 2000); // 脚5  CLK   ← 和屏幕共用
await P('LCD_MOSI',3350, 2020); // 脚3  CMD   ← 和屏幕共用
await F('Power','VCC', 3350, 2010);   // 脚4 VDD
for (const y of [1990,1985,1995,2005,2015]) {         // 脚6,10,11,12,13
  const x = y === 1990 ? 3350 : 3450;
  await F('Ground','GND', x, y);
}
// ③ 两个电容
await F('Power','VCC', 3180, 2120);  await F('Ground','GND', 3220, 2120);  // 10µF
await F('Power','VCC', 3180, 1900);  await F('Ground','GND', 3220, 1900);  // 100nF

await new Promise(r=>setTimeout(r,2500));
let s=null,e=null; try { s = await eda.sch_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
out.成功数 = out.ports.length + out.flags.length;
return out;
