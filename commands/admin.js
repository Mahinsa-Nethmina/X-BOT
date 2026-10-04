'use strict'

const db = require('../lib/database')
const perms = require('../lib/permissions')
const messages = require('../lib/messages')
const { toUserJid, digitsOnly, sameUser, parseMode } = require('../lib/utils')

function quotedParticipant(ctx) {
  return ctx.quoted?.participant || ctx.quoted?.key?.participant || ''
}

function resolveTargets(ctx, args) {
  const fromMentions = Array.isArray(ctx.mentions) ? ctx.mentions : []
  const fromQuoted = quotedParticipant(ctx)
  const fromArgs = args
    .map((item) => toUserJid(String(item).replace(/^@/, '')))
    .filter(Boolean)
  const list = [...fromMentions, fromQuoted, ...fromArgs].filter(Boolean)
  const unique = []
  for (const jid of list) {
    if (!unique.some((item) => sameUser(item, jid))) unique.push(jid)
  }
  return unique
}

async function ensureAdminAction(ctx) {
  return perms.requireGroupAdmin(ctx) || perms.requireBotAdmin(ctx)
}

async function updateParticipants(ctx, users, action) {
  if (!users.length) {
    await ctx.reply('Tag or quote a user first.')
    return
  }
  try {
    const result = await ctx.sock.groupParticipantsUpdate(ctx.chatJid, users, action)
    const failed = Array.isArray(result)
      ? result.filter((item) => item?.status && String(item.status) !== '200')
      : []
    if (failed.length) {
      await ctx.reply(`Some ${action} operations failed.`)
      return
    }
    await ctx.reply(`${action} completed.`)
  } catch (err) {
    await ctx.reply(messages.userFacingError(err))
  }
}

async function kick(ctx, args) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  const users = resolveTargets(ctx, args)
  if (users.some((jid) => perms.isOwner(jid))) {
    return ctx.reply('I will not kick the bot owner.')
  }
  const botIds = perms.botIds(ctx.sock)
  if (users.some((jid) => botIds.some((id) => sameUser(id, jid)))) {
    return ctx.reply('I cannot apply this action to myself.')
  }
  return updateParticipants(ctx, users, 'remove')
}

async function add(ctx, args) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  const number = digitsOnly(args[0] || '')
  if (!number) return ctx.reply(`Usage: ${ctx.prefix}add <number>`)
  return updateParticipants(ctx, [toUserJid(number)], 'add')
}

async function promote(ctx, args) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  return updateParticipants(ctx, resolveTargets(ctx, args), 'promote')
}

async function demote(ctx, args) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  const users = resolveTargets(ctx, args)
  if (users.some((jid) => perms.isOwner(jid))) {
    return ctx.reply('I will not demote the bot owner.')
  }
  const botIds = perms.botIds(ctx.sock)
  if (users.some((jid) => botIds.some((id) => sameUser(id, jid)))) {
    return ctx.reply('I cannot apply this action to myself.')
  }
  return updateParticipants(ctx, users, 'demote')
}

async function setname(ctx, _args, argText) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  const name = String(argText || '').trim()
  if (!name) return ctx.reply(`Usage: ${ctx.prefix}setname <name>`)
  try {
    await ctx.sock.groupUpdateSubject(ctx.chatJid, name.slice(0, 100))
    await ctx.reply('Group name updated.')
  } catch (err) {
    await ctx.reply(messages.userFacingError(err))
  }
}

async function setdesc(ctx, _args, argText) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  const desc = String(argText || '').trim()
  if (!desc) return ctx.reply(`Usage: ${ctx.prefix}setdesc <description>`)
  try {
    await ctx.sock.groupUpdateDescription(ctx.chatJid, desc.slice(0, 2000))
    await ctx.reply('Group description updated.')
  } catch (err) {
    await ctx.reply(messages.userFacingError(err))
  }
}

async function deleteMessage(ctx) {
  const denied = await ensureAdminAction(ctx)
  if (denied) return ctx.reply(denied)
  const quoted = ctx.quoted
  if (!quoted?.stanzaId && !quoted?.key?.id) {
    return ctx.reply('Quote a message to delete it.')
  }
  const participant = quoted.participant || quoted.key.participant || ''
  const botIds = perms.botIds(ctx.sock)
  const fromMe = botIds.some((id) => sameUser(id, participant))
  const key = {
    remoteJid: ctx.chatJid,
    fromMe,
    id: quoted.stanzaId || quoted.key.id,
    participant: fromMe ? undefined : participant
  }
  try {
    await ctx.sock.sendMessage(ctx.chatJid, { delete: key })
  } catch (err) {
    await ctx.reply(messages.userFacingError(err))
  }
}

async function antilink(ctx, args) {
  const denied = perms.requireGroupAdmin(ctx)
  if (denied) return ctx.reply(denied)

  const sub = String(args[0] || '').toLowerCase()
  if (sub === 'on') {
    db.setAntilinkEnabled(ctx.chatJid, true)
    return ctx.reply('Antilink is now *enabled* (mode: warn_delete).')
  }
  if (sub === 'off') {
    db.setAntilinkEnabled(ctx.chatJid, false)
    return ctx.reply('Antilink is now *disabled*.')
  }
  if (sub === 'status') {
    const data = db.getAntilink(ctx.chatJid)
    return ctx.reply([
      '*Antilink status*',
      `Enabled: *${data.enabled ? 'yes' : 'no'}*`,
      `Mode: *${data.mode}*`,
      `Whitelist: ${data.whitelist.join(', ') || 'none'}`
    ].join('\n'))
  }
  if (sub === 'mode') {
    const mode = parseMode(args[1], ['warn', 'delete', 'warn_delete'], '')
    if (!mode) return ctx.reply(`Usage: ${ctx.prefix}antilink mode warn|delete|warn_delete`)
    db.setAntilinkMode(ctx.chatJid, mode)
    return ctx.reply(`Antilink mode set to *${mode}*.`)
  }

  return ctx.reply(`Usage: ${ctx.prefix}antilink on|off|status|mode <warn|delete|warn_delete>`)
}

module.exports = [
  { name: 'kick', aliases: ['remove'], category: 'admin', description: 'Remove a participant', execute: kick },
  { name: 'add', aliases: [], category: 'admin', description: 'Add a participant', execute: add },
  { name: 'promote', aliases: [], category: 'admin', description: 'Promote a participant', execute: promote },
  { name: 'demote', aliases: [], category: 'admin', description: 'Demote a participant', execute: demote },
  { name: 'setname', aliases: ['setsubject'], category: 'admin', description: 'Change group subject', execute: setname },
  { name: 'setdesc', aliases: ['setdescription'], category: 'admin', description: 'Change group description', execute: setdesc },
  { name: 'delete', aliases: ['del'], category: 'admin', description: 'Delete a quoted message', execute: deleteMessage },
  { name: 'antilink', aliases: ['al'], category: 'admin', description: 'Configure antilink', execute: antilink }
]
