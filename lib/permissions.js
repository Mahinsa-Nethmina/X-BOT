'use strict'

const db = require('./database')
const { jidToUser, sameUser, isGroupJid, toUserJid } = require('./utils')

function ownerJid() {
  const number = db.getOwnerNumber()
  return number ? `${number}@s.whatsapp.net` : ''
}

function isOwner(...jids) {
  const number = db.getOwnerNumber()
  if (!number) return false
  return jids.some((jid) => jidToUser(jid) === number)
}

function isGroup(jid) {
  return isGroupJid(jid)
}

function getParticipant(metadata, targetJid) {
  const participants = Array.isArray(metadata?.participants) ? metadata.participants : []
  const user = jidToUser(targetJid)
  return participants.find((item) => {
    const id = item?.id || item?.jid || ''
    const lid = item?.lid || ''
    const pn = item?.phoneNumber || item?.pn || ''
    return sameUser(id, targetJid) || sameUser(lid, targetJid) || sameUser(pn, targetJid) || jidToUser(id) === user
  }) || null
}

function isAdminParticipant(participant) {
  if (!participant) return false
  const role = String(participant.admin || participant.role || '').toLowerCase()
  return role === 'admin' || role === 'superadmin' || participant.isAdmin === true || participant.isSuperAdmin === true
}

function isGroupAdmin(metadata, targetJid) {
  return isAdminParticipant(getParticipant(metadata, targetJid))
}

function botIds(sock) {
  const user = sock?.user || {}
  return [user.id, user.lid, user.jid, user.pn].filter(Boolean)
}

function isBotAdmin(sock, metadata) {
  const ids = botIds(sock)
  return ids.some((id) => isGroupAdmin(metadata, id))
}

function requireGroup(ctx) {
  if (!isGroup(ctx.chatJid)) {
    return 'This command can only be used in groups.'
  }
  return null
}

function requireOwner(ctx) {
  if (!isOwner(ctx.senderJid, ctx.participant)) {
    return 'Only the bot owner can use this command.'
  }
  return null
}

function requireGroupAdmin(ctx) {
  const groupError = requireGroup(ctx)
  if (groupError) return groupError
  if (isOwner(ctx.senderJid, ctx.participant)) return null
  if (!isGroupAdmin(ctx.metadata, ctx.senderJid) && !isGroupAdmin(ctx.metadata, ctx.participant)) {
    return 'Only group admins can use this command.'
  }
  return null
}

function requireBotAdmin(ctx) {
  const groupError = requireGroup(ctx)
  if (groupError) return groupError
  if (!isBotAdmin(ctx.sock, ctx.metadata)) {
    return 'I need to be a group admin to do that.'
  }
  return null
}

function ownerDisplay() {
  const number = db.getOwnerNumber()
  if (!number) return 'Owner is not configured. Set OWNER_NUMBER in .env'
  return {
    number,
    jid: toUserJid(number)
  }
}

module.exports = {
  ownerJid,
  isOwner,
  isGroup,
  isGroupAdmin,
  isBotAdmin,
  getParticipant,
  requireGroup,
  requireOwner,
  requireGroupAdmin,
  requireBotAdmin,
  ownerDisplay,
  botIds
}
