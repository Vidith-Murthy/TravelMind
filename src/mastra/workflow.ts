import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { requirementsAgent, sdlcSelectionAgent } from './tourism-agents';
import { textFromGenerateResult } from './agent-utils';
import { workspaceRoot } from './workspace';

const previewDir = join(workspaceRoot, 'artifacts/evaluation');

const listRequirements = createStep({
  id: 'list-requirements',
  description: 'Requirements Agent lists software requirements.',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ requirements: z.string() }),
  execute: async ({ inputData }) => {
    const result = await requirementsAgent.generate(
      `${inputData.prompt}\n\nCOMPACT MODE: output exactly these sections: Summary, Assumptions, Stakeholders, Functional Requirements, Non-Functional Requirements, Constraints, External Interfaces to be Used. Use 6–8 functional requirements numbered F001 onward and separate non-functional requirements numbered NF001 onward. Put one requirement per line with priority and acceptance criterion. Do not include evidence fields, evidence citations, or local paths. Stop after External Interfaces to be Used; do not add commentary.`,
    );
    const requirements = textFromGenerateResult(result);
    if (!requirements) throw new Error('Requirements Agent returned no text');
    return { requirements };
  },
});

const selectSdlc = createStep({
  id: 'select-sdlc',
  description: 'SDLC Selection Agent chooses and justifies a lifecycle for the SRS.',
  inputSchema: z.object({ requirements: z.string() }),
  outputSchema: z.object({
    requirements: z.string(),
    sdlc: z.string(),
    document: z.string(),
  }),
  execute: async ({ inputData }) => {
    const result = await sdlcSelectionAgent.generate(
      `COMPACT MODE: output exactly the required SDLC sections, compare all six models in one small table, select one, justify it briefly, and stop after Residual Risk. Do not repeat the SRS.\n\n${inputData.requirements}`,
    );
    const sdlc = textFromGenerateResult(result);
    if (!sdlc) throw new Error('SDLC Selection Agent returned no text');
    return {
      requirements: inputData.requirements,
      sdlc,
      document: `${inputData.requirements.trim()}\n\n---\n\n${sdlc.trim()}`,
    };
  },
});

const writePreview = createStep({
  id: 'write-preview',
  description: 'Write Markdown and HTML previews under artifacts/evaluation.',
  inputSchema: z.object({
    requirements: z.string(),
    sdlc: z.string(),
    document: z.string(),
  }),
  outputSchema: z.object({
    requirements: z.string(),
    sdlc: z.string(),
    document: z.string(),
    markdownPath: z.string(),
    htmlPath: z.string(),
  }),
  execute: async ({ inputData }) => {
    await mkdir(previewDir, { recursive: true });
    const markdownPath = join(previewDir, 'latest.md');
    const htmlPath = join(previewDir, 'latest.html');
    await writeFile(markdownPath, `${inputData.document.trim()}\n`, 'utf8');
    await writeFile(htmlPath, htmlPreview(inputData.document), 'utf8');
    return { ...inputData, markdownPath, htmlPath };
  },
});

