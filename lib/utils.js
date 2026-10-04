'use strict'

const os = require('os')
const config = require('../config')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Number(ms) || 0))
}

function now() {
  return Date.now()
}

function formatUptime(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

function getUptime() {
  return formatUptime(Date.now() - config.startedAt)
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(2)} ${units[unit]}`
}

function memoryUsage() {
  const mem = process.memoryUsage()
  return {
    rss: formatBytes(mem.rss),
    heapUsed: formatBytes(mem.heapUsed),
    heapTotal: formatBytes(mem.heapTotal)
  }
}

function runtimeInfo() {
  return {
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    pid: process.pid
  }
}

function digitsOnly(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function jidToUser(jid) {
  if (!jid || typeof jid !== 'string') return ''
  return jid.split('@')[0].split(':')[0]
}

function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return ''
  const trimmed = jid.trim()
  if (!trimmed) return ''
  if (trimmed.endsWith('@g.us') || trimmed.endsWith('@lid') || trimmed.endsWith('@broadcast') || trimmed.endsWith('@newsletter')) {
    return trimmed
  }
  const user = jidToUser(trimmed)
  if (!user) return ''
  if (trimmed.includes('@s.whatsapp.net')) return `${user}@s.whatsapp.net`
  if (/^\d+$/.test(user)) return `${user}@s.whatsapp.net`
  return trimmed
}

function toUserJid(input) {
  if (!input) return ''
  const text = String(input).trim()
  if (!text) return ''
  if (text.endsWith('@s.whatsapp.net') || text.endsWith('@lid')) return text
  const digits = digitsOnly(text)
  if (!digits) return ''
  return `${digits}@s.whatsapp.net`
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us')
}

function sameUser(a, b) {
  const left = jidToUser(a)
  const right = jidToUser(b)
  if (!left || !right) return false
  return left === right
}

function chunk(array, size) {
  const list = Array.isArray(array) ? array : []
  const n = Math.max(1, Number(size) || 1)
  const out = []
  for (let i = 0; i < list.length; i += n) {
    out.push(list.slice(i, i + n))
  }
  return out
}

function unique(list) {
  return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))]
}

function clampText(text, max = 4000) {
  const value = String(text || '')
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

function safeError(err) {
  if (!err) return 'Unknown error'
  const message = err.message || err.toString()
  return clampText(String(message).replace(/\n+/g, ' '), 240)
}

function parseArgs(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function parseMode(value, allowed, fallback) {
  const mode = String(value || '').trim().toLowerCase()
  if (allowed.includes(mode)) return mode
  return fallback
}

function containsLink(text, extraPatterns = []) {
  const value = String(text || '')
  if (!value) return false
  const patterns = [
    /https?:\/\/[^\s]+/i,
    /www\.[^\s]+/i,
    /chat\.whatsapp\.com\/[A-Za-z0-9]+/i,
    /wa\.me\/[^\s]+/i,
    ...extraPatterns
  ]
  return patterns.some((re) => re.test(value))
}

function extractUrls(text) {
  const value = String(text || '')
  const found = value.match(/https?:\/\/[^\s<>"']+/gi) || []
  const www = value.match(/\bwww\.[^\s<>"']+/gi) || []
  return unique([...found, ...www.map((item) => `http://${item}`)])
}

function hostnameFromUrl(url) {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `http://${url}`
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase()
  } catch (_) {
    return ''
  }
}

function isWhitelistedUrl(url, whitelist) {
  const host = hostnameFromUrl(url)
  if (!host) return false
  const list = Array.isArray(whitelist) ? whitelist : []
  return list.some((domain) => {
    const clean = String(domain || '').replace(/^www\./i, '').toLowerCase()
    if (!clean) return false
    return host === clean || host.endsWith(`.${clean}`)
  })
}

function mentionText(jids) {
  return unique(jids)
    .map((jid) => `@${jidToUser(jid)}`)
    .join(' ')
}

function banner(title, body) {
  const lines = [
    `*${config.botName}*`,
    `_${title}_`,
    '',
    body,
    '',
    config.footer
  ]
  return lines.join('\n')
}

function section(title, rows) {
  const lines = [`*${title}*`]
  for (const row of rows) {
    if (!row) continue
    if (typeof row === 'string') lines.push(row)
    else lines.push(`• *${row.label}:* ${row.value}`)
  }
  return lines.join('\n')
}

function logger(level, message, extra) {
  const time = new Date().toISOString()
  const payload = extra ? ` ${JSON.stringify(extra)}` : ''
  const line = `[${time}] [${String(level).toUpperCase()}] ${message}${payload}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

module.exports = {
  sleep,
  now,
  formatUptime,
  getUptime,
  formatBytes,
  memoryUsage,
  runtimeInfo,
  digitsOnly,
  jidToUser,
  normalizeJid,
  toUserJid,
  isGroupJid,
  sameUser,
  chunk,
  unique,
  clampText,
  safeError,
  parseArgs,
  parseMode,
  containsLink,
  extractUrls,
  hostnameFromUrl,
  isWhitelistedUrl,
  mentionText,
  banner,
  section,
  logger
}
