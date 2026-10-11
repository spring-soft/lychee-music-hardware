const out = {};
const FP = 'a34e15386b12a91e';
try {
  const fp = await eda.lib_Footprint.get(FP);
  out.类型 = typeof fp;
  out.字段 = fp ? Object.keys(fp) : null;
  if (fp) out.内容 = JSON.stringify(fp).slice(0, 1500);
} catch(e){ out.getErr = e.message.slice(0,100); }
try {
  const src = await eda.lib_Footprint.getSource?.(FP);
  out.源 = src ? String(src).slice(0, 1000) : '空';
} catch(e){ out.srcErr = e.message.slice(0,80); }
return out;
