const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
// 不 await，让它后台跑
eda.pcb_Document.autoRouting({
  layers: [1, 2],
  cornerStyle: 0,
  optimization: 1,
  existingPrimitiveMode: 'keep',
});
return 'autoroute 已触发（后台运行）';