const htmlPreview = (markdown: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="theme-color" content="#0c4a6e"/>
  <title>TravelMind · Tourism & Hospitality Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
  <style>
    :root{--navy:#082f49;--blue:#0c4a6e;--teal:#0f766e;--sand:#f5f1e8;--ink:#193142;--muted:#64748b;--line:#dbe7ee;--card:#fff;}
    *{box-sizing:border-box} body{margin:0;background:linear-gradient(135deg,#eff8fb 0%,#f8f5ef 48%,#eef7f4 100%);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif;line-height:1.65}
    .shell{max-width:1180px;margin:0 auto;padding:28px 22px 70px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:26px}.brand{display:flex;align-items:center;gap:12px;color:var(--navy);font-weight:700}.mark{width:42px;height:42px;border-radius:14px;background:var(--navy);color:#bfe9e2;display:grid;place-items:center;font-size:20px}.eyebrow{color:var(--teal);font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}.actions{display:flex;gap:10px;align-items:center}.btn{border:1px solid var(--line);background:#ffffffc9;color:var(--blue);border-radius:10px;padding:9px 13px;font:600 13px inherit;cursor:pointer}.btn:hover{background:#fff;border-color:#9ccbc5}.hero{background:var(--navy);border-radius:24px;padding:34px 38px;color:#f8fafc;box-shadow:0 20px 50px #082f4922;position:relative;overflow:hidden}.hero:after{content:'';position:absolute;width:300px;height:300px;border-radius:50%;right:-90px;top:-130px;background:#38b2ac2b}.hero h1{font:700 clamp(30px,4vw,50px)/1.08 'Playfair Display',serif;margin:8px 0 12px;max-width:780px}.hero p{color:#c8dde7;max-width:760px;margin:0}.pill{display:inline-flex;align-items:center;gap:7px;border:1px solid #7dd3c7aa;border-radius:99px;padding:5px 10px;color:#b7f1e8;font-size:12px;font-weight:600}.grid{display:grid;grid-template-columns:240px minmax(0,1fr);gap:22px;margin-top:22px}.panel,.report{background:#ffffffdc;border:1px solid #fff;border-radius:18px;box-shadow:0 10px 30px #0f4c5c12}.panel{padding:18px;height:max-content;position:sticky;top:18px}.panel h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin:0 0 12px}.toc a{display:block;color:var(--blue);padding:8px 10px;border-radius:8px;text-decoration:none;font-size:14px}.toc a:hover{background:#e6f4f2}.report{padding:30px 36px}.report h1{font:700 32px 'Playfair Display',serif;color:var(--navy);border-bottom:1px solid var(--line);padding-bottom:18px}.report h2{font:700 23px 'Playfair Display',serif;color:var(--blue);margin-top:34px;padding-top:12px;border-top:1px solid var(--line)}.report h3{color:var(--teal)}.report table{border-collapse:collapse;width:100%;display:block;overflow:auto;margin:15px 0}.report th{background:#e4f2f0;color:var(--navy);text-align:left}.report th,.report td{border:1px solid var(--line);padding:10px 12px;min-width:130px;vertical-align:top}.report blockquote{border-left:4px solid #48a9a6;background:#eefaf7;padding:10px 16px;margin-left:0;color:#315766}.report code{background:#eef2f6;border-radius:5px;padding:2px 5px}.footer{color:var(--muted);font-size:12px;margin-top:18px;text-align:right}@media(max-width:760px){.shell{padding:16px 12px 45px}.hero{padding:26px 22px;border-radius:18px}.grid{grid-template-columns:1fr}.panel{position:static}.report{padding:22px 18px}.topbar{align-items:flex-start;flex-direction:column}.actions{width:100%}.btn{flex:1}}
  </style>
</head>
<body><main class="shell">
  <header class="topbar"><div class="brand"><span class="mark">R</span><span>TravelMind <small style="font-weight:500;color:var(--muted)">/ hospitality intelligence</small></span></div><div class="actions"><button class="btn" onclick="window.print()">Print / PDF</button><button class="btn" onclick="navigator.clipboard?.writeText(document.getElementById('content').innerText)">Copy report</button></div></header>
  <section class="hero"><span class="pill">● TOURISM & HOSPITALITY · RAG-GROUNDED</span><h1>Requirements that keep the guest journey moving.</h1><p>Agentic requirements analysis with evidence, traceability, operational risk, and a project-specific SDLC recommendation.</p></section>
  <section class="grid"><aside class="panel"><h2>Report navigation</h2><nav id="toc" class="toc"></nav><div class="footer">Generated by Requirements Agent → SDLC Selection Agent</div></aside><article id="content" class="report"></article></section>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><script>
    const source=${JSON.stringify(markdown)}; const content=document.getElementById('content'); content.innerHTML=marked.parse(source);
    const headings=[...content.querySelectorAll('h2,h3')]; document.getElementById('toc').innerHTML=headings.map((h,i)=>{const id='section-'+i;h.id=id;return '<a href="#'+id+'">'+h.textContent+'</a>'}).join('');
  </script>
</main></body></html>`;

export const requirementsThenSdlc = createWorkflow({
  id: 'requirements-then-sdlc',
  description: 'Two-agent course flow: list requirements, then select a justified SDLC. Writes artifacts/evaluation/latest.md and latest.html.',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({
    requirements: z.string(),
    sdlc: z.string(),
    document: z.string(),
    markdownPath: z.string(),
    htmlPath: z.string(),
  }),
})
  .then(listRequirements)
  .then(selectSdlc)
  .then(writePreview)
  .commit();

export const runRequirementsThenSdlc = async (prompt: string) => {
  const run = await requirementsThenSdlc.createRun();
  const result = await run.start({ inputData: { prompt } });
  if (result.status !== 'success') {
    const message = result.status === 'failed' ? result.error.message : result.status;
    throw new Error(`Workflow failed: ${message}`);
  }
  return result.result;
};
