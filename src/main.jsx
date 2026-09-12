import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

const USERS_KEY = 'sanoq:users:v1';
const SESSION_KEY = 'sanoq:session:v1';
const THEME_KEY = 'sanoq:theme:v1';
const COUNTS_PREFIX = 'sanoq:counts:';
const MANUAL_PREFIX = 'sanoq:manual-base:';

const PRAYERS = [
  { id: 'bomdod', title: 'Bomdod', subtitle: 'Tong ibodati', arabic: 'فجر', accent: 'morning', icon: 'sunrise' },
  { id: 'peshin', title: 'Peshin', subtitle: 'Kun o‘rtasi', arabic: 'ظهر', accent: 'noon', icon: 'sun' },
  { id: 'asr', title: 'Asr', subtitle: 'Kunning ikkinchi yarmi', arabic: 'عصر', accent: 'afternoon', icon: 'cloud-sun' },
  { id: 'shom', title: 'Shom', subtitle: 'Quyosh botishi', arabic: 'مغرب', accent: 'sunset', icon: 'sunset' },
  { id: 'xufton', title: 'Xufton', subtitle: 'Tun ibodati', arabic: 'عشاء', accent: 'night', icon: 'moon' },
];

const DEFAULT_COUNTS = PRAYERS.reduce((result, prayer) => ({ ...result, [prayer.id]: 0 }), {});

function safeRead(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app still remains usable if browser storage is unavailable.
  }
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'S';
}

