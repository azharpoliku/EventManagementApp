import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const DEMO_USERNAME = 'admin'
const DEMO_PASSWORD = 'admin123'
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbx38mptLGJUQhwcJRWBGEjUYqAEK3ts0dKM2UIewZ4WRtJQx0Y9jWRRJzkNdzCXvdhhMg/exec'
const STORAGE_KEYS = {
  users: 'eventManagement_users',
  events: 'eventManagement_events',
  participants: 'eventManagement_participants',
  registrations: 'eventManagement_registrations',
  attendance: 'eventManagement_attendance',
  auth: 'eventManagement_auth',
}
const AUTH_STORAGE_KEY = STORAGE_KEYS.auth

function readCollection(key) {
  try {
    const stored = localStorage.getItem(key)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readDashboardData() {
  return {
    events: readCollection(STORAGE_KEYS.events),
    participants: readCollection(STORAGE_KEYS.participants),
    registrations: readCollection(STORAGE_KEYS.registrations),
    attendance: readCollection(STORAGE_KEYS.attendance),
  }
}

const ENTITY_KEYS = {
  events: STORAGE_KEYS.events,
  participants: STORAGE_KEYS.participants,
  registrations: STORAGE_KEYS.registrations,
  attendance: STORAGE_KEYS.attendance,
}

function mapRemoteRecord(entity, record) {
  if (entity === 'events') return {
    id: record.eventId,
    name: record.eventName,
    description: record.description || '',
    date: normalizeSheetDate(record.date),
    time: normalizeSheetTime(record.time),
    location: record.location || '',
    organizer: record.organizer || '',
    capacity: Number(record.capacity || 0),
    status: record.status || 'Upcoming',
  }
  if (entity === 'participants') return {
    id: record.participantId,
    name: record.name,
    email: record.email,
    phone: record.phone == null ? '' : String(record.phone),
    organisation: record.organisation,
  }
  if (entity === 'registrations') return {
    id: record.registrationId,
    eventId: record.eventId,
    participantId: record.participantId,
    registrationDate: record.registrationDate || '',
    status: record.status || 'Registered',
  }
  return {
    id: record.attendanceId,
    registrationId: record.registrationId || '',
    eventId: record.eventId,
    participantId: record.participantId,
    status: record.status || '',
    markedAt: record.markedAt || '',
  }
}

function normalizeSheetDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

function normalizeSheetTime(value) {
  if (!value) return ''
  const text = String(value)
  const isoTime = text.match(/T(\d{2}:\d{2})/)
  return isoTime ? isoTime[1] : text.slice(0, 5)
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[()\s-]/g, '')
}

function isValidInternationalPhone(value) {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

function mapLocalRecord(entity, record) {
  if (entity === 'events') return {
    eventId: record.id,
    eventName: record.name,
    description: record.description || '',
    date: record.date || '',
    time: record.time || '',
    location: record.location || '',
    organizer: record.organizer || '',
    capacity: Number(record.capacity || 0),
    status: record.status || 'Upcoming',
  }
  if (entity === 'participants') return {
    participantId: record.id,
    name: record.name,
    email: record.email,
    phone: normalizePhone(record.phone),
    organisation: record.organisation || '',
  }
  if (entity === 'registrations') return {
    registrationId: record.id,
    eventId: record.eventId,
    participantId: record.participantId,
    registrationDate: record.registrationDate || '',
    status: record.status || 'Registered',
  }
  return {
    attendanceId: record.id,
    eventId: record.eventId,
    participantId: record.participantId,
    status: record.status || '',
  }
}

async function fetchRemoteCollection(entity) {
  const payload = await requestJsonp({ entity })
  if (!payload.ok || !Array.isArray(payload.data)) throw new Error(`${entity} API returned an invalid response.`)
  return payload.data.map((record) => mapRemoteRecord(entity, record))
}

async function sendEntityRequest(action, entity, record) {
  const payload = await requestJsonp({ action, entity, record: JSON.stringify(mapLocalRecord(entity, record)) })
  if (!payload.ok) throw new Error(payload.error?.message || `${entity} API request failed.`)
  return payload.data
}

async function syncCollection(entity) {
  const remoteRecords = await fetchRemoteCollection(entity)
  const localRecords = readCollection(ENTITY_KEYS[entity])
  if (remoteRecords.length === 0 && localRecords.length > 0) {
    for (const record of localRecords) await sendEntityRequest('create', entity, record)
    return localRecords
  }
  localStorage.setItem(ENTITY_KEYS[entity], JSON.stringify(remoteRecords))
  return remoteRecords
}

function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([{ id: 'user-1', username: DEMO_USERNAME, password: DEMO_PASSWORD, name: 'Administrator' }]))
  }
}

