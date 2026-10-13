import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1';

app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
  let pathname;try{pathname=decodeURIComponent(req.path)}catch{return res.sendStatus(400)}
  const publicRoots=['ui','core','modules','interfaces','magic','terminal','living-ledger'];
  const publicFiles=['index.html','panel.html','manifest.webmanifest','sw.js','cryptic-runtime.js','cryptic-bus.js','cryptic-console.js'];
  const clean=pathname.replace(/^\//,'');
  if(clean.split('/').some(s=>s.startsWith('.')||s==='..')||!(clean===''||publicFiles.includes(clean)||clean==='config/nodes.public.json'||publicRoots.includes(clean.split('/')[0])))return res.sendStatus(404);
  next();
});
// Serve only approved public assets
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: ['index.html']
}));

// Route fallback for client-side navigation if HTML is requested
app.use((req, res) => {
  if (req.method === 'GET' && req.accepts('html') && !path.extname(req.path)) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Cryptic command center listening at http://${HOST}:${PORT}`);
});

