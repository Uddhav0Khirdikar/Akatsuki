import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, Eye, EyeOff, Fingerprint, KeyRound, LoaderCircle, LockKeyhole, Mail, Pause, Play, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react';
import { signIn, type CampusSession } from './api';

const Atmosphere = lazy(() => import('./Atmosphere'));

function Cloud({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 230 135" fill="currentColor" aria-hidden="true"><path d="M33 84C10 84 3 67 12 53c7-12 20-13 28-10C30 20 52 4 72 9c13 2 21 12 20 24 14-21 49-20 63-2 7 10 8 23 2 33 20-7 49 3 54 19 6 20-11 34-30 31-17-2-26-11-30-22-12 20-32 31-56 29-27-2-36-17-55-15-19 3-35-4-39-16 12 10 29 7 32-6Z" stroke="currentColor" strokeWidth="3"/><path d="M40 43c24 1 30 22 13 29m39-39c-12 15 0 30 16 26m49 5c-14 5-16 20-6 28" stroke="#fae1dd" strokeWidth="3" fill="none"/></svg>;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<CampusSession | null>(null);
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [dialog, setDialog] = useState<'about' | 'help' | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = pageRef.current;
    if (!element) return;
    let frame = 0;
    const reset = () => {
      element.style.setProperty('--scene-x', '0px');
      element.style.setProperty('--scene-y', '0px');
    };
    if (!motion) { reset(); return; }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--scene-x', `${(event.clientX / window.innerWidth - .5) * 12}px`);
        element.style.setProperty('--scene-y', `${(event.clientY / window.innerHeight - .5) * 8}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', reset);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); window.removeEventListener('blur', reset); reset(); };
  }, [motion]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setMotion(!media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (!username.trim()) {
      setError('Enter your college ERP username to continue.');
      return;
    }
    setPending(true);
    try {
      const result = await signIn(username, password);
      setPassword('');
      setSession(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return <main ref={pageRef} className={`login-page ${motion ? 'motion-on' : 'motion-off'}`}>
    <div className="ambient-wash" aria-hidden="true" />
    <header className="site-header">
      <a className="brand" href="/" aria-label="Akatsuki home"><Cloud /><span>AKATSUKI<small>THE CAMPUS COLLECTIVE</small></span></a>
      <nav aria-label="Page navigation"><button className="about-link" onClick={() => setDialog('about')}>A different kind of network <ArrowUpRight size={14} /></button><span className="nav-divider" /><button className="motion-control" aria-label={motion ? 'Pause ambient animation' : 'Play ambient animation'} aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? <Pause size={13} /> : <Play size={13} />}<span>{motion ? 'Motion on' : 'Motion off'}</span></button></nav>
    </header>

    <div className="experience-grid">
      <section className="story" aria-labelledby="story-heading">
        <div className="scene" aria-hidden="true">
          <div className="moon-halo" />
          <picture className="art-depth"><source media="(max-width: 740px)" srcSet="/assets/crimson-hour-mobile.webp" /><img className="scene-art" src="/assets/crimson-hour.webp" alt="" fetchPriority="high" /></picture>
          <div className="scene-vignette" />
          <img className="foreground-leaves" src="/assets/maple-foreground.webp" alt="" />
          <div className="scene-grain" />
          <Suspense fallback={null}><Atmosphere active={motion} /></Suspense>
          <span className="scene-coordinate">35° 41′ N &nbsp; / &nbsp; THE NEXT CHAPTER</span>
          <div className="floating-seal"><span>暁</span><small>AKATSUKI</small></div>
        </div>
        <div className="story-copy">
          <div className="eyebrow"><span /> DIFFERENT PATHS. ONE COLLECTIVE.</div>
          <h1 id="story-heading">Find your people.<br /><span>Leave your mark.</span></h1>
          <p>Big ideas need the right people.<br className="desktop-break" /> Find yours, right here on campus.</p>
          <div className="story-tags"><span>Find opportunities</span><i /><span>Build your team</span><i /><span>Go further</span></div>
        </div>
        <div className="chapter-marker" aria-hidden="true"><span>01 <i>/</i> YOUR BEGINNING</span><div /><ArrowDown size={13} /></div>
      </section>

      <section className="entry" aria-label="Campus sign in">
        <div className="entry-glow" aria-hidden="true" />
        <div className="login-card">
          <div className="card-topline"><span className="card-symbol"><Cloud /></span><span>YOUR NEXT CHAPTER</span><span className="topline-dash" /></div>
          {session ? <div className="success-panel" aria-live="polite">
            <div className="success-symbol"><Check size={28} /></div>
            <div className="eyebrow">YOU BELONG HERE</div>
            <h2>You’re in,<br /><span>{session.user.name.split(' ')[0]}.</span></h2>
            <p>Your campus identity is confirmed. Your next chapter is ready to begin.</p>
            <div className="identity-summary"><UserRound size={20} /><div><strong>{session.user.name}</strong><span>{session.user.department}</span><small>{session.user.roll_number}</small></div>{session.user.erp_verified && <ShieldCheck size={18} aria-label="ERP verified" />}</div>
            <p className="success-note">The campus workspace is coming next. You’re successfully signed in for this session.</p>
            <button className="submit-button" onClick={() => { setSession(null); setError(''); }}>Back to sign in <ArrowRight size={18} /></button>
          </div> : <>
            <div className="form-intro"><h2>A place to<br /><span>belong. And begin.</span></h2><p>Your campus. Your people. Your possibilities.</p></div>
            <div className="erp-label"><ShieldCheck size={15} /><span>SIGN IN WITH YOUR COLLEGE ERP</span><span className="label-line" /></div>
            <form onSubmit={submit} ref={formRef}>
              <div className="field"><label htmlFor="username">ERP username</label><div className="input-shell"><UserRound size={17} /><input id="username" name="username" type="text" autoComplete="username" placeholder="Your college ERP username" value={username} onChange={event => setUsername(event.target.value)} required maxLength={254} disabled={pending} spellCheck={false} autoCapitalize="none" /></div></div>
              <div className="field"><div className="label-row"><label htmlFor="password">Password</label><button type="button" className="forgot-link" onClick={() => setDialog('help')}>Need a hand?</button></div><div className="input-shell"><KeyRound size={17} /><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Your ERP password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={1024} disabled={pending} /><button className="password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
              {error && <div className="form-error" role="alert" ref={errorRef} tabIndex={-1}>{error}</div>}
              <button className="submit-button" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="spinner" size={18} /> Connecting to your campus…</> : <>Enter the collective <ArrowRight size={18} /></>}</button>
              <div className="form-reassurance"><LockKeyhole size={12} /><span>Your ERP account confirms your campus identity.</span></div>
            </form>
            <div className="card-footer"><div className="footer-icon"><Fingerprint size={21} /></div><p>New here? <span>You’re already one of us.</span><small>Your first ERP sign-in creates your Akatsuki profile.</small></p></div>
          </>}
          <div className="card-corner corner-tl" aria-hidden="true" /><div className="card-corner corner-br" aria-hidden="true" />
        </div>
        <div className="below-card"><Sparkles size={13} /><span>Built for the people who want to build something.</span></div>
      </section>
    </div>

    <footer className="site-footer"><span>© {new Date().getFullYear()} Akatsuki <i /> Made of ambition. Built for campus.</span><button onClick={() => setDialog('about')}>Independent student project <ArrowUpRight size={12} /></button></footer>
    <dialog ref={dialogRef} onCancel={() => setDialog(null)} onClick={event => { if (event.target === event.currentTarget) setDialog(null); }} aria-labelledby="dialog-heading">
      <button className="dialog-close" onClick={() => setDialog(null)} aria-label="Close dialog"><X size={20} /></button>
      <Cloud className="dialog-cloud" />
      <div className="eyebrow">THE CAMPUS COLLECTIVE</div>
      <h2 id="dialog-heading">{dialog === 'help' ? 'Let’s get you in.' : 'Different paths. Shared ambition.'}</h2>
      {dialog === 'help' ? <><p>Use the same username and password you use on your college ERP. Akatsuki doesn’t manage your ERP password.</p><p>If you’ve forgotten your details, visit the college ERP portal or contact your campus administrator.</p><a className="submit-button" href="https://erp.mit.asia" target="_blank" rel="noreferrer">Open the college ERP <ArrowUpRight size={17} /></a></> : <><p>Akatsuki connects students with campus opportunities, project teammates, and the people behind the work. Find a role, share an idea, or start something together.</p><div className="dialog-features"><span><Sparkles size={16} /> Opportunities across campus</span><span><Mail size={16} /> Conversations with context</span><span><ShieldCheck size={16} /> College ERP sign-in</span></div><p className="dialog-disclaimer">Akatsuki is an independent student project, separate from the official college ERP portal. Campus sign-in confirms identity, not college endorsement of individual opportunities.</p><button className="submit-button" onClick={() => setDialog(null)}>Find my people <ChevronRight size={18} /></button></>}
    </dialog>
  </main>;
}
