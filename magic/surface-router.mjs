import {approvedSurface,safeReference} from './security-guard.mjs';
/* Pseudo-htmx: constrained, same-origin, redirect-denying HTML fragment router. */
function sanitize(node,root,origin){
 for(const e of [...node.querySelectorAll('script,object,embed,base,meta[http-equiv],form')])e.remove();
 for(const e of node.querySelectorAll('*')){
  for(const attr of [...e.attributes]){
   const name=attr.name.toLowerCase();
   if(name.startsWith('on')||name==='srcdoc'||name==='formaction'||name==='autofocus'||name==='ping'||name==='http-equiv')e.removeAttribute(attr.name);
  }
  for(const attr of ['href','src']){
   if(!e.hasAttribute(attr))continue;
   const raw=e.getAttribute(attr);
   // A trusted fragment may use same-project URLs; an untrusted scheme is never honored.
   let u;try{u=new URL(raw,new URL('magic/',root))}catch{e.removeAttribute(attr);continue}
   if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.origin!==origin||!u.pathname.startsWith(new URL(root).pathname)||u.hash){
     if(attr==='src'&&e.tagName==='IFRAME')e.remove();else e.removeAttribute(attr);continue;
   }
   if(e.tagName==='IFRAME'){e.setAttribute('sandbox','allow-scripts');e.setAttribute('referrerpolicy','no-referrer')}
   if(e.tagName==='A'&&e.hasAttribute('href')){e.setAttribute('rel','noopener noreferrer')}
  }
 }
 return node;
}
export function installSecureRouter({root=new URL('../',location.href).href,stage=document.querySelector('#magicStage'),fetcher=fetch}={}){
 const origin=new URL(root).origin;
 async function open(raw){
  const route=approvedSurface(raw);if(!route)throw Error('GOD_ROUTE_DENIED');
  const dest=new URL(route,new URL('magic/',root));
  if(dest.origin!==origin)throw Error('GOD_CROSS_ORIGIN_BLOCKED');
  const r=await fetcher(dest.href,{mode:'same-origin',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'accept':'text/html'}});
  if(!r.ok||r.redirected||r.url&&new URL(r.url).href!==dest.href)throw Error('GOD_REDIRECT_OR_SOURCE_FAILED');
  const contentType=r.headers?.get('content-type')||'';if(!contentType.startsWith('text/html'))throw Error('GOD_BAD_MIME');
  const rawHtml=await r.text();if(rawHtml.length>250000)throw Error('GOD_FRAGMENT_TOO_LARGE');
  const doc=new DOMParser().parseFromString(rawHtml,'text/html');
  sanitize(doc.body,root,origin);
  const fragment=document.createDocumentFragment();
  while(doc.body.firstChild)fragment.append(doc.body.firstChild);
  stage.replaceChildren(fragment);
  document.dispatchEvent(new CustomEvent('htmx:afterSwap',{detail:{target:stage}}));
  return route;
 }
 document.addEventListener('click',event=>{
   const button=event.target.closest?.('[hx-get]');
   if(!button)return;
   event.preventDefault();open(button.getAttribute('hx-get')).catch(err=>{stage.textContent='GOD SECURITY GATE: '+err.message});
 });
 const startup=stage?.getAttribute('hx-get');if(startup)open(startup).catch(err=>{stage.textContent='GOD SECURITY GATE: '+err.message});
 return {open};
}
