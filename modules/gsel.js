const MAX_TEXT = 240;
const PALETTES = [
  {a:[.5,.5,.5],b:[.5,.5,.5],c:[1,1,1],d:[0,.33,.67]},
  {a:[.8,.5,.4],b:[.2,.4,.2],c:[2,1,1],d:[0,.25,.25]},
  {a:[.5,.5,.5],b:[.5,.5,.5],c:[1,1,1],d:[.3,.2,.2]},
  {a:[0,.5,0],b:[.1,.5,.1],c:[.5,1,.5],d:[0,.5,.1]}
];
const VERTEX = `attribute vec2 a_position; varying vec2 v_uv; void main(){v_uv=a_position*.5+.5;v_uv.y=1.0-v_uv.y;gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAGMENT = `precision highp float; varying vec2 v_uv; uniform sampler2D u_mask; uniform float u_time,u_resolution_x,u_resolution_y,u_frequency,u_speed,u_amplitude,u_saturation,u_brightness; uniform int u_palette; uniform vec2 u_mouse; vec3 pal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));} void main(){vec2 uv=gl_FragCoord.xy/vec2(u_resolution_x,u_resolution_y);vec4 mask=texture2D(u_mask,v_uv);if(mask.a<.06)discard;float phase=u_time*u_speed*.3;float warp=smoothstep(.35,0.,distance(uv,u_mouse))*u_amplitude;float x=sin(uv.x*u_frequency+phase+warp*8.)*.4;float y=cos(uv.y*u_frequency*1.3-phase+x)*.4;float f=uv.x*x+uv.y*y;vec3 a,b,c,d;if(u_palette==0){a=vec3(.5);b=vec3(.5);c=vec3(u_saturation,1.,1.);d=vec3(0.,.33,.67);}else if(u_palette==1){a=vec3(.8,.5,.4);b=vec3(.2,.4,.2);c=vec3(2.,1.,1.);d=vec3(0.,.25,.25)*u_saturation;}else if(u_palette==2){a=vec3(.5);b=vec3(.5);c=vec3(1.);d=vec3(.3,.2,.2)*u_saturation;}else{a=vec3(0.,.5,0.);b=vec3(.1,.5,.1);c=vec3(.5,1.,.5);d=vec3(0.,.5,.1)*u_saturation;}gl_FragColor=vec4(pal(f+phase,a,b,c,d)*u_brightness,mask.a);}`;

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const text=(root,role,value)=>{const el=root.querySelector(`[data-gsel-role="${role}"]`);if(el)el.textContent=String(value);};
function shader(gl,type,source){const result=gl.createShader(type);if(!result)return null;gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)){gl.deleteShader(result);return null;}return result;}

export function mount(host){
  const root=host?.matches?.('[data-gsel-root]')?host:host?.querySelector?.('[data-gsel-root]');
  if(!root)return()=>{};
  root.__gselCleanup?.();
  const canvas=root.querySelector('[data-gsel-role="canvas"]');
  const fallback=root.querySelector('[data-gsel-role="fallback"]');
  const textCanvas=document.createElement('canvas');
  const textCtx=textCanvas.getContext('2d');
  const gl=canvas?.getContext?.('webgl',{alpha:true,antialias:true});
  let raf=0,resizeObserver=null;
  const fail=()=>{if(canvas)canvas.hidden=true;if(fallback)fallback.hidden=false;text(root,'status','WEBGL UNAVAILABLE');root.querySelector('[data-gsel-role="status"]')?.setAttribute('data-state','error');};
  if(!canvas||!textCtx||!gl){fail();return()=>{};}
  const vertex=shader(gl,gl.VERTEX_SHADER,VERTEX),fragment=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
  const program=vertex&&fragment?gl.createProgram():null;
  if(!program){fail();return()=>{};}
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);fail();return()=>{};}
  const position=gl.getAttribLocation(program,'a_position');
  const uniforms=Object.fromEntries(['u_mask','u_time','u_resolution_x','u_resolution_y','u_frequency','u_speed','u_amplitude','u_saturation','u_brightness','u_palette','u_mouse'].map(name=>[name,gl.getUniformLocation(program,name)]));
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  const state={text:'',frequency:4.5,speed:1.2,amplitude:.8,saturation:.9,brightness:1.1,palette:0,font:'900 32px Inter',mouse:{x:.5,y:.5},targetMouse:{x:.5,y:.5},start:performance.now()};
  const listeners=[];const on=(el,event,handler)=>{el?.addEventListener(event,handler);if(el)listeners.push(()=>el.removeEventListener(event,handler));};
  const resize=()=>{const width=clamp(Math.round((canvas.clientWidth||800)*Math.min(devicePixelRatio||1,2)),320,1600);const height=Math.round(width*9/16);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;textCanvas.width=width;textCanvas.height=height;}text(root,'resolution',`${canvas.width} × ${canvas.height}`);};
  resize();resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;resizeObserver?.observe(canvas);
  const updateTexture=(value)=>{const target=String(value??'').slice(0,MAX_TEXT);if(state.text===target&&textCanvas.width===canvas.width)return;state.text=target;textCtx.clearRect(0,0,textCanvas.width,textCanvas.height);textCtx.textAlign='center';textCtx.textBaseline='middle';textCtx.fillStyle='#fff';textCtx.font=state.font;const words=target.split(/\s+/).filter(Boolean);const lines=[];let line='';for(const word of words){const candidate=line?`${line} ${word}`:word;if(textCtx.measureText(candidate).width>textCanvas.width*.85&&line){lines.push(line);line=word;}else line=candidate;}if(line||!lines.length)lines.push(line);const lineHeight=Math.max(24,Math.min(64,textCanvas.height/Math.max(lines.length,1)*.8));const start=(textCanvas.height-(lines.length*lineHeight))/2+lineHeight/2;lines.forEach((item,index)=>textCtx.fillText(item,textCanvas.width/2,start+index*lineHeight));gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textCanvas);};
  const updateMatrix=(value)=>{const container=root.querySelector('[data-gsel-role="matrix"]');if(!container)return;container.replaceChildren();const chars=[...String(value??'').slice(0,MAX_TEXT)];for(const char of chars){if(/\s/.test(char))continue;const token=document.createElement('button');token.type='button';token.className='gsel-token';token.textContent=char;const code=char.codePointAt(0)||0;const metadata={char,glyph_id:code,category:'aeiouAEIOU'.includes(char)?'modulation_vowel':'structural_consonant',semantic_weight:Number(((((code*7)%100)/100)*.6+.3).toFixed(2)),visual:{hue_seed:(code*3)%360,saturation:Number(state.saturation.toFixed(2))}};const inspect=()=>{container.querySelectorAll('.gsel-token').forEach(item=>item.setAttribute('data-active','false'));token.setAttribute('data-active','true');text(root,'inspector',JSON.stringify(metadata,null,2));};on(token,'pointerenter',inspect);on(token,'focus',inspect);on(token,'click',inspect);container.append(token);}};
  const bindRange=(role,key,digits)=>{const input=root.querySelector(`[data-gsel-role="${role}"]`);const update=()=>{const min=Number(input.min),max=Number(input.max);state[key]=clamp(Number(input.value)||0,min,max);input.value=String(state[key]);text(root,`${role}-value`,state[key].toFixed(digits));};on(input,'input',update);update();};
  bindRange('frequency','frequency',1);bindRange('speed','speed',1);bindRange('amplitude','amplitude',2);bindRange('saturation','saturation',2);bindRange('brightness','brightness',2);
  const seed=root.querySelector('[data-gsel-role="seed"]');on(seed,'input',()=>{const value=seed.value.slice(0,MAX_TEXT);if(seed.value!==value)seed.value=value;updateMatrix(value);});on(root.querySelector('[data-gsel-role="font"]'),'change',(event)=>{state.font=event.currentTarget.value;state.text='';});
  root.querySelectorAll('[data-gsel-role="palettes"] [data-palette]').forEach(button=>on(button,'click',()=>{state.palette=clamp(Number(button.dataset.palette)||0,0,PALETTES.length-1);root.querySelectorAll('[data-gsel-role="palettes"] [data-palette]').forEach(item=>item.setAttribute('data-active',String(item===button)));}));
  on(canvas,'pointermove',(event)=>{const rect=canvas.getBoundingClientRect();state.targetMouse.x=clamp((event.clientX-rect.left)/Math.max(rect.width,1),0,1);state.targetMouse.y=1-clamp((event.clientY-rect.top)/Math.max(rect.height,1),0,1);});on(canvas,'pointerleave',()=>{state.targetMouse.x=.5;state.targetMouse.y=.5;});
  updateMatrix(seed?.value||'');text(root,'status','WEBGL READY');root.querySelector('[data-gsel-role="status"]')?.setAttribute('data-state','ready');
  let last=performance.now(),frames=0;
  const draw=(now)=>{frames++;if(now-last>=1000){text(root,'fps',Math.round(frames*1000/(now-last)));frames=0;last=now;}const elapsed=(now-state.start)/1000;text(root,'time',elapsed.toFixed(4));state.mouse.x+=(state.targetMouse.x-state.mouse.x)*.1;state.mouse.y+=(state.targetMouse.y-state.mouse.y)*.1;text(root,'mouse',`${state.mouse.x.toFixed(2)}, ${state.mouse.y.toFixed(2)}`);updateTexture(seed?.value||'');gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.005,.008,.015,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.enableVertexAttribArray(position);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.uniform1f(uniforms.u_time,elapsed);gl.uniform1f(uniforms.u_resolution_x,canvas.width);gl.uniform1f(uniforms.u_resolution_y,canvas.height);gl.uniform1f(uniforms.u_frequency,state.frequency);gl.uniform1f(uniforms.u_speed,state.speed);gl.uniform1f(uniforms.u_amplitude,state.amplitude);gl.uniform1f(uniforms.u_saturation,state.saturation);gl.uniform1f(uniforms.u_brightness,state.brightness);gl.uniform1i(uniforms.u_palette,state.palette);gl.uniform2f(uniforms.u_mouse,state.mouse.x,state.mouse.y);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.u_mask,0);gl.drawArrays(gl.TRIANGLES,0,6);raf=requestAnimationFrame(draw);};raf=requestAnimationFrame(draw);
  const cleanup=()=>{cancelAnimationFrame(raf);resizeObserver?.disconnect();listeners.splice(0).forEach(remove=>remove());gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);delete root.__gselCleanup;};root.__gselCleanup=cleanup;return cleanup;
}

if(document.documentElement.dataset.gselStandalone==='true')mount(document.querySelector('[data-gsel-root]'));
