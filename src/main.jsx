import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, supabaseConfigured } from './supabaseClient';
import './styles.css';

const APP_VERSION = '0.0.02';
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/jasur-ai/sanoq-app/main/public/version.json';
const USERS_KEY = 'sanoq:users:v1';
const SESSION_KEY = 'sanoq:session:v1';
const THEME_KEY = 'sanoq:theme:v1';
const COUNTS_PREFIX = 'sanoq:counts:';
const STATS_PREFIX = 'sanoq:stats:';
const MANUAL_PREFIX = 'sanoq:manual-base:';

const PRAYERS = [
  { id: 'bomdod', title: 'Bomdod', subtitle: 'Tong ibodati', arabic: 'فجر', accent: 'morning', icon: 'sunrise' },
  { id: 'peshin', title: 'Peshin', subtitle: 'Kun o‘rtasi', arabic: 'ظهر', accent: 'noon', icon: 'sun' },
  { id: 'asr', title: 'Asr', subtitle: 'Kunning ikkinchi yarmi', arabic: 'عصر', accent: 'afternoon', icon: 'cloud-sun' },
  { id: 'shom', title: 'Shom', subtitle: 'Quyosh botishi', arabic: 'مغرب', accent: 'sunset', icon: 'sunset' },
  { id: 'xufton', title: 'Xufton', subtitle: 'Tun ibodati', arabic: 'عشاء', accent: 'night', icon: 'moon' },
  { id: 'vitr', title: 'Vitr', subtitle: 'Vitr namozi', arabic: 'وتر', accent: 'vitr', icon: 'spark' },
];

const emptyValues = () => PRAYERS.reduce((result, prayer) => ({ ...result, [prayer.id]: 0 }), {});
const defaultStats = () => ({ counts: emptyValues(), daily: emptyValues(), date: dateKey(), history: [] });

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
    // Local storage is optional; the app remains usable if it is unavailable.
  }
}

function safeGetString(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Local storage is optional.
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Local storage is optional.
  }
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isCompleteDay(daily) {
  return PRAYERS.every((prayer) => Number(daily?.[prayer.id] || 0) > 0);
}

function loadStats(username) {
  const today = dateKey();
  const stored = safeRead(`${STATS_PREFIX}${username}`, null);
  const legacy = safeRead(`${COUNTS_PREFIX}${username}`, null);
  const base = stored?.counts ? stored : { ...defaultStats(), counts: { ...emptyValues(), ...(legacy || {}) } };
  const stats = {
    counts: { ...emptyValues(), ...(base.counts || {}) },
    daily: { ...emptyValues(), ...(base.daily || {}) },
    date: base.date || today,
    history: Array.isArray(base.history) ? base.history.slice(-90) : [],
  };

  if (stats.date !== today) {
    if (Object.values(stats.daily).some((value) => Number(value) > 0)) {
      stats.history.push({ date: stats.date, daily: stats.daily, complete: isCompleteDay(stats.daily) });
    }
    stats.history = stats.history.slice(-90);
    stats.date = today;
    stats.daily = emptyValues();
    safeWrite(`${STATS_PREFIX}${username}`, stats);
  }
  return stats;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'S';
}

function formatDate() {
  return new Intl.DateTimeFormat('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

function formatNumber(value) {
  return new Intl.NumberFormat('uz-UZ').format(value);
}

function versionCompare(a, b) {
  const parse = (value) => String(value || '0').split('.').map((part) => Number(part) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] || 0) > (right[index] || 0)) return 1;
    if ((left[index] || 0) < (right[index] || 0)) return -1;
  }
  return 0;
}

