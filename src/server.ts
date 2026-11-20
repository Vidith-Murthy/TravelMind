import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { Agent } from '@mastra/core/agent';
import { config } from './mastra/config';
import { requirementsAgent, sdlcSelectionAgent } from './mastra/tourism-agents';
import './mastra/index';

const root = process.cwd();
const port = Number(process.env.PORT ?? process.env.TRAVELMIND_PORT ?? 4173);
const host = process.env.TRAVELMIND_HOST ?? '127.0.0.1';
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_request, response) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);
  const endpoint = config.lmStudio.baseURL.replace(/\/+$/, '');
  try {
    const result = await fetch(`${endpoint}/models`, {
      headers: { Authorization: `Bearer ${config.lmStudio.apiKey}` },
      signal: controller.signal,
    });
    const catalog = result.ok
      ? await result.json().catch(() => null) as { data?: Array<{ id?: string }> } | null
      : null;
    const listedModels = catalog?.data?.map((model) => model.id).filter((id): id is string => Boolean(id));
    const modelAvailable = Array.isArray(listedModels) && listedModels.includes(config.lmStudio.model);
    response.json({
      ready: result.ok && modelAvailable,
      model: config.lmStudio.model,
      endpoint,
      message: !result.ok
        ? `LM Studio returned status ${result.status}.`
        : modelAvailable
          ? 'LM Studio responded and the configured model is available.'
          : `LM Studio is running, but the configured model is not listed. Set LM_STUDIO_MODEL to an ID shown by LM Studio.`,
    });
  } catch {
    response.json({
      ready: false,
      model: config.lmStudio.model,
      endpoint,
      message: 'LM Studio is not reachable. Start its local server and load the configured model.',
    });
  } finally {
    clearTimeout(timer);
  }
});

function sendEvent(response: Response, event: object) {
  if (!response.destroyed && !response.writableEnded) {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

async function streamAgent(agent: Agent, prompt: string, request: Request, response: Response) {
  const controller = new AbortController();
  response.status(200);
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();

  response.on('close', () => {
    if (!response.writableEnded) controller.abort();
  });
  request.on('aborted', () => controller.abort());

  try {
    const result = await agent.stream(prompt, { abortSignal: controller.signal });
    for await (const text of result.textStream) {
      if (controller.signal.aborted) break;
      sendEvent(response, { type: 'delta', text });
    }
    sendEvent(response, { type: controller.signal.aborted ? 'stopped' : 'done' });
  } catch (reason) {
    if (controller.signal.aborted) {
      sendEvent(response, { type: 'stopped' });
    } else {
      const message = reason instanceof Error ? reason.message : 'Generation failed.';
      sendEvent(response, { type: 'error', error: message });
    }
  } finally {
    if (!response.destroyed && !response.writableEnded) response.end();
  }
}

app.post('/api/requirements', async (request, response) => {
  const brief = typeof request.body?.brief === 'string' ? request.body.brief.trim() : '';
  if (brief.length < 12 || brief.length > 12000) {
    response.status(400).json({ error: 'Enter a project brief between 12 and 12,000 characters.' });
    return;
  }
  const prompt = `${brief}\n\nCOMPACT MODE: output exactly these sections: Summary, Assumptions, Stakeholders, Functional Requirements, Non-Functional Requirements, Constraints, External Interfaces to be Used. Use 6–8 functional requirements numbered F001 onward and separate non-functional requirements numbered NF001 onward. Put one requirement per line with priority and acceptance criterion. Do not include evidence fields, evidence citations, or local paths. Stop after External Interfaces to be Used; do not add commentary.`;
  await streamAgent(requirementsAgent, prompt, request, response);
});

app.post('/api/sdlc', async (request, response) => {
  const requirements = typeof request.body?.requirements === 'string' ? request.body.requirements : '';
  if (requirements.trim().length < 20 || requirements.length > 24000) {
    response.status(400).json({ error: 'Enter at least 20 characters of requirements and keep the draft under 24,000 characters.' });
    return;
  }
  const prompt = `COMPACT MODE: compare all six SDLC models fairly against the supplied requirements. Output exactly the required SDLC sections. In Decision Factors, connect the most important project constraints to SRS IDs and explain what is unknown. In the comparison table, give each model a 1–5 fit score and a short evidence-based reason. Select exactly one model, explain why it fits better than the closest alternatives, state the important trade-offs, and include a concise phased project workflow. Do not repeat the SRS. Use NEEDS-VALIDATION where the brief does not provide enough evidence.\n\n${requirements}`;
  await streamAgent(sdlcSelectionAgent, prompt, request, response);
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(resolve(root, 'dist')));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
      response.sendFile(resolve(root, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, host, () => {
    console.log(`TravelMind is ready at http://${host}:${port}`);
    console.log(`Local model: ${config.lmStudio.model} via ${config.lmStudio.baseURL}`);
  });
}

void start().catch((error: unknown) => {
  console.error('TravelMind failed to start:', error);
  process.exitCode = 1;
});
