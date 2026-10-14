import {isIP} from 'node:net';

function privateCidr(value){
 if(typeof value!=='string'||!/^\d{1,3}(?:\.\d{1,3}){3}\/(?:[1-9]|[12][0-9]|3[0-2])$/.test(value))return false;
 const [ip,bits]=value.split('/');if(isIP(ip)!==4)return false;
 const bytes=ip.split('.').map(Number),prefix=Number(bits);
 const privateRange=bytes[0]===10&&prefix>=8||bytes[0]===172&&bytes[1]>=16&&bytes[1]<=31&&prefix>=12||bytes[0]===192&&bytes[1]===168&&prefix>=16;
 const number=bytes.reduce((n,b)=>n*256+b,0);return privateRange&&number%2**(32-prefix)===0;
}
export function buildVpnPlan(input){
 if(!input||!['cloudflare','tailscale'].includes(input.provider))throw Error('vpn_provider_required');
 const keys=new Set(['provider','hostname','cidr','operators']);
 if(Object.keys(input).some(k=>!keys.has(k)))throw Error('unexpected_vpn_parameter');
 const hostname=input.hostname||'',cidr=input.cidr||'';
 if(!hostname&&!cidr)throw Error('private_destination_required');
 if(hostname&&(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)||hostname.length>253))throw Error('invalid_private_hostname');
 if(cidr&&!privateCidr(cidr))throw Error('specific_private_ipv4_cidr_required');
 if(!Array.isArray(input.operators)||!input.operators.length||input.operators.length>20||input.operators.some(s=>typeof s!=='string'||s.length>254||! /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(s)||/[\r\n"\\]/.test(s)))throw Error('explicit_operator_identities_required');
 const steps=input.provider==='cloudflare'?[
  'Select the domain-owning account and a narrowly scoped pilot identity policy.',
  'Run the remotely managed cloudflared connector on the approved collector host.',
  'Create only the specified private route/hostname route and matching Include-mode WARP profile.',
  'Create default-deny Access authorization with the explicit operators; configure enrollment and private DNS resolution.',
  'Validate allowed/denied operator traffic, collector authentication, DNS routing, and rollback before wider rollout.'
 ]:[
  'Enroll only the approved host and assign the restricted bridge/resolver tags.',
  'Validate explicit operators and TCP443 grants using the private tailnet policy.',
  'Serve the loopback collector through tailnet-only HTTPS; keep Funnel and Tailscale SSH disabled.',
  'Configure only the required private DNS zone; validate actual allowed/denied traffic before rollout.'
 ];
 return {schema:'cryptic.vpn.plan.v1',provider:input.provider,destination:{hostname:hostname||null,cidr:cidr||null},operators:[...new Set(input.operators)],steps,applied:false,connectivity:'unverified',requiredTransport:'HTTPS TCP443 plus collector bearer authentication',rollback:'Remove the new pilot route/profile/application or Serve mapping; restore the retained previous configuration.',qualification:'A validated review plan, not deployed VPN enforcement. Keep real destinations and identities in private storage.'};
}
