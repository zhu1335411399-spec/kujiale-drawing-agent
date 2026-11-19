import { bridgeStatus, connectBridge, disconnectBridge, pollBridge, collectLineOptions, collectLineColor, perform } from './native-bridge.js';
import { collectPages, browserProfileScope } from './page-check.js';
import {frontendAccountReader} from './frontend-account-reader.js';

const frontendAccounts=frontendAccountReader();

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (![chrome.runtime.getURL('popup.html'), chrome.runtime.getURL('sidepanel.html')].includes(sender.url)) return;
  if(message.type==='readFrontendAccountUi'){
    if(!Number.isInteger(message.tabId)||typeof message.force!=='boolean'){reply({error:'Invalid account request'});return;}
    frontendAccounts.read(message.tabId,{force:message.force}).then(reply,error=>reply({error:error.message}));return true;
  }
  if (message.type === 'captureApiUi') {
    if (!['start', 'stop', 'read', 'clear'].includes(message.action) || !Number.isInteger(message.tabId)) { reply({ error: 'Invalid capture action' }); return; }
    perform({ operation: 'capture-api', args: { tabId: message.tabId, action: message.action } }).then(reply, error => reply({ error: error.message })); return true;
  }
  if (message.type === 'apiReadUi') {
    if (!['observed-requests', 'templates', 'full-config'].includes(message.resource) || !Number.isInteger(message.tabId)) { reply({ error: 'Invalid readonly target' }); return; }
    perform({ operation: 'api-read', args: { tabId: message.tabId, resource: message.resource } }).then(reply, error => reply({ error: error.message }));
    return true;
  }
  const actions = { mcpStatus: () => bridgeStatus(), mcpConnect: () => connectBridge(), mcpDisconnect: () => disconnectBridge(), collectLineOptions, collectLineColor };
  if (actions[message.type]) {
    actions[message.type]().then(reply, error => reply({ error: error.message }));
    return true;
  }
  if (message.type !== 'check') return;
  collectPages().then(result => reply({ ...result, ...browserProfileScope(), detectorProtocol: 3 }), error => reply({ error: error.message }));
  return true;
});

void pollBridge();
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
