// 解压 EDA 导出的 3D 文件（其实是 ZIP），解析 OBJ，报告规模
const pcbs = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(pcbs[0].uuid);
await new Promise(r => setTimeout(r, 3000));

const f = await eda.pcb_ManufactureData.get3DFile('board', 'obj',
  ['Component Model', 'Via', 'Silkscreen'], 'Parts', true);
if (!f) return { err: 'get3DFile 返回空' };

const buf = new Uint8Array(await f.arrayBuffer());

// ---- 顺序解析 ZIP 本地文件头 ----
const dv = new DataView(buf.buffer);
const entries = [];
let p = 0;
while (p + 30 <= buf.length && dv.getUint32(p, true) === 0x04034b50) {
  const method = dv.getUint16(p + 8, true);
  const compSize = dv.getUint32(p + 18, true);
  const nameLen = dv.getUint16(p + 26, true);
  const extraLen = dv.getUint16(p + 28, true);
  const name = new TextDecoder().decode(buf.subarray(p + 30, p + 30 + nameLen));
  const dataStart = p + 30 + nameLen + extraLen;
  entries.push({ name, method, compSize, dataStart });
  p = dataStart + compSize;
}

async function inflateRaw(u8) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([u8]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const objEntry = entries.find(e => e.name.endsWith('.obj'));
if (!objEntry) return { err: 'ZIP 里没有 .obj', entries: entries.map(e => e.name) };

const raw = buf.subarray(objEntry.dataStart, objEntry.dataStart + objEntry.compSize);
const objBytes = objEntry.method === 0 ? raw : await inflateRaw(raw);
const objText = new TextDecoder().decode(objBytes);

// ---- 解析 OBJ ----
const verts = [];
let faceCount = 0, withNormal = 0;
const mtls = new Set();
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;

for (const line of objText.split('\n')) {
  if (line.charCodeAt(0) === 118 /* v */ && line[1] === ' ') {
    const a = line.slice(2).trim().split(/\s+/);
    const x = +a[0], y = +a[1], z = +a[2];
    verts.push(x, y, z);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  } else if (line.charCodeAt(0) === 102 /* f */ && line[1] === ' ') {
    faceCount++;
    if (line.includes('//')) withNormal++;
  } else if (line.startsWith('usemtl')) {
    mtls.add(line.slice(7).trim());
  }
}

return {
  zipEntries: entries.map(e => e.name + ' (' + e.compSize + ')'),
  objSize: objText.length,
  顶点数: verts.length / 3,
  面数: faceCount,
  带法线面数: withNormal,
  材质数: mtls.size,
  材质样例: [...mtls].slice(0, 12),
  bbox: {
    x: [minX.toFixed(1), maxX.toFixed(1)],
    y: [minY.toFixed(1), maxY.toFixed(1)],
    z: [minZ.toFixed(1), maxZ.toFixed(1)],
  },
  bboxSize: {
    x: (maxX - minX).toFixed(1),
    y: (maxY - minY).toFixed(1),
    z: (maxZ - minZ).toFixed(1),
  },
};