function Icon({ name, size = 20, strokeWidth = 1.9 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  const paths = {
    check: <path d="m5 12 4.2 4.2L19 6.8" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrowRight: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    moon: <path d="M20.2 15.2A8 8 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />,
    sun: <><circle cx="12" cy="12" r="3.6" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    sunrise: <><path d="M4 18h16" /><path d="M6.5 15a5.5 5.5 0 0 1 11 0" /><path d="M12 4v3M5.8 7.8l2.1 2.1M18.2 7.8l-2.1 2.1" /></>,
    sunset: <><path d="M4 18h16" /><path d="M6.5 15a5.5 5.5 0 0 1 11 0" /><path d="M12 4v3M5.8 7.8l2.1 2.1M18.2 7.8l-2.1 2.1" /><path d="m8 20 4 2 4-2" /></>,
    'cloud-sun': <><path d="M7 18h9.5a3.5 3.5 0 0 0 .3-7 5.5 5.5 0 0 0-10.5 1.5A3 3 0 0 0 7 18Z" /><path d="M16 5v2M21 10h-2M19.5 6.5 18 8M11.5 6.5 13 8" /></>,
    spark: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7L19 16Z" /></>,
    edit: <><path d="m14.5 5.5 4 4" /><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" /></>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11" /><path d="M3 5v6h6" /><path d="M4 13a8.1 8.1 0 0 0 14.8 3L21 13" /><path d="M21 19v-6h-6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3 4.7-5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    eye: <><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.9 10.9 0 0 1 12 5c6.1 0 9.5 7 9.5 7a17.8 17.8 0 0 1-3 3.8M6.6 6.6C4 8 2.5 12 2.5 12a17.2 17.2 0 0 0 5.1 5.2" /></>,
    wifi: <><path d="M5 12.5a10.5 10.5 0 0 1 14 0M8 15.5a6.2 6.2 0 0 1 8 0M11 18.5a2 2 0 0 1 2 0" /></>,
  };
  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><div className="brand-mark"><Icon name="spark" size={22} strokeWidth={1.7} /></div><div className="brand-copy"><strong>Sanoq</strong>{!compact && <span>ibodat hisoblagichi</span>}</div></div>;
}

function AuthScreen({ onAuth, theme, onThemeToggle }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setError(''); setInfo(''); };
  const switchMode = (nextMode) => { setMode(nextMode); setError(''); setInfo(''); };
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    if (!supabaseConfigured || !supabase) return setError('Online server sozlanmagan. Keyinroq qayta urinib ko‘ring.');
    const username = normalizeUsername(form.username);
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return setError('Username 3–24 belgidan iborat bo‘lsin: harf, raqam yoki _.');
    if (form.password.length < 6) return setError('Parol kamida 6 belgidan iborat bo‘lsin.');
    setIsBusy(true);
    try {
      if (mode === 'signup') {
        if (form.name.trim().length < 2) throw new Error('Ismingizni kiriting.');
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) throw new Error('To‘g‘ri email manzilini kiriting.');
        const { data, error: signUpError } = await supabase.auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password, options: { data: { full_name: form.name.trim(), username } } });
        if (signUpError) throw signUpError;
        if (data.session) onAuth(data.session);
        else { setInfo('Email manzilingizga tasdiqlash xabari yuborildi. Emailni tasdiqlab, keyin kiring.'); setMode('login'); }
        return;
      }
      const { data: email, error: lookupError } = await supabase.rpc('lookup_email_by_username', { p_username: username });
      if (lookupError) throw new Error('Username bazasi hali sozlanmagan. Supabase migration SQL’ni ishga tushiring.');
      if (!email) throw new Error('Username yoki parol noto‘g‘ri.');
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password: form.password });
      if (loginError) throw loginError;
      onAuth(data.session);
    } catch (authError) {
      const message = String(authError?.message || 'Kirishda xatolik yuz berdi.');
      if (message.toLowerCase().includes('username')) setError(message.includes('migration') ? message : 'Bu username band yoki noto‘g‘ri.');
      else if (message.toLowerCase().includes('already registered')) setError('Bu email allaqachon ro‘yxatdan o‘tgan.');
      else if (message.toLowerCase().includes('invalid login')) setError('Username yoki parol noto‘g‘ri.');
      else setError(message);
    } finally {
      setIsBusy(false);
    }
  };
  return <main className="auth-page"><div className="auth-background-shape shape-one" /><div className="auth-background-shape shape-two" /><header className="auth-topbar"><Brand /><button className="icon-button ghost" onClick={onThemeToggle} aria-label="Rejimni almashtirish"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} /></button></header><section className="auth-layout"><div className="auth-intro"><div className="eyebrow"><span className="eyebrow-dot" /> Onlayn va xavfsiz</div><h1>Har bir amal —<br /><em>bir go‘zal qadam.</em></h1><p>Namoz sanoqlaringizni hisobingiz bilan saqlang. Internet bo‘lmasa ham oxirgi ma’lumotlar qurilmangizda qoladi.</p><div className="auth-benefits"><div><span className="benefit-icon"><Icon name="check" size={15} /></span><span>Username serverda tekshiriladi</span></div><div><span className="benefit-icon"><Icon name="lock" size={15} /></span><span>Ma’lumotlar hisobingizga bog‘langan</span></div></div></div><div className="auth-card"><div className="auth-card-heading"><div className="mobile-brand"><Brand compact /></div><h2>{mode === 'signup' ? 'Xush kelibsiz' : 'Qaytganingizdan xursandmiz'}</h2><p>{mode === 'signup' ? 'Onlayn hisob yarating va Sanoqni boshlang.' : 'Username va parolingiz bilan kiring.'}</p></div><div className="auth-tabs"><button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Ro‘yxatdan o‘tish</button><button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Kirish</button></div><form onSubmit={submit} className="auth-form">{mode === 'signup' && <label className="field-label">Ismingiz<span className="input-wrap"><Icon name="user" size={18} /><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Masalan, Jasur" /></span></label>}<label className="field-label">Username<span className="input-wrap"><span className="input-prefix">@</span><input value={form.username} onChange={(event) => update('username', event.target.value.replace(/\s/g, ''))} placeholder="username" autoCapitalize="none" /></span></label>{mode === 'signup' && <label className="field-label">Email<span className="input-wrap"><Icon name="info" size={18} /><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="siz@email.com" autoCapitalize="none" /></span></label>}<label className="field-label">Parol<span className="input-wrap"><Icon name="lock" size={18} /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="••••••••" /><button type="button" className="input-action" onClick={() => setShowPassword((value) => !value)}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} /></button></span></label>{error && <div className="form-error"><Icon name="info" size={16} />{error}</div>}{info && <div className="form-info"><Icon name="checkCircle" size={16} />{info}</div>}<button className="primary-button auth-submit" type="submit" disabled={isBusy}>{isBusy ? <span className="button-loader" /> : <>{mode === 'signup' ? 'Hisob yaratish' : 'Kirish'}<Icon name="arrowRight" size={18} /></>}</button></form><p className="auth-note"><Icon name="wifi" size={14} /> Real online account va unique username.</p></div></section><footer className="auth-footer">© {new Date().getFullYear()} Sanoq <span>•</span> {APP_VERSION}</footer></main>;
}
function PrayerCard({ prayer, count, manual, onAdd, onManualEdit }) {
  return <article className={`prayer-card accent-${prayer.accent} ${manual ? 'manual-active' : ''}`}><div className="prayer-card-top"><div className="prayer-icon"><Icon name={prayer.icon} size={23} /></div><div className="prayer-heading"><h3>{prayer.title}</h3><span>{prayer.subtitle}</span></div><span className="arabic-label" lang="ar">{prayer.arabic}</span></div><div className="count-area"><button className={`count-value ${manual ? 'count-editable' : ''}`} onClick={() => manual && onManualEdit(prayer)} aria-label={`${prayer.title} sanog‘i: ${count}`}>{formatNumber(count)}{manual && <Icon name="edit" size={15} />}</button><span className="count-caption">jami o‘qilgan</span></div><button className={`count-button ${manual ? 'manual-button' : ''}`} onClick={() => manual ? onManualEdit(prayer) : onAdd(prayer)}><Icon name={manual ? 'edit' : 'plus'} size={18} />{manual ? 'Sanog‘ni tahrirlash' : 'Sanoqni oshirish'}</button></article>;
}

