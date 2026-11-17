// The Ivory & Ash voice concierge.
// Browser <-> xAI Grok Voice realtime API over WebSocket, authenticated with a
// short-lived token minted by /api/voice-token (the API key never reaches the browser).

type State = 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking' | 'ended' | 'error';

const REALTIME_URL = 'wss://api.x.ai/v1/realtime';
const SUPPORTED_RATES = [8000, 16000, 22050, 24000, 32000, 44100, 48000];

const CAPTURE_WORKLET = `
class IACapture extends AudioWorkletProcessor {
  constructor(o) { super(); this.size = o.processorOptions.size; this.buf = new Float32Array(this.size); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      let i = 0;
      while (i < ch.length) {
        const k = Math.min(ch.length - i, this.size - this.n);
        this.buf.set(ch.subarray(i, i + k), this.n);
        this.n += k; i += k;
        if (this.n === this.size) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('ia-capture', IACapture);
`;

function instructions(replyWindow: string): string {
  return `You are the concierge for Ivory & Ash Painting, a high-end painting firm in Calgary, Alberta. You are an AI assistant; say so plainly if asked.

# Your goal
Welcome the caller, understand their painting project, and arrange a private consultation by collecting their details and submitting them with the submit_consultation_request tool.

# How you speak
Warm, polished and unhurried, like the concierge of a fine hotel. Keep each reply to one or two short sentences. Ask one question at a time. Use Canadian spelling and say "colour consultation", never "sales call".

# What to collect
The caller's name, the best phone number or email, their neighbourhood, what they would like painted (interior, exterior, cabinetry or millwork, or a commercial space), and their ideal timing. Note anything else they mention, such as colours, finishes or the size of the home. Read a phone number or email back to confirm it before you submit.

# What you know
Ivory & Ash paints interiors, exteriors, cabinetry and millwork, and boutique commercial spaces in Calgary and the surrounding communities. Every project begins with an on-site consultation, followed by a written, fixed-price proposal. Work is carried out by a dedicated crew with thorough preparation, premium coatings and a tidy site each day. The firm is insured, carries WCB coverage and provides a written warranty.

# Limits
Never quote a price, a price range or a start date; explain that the proposal follows the on-site consultation. Do not invent facts about the firm, past projects, awards or reviews. If the caller wants a quick or low-cost job, be gracious: explain that Ivory & Ash focuses on full, carefully prepared projects, and offer to take their details anyway. Stay on the subject of painting and the firm.

# Closing
Once the request is submitted, tell the caller that a member of the team will be in touch within ${replyWindow}, thank them, and say goodbye. If the tool reports a failure, apologise and ask them to use the consultation form on this page.

Begin by greeting the caller and asking what they have in mind for their home.`;
}

