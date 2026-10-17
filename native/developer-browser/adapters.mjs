import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const execute=promisify(execFile);
export async function adbDevices({executable,sha256}) {
  if(!path.isAbsolute(executable||'')||!/^[a-f0-9]{64}$/.test(sha256||''))throw new Error('verified_adb_required');
  if(createHash('sha256').update(await readFile(executable)).digest('hex')!==sha256)throw new Error('adb_hash_mismatch');
  const {stdout}=await execute(executable,['devices','-l'],{shell:false,windowsHide:true,timeout:5000,maxBuffer:65536,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot}});
  return {source:'adb-devices',output:stdout,pairedByThisOperation:false};
}
export function hostCapabilities() {
  return {platform:process.platform,termux:process.platform==='android'&&Boolean(process.env.TERMUX_VERSION),adb:'operator-provided-verified-binary-required',ble:'browser-user-gesture-and-device-permission-required',apfs:process.platform==='darwin'?'synapse-securefs-adapter-required':'unsupported-on-this-host',pstn:'telecom-provider-required',signaling:'disabled',turn:'disabled',codeServer:'not_configured'};
}
