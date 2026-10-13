(() => {
 const output=document.getElementById('quineOutput');
 const size=document.getElementById('htmlSize');
 const chunkCount=document.getElementById('chunkCount');
 let observer=null;
 function updateSize(){const bytes=new TextEncoder().encode(document.documentElement.outerHTML).length;if(size)size.textContent=(bytes/1024).toFixed(2)+' KB ('+bytes+' B)'}
 document.getElementById('btnQuine')?.addEventListener('click',()=>{if(output)output.textContent=document.documentElement.outerHTML;updateSize()});
 document.getElementById('btnChunk')?.addEventListener('click',()=>{if(output)output.textContent='NOT CONFIGURED — no runtime chunk loader is attached to this public page. No chunk was downloaded or executed.';if(chunkCount)chunkCount.textContent='Dynamic chunks: unverified';updateSize()});
 document.getElementById('btnSynthesize')?.addEventListener('click',()=>{if(output)output.textContent='NOT CONFIGURED — no authenticated model adapter is connected. No token stream, model output, or quine synthesis was generated.'});
 updateSize();
 observer=new MutationObserver(()=>{if(size){const bytes=new TextEncoder().encode(document.documentElement.outerHTML).length;const value=(bytes/1024).toFixed(2)+' KB ('+bytes+' B)';if(size.textContent!==value)size.textContent=value}});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true});
 addEventListener('pagehide',()=>observer?.disconnect(),{once:true});
})();