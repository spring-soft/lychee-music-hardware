const LIB = '0c06a53294c71aa90a5cca261ab18fa7baf6b7ca09964d736e3cd2133c552036';
const FPS = { U1: '31bf5a20ae3ba4ab', CARD1: 'a34e15386b12a91e', J2: 'x' };
const out = {};
for (const [k, uuid] of Object.entries(FPS)) {
  if (uuid === 'x') continue;
  try {
    const blob = await eda.lib_Footprint.getRenderImage({ footprintUuid: uuid, libraryUuid: LIB });
    if (!blob) { out[k] = 'null'; continue; }
    const buf = new Uint8Array(await blob.arrayBuffer());
    let b64 = '';
    for (let i = 0; i < buf.length; i++) b64 += String.fromCharCode(buf[i]);
    out[k] = { type: blob.type, size: buf.length, b64: btoa(b64) };
  } catch (e) { out[k] = 'ERR ' + String(e && e.message || e).slice(0, 100); }
}
return out;