function formatDate() {
  return new Intl.DateTimeFormat('uz-UZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function formatNumber(value) {
  return new Intl.NumberFormat('uz-UZ').format(value);
}

function Icon({ name, size = 20, strokeWidth = 1.9 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  const paths = {
    check: <path d="m5 12 4.2 4.2L19 6.8" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrowRight: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    arrowLeft: <><path d="M19 12H6" /><path d="m11 18-6-6 6-6" /></>,
    moon: <path d="M20.2 15.2A8 8 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />,
    sun: <><circle cx="12" cy="12" r="3.6" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    sunrise: <><path d="M4 18h16" /><path d="M6.5 15a5.5 5.5 0 0 1 11 0" /><path d="M12 4v3M5.8 7.8l2.1 2.1M18.2 7.8l-2.1 2.1" /></>,
    sunset: <><path d="M4 18h16" /><path d="M6.5 15a5.5 5.5 0 0 1 11 0" /><path d="M12 4v3M5.8 7.8l2.1 2.1M18.2 7.8l-2.1 2.1" /><path d="m8 20 4 2 4-2" /></>,
    'cloud-sun': <><path d="M7 18h9.5a3.5 3.5 0 0 0 .3-7 5.5 5.5 0 0 0-10.5 1.5A3 3 0 0 0 7 18Z" /><path d="M16 5v2M21 10h-2M19.5 6.5 18 8M11.5 6.5 13 8" /></>,
    spark: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z" /></>,
    edit: <><path d="m14.5 5.5 4 4" /><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" /></>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11" /><path d="M3 5v6h6" /><path d="M4 13a8.1 8.1 0 0 0 14.8 3L21 13" /><path d="M21 19v-6h-6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></>,
    settings: <><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" /><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.9 1.9 0 0 0-3.2 1.4v.2a2 2 0 1 1-4 0v-.2a1.9 1.9 0 0 0-3.2-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.9 1.9 0 0 0 2 11.8v-.2a2 2 0 1 1 4 0v.2a1.9 1.9 0 0 0 3.2 1.4l.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.9 1.9 0 0 0 15.3 9h.2a1.9 1.9 0 0 0 3.2 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.9 1.9 0 0 0 19.4 15Z" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3 4.7-5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    eye: <><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.9 10.9 0 0 1 12 5c6.1 0 9.5 7 9.5 7a17.8 17.8 0 0 1-3 3.8M6.6 6.6C4 8 2.5 12 2.5 12a17.2 17.2 0 0 0 5.1 5.2" /></>,
  };
  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-mark"><Icon name="spark" size={22} strokeWidth={1.7} /></div>
      <div className="brand-copy">
        <strong>Sanoq</strong>
        {!compact && <span>ibodat hisoblagichi</span>}
      </div>
    </div>
  );
}

function AuthScreen({ onAuth, theme, onThemeToggle }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const username = normalizeUsername(form.username);
    const users = safeRead(USERS_KEY, []);

    if (mode === 'signup') {
      if (form.name.trim().length < 2) {
        setError('Ismingizni kiriting.');
        return;
      }
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        setError('Username 3–24 belgidan iborat bo‘lsin: harf, raqam yoki _.');
        return;
      }
      if (form.password.length < 4) {
        setError('Parol kamida 4 belgidan iborat bo‘lsin.');
        return;
      }
      if (users.some((user) => user.username === username)) {
        setError('Bu username band. Boshqasini tanlang.');
        return;
      }
      setIsBusy(true);
      const user = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: form.name.trim(), username, password: form.password };
      window.setTimeout(() => {
        safeWrite(USERS_KEY, [...users, user]);
        onAuth({ id: user.id, name: user.name, username: user.username });
      }, 260);
      return;
    }

    const user = users.find((candidate) => candidate.username === username && candidate.password === form.password);
    if (!user) {
      setError('Username yoki parol noto‘g‘ri.');
      return;
    }
    setIsBusy(true);
    window.setTimeout(() => onAuth({ id: user.id, name: user.name, username: user.username }), 260);
  };

  return (
    <main className="auth-page">
      <div className="auth-background-shape shape-one" />
      <div className="auth-background-shape shape-two" />
      <header className="auth-topbar">
        <Brand />
        <button className="icon-button ghost" onClick={onThemeToggle} aria-label={theme === 'light' ? 'Tungi rejim' : 'Yorug‘ rejim'}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
        </button>
      </header>
      <section className="auth-layout">
        <div className="auth-intro">
          <div className="eyebrow"><span className="eyebrow-dot" /> Tinchlik bilan sanang</div>
          <h1>Har bir amal —<br /><em>bir go‘zal qadam.</em></h1>
          <p>Namoz sanoqlaringizni chiroyli, tartibli va doim yoningizda saqlang. Internet kerak emas.</p>
          <div className="auth-benefits">
            <div><span className="benefit-icon"><Icon name="check" size={15} /></span><span>Oflayn ham ishlaydi</span></div>
            <div><span className="benefit-icon"><Icon name="lock" size={15} /></span><span>Ma’lumotlar faqat sizning qurilmangizda</span></div>
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-card-heading">
            <div className="mobile-brand"><Brand compact /></div>
            <h2>{mode === 'signup' ? 'Xush kelibsiz' : 'Qaytganingizdan xursandmiz'}</h2>
            <p>{mode === 'signup' ? 'Sanoqni boshlash uchun hisob yarating.' : 'Hisobingizga kirish uchun ma’lumotlarni kiriting.'}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Kirish turi">
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} role="tab" aria-selected={mode === 'signup'}>Ro‘yxatdan o‘tish</button>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} role="tab" aria-selected={mode === 'login'}>Kirish</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && <label className="field-label">Ismingiz
              <span className="input-wrap"><Icon name="user" size={18} /><input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Masalan, Jasur" autoComplete="name" /></span>
            </label>}
            <label className="field-label">Username
              <span className="input-wrap"><span className="input-prefix">@</span><input value={form.username} onChange={(event) => updateField('username', event.target.value.replace(/\s/g, ''))} placeholder="username" autoComplete="username" /></span>
            </label>
            <label className="field-label">Parol
              <span className="input-wrap"><Icon name="lock" size={18} /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /><button type="button" className="input-action" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} /></button></span>
            </label>
            {error && <div className="form-error"><Icon name="info" size={16} />{error}</div>}
            <button className="primary-button auth-submit" type="submit" disabled={isBusy}>{isBusy ? <span className="button-loader" /> : <>{mode === 'signup' ? 'Hisob yaratish' : 'Kirish'}<Icon name="arrowRight" size={18} /></>}</button>
          </form>
          <p className="auth-note"><Icon name="lock" size={14} /> Hisob lokal qurilmangizda xavfsiz saqlanadi.</p>
        </div>
      </section>
      <footer className="auth-footer">© {new Date().getFullYear()} Sanoq <span>•</span> Soddalik bilan yaratilgan</footer>
    </main>
  );
}

function StatCard({ label, value, helper, icon, tone }) {
  return <div className={`stat-card ${tone}`}><div className="stat-icon"><Icon name={icon} size={18} /></div><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>;
}

function PrayerCard({ prayer, count, manual, onAdd, onManualEdit }) {
  return (
    <article className={`prayer-card accent-${prayer.accent} ${manual ? 'manual-active' : ''}`}>
      <div className="prayer-card-top">
        <div className="prayer-icon"><Icon name={prayer.icon} size={23} /></div>
        <div className="prayer-heading"><h3>{prayer.title}</h3><span>{prayer.subtitle}</span></div>
        <span className="arabic-label" lang="ar">{prayer.arabic}</span>
      </div>
      <div className="count-area">
        <button className={`count-value ${manual ? 'count-editable' : ''}`} onClick={() => manual && onManualEdit(prayer)} aria-label={`${prayer.title} sanog‘i: ${count}. Tahrirlash uchun bosing`}>
          <span>{formatNumber(count)}</span>{manual && <Icon name="edit" size={15} />}
        </button>
        <span className="count-caption">marta o‘qilgan</span>
      </div>
      <button className={`count-button ${manual ? 'manual-button' : ''}`} onClick={() => (manual ? onManualEdit(prayer) : onAdd(prayer))}>
        <Icon name={manual ? 'edit' : 'plus'} size={18} />
        {manual ? 'Sanog‘ni tahrirlash' : 'Sanoqni oshirish'}
      </button>
    </article>
  );
}

