# TravelMind

TravelMind is a local-first AI assistant for planning tourism and hospitality
software projects. It turns a project brief into a compact software
requirements specification (SRS), then compares six software development
life-cycle (SDLC) models and recommends one for the supplied requirements.

The application is configured for tourism and hospitality only. It supports
hotel, resort, accommodation, guest-service, tour, activity, restaurant,
event, destination, and tourism-partner scenarios.

## Features

- React single-page interface with Overview, Requirements Engine, SDLC Engine,
  and SDLC guide sections.
- Requirements generation from a tourism or hospitality project brief.
- Editable requirements draft that can be sent to the SDLC selector.
- Comparison of Waterfall, V-Model, Prototype, RAD, Spiral, and Agile.
- Streaming responses over server-sent events.
- Local model-health status and request cancellation.
- Markdown rendering and copy controls in the browser.
- Local LM Studio model access through an OpenAI-compatible API.
- Retrieval-augmented generation (RAG) over the approved project corpus.
- A Mastra workflow for running requirements generation followed by SDLC
  selection and writing Markdown/HTML evaluation previews.

Mastra is an internal implementation framework. It is not presented as a
product label in the website.

## Request flow

1. The React client sends a brief to `POST /api/requirements`, or a
   requirements draft to `POST /api/sdlc`.
2. The Express server validates the request and streams the response from the
   corresponding Mastra agent.
3. The RAG input processor searches the read-only local BM25 workspace and
   adds excerpts from the approved corpus.
4. The browser renders streamed text as it arrives. Stopping a request keeps
   the text already received.

The server also exposes `GET /api/health`, which checks whether LM Studio is
reachable and whether the configured model is available.

## Project structure

```text
TravelMind/
├── docs/
│   ├── CORPUS_SHA256.txt              Integrity hashes for indexed documents
│   ├── CORPUS_SOURCES.md              Corpus publishers, links, and scope
│   ├── TOURISM_ONLY_DOMAIN.md         Configured domain boundary
│   └── ingested/
│       ├── product/                   SDLC selection guidance
│       ├── security/                  Cybersecurity and LLM security guidance
│       └── tourism/                   Tourism and hospitality evidence
├── public/
│   └── manus-routes.json              Client route metadata
├── scripts/
│   └── package-zip.py                 Source ZIP packaging utility
├── skills/
│   └── tourism-requirements-document/
│       └── SKILL.md                   Requirements and SDLC guidance
├── src/
│   ├── client/
│   │   ├── App.tsx                    React application and API interactions
│   │   ├── main.tsx                   Browser entry point
│   │   └── styles.css                 Application styles
│   ├── mastra/
│   │   ├── agent-utils.ts             Agent result helpers
│   │   ├── config.ts                  Environment-backed configuration
│   │   ├── index.ts                   Mastra instance and LibSQL storage
│   │   ├── lm-studio.ts               OpenAI-compatible model provider
│   │   ├── pdf-tool.ts                PDF-related Mastra tool
│   │   ├── prompts.ts                 Agent instructions
│   │   ├── rag.ts                     BM25 retrieval and evidence formatting
│   │   ├── tourism-agents.ts          Requirements and SDLC agents
│   │   ├── workflow.ts                Sequential requirements-to-SDLC workflow
│   │   └── workspace.ts               Read-only corpus workspace
│   └── server.ts                      Express API and Vite integration
├── .env.example                       Local configuration template
├── index.html                         Vite HTML entry point
├── package.json                        Scripts and dependencies
├── package-lock.json                   Locked dependency versions
├── tsconfig.json                       TypeScript configuration
└── vite.config.ts                      Vite configuration
```

Generated or local-only content is intentionally omitted from the tree above:
`node_modules/`, `dist/`, `.mastra/`, `.runtime/`, `artifacts/`, `.env`, and
the local database files.

## Requirements and SDLC output

The Requirements Agent produces these sections:

1. Summary
2. Assumptions
3. Stakeholders
4. Functional Requirements
5. Non-Functional Requirements
6. Constraints
7. External Interfaces to be Used

Functional requirements use `F001`, `F002`, and later IDs. Non-functional
requirements use `NF001`, `NF002`, and later IDs. Each requirement includes a
priority and acceptance criterion. The SRS does not include evidence fields or
local evidence paths.

