import puppeteer from 'puppeteer-core';
import lighthouse from 'lighthouse';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {allowedURL,removeOwnedProfile} from '../broker.mjs';

/** Optional adapter; uses Lighthouse's official Puppeteer page API, never a debug TCP port. */
export async function audit(config,input){
  if(!config.enableLighthouse)throw new Error('lighthouse_disabled');
  const url=allowedURL(input.url,config.origins);
  if(!path.isAbsolute(config.executable||'')||!/^[a-f0-9]{64}$/.test(config.executableSHA256||''))throw new Error('verified_browser_binary_required');
  if(createHash('sha256').update(await readFile(config.executable)).digest('hex')!==config.executableSHA256)throw new Error('browser_binary_hash_mismatch');
  if(!path.isAbsolute(config.receiptDir||''))throw new Error('private_receipt_directory_required');
  const profile=await mkdtemp(path.join(tmpdir(),'nexus-lighthouse-'));let browser;
  try{
    const env=Object.fromEntries(['PATH','SystemRoot','WINDIR','SystemDrive','ComSpec','LOCALAPPDATA','APPDATA','USERPROFILE'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
    browser=await puppeteer.launch({executablePath:config.executable,pipe:true,userDataDir:profile,headless:true,timeout:60000,defaultViewport:null,ignoreDefaultArgs:['--enable-automation'],args:['--disable-sync','--disable-extensions','--disable-background-networking'],env});
    const page=await browser.newPage();
    const result=await lighthouse(url,{output:'json',maxWaitForLoad:30000,onlyCategories:['performance','accessibility','best-practices','seo']},undefined,page);
    if(!result?.lhr||result.lhr.runtimeError)throw new Error('lighthouse_audit_failed');
    const report=JSON.stringify(result.lhr);const reportSHA256=createHash('sha256').update(report).digest('hex');
    const reportId=randomUUID();await writeFile(path.join(config.receiptDir,'lighthouse-'+reportId+'.json'),report,{mode:0o600,flag:'wx'});
    return {source:'lighthouse',version:result.lhr.lighthouseVersion,categories:Object.fromEntries(Object.entries(result.lhr.categories).map(([name,value])=>[name,value.score])),reportId,reportSHA256,transport:'private-pipe',productionVerified:false};
  }finally{await browser?.close();await removeOwnedProfile(profile);}
}