async function fetchRemoteParticipants() {
  return syncCollection('participants')
}

async function sendParticipantRequest(action, record) {
  return sendEntityRequest(action, 'participants', record)
}

function requestJsonp(params) {
  return new Promise((resolve, reject) => {
    const callbackName = `emsJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const query = new URLSearchParams({ ...params, callback: callbackName })
    const cleanup = () => {
      delete window[callbackName]
      script.remove()
    }
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Google Sheets API request timed out.'))
    }, 30000)
    window[callbackName] = (payload) => {
      window.clearTimeout(timeout)
      cleanup()
      resolve(payload)
    }
    script.onerror = () => {
      window.clearTimeout(timeout)
      cleanup()
      reject(new Error('Google Sheets API request failed.'))
    }
    script.src = `${GOOGLE_SHEETS_API_URL}?${query.toString()}`
    document.body.appendChild(script)
  })
}

function readAuthState() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    return stored ? JSON.parse(stored) : { isAuthenticated: false, userId: null, loginTime: null }
  } catch {
    return { isAuthenticated: false, userId: null, loginTime: null }
  }
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (username.trim() !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      setError('Invalid username or password.')
      return
    }

    const authState = {
      isAuthenticated: true,
      userId: 'user-1',
      loginTime: new Date().toISOString(),
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
    onLogin(authState)
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Event Management System</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="muted">Sign in to manage your events and participants.</p>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="username">Username</label>
          <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit">Log in</button>
        </form>
        <p className="demo-hint">Demo: <strong>admin</strong> / <strong>admin123</strong></p>
      </section>
    </main>
  )
}

function Dashboard({ data }) {
  const dashboard = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const upcomingEvents = data.events
      .filter((event) => event.status === 'Upcoming' && event.date >= today)
      .sort((first, second) => `${first.date}T${first.time || ''}`.localeCompare(`${second.date}T${second.time || ''}`))
    const presentCount = data.attendance.filter((record) => record.status === 'Present').length
    const attendanceRate = data.registrations.length === 0
      ? 0
      : Math.round((presentCount / data.registrations.length) * 100)
    const recentRegistrations = [...data.registrations]
      .sort((first, second) => (second.registrationDate || '').localeCompare(first.registrationDate || ''))
      .slice(0, 5)

    return { upcomingEvents, recentRegistrations, attendanceRate }
  }, [data])

  const eventName = (eventId) => data.events.find((event) => event.id === eventId)?.name || 'Unknown event'
  const participantName = (participantId) => data.participants.find((participant) => participant.id === participantId)?.name || 'Unknown participant'

  return (
    <>
      <section className="stat-grid" aria-label="Dashboard statistics">
        <article className="stat-card"><span>Total Events</span><strong>{data.events.length}</strong></article>
        <article className="stat-card"><span>Upcoming Events</span><strong>{dashboard.upcomingEvents.length}</strong></article>
        <article className="stat-card"><span>Total Participants</span><strong>{data.participants.length}</strong></article>
        <article className="stat-card"><span>Total Registrations</span><strong>{data.registrations.length}</strong></article>
        <article className="stat-card"><span>Attendance Rate</span><strong>{dashboard.attendanceRate}%</strong></article>
      </section>

      <section className="dashboard-grid">
        <article className="content-panel">
          <div className="panel-heading"><h2>Upcoming Events</h2><span>{dashboard.upcomingEvents.length} event{dashboard.upcomingEvents.length === 1 ? '' : 's'}</span></div>
          {dashboard.upcomingEvents.length === 0 ? <p className="empty-state">No upcoming events have been added yet.</p> : (
            <div className="record-list">
              {dashboard.upcomingEvents.map((event) => <div className="record-row" key={event.id}><div><strong>{event.name}</strong><span>{event.date} · {event.location || 'Location not set'}</span></div><span className="status">{event.status}</span></div>)}
            </div>
          )}
        </article>
        <article className="content-panel">
          <div className="panel-heading"><h2>Recent Registrations</h2><span>Latest 5</span></div>
          {dashboard.recentRegistrations.length === 0 ? <p className="empty-state">No registrations have been added yet.</p> : (
            <div className="record-list">
              {dashboard.recentRegistrations.map((registration) => <div className="record-row" key={registration.id}><div><strong>{participantName(registration.participantId)}</strong><span>{eventName(registration.eventId)}</span></div><span>{registration.registrationDate || 'Date not set'}</span></div>)}
            </div>
          )}
        </article>
      </section>

      <section className="content-panel quick-actions">
        <div className="panel-heading"><h2>Quick Actions</h2></div>
        <div className="action-list"><button type="button" className="secondary-button">Manage Events</button><button type="button" className="secondary-button">Manage Participants</button><button type="button" className="secondary-button">New Registration</button><button type="button" className="secondary-button">Mark Attendance</button></div>
      </section>
    </>
  )
}

function EventsPage({ data }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [dateFilter, setDateFilter] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', date: '', time: '', location: '', capacity: '', status: 'Upcoming' })
  const [formMessage, setFormMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredEvents = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return [...data.events]
      .filter((event) => status === 'All' || event.status === status)
      .filter((event) => event.name?.toLowerCase().includes(searchTerm))
      .filter((event) => !dateFilter || event.date === dateFilter)
      .sort((first, second) => {
        const comparison = (first.date || '').localeCompare(second.date || '')
        return sortDirection === 'asc' ? comparison : -comparison
      })
  }, [data.events, search, status, dateFilter, sortDirection])

  const registrationCount = (eventId) => data.registrations.filter((registration) => registration.eventId === eventId).length

  async function saveEvent(submitEvent) {
    submitEvent.preventDefault()
    if (isSaving) return
    if (!form.name.trim() || !form.date || !form.capacity || Number(form.capacity) < 1) {
      setFormMessage('Enter an event name, date, and capacity of at least 1.')
      return
    }
    if (editingId && data.registrations.filter((registration) => registration.eventId === editingId).length > Number(form.capacity)) {
      setFormMessage('Capacity cannot be lower than the current registration count.')
      return
    }
    const event = { id: editingId || `event-${Date.now()}`, name: form.name.trim(), description: '', date: form.date, time: form.time, location: form.location.trim(), organizer: '', capacity: Number(form.capacity), status: form.status }
    const events = editingId ? data.events.map((item) => item.id === editingId ? { ...item, ...event } : item) : [...data.events, event]
    let storageMessage = 'Event saved to localStorage fallback.'
    setIsSaving(true)
    setFormMessage('Saving event...')
    try {
      await sendEntityRequest(editingId ? 'update' : 'create', 'events', event)
      localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events))
      storageMessage = 'Event saved to Google Sheets.'
    } catch {
      localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events))
    }
    setIsSaving(false)
    window.dispatchEvent(new Event('ems-data-updated'))
    setForm({ name: '', date: '', time: '', location: '', capacity: '', status: 'Upcoming' })
    setEditingId(null)
    setFormMessage(`${editingId ? 'Event updated successfully.' : 'Event created successfully.'} ${storageMessage}`)
  }

  function editEvent(event) { setForm(event); setEditingId(event.id); setShowCreateForm(true); setFormMessage('') }
  async function deleteEvent(event) {
    if (!window.confirm(`Delete ${event.name}? Related registrations and attendance will also be removed.`)) return
    const registrations = data.registrations.filter((registration) => registration.eventId !== event.id)
    const registrationIds = new Set(data.registrations.filter((registration) => registration.eventId === event.id).map((registration) => registration.id))
    try {
      await sendEntityRequest('delete', 'events', event)
    } catch {
      // Keep localStorage available if the remote request is unavailable.
    }
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(data.events.filter((item) => item.id !== event.id)))
    localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(registrations))
    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(data.attendance.filter((record) => !registrationIds.has(record.registrationId))))
    window.dispatchEvent(new Event('ems-data-updated'))
  }

  function clearFilters() {
    setSearch('')
    setStatus('All')
    setDateFilter('')
    setSortDirection('asc')
  }

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Management</p><h2>Events</h2></div><div className="heading-actions"><span className="muted">{filteredEvents.length} of {data.events.length} events</span><button type="button" onClick={() => setShowCreateForm((current) => !current)}>{showCreateForm ? 'Close' : 'Create Event'}</button></div></div>
      {showCreateForm && <div className="content-panel create-panel"><h3>{editingId ? 'Edit Event' : 'Create Event'}</h3><form className="create-form" onSubmit={saveEvent}><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label>Time<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Capacity<input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} required /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Draft</option><option>Upcoming</option><option>Ongoing</option><option>Completed</option><option>Cancelled</option></select></label><button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Event'}</button></form>{formMessage && <p className={formMessage.includes('successfully') ? 'success feedback' : 'error feedback'} role="alert">{formMessage}</p>}</div>}
      <div className="filters" aria-label="Event filters">
        <label className="filter-field">Search by event name<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event name" /></label>
        <label className="filter-field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Draft</option><option>Upcoming</option><option>Ongoing</option><option>Completed</option><option>Cancelled</option></select></label>
        <label className="filter-field">Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
        <button type="button" className="secondary-button sort-button" onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>Date: {sortDirection === 'asc' ? 'Oldest first' : 'Newest first'}</button>
        <button type="button" className="secondary-button sort-button" onClick={clearFilters}>Clear filters</button>
      </div>
      <div className="table-panel">
        {filteredEvents.length === 0 ? <div className="empty-state centered"><h3>No events found</h3><p>{data.events.length === 0 ? 'Events stored in localStorage will appear here.' : 'Try changing the search or status filter.'}</p></div> : (
          <div className="table-scroll"><table><thead><tr><th>Event Name</th><th>Date</th><th>Time</th><th>Location</th><th>Capacity</th><th>Status</th><th>Registrations</th><th>Actions</th></tr></thead><tbody>{filteredEvents.map((event) => <tr key={event.id}><td><strong>{event.name}</strong></td><td>{event.date || '—'}</td><td>{event.time || '—'}</td><td>{event.location || '—'}</td><td>{event.capacity ?? '—'}</td><td><span className="status">{event.status || '—'}</span></td><td>{registrationCount(event.id)}</td><td><div className="row-actions"><button type="button" className="secondary-button" onClick={() => editEvent(event)}>Edit</button><button type="button" className="danger-button" onClick={() => deleteEvent(event)}>Delete</button></div></td></tr>)}</tbody></table></div>
        )}
      </div>
    </section>
  )
}

function ParticipantsPage({ data }) {
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', organisation: '' })
  const [formMessage, setFormMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredParticipants = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return data.participants.filter((participant) => [participant.name, participant.email, participant.phone, participant.organisation]
      .some((value) => value?.toLowerCase().includes(searchTerm)))
  }, [data.participants, search])

  const registrationCount = (participantId) => data.registrations.filter((registration) => registration.participantId === participantId).length

  async function saveParticipant(submitEvent) {
    submitEvent.preventDefault()
    if (isSaving) return
    const email = form.email.trim().toLowerCase()
    if (!form.name.trim() || !email || !email.includes('@')) {
      setFormMessage('Enter a name and a valid email address.')
      return
    }
    if (data.participants.some((participant) => participant.id !== editingId && participant.email.toLowerCase() === email)) {
      setFormMessage('Participant email must be unique.')
      return
    }
    const phone = normalizePhone(form.phone)
    if (!isValidInternationalPhone(phone)) {
      setFormMessage('Enter a phone number with country code, e.g. +60123456789.')
      return
    }
    const participant = { id: editingId || `participant-${Date.now()}`, name: form.name.trim(), email, phone, organisation: form.organisation.trim() }
    const participants = editingId ? data.participants.map((item) => item.id === editingId ? participant : item) : [...data.participants, participant]
    let storageMessage = 'Participant saved to localStorage fallback.'
    setIsSaving(true)
    setFormMessage('Saving participant...')
    try {
      await sendParticipantRequest(editingId ? 'update' : 'create', participant)
      localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants))
      storageMessage = 'Participant saved to Google Sheets.'
    } catch {
      localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants))
    }
    setIsSaving(false)
    window.dispatchEvent(new Event('ems-data-updated'))
    setForm({ name: '', email: '', phone: '', organisation: '' })
    setEditingId(null)
    setFormMessage(`${editingId ? 'Participant updated successfully.' : 'Participant created successfully.'} ${storageMessage}`)
  }

  function editParticipant(participant) { setForm(participant); setEditingId(participant.id); setShowCreateForm(true); setFormMessage('') }
  async function deleteParticipant(participant) {
    if (!window.confirm(`Delete ${participant.name}? Related registrations and attendance will also be removed.`)) return
    const participantRegistrationIds = new Set(data.registrations.filter((registration) => registration.participantId === participant.id).map((registration) => registration.id))
    try {
      await sendParticipantRequest('delete', participant)
      localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(data.participants.filter((item) => item.id !== participant.id)))
      localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(data.registrations.filter((registration) => registration.participantId !== participant.id)))
      localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(data.attendance.filter((record) => !participantRegistrationIds.has(record.registrationId))))
    } catch {
      localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(data.participants.filter((item) => item.id !== participant.id)))
      localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(data.registrations.filter((registration) => registration.participantId !== participant.id)))
      localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(data.attendance.filter((record) => !participantRegistrationIds.has(record.registrationId))))
    }
    window.dispatchEvent(new Event('ems-data-updated'))
  }

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Management</p><h2>Participants</h2></div><div className="heading-actions"><span className="muted">{filteredParticipants.length} of {data.participants.length} participants</span><button type="button" onClick={() => setShowCreateForm((current) => !current)}>{showCreateForm ? 'Close' : 'Add Participant'}</button></div></div>
      {showCreateForm && <div className="content-panel create-panel"><h3>{editingId ? 'Edit Participant' : 'Add Participant'}</h3><form className="create-form" onSubmit={saveParticipant}><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Phone<input type="tel" inputMode="tel" placeholder="+60 12-345 6789" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required aria-describedby="participant-phone-help" /><span id="participant-phone-help" className="field-help">Use international format, for example +60123456789.</span></label><label>Organisation<input value={form.organisation} onChange={(event) => setForm({ ...form, organisation: event.target.value })} /></label><button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Participant'}</button></form>{formMessage && <p className={formMessage.includes('successfully') ? 'success feedback' : 'error feedback'} role="alert">{formMessage}</p>}</div>}
      <div className="filters" aria-label="Participant filters">
        <label className="filter-field">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search participants" /></label>
      </div>
      <div className="table-panel">
        {filteredParticipants.length === 0 ? <div className="empty-state centered"><h3>No participants found</h3><p>{data.participants.length === 0 ? 'Participants stored in localStorage will appear here.' : 'Try a different search term.'}</p></div> : (
          <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Organisation</th><th>Registrations</th><th>Actions</th></tr></thead><tbody>{filteredParticipants.map((participant) => <tr key={participant.id}><td><strong>{participant.name}</strong></td><td>{participant.email || '—'}</td><td>{participant.phone || '—'}</td><td>{participant.organisation || '—'}</td><td>{registrationCount(participant.id)}</td><td><div className="row-actions"><button type="button" className="secondary-button" onClick={() => editParticipant(participant)}>Edit</button><button type="button" className="danger-button" onClick={() => deleteParticipant(participant)}>Delete</button></div></td></tr>)}</tbody></table></div>
        )}
      </div>
    </section>
  )
}

function RegistrationsPage({ data }) {
  const [eventId, setEventId] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    if (isSaving) return
    const selectedEvent = data.events.find((event) => event.id === eventId)
    const selectedParticipant = data.participants.find((participant) => participant.id === participantId)

    if (!selectedEvent) {
      setMessage({ type: 'error', text: 'Please select an existing event.' })
      return
    }
    if (!selectedParticipant) {
      setMessage({ type: 'error', text: 'Please select an existing participant.' })
      return
    }
    const duplicate = data.registrations.some((registration) => registration.eventId === eventId && registration.participantId === participantId)
    if (duplicate) {
      setMessage({ type: 'error', text: 'This participant is already registered for the selected event.' })
      return
    }
    const registrationCount = data.registrations.filter((registration) => registration.eventId === eventId).length
    if (registrationCount >= Number(selectedEvent.capacity)) {
      setMessage({ type: 'error', text: 'This event has reached its capacity.' })
      return
    }

    const registration = {
      id: `registration-${Date.now()}`,
      eventId,
      participantId,
      registrationDate: new Date().toISOString(),
      status: 'Registered',
    }
    const updatedRegistrations = [...data.registrations, registration]
    let storageMessage = 'Registration saved to localStorage fallback.'
    setIsSaving(true)
    setMessage({ type: 'status', text: 'Saving registration...' })
    try {
      await sendEntityRequest('create', 'registrations', registration)
      localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(updatedRegistrations))
      storageMessage = 'Registration saved to Google Sheets.'
    } catch {
      localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(updatedRegistrations))
    }
    setIsSaving(false)
    window.dispatchEvent(new Event('ems-data-updated'))
    setEventId('')
    setParticipantId('')
    setMessage({ type: 'success', text: `${selectedParticipant.name} was registered for ${selectedEvent.name}. ${storageMessage}` })
  }

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Management</p><h2>Registrations</h2></div></div>
      <div className="content-panel registration-panel">
        <h3>Register a participant</h3>
        <p className="muted">Choose an event and participant to create a registration.</p>
        <form className="registration-form" onSubmit={handleSubmit}>
          <label className="filter-field">Event<select value={eventId} onChange={(event) => { setEventId(event.target.value); setMessage({ type: '', text: '' }) }}><option value="">Select an event</option>{data.events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.date || 'No date'}</option>)}</select></label>
          <label className="filter-field">Participant<select value={participantId} onChange={(event) => { setParticipantId(event.target.value); setMessage({ type: '', text: '' }) }}><option value="">Select a participant</option>{data.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name} · {participant.email}</option>)}</select></label>
          <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create Registration'}</button>
        </form>
        {message.text && <p className={message.type === 'error' ? 'error feedback' : 'success feedback'} role="alert">{message.text}</p>}
        {(data.events.length === 0 || data.participants.length === 0) && <p className="empty-state">Add at least one event and one participant before creating a registration.</p>}
      </div>
    </section>
  )
}

function AttendancePage({ data }) {
  const [eventId, setEventId] = useState('')
  const [savingAttendanceId, setSavingAttendanceId] = useState(null)
  const [message, setMessage] = useState('')
  const selectedRegistrations = data.registrations.filter((registration) => registration.eventId === eventId)
  const selectedEvent = data.events.find((event) => event.id === eventId)

  function getAttendance(registrationId) {
    return data.attendance.find((record) => record.registrationId === registrationId)?.status || ''
  }

  async function markAttendance(registration, status) {
    if (savingAttendanceId === registration.id) return
    const existingRecord = data.attendance.find((record) => record.registrationId === registration.id)
    const attendanceRecord = {
      id: existingRecord?.id || `attendance-${Date.now()}-${registration.id}`,
      registrationId: registration.id,
      eventId: registration.eventId,
      participantId: registration.participantId,
      status,
      markedAt: new Date().toISOString(),
    }
    const updatedAttendance = existingRecord
      ? data.attendance.map((record) => record.id === existingRecord.id ? attendanceRecord : record)
      : [...data.attendance, attendanceRecord]
    setSavingAttendanceId(registration.id)
    setMessage('Saving attendance...')
    try {
      await sendEntityRequest(existingRecord ? 'update' : 'create', 'attendance', attendanceRecord)
      localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(updatedAttendance))
      setMessage('Attendance saved to Google Sheets.')
    } catch {
      localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(updatedAttendance))
      setMessage('Attendance saved to localStorage fallback.')
    }
    setSavingAttendanceId(null)
    window.dispatchEvent(new Event('ems-data-updated'))
  }

  const presentCount = selectedRegistrations.filter((registration) => getAttendance(registration.id) === 'Present').length
  const absentCount = selectedRegistrations.filter((registration) => getAttendance(registration.id) === 'Absent').length

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">Management</p><h2>Attendance</h2></div></div>
      <div className="content-panel attendance-panel">
        <label className="filter-field">Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">Select an event</option>{data.events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.date || 'No date'}</option>)}</select></label>
        {selectedEvent && <div className="attendance-summary"><span>Registered: <strong>{selectedRegistrations.length}</strong></span><span>Present: <strong>{presentCount}</strong></span><span>Absent: <strong>{absentCount}</strong></span></div>}
        {message && <p className="success feedback" role="status">{message}</p>}
      </div>
      {eventId && selectedRegistrations.length === 0 && <div className="content-panel centered"><h3>No registered participants</h3><p className="muted">Only participants registered for this event can be marked for attendance.</p></div>}
      {eventId && selectedRegistrations.length > 0 && <div className="table-panel attendance-table"><div className="table-scroll"><table><thead><tr><th>Participant</th><th>Email</th><th>Attendance</th></tr></thead><tbody>{selectedRegistrations.map((registration) => { const participant = data.participants.find((item) => item.id === registration.participantId); const currentStatus = getAttendance(registration.id); const isSaving = savingAttendanceId === registration.id; return <tr key={registration.id}><td><strong>{participant?.name || 'Unknown participant'}</strong></td><td>{participant?.email || '—'}</td><td><div className="attendance-actions"><button type="button" disabled={isSaving} className={currentStatus === 'Present' ? 'attendance-selected' : 'secondary-button'} onClick={() => markAttendance(registration, 'Present')}>{isSaving ? 'Saving...' : 'Present'}</button><button type="button" disabled={isSaving} className={currentStatus === 'Absent' ? 'attendance-selected absent-selected' : 'secondary-button'} onClick={() => markAttendance(registration, 'Absent')}>Absent</button></div></td></tr> })}</tbody></table></div></div>}
      {!eventId && <div className="content-panel centered"><h3>Select an event</h3><p className="muted">Choose an event to view its registered participants.</p></div>}
    </section>
  )
}

function ProtectedApp({ onLogout }) {
  const [data, setData] = useState(readDashboardData)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    const refreshData = () => setData(readDashboardData())
    window.addEventListener('storage', refreshData)
    window.addEventListener('ems-data-updated', refreshData)
    return () => {
      window.removeEventListener('storage', refreshData)
      window.removeEventListener('ems-data-updated', refreshData)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all(Object.keys(ENTITY_KEYS).map((entity) => syncCollection(entity).catch(() => readCollection(ENTITY_KEYS[entity]))))
      .then(([events, participants, registrations, attendance]) => {
        if (!active) return
        const normalizedAttendance = attendance.map((record) => ({
          ...record,
          registrationId: record.registrationId || registrations.find((registration) => registration.eventId === record.eventId && registration.participantId === record.participantId)?.id || '',
        }))
        localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(normalizedAttendance))
        setData({ events, participants, registrations, attendance: normalizedAttendance })
      })
      .catch(() => {
        // Keep the existing localStorage data as the temporary fallback.
      })
    return () => { active = false }
  }, [])

  return (
    <main className="app-layout">
      <header className="app-header">
        <div>
          <p className="eyebrow">Event Management System</p>
          <h1>Dashboard</h1>
        </div>
        <button className="secondary-button" onClick={onLogout}>Log out</button>
      </header>
      <nav className="app-nav" aria-label="Primary navigation"><button type="button" className={page === 'dashboard' ? 'nav-active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button><button type="button" className={page === 'events' ? 'nav-active' : ''} onClick={() => setPage('events')}>Events</button><button type="button" className={page === 'participants' ? 'nav-active' : ''} onClick={() => setPage('participants')}>Participants</button><button type="button" className={page === 'registrations' ? 'nav-active' : ''} onClick={() => setPage('registrations')}>Registrations</button><button type="button" className={page === 'attendance' ? 'nav-active' : ''} onClick={() => setPage('attendance')}>Attendance</button></nav>
      {page === 'events' ? <EventsPage data={data} /> : page === 'participants' ? <ParticipantsPage data={data} /> : page === 'registrations' ? <RegistrationsPage data={data} /> : page === 'attendance' ? <AttendancePage data={data} /> : <Dashboard data={data} />}
    </main>
  )
}

function App() {
  initializeStorage()
  const [authState, setAuthState] = useState(readAuthState)

  function handleLogout() {
    const loggedOutState = { isAuthenticated: false, userId: null, loginTime: null }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedOutState))
    setAuthState(loggedOutState)
  }

  return authState.isAuthenticated
    ? <ProtectedApp onLogout={handleLogout} />
    : <LoginPage onLogin={setAuthState} />
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
