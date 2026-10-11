const out = {};
out.allRuleCfgs = await eda.pcb_Drc.getAllRuleConfigurations();
out.edaImg = Object.keys(eda).filter(k=>/image|expor|snapshot|screen|file/i.test(k));
if (eda.pcb_PrimitiveImage) out.imgApi = Object.getOwnPropertyNames(Object.getPrototypeOf(eda.pcb_PrimitiveImage)).filter(k=>k!=='constructor');
out.fileMgr = eda.sys_FileManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(eda.sys_FileManager)).filter(k=>k!=='constructor') : 'none';
out.tool = eda.sys_Tool ? Object.getOwnPropertyNames(Object.getPrototypeOf(eda.sys_Tool)).filter(k=>k!=='constructor') : 'none';
return out;
