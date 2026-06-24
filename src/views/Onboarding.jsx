// src/views/Onboarding.jsx
import { useState, useEffect } from 'react';
import { GEMS, ALL_TABS } from '../theme/gems';
import { Text, Input, Btn } from '../components/ui';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase';

const g = GEMS.dashboard;

export default function Onboarding() {
  const { authStep, setAuthStep, sendOTP, verifyOTP, signInWithGoogle, completeOnboarding } = useAuth();
  const [email, setEmail]           = useState('');
  const [otp, setOtp]               = useState(['','','','','','']);
  const [error, setError]           = useState('');
  const [sending, setSending]       = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [enabledTabs, setEnabledTabs] = useState(['dashboard','work','learning','personal','finance']);
  const [storageMode, setStorageMode] = useState('local');
  const [pinnedTab, setPinnedTab]   = useState('dashboard');

  // Handle magic link redirect — if user clicks the email link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setAuthStep('storage');
      });
    }
  }, []);

  const handleSendOTP = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setSending(true); setError('');
    const { error } = await sendOTP(email.trim());
    setSending(false);
    if (error) { setError(error.message); return; }
    setAuthStep('verify');
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code'); return; }
    setVerifying(true); setError('');
    const { error } = await verifyOTP(email.trim(), code);
    setVerifying(false);
    if (error) { setError('Invalid or expired code. Please try again.'); return; }
    setAuthStep('storage');
  };

  const wrapStyle = {
    minHeight: '100vh', background: g.bg,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 28, gap: 18, fontFamily: 'system-ui',
  };

  const bigBtn = (bg, color='#fff', border) => ({
    background: bg, border: border ? `1.5px solid ${border}` : 'none',
    color, borderRadius: 12, padding: '13px 0', width: '100%',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui',
  });

  // ── WELCOME ────────────────────────────────────────────────────────────────
  if (authStep === 'welcome') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 800, color: g.text, fontFamily: 'Georgia, serif', letterSpacing: -2 }}>
          Praxi Pro
        </div>
        <div style={{ fontSize: 16, color: g.muted, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginTop: 4 }}>
          Plan. Learn. Relax.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          {ALL_TABS.map(t => (
            <div key={t.id} style={{ width: 34, height: 34, borderRadius: '50%',
              background: GEMS[t.id].card, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 15 }}>{t.icon}</div>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button onClick={() => setAuthStep('otp')} style={bigBtn(g.card)}>
          Continue with Email
        </button>
        <button onClick={signInWithGoogle} style={bigBtn('rgba(255,255,255,0.85)', g.text, g.surfaceBorder)}>
          <span style={{ fontWeight: 800, marginRight: 8 }}>G</span>Continue with Google
        </button>
      </div>
    </div>
  );

  // ── EMAIL INPUT ────────────────────────────────────────────────────────────
  if (authStep === 'otp') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>📧</div>
        <Text size={22} bold g={g}>Enter your email</Text>
        <br /><Text size={13} muted g={g}>We'll send you a sign-in code</Text>
      </div>
      <Input g={g} type="email" placeholder="you@gmail.com"
        value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
      {error && <Text size={12} color={g.urgentBar}>{error}</Text>}
      <button onClick={handleSendOTP} disabled={sending}
        style={{ ...bigBtn(g.card), opacity: sending ? 0.6 : 1 }}>
        {sending ? 'Sending…' : 'Send code →'}
      </button>
      <button onClick={() => { setAuthStep('welcome'); setError(''); }}
        style={{ background: 'none', border: 'none', color: g.muted, fontSize: 13, cursor: 'pointer' }}>
        ← Back
      </button>
    </div>
  );

  // ── OTP VERIFY ─────────────────────────────────────────────────────────────
  if (authStep === 'verify') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔐</div>
        <Text size={22} bold g={g}>Check your inbox</Text>
        <br />
        <Text size={13} muted g={g}>
          Enter the 6-digit code sent to <strong>{email}</strong>
        </Text>
        <br />
        <Text size={12} muted g={g}>Also check your spam folder</Text>
      </div>

      {/* OTP input boxes */}
      <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
        {otp.map((digit, i) => (
          <input key={i} id={`otp-${i}`} maxLength={1} value={digit}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              const next = [...otp]; next[i] = val;
              setOtp(next);
              if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
            }}
            onKeyDown={e => {
              if (e.key === 'Backspace' && !otp[i] && i > 0)
                document.getElementById(`otp-${i-1}`)?.focus();
            }}
            onPaste={e => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
              const next = [...otp];
              pasted.split('').forEach((c, idx) => { if (idx < 6) next[idx] = c; });
              setOtp(next);
              document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
            }}
            style={{ width: 46, height: 56, textAlign: 'center', fontSize: 24,
              fontWeight: 700, background: 'rgba(255,255,255,0.85)',
              border: `1.5px solid ${otp[i] ? g.card : g.surfaceBorder}`,
              borderRadius: 12, color: g.text, outline: 'none',
              transition: 'border-color .15s' }}
          />
        ))}
      </div>

      {error && <Text size={12} color={g.urgentBar}>{error}</Text>}

      <button onClick={handleVerifyOTP} disabled={verifying}
        style={{ ...bigBtn(g.card), opacity: verifying || otp.join('').length < 6 ? 0.5 : 1 }}>
        {verifying ? 'Verifying…' : 'Verify →'}
      </button>

      <div style={{ display: 'flex', gap: 16 }}>
        <button onClick={() => { setOtp(['','','','','','']); setError(''); handleSendOTP(); }}
          style={{ background: 'none', border: 'none', color: g.accent, fontSize: 13, cursor: 'pointer' }}>
          Resend code
        </button>
        <button onClick={() => { setAuthStep('otp'); setError(''); setOtp(['','','','','','']); }}
          style={{ background: 'none', border: 'none', color: g.muted, fontSize: 13, cursor: 'pointer' }}>
          ← Change email
        </button>
      </div>
    </div>
  );

  // ── STORAGE CHOICE ─────────────────────────────────────────────────────────
  if (authStep === 'storage') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>💾</div>
        <Text size={22} bold g={g}>Where to save your data?</Text>
        <br /><Text size={13} muted g={g}>You can change this later in Settings</Text>
      </div>
      {[
        { id: 'local', icon: '💾', title: 'Local (this device)', desc: 'Saved in your browser. Fast, private, no login required.' },
        { id: 'drive', icon: '☁️', title: 'Google Drive', desc: 'Synced to Drive. Access from anywhere, always backed up.' },
      ].map(opt => (
        <div key={opt.id} onClick={() => setStorageMode(opt.id)} style={{
          background: 'rgba(255,255,255,0.85)',
          border: `2px solid ${storageMode === opt.id ? g.card : g.surfaceBorder}`,
          borderRadius: 14, padding: 16, cursor: 'pointer', width: '100%',
          display: 'flex', gap: 14, alignItems: 'flex-start',
          background: storageMode === opt.id ? `${g.card}12` : 'rgba(255,255,255,0.85)',
        }}>
          <span style={{ fontSize: 28 }}>{opt.icon}</span>
          <div style={{ flex: 1 }}>
            <Text bold g={g}>{opt.title}</Text>
            <br /><Text size={12} muted g={g}>{opt.desc}</Text>
          </div>
          {storageMode === opt.id && <span style={{ color: g.accent, fontSize: 20 }}>✓</span>}
        </div>
      ))}
      <button onClick={() => setAuthStep('tabs')} style={bigBtn(g.card)}>Continue →</button>
    </div>
  );

  // ── TAB CONFIGURATION ──────────────────────────────────────────────────────
  if (authStep === 'tabs') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>⚙️</div>
        <Text size={22} bold g={g}>Choose your workspace</Text>
        <br /><Text size={13} muted g={g}>Pick the tabs you need. Change anytime.</Text>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ALL_TABS.map(tab => {
          const tg = GEMS[tab.id];
          const isEnabled = enabledTabs.includes(tab.id);
          const isRequired = tab.id === 'dashboard';
          return (
            <div key={tab.id} onClick={() => {
              if (isRequired) return;
              setEnabledTabs(prev => isEnabled
                ? prev.filter(t => t !== tab.id)
                : [...prev, tab.id]);
            }} style={{
              background: isEnabled ? `${tg.card}12` : 'rgba(255,255,255,0.85)',
              border: `2px solid ${isEnabled ? tg.card : g.surfaceBorder}`,
              borderRadius: 14, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: isRequired ? 'default' : 'pointer',
              opacity: isRequired ? 0.7 : 1,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: tg.card,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {tab.icon}
              </div>
              <div style={{ flex: 1 }}>
                <Text bold style={{ color: tg.card }}>{tab.label}</Text>
                <br /><Text size={11} muted g={g}>{tg.name}{isRequired ? ' · always on' : ''}</Text>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: 6,
                background: isEnabled ? tg.card : 'rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isEnabled && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button
        disabled={enabledTabs.length < 2}
        onClick={() => completeOnboarding({ storage_mode: storageMode, enabled_tabs: enabledTabs, pinned_tab: pinnedTab })}
        style={{ ...bigBtn(g.card), opacity: enabledTabs.length < 2 ? 0.4 : 1 }}>
        Let's go →
      </button>
    </div>
  );

  return null;
}
