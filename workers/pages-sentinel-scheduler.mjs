// Cryptic Pages Sentinel: Cloudflare hourly fallback when GitHub Actions runners are unavailable.
// No credentials, no inbound APIs, no writes to scanned repositories.
const OWNERS=['machackabook','Azazeleous','crypticmetaverse','thearchitectofgaia-boop'];
const LIMIT=12;
async function readJson(url){
 const r=await fetch(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'Cryptic-Pages-Sentinel'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('GitHub '+r.status+' on '+new URL(url).pathname);
 return r.json();
}
async function scanOne(repo){
 const site='https://'+repo.owner.login+'.github.io/'+repo.name+'/';
 const report={repo:repo.full_name,site,http:null,flags:[],files_scanned:0,coverage:'bounded'};
 try{const r=await fetch(site,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(8000)});report.http=r.status;if(r.status>=400)report.flags.push('pages_http_'+r.status)}
 catch(e){report.flags.push('pages_unreachable')}
 try{
   const tree=await readJson('https://api.github.com/repos/'+repo.full_name+'/git/trees/'+encodeURIComponent(repo.default_branch||'main')+'?recursive=1');
   const items=(tree.tree||[]).filter(x=>x.type==='blob'&&x.size<=100000&&/(^|\/)(index\.html|sw\.js|bridge\.mjs|robots\.txt|[^/]+\.html)$/.test(x.path)).slice(0,8);
   if(tree.truncated||items.length===8)report.flags.push('source_coverage_partial');
   for(const f of items){
     try{
       const path=f.path.split('/').map(encodeURIComponent).join('/');
       const url='https://raw.githubusercontent.com/'+repo.full_name+'/'+encodeURIComponent(repo.default_branch||'main')+'/'+path;
       const r=await fetch(url,{signal:AbortSignal.timeout(10000)});
       if(!r.ok)throw new Error('source_status_'+r.status);
       const body=await r.text();if(body.length>100000)continue;
       report.files_scanned++;
       if(/sandbox=["'][^"']*allow-scripts[^"']*allow-same-origin/i.test(body))report.flags.push('unsafe_sandbox:'+f.path);
       if(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(body))report.flags.push('private_key_marker:'+f.path);
       if(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/i.test(body)&&!/integrity=/.test(body))report.flags.push('review_unpinned_scripts:'+f.path);
     }catch(e){report.flags.push('source_read_failed:'+f.path)}
   }
 }catch(e){report.flags.push('tree_unavailable')}
 return report;
}
export default {
 async scheduled(event,env,ctx){
  const reports=[],errors=[];
  for(const owner of OWNERS){
   try{
    for(let page=1;page<=2;page++){
     const list=await readJson('https://api.github.com/users/'+owner+'/repos?type=owner&per_page=100&page='+page);
     if(!Array.isArray(list))throw new Error('Unexpected listing');
     for(const repo of list.filter(x=>x.has_pages===true&&!x.private&&!x.archived)){
      if(reports.length>=LIMIT){errors.push('coverage_cap_'+LIMIT);break}
      reports.push(await scanOne(repo));
     }
     if(reports.length>=LIMIT||list.length<100)break;
     if(page===2)errors.push('pagination_cap_'+owner);
    }
   }catch(e){errors.push('enumeration_failed_'+owner)}
  }
  console.log(JSON.stringify({schema:'cryptic.pages-sentinel.cloudflare.v1',ts:new Date(event.scheduledTime).toISOString(),repos:reports.length,findings:reports.filter(x=>x.flags.length>0).length,items:reports,errors,scope:'passive public Pages scan; not authorization or production proof'}));
 },
 async fetch(){return new Response('Cryptic Pages Sentinel has no public API.',{status:403,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}})}
};
