const SPREADSHEET_ID = '1aun7iNLA-ygW7zwQnTudJYMJfaTlDvAor647juvN_yw'

const SHEETS = {
  users: { name: 'Users', id: 'userId' },
  events: { name: 'Events', id: 'eventId' },
  participants: { name: 'Participants', id: 'participantId' },
  registrations: { name: 'Registrations', id: 'registrationId' },
  attendance: { name: 'Attendance', id: 'attendanceId' },
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {}
  const payload = handleRequest_(params.action || 'read', params.entity, parseRecord_(params.record))
  return respond_(payload, params.callback)
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}')
    return respond_(handleRequest_(body.action, body.entity, body.record), null)
  } catch (error) {
    return respond_(failure_('INVALID_REQUEST', error.message), null)
  }
}

function handleRequest_(action, entity, record) {
  try {
    if (!SHEETS[entity]) return failure_('INVALID_ENTITY', 'Unknown entity.')
    if (action === 'read') return success_(readRecords_(entity))
    if (action === 'create') return success_({ id: createRecord_(entity, record) })
    if (action === 'update') return success_({ id: updateRecord_(entity, record) })
    if (action === 'delete') return success_({ id: deleteRecord_(entity, record) })
    return failure_('INVALID_ACTION', 'Unknown action.')
  } catch (error) {
    return failure_(error.code || 'REQUEST_FAILED', error.message)
  }
}

function readRecords_(entity) {
  const sheet = sheet_(entity)
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return []
  const headers = values[0].map(String)
  return values.slice(1).filter(row => row.some(value => value !== '')).map(row => {
    const record = {}
    headers.forEach((header, index) => record[header] = row[index] === undefined ? '' : row[index])
    return record
  })
}

function createRecord_(entity, record) {
  validate_(entity, record, false)
  const id = String(record[SHEETS[entity].id] || Utilities.getUuid())
  if (readRecords_(entity).some(item => String(item[SHEETS[entity].id]) === id)) throw error_('DUPLICATE_ID', 'This ID already exists.')
  const headers = sheet_(entity).getRange(1, 1, 1, sheet_(entity).getLastColumn()).getValues()[0]
  sheet_(entity).appendRow(headers.map(header => header === SHEETS[entity].id ? id : record[header] ?? ''))
  return id
}

function updateRecord_(entity, record) {
  validate_(entity, record, true)
  const idKey = SHEETS[entity].id
  const id = String(record[idKey] || '')
  const sheet = sheet_(entity)
  const values = sheet.getDataRange().getValues()
  const headers = values[0].map(String)
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[headers.indexOf(idKey)]) === id)
  if (rowIndex < 1) throw error_('NOT_FOUND', 'Record not found.')
  sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([headers.map(header => record[header] ?? '')])
  return id
}

function deleteRecord_(entity, record) {
  const idKey = SHEETS[entity].id
  const id = String(record && (record[idKey] || record.id) || '')
  if (!id) throw error_('INVALID_ID', 'A record ID is required.')
  const sheet = sheet_(entity)
  const values = sheet.getDataRange().getValues()
  const headers = values[0].map(String)
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[headers.indexOf(idKey)]) === id)
  if (rowIndex < 1) throw error_('NOT_FOUND', 'Record not found.')
  sheet.deleteRow(rowIndex + 1)
  if (entity === 'events') {
    deleteMatchingRows_('registrations', 'eventId', id)
    deleteMatchingRows_('attendance', 'eventId', id)
  }
  if (entity === 'participants') {
    deleteMatchingRows_('registrations', 'participantId', id)
    deleteMatchingRows_('attendance', 'participantId', id)
  }
  return id
}

function validate_(entity, record, updating) {
  if (!record || typeof record !== 'object') throw error_('INVALID_RECORD', 'A record is required.')
  const idKey = SHEETS[entity].id
  if (updating && !record[idKey]) throw error_('INVALID_ID', 'A record ID is required.')
  if (entity === 'participants') {
    if (!record.name || !record.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(record.email))) throw error_('INVALID_EMAIL', 'A valid participant email is required.')
    const duplicate = readRecords_(entity).some(item => String(item.email).toLowerCase() === String(record.email).toLowerCase() && String(item[idKey]) !== String(record[idKey] || ''))
    if (duplicate) throw error_('DUPLICATE_EMAIL', 'Participant email must be unique.')
  }
  if (entity === 'registrations') {
    const records = readRecords_(entity)
    if (!record.eventId || !record.participantId) throw error_('INVALID_REFERENCE', 'Event and participant are required.')
    if (!readRecords_('events').some(item => String(item.eventId) === String(record.eventId))) throw error_('INVALID_EVENT', 'Event does not exist.')
    if (!readRecords_('participants').some(item => String(item.participantId) === String(record.participantId))) throw error_('INVALID_PARTICIPANT', 'Participant does not exist.')
    if (records.some(item => String(item.eventId) === String(record.eventId) && String(item.participantId) === String(record.participantId) && String(item.registrationId) !== String(record.registrationId || ''))) throw error_('DUPLICATE_REGISTRATION', 'Duplicate registration is not allowed.')
    const event = readRecords_('events').find(item => String(item.eventId) === String(record.eventId))
    const count = records.filter(item => String(item.eventId) === String(record.eventId) && String(item.registrationId) !== String(record.registrationId || '')).length
    if (Number(event.capacity) > 0 && count >= Number(event.capacity)) throw error_('CAPACITY_FULL', 'Event capacity has been reached.')
  }
  if (entity === 'attendance') {
    if (!record.eventId || !record.participantId || !record.status) throw error_('INVALID_ATTENDANCE', 'Event, participant and attendance status are required.')
    if (!readRecords_('events').some(item => String(item.eventId) === String(record.eventId))) throw error_('INVALID_EVENT', 'Event does not exist.')
    if (!readRecords_('participants').some(item => String(item.participantId) === String(record.participantId))) throw error_('INVALID_PARTICIPANT', 'Participant does not exist.')
    const registered = readRecords_('registrations').some(item => String(item.eventId) === String(record.eventId) && String(item.participantId) === String(record.participantId))
    if (!registered) throw error_('INVALID_REGISTRATION', 'Attendance requires a valid registration.')
    if (!['Present', 'Absent'].includes(String(record.status))) throw error_('INVALID_ATTENDANCE', 'Attendance status must be Present or Absent.')
  }
}

function deleteMatchingRows_(entity, field, value) {
  const sheet = sheet_(entity)
  const values = sheet.getDataRange().getValues()
  if (values.length < 2) return
  const headers = values[0].map(String)
  const fieldIndex = headers.indexOf(field)
  if (fieldIndex < 0) return
  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (String(values[index][fieldIndex]) === String(value)) sheet.deleteRow(index + 1)
  }
}

function sheet_(entity) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS[entity].name)
  if (!sheet) throw error_('SHEET_NOT_FOUND', 'Sheet not found: ' + SHEETS[entity].name)
  return sheet
}

function parseRecord_(value) {
  if (!value) return null
  try { return JSON.parse(value) } catch (error) { throw error_('INVALID_RECORD', 'Record must be valid JSON.') }
}

function success_(data) { return { ok: true, data: data } }
function failure_(code, message) { return { ok: false, error: { code: code, message: message } } }
function error_(code, message) { const error = new Error(message); error.code = code; return error }

function respond_(payload, callback) {
  const json = JSON.stringify(payload)
  if (callback) return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT)
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)
}
