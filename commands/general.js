'use strict'

const config = require('../config')
const db = require('../lib/database')
const perms = require('../lib/permissions')
const messages = require('../lib/messages')
const { getUptime, memoryUsage, runtimeInfo, jidToUser, isGroupJid } = require('../lib/utils')

function pingMs(msg) {
  const ts = Number(msg.messageTimestamp)
  if (!ts) return 0
  const ms = ts < 1e12 ? ts * 1000 : ts
  return Math.max(0, Date.now() - ms)
}

async function ping(ctx) {
  const latency = pingMs(ctx.msg)
  await ctx.reply([
    `*${config.botName}*`,
    `Pong`,
    `Latency: *${latency}ms*`
  ].join('\n'))
}

async function alive(ctx) {
  const latency = pingMs(ctx.msg)
  await messages.sendButtons(ctx.sock, ctx.chatJid, [
    `*${config.botName}*`,
    `Author: *${config.author}*`,
    `Status: *Online*`,
    `Uptime: *${getUptime()}*`,
    `Latency: *${latency}ms*`
  ].join('\n'), [
    { id: 'menu:main', text: 'Menu' },
    { id: 'cmd:botinfo', text: 'Bot Info' },
    { id: 'cmd:runtime', text: 'Runtime' }
  ], { quoted: ctx.msg, subtitle: 'Status' })
}

async function menu(ctx, args) {
  const category = String(args[0] || '').toLowerCase()
  if (['general', 'group', 'admin', 'owner', 'help'].includes(category)) {
    await messages.sendCategoryMenu(ctx.sock, ctx.chatJid, category, ctx.prefix, ctx.msg)
    return
  }
  await messages.sendMainMenu(ctx.sock, ctx.chatJid, ctx.prefix, ctx.msg)
}

async function help(ctx) {
  await messages.sendCategoryMenu(ctx.sock, ctx.chatJid, 'help', ctx.prefix, ctx.msg)
}

async function owner(ctx) {
  const info = perms.ownerDisplay()
  if (typeof info === 'string') {
    await ctx.reply(info)
    return
  }
  const contact = {
    fullName: config.author,
    organization: config.botName,
    title: "Developer",
    phones: [
      { number: '+'+info.number, type: "CELL" }
    ],
    emails: [{ email: config.ownerEmail, type: "Email" }],
    addresses: [{ street: "Galle, Southern", city: "", country: "Sri Lanka" }],
    birthday: "2007-07-17",
    note: "This is the official contact card of the bot owner. Please use this contact for any inquiries or support related to the bot.",
  };
  await messages.sendCard(ctx.sock, ctx.chatJid, contact, { quoted: ctx.msg })
}

async function botinfo(ctx) {
  const mem = memoryUsage()
  const runtime = runtimeInfo()
  await ctx.reply([
    `*${config.botName}*`,
    `Author: *${config.author}*`,
    `Version: *${config.version}*`,
    `Prefix: *${db.getPrefix()}*`,
    `Runtime: *${getUptime()}*`,
    `Node: *${runtime.node}*`,
    `Platform: *${runtime.platform}*`,
    `Memory: *${mem.heapUsed}* / *${mem.heapTotal}*`
  ].join('\n'))
}

async function runtime(ctx) {
  await ctx.reply([
    `*${config.botName}*`,
    `Uptime: *${getUptime()}*`
  ].join('\n'))
}

async function jid(ctx) {
  await ctx.reply([
    `*Chat JID*`,
    `\`${ctx.chatJid}\``,
    ctx.senderJid ? `Your user: \`${jidToUser(ctx.senderJid)}\`` : ''
  ].filter(Boolean).join('\n'))
}

async function echo(ctx, _args, argText) {
  const text = String(argText || '').trim()
  if (!text) {
    await ctx.reply(`Usage: ${ctx.prefix}echo <text>`)
    return
  }
  await ctx.reply(text)
}

async function say(ctx, _args, argText) {
  const text = String(argText || '').trim()
  if (!text) {
    await ctx.reply(`Usage: ${ctx.prefix}say <text>`)
    return
  }
  await ctx.send(text)
}

async function groupinfo(ctx) {
  if (!isGroupJid(ctx.chatJid)) {
    await ctx.reply('This command can only be used in groups.')
    return
  }
  const meta = ctx.metadata
  if (!meta) {
    await ctx.reply('Unable to read group metadata right now.')
    return
  }
  const participants = Array.isArray(meta.participants) ? meta.participants : []
  const admins = participants.filter((p) => ['admin', 'superadmin'].includes(String(p.admin || '').toLowerCase()))
  const ownerId = meta.owner || meta.subjectOwner || ''
  const body = [
    `*Group Info*`,
    `Name: *${meta.subject || 'Unknown'}*`,
    `ID: \`${meta.id || ctx.chatJid}\``,
    `Participants: *${participants.length}*`,
    `Admins: *${admins.length}*`,
    ownerId ? `Creator: @${jidToUser(ownerId)}` : 'Creator: Unknown'
  ].join('\n')
  await ctx.sock.sendMessage(ctx.chatJid, {
    text: messages.withFooter(body),
    mentions: ownerId ? [ownerId] : []
  }, { quoted: ctx.msg })
}

async function admins(ctx) {
  if (!isGroupJid(ctx.chatJid)) {
    await ctx.reply('This command can only be used in groups.')
    return
  }
  const meta = ctx.metadata
  if (!meta) {
    await ctx.reply('Unable to read group metadata right now.')
    return
  }
  const participants = Array.isArray(meta.participants) ? meta.participants : []
  const adminsList = participants.filter((p) => ['admin', 'superadmin'].includes(String(p.admin || '').toLowerCase()))
  if (!adminsList.length) {
    await ctx.reply('No admins found.')
    return
  }
  const mentions = adminsList.map((p) => p.id).filter(Boolean)
  const lines = adminsList.map((p, i) => `${i + 1}. @${jidToUser(p.id)}`)
  await ctx.sock.sendMessage(ctx.chatJid, {
    text: messages.withFooter([`*Group Admins*`, ...lines].join('\n')),
    mentions
  }, { quoted: ctx.msg })
}

module.exports = [
  { name: 'ping', aliases: ['p'], category: 'general', description: 'Show bot latency', execute: ping },
  { name: 'alive', aliases: [], category: 'general', description: 'Show online status', execute: alive },
  { name: 'menu', aliases: ['m'], category: 'general', description: 'Show interactive menu', execute: menu },
  { name: 'help', aliases: ['h'], category: 'general', description: 'Show command list', execute: help },
  { name: 'owner', aliases: [], category: 'general', description: 'Show owner information', execute: owner },
  { name: 'botinfo', aliases: ['info'], category: 'general', description: 'Show bot information', execute: botinfo },
  { name: 'runtime', aliases: ['uptime'], category: 'general', description: 'Show bot uptime', execute: runtime },
  { name: 'jid', aliases: [], category: 'general', description: 'Show current chat JID', execute: jid },
  { name: 'echo', aliases: [], category: 'general', description: 'Reply with provided text', execute: echo },
  { name: 'say', aliases: [], category: 'general', description: 'Send provided text', execute: say },
  { name: 'groupinfo', aliases: ['ginfo'], category: 'group', description: 'Show group information', execute: groupinfo },
  { name: 'admins', aliases: ['adminlist'], category: 'group', description: 'List group admins', execute: admins }
]
