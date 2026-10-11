const out = {};
for (const n of ['sys_Dialog','sys_MessageBox','sys_ToastMessage','sys_LoadingAndProgressBar','sys_Window','sys_PanelControl']) {
  out[n] = eda[n] ? Object.getOwnPropertyNames(Object.getPrototypeOf(eda[n])).filter(k=>k!=='constructor').slice(0,25) : 'none';
}
return out;