The SDLC Selection Agent compares all six supported models against the supplied
SRS, selects exactly one, explains the fit and trade-offs, and identifies
unsupported details as `NEEDS-VALIDATION`.

## Evidence corpus

The read-only BM25 workspace indexes only the files configured in
`src/mastra/workspace.ts`:

- Tourism and hospitality evidence in `docs/ingested/tourism/`
- SDLC selection criteria and the tourism SDLC decision guide
- NIST CSF 2.0 and NIST SSDF guidance
- OWASP LLM Top 10 2025 guidance

The retrieval filter in `src/mastra/rag.ts` applies an additional allowlist and
limits the number and size of excerpts added to an agent request. The corpus is
static project material, not a live legal or standards feed. It is used for
requirements discovery, not to determine legal applicability, compliance,
certification, safety, or accessibility approval. See
[`docs/CORPUS_SOURCES.md`](docs/CORPUS_SOURCES.md) and
[`docs/TOURISM_ONLY_DOMAIN.md`](docs/TOURISM_ONLY_DOMAIN.md).

## Prerequisites

- Node.js 22.13 or newer
- npm
- LM Studio with a compatible local chat model

The default model is `qwen3.5-4b`, served by LM Studio at
`http://127.0.0.1:1234/v1`. Load the model in LM Studio and start its
OpenAI-compatible local server before generating requirements.

## Installation

```bash
npm ci
```

Create a local environment file from the template.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Update `LM_STUDIO_MODEL` if the model identifier shown by LM Studio differs
from the default.

## Run locally

Start the development server:

```bash
npm run dev
```

Open `http://127.0.0.1:4173` unless `TRAVELMIND_HOST` or `TRAVELMIND_PORT` is
configured differently.

## Build and validate

```bash
npm run typecheck
npm run build
```

`npm run build` runs the TypeScript check and creates the browser bundle in
`dist/`. The combined check is:

```bash
npm run check
```

There is currently no automated test script in `package.json`.

To run the production server after building:

PowerShell:

```powershell
$env:NODE_ENV = "production"
npm start
```

macOS/Linux:

```bash
NODE_ENV=production npm start
```

## Configuration

Configuration is loaded by `src/mastra/config.ts` from `.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LM_STUDIO_BASE_URL` | `http://127.0.0.1:1234/v1` | LM Studio API base URL |
| `LM_STUDIO_API_KEY` | `lm-studio` | Compatibility token for the local endpoint |
| `LM_STUDIO_MODEL` | `qwen3.5-4b` | Model ID sent to LM Studio |
| `TRAVELMIND_HOST` | `127.0.0.1` | Server bind address |
| `TRAVELMIND_PORT` | `4173` | Server port |
| `TRAVELMIND_WORKSPACE_ROOT` | Auto-detected | Optional repository root containing `docs/ingested` |
| `MASTRA_DATABASE_URL` | `file:./architect.db` | Mastra LibSQL persistence URL |
| `MASTRA_TELEMETRY_DISABLED` | Not set in code | Optional Mastra telemetry setting |

The server binds to loopback by default. Change the host only when network
access is intentional.

## Mastra workflow

`src/mastra/workflow.ts` defines `requirementsThenSdlc`, a sequential workflow
that:

1. Generates the requirements document.
2. Selects and explains an SDLC.
3. Writes `artifacts/evaluation/latest.md` and
   `artifacts/evaluation/latest.html`.

The workflow is separate from the browser API endpoints, which call the two
agents directly and stream their output.

## Create a source ZIP

The packaging script excludes dependencies, build output, runtime directories,
environment files, database files, logs, caches, and generated artifacts.

PowerShell:

```powershell
python scripts/package-zip.py
```

This creates `..\TravelMind.zip`. An explicit output path can be supplied:

```powershell
python scripts/package-zip.py C:\path\to\TravelMind.zip
```

## Limitations

TravelMind drafts requirements and provides an SDLC comparison. It is not a
booking engine, payment processor, property-management system, legal advisor,
or final authority for security, safety, accessibility, certification, or
operational decisions. Qualified project and domain owners must validate
outputs before implementation or release.

## License

This project is released under the MIT License. See
[`LICENSE`](LICENSE).
