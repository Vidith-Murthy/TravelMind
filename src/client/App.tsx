import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Check,
  CheckCircle2, ChevronRight, CircleHelp, Clipboard, Compass, FileText,
  GitBranch, Hotel, Lightbulb, LoaderCircle, LockKeyhole, MessageSquareText,
  RotateCcw, ShieldCheck, Sparkles, Square, Timer, Waves,
  Zap,
} from 'lucide-react';

type Section = 'home' | 'requirements' | 'sdlc' | 'guide';
type StreamEvent = { type: 'delta'; text: string } | { type: 'done' | 'stopped' } | { type: 'error'; error: string };
type ModelStatus = { ready: boolean; model: string; endpoint: string; message: string };

const SAMPLE_BRIEF = 'Create a guest experience platform for a 120-room coastal boutique hotel. Guests should be able to book and manage stays, check in online, and request housekeeping or concierge services. Staff need a role-based operations dashboard. The platform must integrate with the existing property-management system and payment provider, support English and Japanese, and be ready before the summer peak season. A six-person team can get hotel-staff feedback every two weeks. Local privacy, accessibility, and safety requirements need review.';

const sections: Array<{ id: Section; label: string; detail: string; icon: typeof Compass }> = [
  { id: 'home', label: 'Overview', detail: 'Brief → recommendation', icon: Compass },
  { id: 'requirements', label: 'Requirements Engine', detail: 'Create or refine an SRS', icon: FileText },
  { id: 'sdlc', label: 'SDLC Engine', detail: 'Compare delivery models', icon: GitBranch },
  { id: 'guide', label: 'How to choose SDLC', detail: 'A practical decision guide', icon: BookOpen },
];

async function streamAgent(
  endpoint: string,
  payload: Record<string, string>,
  onText: (text: string) => void,
  signal: AbortSignal,
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `The request failed (${response.status}).`);
  }
  if (!response.body) throw new Error('This browser could not open the response stream.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const readFrame = (frame: string) => {
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue;
      let event: StreamEvent;
      try {
        event = JSON.parse(line.slice(5).trim()) as StreamEvent;
      } catch {
        continue;
      }
      if (event.type === 'delta') onText(event.text);
      if (event.type === 'error') throw new Error(event.error);
      if (event.type === 'done' || event.type === 'stopped') finished = true;
    }
  };

  try {
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        readFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) readFrame(buffer);
  } finally {
    reader.releaseLock();
  }
}