function Modal({ modal, onClose, onConfirm, manualValue, setManualValue }) {
  const manualInputRef = useRef(null);
  useEffect(() => {
    if (modal?.type === 'manual') manualInputRef.current?.focus();
  }, [modal]);
  if (!modal) return null;
  const isManual = modal.type === 'manual';
  const isReset = modal.type === 'reset';
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card ${isManual ? 'manual-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Yopish"><Icon name="x" size={19} /></button>
        <div className={`modal-icon ${isReset ? 'danger-icon' : ''}`}><Icon name={isReset ? 'refresh' : isManual ? 'edit' : 'plus'} size={24} /></div>
        <h2 id="modal-title">{isReset ? 'Manual sanog‘ini tiklaysizmi?' : isManual ? `${modal.prayer.title} sanog‘i` : `${modal.prayer.title} ga qo‘shamizmi?`}</h2>
        <p>{isReset ? 'Tasdiqlasangiz, manual rejimdan oldingi barcha sanoqlarga qaytasiz. Bu amalni ortga qaytarib bo‘lmaydi.' : isManual ? 'Istalgan sonni kiriting. Tasdiqlangach, yangi sanoq saqlanadi.' : `Tasdiqlasangiz, ${modal.prayer.title} sanog‘i 1 taga oshadi.`}</p>
        {isManual && <label className="manual-input-label">Yangi sanoq
          <span className="manual-input-wrap"><input ref={manualInputRef} type="number" min="0" inputMode="numeric" value={manualValue} onChange={(event) => setManualValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onConfirm()} /><span>marta</span></span>
        </label>}
        <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Bekor qilish</button><button className={`primary-button ${isReset ? 'danger-button' : ''}`} onClick={onConfirm}>{isReset ? 'Ha, tiklash' : isManual ? 'Saqlash' : 'Ha, qo‘shish'}{!isManual && !isReset && <Icon name="check" size={17} />}</button></div>
      </section>
    </div>
  );
}