function Modal({ modal, onClose, onConfirm, manualValue, setManualValue }) {
  const inputRef = useRef(null);
  useEffect(() => { if (modal?.type === 'manual') inputRef.current?.focus(); }, [modal]);
  if (!modal) return null;
  const isManual = modal.type === 'manual';
  const isReset = modal.type === 'reset';
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal-card ${isManual ? 'manual-modal' : ''}`} role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose} aria-label="Yopish"><Icon name="x" size={19} /></button><div className={`modal-icon ${isReset ? 'danger-icon' : ''}`}><Icon name={isReset ? 'refresh' : isManual ? 'edit' : 'plus'} size={24} /></div><h2>{isReset ? 'Manual sanog‘ini tiklaysizmi?' : isManual ? `${modal.prayer.title} sanog‘i` : `${modal.prayer.title} ga qo‘shamizmi?`}</h2><p>{isReset ? 'Tasdiqlasangiz, manual rejimdan oldingi sanoqlar va bugungi holat qaytariladi.' : isManual ? 'Istalgan sonni kiriting. Tasdiqlangach, yangi sanoq saqlanadi.' : `Tasdiqlasangiz, ${modal.prayer.title} sanog‘i 1 taga oshadi.`}</p>{isManual && <label className="manual-input-label">Yangi sanoq<span className="manual-input-wrap"><input ref={inputRef} type="number" min="0" inputMode="numeric" value={manualValue} onChange={(event) => setManualValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onConfirm()} /><span>marta</span></span></label>}<div className="modal-actions"><button className="secondary-button" onClick={onClose}>Bekor qilish</button><button className={`primary-button ${isReset ? 'danger-button' : ''}`} onClick={onConfirm}>{isReset ? 'Ha, tiklash' : isManual ? 'Saqlash' : 'Ha, qo‘shish'}{!isManual && !isReset && <Icon name="check" size={17} />}</button></div></section></div>;
}

function AccountModal({ session, onClose, onLogout, update, onCheck, onInstall }) {
  const statusText = { idle: 'Internetga ulangan holda versiyani tekshiring.', checking: 'Yangilanishlar tekshirilmoqda...', upToDate: `Sizda eng so‘nggi versiya — ${APP_VERSION}.`, available: `${update.latest?.version} versiyasi tayyor.`, offline: 'Internet aloqasi yo‘q. Keyinroq qayta urinib ko‘ring.', error: 'Tekshirishda xatolik yuz berdi.' }[update.status];
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="account-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose} aria-label="Yopish"><Icon name="x" size={19} /></button><div className="account-hero"><span className="avatar account-avatar">{getInitials(session.name)}</span><div><h2>{session.name}</h2><p>@{session.username}</p></div></div><div className="account-info-list"><div><span>Akkaunt</span><strong>Online profil</strong></div><div><span>Ma’lumotlar</span><strong>Bulut + qurilma</strong></div><div><span>Ilova versiyasi</span><strong>{APP_VERSION}</strong></div></div><div className="version-box"><div className="version-box-title"><span className="version-icon"><Icon name="refresh" size={17} /></span><div><strong>Versiya yangilanishi</strong><span>{statusText}</span></div></div>{update.status === 'available' ? <button className="primary-button update-button" onClick={onInstall}>Yangilash <Icon name="arrowRight" size={16} /></button> : <button className="secondary-button check-button" onClick={onCheck} disabled={update.status === 'checking'}>{update.status === 'checking' ? <span className="small-loader" /> : <Icon name="wifi" size={16} />} Versiyani tekshirish</button>}{update.status === 'available' && <button className="secondary-button check-again" onClick={onCheck}>Qayta tekshirish</button>}</div><button className="account-logout" onClick={onLogout}><Icon name="logout" size={17} /> Hisobdan chiqish</button></section></div>;
}

function StatsSection({ stats }) {
  const total = Object.values(stats.counts).reduce((sum, value) => sum + Number(value || 0), 0);
  const todayDone = PRAYERS.filter((prayer) => Number(stats.daily[prayer.id] || 0) > 0).length;
  const completeDays = stats.history.filter((item) => item.complete).length + (isCompleteDay(stats.daily) ? 1 : 0);
  const maxCount = Math.max(1, ...PRAYERS.map((prayer) => Number(stats.counts[prayer.id] || 0)));
  const history = [...stats.history, { date: stats.date, daily: stats.daily, complete: isCompleteDay(stats.daily), current: true }].slice(-7).reverse();
  return <section className="statistics-section"><div className="section-heading stats-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot" /> Natijalar</div><h2>Statistika</h2></div><p>Har bir namoz va kun bo‘yicha umumiy ko‘rsatkichlar.</p></div><div className="stat-summary-grid"><div className="stat-summary-card mint"><span className="summary-icon"><Icon name="checkCircle" size={18} /></span><div><strong>{completeDays}</strong><span>To‘liq o‘qilgan kun</span></div></div><div className="stat-summary-card lavender"><span className="summary-icon"><Icon name="sun" size={18} /></span><div><strong>{todayDone}/6</strong><span>Bugungi holat</span></div></div><div className="stat-summary-card gold"><span className="summary-icon"><Icon name="spark" size={18} /></span><div><strong>{formatNumber(total)}</strong><span>Jami namoz sanoqlari</span></div></div></div><div className="stats-detail-grid"><div className="prayer-stats-card"><div className="stats-card-heading"><div><strong>Namozlar kesimida</strong><span>Har birining jami o‘qilgan soni</span></div><Icon name="checkCircle" size={19} /></div><div className="bar-list">{PRAYERS.map((prayer) => <div className="bar-row" key={prayer.id}><div className="bar-label"><span className={`mini-prayer-icon accent-${prayer.accent}`}><Icon name={prayer.icon} size={13} /></span><strong>{prayer.title}</strong><b>{formatNumber(stats.counts[prayer.id] || 0)}</b></div><div className="bar-track"><span style={{ width: `${Math.max(2, (Number(stats.counts[prayer.id] || 0) / maxCount) * 100)}%` }} /></div></div>)}</div></div><div className="history-card"><div className="stats-card-heading"><div><strong>Oxirgi kunlar</strong><span>Barcha 6 mahal bajarilgan kunlar</span></div><Icon name="refresh" size={19} /></div><div className="history-list">{history.length === 0 && <div className="empty-history">Hali kunlik tarix yo‘q.</div>}{history.map((item) => <div className="history-row" key={`${item.date}-${item.current ? 'current' : 'old'}`}><span className={`history-check ${item.complete ? 'done' : ''}`}><Icon name={item.complete ? 'check' : 'sun'} size={13} /></span><div><strong>{item.current ? 'Bugun' : new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00`))}</strong><span>{item.complete ? '6 mahal to‘liq' : `${PRAYERS.filter((prayer) => Number(item.daily?.[prayer.id] || 0) > 0).length}/6 mahal`}</span></div><b>{item.complete ? 'Bajarildi' : 'Jarayonda'}</b></div>)}</div></div></div></section>;
}

