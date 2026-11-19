// Self-contained DOM probe. Account reading does not depend on opening the drawing workspace.
export function readFrontendPageState(){
 const url=location.origin+location.pathname;
 const visible=n=>{if(!n?.getClientRects().length)return false;const r=n.getBoundingClientRect();if(r.width<=0||r.height<=0||r.x+r.width<=0||r.y+r.height<=0||r.x>=innerWidth||r.y>=innerHeight)return false;for(let p=n;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(s.visibility==='hidden'||s.display==='none'||s.opacity==='0')return false;}return true;};
 const edit=document.getElementById('drawings-edit-views'),layout=document.getElementById('drawings-generate-sheets');
 const drawingOpen=visible(edit)||visible(layout);
 const stage=document.readyState==='loading'?'loading':drawingOpen?(visible(layout)&&layout.classList.contains('selected')?'drawing-layout':'drawing-editor'):'design';
 return{documentEpoch:performance.timeOrigin,url,title:document.title,ready:document.readyState,hasContent:!!document.body?.children.length,workspace:{stage,drawingOpen,templateVerified:false,configurationUpdated:false,effectVerified:false,hint:drawingOpen?'施工图已打开；企业模板、更新配置和效果需单独核对':'普通设计端已连接，可检测账号；效果验证时再打开“图纸&清单”'}};
}
