import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LocalFilesystem, Workspace } from '@mastra/core/workspace';

export const workspaceRoot = [
  process.env.TRAVELMIND_WORKSPACE_ROOT,
  process.env.INIT_CWD,
  process.cwd(),
  resolve(process.cwd(), '../../..'),
].find((path): path is string => Boolean(path && existsSync(join(path, 'docs/ingested'))))
  ?? process.cwd();

export const architectWorkspace = new Workspace({
  id: 'architect-workspace',
  filesystem: new LocalFilesystem({ basePath: workspaceRoot, readOnly: true }),
  bm25: true,
  // The deployed corpus is intentionally Tourism and Hospitality only.
  // Security files and the SDLC criteria are cross-cutting evidence
  // required to build a responsible tourism software specification.
  autoIndexPaths: [
    'docs/ingested/tourism/**/*.txt',
    'docs/ingested/product/sdlc-selection-criteria.txt',
    'docs/ingested/product/tourism-sdlc-decision-guide.txt',
    'docs/ingested/security/nist-csf-2.0.txt',
    'docs/ingested/security/nist-ssdf-sp800-218.txt',
    'docs/ingested/security/owasp-llm-top-10-2025.txt',
  ],
  // Qwen's LM Studio chat template accepts one leading system message only.
  // Domain guidance is consolidated in the agent prompts, so do not inject
  // each discovered SKILL.md as an additional system message.
  skills: [],
  tools: { enabled: false },
});
