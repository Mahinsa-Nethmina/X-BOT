'use strict'

const fs = require('fs')
const readline = require('readline')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const baileys = require('@innovatorssoft/baileys')
const makeWASocket = baileys.default || baileys.makeWASocket || baileys
const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = baileys

const config = require('./config')
const db = require('./lib/database')
const { logger, sleep, digitsOnly } = require('./lib/utils')
const { attachHandler, detachHandler } = require('./handler')

const groupCache = new Map()
const MAX_GROUP_CACHE = 250
const reconnect = {
  attempts: 0,
  timer: null,
  connecting: false,
  shuttingDown: false,
  sock: null,
  listenersBound: false,
  startPromise: null
}

const baileysLogger = pino({ level: 'silent' })

function cacheGroupMetadata(jid, metadata) {
  if (!jid || !metadata) return
  if (groupCache.size >= MAX_GROUP_CACHE) {
    const first = groupCache.keys().next().value
    groupCache.delete(first)
  }
  groupCache.set(jid, metadata)
}

function getCachedGroupMetadata(jid) {
  return groupCache.get(jid)
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(String(answer || '').trim())
    })
  })
}

async function askPhoneNumber() {
  if (config.pairingNumber) return config.pairingNumber
  logger('info', 'Pairing required. Enter the WhatsApp number with country code (digits only).')
  while (true) {
    const raw = await ask('Phone number: ')
    const number = digitsOnly(raw)
    if (number.length >= 8 && number.length <= 16) return number
    logger('warn', 'Invalid number. Use country code and digits only, for example 15551234567')
  }
}

function reconnectDelay() {
  const caps = [2000, 5000, 10000, 20000, 30000]
  const index = Math.min(reconnect.attempts, caps.length - 1)
  return caps[index]
}

function clearReconnectTimer() {
  if (reconnect.timer) {
    clearTimeout(reconnect.timer)
    reconnect.timer = null
  }
}

function endSocket(sock) {
  if (!sock) return
  try {
    sock.ev.removeAllListeners()
  } catch (_) {}
  try {
    sock.ws?.close()
  } catch (_) {}
  try {
    sock.end?.(undefined)
  } catch (_) {}
}

function permanentAuthFailure(status) {
  const reasons = [
    DisconnectReason.loggedOut,
    DisconnectReason.badSession,
    DisconnectReason.multideviceMismatch,
    DisconnectReason.forbidden
  ].filter((value) => typeof value === 'number')
  return reasons.includes(status)
}

async function handlePairing(sock) {
  if (sock.authState?.creds?.registered) return
  const number = await askPhoneNumber()
  logger('info', 'Requesting pairing code...')
  await sleep(1500)
  const code = await sock.requestPairingCode(number)
  const formatted = String(code || '').replace(/(.{4})/g, '$1-').replace(/-$/, '')
  logger('info', `Pairing code: ${formatted}`)
  logger('info', 'On your phone: WhatsApp > Linked Devices > Link with phone number')
}

function bindSocketEvents(sock, saveCreds) {
  if (reconnect.listenersBound && reconnect.sock === sock) return
  reconnect.listenersBound = true

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    try {
      await onConnectionUpdate(sock, update)
    } catch (err) {
      logger('error', 'Connection update handler failed')
    }
  })

  sock.ev.on('groups.update', async (events) => {
    const list = Array.isArray(events) ? events : [events]
    for (const event of list) {
      if (!event?.id) continue
      try {
        const metadata = await sock.groupMetadata(event.id)
        cacheGroupMetadata(event.id, metadata)
      } catch (_) {}
    }
  })



  attachHandler(sock, {
    cacheGroupMetadata,
    getCachedGroupMetadata
  })
}

