// Narrow, auditable compute primitive. NO eval(), Function(), importScripts(), fetch(), or code distribution.
self.onmessage=({data})=>{
  const {id,kind,a,b}=data||{};
  try{
    if(kind!=='vector.dot'||!Array.isArray(a)||!Array.isArray(b)||a.length<1||a.length>128||a.length!==b.length)throw Error('unsupported_job');
    let result=0;
    for(let i=0;i<a.length;i++){
      if(!Number.isFinite(a[i])||!Number.isFinite(b[i])||Math.abs(a[i])>1e6||Math.abs(b[i])>1e6)throw Error('invalid_vector');
      result+=a[i]*b[i];
    }
    if(!Number.isFinite(result))throw Error('nonfinite_result');
    self.postMessage({id,ok:true,result});
  }catch(e){self.postMessage({id,ok:false,error:String(e.message).slice(0,90)})}
};
