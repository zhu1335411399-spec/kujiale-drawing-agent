import {collectPages,browserProfileScope} from './page-check.js';
import {readDrawingPage} from './read-page.js';
import {readFrontendIdentity} from './frontend-identity.js';
import {pageRole} from './pages.js';

export function sourceName(status){return /来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(status||'')?.[1]?.trim()||null;}
export function pageId(clientId,tabId){return clientId?clientId+':'+tabId:null;}
export async function listPanelPages(api=chrome){
  const [snapshot,saved]=await Promise.all([collectPages(api),api.storage.local.get('clientId')]);
  return{...snapshot,...browserProfileScope(),clientId:saved.clientId||null,pages:snapshot.pages.map(p=>({...p,pageId:pageId(saved.clientId,p.tabId)}))};
}
export async function readPanelPage(tabId,{readIdentity=false,api=chrome}={}){
  const initial=await api.tabs.get(tabId);
  if(!pageRole(initial.url)||initial.discarded)throw Error('目标页面已切换或休眠，请重新选择');
  const [probe]=await api.scripting.executeScript({target:{tabId},func:readDrawingPage,args:[{kind:'context'}]});
  if(!probe?.result)throw Error('页面未返回信息');
  if(probe.result.role!==pageRole(initial.url))throw Error('页面类型已变化，请刷新状态');
  let frontend=null;
  if(readIdentity&&probe.result.role==='design'){
    const expectedBrowser=browserProfileScope().browser;
    const inspect=await readFrontendIdentity({chromeApi:api,tabId,args:{action:'inspect',expectedBrowser}});
    const observed=inspect.frames.flatMap(f=>(f.avatarCandidates||[]).filter(a=>a.avatarKey.includes('tuipro-topbar-fixed-avatar')).map(a=>({frameId:f.frameId,avatarKey:a.avatarKey})));
    if(observed.length!==1)throw Error('未唯一识别右上角账号头像，请保持设计页正常显示');
    frontend=await readFrontendIdentity({chromeApi:api,tabId,args:{action:'hover',expectedBrowser,...observed[0]}});
    if(frontend.status==='identity-read-failed')throw Error(frontend.error||'账号读取失败');
  }else if(probe.result.role==='design'){
    const cached=(await api.storage.session.get('frontendIdentity:'+tabId))['frontendIdentity:'+tabId];
    if(cached?.url===initial.url&&Date.now()-cached.readAt<30000)frontend={...cached.value,cached:true};
  }
  if((await api.tabs.get(tabId)).url!==initial.url)throw Error('页面已切换，请刷新状态');
  return{...probe.result,tabId,frontend};
}
