import { pageRole } from '../browser-extension/pages.js';
export class ConnectionMonitor {
  constructor({freshnessMs=15000}={}) { this.freshnessMs=freshnessMs; this.reports=new Map(); this.lastToolCall=null; }
  report(clientId,instanceId,input,now=Date.now()) {
    if (!input || !['Chrome','Edge'].includes(input.browser) || !Array.isArray(input.pages) || input.pages.length>100) throw new Error('Invalid browser heartbeat');
    const pages=input.pages.map(page=>{
      if (!Number.isSafeInteger(page.tabId) || page.tabId<0 || !['config','design'].includes(page.role) || typeof page.url!=='string') throw new Error('Invalid heartbeat page');
      const url=new URL(page.url); if(pageRole(url.href)!==page.role)throw new Error('Heartbeat page role mismatch');
      return {tabId:page.tabId,pageId:clientId+':'+page.tabId,role:page.role,url:url.origin+url.pathname,title:String(page.title||'').slice(0,160),accessible:page.connected===true,constructionWorkspaceVerified:false};
    });
    this.reports.set(clientId,{clientId,instanceId,browser:input.browser,extensionVersion:String(input.extensionVersion||'').slice(0,32),reportedAt:now,pages});
  }
  remove(id){this.reports.delete(id);}
  toolCalled(name,now=Date.now()){this.lastToolCall={name:String(name).slice(0,100),at:now};}
  snapshot(now=Date.now()){
    return {checkedAt:now,service:'running',lastToolCall:this.lastToolCall,browsers:['Chrome','Edge'].map(browser=>{
      const profiles=[...this.reports.values()].filter(r=>r.browser===browser).map(r=>({clientId:r.clientId,extensionVersion:r.extensionVersion,heartbeatAgeMs:Math.max(0,now-r.reportedAt),fresh:now-r.reportedAt<this.freshnessMs,pages:now-r.reportedAt<this.freshnessMs?r.pages:[]}));
      return {browser,state:profiles.some(p=>p.fresh)?'connected':profiles.length?'heartbeat_expired':'not_connected',expectedRole:browser==='Chrome'?'config':'design',profiles,pages:profiles.filter(p=>p.fresh).flatMap(p=>p.pages)};
    }),accountOwnership:'not_verified',templateType:'not_verified',constructionWorkspace:'not_verified',businessValidation:'not_verified'};
  }
}
