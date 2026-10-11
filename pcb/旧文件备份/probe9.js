const out = {};
out.ec = Object.getOwnPropertyNames(Object.getPrototypeOf(eda.dmt_EditorControl)).filter(k=>k!=='constructor');
out.fm = eda.sys_FileManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(eda.sys_FileManager)).filter(k=>k!=='constructor') : [];
out.fs = eda.sys_FileSystem ? Object.getOwnPropertyNames(Object.getPrototypeOf(eda.sys_FileSystem)).filter(k=>k!=='constructor') : [];
return out;
