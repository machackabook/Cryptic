/** TDOC-12014 • Public Magic Browser route contract.
 * Checked-in, same-origin HTML fragments only. No arbitrary URL navigation.
 * A route selection never grants backend permissions.
 */
export const MAGIC_ROUTES=Object.freeze({
  home:'home',terminal:'terminal',galaxies:'galaxies',genie:'genie',
  consensus:'consensus',voice:'voice',singularity:'singularity',
  sentinel:'sentinel',quine:'quine',embedding:'embedding',
  documents:'documents',irc:'irc',matrix:'matrix',
  telemetry:'telemetry',bus:'bus',nodes:'nodes',welcome:'welcome',
  network:'network',aurora:'aurora',rules:'rules'
});
export const ROUTE_ALIASES=Object.freeze({comms:'bus',docs:'rules'});
export function resolveMagicRoute(name){
  if(typeof name!=='string'||name.length>50)return null;
  const id=Object.hasOwn(MAGIC_ROUTES,name)?name:ROUTE_ALIASES[name];
  return id&&Object.hasOwn(MAGIC_ROUTES,id)?Object.freeze({id,file:'./surfaces/'+MAGIC_ROUTES[id]+'.html'}):null;
}
export function routeFromFragment(url){
  if(typeof url!=='string')return null;
  const m=/^(?:\.\/)?surfaces\/([a-z0-9-]+)\.html$/.exec(url);
  return m?resolveMagicRoute(m[1]):null;
}
export function safeMagicSurfaceUrl(relative,base,origin){
  if(typeof relative!=='string'||!/^\.\.\/(?:interfaces\/[a-z0-9-]+\.html|panel\.html(?:\?[a-z0-9=&-]+)?)$/i.test(relative))return null;
  const u=new URL(relative,base);
  return u.origin===origin?u:null;
}
