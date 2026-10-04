'use strict'

const { spawn } = require('child_process')
const db = require('../lib/database')
const perms = require('../lib/permissions')
const messages = require('../lib/messages')
const { digitsOnly, sleep } = require('../lib/utils')

async function restart(ctx) {
  const denied = perms.requireOwner(ctx)
  if (denied) return ctx.reply(denied)
  await ctx.reply('Restarting HYDRA BOT...')
  await sleep(400)
  db.flush()
  const connection = require('../connection')
  const sock = connection.getSocket()
  try {
    sock?.ev?.removeAllListeners?.()
    sock?.end?.()
  } catch (_) {}
  const child = spawn(process.argv[0], process.argv.slice(1), {
    detached: true,
    stdio: 'inherit',
    env: process.env
  })
  child.unref()
  process.exit(0)
}

async function shutdownCmd(ctx) {
  const denied = perms.requireOwner(ctx)
  if (denied) return ctx.reply(denied)
  await ctx.reply('Shutting down HYDRA BOT...')
  await sleep(400)
  db.flush()
  const connection = require('../connection')
  await connection.shutdown('owner-command')
}

async function broadcast(ctx, _args, argText) {
  const denied = perms.requireOwner(ctx)
  if (denied) return ctx.reply(denied)
  const text = String(argText || '').trim()
  if (!text) return ctx.reply(`Usage: ${ctx.prefix}broadcast <message>`)

  let groups = {}
  try {
    groups = await ctx.sock.groupFetchAllParticipating()
  } catch (err) {
    return ctx.reply(messages.userFacingError(err))
  }

  const ids = Object.keys(groups || {})
  let sent = 0
  let failed = 0
  for (const jid of ids) {
    try {
      await ctx.sock.sendMessage(jid, { text: messages.withFooter(`*Broadcast*\n\n${text}`) })
      sent += 1
      await sleep(400)
    } catch (_) {
      failed += 1
    }
  }
  await ctx.reply(`Broadcast finished.\nSent: *${sent}*\nFailed: *${failed}*`)
}

async function setprefix(ctx, args) {
  const denied = perms.requireOwner(ctx)
  if (denied) return ctx.reply(denied)
  const prefix = String(args[0] || '').trim()
  if (!prefix) return ctx.reply(`Usage: ${ctx.prefix}setprefix <prefix>`)
  try {
    const next = db.setPrefix(prefix)
    await ctx.reply(`Prefix updated to *${next}*`)
  } catch (err) {
    await ctx.reply(messages.userFacingError(err))
  }
}

async function setowner(ctx, args) {
  const denied = perms.requireOwner(ctx)
  if (denied) return ctx.reply(denied)
  const number = digitsOnly(args[0] || '')
  if (!number) return ctx.reply(`Usage: ${ctx.prefix}setowner <number>`)
  try {
    const next = db.setOwnerNumber(number)
    await ctx.reply(`Owner number updated to *${next}*`)
  } catch (err) {
    await ctx.reply(messages.userFacingError(err))
  }
}

module.exports = [
  { name: 'restart', aliases: [], category: 'owner', description: 'Restart the bot', execute: restart },
  { name: 'shutdown', aliases: ['stop'], category: 'owner', description: 'Shut down the bot', execute: shutdownCmd },
  { name: 'broadcast', aliases: ['bc'], category: 'owner', description: 'Broadcast a message to all groups', execute: broadcast },
  { name: 'setprefix', aliases: [], category: 'owner', description: 'Change the command prefix', execute: setprefix },
  { name: 'setowner', aliases: [], category: 'owner', description: 'Change the owner number', execute: setowner }
]
