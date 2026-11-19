import {pageRole} from './pages.js';
import {readFrontendIdentity} from './frontend-identity.js';
import {readFrontendPageState} from './frontend-page-state.js';

let shared;
export function frontendAccountReader(){return shared||(shared=createFrontendAccountReader());}

// One worker owns account detection for popup and sidepanel. Never schedules automatic retries.
export function createFrontendAccountReader({api=chrome,browser=()=>navigator.userAgent.includes('Edg/')?'Edge':'Chrome',identity=readFrontendIdentity,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,budgetMs=6500,cacheFreshMs=30000}={}){
 const pending=new Map(),memory=new Map(),versions=new Map(),disposers=[];
 const key=id=>'frontendAccountV2:'+id;
 const unavailable=(reason,message,state={})=>({status:'identity-unconfirmed',reason,message,companyDisplayName:null,visibleAccountId:null,identityVerified:false,saved:false,published:false,readAt:new Date(now()).toISOString(),...state});
 const bounded=async(work,ms)=>{let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimer(()=>reject(Error('Account read timed out')),ms);})]);}finally{clearTimer(timer);}};
 async function probe(tabId){
  const tab=await api.tabs.get(tabId);if(pageRole(tab.url)!=='design'||tab.discarded)throw Error('目标不是可访问的设计页，或页面已休眠');
  const [r]=await api.scripting.executeScript({target:{tabId},func:readFrontendPageState});
  if(!r?.result||!Number.isFinite(r.result.documentEpoch)||(await api.tabs.get(tabId)).url!==tab.url)throw Error('设计页正在跳转，请稍后手动更新');
  return{...r.result,fullUrl:tab.url};
 }
 async function detect(tabId,state,valid){
  const inspected=await identity({chromeApi:api,tabId,args:{action:'inspect',expectedBrowser:browser(),cacheResult:false}});
  if(!valid())throw Error('Detection expired before avatar hover');
  const candidates=(inspected.frames||[]).flatMap(f=>(f.avatarCandidates||[]).filter(a=>a.accountAvatar===true||a.avatarKey?.includes('tuipro-topbar-fixed-avatar')).map(a=>({frameId:f.frameId,avatarKey:a.avatarKey})));
  if(candidates.length!==1)return unavailable(candidates.length?'avatar-ambiguous':'avatar-not-visible',candidates.length?'检测到多个账号入口，请保持目标设计页显示后手动更新':'未识别到可见账号头像；无需进入施工图才能检测账号，请确认设计页已加载后手动更新',{workspace:state.workspace});
  const value=await identity({chromeApi:api,tabId,args:{action:'hover',expectedBrowser:browser(),...candidates[0],cacheResult:false}});
  if(value.status==='identity-read-failed')return unavailable('account-read-failed',value.error||'账号读取失败，请手动更新',{workspace:state.workspace});
  return{...value,workspace:state.workspace,...(!value.companyDisplayName?{reason:'account-label-unavailable',message:'头像未提供唯一名称，账号尚未确认；不会自动重试'}:{})};
 }
 async function read(tabId,{force=false}={}){
  if(!Number.isInteger(tabId)||typeof force!=='boolean')throw Error('Invalid account read request');
  let state;try{state=await bounded(probe(tabId),Math.min(budgetMs,3000));}catch(e){return unavailable('page-unavailable',e.message);}
  if(state.ready==='loading'||!state.hasContent)return unavailable('page-loading','设计页尚未加载完成，稍后点击更新账号信息',{workspace:state.workspace});
  const token=tabId+':'+state.documentEpoch,existing=pending.get(token);if(existing)return existing.reply;
  let cached=memory.get(tabId);if(!cached){cached=(await api.storage.session.get(key(tabId)))[key(tabId)];}
  if(pending.has(token))return pending.get(token).reply;
  if(cached&&cached.documentEpoch===state.documentEpoch&&cached.url===state.url&&!force){memory.set(tabId,cached);return{...cached.value,workspace:state.workspace,cached:true,stale:now()-cached.checkedAt>=cacheFreshMs};}
  const version=versions.get(tabId)||0,ticket={expired:false},valid=()=>!ticket.expired&&(versions.get(tabId)||0)===version;
  const work=(async()=>{
   try{
    const value=await detect(tabId,state,valid);if(!valid())return unavailable('page-changed','检测已结束或页面已变化，本次结果不再使用',{workspace:state.workspace});const after=await probe(tabId);
    if(!valid()||after.documentEpoch!==state.documentEpoch||after.fullUrl!==state.fullUrl)return unavailable('page-changed','页面已变化，本次结果已丢弃，请手动更新',{workspace:after.workspace});
    const entry={documentEpoch:state.documentEpoch,url:state.url,checkedAt:now(),value:{...value,documentEpoch:state.documentEpoch,cached:false,stale:false}};
    memory.set(tabId,entry);await api.storage.session.set({[key(tabId)]:entry}).catch(()=>{});return entry.value;
   }catch(e){const value=unavailable('account-read-failed',e.message,{workspace:state.workspace,documentEpoch:state.documentEpoch});if(valid()){const entry={documentEpoch:state.documentEpoch,url:state.url,checkedAt:now(),value};memory.set(tabId,entry);await api.storage.session.set({[key(tabId)]:entry}).catch(()=>{});}return value;}
  })();
  ticket.reply=bounded(work,budgetMs).catch(async()=>{ticket.expired=true;const value=unavailable('timeout','账号检测超时，已停止等待；不会循环重试，可稍后手动更新',{workspace:state.workspace,documentEpoch:state.documentEpoch});if((versions.get(tabId)||0)===version){const entry={documentEpoch:state.documentEpoch,url:state.url,checkedAt:now(),value};memory.set(tabId,entry);await api.storage.session.set({[key(tabId)]:entry});}return value;});
  pending.set(token,ticket);
  void work.finally(()=>{if(pending.get(token)===ticket)pending.delete(token);});
  return ticket.reply;
 }
 function invalidate(tabId){versions.set(tabId,(versions.get(tabId)||0)+1);memory.delete(tabId);void api.storage.session.remove([key(tabId),'frontendIdentity:'+tabId]).catch(()=>{});}
 function listen(event,fn){event?.addListener(fn);disposers.push(()=>event?.removeListener?.(fn));}
 listen(api.tabs.onRemoved,id=>invalidate(id));listen(api.tabs.onReplaced,(added,removed)=>{invalidate(removed);invalidate(added);});
 listen(api.tabs.onUpdated,(id,c)=>{if('url'in c||c.status==='loading'||c.discarded)invalidate(id);});
 return{read,invalidate,dispose(){for(const remove of disposers)remove();for(const ticket of pending.values())ticket.expired=true;pending.clear();memory.clear();}};
}
