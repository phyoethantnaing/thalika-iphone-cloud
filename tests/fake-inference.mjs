// Explicit test double: never included in the production Docker image.
import http from 'node:http';
import { Buffer } from 'node:buffer';
export function fixtureWav(seconds = 8) {
  const samples = seconds * 48000; const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(48000,24); wav.writeUInt32LE(96000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++) wav.writeInt16LE(Math.round(Math.sin(i/48000*220*Math.PI*2)*7000),44+i*2);
  return wav;
}
export function startFake(port = 7860) {
  let submissions = 0;
  const server = http.createServer(async (request,response) => {
    const pathname = new URL(request.url,'http://localhost').pathname;
    const json = (body, status = 200) => { response.writeHead(status,{'Content-Type':'application/json'}); response.end(JSON.stringify(body)); };
    if (pathname === '/gradio_api/info') return json({ named_endpoints: { '/generate': {} } });
    if (pathname === '/gradio_api/upload') { for await(const _ of request){}; return json(['/tmp/reference.wav']); }
    if (pathname === '/gradio_api/call/generate' && request.method === 'POST') {
      const parts=[]; for await(const part of request) parts.push(part);
      const body=JSON.parse(Buffer.concat(parts));
      if(body.data.length!==11 || body.data[3]!==false || body.data[4]!=='' || typeof body.data[10]!=='number') return json({error:'Inference contract changed'},400);
      return json({event_id:String(++submissions)});
    }
    if (pathname.startsWith('/gradio_api/call/generate/')) {
      response.writeHead(200,{'Content-Type':'text/event-stream'});
      setTimeout(() => response.end(`event: complete\ndata: ${JSON.stringify([{url:`http://127.0.0.1:${port}/output.wav`}])}\n\n`),1500); return;
    }
    if(pathname === '/output.wav') { response.writeHead(200,{'Content-Type':'audio/wav'}); return response.end(fixtureWav(2)); }
    if(pathname === '/count') return json({submissions});
    return json({error:'test route missing'},404);
  });
  server.listen(port,'127.0.0.1'); return server;
}
