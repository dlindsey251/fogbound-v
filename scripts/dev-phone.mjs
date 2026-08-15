import { networkInterfaces } from 'node:os';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

function getLanIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const ip = getLanIp();
const port = process.env.PORT || '5173';
const host = ip || '127.0.0.1';
const url = `http://${host}:${port}`;
const encodedUrl = encodeURIComponent(url);
const htmlPath = resolve(process.cwd(), 'local-access-qr.html');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fogbound Local Access QR</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        background: #0b0f17;
        color: #e7ebf3;
      }
      .card {
        width: min(92vw, 560px);
        border: 1px solid #243049;
        border-radius: 16px;
        padding: 20px;
        background: #121a29;
        text-align: center;
      }
      img {
        width: min(78vw, 360px);
        height: auto;
        border-radius: 12px;
        background: #fff;
        padding: 10px;
      }
      code {
        display: inline-block;
        margin-top: 12px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #0c1320;
        border: 1px solid #243049;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Scan To Open Fogbound</h1>
      <img
        alt="QR code for local Fogbound site"
        src="https://api.qrserver.com/v1/create-qr-code/?size=720x720&data=${encodedUrl}"
      />
      <div><code>${url}</code></div>
    </main>
  </body>
</html>
`;

writeFileSync(htmlPath, html, 'utf8');

console.log('');
console.log(`Phone URL: ${url}`);
console.log(`QR page: ${htmlPath}`);
console.log('Tip: open local-access-qr.html in a browser and scan the code from your iPhone.');
console.log('');

const viteArgs = ['vite', '--host', '--port', String(port), '--strictPort'];
const child = spawn('npx', viteArgs, { stdio: 'inherit', shell: process.platform === 'win32' });

child.on('exit', (code) => process.exit(code ?? 0));
