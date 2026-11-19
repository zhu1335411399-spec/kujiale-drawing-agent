import {listPanelPages,readPanelPage,sourceName} from './panel-data.js';
import {pageRole} from './pages.js';

export function startPanel({document=globalThis.document,api=chrome,window=globalThis.window,list=listPanelPages,read=readPanelPage,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,setRepeating=globalThis.setInterval,clearRepeating=globalThis.clearInterval,readBudgetMs=9000}={}){
 const el=id=>document.getElementById(id),set=(id,v)=>{el(id).textContent=v||'未读取';},time=v=>v?new Date(v).toLocaleTimeString():'';
 let snapshot=null,sequence=0,timer=null,disposed=false,refreshJob=null,queued=false,connectionJob=null;
 const jobs=new Map(),disposers=[];
 const chosen=()=>Number(el('pages').value),tracked=id=>snapshot?.pages.some(p=>p.tabId===id);
 function clear(){for(const id of ['company','accountId','source','sourceId','template','pageId','tabId','clientId','url','workspace'])set(id,null);set('role','未选择页面');el('identityTime').textContent=el('validationHint').textContent='';el('readIdentity').disabled=true;el('readIdentity').hidden=true;for(const id of ['sourceRow','sourceIdRow','templateRow','workspaceRow'])el(id).hidden=true;}
 function render(info){
  const design=info.role==='design',page=snapshot?.pages.find(p=>p.tabId===info.tabId),f=info.frontend;
  set('role',design?'前端设计':'后台配置');set('company',design?f?.companyDisplayName:info.identity?.accountDisplayName);set('accountId',design?f?.visibleAccountId:info.identity?.accountId);
  for(const id of ['sourceRow','sourceIdRow','templateRow'])el(id).hidden=design;el('workspaceRow').hidden=!design;
  set('source',sourceName(info.identity?.configStatusText));set('sourceId',info.identity?.configOwnerId);set('template',info.identity?.configName);
  set('pageId',page?.pageId);set('tabId',String(info.tabId));set('clientId',snapshot?.clientId);set('url',info.url);
  el('readIdentity').hidden=!design;el('readIdentity').disabled=!design;
  const stage=f?.workspace?.stage;set('workspace',stage==='design'?'未进入施工图':stage==='drawing-editor'?'施工图 · 编辑视图':stage==='drawing-layout'?'施工图 · 布局图纸':stage==='loading'?'设计页加载中':'待识别');
  el('validationHint').textContent=design?(f?.workspace?.hint||'账号检测独立于施工图；效果验证还需核对企业模板并更新配置'):'';
  el('identityTime').textContent=design?(f?.readAt?'账号读取：'+time(f.readAt)+(f.cached?(f.stale?' · 历史结果，使用前请更新':' · 已缓存，点击按钮可重测'):''):'账号尚未确认'):'页面读取：'+time(info.readAt);
 }
 function connection(){
  if(connectionJob)return connectionJob;
  connectionJob=(async()=>{try{const r=await api.runtime.sendMessage({type:'mcpStatus'});if(disposed)return;const fresh=r?.connected&&Date.now()-r.checkedAt<45000;el('connection').textContent=fresh?'已连接':r?.enabled===false?'连接已暂停':'未连接';el('connection').className=fresh?'connected':'disconnected';el('connectionDetail').textContent=fresh?'当前浏览器已连接本机服务':r?.error||'请确认本机施工图服务已启动';}catch(e){if(!disposed){el('connection').textContent='连接状态读取失败';el('connectionDetail').textContent=e.message;}}})().finally(()=>{connectionJob=null;});return connectionJob;
 }
 function selected(force=false){
  const id=chosen(),page=snapshot?.pages.find(p=>p.tabId===id);if(!page){++sequence;clear();el('notice').textContent='请在当前浏览器打开施工图后台或设计页';return Promise.resolve();}
  if(jobs.has(id))return jobs.get(id);
  const request=++sequence;const identity=force&&page.role==='design';
  // Preserve the last visible result while refreshing the same page; navigation events clear it immediately.
  if(el('tabId').textContent!==String(id))clear();
  el('readIdentity').hidden=page.role!=='design';el('readIdentity').disabled=true;el('pages').disabled=true;
  el('notice').textContent=identity?'正在更新账号信息…':'正在读取页面和已缓存账号信息…';
  const job=(async()=>{let timeout;try{
   const info=await Promise.race([read(id,{readIdentity:identity,api}),new Promise((_,reject)=>{timeout=setTimer(()=>reject(Error('本次读取超时，已停止等待；可手动重试')),readBudgetMs);})]);
   if(request!==sequence||disposed||chosen()!==id)return;render(info);
   el('notice').textContent=info.role==='design'?(info.frontend?.message||(!info.frontend?.companyDisplayName?'设计页已连接，账号尚未确认；不会自动循环检测':'')):'';
  }catch(e){if(request===sequence&&!disposed&&chosen()===id){clear();el('readIdentity').hidden=page.role!=='design';el('notice').textContent='读取未完成：'+e.message;}}
  finally{clearTimer(timeout);jobs.delete(id);if(!disposed&&chosen()===id){el('readIdentity').disabled=page.role!=='design';el('pages').disabled=!snapshot?.pages.some(p=>p.connected);}if(!disposed&&queued&&!refreshJob){queued=false;changed();}}})();
  jobs.set(id,job);return job;
 }
 function refresh(){
  if(disposed)return Promise.resolve();if(refreshJob)return refreshJob;if(jobs.has(chosen()))return jobs.get(chosen());
  const previous=el('pages').value,request=++sequence;el('refresh').disabled=true;
  refreshJob=(async()=>{try{
   const result=await list(api);if(request!==sequence||disposed)return;snapshot=result;el('browser').textContent=result.browser||'当前浏览器';el('pages').replaceChildren();
   const pages=result.pages.filter(p=>p.connected);for(const p of pages){const option=document.createElement('option');option.value=String(p.tabId);option.textContent=(p.role==='config'?'后台配置':'前端设计')+' · '+(p.title||'未命名');el('pages').append(option);}
   el('pages').value=pages.some(p=>String(p.tabId)===previous)?previous:String(pages.find(p=>p.tabId===result.activeTabId)?.tabId??pages[0]?.tabId??'');el('pages').disabled=!pages.length;
   await selected(false);
  }catch(e){if(request===sequence&&!disposed){snapshot=null;clear();el('pages').replaceChildren();el('notice').textContent='刷新失败：'+e.message;}}
  finally{refreshJob=null;if(!disposed){el('refresh').disabled=false;if(queued){queued=false;changed();}}}})();return refreshJob;
 }
 function changed(){if(disposed)return;if(refreshJob||jobs.has(chosen())){queued=true;return;}clearTimer(timer);timer=setTimer(()=>{timer=null;void refresh();},180);}
 function invalidateSelected(id){if(chosen()===id){++sequence;clear();el('notice').textContent='目标页面已变化，旧账号结果已清除';}}
 function listen(event,fn){event?.addListener(fn);disposers.push(()=>event?.removeListener?.(fn));}
 el('refresh').addEventListener('click',()=>void refresh());
 el('pages').addEventListener('change',()=>{++sequence;clear();void selected(false);});
 el('readIdentity').addEventListener('click',()=>void selected(true));
 el('connect').addEventListener('click',async()=>{el('connect').disabled=true;try{const r=await api.runtime.sendMessage({type:'mcpConnect'});if(r?.error)throw Error(r.error);await connection();}catch(e){el('notice').textContent=e.message;}finally{el('connect').disabled=false;}});
 listen(api.tabs.onCreated,tab=>{if(pageRole(tab?.url||tab?.pendingUrl))changed();});
 listen(api.tabs.onRemoved,id=>{if(tracked(id)){invalidateSelected(id);if(snapshot)snapshot.pages=snapshot.pages.filter(p=>p.tabId!==id);changed();}});
 listen(api.tabs.onReplaced,(_added,removed)=>{if(tracked(removed)){invalidateSelected(removed);changed();}});
 listen(api.tabs.onUpdated,(id,c,tab)=>{if(!tracked(id)&&!pageRole(c.url||tab?.url))return;if('url'in c||c.status==='loading'||c.discarded)invalidateSelected(id);if('url'in c||'discarded'in c||c.status==='complete')changed();});
 listen(api.windows?.onRemoved,id=>{if(snapshot?.pages.some(p=>p.windowId===id)){if(snapshot.pages.find(p=>p.tabId===chosen())?.windowId===id)invalidateSelected(chosen());changed();}});
 const focus=()=>void connection();window?.addEventListener('focus',focus);
 const interval=setRepeating(()=>void connection(),8000);
 function dispose(){disposed=true;++sequence;clearTimer(timer);clearRepeating(interval);for(const remove of disposers)remove();window?.removeEventListener?.('focus',focus);}
 window?.addEventListener('unload',dispose);clear();void refresh();void connection();return{refresh,selected,changed,dispose};
}
