'use strict'

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const pkgPath = path.join(__dirname, 'package.json')
let pkg = { version: '1.0.0' }
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
} catch (_) {}

function clean(value, fallback = '') {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text.length ? text : fallback
}

const config = {
  botName: clean(process.env.BOT_NAME, 'X BOT'),
  author: clean(process.env.AUTHOR, 'Mahinsa Nethmina'),
  prefix: clean(process.env.PREFIX, '.'),
  ownerNumber: clean(process.env.OWNER_NUMBER, '').replace(/[^\d]/g, ''),
  pairingNumber: clean(process.env.PAIRING_NUMBER, '').replace(/[^\d]/g, ''),
  ownerEmail: clean(process.env.EMAIL, 'mahinsanethmina2007@gmail.com'),
  maxDownloadCount: parseInt(clean(process.env.MAX_DOWNLOAD_COUNT, '1'), 10),
  logLevel: clean(process.env.LOG_LEVEL, 'info'),
  version: clean(pkg.version, '1.0.0'),
  sessionDir: path.join(__dirname, 'session'),
  databaseDir: path.join(__dirname, 'database'),
  databaseFile: path.join(__dirname, 'database', 'data.json'),
  footer: 'Created By © X BOT',
  startedAt: Date.now()
}

module.exports = config
