(() => {
 const canvas=document.getElementById('sphereCanvas');
 const ctx=canvas?.getContext('2d');
 const output=document.getElementById('similarityOutput');
 if(!canvas||!ctx)return;
 let w=0,h=0,rotX=0,rotY=0,frame=0;
 const points=[
  {label:'Example text point',color:'#00ffcc',x:.5,y:.2,z:.8},
  {label:'Example image point',color:'#9d5bfe',x:.45,y:-.3,z:.75},
  {label:'Example audio point',color:'#f5ce70',x:.6,y:.1,z:.7},
  {label:'Example baseline',color:'#38bdf8',x:.42,y:.28,z:.82},
  {label:'Example node point',color:'#22c55e',x:-.5,y:.4,z:.6}
 ];
 function resize(){const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,rect.width);h=Math.max(1,rect.height);canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
 function draw(t){if(!ctx)return;ctx.fillStyle='#010206';ctx.fillRect(0,0,w,h);const cx=w*.5,cy=h*.5,r=Math.min(w,h)*.35;rotY+=.003;rotX=Math.sin(t*.001)*.2;ctx.strokeStyle='rgba(85,244,255,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,r,r*.4,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,r*.4,r,0,0,Math.PI*2);ctx.stroke();points.forEach(p=>{const x=p.x*Math.cos(rotY)-p.z*Math.sin(rotY);const y=p.y*Math.cos(rotX)-(p.x*Math.sin(rotY)+p.z*Math.cos(rotY))*Math.sin(rotX);const px=cx+x*r,py=cy+y*r;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.strokeStyle=p.color;ctx.stroke();ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.fillText(p.label,px+8,py+3)});frame=requestAnimationFrame(draw)}
 function setOutput(s){if(output)output.textContent=s}
 document.getElementById('btnEmbed')?.addEventListener('click',()=>{
  const query=(document.getElementById('textInput')?.value||'').trim();
  setOutput(query?'NOT CONFIGURED — the input was not sent to an embedding API. No vector, hash, or receipt was generated.':'Enter text, then connect an authenticated embedding adapter. No request was sent.');
 });
 document.getElementById('btnCosine')?.addEventListener('click',()=>setOutput('UNAVAILABLE — cosine similarity requires two actual embedding vectors. This page contains illustration coordinates only; no similarity score was computed.'));
 addEventListener('resize',resize,{passive:true});resize();frame=requestAnimationFrame(draw);
 addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
})();