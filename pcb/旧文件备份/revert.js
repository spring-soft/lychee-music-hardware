
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const BAD = new Set(["3ed15da51bacbfdd","31bbf9cc09af977b","dc2087e4b52e6938","bcfce0c60252a6cd","e915862065ca7be1","9399e77853caeb16","d7947bcdb968be8f","b776b81c6af87c95","acf6b9593b3d4e54","f48a1476dbcf9355","ace50c6c23343b46","a4e5c55817b42b0d","b5f6b85419374eb9","be784c30ac106675","f4cd52a978c84ba6","3113de2f3e45e003","97e2df002834ea52","b9f2d5f692e253a3","c9cbb03422096d4d","c388a5be97dfbe91","63e1a134e61b4ab4","918a25983bc30444","934df497cbb85f91","11a2d68c88005c46","0ae083338ccc5375","6cd3eb8126c70267","b4e37e3bba4f9ad8","a517e9d441ac67f9","d90519d92b89c274","c251ca979e1af64f","52299bb46283117e","51583a4b55034bb2","52ee6648a6e41ab4","b22921964ce6f9de","db5272e860b64c9d","c92d8c876168f67f","57dd7243ebf1a144","a9eddcc58294921f","ecdef405f4a87795","720d1b75e4aca912","2b91c507399864bfe14","030f5eb8382bed79","0975f8be0f1de87ce7","c4b47d518c7ade6c","da6222e9e50912c4","d46ed5ecd6113940e11","2c3c01351dabcd7a","35b2aa26ba813327e18","6d2a2cc1fb095b2f","35b2aa26ba813327e19","99b1178a2dd71b98e9","873c65d6c566ec05","ba0298fafea1aa53e15","4005fc9a58efc350","0975f8be0f1de87ce8","041bda7f9529f035","f0e3dc9fbe5bfa11","7505ce166110ab51e14","22d30685a6d95782","e5952716270c9cad","69d352bcdbb60e18","2dcf810abf0d764ce34","2b49676c576debf1","2dcf810abf0d764ce27","5ceb6aa45979e301","8c5d335837794a4ae11","5066ba054e0ee48de15","5066ba054e0ee48de14","61f7568fc57beb59e14","1a0b47e613d1a95f","99b1178a2dd71b98e10","9232cccb58ae6758","4dd2f05d41357bf2e7","f7d3ff0af3ebcb11","4cc47365aa8ea68b","1a100e54ddf63d3e","764ca1853cb8f2aa","218e64abf3d54049","2577f80a56188357","aea554a90de16447","7d5e90832c1d2869","27b8216a0e63949e","62957c42ac0b182c","efb87319ab33f1a8","aaaf2afc901a1b91","ded02978f3bf0ad7","d4e7b48520cf5429","ac16a09d776fb455","ab28e74cc477faa2","27ec61de93815d59","2dcf810abf0d764ce55","cd10c18510d2648e","2dcf810abf0d764ce56","423f7cc79ec85c52"]);
const POWER = new Set(['BAT+','VBUS','+5V','SW_NODE']);
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const reverted = [], kept = [];
for (const l of lines) {
  if (!POWER.has(l.net)) continue;
  if (BAD.has(l.primitiveId)) {
    try { await eda.pcb_PrimitiveLine.modify(l.primitiveId, { lineWidth: 10 }); reverted.push(l.net+'@'+Math.round(l.startX)+','+Math.round(l.startY)); } catch(e) {}
  } else kept.push(l.net);
}
await new Promise(r=>setTimeout(r,1500));
const c1={}; for(const n of reverted) { const k=n.split('@')[0]; c1[k]=(c1[k]||0)+1; }
const c2={}; for(const n of kept) c2[n]=(c2[n]||0)+1;
return { 退回段数: reverted.length, 按网络: c1, 保持加粗段数: kept.length, 按网络: c2 };