function Dashboard({ session, onLogout, theme, onThemeToggle }) {
  const statsKey = `${STATS_PREFIX}${session.username}`;
  const manualKey = `${MANUAL_PREFIX}${session.username}`;
  const [stats, setStats] = useState(() => loadStats(session.username));
  const [manualBase, setManualBase] = useState(() => safeRead(manualKey, null));
  const [manual, setManual] = useState(() => Boolean(safeRead(manualKey, null)));
  const [modal, setModal] = useState(null);
  const [manualValue, setManualValue] = useState('');
  const [toast, setToast] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [update, setUpdate] = useState({ status: 'idle', latest: null });

  const showToast = (message, type = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 2800); };
  useEffect(() => {
    if (!supabase || !session.id) return undefined;
    let active = true;
    supabase.from('user_data').select('stats').eq('user_id', session.id).maybeSingle().then(({ data }) => {
      if (!active || !data?.stats?.counts) return;
      const remote = { ...defaultStats(), ...data.stats, counts: { ...emptyValues(), ...data.stats.counts }, daily: { ...emptyValues(), ...data.stats.daily } };
      setStats(remote);
      safeWrite(statsKey, remote);
      safeWrite(`${COUNTS_PREFIX}${session.username}`, remote.counts);
    });
    return () => { active = false; };
  }, [session.id]);
  const persistStats = (next) => {
    setStats(next);
    safeWrite(statsKey, next);
    safeWrite(`${COUNTS_PREFIX}${session.username}`, next.counts);
    if (supabase && session.id) supabase.from('user_data').upsert({ user_id: session.id, stats: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).then(({ error }) => { if (error) console.warn('Sanoq cloud sync:', error.message); });
  };
  const counts = stats.counts;

  const addPrayer = (prayer) => {
    const next = { ...stats, counts: { ...stats.counts, [prayer.id]: Number(stats.counts[prayer.id] || 0) + 1 }, daily: { ...stats.daily, [prayer.id]: Number(stats.daily[prayer.id] || 0) + 1 } };
    persistStats(next);
    setModal(null);
    showToast(`${prayer.title} sanog‘iga 1 qo‘shildi.`);
  };

  const confirmManual = () => {
    if (!modal) return;
    if (modal.type === 'increment') return addPrayer(modal.prayer);
    if (modal.type === 'manual') {
      if (!/^\d+$/.test(String(manualValue).trim())) return showToast('Faqat butun son kiriting.', 'error');
      const value = Number(manualValue);
      if (!Number.isSafeInteger(value) || value < 0) return showToast('Kiritilgan son juda katta.', 'error');
      const dailyValue = value > 0 ? Math.max(1, Number(stats.daily[modal.prayer.id] || 0)) : 0;
      persistStats({ ...stats, counts: { ...stats.counts, [modal.prayer.id]: value }, daily: { ...stats.daily, [modal.prayer.id]: dailyValue } });
      setModal(null);
      showToast(`${modal.prayer.title} sanog‘i saqlandi.`);
      return;
    }
    if (modal.type === 'reset' && manualBase) {
      persistStats({ ...defaultStats(), ...manualBase, counts: { ...emptyValues(), ...manualBase.counts }, daily: { ...emptyValues(), ...manualBase.daily } });
      setModal(null);
      showToast('Manual rejimdan oldingi holatga qaytarildi.');
    }
  };

  const toggleManual = () => {
    if (manual) {
      setManual(false);
      setManualBase(null);
      safeRemove(manualKey);
      showToast('Oddiy sanoq rejimiga qaytdingiz.');
      return;
    }
    const snapshot = JSON.parse(JSON.stringify(stats));
    setManualBase(snapshot);
    setManual(true);
    safeWrite(manualKey, snapshot);
    showToast('Manual rejim yoqildi.');
  };

  const openManual = (prayer) => { setManualValue(String(counts[prayer.id] || 0)); setModal({ type: 'manual', prayer }); };

  const checkUpdate = async () => {
    if (!navigator.onLine) return setUpdate({ status: 'offline', latest: null });
    setUpdate({ status: 'checking', latest: null });
    try {
      const response = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('version check failed');
      const latest = await response.json();
      setUpdate({ status: versionCompare(latest.version, APP_VERSION) > 0 ? 'available' : 'upToDate', latest });
    } catch {
      setUpdate({ status: 'error', latest: null });
    }
  };

  const installUpdate = async () => {
    const url = update.latest?.apkUrl;
    if (!url) return showToast('Yangilanish manzili topilmadi.', 'error');
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { window.location.href = url; }
  };

  return <div className="app-shell"><header className="app-header"><div className="header-inner"><Brand /><div className="header-actions"><button className={`manual-toggle ${manual ? 'active' : ''}`} onClick={toggleManual} title={manual ? 'Oddiy sanoq rejimiga o‘tish' : 'Manual rejimni yoqish'}><Icon name={manual ? 'plus' : 'edit'} size={16} /><span>{manual ? 'Sanoq' : 'Manual'}</span><i /></button><button className="icon-button" onClick={onThemeToggle} aria-label="Rejimni almashtirish"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} /></button><button className="profile-button" onClick={() => setAccountOpen(true)} aria-label="Account ma’lumotlari"><span className="avatar">{getInitials(session.name)}</span><span className="profile-name">{session.name.split(' ')[0]}</span><span className="profile-chevron">⌄</span></button></div></div></header><main className="dashboard-main"><section className="start-heading"><div><div className="eyebrow dark"><span className="eyebrow-dot" /> Namozlar</div><h1>Bugungi sanoqlar</h1><p>Namozlar sanog‘ini boshlang</p></div><div className="offline-pill"><span className="offline-dot" /> Oflayn ishlayapti</div></section>{manual && <div className="manual-banner"><div className="manual-banner-icon"><Icon name="edit" size={18} /></div><div><strong>Manual rejim yoqilgan</strong><span>Sonni o‘zgartirish uchun karta ichidagi raqam yoki tugmani bosing.</span></div><button onClick={() => setModal({ type: 'reset' })} disabled={!manualBase}><Icon name="refresh" size={16} /> Reset</button></div>}<section className="prayer-grid">{PRAYERS.map((prayer) => <PrayerCard key={prayer.id} prayer={prayer} count={Number(counts[prayer.id] || 0)} manual={manual} onAdd={(item) => setModal({ type: 'increment', prayer: item })} onManualEdit={openManual} />)}</section><StatsSection stats={stats} /><section className="tip-card"><div className="tip-icon"><Icon name="spark" size={20} /></div><div><strong>Sanoq — shoshilmasdan</strong><p>Natijalar va statistika avtomatik saqlanadi. Internet bo‘lmasa ham foydalaning.</p></div><span className="tip-decoration">✦</span></section><footer className="app-footer"><Brand compact /><span>Internet bo‘lmasa ham, yoningizda.</span></footer></main><Modal modal={modal} onClose={() => setModal(null)} onConfirm={confirmManual} manualValue={manualValue} setManualValue={setManualValue} />{accountOpen && <AccountModal session={session} onClose={() => setAccountOpen(false)} onLogout={() => { setAccountOpen(false); onLogout(); }} update={update} onCheck={checkUpdate} onInstall={installUpdate} />}{toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}><span className="toast-icon"><Icon name={toast.type === 'error' ? 'info' : 'check'} size={16} /></span>{toast.message}</div>}</div>;
}

