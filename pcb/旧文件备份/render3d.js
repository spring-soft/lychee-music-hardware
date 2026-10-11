// 在 EDA 内解析 OBJ 并用 canvas 渲染 3D 效果图
// 参数通过全局 RENDER_VIEW 传入：'front' | 'back'
const VIEW = (typeof RENDER_VIEW !== 'undefined') ? RENDER_VIEW : 'front';

const pcbs = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(pcbs[0].uuid);
await new Promise(r => setTimeout(r, 2500));

const f = await eda.pcb_ManufactureData.get3DFile('board', 'obj',
  ['Component Model', 'Via', 'Silkscreen'], 'Parts', true);
if (!f) throw new Error('get3DFile 返回空');
const zipBuf = new Uint8Array(await f.arrayBuffer());

// ── 解压 ZIP ──
const dv = new DataView(zipBuf.buffer);
const entries = [];
let p = 0;
while (p + 30 <= zipBuf.length && dv.getUint32(p, true) === 0x04034b50) {
  const method = dv.getUint16(p + 8, true);
  const compSize = dv.getUint32(p + 18, true);
  const nameLen = dv.getUint16(p + 26, true);
  const extraLen = dv.getUint16(p + 28, true);
  const name = new TextDecoder().decode(zipBuf.subarray(p + 30, p + 30 + nameLen));
  entries.push({ name, method, compSize, dataStart: p + 30 + nameLen + extraLen });
  p = entries[entries.length - 1].dataStart + compSize;
}
async function inflateRaw(u8) {
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function entryText(ext) {
  const e = entries.find(x => x.name.endsWith(ext));
  if (!e) return '';
  const raw = zipBuf.subarray(e.dataStart, e.dataStart + e.compSize);
  const bytes = e.method === 0 ? raw : await inflateRaw(raw);
  return new TextDecoder().decode(bytes);
}

// ── 材质颜色 ──
const mtlColors = {};
for (const line of (await entryText('.mtl')).split('\n')) {
  const m = line.match(/^newmtl\s+(\S+)/); if (m) { mtlColors[m[1]] = { name: m[1] }; continue; }
  const k = line.match(/^Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (k) { const last = Object.keys(mtlColors).pop(); if (last) mtlColors[last].kd = [+k[1], +k[2], +k[3]]; }
}

// ── 解析 OBJ（带材质分组）──
const objText = await entryText('.obj');
const V = [];            // 顶点 xyz
const F = [];            // 面 {i0,i1,i2, mtl}
let curMtl = null;
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;

for (const line of objText.split('\n')) {
  const c0 = line.charCodeAt(0);
  if (c0 === 118 && line[1] === ' ') {
    const a = line.slice(2).trim().split(/\s+/);
    const x = +a[0], y = +a[1], z = +a[2];
    V.push(x, y, z);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  } else if (c0 === 102 && line[1] === ' ') {
    const a = line.slice(2).trim().split(/\s+/);
    const idx = a.map(t => parseInt(t, 10) - 1);
    for (let k = 1; k + 1 < idx.length; k++) F.push(idx[0], idx[k], idx[k + 1], curMtl);
  } else if (line.startsWith('usemtl')) {
    curMtl = line.slice(7).trim();
  }
}
const nv = V.length / 3, nf = F.length / 4;

// ── 相机 ──
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
const spanX = maxX - minX, spanY = maxY - minY, spanZ = maxZ - minZ;
const radius = Math.sqrt(spanX * spanX + spanY * spanY + spanZ * spanZ) / 2;

const W = 1600, H = 1150;
const canvas = new OffscreenCanvas(W, H);
const ctx = canvas.getContext('2d');

// 背景渐变
const bg = ctx.createLinearGradient(0, 0, 0, H);
bg.addColorStop(0, '#141a24'); bg.addColorStop(0.55, '#0d1117'); bg.addColorStop(1, '#070a0e');
ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

// 视角：正面从上往下看(俯视+倾斜)；背面从下往上看
const az = VIEW === 'front' ? -35 * Math.PI / 180 : -35 * Math.PI / 180;
const el = VIEW === 'front' ? 42 * Math.PI / 180 : -42 * Math.PI / 180;
const dist = radius * 3.1;

const dirX = Math.cos(el) * Math.cos(az), dirY = Math.cos(el) * Math.sin(az), dirZ = Math.sin(el);
const eyeX = cx + dirX * dist, eyeY = cy + dirY * dist, eyeZ = cz + dirZ * dist;

// 相机基向量
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
const fwd = norm([cx - eyeX, cy - eyeY, cz - eyeZ]);
const right = norm(cross(fwd, [0, 0, 1]));
const up = cross(right, fwd);

// 光照方向（相机左上前方）
const L = norm([right[0] * -0.45 + up[0] * 0.55 + fwd[0] * -0.7,
                right[1] * -0.45 + up[1] * 0.55 + fwd[1] * -0.7,
                right[2] * -0.45 + up[2] * 0.55 + fwd[2] * -0.7]);

// 投影参数
const fov = 32 * Math.PI / 180;
const fl = (H / 2) / Math.tan(fov / 2);

// ── 变换 & 投影 ──
const sx = new Float32Array(nv), sy = new Float32Array(nv), sz = new Float32Array(nv);
let projMinX = 1e9, projMaxX = -1e9, projMinY = 1e9, projMaxY = -1e9;
for (let i = 0; i < nv; i++) {
  const wx = V[i * 3] - eyeX, wy = V[i * 3 + 1] - eyeY, wz = V[i * 3 + 2] - eyeZ;
  const a = wx * right[0] + wy * right[1] + wz * right[2];
  const b = wx * up[0] + wy * up[1] + wz * up[2];
  const c = wx * fwd[0] + wy * fwd[1] + wz * fwd[2];
  const d = c > 0.001 ? c : 0.001;
  const px = a * fl / d, py = b * fl / d;
  sx[i] = px; sy[i] = py; sz[i] = c;
  if (c > 0 && px < projMinX) projMinX = px;
  if (c > 0 && px > projMaxX) projMaxX = px;
  if (c > 0 && py < projMinY) projMinY = py;
  if (c > 0 && py > projMaxY) projMaxY = py;
}
// 自适应缩放居中
const spanPX = projMaxX - projMinX, spanPY = projMaxY - projMinY;
const k = Math.min((W * 0.88) / spanPX, (H * 0.80) / spanPY);
const ox = W / 2 - (projMinX + projMaxX) / 2 * k;
const oy = H / 2 + (projMinY + projMaxY) / 2 * k;

// ── 面：深度排序 + 着色 ──
const faceList = [];
for (let i = 0; i < nf; i++) {
  const a = F[i * 4], b = F[i * 4 + 1], c = F[i * 4 + 2], mtl = F[i * 4 + 3];
  if (sz[a] <= 0 || sz[b] <= 0 || sz[c] <= 0) continue;
  const x0 = sx[a] * k + ox, y0 = -sy[a] * k + oy;
  const x1 = sx[b] * k + ox, y1 = -sy[b] * k + oy;
  const x2 = sx[c] * k + ox, y2 = -sy[c] * k + oy;
  const minx = Math.min(x0, x1, x2), maxx = Math.max(x0, x1, x2);
  const miny = Math.min(y0, y1, y2), maxy = Math.max(y0, y1, y2);
  if (maxx < -2 || minx > W + 2 || maxy < -2 || miny > H + 2) continue;
  if ((maxx - minx) * (maxy - miny) < 0.35) continue;   // 极小面跳过

  // 法线（世界坐标）
  const ax = V[a * 3], ay = V[a * 3 + 1], az2 = V[a * 3 + 2];
  const ux = V[b * 3] - ax, uy = V[b * 3 + 1] - ay, uz = V[b * 3 + 2] - az2;
  const vx = V[c * 3] - ax, vy = V[c * 3 + 1] - ay, vz = V[c * 3 + 2] - az2;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;

  // 背面剔除（相机方向）
  const toCamX = eyeX - ax, toCamY = eyeY - ay, toCamZ = eyeZ - az2;
  const facing = nx * toCamX + ny * toCamY + nz * toCamZ;
  if (facing <= 0) continue;

  const depth = (sz[a] + sz[b] + sz[c]) / 3;
  const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
  const shade = 0.34 + 0.78 * lam;
  const col = (mtlColors[mtl] && mtlColors[mtl].kd) || [0.6, 0.62, 0.66];
  faceList.push({ d: depth, x0, y0, x1, y1, x2, y2,
                  r: Math.min(255, col[0] * 255 * shade),
                  g: Math.min(255, col[1] * 255 * shade),
                  b: Math.min(255, col[2] * 255 * shade) });
}
faceList.sort((A, B) => B.d - A.d);

let drawn = 0;
for (const q of faceList) {
  ctx.fillStyle = 'rgb(' + (q.r | 0) + ',' + (q.g | 0) + ',' + (q.b | 0) + ')';
  ctx.beginPath();
  ctx.moveTo(q.x0, q.y0); ctx.lineTo(q.x1, q.y1); ctx.lineTo(q.x2, q.y2);
  ctx.closePath(); ctx.fill();
  drawn++;
}

const dataUrl = canvas.convertToBlob ? null : null;
const blob = await canvas.convertToBlob({ type: 'image/png' });
const pngBytes = new Uint8Array(await blob.arrayBuffer());
let bin = '';
for (let i = 0; i < pngBytes.length; i += 8192) {
  bin += String.fromCharCode.apply(null, pngBytes.subarray(i, i + 8192));
}
return 'VIEW:' + VIEW + '|TOTAL:' + nf + '|DRAWN:' + drawn + '|SIZE:' + pngBytes.length + '|B64:' + btoa(bin);
