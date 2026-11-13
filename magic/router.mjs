import {resolveMagicRoute,routeFromFragment} from './routes.mjs';
// No htmx dependency: every route is a checked-in, same-origin fragment.
const stage=document.getElementById('magicStage');
const locationLabel=document.getElementById('browserLocation');
let lastRequest=0,controller=null,current='home';
function statusText(text){const container=document.createElement('section');container.className='magic-route-error';container.setAttribute('role','status');container.textContent=text;stage.replaceChildren(container);}
export async function navigateMagic(name,{history=true}={}){
 const route=resolveMagicRoute(name);
 if(!route){statusText('Unknown Magic Browser route. Select an existing tab.');return {ok:false,error:'unknown_route'};}
 const id=++lastRequest;
 controller?.abort();
 controller=new AbortController();
 try{
  const url=new URL(route.file,import.meta.url);
  if(url.origin!==location.origin||!/\/magic\/surfaces\/[a-z0-9-]+\.html$/.test(url.pathname))throw Error('route_origin_denied');
  const response=await fetch(url,{cache:'no-store',redirect:'error',signal:controller.signal,headers:{'accept':'text/html'}});
  if(!response.ok)throw Error('HTTP_'+response.status);
  const mime=response.headers.get('content-type')||'';
  if(mime&&!mime.includes('text/html'))throw Error('invalid_fragment_type');
  const html=await response.text();
  if(id!==lastRequest)return {ok:false,error:'superseded'};
  stage.innerHTML=html; // Trusted static fragments from same-origin allowlist; no user-derived path.
  current=route.id;
  if(locationLabel)locationLabel.textContent='cryptic://magic/'+current;
  document.querySelectorAll('.browser-actions [data-route]').forEach(b=>{
   const selected=resolveMagicRoute(b.dataset.route)?.id===current;
   b.classList.toggle('is-active',selected);
   b.setAttribute('aria-pressed',String(selected));
  });
  if(history)window.history.replaceState(window.history.state,'','#magic='+encodeURIComponent(current));
  window.dispatchEvent(new CustomEvent('cryptic:magic:route',{detail:{route:current,path:url.pathname,ok:true}}));
  return {ok:true,route:current};
 }catch(error){
  if(id!==lastRequest)return {ok:false,error:'superseded'};
  const detail=error instanceof Error?error.message:'unexpected_error';
  statusText('Route '+route.id+' is unavailable ('+detail+'). Your workspace and credentials were not changed.');
  window.dispatchEvent(new CustomEvent('cryptic:magic:route',{detail:{route:route.id,ok:false,error:detail}}));
  return {ok:false,route:route.id,error:detail};
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button[data-route],button[hx-get]');
 if(!button)return;
 const route=button.dataset.route?resolveMagicRoute(button.dataset.route):routeFromFragment(button.getAttribute('hx-get'));
 if(!route)return;
 event.preventDefault();void navigateMagic(route.id);
});
window.addEventListener('hashchange',()=>{
 const m=/^#magic=([a-z0-9-]+)$/.exec(location.hash);
 if(m&&resolveMagicRoute(m[1])?.id!==current)void navigateMagic(m[1],{history:false});
});
const initial=/^#magic=([a-z0-9-]+)$/.exec(location.hash)?.[1]||'home';
void navigateMagic(resolveMagicRoute(initial)?.id||'home',{history:false});
window.CrypticMagicNavigator=Object.freeze({navigate:navigateMagic,get currentRoute(){return current;}});
