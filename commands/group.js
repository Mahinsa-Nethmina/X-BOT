'use strict'

const db = require('../lib/database')
const perms = require('../lib/permissions')
const messages = require('../lib/messages')
const { jidToUser, chunk, clampText } = require('../lib/utils')

async function tagall(ctx, _args, argText) {
  const denied = perms.requireGroupAdmin(ctx)
  if (denied) return ctx.reply(denied)

  const meta = ctx.metadata
  if (!meta || !Array.isArray(meta.participants)) {
    return ctx.reply('Unable to read group participants right now.')
  }

  const participants = meta.participants.map((p) => p.id).filter(Boolean)
  if (!participants.length) return ctx.reply('No participants found.')

  const header = String(argText || '').trim() || 'Tag all'
  const batches = chunk(participants, 75)
  for (const batch of batches) {
    const text = [
      `*${header}*`,
      '',
      batch.map((jid) => `@${jidToUser(jid)}`).join(' ')
    ].join('\n')
    await ctx.sock.sendMessage(ctx.chatJid, {
      text: clampText(messages.withFooter(text), 5000),
      mentions: batch
    })
  }
}

async function hidetag(ctx, _args, argText) {
  const denied = perms.requireGroupAdmin(ctx)
  if (denied) return ctx.reply(denied)

  const meta = ctx.metadata
  if (!meta || !Array.isArray(meta.participants)) {
    return ctx.reply('Unable to read group participants right now.')
  }

  const participants = meta.participants.map((p) => p.id).filter(Boolean)
  const text = String(argText || '').trim() || 'Notice'
  await ctx.sock.sendMessage(ctx.chatJid, {
    text: messages.withFooter(text),
    mentions: participants
  })
}

async function welcome(ctx, args, argText) {
  const denied = perms.requireGroupAdmin(ctx)
  if (denied) return ctx.reply(denied)

  const sub = String(args[0] || '').toLowerCase()
  const rest = argText.replace(/^\S+\s*/, '').trim()

  if (sub === 'on') {
    db.setWelcomeEnabled(ctx.chatJid, true)
    return ctx.reply('Welcome messages are now *enabled*.')
  }
  if (sub === 'off') {
    db.setWelcomeEnabled(ctx.chatJid, false)
    return ctx.reply('Welcome messages are now *disabled*.')
  }
  if (sub === 'status') {
    const data = db.getWelcome(ctx.chatJid)
    return ctx.reply([
      '*Welcome status*',
      `Enabled: *${data.enabled ? 'yes' : 'no'}*`,
      `Message: ${data.message}`
    ].join('\n'))
  }
  if (sub === 'set' || sub === 'message') {
    const message = rest || argText.replace(/^(set|message)\s+/i, '').trim()
    if (!message) return ctx.reply(`Usage: ${ctx.prefix}welcome set Welcome @user to the group!`)
    db.setWelcomeMessage(ctx.chatJid, message)
    return ctx.reply('Welcome message updated.')
  }

  return ctx.reply(`Usage: ${ctx.prefix}welcome on|off|status|set <message>`)
}

async function goodbye(ctx, args, argText) {
  const denied = perms.requireGroupAdmin(ctx)
  if (denied) return ctx.reply(denied)

  const sub = String(args[0] || '').toLowerCase()
  const rest = argText.replace(/^\S+\s*/, '').trim()

  if (sub === 'on') {
    db.setGoodbyeEnabled(ctx.chatJid, true)
    return ctx.reply('Goodbye messages are now *enabled*.')
  }
  if (sub === 'off') {
    db.setGoodbyeEnabled(ctx.chatJid, false)
    return ctx.reply('Goodbye messages are now *disabled*.')
  }
  if (sub === 'status') {
    const data = db.getGoodbye(ctx.chatJid)
    return ctx.reply([
      '*Goodbye status*',
      `Enabled: *${data.enabled ? 'yes' : 'no'}*`,
      `Message: ${data.message}`
    ].join('\n'))
  }
  if (sub === 'set' || sub === 'message') {
    const message = rest || argText.replace(/^(set|message)\s+/i, '').trim()
    if (!message) return ctx.reply(`Usage: ${ctx.prefix}goodbye set Goodbye @user!`)
    db.setGoodbyeMessage(ctx.chatJid, message)
    return ctx.reply('Goodbye message updated.')
  }

  return ctx.reply(`Usage: ${ctx.prefix}goodbye on|off|status|set <message>`)
}

module.exports = [
  { name: 'tagall', aliases: ['everyone'], category: 'group', description: 'Mention all group members', execute: tagall },
  { name: 'hidetag', aliases: ['htag'], category: 'group', description: 'Hidden mention all members', execute: hidetag },
  { name: 'welcome', aliases: [], category: 'group', description: 'Configure welcome messages', execute: welcome },
  { name: 'goodbye', aliases: ['bye'], category: 'group', description: 'Configure goodbye messages', execute: goodbye }
]