function Dashboard({ session, onLogout, theme, onThemeToggle }) {
  const countsKey = `${COUNTS_PREFIX}${session.username}`;
  const manualKey = `${MANUAL_PREFIX}${session.username}`;
  const [counts, setCounts] = useState(() => ({ ...DEFAULT_COUNTS, ...safeRead(countsKey, {}) }));
  const [manualBase, setManualBase] = useState(() => safeRead(manualKey, null));
  const [manual, setManual] = useState(() => Boolean(safeRead(manualKey, null)));
  const [modal, setModal] = useState(null);
  const [manualValue, setManualValue] = useState('');
  const [toast, setToast] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const total = useMemo(() => Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0), [counts]);
  const completed = PRAYERS.filter((prayer) => Number(counts[prayer.id]) > 0).length;
  const progress = Math.round((completed / PRAYERS.length) * 100);
  const firstName = session.name.split(' ')[0];

  const persistCounts = (nextCounts) => {
    setCounts(nextCounts);
    safeWrite(countsKey, nextCounts);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2800);
  };

  const startManual = () => {
    if (manual) {
      setManual(false);
      setManualBase(null);
      localStorage.removeItem(manualKey);
      showToast('Oddiy sanoq rejimiga qaytdingiz.');
      return;
    }
    const snapshot = { ...counts };
    setManualBase(snapshot);
    setManual(true);
    safeWrite(manualKey, snapshot);
    showToast('Manual rejim yoqildi.');
  };

  const openIncrement = (prayer) => setModal({ type: 'increment', prayer });
  const openManual = (prayer) => {
    setManualValue(String(counts[prayer.id] ?? 0));
    setModal({ type: 'manual', prayer });
  };

  const confirmModal = () => {
    if (!modal) return;
    if (modal.type === 'increment') {
      const next = { ...counts, [modal.prayer.id]: Number(counts[modal.prayer.id] || 0) + 1 };
      persistCounts(next);
      setModal(null);
      showToast(`${modal.prayer.title} sanog‘iga 1 qo‘shildi.`);
      return;
    }
    if (modal.type === 'manual') {
      if (!/^\d+$/.test(String(manualValue).trim())) {
        showToast('Faqat musbat butun son kiriting.', 'error');
        return;
      }
      const value = Number(manualValue);
      if (!Number.isSafeInteger(value) || value < 0) {
        showToast('Kiritilgan son juda katta.', 'error');
        return;
      }
      persistCounts({ ...counts, [modal.prayer.id]: value });
      setModal(null);
      showToast(`${modal.prayer.title} sanog‘i saqlandi.`);
      return;
    }
    if (modal.type === 'reset') {
      if (!manualBase) return;
      persistCounts({ ...DEFAULT_COUNTS, ...manualBase });
      setManual(false);
      setManualBase(null);
      localStorage.removeItem(manualKey);
      setModal(null);
      showToast('Avvalgi sanoqlarga qaytarildi.');
    }
  };

  const requestReset = () => setModal({ type: 'reset' });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <div className="header-actions">
            <button className={`manual-toggle ${manual ? 'active' : ''}`} onClick={startManual}><Icon name="edit" size={16} /><span>Manual</span><i /></button>
            <button className="icon-button" onClick={onThemeToggle} aria-label={theme === 'light' ? 'Tungi rejim' : 'Yorug‘ rejim'}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} /></button>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}><span className="avatar">{getInitials(session.name)}</span><span className="profile-name">{firstName}</span><span className={`profile-chevron ${profileOpen ? 'up' : ''}`}>⌄</span></button>
              {profileOpen && <div className="profile-menu"><div className="profile-menu-head"><span className="avatar large">{getInitials(session.name)}</span><div><strong>{session.name}</strong><span>@{session.username}</span></div></div><div className="menu-divider" /><button onClick={() => { setProfileOpen(false); onLogout(); }}><Icon name="logout" size={17} /> Chiqish</button></div>}
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="welcome-row">
          <div><div className="eyebrow dark"><span className="eyebrow-dot" /> Bugungi holat</div><h1>Assalomu alaykum, {firstName} <span className="wave">✦</span></h1><p className="date-line">{formatDate()} <span>•</span> Har bir sanoq qadrli</p></div>
          <div className="offline-pill"><span className="offline-dot" /> Oflayn ishlayapti</div>
        </section>

        <section className="overview-grid">
          <div className="overview-card progress-card">
            <div className="progress-copy"><span className="card-kicker">Bugungi umumiy sanoq</span><strong>{formatNumber(total)}</strong><p>Har bir kichik amal — katta xotirjamlik.</p></div>
            <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><div><strong>{progress}<small>%</small></strong><span>5 mahaldan</span></div></div>
          </div>
          <div className="stat-grid"><StatCard label="Faol mahal" value={`${completed}/5`} helper={completed === 5 ? 'Barchasi boshlandi' : 'Bugun qayd etildi'} icon="checkCircle" tone="mint" /><StatCard label="Rejim" value={manual ? 'Manual' : 'Oddiy'} helper={manual ? 'Tahrirlash yoqilgan' : 'Bir bosishda +1'} icon={manual ? 'edit' : 'spark'} tone="lavender" /></div>
        </section>

        <section className="section-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot" /> Besh mahal</div><h2>Bugungi sanoqlar</h2></div><p>{manual ? 'Son ustiga bosing — xohlagancha kiriting.' : 'Har bir mahal uchun tasdiqlab, birma-bir qo‘shing.'}</p></section>
        {manual && <div className="manual-banner"><div className="manual-banner-icon"><Icon name="edit" size={18} /></div><div><strong>Manual rejim yoqilgan</strong><span>Sonni o‘zgartirish uchun karta ichidagi raqam yoki tugmani bosing.</span></div><button onClick={requestReset} disabled={!manualBase}><Icon name="refresh" size={16} /> Reset</button></div>}
        <section className="prayer-grid">{PRAYERS.map((prayer) => <PrayerCard key={prayer.id} prayer={prayer} count={Number(counts[prayer.id] || 0)} manual={manual} onAdd={openIncrement} onManualEdit={openManual} />)}</section>

        <section className="tip-card"><div className="tip-icon"><Icon name="spark" size={20} /></div><div><strong>Sanoq — shoshilmasdan</strong><p>O‘zingizga qulay tezlikda davom eting. Natijalar qurilmangizda avtomatik saqlanadi.</p></div><span className="tip-decoration">✦</span></section>
        <footer className="app-footer"><Brand compact /><span>Internet bo‘lmasa ham, yoningizda.</span></footer>
      </main>
      <Modal modal={modal} onClose={() => setModal(null)} onConfirm={confirmModal} manualValue={manualValue} setManualValue={setManualValue} />
      {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}><span className="toast-icon"><Icon name={toast.type === 'error' ? 'info' : 'check'} size={16} /></span>{toast.message}</div>}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(() => safeRead(SESSION_KEY, null));
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101b1b' : '#f6f7f8');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  const handleAuth = (nextSession) => {
    safeWrite(SESSION_KEY, nextSession);
    setSession(nextSession);
  };
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');

  return session ? <Dashboard session={session} onLogout={handleLogout} theme={theme} onThemeToggle={toggleTheme} /> : <AuthScreen onAuth={handleAuth} theme={theme} onThemeToggle={toggleTheme} />;
}

export default App;