function Brand() {
  return (
    <div className="brand-lockup" aria-label="TravelMind">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M7 28.5c5.1-1.2 8.2-3.5 9.4-7.1 1.1-3.3 3.5-6.5 8.3-8.7 2.2-1 4.9-1.5 8.3-1.7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="m27.6 7.8 6.2 3.1-4.5 5.4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="29" r="3" fill="currentColor" />
          <circle cx="25" cy="13" r="2.6" fill="currentColor" />
        </svg>
      </span>
      <span className="brand-name">Travel<span>Mind</span></span>
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [brief, setBrief] = useState('');
  const [requirements, setRequirements] = useState('');
  const [sdlc, setSdlc] = useState('');
  const [isRequirementsBusy, setRequirementsBusy] = useState(false);
  const [isSdlcBusy, setSdlcBusy] = useState(false);
  const [isEditingRequirements, setEditingRequirements] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const requirementsController = useRef<AbortController | null>(null);
  const sdlcController = useRef<AbortController | null>(null);

  const refreshModelStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json() as ModelStatus;
      setModelStatus(data);
    } catch {
      setModelStatus({ ready: false, model: 'qwen3.5-4b', endpoint: '', message: 'TravelMind server is not responding.' });
    }
  }, []);

  useEffect(() => {
    void refreshModelStatus();
    const timer = window.setInterval(() => void refreshModelStatus(), 20000);
    return () => window.clearInterval(timer);
  }, [refreshModelStatus]);

  useEffect(() => {
    const navigate = (event: WindowEventMap['travelmind:navigate']) => {
      setActiveSection(event.detail);
      setError('');
      setNotice('');
    };
    window.addEventListener('travelmind:navigate', navigate);
    return () => window.removeEventListener('travelmind:navigate', navigate);
  }, []);

  const requirementsReady = useMemo(() => requirements.trim().length >= 20, [requirements]);
  const modelLabel = modelStatus?.model === 'qwen3.5-4b'
    ? 'Qwen 3.5 4B'
    : modelStatus?.model || 'Qwen 3.5 4B';

  const runRequirements = async () => {
    if (!brief.trim()) {
      setError('Add a short tourism or hospitality project brief to begin.');
      return;
    }
    setRequirements('');
    setSdlc('');
    setError('');
    setNotice('');
    setEditingRequirements(false);
    setRequirementsBusy(true);
    const controller = new AbortController();
    requirementsController.current = controller;
    try {
      await streamAgent('/api/requirements', { brief: brief.trim() }, (chunk) => {
        setRequirements((current) => current + chunk);
      }, controller.signal);
      if (!controller.signal.aborted) setNotice('Requirements draft is ready. Review it, then suggest an SDLC.');
    } catch (reason) {
      if (controller.signal.aborted) {
        setNotice('Generation stopped. Your partial requirements are kept and can still be used.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Requirements generation failed.');
      }
    } finally {
      requirementsController.current = null;
      setRequirementsBusy(false);
    }
  };

  const stopRequirements = () => requirementsController.current?.abort();

  const runSdlc = async (input = requirements) => {
    if (input.trim().length < 20) {
      setError('Add or generate a few requirements before requesting an SDLC recommendation.');
      return;
    }
    setError('');
    setNotice('');
    setSdlc('');
    setSdlcBusy(true);
    const controller = new AbortController();
    sdlcController.current = controller;
    try {
      await streamAgent('/api/sdlc', { requirements: input }, (chunk) => {
        setSdlc((current) => current + chunk);
      }, controller.signal);
      if (!controller.signal.aborted) setNotice('SDLC recommendation is ready. Review the trade-offs before deciding.');
    } catch (reason) {
      if (controller.signal.aborted) {
        setNotice('Recommendation generation stopped. The text generated so far is kept.');
      } else {
        setError(reason instanceof Error ? reason.message : 'SDLC recommendation failed.');
      }
    } finally {
      sdlcController.current = null;
      setSdlcBusy(false);
    }
  };

  const stopSdlc = () => sdlcController.current?.abort();
  const resetHome = () => {
    requirementsController.current?.abort();
    sdlcController.current?.abort();
    setBrief(''); setRequirements(''); setSdlc(''); setNotice(''); setError(''); setEditingRequirements(false);
  };

  const openSection = (id: Section) => {
    setActiveSection(id);
    setError('');
    setNotice('');
  };

  const pageTitle = sections.find((item) => item.id === activeSection)?.label ?? 'Overview';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Brand />
          <span className="brand-caption">TOURISM PROJECT PLANNING</span>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {sections.map(({ id, label, detail, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeSection === id ? 'active' : ''}`} onClick={() => openSection(id)} aria-current={activeSection === id ? 'page' : undefined}>
              <span className="nav-icon"><Icon size={18} strokeWidth={1.9} /></span>
              <span className="nav-copy"><strong>{label}</strong><small>{detail}</small></span>
              {activeSection === id && <ChevronRight className="nav-chevron" size={16} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-evidence">
          <div className="evidence-top"><ShieldCheck size={17} /><span>Evidence-first analysis</span></div>
          <p>Tourism, safety, sustainability and SDLC sources are added as context when relevant.</p>
          <button onClick={() => openSection('guide')}>Explore the decision guide <ArrowUpRight size={14} /></button>
        </div>
        <div className="sidebar-bottom">
          <div className="local-dot" />
          <span>Private, local model</span>
          <span className="side-model">{modelLabel}</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>TravelMind</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <span className={`model-status ${modelStatus?.ready ? 'online' : 'offline'}`}>
              <span className="status-indicator" />{modelStatus?.ready ? 'Model connected' : 'Model offline'}
            </span>
            <div className="model-badge"><span className="qwen-mark">Q</span><span>{modelLabel}</span><span className="badge-local">LOCAL</span></div>
          </div>
        </header>

        <div className="page-content">
          {activeSection === 'home' && <HomePage
            brief={brief} setBrief={setBrief} requirements={requirements} setRequirements={setRequirements}
            sdlc={sdlc} isRequirementsBusy={isRequirementsBusy} isSdlcBusy={isSdlcBusy}
            isEditingRequirements={isEditingRequirements} setEditingRequirements={setEditingRequirements}
            requirementsReady={requirementsReady} error={error} notice={notice} modelStatus={modelStatus}
            onGenerate={runRequirements} onStopRequirements={stopRequirements}
            onSuggestSdlc={() => void runSdlc()} onStopSdlc={stopSdlc} onReset={resetHome}
            onUseSample={() => { setBrief(SAMPLE_BRIEF); setError(''); }} onCopy={copyText}
          />}
          {activeSection === 'requirements' && <RequirementsPage
            brief={brief} setBrief={setBrief} requirements={requirements} setRequirements={setRequirements}
            busy={isRequirementsBusy} editing={isEditingRequirements} setEditing={setEditingRequirements}
            error={error} notice={notice} ready={requirementsReady} onGenerate={runRequirements}
            onStop={stopRequirements} onUseSample={() => { setBrief(SAMPLE_BRIEF); setError(''); }} onCopy={copyText}
          />}
          {activeSection === 'sdlc' && <SdlcPage
            requirements={requirements} setRequirements={setRequirements} sdlc={sdlc}
            busy={isSdlcBusy} error={error} notice={notice} onSuggest={() => void runSdlc()}
            onStop={stopSdlc} onCopy={copyText}
          />}
          {activeSection === 'guide' && <GuidePage />}
        </div>
        <footer className="page-footer"><span>TravelMind · Tourism & hospitality requirements planning</span><span><LockKeyhole size={13} /> Generated drafts need human review</span></footer>
      </main>
    </div>
  );
}

function HomePage(props: {
  brief: string; setBrief: (value: string) => void; requirements: string; setRequirements: (value: string) => void;
  sdlc: string; isRequirementsBusy: boolean; isSdlcBusy: boolean; isEditingRequirements: boolean;
  setEditingRequirements: (value: boolean) => void; requirementsReady: boolean; error: string; notice: string;
  modelStatus: ModelStatus | null; onGenerate: () => void; onStopRequirements: () => void; onSuggestSdlc: () => void;
  onStopSdlc: () => void; onReset: () => void; onUseSample: () => void; onCopy: (value: string) => void;
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><Waves size={15} /> A CLEARER WAY TO SHAPE THE GUEST JOURNEY</div>
          <h1>From a good idea to a <span>thoughtful plan.</span></h1>
          <p className="welcome-subtitle">Describe the tourism or hospitality software you have in mind. TravelMind will help shape the requirements, then recommend a development approach that fits.</p>
        </div>
        <button className="quiet-button" onClick={props.onReset} title="Start a fresh analysis"><RotateCcw size={15} /> New analysis</button>
      </section>

      <section className="flow-strip" aria-label="Analysis steps">
        <div className="flow-step current"><span className="flow-number">01</span><span><strong>Describe the idea</strong><small>Your project brief</small></span></div>
        <div className="flow-connector" />
        <div className={`flow-step ${props.requirementsReady ? 'complete' : ''}`}><span className="flow-number">{props.requirementsReady ? <Check size={15} /> : '02'}</span><span><strong>Shape requirements</strong><small>Review or stop anytime</small></span></div>
        <div className="flow-connector" />
        <div className={`flow-step ${props.sdlc ? 'complete' : ''}`}><span className="flow-number">{props.sdlc ? <Check size={15} /> : '03'}</span><span><strong>Suggest an SDLC</strong><small>Compare and justify</small></span></div>
      </section>

      <div className="home-grid">
        <div className="work-column">
          <section className="panel brief-panel">
            <div className="panel-heading">
              <div className="panel-title-wrap"><span className="step-icon"><MessageSquareText size={18} /></span><div><h2>Tell us what you’re planning</h2><p>Start with the experience, users, constraints, and the outcome you need.</p></div></div>
              <span className="soft-tag"><Hotel size={13} /> Tourism & hospitality</span>
            </div>
            <label className="sr-only" htmlFor="home-brief">Project brief</label>
            <textarea id="home-brief" value={props.brief} onChange={(event) => props.setBrief(event.target.value)} placeholder="For example: We’re planning a guest experience platform for a 120-room boutique hotel. Guests should be able to…" maxLength={12000} />
            <div className="input-meta"><span>Include users, integrations, launch timing, and any known risks.</span><span>{props.brief.length.toLocaleString()} / 12,000</span></div>
            <div className="brief-actions">
              <button className="text-button" onClick={props.onUseSample}><Sparkles size={15} /> Try a sample brief</button>
              {!props.isRequirementsBusy ? (
                <button className="primary-button" onClick={props.onGenerate} disabled={!props.brief.trim()}><Sparkles size={16} /> {props.requirements ? 'Regenerate requirements' : 'Generate requirements'} <ArrowRight size={16} /></button>
              ) : (
                <button className="stop-button" onClick={props.onStopRequirements}><Square size={13} fill="currentColor" /> Stop generation</button>
              )}
            </div>
          </section>

          {(props.requirements || props.isRequirementsBusy || props.error || props.notice) && (
            <section className="panel result-panel" aria-live="polite">
              <div className="result-heading">
                <div className="panel-title-wrap"><span className={`step-icon ${props.isRequirementsBusy ? 'working' : 'success'}`}>{props.isRequirementsBusy ? <LoaderCircle size={18} className="spin" /> : <CheckCircle2 size={18} />}</span><div><h2>Your working requirements</h2><p>{props.isRequirementsBusy ? 'Drafting a compact, traceable specification…' : 'Review the draft and adjust anything you want before moving on.'}</p></div></div>
                <div className="result-tools"><button className="icon-text-button" onClick={() => props.setEditingRequirements(!props.isEditingRequirements)} disabled={!props.requirements}><FileText size={15} /> {props.isEditingRequirements ? 'Preview' : 'Edit draft'}</button>{props.requirements && <button className="icon-text-button" onClick={() => props.onCopy(props.requirements)}><Clipboard size={15} /> Copy</button>}</div>
              </div>
              {props.isEditingRequirements ? <textarea className="draft-editor" aria-label="Edit requirements draft" value={props.requirements} onChange={(event) => props.setRequirements(event.target.value)} /> : <MarkdownOutput value={props.requirements} busy={props.isRequirementsBusy} emptyText="Your requirements draft will appear here as it is generated." />}
              {props.error && <InlineMessage kind="error" text={props.error} />}
              {props.notice && <InlineMessage kind="notice" text={props.notice} />}
              {props.requirementsReady && (
                <div className="continue-bar"><div><strong>Ready for a lifecycle recommendation?</strong><span>TravelMind will use this exact draft as its input.</span></div>{props.isSdlcBusy ? <button className="stop-button" onClick={props.onStopSdlc}><Square size={13} fill="currentColor" /> Stop</button> : <button className="primary-button" onClick={props.onSuggestSdlc}><GitBranch size={16} /> Suggest SDLC <ArrowRight size={16} /></button>}</div>
              )}
            </section>
          )}

          {(props.sdlc || props.isSdlcBusy) && <section className="panel result-panel sdlc-result" aria-live="polite">
            <div className="result-heading"><div className="panel-title-wrap"><span className={`step-icon ${props.isSdlcBusy ? 'working' : 'success'}`}>{props.isSdlcBusy ? <LoaderCircle size={18} className="spin" /> : <GitBranch size={18} />}</span><div><h2>SDLC recommendation</h2><p>{props.isSdlcBusy ? 'Comparing fit against the requirements and project constraints…' : 'A project-fit recommendation with rationale and trade-offs.'}</p></div></div>{props.sdlc && <button className="icon-text-button" onClick={() => props.onCopy(props.sdlc)}><Clipboard size={15} /> Copy</button>}</div>
            <MarkdownOutput value={props.sdlc} busy={props.isSdlcBusy} emptyText="Your recommendation will appear here." />
            {props.error && <InlineMessage kind="error" text={props.error} />}{props.notice && <InlineMessage kind="notice" text={props.notice} />}
          </section>}
        </div>

        <aside className="context-column">
          <section className="panel model-card">
            <div className="model-orbit"><span className="orbit-core">Q</span><span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" /></div>
            <div className="model-card-kicker">RUNNING LOCALLY</div>
            <h2>{props.modelStatus?.model || 'Qwen 3.5 · 4B'}</h2>
            <p>Your model runs through LM Studio on this computer. Project briefs stay in this local app unless your model provider is configured otherwise.</p>
            <div className={`connection-line ${props.modelStatus?.ready ? 'online' : 'offline'}`}><span className="status-indicator" />{props.modelStatus?.ready ? 'Ready to generate' : 'Waiting for LM Studio'}</div>
            {!props.modelStatus?.ready && <div className="setup-hint"><Lightbulb size={15} /><span>Open LM Studio, load <code>{props.modelStatus?.model || 'qwen3.5-4b'}</code>, then start its local server.</span></div>}
          </section>
          <section className="panel quality-card">
            <div className="mini-card-heading"><span className="small-icon pale"><ShieldCheck size={17} /></span><div><h3>Built around real constraints</h3><p>Analysis grounded in tourism and software delivery evidence.</p></div></div>
            <div className="quality-list"><span><CheckCircle2 size={15} /> Testable requirements</span><span><CheckCircle2 size={15} /> Safety & privacy awareness</span><span><CheckCircle2 size={15} /> Explicit assumptions</span><span><CheckCircle2 size={15} /> SDLC trade-offs, not defaults</span></div>
            <button className="guide-link" onClick={() => window.dispatchEvent(new CustomEvent('travelmind:navigate', { detail: 'guide' }))}>See how the recommendation is made <ArrowRight size={15} /></button>
          </section>
          <div className="gentle-note"><span className="note-icon"><CircleHelp size={16} /></span><p>TravelMind drafts the plan. People still confirm local legal, safety, accessibility, and certification decisions.</p></div>
        </aside>
      </div>
    </>
  );
}

function RequirementsPage(props: {
  brief: string; setBrief: (value: string) => void; requirements: string; setRequirements: (value: string) => void;
  busy: boolean; editing: boolean; setEditing: (value: boolean) => void; error: string; notice: string;
  ready: boolean; onGenerate: () => void; onStop: () => void; onUseSample: () => void; onCopy: (value: string) => void;
}) {
  return <>
    <PageIntro icon={<FileText size={18} />} eyebrow="ENGINE 01 · REQUIREMENTS" title={<>Make the idea <span>specific enough to build.</span></>} text="Turn a tourism or hospitality brief into a compact SRS with assumptions, stakeholders, testable acceptance criteria, traceability, risks, and open issues." />
    <div className="engine-layout">
      <section className="panel engine-input-panel">
        <div className="panel-heading"><div className="panel-title-wrap"><span className="step-icon"><MessageSquareText size={18} /></span><div><h2>Project brief</h2><p>What are you planning to build or improve?</p></div></div><span className="step-counter">01 / 02</span></div>
        <textarea className="engine-textarea" value={props.brief} onChange={(event) => props.setBrief(event.target.value)} placeholder="Describe the guest or staff experience, the system's main capabilities, external integrations, users, launch constraints, and risks." maxLength={12000} />
        <div className="brief-actions"><button className="text-button" onClick={props.onUseSample}><Sparkles size={15} /> Use sample</button>{props.busy ? <button className="stop-button" onClick={props.onStop}><Square size={13} fill="currentColor" /> Stop and keep draft</button> : <button className="primary-button" onClick={props.onGenerate} disabled={!props.brief.trim()}><Sparkles size={16} /> {props.requirements ? 'Generate again' : 'Generate requirements'} <ArrowRight size={16} /></button>}</div>
        {props.error && <InlineMessage kind="error" text={props.error} />}{props.notice && <InlineMessage kind="notice" text={props.notice} />}
      </section>
      <section className="panel engine-output-panel">
        <div className="result-heading"><div className="panel-title-wrap"><span className={`step-icon ${props.busy ? 'working' : props.requirements ? 'success' : ''}`}>{props.busy ? <LoaderCircle className="spin" size={18} /> : <FileText size={18} />}</span><div><h2>Requirements draft</h2><p>{props.busy ? 'Generating — stop whenever you like.' : 'Edit the generated text if you want.'}</p></div></div><div className="result-tools"><button className="icon-text-button" onClick={() => props.setEditing(!props.editing)} disabled={!props.requirements}><FileText size={15} /> {props.editing ? 'Preview' : 'Edit'}</button>{props.requirements && <button className="icon-text-button" onClick={() => props.onCopy(props.requirements)}><Clipboard size={15} /> Copy</button>}</div></div>
        {props.editing ? <textarea className="draft-editor large" value={props.requirements} onChange={(event) => props.setRequirements(event.target.value)} aria-label="Edit requirements draft" /> : <MarkdownOutput value={props.requirements} busy={props.busy} emptyText="Your SRS appears here as it is generated. You can stop generation and keep the partial draft." />}
        <div className="engine-handoff"><div><span className="small-icon pale"><GitBranch size={16} /></span><div><strong>Next: choose a development approach</strong><span>The SDLC Engine uses this draft, not the original brief.</span></div></div><button className="secondary-button" onClick={() => window.dispatchEvent(new CustomEvent('travelmind:navigate', { detail: 'sdlc' }))} disabled={!props.ready}>Open SDLC Engine <ArrowRight size={15} /></button></div>
      </section>
    </div>
  </>;
}

function SdlcPage(props: {
  requirements: string; setRequirements: (value: string) => void; sdlc: string; busy: boolean;
  error: string; notice: string; onSuggest: () => void; onStop: () => void; onCopy: (value: string) => void;
}) {
  return <>
    <PageIntro icon={<GitBranch size={18} />} eyebrow="ENGINE 02 · SDLC SELECTION" title={<>Choose a lifecycle <span>for this project.</span></>} text="Give the SDLC Engine a completed or partial requirements draft. It compares six development models and explains one recommended fit, rejected alternatives, and remaining risks." />
    <div className="engine-layout sdlc-engine-layout">
      <section className="panel engine-input-panel">
        <div className="panel-heading"><div className="panel-title-wrap"><span className="step-icon"><FileText size={18} /></span><div><h2>Requirements to assess</h2><p>Paste an SRS or use the one you created in the Requirements Engine.</p></div></div><span className="step-counter">INPUT</span></div>
        <textarea className="engine-textarea requirements-paste" value={props.requirements} onChange={(event) => props.setRequirements(event.target.value)} placeholder="Paste the Requirements Engine output here, or write the main requirements directly…" />
        <div className="brief-actions">{props.busy ? <button className="stop-button" onClick={props.onStop}><Square size={13} fill="currentColor" /> Stop recommendation</button> : <button className="primary-button" onClick={props.onSuggest} disabled={props.requirements.trim().length < 20}><GitBranch size={16} /> Suggest SDLC <ArrowRight size={16} /></button>}</div>
        {props.error && <InlineMessage kind="error" text={props.error} />}{props.notice && <InlineMessage kind="notice" text={props.notice} />}
        <div className="decision-factors-mini"><strong>What the engine considers</strong><div className="factor-pills"><span>Requirement stability</span><span>Safety & risk</span><span>Integration uncertainty</span><span>Feedback cadence</span><span>Release constraints</span></div></div>
      </section>
      <section className="panel engine-output-panel">
        <div className="result-heading"><div className="panel-title-wrap"><span className={`step-icon ${props.busy ? 'working' : props.sdlc ? 'success' : ''}`}>{props.busy ? <LoaderCircle className="spin" size={18} /> : <GitBranch size={18} />}</span><div><h2>Recommendation & rationale</h2><p>{props.busy ? 'Comparing project fit across all six lifecycle models…' : 'The recommended model and its trade-offs will appear here.'}</p></div></div>{props.sdlc && <button className="icon-text-button" onClick={() => props.onCopy(props.sdlc)}><Clipboard size={15} /> Copy</button>}</div>
        <MarkdownOutput value={props.sdlc} busy={props.busy} emptyText="A strong recommendation should connect its choice to specific requirements and compare the alternatives fairly." />
        <div className="engine-handoff"><div><span className="small-icon pale"><Lightbulb size={16} /></span><div><strong>Want to understand the trade-offs?</strong><span>Review a practical guide to selecting a lifecycle model.</span></div></div><button className="secondary-button" onClick={() => window.dispatchEvent(new CustomEvent('travelmind:navigate', { detail: 'guide' }))}>Open decision guide <ArrowRight size={15} /></button></div>
      </section>
    </div>
  </>;
}

const modelGuides = [
  { name: 'Waterfall', cue: 'Choose when scope is stable and approvals are sequential.', upside: 'Clear phases, baselines, documentation, and sign-offs.', tradeoff: 'Late feedback can make changes expensive.', icon: Activity, tint: 'blue' },
  { name: 'V-Model', cue: 'Choose when each requirement needs planned verification.', upside: 'Strong traceability from needs to tests and acceptance evidence.', tradeoff: 'Needs disciplined early requirements and test planning.', icon: ShieldCheck, tint: 'cyan' },
  { name: 'Prototype', cue: 'Choose when guest or staff journeys are still uncertain.', upside: 'Makes workflows, accessibility, and usability concrete early.', tradeoff: 'A prototype is not a production-ready architecture.', icon: Sparkles, tint: 'lilac' },
  { name: 'RAD', cue: 'Choose when speed, reusable components, and frequent workshops dominate.', upside: 'Fast increments with close stakeholder collaboration.', tradeoff: 'Poor fit for deep integration risk or heavy formal verification.', icon: Zap, tint: 'amber' },
  { name: 'Spiral', cue: 'Choose when technical or operational risk is the central concern.', upside: 'Repeated risk analysis and proof-of-concept work reduce uncertainty.', tradeoff: 'The additional analysis and planning has a real cost.', icon: RotateCcw, tint: 'coral' },
  { name: 'Agile', cue: 'Choose when needs evolve and representative users can give regular feedback.', upside: 'Frequent learning, reprioritization, and incremental value.', tradeoff: 'Requires product ownership and release discipline.', icon: GitBranch, tint: 'green' },
];

function GuidePage() {
  const steps = [
    ['Set the context', 'Capture the product, guest and staff roles, property and partner systems, launch date, peak-season windows, team capacity, jurisdictions, and procurement needs. Unknowns should be written down as assumptions—not silently treated as facts.'],
    ['Find the dominant drivers', 'Pick the two or three conditions most likely to shape success: stable scope, formal verification, unresolved guest journeys, serious integration uncertainty, high safety/privacy impact, tight seasonal timing, or frequent business change.'],
    ['Compare the same criteria', 'Rate every candidate against the same evidence. Ask how well it manages change, validation, risk, stakeholder availability, delivery timing, integration uncertainty, operational resilience, and required documentation. Record why a score was assigned.'],
    ['Choose the best fit, not a favorite', 'Recommend the model whose strengths address the dominant constraints with the fewest unacceptable weaknesses. Do not make Agile the default. If several models score similarly, explain the tie-breaker and what new evidence could change the decision.'],
    ['Layer controls into the model', 'Security, privacy, accessibility, safety, sustainability, test evidence, monitoring, backup/recovery, and operational readiness are not optional extras. Add them to the chosen model’s activities and acceptance checks.'],
    ['Record and revisit', 'Name the chosen model, key evidence, assumptions, rejected alternatives, accepted risks, owners, and review trigger. Revisit after discovery, before implementation, and after a material change in scope, risk, integration, regulations, or launch constraints.'],
  ];

  return <>
    <PageIntro icon={<BookOpen size={18} />} eyebrow="DECISION GUIDE · SDLC" title={<>Choose for the <span>conditions you have.</span></>} text="An SDLC model is a way to organize the work—not a badge or a one-size-fits-all answer. Start with project evidence, expose the trade-offs, and make the decision easy to review." />
    <section className="guide-hero panel"><div className="guide-hero-mark"><Compass size={26} /></div><div><div className="eyebrow">A PRACTICAL SIX-PART METHOD</div><h2>Good model selection is a reasoning process.</h2><p>Begin with the strongest constraints. Compare each candidate in the same way. Then record why the recommendation fits this project—and what would make you revisit it.</p></div><div className="guide-hero-stat"><strong>6</strong><span>models<br />compared</span></div></section>

    <section className="guide-steps-grid">
      {steps.map(([title, body], index) => <article key={title} className="panel guide-step-card"><span className="guide-step-number">0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
    </section>

    <section className="section-heading-row"><div><div className="eyebrow">THE SIX MODELS</div><h2>What each model is best at</h2></div><p>Use these as starting signals, then test them against the actual requirements.</p></section>
    <section className="model-guide-grid">
      {modelGuides.map(({ name, cue, upside, tradeoff, icon: Icon, tint }) => <article key={name} className="panel model-guide-card">
        <div className={`model-guide-icon ${tint}`}><Icon size={19} /></div><h3>{name}</h3><p className="model-cue">{cue}</p><div className="model-plus"><CheckCircle2 size={15} /><span>{upside}</span></div><div className="model-caution"><CircleHelp size={15} /><span>{tradeoff}</span></div>
      </article>)}
    </section>

    <section className="guide-two-col">
      <article className="panel scoring-panel"><div className="small-icon pale"><Timer size={17} /></div><h2>A simple fit-scoring routine</h2><p>Use the same scale for every model so the comparison stays fair. Treat scores as structured judgment, not math that removes accountability.</p><ol><li><strong>Importance:</strong> rate each project factor 1–5 based on its impact.</li><li><strong>Fit:</strong> rate each model 1–5 for how well it addresses that factor.</li><li><strong>Evidence:</strong> write the SRS ID, stakeholder input, or constraint behind the rating.</li><li><strong>Trade-off:</strong> note the main weakness and mitigation for the top candidates.</li><li><strong>Decision:</strong> select the highest-fit model, or document who approved an evidence-based override.</li></ol></article>
      <article className="panel example-panel"><div className="small-icon pale"><Hotel size={17} /></div><h2>A hospitality example</h2><p>Suppose a hotel booking and guest-service platform has uncertain guest journeys, a seasonal launch, an existing property-management integration, and strict service continuity needs.</p><div className="example-signal"><span className="signal-dot blue" /><div><strong>Prototype may help discovery</strong><span>Use it when booking, accessibility, and staff workflows remain unclear.</span></div></div><div className="example-signal"><span className="signal-dot coral" /><div><strong>Spiral may fit high integration risk</strong><span>Prioritize proof-of-concept work if interface uncertainty is the biggest risk.</span></div></div><div className="example-signal"><span className="signal-dot green" /><div><strong>Agile may fit evolving needs</strong><span>Only when a product owner and representative users can review increments regularly.</span></div></div><div className="example-disclaimer">The brief alone does not prove which model wins. The SRS and confirmed delivery context decide.</div></article>
    </section>

    <div className="guide-footnote"><ShieldCheck size={17} /><p><strong>Keep security in every model.</strong> NIST’s SSDF says secure-development practices usually need to be integrated into whichever SDLC an organization uses. A lifecycle choice should not switch security, privacy, accessibility, safety, or recovery off.</p></div>
  </>;
}

function PageIntro({ icon, eyebrow, title, text }: { icon: React.ReactNode; eyebrow: string; title: React.ReactNode; text: string }) {
  return <section className="page-intro"><span className="intro-icon">{icon}</span><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div></section>;
}

function MarkdownOutput({ value, busy, emptyText }: { value: string; busy: boolean; emptyText: string }) {
  if (!value) return <div className="empty-output"><div className="empty-output-icon">{busy ? <LoaderCircle size={21} className="spin" /> : <FileText size={22} />}</div><p>{busy ? 'The draft will appear here as it is generated…' : emptyText}</p></div>;
  return <div className={`markdown-output ${busy ? 'streaming' : ''}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>{busy && <span className="typing-caret" aria-label="Generating" />}</div>;
}

function InlineMessage({ kind, text }: { kind: 'error' | 'notice'; text: string }) {
  return <div className={`inline-message ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{kind === 'error' ? <CircleHelp size={16} /> : <CheckCircle2 size={16} />}<span>{text}</span></div>;
}

async function copyText(value: string) {
  if (!value) return;
  try { await navigator.clipboard.writeText(value); } catch { /* Clipboard can be unavailable on insecure origins. */ }
}

export default App;