async function onConnectionUpdate(sock, update) {
  const { connection, lastDisconnect, qr } = update || {}

  if (qr) {
    logger('info', 'QR was generated but this bot uses pairing code login only.')
  }

  if (connection === 'connecting') {
    logger('info', 'Connecting to WhatsApp...')
  }

  if (connection === 'open') {
    reconnect.attempts = 0
    reconnect.connecting = false
    const user = sock.user?.id ? String(sock.user.id).split(':')[0] : 'unknown'
    logger('info', `${config.botName} connected`, { user })
  }

  if (connection === 'close') {
    reconnect.connecting = false
    const error = lastDisconnect?.error
    const status = error instanceof Boom
      ? error.output?.statusCode
      : error?.output?.statusCode
    const loggedOut = permanentAuthFailure(status)

    logger('warn', 'Connection closed', {
      status: status || 'unknown',
      reconnect: !loggedOut && !reconnect.shuttingDown
    })

    detachHandler(sock)
    reconnect.listenersBound = false
    reconnect.sock = null
    endSocket(sock)

    if (reconnect.shuttingDown) return

    if (loggedOut) {
      logger('error', 'Permanent authentication failure. Delete the session folder and pair again.')
      return
    }

    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnect.shuttingDown || reconnect.connecting || reconnect.startPromise || reconnect.timer) return
  clearReconnectTimer()
  const delay = reconnectDelay()
  reconnect.attempts += 1
  logger('info', `Reconnecting in ${Math.round(delay / 1000)}s`)
  reconnect.timer = setTimeout(() => {
    startConnection().catch((err) => {
      logger('error', 'Reconnect failed')
      scheduleReconnect()
    })
  }, delay)
}

async function openSocket() {
  db.init()
  fs.mkdirSync(config.sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir)
  let version
  try {
    const fetched = await fetchLatestBaileysVersion()
    version = fetched?.version
  } catch (_) {
    logger('warn', 'Could not fetch latest Baileys version, using library default')
  }

  const keyStore = typeof makeCacheableSignalKeyStore === 'function'
    ? makeCacheableSignalKeyStore(state.keys, baileysLogger)
    : state.keys

  const browser = typeof Browsers?.ubuntu === 'function'
    ? Browsers.ubuntu(config.botName)
    : ['Ubuntu', 'Chrome', '22.04.4']

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: keyStore,
    },
    logger: baileysLogger,
    printQRInTerminal: false,
    browser,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    cachedGroupMetadata: async (jid) => getCachedGroupMetadata(jid),
    getMessage: async (key) => await getMessageFromStore(key),
  });

  reconnect.sock = sock
  reconnect.listenersBound = false
  bindSocketEvents(sock, saveCreds)

  try {
    await handlePairing(sock)
  } catch (err) {
    logger('error', 'Pairing code request failed')
    endSocket(sock)
    reconnect.sock = null
    reconnect.listenersBound = false
    throw err
  }

  return sock
}

async function startConnection() {
  if (reconnect.shuttingDown) return null
  if (reconnect.sock) return reconnect.sock
  if (reconnect.startPromise) return reconnect.startPromise

  reconnect.connecting = true
  reconnect.startPromise = openSocket()
    .catch((err) => {
      reconnect.sock = null
      throw err
    })
    .finally(() => {
      reconnect.connecting = false
      reconnect.startPromise = null
    })

  return reconnect.startPromise
}

async function shutdown(reason = 'signal') {
  if (reconnect.shuttingDown) return
  reconnect.shuttingDown = true
  clearReconnectTimer()
  logger('info', `Shutting down (${reason})`)
  const sock = reconnect.sock
  reconnect.sock = null
  detachHandler(sock)
  endSocket(sock)
  db.flush()
  await sleep(300)
  process.exit(0)
}

function registerSignals() {
  if (registerSignals.done) return
  registerSignals.done = true
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('uncaughtException', (err) => {
    logger('error', 'Uncaught exception')
    if (String(err?.message || '').toLowerCase().includes('logged out')) {
      shutdown('uncaughtException')
    }
  })
  process.on('unhandledRejection', () => {
    logger('error', 'Unhandled promise rejection')
  })
}

function getSocket() {
  return reconnect.sock
}

module.exports = {
  startConnection,
  shutdown,
  registerSignals,
  getSocket,
  cacheGroupMetadata,
  getCachedGroupMetadata
}
