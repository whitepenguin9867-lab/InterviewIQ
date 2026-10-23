// Tiny Node server: no frameworks or dependencies required.
const http = require('http');
const fs = require('fs');
const path = require('path');

// Read the local .env file without installing a package.
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch (_) { /* .env is optional */ }

const publicDir = path.join(__dirname, 'public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
function reply(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let content = '';
    req.on('data', chunk => {
      content += chunk;
      if (content.length > 15_000_000) { reject(new Error('Request too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(content || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function safeText(value, max = 3000) { return String(value || '').slice(0, max); }

async function askGemini(body) {
  const { role, type, context: extraContext, history, instruction } = body;
  const context = `You are a supportive mock interviewer for a student project. Interview type: ${safeText(type, 80)}. Role/topic: ${safeText(role, 200)}. Candidate or job context: ${safeText(extraContext, 800) || 'None provided'}. Conversation: ${JSON.stringify(history || []).slice(0, 12000)}. ${safeText(instruction, 4000)}`;
  async function requestModel(model) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(35_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: context }] }],
        generationConfig: {
          temperature: body.json ? 0.3 : 0.7,
          maxOutputTokens: body.json ? 2400 : 500,
          thinkingConfig: { thinkingLevel: 'low' },
          ...(body.json ? { responseMimeType: 'application/json' } : {})
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error?.message || 'Gemini request failed');
      error.status = response.status;
      throw error;
    }
    return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || '';
  }
  try {
    return await requestModel('gemini-3.8-flash');
  } catch (error) {
    if (![429, 503].includes(error.status)) throw error;
    return requestModel('gemini-3.7-flash');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/config' && req.method === 'GET') {
      return reply(res, 200, { gemini: Boolean(process.env.GEMINI_API_KEY), deepgram: Boolean(process.env.DEEPGRAM_API_KEY) });
    }
    if (req.url === '/api/ask' && req.method === 'POST') {
      if (!process.env.GEMINI_API_KEY) return reply(res, 400, { error: 'Gemini key not configured.' });
      const body = await readJson(req);
      const answer = await askGemini(body);
      return reply(res, 200, { text: answer });
    }
    if (req.url === '/api/transcribe' && req.method === 'POST') {
      if (!process.env.DEEPGRAM_API_KEY) return reply(res, 400, { error: 'Deepgram key not configured.' });
      const body = await readJson(req);
      if (!body.audio || body.audio.length > 14_000_000) return reply(res, 400, { error: 'Audio is missing or too large.' });
      const audio = Buffer.from(body.audio, 'base64');
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&filler_words=true', {
        method: 'POST',
        headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': safeText(body.mime, 100) || 'audio/webm' },
        body: audio
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.err_msg || data.message || 'Deepgram request failed');
      return reply(res, 200, { text: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '' });
    }
    if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed' });
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const filePath = path.resolve(publicDir, '.' + (urlPath === '/' ? '/index.html' : urlPath));
    if (!filePath.startsWith(publicDir + path.sep)) return reply(res, 403, { error: 'Forbidden' });
    fs.readFile(filePath, (err, content) => {
      if (err) return reply(res, 404, { error: 'Page not found' });
      res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
      res.end(content);
    });
  } catch (error) {
    reply(res, 500, { error: error.message });
  }
});
server.listen(Number(process.env.PORT) || 3000, () => console.log('InterviewIQ: http://localhost:' + (process.env.PORT || 3000)));
