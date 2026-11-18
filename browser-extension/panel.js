import {listPanelPages,readPanelPage,sourceName} from './panel-data.js';

export function startPanel({document=globalThis.document,api=chrome,window=globalThis.window,list=listPanelPages,read=readPanelPage,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,setRepeating=globalThis.setInterval,clearRepeating=globalThis.clearInterval}={}){
  const el=id=>document.getElementById(id);
  const unset='未读取';
  let sequence=0,snapshot=null,timer=null,disposed=false;
  const disposers=[];
  const set=(id,value)=>{el(id).textContent=value||unset;};
  const time=value=>value?new Date(value).toLocaleTimeString():'';
  const clear=()=>{
    for(const id of ['company','accountId','source','sourceId','template','pageId','tabId','clientId','url'])set(id,null);
    set('role','未选择页面');el('identityTime').textContent='';el('readIdentity').disabled=true;
    el('sourceRow').hidden=el('sourceIdRow').hidden=el('templateRow').hidden=true;
  };
  function render(info){
    set('role',info.role==='config'?'后台配置':'前端设计');
    set('company',info.role==='design'?info.frontend?.companyDisplayName:info.identity?.accountDisplayName);
    set('accountId',info.role==='design'?info.frontend?.visibleAccountId:info.identity?.accountId);
    const config=info.role==='config';
    el('sourceRow').hidden=el('sourceIdRow').hidden=el('templateRow').hidden=!config;
    set('source',sourceName(info.identity?.configStatusText));set('sourceId',info.identity?.configOwnerId);
    set('template',info.identity?.configName);
    const page=snapshot?.pages.find(p=>p.tabId===info.tabId);
    set('pageId',page?.pageId);set('tabId',String(info.tabId));set('clientId',snapshot?.clientId);set('url',info.url);
    el('readIdentity').hidden=config;el('readIdentity').disabled=config;
    el('identityTime').textContent=info.frontend?.readAt?'上次头像读取：'+time(info.frontend.readAt)+(info.frontend.cached?' · 需要时点击更新':''):
      config?'页面读取：'+time(info.readAt):'点击下方按钮读取头像中的名称和账号 ID';
  }
  async function connection(){
    try{
      const r=await api.runtime.sendMessage({type:'mcpStatus'});if(disposed)return;
      const fresh=r?.connected&&Date.now()-r.checkedAt<45000;
      el('connection').textContent=fresh?'已连接':r?.enabled===false?'连接已暂停':'未连接';
      el('connection').className=fresh?'connected':'disconnected';
      el('connectionDetail').textContent=fresh?'当前浏览器已连接本机服务':r?.error||'请确认本机施工图服务已启动';
    }catch(error){if(!disposed){el('connection').textContent='连接状态读取失败';el('connectionDetail').textContent=error.message;}}
  }
  async function selected(readIdentity=false){
    const id=Number(el('pages').value);const page=snapshot?.pages.find(p=>p.tabId===id);
    const identity=readIdentity&&page?.role==='design';
    const request=++sequence;clear();
    if(!page){el('notice').textContent='请在当前浏览器打开施工图后台或设计页';return;}
    el('notice').textContent=identity?'正在读取头像账号和 ID…':'正在读取页面…';
    try{
      const info=await read(id,{readIdentity:identity,api});if(request!==sequence||disposed)return;
      render(info);
      el('notice').textContent=identity?(info.frontend?.companyDisplayName?'账号信息已读取':'头像中未读取到名称，请确认设计页已加载完成'):'';
    }catch(error){if(request===sequence&&!disposed){clear();el('notice').textContent='读取失败：'+error.message;}}
  }
  async function refresh(){
    const request=++sequence;const previous=el('pages').value;clear();el('refresh').disabled=true;
    el('notice').textContent='正在刷新当前浏览器页面…';
    try{
      const result=await list(api);if(request!==sequence||disposed)return;
      snapshot=result;el('browser').textContent=result.browser||'当前浏览器';
      el('pages').replaceChildren();
      for(const page of result.pages.filter(p=>p.connected)){
        const option=document.createElement('option');option.value=String(page.tabId);
        option.textContent=(page.role==='config'?'后台配置':'前端设计')+' · '+(page.title||'未命名');el('pages').append(option);
      }
      const available=[...el('pages').options];
      el('pages').value=available.some(o=>o.value===previous)?previous:available[0]?.value||'';
      el('pages').disabled=!available.length;
      await selected(true);
    }catch(error){if(request===sequence&&!disposed){snapshot=null;clear();el('pages').replaceChildren();el('notice').textContent='刷新失败：'+error.message;}}
    finally{if(!disposed)el('refresh').disabled=false;}
  }
  function changed(){
    ++sequence;clear();el('notice').textContent='页面已变化，正在重新读取…';
    clearTimer(timer);timer=setTimer(()=>void refresh(),150);
  }
  function listen(event,fn){event?.addListener(fn);disposers.push(()=>event?.removeListener?.(fn));}
  el('refresh').addEventListener('click',()=>void refresh());
  el('pages').addEventListener('change',()=>void selected(true));
  el('readIdentity').addEventListener('click',()=>void selected(true));
  el('connect').addEventListener('click',async()=>{
    el('connect').disabled=true;
    try{const r=await api.runtime.sendMessage({type:'mcpConnect'});if(r?.error)throw Error(r.error);await connection();}
    catch(error){el('notice').textContent=error.message;}
    finally{el('connect').disabled=false;}
  });
  for(const event of [api.tabs.onRemoved,api.tabs.onCreated,api.tabs.onReplaced,api.windows?.onRemoved])listen(event,changed);
  listen(api.tabs.onUpdated,(_id,change)=>{if('url'in change||'discarded'in change||change.status==='loading')changed();});
  window?.addEventListener('focus',changed);
  const interval=setRepeating(()=>void connection(),8000);
  function dispose(){disposed=true;++sequence;clearTimer(timer);clearRepeating(interval);for(const remove of disposers)remove();window?.removeEventListener?.('focus',changed);}
  window?.addEventListener('unload',dispose);
  clear();void refresh();void connection();
  return{refresh,selected,changed,dispose};
}