function App() {
  const [authSession, setAuthSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState(() => { const saved = safeGetString(THEME_KEY); return saved || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); });

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return undefined; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) { setAuthSession(data.session); setAuthReady(true); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setAuthSession(nextSession); setAuthReady(true); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !authSession?.user?.id) { setProfile(null); return; }
    let active = true;
    supabase.from('profiles').select('id, username, full_name, email').eq('id', authSession.user.id).maybeSingle().then(({ data }) => { if (active) setProfile(data || null); });
    return () => { active = false; };
  }, [authSession?.user?.id]);

  useEffect(() => { document.documentElement.dataset.theme = theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101b1b' : '#f6f7f8'); safeSetString(THEME_KEY, theme); }, [theme]);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);

  const handleAuth = (nextSession) => setAuthSession(nextSession);
  const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); setProfile(null); setAuthSession(null); };
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');

  if (!authReady) return <main className="boot-app"><div className="boot-card"><div className="boot-logo">✦</div><strong>Sanoq</strong><span><i /> Hisob tekshirilmoqda...</span></div></main>;
  if (!authSession) return <AuthScreen onAuth={handleAuth} theme={theme} onThemeToggle={toggleTheme} />;
  const user = authSession.user;
  const userSession = { id: user.id, name: profile?.full_name || user.user_metadata?.full_name || 'Sanoq foydalanuvchisi', username: profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'user', email: profile?.email || user.email || '' };
  return <Dashboard session={userSession} onLogout={handleLogout} theme={theme} onThemeToggle={toggleTheme} />;
}
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Sanoq ilovasi yuklanish xatosi:', error, info); }
  render() { if (!this.state.hasError) return this.props.children; return <main className="fatal-error-page"><section className="fatal-error-card"><div className="fatal-error-mark">!</div><h1>Ilova yuklanmadi</h1><p>Sanoq ishga tushayotganda kutilmagan xatolik yuz berdi. Qayta yuklab ko‘ring.</p><button className="primary-button" onClick={() => window.location.reload()}>Qayta yuklash</button><small>{this.state.error?.message || 'Noma’lum xatolik'}</small></section></main>; }
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<AppErrorBoundary><App /></AppErrorBoundary>);

export default App;
