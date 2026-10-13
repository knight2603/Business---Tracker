import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const API_ORIGIN = API_URL.replace(/\/api$/, '')
const assetUrl = (url) => url?.startsWith('http') ? url : `${API_ORIGIN}${url || ''}`
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const currency = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(amount || 0))
const monthLabel = (month) => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(`${month}-02T12:00:00`))
const dateTime = (value) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const compactCurrency = (amount) => new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(amount || 0))
const categories = [
  { key: 'needs', name: 'Necesidades', percent: 50, icon: '⌂', color: 'blue', hint: 'Vivienda, comida, transporte' },
  { key: 'wants', name: 'Deseos', percent: 30, icon: '♡', color: 'violet', hint: 'Ocio, compras, suscripciones' },
  { key: 'savings', name: 'Ahorro', percent: 20, icon: '↗', color: 'green', hint: 'Metas, fondo de emergencia' },
]
const accountBrand = (name = '') => {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized.includes('bancolombia')) return 'bancolombia'
  if (normalized === 'nu' || normalized.startsWith('nu ')) return 'nu'
  if (normalized.includes('bbva')) return 'bbva'
  if (normalized.includes('visa')) return 'visa'
  if (normalized.includes('occidente')) return 'occidente'
  if (normalized.includes('peoplepass')) return 'peoplepass'
  return 'default'
}

