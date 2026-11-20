import { workflowInstructions } from './workflow.mjs';
import { tools, validateCall } from './tools.mjs';
import { dispatchLineStyleTool } from './line-style-dispatch.mjs';
import { dispatchAnnotationTool } from './annotation-dispatch.mjs';
import { dispatchObjectTool } from './object-dispatch.mjs';

export const versions = ['2025-03-26', '2025-06-18', '2025-11-25'];

export function createProtocol(broker) {
  return async function dispatch(request) {
    const fail = (code, message) => ({ jsonrpc: '2.0', id: request?.id ?? null, error: { code, message } });
    if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string' ||
        (request.id !== undefined && typeof request.id !== 'string' && typeof request.id !== 'number')) return fail(-32600, 'Invalid Request');
    if (request.id === undefined) return null;
    try {
      let result;
      switch (request.method) {
        case 'initialize':
          result = {
            protocolVersion: versions.includes(request.params?.protocolVersion) ? request.params.protocolVersion : versions.at(-1),
            capabilities: { tools: {} },
            serverInfo: { name: 'construction-drawing-readonly', version: '0.6.0' },
            instructions: workflowInstructions
          };
          break;
        case 'ping':
          result = {};
          break;
        case 'tools/list':
          result = { tools: tools.map(tool => ({ ...tool, annotations: tool.annotations || { readOnlyHint: true, openWorldHint: true } })) };
          break;
        case 'tools/call': {
          let args;
          try { args = validateCall(request.params?.name, request.params?.arguments); }
          catch (error) { return fail(-32602, error.message); }
          try {
            const name = request.params.name;
            if(name==='drawing_capture_frontend_view'){
              try{const value=await broker.page(args.pageId,'frontend-capture',args);const {imageDataUrl,...metadata}=value;const match=imageDataUrl&&/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]*={0,2})$/.exec(imageDataUrl);if(value.captured&&!match)throw Error('Screenshot returned an invalid image format');result={...(value.status!=='frontend-view-captured'?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(metadata)},...(match?[{type:'image',mimeType:'image/'+match[1],data:match[2]}]:[])]};}catch(error){if(!/Unsupported readonly operation/.test(error.message))throw error;result={isError:true,content:[{type:'text',text:JSON.stringify({status:'extension-reload-required',captured:false,effectVerified:false,message:'已加载的扩展尚无浏览器画面读取模块；请仅重新加载目标设计浏览器的施工图扩展一次。普通画布导出全黑不能用于效果验收。'})}]};}break;
            }
            if(name==='drawing_sync_frontend_configuration'){
              const value=await broker.page(args.pageId,'frontend-identity',{...args,syncTask:args.action,action:'hover',frameId:0,cacheResult:false});result={...(!['frontend-sync-inspected','frontend-config-update-observed','frontend-sync-unconfirmed'].includes(value.status)?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if(name==='drawing_frontend_navigation'){
              const value=await broker.page(args.pageId,'frontend-identity',{...args,navigationTask:args.action,action:'hover',frameId:0,drawingTask:'inspect',cacheResult:false});result={...((value.status!=='frontend-navigation-observed'||value.navigationOutcome!=='observed')?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if(name==='drawing_read_frontend_account'){
              try{const value=await broker.page(args.pageId,'frontend-account',args);result={content:[{type:'text',text:JSON.stringify(value)}]};}
              catch(error){if(!/Unsupported readonly operation/.test(error.message))throw error;result={isError:true,content:[{type:'text',text:JSON.stringify({status:'extension-reload-required',executed:false,saved:false,published:false,message:'共享账号检测模块尚未在此浏览器加载；请在扩展管理页重新加载施工图扩展一次，再打开侧栏。仅重新连接不会更新工作线程。'})}]};}break;
            }
            if(name==='drawing_inspect_frontend_drawing'){
              const value=await broker.page(args.pageId,'frontend-identity',{...args,action:'inspect',drawingTask:'inspect'});
              result={content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if(['drawing_inspect_object_config','drawing_update_object_properties','drawing_replace_object_line_style','drawing_save_object_config'].includes(name)){
              const value=await dispatchObjectTool(broker,name,args);
              result={...(!['object-config-observed','object-properties-observed','object-fields-verified','object-save-verified'].includes(value.status)?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if(['drawing_search_annotation_styles','drawing_create_annotation_style','drawing_update_annotation_style','drawing_save_annotation_styles'].includes(name)){
              const value=await dispatchAnnotationTool(broker,name,args);const ok=['annotation-search-read','annotation-fields-verified','annotation-save-verified'].includes(value.status);
              result={...(!ok?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if(name==='drawing_inspect_style_settings'){
              const value=await broker.page(args.pageId,'load-customer-config',{...args,customerName:args.expectedCustomerName,mode:'inspect',configurationTask:'inspect-style-settings'});
              result={...(!['style-settings-observed','editor-observed','editor-closed'].includes(value.status)?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if(['drawing_search_line_styles','drawing_update_line_style','drawing_save_line_style'].includes(name)){
              const value=await dispatchLineStyleTool(broker,name,args);
              const ok=name==='drawing_search_line_styles'?value.status==='search-results-read':name==='drawing_update_line_style'?['style-fields-verified','unchanged'].includes(value.status):value.saved||value.status==='unchanged';
              result={...(!ok?{isError:true}:{}),content:[{type:'text',text:JSON.stringify(value)}]};break;
            }
            if (name === 'drawing_save_config' || name === 'drawing_publish_config') {
              const snapshot = await broker.page(args.pageId, 'config', {});
              const actualName = snapshot?.identity?.configName;
              const operation = name === 'drawing_save_config' ? 'save' : 'publish';
              const mismatch = snapshot?.role !== 'config' || actualName !== args.expectedConfigName;
              const status = mismatch ? 'target_mismatch' : 'adapter_not_verified';
              const detail = {
                operation, status, executed: false, saved: false, published: false,
                pageId: args.pageId, expectedConfigName: args.expectedConfigName,
                actualConfigName: actualName || null,
                message: mismatch ? '目标配置与当前页面不符，未执行操作。' :
                  '目标已核对，但该写入操作的接口、确认流程及成功回读尚未实测验证，未执行。',
                nextStep: mismatch ? '重新读取上下文并定位目标配置。' :
                  '在测试配置中核对该操作的实际请求及回读证据，再接通执行适配器。'
              };
              result = { isError: true, content: [{ type: 'text', text: JSON.stringify(detail) }] };
              break;
            }
            const value = name === 'drawing_read_frontend_identity' ? await broker.page(args.pageId, 'frontend-identity', args) : name === 'drawing_load_customer_config' ? await broker.page(args.pageId, 'load-customer-config', args) : name === 'drawing_create_line_draft' ? await broker.page(args.pageId, 'create-line-draft', args) : name === 'drawing_new_line_style' ? await broker.page(args.pageId, 'new-line-only', args) : name === 'drawing_get_context' ? await broker.context() :
              await broker.page(args.pageId, name === 'drawing_capture_api' ? 'capture-api' : name === 'drawing_create_line_style_and_save' ? 'create-line-workflow' : name === 'drawing_read_api' ? 'api-read' : name === 'drawing_read_config' ? 'config' : name === 'drawing_create_line_style' ? 'create-line-style' : 'styles', args);
            result = { ...((name === 'drawing_create_line_draft' && value?.status !== 'draft-fields-verified') || (name === 'drawing_load_customer_config' && value?.status !== 'dialog-inspected' && !value?.loaded) || (name === 'drawing_read_frontend_identity' && value?.status === 'identity-read-failed') ? { isError: true } : {}), content: [{ type: 'text', text: JSON.stringify(value) }] };
          } catch (error) {
            result = { isError: true, content: [{ type: 'text', text: error.message }] };
          }
          break;
        }
        default:
          return fail(-32601, 'Method not found');
      }
      return { jsonrpc: '2.0', id: request.id, result };
    } catch {
      return fail(-32603, 'Internal error');
    }
  };
}

