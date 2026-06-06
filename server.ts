import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Chat completions endpoint proxy (supports streaming)
  app.post('/api/chat', async (req, res) => {
    const { messages, model, baseUrl, apiKey, stream } = req.body;
    
    try {
      // standard openai-compatible endpoint format
      const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ messages, model, stream })
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err || response.statusText });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        if (response.body) {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          res.end();
        }
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (e: any) {
      console.error('Chat API Error:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
  });

  // Image generations endpoint proxy
  app.post('/api/image', async (req, res) => {
    const { prompt, model, baseUrl, apiKey, image, images } = req.body;
    
    try {
      const safeBaseUrl = baseUrl || 'https://api.openai.com/v1';
      let url = `${safeBaseUrl.replace(/\/$/, '')}/images/generations`;
      let options: RequestInit;

      if (image && image.startsWith('data:image/')) {
        url = `${safeBaseUrl.replace(/\/$/, '')}/images/edits`;
        
        // Use Node's built-in FormData and Blob (Node 18+)
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', model);
        if (req.body.n) formData.append('n', String(req.body.n));
        if (req.body.size) formData.append('size', String(req.body.size));

        const imgArray = images && images.length > 0 ? images : (image ? [image] : []);
        
        for (let i = 0; i < imgArray.length; i++) {
          const img = imgArray[i];
          if (!img.startsWith('data:image/')) continue;
          
          const base64Data = img.split(',')[1];
          const mimeType = img.split(';')[0].split(':')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const blob = new Blob([buffer], { type: mimeType });
          const filename = mimeType === 'image/png' ? (i === 0 ? 'image.png' : 'mask.png') : (i === 0 ? 'image.jpeg' : 'mask.jpeg');
          
          if (i === 0) {
            formData.append('image', blob, filename);
          } else if (i === 1) {
             formData.append('mask', blob, filename);
          }
        }

        options = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData as unknown as BodyInit
        };
      } else {
        const bodyPayload: any = { prompt, model, ...req.body };
        delete bodyPayload.baseUrl;
        delete bodyPayload.apiKey;

        // Ensure n and size are present for standards, but let proxy override if they want
        if (!bodyPayload.n) bodyPayload.n = 1;
        if (!bodyPayload.size) bodyPayload.size = "1024x1024";

        const imgArray = images && images.length > 0 ? images : (image ? [image] : []);
        if (imgArray.length > 0) {
           bodyPayload.base64Array = imgArray;
        }

        options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(bodyPayload)
        };
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        let errStr = await response.text();
        try {
          const errJson = JSON.parse(errStr);
          if (errJson.error && errJson.error.message) {
            errStr = errJson.error.message;
          }
        } catch (e) {}
        return res.status(response.status).json({ error: errStr || response.statusText });
      }

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        throw new Error(`API returned invalid JSON (Status: ${response.status}):\n${rawText.slice(0, 500)}`);
      }
      res.json(data);
    } catch (e: any) {
      console.error('Image API Error:', e);
      res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
  });

  // Proxy for fetching images to bypass CORS
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).send('Missing url');
      const response = await fetch(imageUrl);
      if (!response.ok) return res.status(response.status).send(response.statusText);
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.send(Buffer.from(buffer));
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler to always return JSON for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('API Error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Internal Server Error', details: err.stack });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