async function api(path, options = {}) {
  const token = localStorage.getItem('balance_token')
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(!isFormData ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const validation = data.errors ? Object.values(data.errors).flat()[0] : null
    throw new Error(validation || data.message || 'No se pudo completar la solicitud.')
  }
  return data
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const registering = mode === 'register'

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const result = await api(registering ? '/register' : '/login', { method: 'POST', body: JSON.stringify(form) })
      localStorage.setItem('balance_token', result.token)
      onAuthenticated(result.user)
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  return <main className="auth-page"><section className="auth-card"><a className="brand auth-brand" href="#inicio"><span className="brand-mark">b.</span><span>balance<span className="brand-dot">.</span></span></a><div className="eyebrow">TUS FINANZAS, A TU RITMO</div><h1>{registering ? 'Crea tu cuenta' : 'Qué bueno verte'}</h1><p className="auth-subtitle">{registering ? 'Empieza a organizar tu dinero con la regla 50/30/20.' : 'Inicia sesión para ver tu balance personal.'}</p>
    {error && <div className="flash flash-error" role="alert">{error}</div>}
    <form onSubmit={submit} className="auth-form">{registering && <label>Nombre<input required maxLength="120" autoComplete="name" placeholder="Tu nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}<label>Correo electrónico<input required type="email" autoComplete="email" placeholder="tu@correo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Contraseña<input required type="password" minLength="8" autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Mínimo 8 caracteres' : 'Tu contraseña'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>{registering && <label>Confirma tu contraseña<input required type="password" minLength="8" autoComplete="new-password" placeholder="Repite tu contraseña" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} /></label>}<button className="primary-button" disabled={saving}>{saving ? 'Un momento…' : registering ? 'Crear cuenta' : 'Iniciar sesión'} <span>→</span></button></form>
    <div className="auth-switch">{registering ? '¿Ya tienes una cuenta?' : '¿Todavía no tienes cuenta?'} <button onClick={() => { setMode(registering ? 'login' : 'register'); setError('') }}>{registering ? 'Inicia sesión' : 'Crear cuenta'}</button></div>
  </section><p className="auth-footnote">Cada peso con un propósito. <strong>balance<span className="brand-dot">.</span></strong></p></main>
}

function TrendChart({ months, onHover }) {
  const width = 900, height = 285, left = 58, right = 880, top = 20, bottom = 225
  const values = months.flatMap((item) => [item.income, item.spent, item.remaining])
  const min = Math.min(0, ...values), max = Math.max(1, ...values), range = Math.max(1, max - min)
  const x = (index) => months.length < 2 ? (left + right) / 2 : left + index * (right - left) / (months.length - 1)
  const y = (value) => top + ((max - value) / range) * (bottom - top)
  const series = [
    { key: 'income', label: 'Ingresos', color: '#368d59' },
    { key: 'spent', label: 'Descontado', color: '#d47d62' },
    { key: 'remaining', label: 'Disponible', color: '#5c89c8' },
  ]
  const pathFor = (key) => months.map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(item[key])}`).join(' ')

  return <div className="history-chart-scroll"><svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de ingresos, gastos descontados y dinero disponible por mes">
    {[0, 1, 2, 3].map((tick) => { const value = max - range * tick / 3; const pos = top + (bottom - top) * tick / 3; return <g key={tick}><line x1={left} x2={right} y1={pos} y2={pos} className="chart-grid-line" /><text x={left - 9} y={pos + 3} textAnchor="end" className="chart-axis-label">{compactCurrency(value)}</text></g> })}
    {months.map((item, index) => { const step = months.length > 1 ? (right - left) / (months.length - 1) : right - left; const band = Math.min(step, 100); return <g key={item.month} onMouseEnter={() => onHover(item)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(item)} onBlur={() => onHover(null)}><rect x={x(index) - band / 2} y={top} width={band} height={bottom - top + 36} fill="transparent" tabIndex="0" aria-label={`Ver resumen de ${item.label}`} /><text x={x(index)} y={height - 20} textAnchor="middle" className="chart-axis-label">{item.label}</text></g> })}
    {series.map((line) => <path key={line.key} d={pathFor(line.key)} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`trend-line ${line.key}`} />)}
    {series.map((line) => months.map((item, index) => <circle key={`${line.key}-${item.month}`} cx={x(index)} cy={y(item[line.key])} r="4" fill={line.color} className="trend-point" />))}
  </svg><div className="chart-legend history-legend">{series.map((line) => <span key={line.key}><i style={{ background: line.color }} />{line.label}</span>)}</div></div>
}

function CategoryHistoryChart({ months, onHover }) {
  const width = 900, height = 265, left = 50, right = 880, top = 18, bottom = 220
  const max = Math.max(1, ...months.map((item) => item.spent))
  const step = (right - left) / Math.max(months.length, 1)
  const barWidth = Math.min(36, step * 0.55)
  const plotHeight = bottom - top

  return <div className="history-chart-scroll"><svg className="history-chart category-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gastos completados por categoría y mes">
    {[0, 1, 2, 3].map((tick) => { const value = max * (1 - tick / 3); const pos = top + plotHeight * tick / 3; return <g key={tick}><line x1={left} x2={right} y1={pos} y2={pos} className="chart-grid-line" /><text x={left - 8} y={pos + 3} textAnchor="end" className="chart-axis-label">{compactCurrency(value)}</text></g> })}
    {months.map((item, index) => {
      const center = left + step * (index + 0.5)
      let stackBottom = bottom
      return <g key={item.month} onMouseEnter={() => onHover(item)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(item)} onBlur={() => onHover(null)}>
        <rect x={center - step / 2} y={top} width={step} height={height - top} fill="transparent" tabIndex="0" aria-label={`Ver resumen de ${item.label}`} />
        {categories.map((category) => { const amount = Number(item.categories[category.key].spent); const barHeight = amount / max * plotHeight; stackBottom -= barHeight; return barHeight > 0 ? <rect key={category.key} x={center - barWidth / 2} y={stackBottom} width={barWidth} height={barHeight} rx="3" className={`history-bar ${category.color}`} /> : null })}
        <text x={center} y={height - 17} textAnchor="middle" className="chart-axis-label">{item.label}</text>
      </g>
    })}
  </svg><div className="chart-legend history-legend">{categories.map((category) => <span key={category.key}><i className={`legend-dot ${category.color}`} />{category.name}</span>)}</div></div>
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem('balance_token')))
  const [month, setMonth] = useState(today().slice(0, 7))
  const [dashboard, setDashboard] = useState(null)
  const [movements, setMovements] = useState([])
  const [statistics, setStatistics] = useState([])
  const [historyRange, setHistoryRange] = useState(12)
  const [hoveredMonth, setHoveredMonth] = useState(null)
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [goals, setGoals] = useState([])
  const [accounts, setAccounts] = useState([])
  const [accountsTotal, setAccountsTotal] = useState(0)
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [depositingId, setDepositingId] = useState(null)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [accountForm, setAccountForm] = useState({ name: '', type: 'bank', initial_balance: '' })
  const [depositForms, setDepositForms] = useState({})
  const [goalsInfo, setGoalsInfo] = useState({ monthly_income: 0, savings_capacity: 0 })
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)
  const [contributingId, setContributingId] = useState(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalPhoto, setGoalPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [goalForm, setGoalForm] = useState({ name: '', target_amount: '', term_unit: 'month', term_value: 6 })
  const [contributionAmounts, setContributionAmounts] = useState({})
  const [view, setView] = useState('summary')
  const [theme, setTheme] = useState(() => localStorage.getItem('balance_theme') || 'light')
  const [accent, setAccent] = useState(() => localStorage.getItem('balance_accent') || 'green')
  const [profileForm, setProfileForm] = useState({ email: '', current_password: '', password: '', password_confirmation: '' })
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [incomeForm, setIncomeForm] = useState({ amount: '', description: '', date: today() })
  const [expenseForms, setExpenseForms] = useState(Object.fromEntries(categories.map(({ key }) => [key, { amount: '', description: '', date: today() }])))
  const [saving, setSaving] = useState(false)
  const [completingId, setCompletingId] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('balance_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.accent = accent
    localStorage.setItem('balance_accent', accent)
  }, [accent])

  const refresh = useCallback(async () => {
    try { setDashboard(await api(`/dashboard?month=${month}`)); setError('') } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [month])

  const refreshMovements = useCallback(async () => {
    try {
      const result = await api('/movements')
      setMovements(result.movements)
    } catch (err) { setError(err.message) }
  }, [])

  const refreshStatistics = useCallback(async () => {
    setStatisticsLoading(true)
    try { const result = await api(`/statistics?months=${historyRange}`); setStatistics(result.months); setError('') } catch (err) { setError(err.message) } finally { setStatisticsLoading(false) }
  }, [historyRange])

  const refreshGoals = useCallback(async () => {
    setGoalsLoading(true)
    try {
      const result = await api('/goals')
      setGoals(result.goals); setGoalsInfo({ monthly_income: result.monthly_income, savings_capacity: result.savings_capacity }); setError('')
    } catch (err) { setError(err.message) } finally { setGoalsLoading(false) }
  }, [])

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true)
    try {
      const result = await api('/accounts')
      setAccounts(result.accounts); setAccountsTotal(result.total_balance); setError('')
    } catch (err) { setError(err.message) } finally { setAccountsLoading(false) }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('balance_token')) return
    api('/me').then((result) => { setUser(result.user); setProfileForm((form) => ({ ...form, email: result.user.email })); setLoading(true) }).catch(() => localStorage.removeItem('balance_token')).finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    queueMicrotask(() => { if (active) void refresh() })
    return () => { active = false }
  }, [refresh, user])
  useEffect(() => {
    if (!user || view !== 'movements') return
    let active = true
    queueMicrotask(() => { if (active) void refreshMovements() })
    return () => { active = false }
  }, [refreshMovements, user, view])
  useEffect(() => {
    if (!user || view !== 'statistics') return
    let active = true
    queueMicrotask(() => { if (active) void refreshStatistics() })
    return () => { active = false }
  }, [refreshStatistics, user, view])
  useEffect(() => {
    if (!user || view !== 'goals') return
    let active = true
    queueMicrotask(() => { if (active) void refreshGoals() })
    return () => { active = false }
  }, [refreshGoals, user, view])
  useEffect(() => {
    if (!user || view !== 'accounts') return
    let active = true
    queueMicrotask(() => { if (active) void refreshAccounts() })
    return () => { active = false }
  }, [refreshAccounts, user, view])

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => () => { if (profilePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(profilePhotoPreview) }, [profilePhotoPreview])

  useEffect(() => {
    if (selectedAccountId === null) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelectedAccountId(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedAccountId])

  async function logout() {
    try { await api('/logout') } catch { /* Clear the local session even if the server is unavailable. */ }
    localStorage.removeItem('balance_token'); setUser(null); setDashboard(null); setError('')
  }

  function authenticatedUser(authenticated) {
    setUser(authenticated)
    setProfileForm((form) => ({ ...form, email: authenticated.email }))
    setLoading(true)
  }

  async function submitIncome(event) {
    event.preventDefault(); setSaving(true); setNotice(''); setError('')
    try {
      await api('/incomes', { method: 'POST', body: JSON.stringify(incomeForm) })
      setIncomeForm({ amount: '', description: '', date: today() })
      setNotice('Ingreso agregado. Tus porcentajes se actualizaron.')
      await refresh()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function submitExpense(event, category) {
    event.preventDefault(); setSaving(true); setNotice(''); setError('')
    try {
      await api('/expenses', { method: 'POST', body: JSON.stringify({ ...expenseForms[category], category }) })
      setExpenseForms((current) => ({ ...current, [category]: { amount: '', description: '', date: today() } }))
      setNotice('Agregado al checklist. Se descontará cuando lo marques como realizado.')
      await refresh()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function completeExpense(expense) {
    setCompletingId(expense.id); setError(''); setNotice('')
    try {
      await api(`/expenses/${expense.id}/complete`, { method: 'POST' })
      setNotice(`Se descontaron ${currency(expense.amount)} y se guardó la fecha en Movimientos.`)
      await Promise.all([refresh(), view === 'movements' ? refreshMovements() : Promise.resolve()])
    } catch (err) { setError(err.message) } finally { setCompletingId(null) }
  }

  async function submitGoal(event) {
    event.preventDefault(); setGoalSaving(true); setError(''); setNotice('')
    const payload = new FormData()
    Object.entries(goalForm).forEach(([key, value]) => payload.append(key, String(value)))
    if (goalPhoto) payload.append('photo', goalPhoto)
    try {
      await api('/goals', { method: 'POST', body: payload })
      setGoalForm({ name: '', target_amount: '', term_unit: 'month', term_value: 6 })
      setGoalPhoto(null); setPhotoPreview(''); setShowGoalForm(false)
      setNotice('Meta creada. Tu cuota sugerida ya está calculada.')
      await refreshGoals()
    } catch (err) { setError(err.message) } finally { setGoalSaving(false) }
  }

  async function contributeToGoal(event, goal) {
    event.preventDefault(); setContributingId(goal.id); setError(''); setNotice('')
    try {
      const result = await api(`/goals/${goal.id}/contributions`, { method: 'POST', body: JSON.stringify({ amount: contributionAmounts[goal.id] || goal.monthly_installment }) })
      setNotice(result.is_complete ? `¡${goal.name} cumplida! Tu constancia hizo posible esta meta. ¿Listo para soñar la siguiente?` : `Aporte agregado a ${goal.name}. ¡Cada paso te acerca más!`)
      setContributionAmounts((previous) => ({ ...previous, [goal.id]: '' }))
      await refreshGoals()
    } catch (err) { setError(err.message) } finally { setContributingId(null) }
  }

  async function submitAccount(event) {
    event.preventDefault(); setAccountSaving(true); setError(''); setNotice('')
    try {
      await api('/accounts', { method: 'POST', body: JSON.stringify({ ...accountForm, initial_balance: accountForm.initial_balance || 0 }) })
      setAccountForm({ name: '', type: 'bank', initial_balance: '' }); setShowAccountForm(false)
      setNotice('Cuenta creada y saldo guardado en su historial.')
      await refreshAccounts()
    } catch (err) { setError(err.message) } finally { setAccountSaving(false) }
  }

  async function submitDeposit(event, account) {
    event.preventDefault(); setDepositingId(account.id); setError(''); setNotice('')
    const form = depositForms[account.id] || {}
    try {
      await api(`/accounts/${account.id}/deposits`, { method: 'POST', body: JSON.stringify(form) })
      setDepositForms((previous) => ({ ...previous, [account.id]: { amount: '', description: '', date: today() } }))
      setNotice(`Ingreso registrado en ${account.name} y agregado a su historial.`)
      await refreshAccounts()
    } catch (err) { setError(err.message) } finally { setDepositingId(null) }
  }

  async function submitProfile(event) {
    event.preventDefault(); setProfileSaving(true); setError(''); setNotice('')
    const payload = new FormData()
    payload.append('email', profileForm.email)
    if (profileForm.current_password) payload.append('current_password', profileForm.current_password)
    if (profileForm.password) {
      payload.append('password', profileForm.password)
      payload.append('password_confirmation', profileForm.password_confirmation)
    }
    if (profilePhoto) payload.append('profile_photo', profilePhoto)
    try {
      const result = await api('/profile', { method: 'POST', body: payload })
      setUser(result.user)
      setProfileForm({ email: result.user.email, current_password: '', password: '', password_confirmation: '' })
      setProfilePhoto(null); setProfilePhotoPreview('')
      setNotice('Tu perfil se actualizó correctamente.')
    } catch (err) { setError(err.message) } finally { setProfileSaving(false) }
  }

  if (authLoading) return <main className="auth-page"><div className="loading-indicator">Cargando tu sesión…</div></main>
  if (!user) return <AuthScreen onAuthenticated={authenticatedUser} />

  const currentMonth = dashboard?.month || month
  const totalRemaining = categories.reduce((total, category) => total + Number(dashboard?.categories?.[category.key]?.remaining || 0), 0)
  const previewMonth = hoveredMonth || statistics.at(-1) || null
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const termMonths = Number(goalForm.term_value || 0) * (goalForm.term_unit === 'year' ? 12 : 1)
  const suggestedInstallment = termMonths > 0 ? Number(goalForm.target_amount || 0) / termMonths : 0
  const canAffordGoal = suggestedInstallment > 0 && suggestedInstallment <= goalsInfo.savings_capacity
  const maxGoalTerm = goalForm.term_unit === 'year' ? 10 : 120
  return <div className={`app-shell theme-${theme}`}>
    <aside className="sidebar">
      <a className="brand" href="#inicio" onClick={() => setView('summary')}><span className="brand-mark">b.</span><span>balance<span className="brand-dot">.</span></span></a>
      <div className="side-label">TU ESPACIO</div>
      <button aria-label="Resumen" className={`nav-item ${view === 'summary' ? 'active' : ''}`} onClick={() => setView('summary')}><span>▦</span> Resumen</button>
      <button aria-label="Movimientos" className={`nav-item ${view === 'movements' ? 'active' : ''}`} onClick={() => setView('movements')}><span>↕</span> Movimientos</button>
      <button aria-label="Estadísticas" className={`nav-item ${view === 'statistics' ? 'active' : ''}`} onClick={() => setView('statistics')}><span>▥</span> Estadísticas</button>
      <button aria-label="Metas" className={`nav-item ${view === 'goals' ? 'active' : ''}`} onClick={() => setView('goals')}><span>◎</span> Metas</button>
      <button aria-label="Mis cuentas" className={`nav-item ${view === 'accounts' ? 'active' : ''}`} onClick={() => setView('accounts')}><span>▤</span> Mis cuentas</button>
      <button aria-label="Mi perfil" className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}><span>◉</span> Mi perfil</button>
      <div className="sidebar-bottom"><div className="avatar">{user.profile_photo_url ? <img src={assetUrl(user.profile_photo_url)} alt="" /> : user.name.charAt(0).toUpperCase()}</div><div><strong>{user.name}</strong><small>{user.email}</small></div><button className="logout-button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">↪</button></div>
    </aside>

    <main className="main-content" id="inicio">
      <header className="topbar"><div className="breadcrumb">Mi espacio <span>/</span> <strong>{{ summary: 'Resumen', movements: 'Movimientos', statistics: 'Estadísticas', goals: 'Metas', accounts: 'Mis cuentas', profile: 'Mi perfil' }[view]}</strong></div><div className="topbar-right"><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>{theme === 'dark' ? '☀' : '☾'}<span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span></button><span className="live-dot" /> <span className="status-copy">Tus finanzas, en orden</span><div className="profile-avatar">{user.profile_photo_url ? <img src={assetUrl(user.profile_photo_url)} alt="" /> : user.name.charAt(0).toUpperCase()}</div><strong className="topbar-name">{user.name}</strong><button className="mobile-logout" onClick={logout}>Salir</button></div></header>
      <div className="page-content">
        {view === 'summary' ? <>
          <section className="page-heading"><div><div className="eyebrow">TU RESUMEN FINANCIERO</div><h1>Hola, {user.name.split(' ')[0]}<span className="brand-dot">.</span></h1><p>Una mirada clara a tu dinero y a tus metas.</p></div><label className="month-picker"><span>Período</span><input aria-label="Mes" type="month" value={month} onChange={(event) => { setLoading(true); setMonth(event.target.value) }} /></label></section>
          {(error || notice) && <div className={`flash ${error ? 'flash-error' : 'flash-success'}`} role="status">{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Cerrar">×</button></div>}
          <section className="overview-grid" aria-label="Resumen del mes">
            <article className="income-card"><div className="card-overline"><span>INGRESOS DEL MES</span><span className="income-icon">↙</span></div><div className="income-total">{currency(dashboard?.income)}</div><div className="income-caption">{monthLabel(currentMonth)} <span>·</span> suma de tus ingresos registrados</div><div className="income-rule"><span /><span /><span /></div><div className="income-card-bottom"><span>Así se distribuye tu ingreso</span><b>50 / 30 / 20</b></div></article>
            <article className="quick-income card"><div className="section-title"><div><span className="eyebrow">EMPIEZA POR AQUÍ</span><h2>Agregar ingreso</h2></div><span className="round-plus">+</span></div><form onSubmit={submitIncome} className="income-form"><label>Concepto<input required maxLength="120" placeholder="Ej. Salario, freelance..." value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} /></label><div className="input-row"><label>Monto<input required type="number" min="0.01" step="0.01" placeholder="$ 0" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} /></label><label>Fecha<input required type="date" value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} /></label></div><button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Registrar ingreso'} <span>→</span></button></form></article>
          </section>

          <section className="charts-grid" aria-label="Gráficos del presupuesto"><article className="chart-card"><div className="chart-heading"><div><div className="eyebrow">DISTRIBUCIÓN</div><h2>Tu regla 50 / 30 / 20</h2></div><span className="chart-period">{monthLabel(currentMonth)}</span></div><div className="allocation-chart"><div className="donut-chart"><div className="donut-center"><strong>{currency(dashboard?.income)}</strong><span>Ingreso base</span></div></div><div className="chart-legend">{categories.map((category) => <div className="legend-row" key={category.key}><i className={`legend-dot ${category.color}`} /><span>{category.name}</span><strong>{currency(dashboard?.categories?.[category.key]?.limit)}</strong><small>{category.percent}%</small></div>)}</div></div></article>
            <article className="chart-card"><div className="chart-heading"><div><div className="eyebrow">CHECKLIST</div><h2>Avance de tu plan</h2></div><span className="overall-badge">{dashboard?.overall_progress || 0}%</span></div><div className="overall-progress"><div className="overall-progress-track"><span style={{ width: `${dashboard?.overall_progress || 0}%` }} /></div><small>{dashboard?.checked_count || 0} de {dashboard?.total_count || 0} gastos completados</small></div><div className="budget-bars">{categories.map((category) => { const data = dashboard?.categories?.[category.key] || {}; const used = data.limit > 0 ? Math.min(Number(data.spent) / Number(data.limit) * 100, 100) : 0; return <div className="budget-bar-row" key={category.key}><div><span>{category.name}</span><strong>{currency(data.spent)} <small>/ {currency(data.limit)}</small></strong></div><div className="budget-bar-track"><span className={category.color} style={{ width: `${used}%` }} /></div></div> })}</div></article>
            <article className="chart-card remaining-chart-card"><div className="chart-heading"><div><div className="eyebrow">SALDO DISPONIBLE</div><h2>Dinero que te queda</h2></div><span className="chart-period">{monthLabel(currentMonth)}</span></div><div className="remaining-total"><span>Disponible en total</span><strong className={totalRemaining < 0 ? 'over-budget' : ''}>{currency(totalRemaining)}</strong><small>Presupuesto del mes menos gastos marcados</small></div><div className="remaining-modules">{categories.map((category) => { const data = dashboard?.categories?.[category.key] || {}; const remaining = Number(data.remaining || 0); const percentageLeft = data.limit > 0 ? Math.max(0, Math.min(remaining / Number(data.limit) * 100, 100)) : 0; return <div className="remaining-module" key={category.key}><div className="remaining-module-label"><span><i className={`legend-dot ${category.color}`} />{category.name}</span><strong className={remaining < 0 ? 'over-budget' : ''}>{currency(remaining)}</strong></div><div className="remaining-track"><span className={category.color} style={{ width: `${percentageLeft}%` }} /></div><small>{percentageLeft.toFixed(0)}% del módulo disponible</small></div> })}</div></article>
          </section>

          <section className="budget-section"><div className="section-heading"><div><div className="eyebrow">REGLA 50 / 30 / 20</div><h2>Tu plan para {monthLabel(currentMonth)}</h2><p>Agrega gastos al checklist; márcalos al realizarlos para descontarlos y dejar trazabilidad.</p></div><div className="plan-total"><span>Ingreso base</span><strong>{currency(dashboard?.income)}</strong></div></div>
            <div className="category-grid">{categories.map((category) => {
              const data = dashboard?.categories?.[category.key] || {}
              const progress = Number(data.progress || 0)
              return <article className={`category-card ${category.color}`} key={category.key}>
                <div className="category-top"><div className="category-icon">{category.icon}</div><span className="category-percent">{category.percent}<small>%</small></span></div>
                <h3>{category.name}</h3><p className="category-hint">{category.hint}</p>
                <div className="category-amounts"><div><strong>{currency(data.limit)}</strong><span>presupuesto</span></div><div className="spent"><strong>{currency(data.spent)}</strong><span>descontado</span></div></div>
                <div className="check-progress-label"><span>Checklist</span><strong>{progress}% <small>({data.checked_count || 0}/{data.total_count || 0})</small></strong></div><div className="progress-track checklist-track"><span style={{ width: `${progress}%` }} /></div>
                <div className="remaining-line"><span>Disponible</span><strong className={Number(data.remaining) < 0 ? 'over-budget' : ''}>{currency(data.remaining)}</strong></div>
                <form className="expense-form" onSubmit={(event) => submitExpense(event, category.key)}><div className="expense-form-title">Agregar al checklist</div><input aria-label={`Descripción del gasto de ${category.name}`} required maxLength="120" placeholder="¿Qué vas a pagar o ahorrar?" value={expenseForms[category.key].description} onChange={(e) => setExpenseForms((prev) => ({ ...prev, [category.key]: { ...prev[category.key], description: e.target.value } }))} /><div className="expense-input-row"><input aria-label="Monto planificado" required type="number" min="0.01" step="0.01" placeholder="Monto $" value={expenseForms[category.key].amount} onChange={(e) => setExpenseForms((prev) => ({ ...prev, [category.key]: { ...prev[category.key], amount: e.target.value } }))} /><input aria-label="Fecha planificada" required type="date" value={expenseForms[category.key].date} onChange={(e) => setExpenseForms((prev) => ({ ...prev, [category.key]: { ...prev[category.key], date: e.target.value } }))} /><button aria-label={`Agregar a checklist de ${category.name}`} disabled={saving}>+</button></div></form>
                <div className="expense-list">{(data.expenses || []).map((expense) => <label className={`expense-item checklist-item ${expense.is_completed ? 'is-completed' : ''}`} key={expense.id}><input type="checkbox" checked={Boolean(expense.is_completed)} disabled={Boolean(expense.is_completed) || completingId === expense.id} onChange={() => completeExpense(expense)} /><span className="expense-name">{expense.description}<small>{expense.is_completed ? `Descontado · ${dateTime(expense.completed_at)}` : `Pendiente · ${expense.spent_at}`}</small></span><strong>{currency(expense.amount)}</strong></label>)}{!loading && !data.expenses?.length && <div className="empty-expenses">Aún no hay gastos en este checklist.</div>}</div>
              </article>
            })}</div>
          </section>
        </> : view === 'movements' ? <>
          <section className="page-heading"><div><div className="eyebrow">TRAZABILIDAD</div><h1>Movimientos<span className="brand-dot">.</span></h1><p>Todos los gastos que marcaste como realizados.</p></div></section>
          {(error || notice) && <div className={`flash ${error ? 'flash-error' : 'flash-success'}`} role="status">{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Cerrar">×</button></div>}
          <section className="movement-summary"><div className="movement-summary-icon">↘</div><div><span>TOTAL DESCONTADO · HISTORIAL COMPLETO</span><strong>{currency(movements.reduce((sum, movement) => sum + Number(movement.amount), 0))}</strong></div><div className="movement-count"><strong>{movements.length}</strong><span>{movements.length === 1 ? 'movimiento' : 'movimientos'}</span></div></section>
          <section className="movement-card"><div className="movement-card-heading"><div><div className="eyebrow">HISTORIAL</div><h2>Gastos completados</h2></div><span>{movements.length} registros</span></div>
            {movements.length ? <div className="movement-table-wrap"><table className="movement-table"><thead><tr><th>Movimiento</th><th>Categoría</th><th>Fecha y hora</th><th className="amount-heading">Descontado</th></tr></thead><tbody>{movements.map((movement) => { const category = categories.find((item) => item.key === movement.category); return <tr key={movement.id}><td data-label="Movimiento"><span className="movement-name"><i className={`movement-dot ${category.color}`} />{movement.description}</span></td><td data-label="Categoría"><span className={`category-pill ${category.color}`}>{category.name}</span></td><td data-label="Fecha y hora" className="movement-date">{dateTime(movement.completed_at)}</td><td data-label="Descontado" className="movement-amount">− {currency(movement.amount)}</td></tr> })}</tbody></table></div> : <div className="movement-empty"><div>↕</div><h3>Aún no hay movimientos</h3><p>Cuando marques un gasto del checklist, aquí verás el valor descontado y la fecha.</p><button className="primary-button" onClick={() => setView('summary')}>Ir al resumen <span>→</span></button></div>}
          </section>
        </> : view === 'statistics' ? <>
          <section className="page-heading"><div><div className="eyebrow">HISTORIAL FINANCIERO</div><h1>Estadísticas<span className="brand-dot">.</span></h1><p>Compara tus ingresos, descuentos y saldo de meses anteriores.</p></div><label className="month-picker"><span>Período</span><select aria-label="Cantidad de meses" value={historyRange} onChange={(event) => { setHistoryRange(Number(event.target.value)); setHoveredMonth(null) }}><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></label></section>
          {error && <div className="flash flash-error" role="status">{error}<button onClick={() => setError('')} aria-label="Cerrar">×</button></div>}
          <div className="stats-instruction"><span>⌁</span> Pasa el cursor sobre un mes en los gráficos para ver su resumen 50 / 30 / 20.</div>
          {previewMonth && <section className="stats-preview"><div className="stats-preview-heading"><div><div className="eyebrow">VISTA PREVIA DEL MES</div><h2>{monthLabel(previewMonth.month)}</h2></div><span className="preview-hover-hint">{hoveredMonth ? 'Mes seleccionado' : 'Mes actual'}</span></div><div className="stats-kpis"><div><span>Ingresos</span><strong>{currency(previewMonth.income)}</strong></div><div><span>Descontado</span><strong className="kpi-expense">{currency(previewMonth.spent)}</strong></div><div><span>Disponible</span><strong className={previewMonth.remaining < 0 ? 'over-budget' : ''}>{currency(previewMonth.remaining)}</strong></div><div><span>Gastos completados</span><strong>{previewMonth.completed_count}</strong></div></div><div className="preview-categories">{categories.map((category) => { const data = previewMonth.categories[category.key]; return <div className="preview-category" key={category.key}><span><i className={`legend-dot ${category.color}`} />{category.name} <small>{category.percent}%</small></span><strong>{currency(data.spent)} <small>gastado</small></strong><span className="preview-available">Queda {currency(data.remaining)}</span></div> })}</div></section>}
          <section className="history-chart-card"><div className="history-card-heading"><div><div className="eyebrow">TENDENCIA MENSUAL</div><h2>Ingresos, descuentos y saldo disponible</h2><p>Valores mensuales basados en los movimientos completados.</p></div>{statisticsLoading && <span className="chart-period">Actualizando…</span>}</div>{statistics.length > 0 && <TrendChart months={statistics} onHover={setHoveredMonth} />}</section>
          <section className="history-chart-card"><div className="history-card-heading"><div><div className="eyebrow">GASTOS POR MÓDULO</div><h2>Así se distribuyeron tus descuentos</h2><p>Gastos marcados en Necesidades, Deseos y Ahorro.</p></div></div>{statistics.length > 0 && <CategoryHistoryChart months={statistics} onHover={setHoveredMonth} />}</section>
        </> : view === 'accounts' ? <>
          <section className="page-heading goals-page-heading"><div><div className="eyebrow">TODO TU DINERO EN UN SOLO LUGAR</div><h1>Mis cuentas<span className="brand-dot">.</span></h1><p>Consulta tus saldos y registra ingresos en cada cuenta.</p></div><button className="primary-button create-goal-button" onClick={() => setShowAccountForm(!showAccountForm)}>{showAccountForm ? 'Cerrar' : '+ Nueva cuenta'}</button></section>
          {(error || notice) && <div className={`flash ${error ? 'flash-error' : 'flash-success'}`} role="status">{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Cerrar">×</button></div>}
          <section className="accounts-total-card"><span className="capacity-icon">▤</span><div><small>SALDO TOTAL EN TUS CUENTAS</small><strong>{currency(accountsTotal)}</strong><span>{accounts.length} {accounts.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}</span></div></section>
          {showAccountForm && <section className="goal-form-card"><div className="goal-form-heading"><div><div className="eyebrow">NUEVA CUENTA</div><h2>Agrega una cuenta</h2></div><span className="round-plus">+</span></div><div className="account-shortcuts"><span>Agregar rápidamente:</span>{[['Bancolombia','bank'],['BBVA','bank'],['Nu','bank'],['Visa','credit'],['Banco de Occidente','bank'],['PeoplePass','wallet']].map(([name,type]) => <button key={name} type="button" onClick={() => setAccountForm({ ...accountForm, name, type })}>{name}</button>)}</div><form className="goal-form" onSubmit={submitAccount}><div className="goal-form-grid"><label>Nombre de la cuenta<input required maxLength="100" placeholder="Ej. Bancolombia nómina" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} /></label><label>Tipo de cuenta<select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}><option value="bank">Cuenta bancaria</option><option value="credit">Tarjeta de crédito</option><option value="wallet">Billetera / PeoplePass</option><option value="other">Otra</option></select></label><label>Saldo inicial<input type="number" min="0" step="0.01" placeholder="$ 0" value={accountForm.initial_balance} onChange={(event) => setAccountForm({ ...accountForm, initial_balance: event.target.value })} /></label></div><button className="primary-button goal-submit" disabled={accountSaving}>{accountSaving ? 'Guardando…' : 'Crear cuenta'} <span>→</span></button></form></section>}
          {accountsLoading && <div className="goals-loading">Cargando tus cuentas…</div>}
          <section className="accounts-grid">{accounts.map((account) => <article className={`account-card account-${account.type} account-brand-${accountBrand(account.name)}`} key={account.id}><div className="account-card-top"><div className="account-brand-mark">{account.type === 'credit' ? '▣' : account.type === 'wallet' ? '◈' : '▤'}</div><span className="account-type-pill">{{ bank: 'Bancaria', credit: 'Crédito', wallet: 'Billetera', other: 'Otra' }[account.type]}</span></div><h2>{account.name}</h2><div className="account-balance-label">Saldo actual</div><strong className="account-balance">{currency(account.balance)}</strong><div className="account-card-footer"><span>{account.transactions.length} {account.transactions.length === 1 ? 'movimiento' : 'movimientos'}</span><button className="account-open-button" onClick={() => setSelectedAccountId(account.id)}>Abrir cuenta <span>→</span></button></div></article>)}{!accountsLoading && accounts.length === 0 && <div className="goals-empty"><div>▤</div><h2>Agrega tu primera cuenta</h2><p>Registra Bancolombia, Nu, Visa, Banco de Occidente, PeoplePass u otra cuenta y empieza a llevar su saldo.</p><button className="primary-button" onClick={() => setShowAccountForm(true)}>Agregar una cuenta <span>→</span></button></div>}</section>
        </> : view === 'profile' ? <>
          <section className="page-heading"><div><div className="eyebrow">TU CUENTA PERSONAL</div><h1>Mi perfil<span className="brand-dot">.</span></h1><p>Personaliza Balance y mantén tus datos actualizados.</p></div></section>
          {(error || notice) && <div className={`flash ${error ? 'flash-error' : 'flash-success'}`} role="status">{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Cerrar">×</button></div>}
          <section className="profile-card"><div className="profile-card-heading"><div><div className="eyebrow">APARIENCIA</div><h2>Color de la aplicación</h2><p>Elige el tono principal que quieres ver en botones y navegación.</p></div></div><div className="accent-options">{[{ id: 'green', name: 'Verde', color: '#267a4b' }, { id: 'blue', name: 'Azul', color: '#2672b8' }, { id: 'violet', name: 'Morado', color: '#7950b5' }, { id: 'orange', name: 'Naranja', color: '#d97632' }].map((option) => <button type="button" className={`accent-option ${accent === option.id ? 'selected' : ''}`} key={option.id} aria-pressed={accent === option.id} onClick={() => setAccent(option.id)}><i style={{ background: option.color }} /><span>{option.name}</span>{accent === option.id && <b>✓</b>}</button>)}</div></section>
          <form className="profile-card profile-form" onSubmit={submitProfile}><div className="profile-card-heading"><div><div className="eyebrow">INFORMACIÓN PERSONAL</div><h2>Datos de tu cuenta</h2><p>Actualiza tu correo, contraseña o foto de perfil.</p></div></div><div className="profile-photo-row"><div className="profile-photo-preview">{profilePhotoPreview ? <img src={profilePhotoPreview} alt="Vista previa del perfil" /> : user.profile_photo_url ? <img src={assetUrl(user.profile_photo_url)} alt="Foto de perfil" /> : <span>{user.name.charAt(0).toUpperCase()}</span>}</div><label className="profile-photo-control">Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setProfilePhoto(file); setProfilePhotoPreview(file ? URL.createObjectURL(file) : '') }} /><small>JPG, PNG o WebP · máximo 5 MB</small></label></div><div className="profile-fields"><label>Correo electrónico<input type="email" required maxLength="255" autoComplete="email" value={profileForm.email || user.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label><div className="profile-password-divider"><span>Cambiar contraseña</span><small>Déjalo vacío si no deseas cambiarla.</small></div><label>Contraseña actual<input type="password" autoComplete="current-password" value={profileForm.current_password} onChange={(event) => setProfileForm({ ...profileForm, current_password: event.target.value })} /></label><label>Nueva contraseña<input type="password" minLength="8" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={profileForm.password} onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })} /></label><label>Confirmar nueva contraseña<input type="password" minLength="8" autoComplete="new-password" value={profileForm.password_confirmation} onChange={(event) => setProfileForm({ ...profileForm, password_confirmation: event.target.value })} /></label></div><div className="profile-form-actions"><small>Para cambiar la contraseña, ingresa primero la contraseña actual.</small><button className="primary-button" disabled={profileSaving}>{profileSaving ? 'Guardando cambios…' : 'Guardar cambios'} <span>→</span></button></div></form>
        </> : <>
          <section className="page-heading goals-page-heading"><div><div className="eyebrow">SUEÑOS CON UN PLAN</div><h1>Mis metas<span className="brand-dot">.</span></h1><p>Define tu objetivo y avanza con cuotas realistas según tu ingreso.</p></div><button className="primary-button create-goal-button" onClick={() => { setShowGoalForm(!showGoalForm); setError('') }}>{showGoalForm ? 'Cerrar' : '+ Nueva meta'}</button></section>
          <section className="savings-capacity-card"><span className="capacity-icon">↗</span><div><small>CUOTA MENSUAL DISPONIBLE · 20% DE TUS INGRESOS DEL MES</small><strong>{currency(goalsInfo.savings_capacity)}</strong><span>Ingreso registrado este mes: {currency(goalsInfo.monthly_income)}</span></div></section>
          {(error || notice) && <div className={`flash ${error ? 'flash-error' : 'flash-success'}`} role="status">{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Cerrar">×</button></div>}
          {showGoalForm && <section className="goal-form-card"><div className="goal-form-heading"><div><div className="eyebrow">NUEVO OBJETIVO</div><h2>¿Qué quieres lograr?</h2></div><span className="round-plus">◎</span></div><form className="goal-form" onSubmit={submitGoal}><div className="goal-form-grid"><label>Nombre de la meta<input required maxLength="120" placeholder="Ej. Viaje a Cartagena, computador..." value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} /></label><label>¿Cuánto necesitas?<input required type="number" min="1" step="0.01" placeholder="$ 0" value={goalForm.target_amount} onChange={(event) => setGoalForm({ ...goalForm, target_amount: event.target.value })} /></label><label>¿En cuánto tiempo?<span className="goal-term-input"><input required type="number" min="1" max={maxGoalTerm} value={goalForm.term_value} onChange={(event) => setGoalForm({ ...goalForm, term_value: event.target.value })} /><select value={goalForm.term_unit} onChange={(event) => setGoalForm({ ...goalForm, term_unit: event.target.value, term_value: event.target.value === 'year' ? 1 : 6 })}><option value="month">Meses</option><option value="year">Años</option></select></span></label><label className="photo-field">Foto de inspiración<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setGoalPhoto(file); setPhotoPreview(file ? URL.createObjectURL(file) : '') }} /><small>JPG, PNG o WebP · máximo 5 MB</small>{photoPreview && <img className="goal-inline-preview" src={photoPreview} alt="Vista previa de la foto de la meta" />}</label></div>
            {suggestedInstallment > 0 && <div className="installment-analysis"><div><small>CUOTA MENSUAL SUGERIDA</small><strong>{currency(suggestedInstallment)}</strong></div><div><small>CAPACIDAD DE AHORRO</small><strong>{currency(goalsInfo.savings_capacity)}</strong></div><p className={canAffordGoal ? 'analysis-feasible' : 'analysis-tight'}>{goalsInfo.monthly_income <= 0 ? 'Registra tus ingresos de este mes para calcular si la cuota cabe en tu 20% de ahorro.' : canAffordGoal ? 'Este plazo cabe dentro de tu presupuesto de ahorro mensual.' : 'Con tu ingreso actual, la cuota supera el 20% de ahorro. Prueba con un plazo más largo.'}</p></div>}
            <button className="primary-button goal-submit" disabled={goalSaving}>{goalSaving ? 'Guardando meta…' : 'Crear mi meta'} <span>→</span></button></form>
          </section>}
          <section className="goals-grid">{goals.map((goal) => <article className={`goal-card ${goal.is_complete ? 'goal-complete' : ''}`} key={goal.id}>
            <div className="goal-cover">{goal.photo_url ? <img src={`${API_ORIGIN}${goal.photo_url}`} alt={`Inspiración para ${goal.name}`} /> : <div className="goal-cover-placeholder">◎</div>}<span className="goal-period-pill">{goal.term_unit === 'year' ? 'ANUAL' : 'MENSUAL'}</span>{goal.is_complete && <span className="goal-achieved-pill">✓ Meta cumplida</span>}</div>
            <div className="goal-card-body"><div className="goal-card-title"><h2>{goal.name}</h2><span>{goal.term_value} {goal.term_unit === 'year' ? (goal.term_value === 1 ? 'año' : 'años') : (goal.term_value === 1 ? 'mes' : 'meses')}</span></div><div className="goal-amounts"><strong>{currency(goal.saved_amount)} <small>ahorrado</small></strong><span>Meta {currency(goal.target_amount)}</span></div><div className="goal-progress-track"><span style={{ width: `${goal.progress}%` }} /></div><div className="goal-progress-caption"><span>{goal.progress}% completado</span><strong>Falta {currency(goal.remaining_amount)}</strong></div>
              <div className="goal-analysis-grid"><div><small>Cuota sugerida</small><strong>{currency(goal.monthly_installment)}<small>/mes</small></strong></div><div><small>Proyección al ritmo de cuota</small><strong>{new Intl.DateTimeFormat('es-CO',{month:'short',year:'numeric'}).format(new Date(`${goal.estimated_finish_date}T12:00:00`))}</strong></div></div><div className="goal-target-date">Fecha objetivo: {new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(new Date(`${goal.target_date}T12:00:00`))}</div>
              <div className={`goal-feasibility ${goal.on_track ? 'is-feasible' : 'needs-adjustment'}`}>{goal.on_track ? `La cuota cabe en tu ahorro mensual de ${currency(goalsInfo.savings_capacity)}.` : 'La cuota supera tu capacidad de ahorro actual del 20%.'}</div>
              {goal.is_complete ? <div className="goal-congratulations"><strong>¡Lo lograste!</strong><span>Tu disciplina te trajo hasta aquí. ¿Cuál será tu siguiente sueño?</span><button onClick={() => { setShowGoalForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Crear otra meta <span>→</span></button></div> : <form className="contribution-form" onSubmit={(event) => contributeToGoal(event, goal)}><label>Agregar dinero a esta meta<input required type="number" min="0.01" step="0.01" max={goal.remaining_amount} placeholder={`Cuota sugerida ${currency(goal.monthly_installment)}`} value={contributionAmounts[goal.id] ?? ''} onChange={(event) => setContributionAmounts({ ...contributionAmounts, [goal.id]: event.target.value })} /></label><button disabled={contributingId === goal.id}>{contributingId === goal.id ? 'Guardando…' : 'Agregar aporte'} <span>+</span></button></form>}
            </div>
          </article>)}{!goalsLoading && goals.length === 0 && !showGoalForm && <div className="goals-empty"><div>◎</div><h2>Tu próxima meta empieza aquí</h2><p>Agrega una foto y un plazo. Calcularemos una cuota mensual con base en tu ingreso y tu presupuesto de ahorro.</p><button className="primary-button" onClick={() => setShowGoalForm(true)}>Crear mi primera meta <span>→</span></button></div>}</section>
          {goalsLoading && <div className="goals-loading">Cargando tus metas…</div>}
        </>}
        <footer>Hecho para que cada peso tenga un propósito. <span>balance<span className="brand-dot">.</span></span></footer>
      </div>
      {view === 'accounts' && selectedAccount && <div className="account-modal-backdrop" onClick={() => setSelectedAccountId(null)}><section className={`account-modal account-brand-${accountBrand(selectedAccount.name)}`} role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onClick={(event) => event.stopPropagation()}><div className="account-modal-top"><div className="account-modal-brand"><span className="account-brand-mark">{selectedAccount.type === 'credit' ? '▣' : selectedAccount.type === 'wallet' ? '◈' : '▤'}</span><div><span className="account-modal-kicker">DETALLE DE LA CUENTA</span><h2 id="account-modal-title">{selectedAccount.name}</h2></div></div><button className="account-modal-close" onClick={() => setSelectedAccountId(null)} aria-label="Cerrar detalle">×</button></div><div className="account-modal-balance"><span>Saldo actual</span><strong>{currency(selectedAccount.balance)}</strong><small>{{ bank: 'Cuenta bancaria', credit: 'Tarjeta de crédito', wallet: 'Billetera', other: 'Otra cuenta' }[selectedAccount.type]}</small></div><form className="account-deposit-form account-modal-deposit" onSubmit={(event) => submitDeposit(event, selectedAccount)}><div className="account-form-caption">Agregar ingreso a esta cuenta</div><div className="account-deposit-fields"><input aria-label="Monto del ingreso" required type="number" min="0.01" step="0.01" placeholder="Monto $" value={(depositForms[selectedAccount.id] || {}).amount || ''} onChange={(event) => setDepositForms({ ...depositForms, [selectedAccount.id]: { ...(depositForms[selectedAccount.id] || { date: today() }), amount: event.target.value } })} /><input aria-label="Concepto del ingreso" maxLength="120" placeholder="Concepto" value={(depositForms[selectedAccount.id] || {}).description || ''} onChange={(event) => setDepositForms({ ...depositForms, [selectedAccount.id]: { ...(depositForms[selectedAccount.id] || { date: today() }), description: event.target.value } })} /><input aria-label="Fecha del ingreso" required type="date" value={(depositForms[selectedAccount.id] || {}).date || today()} onChange={(event) => setDepositForms({ ...depositForms, [selectedAccount.id]: { ...(depositForms[selectedAccount.id] || {}), date: event.target.value } })} /><button disabled={depositingId === selectedAccount.id} aria-label="Guardar ingreso">{depositingId === selectedAccount.id ? '…' : '+'}</button></div></form><div className="account-history-heading"><strong>Historial de movimientos</strong><span>{selectedAccount.transactions.length} {selectedAccount.transactions.length === 1 ? 'registro' : 'registros'}</span></div>{selectedAccount.transactions.length ? <div className="account-history account-modal-history">{selectedAccount.transactions.map((transaction) => <div className="account-transaction" key={transaction.id}><div><strong>{transaction.description}</strong><small>{dateTime(transaction.transacted_at)} · {transaction.type === 'opening_balance' ? 'Saldo inicial' : 'Ingreso'}</small></div><b>+ {currency(transaction.amount)}</b></div>)}</div> : <p className="account-history-empty">Aún no hay movimientos. Agrega el primer ingreso arriba.</p>}</section></div>}
      {loading && <div className="loading-indicator">Actualizando balance…</div>}
      {statisticsLoading && view === 'statistics' && <div className="loading-indicator">Cargando estadísticas…</div>}
    </main>
  </div>
}

export default App
