import fs from 'node:fs';
const D = JSON.parse(fs.readFileSync(new URL('./数据/fresh.json', import.meta.url), 'utf8'));
const P = {};
for (const c of D.comps) P[c.d] = [Math.round(c.x), Math.round(c.y)];
// 贴底的元件保持不动；其余整体下移 197 → 板框回到 0~1969
const KEEP = new Set(['CARD1','SW1','SW2','SW3','SW4','EC1','R7','R8','R9','R12','R13','R14']);
const out = {};
for (const [d, [x, y]] of Object.entries(P)) out[d] = KEEP.has(d) ? [x, y] : [x, y - 197];
fs.writeFileSync(new URL('./数据/place-50.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('写出', Object.keys(out).length, '个元件 → 数据/place-50.json');
