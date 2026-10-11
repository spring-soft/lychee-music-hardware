const out = {};
try { out.ratlineStatus = await eda.pcb_Document.getCalculatingRatlineStatus(); } catch(e){ out.ratlineStatus = 'ERR '+e.message; }
try { const s = await eda.pcb_Drc.getRealTimeDrcStatus(); out.realtimeDrc = s; } catch(e){ out.realtimeDrc = 'ERR '+e.message; }
try { out.curLayer = await eda.pcb_Layer.getCurrentLayer(); } catch(e){ out.curLayer='ERR '+e.message; }
try { const sel = await eda.pcb_SelectControl.getAllSelectedPrimitives(); out.selected = Array.isArray(sel) ? sel.length : sel; } catch(e){ out.selected='ERR '+e.message; }
try { out.docInfo = await eda.dmt_EditorControl.getCurrentDocumentInfo?.(); } catch(e){ out.docInfo='ERR '+e.message; }
return out;
