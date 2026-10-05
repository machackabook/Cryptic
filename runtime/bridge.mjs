#!/usr/bin/env node
import http from 'node:http';

const HOST=process.env.CRYPTIC_BRIDGE_HOST || '127.0.0.1';
const PORT=Number(process.env.CRYPTIC_BRIDGE_PORT || 7331);
const TOKEN=process.env.CRYPTIC_BRIDGE_TOKEN;

if (!TOKEN) {
  console.error('CRYPTIC_BRIDGE_TOKEN is required. Set a local session token before starting the bridge.');
  process.exit(2);
}

function send(res,status,body){
  res.writeHead(status,{
    'content-type':'application/json',
    'access-control-allow-origin':'*',
    'access-control-allow-headers':'authorization,content-type,x-cryptic-request-token',
    'access-control-allow-methods':'GET,OPTIONS'
  });
  res.end(JSON.stringify(body));
}

const server=http.createServer((req,res)=>{
  if(req.method==='OPTIONS') return send(res,204,{});
  if(req.headers.authorization !== 'Bearer ' + TOKEN) return send(res,401,{ok:false,error:'unauthorized'});
  if(req.method==='GET' && req.url==='/health'){
    return send(res,200,{
      ok:true,
      runtime:'Cryptic Local Bridge',
      version:'0.5.0',
      host:HOST,
      port:PORT,
      platform:process.platform,
      arch:process.arch,
      node:process.version
    });
  }
  return send(res,404,{ok:false,error:'not_found'});
});

server.listen(PORT,HOST,()=>{
  console.log('Cryptic Local Bridge: http://' + HOST + ':' + PORT);
  console.log('Health-only bridge active. No shell execution is exposed.');
});
