// src/views/Onboarding.jsx
import { useState } from 'react';
import { GEMS, ALL_TABS } from '../theme/gems';
import { Text, Input, Btn } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const g = GEMS.dashboard; // Onboarding always uses Sapphire

export default function Onboarding() {
  const { authStep, setAuthStep, sendOTP, verifyOTP, signInWithGoogle, completeOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['','','','','','']);
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const [enabledTabs, setEnabledTabs] = useState(['dashboard','work','learning','personal','finance']);
  const [storageMode, setStorageMode] = useState('local');
  const [pinnedTab, setPinnedTab] = useState('dashboard');

  const handleSendOTP = async () => {
    if (!email.trim()) return;
    setSending(true);
    const { error } = await sendOTP(email);
    setSending(false);
    if (error) { setOtpError(error.message); return; }
    setAuthStep('verify');
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    const { error } = await verifyOTP(email, code);
    if (error) { setOtpError('Invalid code. Please try again.'); return; }
    setAuthStep('storage');
  };

  const wrap = { minHeight: '100vh', background: g.bg, display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 28, gap: 20, fontFamily: 'system-ui' };

  const card = { background: 'rgba(255,255,255,0.8)', border: `1px solid ${g.surfaceBorder}`,
    borderRadius: 16, padding: 18, width: '100%', cursor: 'pointer',
    display: 'flex', gap: 14, alignItems: 'flex-start' };

  // ── WELCOME ────────────────────────────────────────────────────────────────
  if (authStep === 'welcome') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, fontWeight: 800, color: g.text, fontFamily: 'Georgia, serif', letterSpacing: -2 }}>
          Praxi Pro
        </div>
        <div style={{ fontSize: 16, color: g.muted, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginTop: 4 }}>
          Plan. Learn. Relax.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          {ALL_TABS.map(t => (
            <div key={t.id} style={{ width: 36, height: 36, borderRadius: '50%',
              background: GEMS[t.id].card, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 16 }}>{t.icon}</div>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setAuthStep('otp')} style={{ background: g.card, border: 'none',
          color: '#fff', borderRadius: 12, padding: '12px 0', width: '100%',
          fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Continue with Email
        </button>
        <button onClick={signInWithGoogle} style={{ background: 'rgba(255,255,255,0.85)',
          border: `1.5px solid ${g.surfaceBorder}`, color: g.text, borderRadius: 12,
          padding: '12px 0', width: '100%', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <span style={{ fontWeight: 700, marginRight: 8 }}>G</span>Continue with Google
        </button>
      </div>
    </div>
  );

  // ── EMAIL OTP ──────────────────────────────────────────────────────────────
  if (authStep === 'otp') return (
    <div style={wrap}>
      <Text size={24} bold g={g}>Enter your email</Text>
      <Input g={g} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      {otpError && <Text size={12} color={g.urgentBar}>{otpError}</Text>}
      <button onClick={handleSendOTP} disabled={sending} style={{ background: g.card, border: 'none',
        color: '#fff', borderRadius: 12, padding: '12px 0', width: '100%',
        fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
        {sending ? 'Sending…' : 'Send code →'}
      </button>
      <button onClick={() => setAuthStep('welcome')} style={{ background: 'none', border: 'none',
        color: g.muted, fontSize: 13, cursor: 'pointer' }}>← Back</button>
    </div>
  );

  // ── VERIFY OTP ─────────────────────────────────────────────────────────────
  if (authStep === 'verify') return (
    <div style={wrap}>
      <Text size={24} bold g={g}>Check your email</Text>
      <Text size={13} muted g={g} style={{ textAlign: 'center' }}>
        We sent a 6-digit code to {email}
      </Text>
      <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
        {otp.map((digit, i) => (
          <input key={i} maxLength={1} value={digit}
            onChange={e => {
              const next = [...otp]; next[i] = e.target.value;
              setOtp(next);
              if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
            }}
            id={`otp-${i}`}
            style={{ width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
              background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${g.surfaceBorder}`,
              borderRadius: 10, color: g.text, outline: 'none' }}
          />
        ))}
      </div>
      {otpError && <Text size={12} color={g.urgentBar}>{otpError}</Text>}
      <button onClick={handleVerifyOTP} style={{ background: g.card, border: 'none', color: '#fff',
        borderRadius: 12, padding: '12px 0', width: '100%', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Verify →
      </button>
    </div>
  );

  // ── STORAGE CHOICE ─────────────────────────────────────────────────────────
  if (authStep === 'storage') return (
    <div style={wrap}>
      <Text size={24} bold g={g}>Where to save your data?</Text>
      {[
        { id: 'local', icon: '💾', title: 'Local (this device)', desc: 'Saved in your browser. Fast, private, no login required.' },
        { id: 'drive', icon: '☁️', title: 'Google Drive', desc: 'Saved to your Drive. Access from anywhere, always backed up.' },
      ].map(opt => (
        <div key={opt.id} onClick={() => setStorageMode(opt.id)} style={{
          ...card,
          border: `2px solid ${storageMode === opt.id ? g.card : g.surfaceBorder}`,
          background: storageMode === opt.id ? `${g.card}12` : 'rgba(255,255,255,0.8)',
        }}>
          <span style={{ fontSize: 28 }}>{opt.icon}</span>
          <div>
            <Text bold g={g}>{opt.title}</Text>
            <br /><Text size={12} muted g={g}>{opt.desc}</Text>
          </div>
          {storageMode === opt.id && <span style={{ marginLeft: 'auto', color: g.accent, fontSize: 18 }}>✓</span>}
        </div>
      ))}
      <button onClick={() => setAuthStep('tabs')} style={{ background: g.card, border: 'none', color: '#fff',
        borderRadius: 12, padding: '12px 0', width: '100%', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Continue →
      </button>
    </div>
  );

  // ── TAB CONFIGURATION ──────────────────────────────────────────────────────
  if (authStep === 'tabs') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center' }}>
        <Text size={24} bold g={g}>Choose your workspace</Text>
        <br /><Text size={13} muted g={g}>Pick the tabs you need. You can always change this later.</Text>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ALL_TABS.map(tab => {
          const tg = GEMS[tab.id];
          const isEnabled = enabledTabs.includes(tab.id);
          const isRequired = tab.id === 'dashboard';
          return (
            <div key={tab.id} onClick={() => {
              if (isRequired) return;
              setEnabledTabs(prev => isEnabled ? prev.filter(t => t !== tab.id) : [...prev, tab.id]);
            }} style={{
              background: 'rgba(255,255,255,0.85)', border: `2px solid ${isEnabled ? tg.card : g.surfaceBorder}`,
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
                <Text bold g={{ text: tg.card }}>{tab.label}</Text>
                <br /><Text size={11} g={g} muted>{tg.name} {isRequired ? '(always on)' : ''}</Text>
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
      <button onClick={() => completeOnboarding({ storage_mode: storageMode, enabled_tabs: enabledTabs, pinned_tab: pinnedTab })}
        style={{ background: g.card, border: 'none', color: '#fff',
          borderRadius: 12, padding: '12px 0', width: '100%', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Let's go →
      </button>
    </div>
  );

  return null;
}
