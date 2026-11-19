import {collectPages,browserProfileScope} from './page-check.js';
import {readDrawingPage} from './read-page.js';
import {pageRole} from './pages.js';

export function sourceName(status){return /来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(status||'')?.[1]?.trim()||null;}
export function pageId(clientId,tabId){return clientId?clientId+':'+tabId:null;}
export async function listPanelPages(api=chrome){
  const [snapshot,saved,active]=await Promise.all([collectPages(api),api.storage.local.get('clientId'),api.tabs.query({active:true,currentWindow:true})]);
  return{...snapshot,...browserProfileScope(),activeTabId:active[0]?.id??null,clientId:saved.clientId||null,pages:snapshot.pages.map(p=>({...p,pageId:pageId(saved.clientId,p.tabId)}))};
}
export async function readPanelPage(tabId,{readIdentity=false,api=chrome}={}){
  const initial=await api.tabs.get(tabId);
  if(!pageRole(initial.url)||initial.discarded)throw Error('目标页面已切换或休眠，请重新选择');
  const [probe]=await api.scripting.executeScript({target:{tabId},func:readDrawingPage,args:[{kind:'context'}]});
  if(!probe?.result)throw Error('页面未返回信息');
  if(probe.result.role!==pageRole(initial.url))throw Error('页面类型已变化，请刷新状态');
  let frontend=null;
  if(probe.result.role==='design'){
    frontend=await api.runtime.sendMessage({type:'readFrontendAccountUi',tabId,force:readIdentity});
    if(!frontend)throw Error('账号检测模块未加载，请重新加载当前浏览器的施工图扩展');
    if(frontend.error)throw Error(frontend.error);
  }
  if((await api.tabs.get(tabId)).url!==initial.url)throw Error('页面已切换，请刷新状态');
  return{...probe.result,tabId,frontend};
}