const TOOLS = [
  {
    type: 'function',
    name: 'submit_consultation_request',
    description: 'Send the caller\'s consultation request to the Ivory & Ash team. Call once, after confirming the contact details.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Caller\'s full name' },
        phone: { type: 'string', description: 'Phone number, if given' },
        email: { type: 'string', description: 'Email address, if given' },
        neighbourhood: { type: 'string', description: 'Neighbourhood or community of the property' },
        project: { type: 'string', description: 'What they want painted' },
        timeline: { type: 'string', description: 'Ideal timing' },
        notes: { type: 'string', description: 'Any other useful detail from the conversation' },
      },
      required: ['name', 'project'],
    },
  },
];

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function init(root: HTMLElement) {
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const panel = q('.cg-panel');
  const statusEl = q('[data-cg-status]');
  const log = q('[data-cg-log]');
  const intro = q('[data-cg-intro]');
  const startBtn = q<HTMLButtonElement>('[data-cg-start]');
  const muteBtn = q<HTMLButtonElement>('[data-cg-mute]');
  const endBtn = q<HTMLButtonElement>('[data-cg-end]');
  const orb = q('.cg-orb');

  const model = root.dataset.model || 'grok-voice-3.0';
  const voice = root.dataset.voice || 'eve';
  const maxMs = (Number(root.dataset.maxMinutes) || 6) * 60_000;
  const replyWindow = root.dataset.replyWindow || 'one business day';

  let state: State = 'idle';
  let ws: WebSocket | null = null;
  let ctx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let micAnalyser: AnalyserNode | null = null;
  let outAnalyser: AnalyserNode | null = null;
  let outGain: GainNode | null = null;
  let rate = 24000;
  let nextTime = 0;
  let muted = false;
  let dropAudio = false;
  let greeted = false;
  let submitted = false;
  let pendingCalls = 0;
  let needsFollowUp = false;
  let timer = 0;
  let raf = 0;
  let assistantLine: HTMLElement | null = null;
  const sources = new Set<AudioBufferSourceNode>();
  const transcript: string[] = [];

  const STATUS: Record<State, string> = {
    idle: 'Available now',
    connecting: 'Connecting',
    listening: 'Listening',
    speaking: 'Speaking',
    thinking: 'One moment',
    ended: 'Conversation ended',
    error: 'Unavailable',
  };

  function setState(s: State, label?: string) {
    state = s;
    root.dataset.state = s;
    statusEl.textContent = label || STATUS[s];
    const live = s === 'connecting' || s === 'listening' || s === 'speaking' || s === 'thinking';
    startBtn.hidden = live;
    muteBtn.hidden = !live || s === 'connecting';
    endBtn.hidden = !live;
    startBtn.textContent = s === 'ended' || s === 'error' ? 'Begin again' : 'Begin conversation';
  }

  function line(kind: 'a' | 'u' | 'sys', text: string): HTMLElement {
    intro.hidden = true;
    log.hidden = false;
    const p = document.createElement('p');
    p.className = kind;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function open() {
    panel.hidden = false;
    requestAnimationFrame(() => document.body.classList.add('cg-open'));
    startBtn.focus({ preventScroll: true });
  }
  function close() {
    document.body.classList.remove('cg-open');
    if (state !== 'idle' && state !== 'ended' && state !== 'error') stop('ended');
    window.setTimeout(() => { if (!document.body.classList.contains('cg-open')) panel.hidden = true; }, 450);
  }

  function send(obj: unknown) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function meter() {
    const analyser = state === 'speaking' ? outAnalyser : micAnalyser;
    let level = 0;
    if (analyser && !(state === 'listening' && muted)) {
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      level = Math.min(1, Math.sqrt(sum / data.length) * 4);
    }
    orb.style.setProperty('--level', level.toFixed(3));
    raf = requestAnimationFrame(meter);
  }

  function play(b64: string) {
    if (!ctx || !outGain || dropAudio) return;
    const bin = atob(b64);
    const n = bin.length >> 1;
    if (!n) return;
    const buf = ctx.createBuffer(1, n, rate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      if (v >= 0x8000) v -= 0x10000;
      ch[i] = v / 32768;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(outGain);
    const t = Math.max(ctx.currentTime + 0.04, nextTime);
    src.start(t);
    nextTime = t + buf.duration;
    sources.add(src);
    src.onended = () => {
      sources.delete(src);
      if (!sources.size && state === 'speaking') setState('listening', muted ? 'Muted' : undefined);
    };
    if (state !== 'speaking') setState('speaking');
  }

  function silence() {
    sources.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already stopped */ } });
    sources.clear();
    nextTime = 0;
  }

  function playbackDone(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => (sources.size === 0 || !ctx ? resolve() : window.setTimeout(check, 120));
      check();
    });
  }

  async function submit(args: Record<string, string>) {
    const body = new URLSearchParams({
      'form-name': 'concierge-enquiry',
      name: args.name || '',
      phone: args.phone || '',
      email: args.email || '',
      neighbourhood: args.neighbourhood || '',
      project: args.project || '',
      timeline: args.timeline || '',
      notes: args.notes || '',
      transcript: transcript.join('\n').slice(0, 6000),
    });
    try {
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!res.ok) throw new Error(String(res.status));
      submitted = true;
      line('sys', 'Your consultation request has been sent to our team.');
      return { status: 'received' };
    } catch {
      return { status: 'failed', advice: 'Ask the caller to use the consultation form on the page.' };
    }
  }

  async function onEvent(ev: any) {
    switch (ev.type) {
      case 'session.updated':
        if (!greeted) { greeted = true; send({ type: 'response.create' }); }
        break;
      case 'response.created':
        dropAudio = false;
        break;
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        if (ev.delta) play(ev.delta);
        break;
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        if (!ev.delta) break;
        if (!assistantLine) assistantLine = line('a', '');
        assistantLine.textContent += ev.delta;
        log.scrollTop = log.scrollHeight;
        break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done': {
        const text = ev.transcript || assistantLine?.textContent || '';
        if (assistantLine && ev.transcript) assistantLine.textContent = ev.transcript;
        if (text) transcript.push(`Concierge: ${text}`);
        assistantLine = null;
        break;
      }
      case 'conversation.item.input_audio_transcription.completed':
        if (ev.transcript?.trim()) { line('u', ev.transcript.trim()); transcript.push(`Caller: ${ev.transcript.trim()}`); }
        break;
      case 'input_audio_buffer.speech_started':
        // Barge-in: the caller is talking, so stop the concierge mid-sentence.
        dropAudio = true;
        silence();
        assistantLine = null;
        setState('listening');
        break;
      case 'input_audio_buffer.speech_stopped':
        if (state === 'listening') setState('thinking');
        break;
      case 'response.function_call_arguments.done': {
        pendingCalls++;
        needsFollowUp = true;
        let args: Record<string, string> = {};
        try { args = JSON.parse(ev.arguments || '{}'); } catch { /* keep empty */ }
        const result = ev.name === 'submit_consultation_request' ? await submit(args) : { status: 'unknown_tool' };
        send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: ev.call_id, output: JSON.stringify(result) } });
        pendingCalls--;
        break;
      }
      case 'response.done':
        if (needsFollowUp) {
          // Wait for every tool result and for the current speech to finish before asking for the next turn.
          while (pendingCalls > 0) await new Promise((r) => setTimeout(r, 80));
          needsFollowUp = false;
          await playbackDone();
          send({ type: 'response.create' });
        }
        break;
      case 'error':
        console.warn('[concierge]', ev.error?.message || ev);
        break;
    }
  }

  async function start() {
    if (state === 'connecting' || state === 'listening' || state === 'speaking' || state === 'thinking') return;
    setState('connecting');
    log.replaceChildren();
    transcript.length = 0;
    greeted = false; submitted = false; muted = false; dropAudio = false; pendingCalls = 0; needsFollowUp = false; assistantLine = null;
    muteBtn.textContent = 'Mute';
    muteBtn.setAttribute('aria-pressed', 'false');

    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !('audioWorklet' in AudioContext.prototype)) {
      return fail('This browser cannot hold a voice conversation. Please use the consultation form below.');
    }

    // Ask for the microphone and the access token together to shorten the wait.
    const tokenReq = fetch('/api/voice-token', { method: 'POST' })
      .then(async (r) => (r.ok ? ((await r.json()) as { token?: string }) : null))
      .catch(() => null);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch {
      return fail('We need your microphone to talk. Please allow access and begin again, or use the consultation form below.');
    }
    const token = (await tokenReq)?.token;
    if (!token) return fail('The concierge is unavailable at the moment. Please use the consultation form below.');

    try {
      try { ctx = new AudioContext({ sampleRate: 24000 }); } catch { ctx = new AudioContext(); }
      rate = ctx.sampleRate;
      if (!SUPPORTED_RATES.includes(rate)) throw new Error(`Unsupported sample rate ${rate}`);
      await ctx.resume();

      const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const mic = ctx.createMediaStreamSource(stream);
      micAnalyser = ctx.createAnalyser(); micAnalyser.fftSize = 512;
      mic.connect(micAnalyser);
      const capture = new AudioWorkletNode(ctx, 'ia-capture', { numberOfOutputs: 1, processorOptions: { size: Math.round(rate / 10) } });
      mic.connect(capture);
      const mute = ctx.createGain(); mute.gain.value = 0;
      capture.connect(mute).connect(ctx.destination);
      capture.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (muted || !ws || ws.readyState !== WebSocket.OPEN) return;
        const f = e.data;
        const pcm = new Int16Array(f.length);
        for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
        send({ type: 'input_audio_buffer.append', audio: toBase64(new Uint8Array(pcm.buffer)) });
      };

      outGain = ctx.createGain();
      outAnalyser = ctx.createAnalyser(); outAnalyser.fftSize = 512;
      outGain.connect(outAnalyser).connect(ctx.destination);
    } catch (err) {
      console.warn('[concierge]', err);
      return fail('We could not start the audio on this device. Please use the consultation form below.');
    }

    ws = new WebSocket(`${REALTIME_URL}?model=${encodeURIComponent(model)}`, [`xai-client-secret.${token}`]);
    const socket = ws;
    socket.onopen = () => {
      send({
        type: 'session.update',
        session: {
          voice,
          instructions: instructions(replyWindow),
          turn_detection: { type: 'server_vad' },
          audio: {
            input: { format: { type: 'audio/pcm', rate } },
            output: { format: { type: 'audio/pcm', rate } },
          },
          tools: TOOLS,
        },
      });
      setState('thinking', 'Connected');
      // If the server does not acknowledge the settings promptly, ask for the greeting anyway.
      window.setTimeout(() => { if (!greeted && ws === socket) { greeted = true; send({ type: 'response.create' }); } }, 2500);
      timer = window.setTimeout(() => {
        line('sys', 'We have reached the time limit for this conversation. Please use the consultation form to continue.');
        stop('ended');
      }, maxMs);
    };
    socket.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      try { void onEvent(JSON.parse(e.data)); } catch { /* ignore malformed frames */ }
    };
    socket.onerror = () => { if (ws === socket && state === 'connecting') fail('The concierge is unavailable at the moment. Please use the consultation form below.'); };
    socket.onclose = () => {
      if (ws !== socket) return;
      if (state === 'connecting') fail('The concierge is unavailable at the moment. Please use the consultation form below.');
      else if (state !== 'ended' && state !== 'error') { line('sys', submitted ? 'The conversation has ended. Thank you.' : 'The connection was lost. Please begin again or use the consultation form.'); stop('ended'); }
    };
    raf = requestAnimationFrame(meter);
  }

  function stop(final: State) {
    window.clearTimeout(timer);
    cancelAnimationFrame(raf);
    orb.style.setProperty('--level', '0');
    const socket = ws; ws = null;
    try { socket?.close(); } catch { /* already closed */ }
    silence();
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    void ctx?.close().catch(() => {});
    ctx = null; micAnalyser = null; outAnalyser = null; outGain = null;
    setState(final);
  }

  function fail(message: string) {
    stop('error');
    line('sys', message);
  }

  startBtn.addEventListener('click', () => void start());
  endBtn.addEventListener('click', () => { line('sys', submitted ? 'Thank you. We will be in touch shortly.' : 'Conversation ended.'); stop('ended'); });
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? 'Unmute' : 'Mute';
    muteBtn.setAttribute('aria-pressed', String(muted));
    if (state === 'listening') setState('listening', muted ? 'Muted' : undefined);
  });
  q('[data-cg-close]').addEventListener('click', close);
  document.addEventListener('click', (e) => {
    const t = (e.target as Element | null)?.closest('[data-cg-open]');
    if (t) { e.preventDefault(); open(); }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('cg-open')) close(); });
  const hero = document.querySelector('.hero');
  const showLauncher = () => document.body.classList.toggle('cg-show', !hero || window.scrollY > window.innerHeight * 0.6);
  showLauncher();
  window.addEventListener('scroll', showLauncher, { passive: true });
  window.addEventListener('pagehide', () => { if (ws) stop('ended'); });
  setState('idle');
}

const root = document.querySelector<HTMLElement>('[data-concierge]');
if (root) init(root);
