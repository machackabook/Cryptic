import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Serve static assets from project root
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
