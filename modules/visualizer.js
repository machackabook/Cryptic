export function mount(root){
 const c=root.querySelector('#visualizerCanvas'),ctx=c.getContext('2d',{alpha:true,desynchronized:true});
 let w=0,h=0,dpr=1,on=true,last=0,fps=0,frames=0,stamp=performance.now(),mx=.5,my=.5;
 function resize(){const r=c.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);dpr=Math.min(devicePixelRatio||1,1.5);c.width=Math.floor(w*dpr);c.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
 addEventListener('resize',resize,{passive:true});addEventListener('pointermove',e=>{mx=e.clientX/innerWidth;my=e.clientY/innerHeight},{passive:true});resize();
 function orbit(ca,cb,t,scale){let x=0,y=0,p=[];for(let i=0;i<28;i++){let nx=x*x-y*y+ca,ny=2*x*y+cb;x=nx;y=ny;if(x*x+y*y>25)break;const a=t*.00006;const rx=x*Math.cos(a)-y*Math.sin(a),ry=x*Math.sin(a)+y*Math.cos(a);p.push([w*.5+Math.tanh(rx*.8)*scale,h*.48+Math.tanh(ry*.8)*scale*.52])}return p}
 function draw(t){if(!on)return;ctx.clearRect(0,0,w,h);const g=ctx.createRadialGradient(w*.5,h*.44,0,w*.5,h*.5,Math.max(w,h)*.8);g.addColorStop(0,'rgba(12,39,70,.44)');g.addColorStop(.42,'rgba(3,14,31,.34)');g.addColorStop(1,'rgba(0,2,8,.92)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const cx=w*(.5+(mx-.5)*.018),cy=h*(.46+(my-.5)*.012),scale=Math.min(w,h)*.34;
  for(let r=0;r<9;r++){const rr=70+r*33+Math.sin(t*.0007+r)*6;ctx.strokeStyle=`rgba(${70+r*8},${170+r*5},255,${.075-r*.004})`;ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(cx,cy,rr,rr*(.28+r*.012),Math.sin(t*.00005+r*.4)*.55,0,Math.PI*2);ctx.stroke()}
  const count=Math.max(70,Math.min(180,Math.floor(w/7)));for(let i=0;i<count;i++){const a=i/count*Math.PI*2,ca=-.743+Math.cos(a*2.03+t*.000021)*(.13+.018*Math.sin(i)),cb=.131+Math.sin(a*1.37-t*.000018)*.13,pts=orbit(ca,cb,t,scale);if(pts.length<2)continue;ctx.strokeStyle=`hsla(${184+(i%37)*2.4},95%,70%,${.018+.048*(i%6)/6})`;ctx.lineWidth=.5+(i%3)*.17;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.stroke()}
  const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,145);glow.addColorStop(0,'rgba(255,255,255,.94)');glow.addColorStop(.035,'rgba(163,251,255,.86)');glow.addColorStop(.17,'rgba(65,218,255,.25)');glow.addColorStop(.44,'rgba(92,79,255,.08)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,150,0,Math.PI*2);ctx.fill();
  for(let i=0;i<42;i++){const a=i/42*Math.PI*2+t*.000035*(1+i%3),rr=125+(i%10)*31+Math.sin(t*.0006+i)*9,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.42;ctx.fillStyle=i%8===0?'rgba(245,206,112,.82)':'rgba(90,234,255,.67)';ctx.beginPath();ctx.arc(x,y,1+(i%4)*.45,0,Math.PI*2);ctx.fill()}
 }
 function loop(t){requestAnimationFrame(loop);if(!on||document.hidden||t-last<28)return;last=t;draw(t);frames++;if(t-stamp>=1000){fps=Math.round(frames*1000/(t-stamp));frames=0;stamp=t;window.dispatchEvent(new CustomEvent('cryptic:visualizer-fps',{detail:{fps}}))}}
 requestAnimationFrame(loop);
 window.CrypticVisualizer={setEnabled(v){on=Boolean(v);c.style.opacity=on?'1':'0'},toggle(){this.setEnabled(!on)},get enabled(){return on},resize};
}
