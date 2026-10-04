"use strict";

const config = require("./config");
const db = require("./lib/database");
const perms = require("./lib/permissions");
const messages = require("./lib/messages");
const {
  isGroupJid,
  jidToUser,
  sameUser,
  containsLink,
  extractUrls,
  isWhitelistedUrl,
  logger,
  clampText,
  unique,
} = require("./lib/utils");

const general = require("./commands/general");
const group = require("./commands/group");
const admin = require("./commands/admin");
const owner = require("./commands/owner");
const movie = require("./commands/movie");
const adult = require("./commands/adult");
const game = require("./commands/game");

const commands = new Map();
const antilinkWarns = new Map();
const boundSockets = new WeakSet();
const pendingWelcome = new Set();

function registerModule(mod) {
  const list = Array.isArray(mod) ? mod : mod.commands || [];
  for (const cmd of list) {
    if (!cmd?.name || typeof cmd.execute !== "function") continue;
    const name = String(cmd.name).toLowerCase();
    commands.set(name, cmd);
    for (const alias of cmd.aliases || []) {
      commands.set(String(alias).toLowerCase(), cmd);
    }
  }
}

registerModule(general);
registerModule(group);
registerModule(admin);
registerModule(owner);
registerModule(movie);
registerModule(adult);
registerModule(game);

function getCommand(name) {
  return commands.get(String(name || "").toLowerCase()) || null;
}

function allCommands() {
  const seen = new Set();
  const list = [];
  for (const cmd of commands.values()) {
    if (seen.has(cmd.name)) continue;
    seen.add(cmd.name);
    list.push(cmd);
  }
  return list;
}

function unwrapMessage(message) {
  if (!message) return null;
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message.editedMessage?.message ||
    message
  );
}

function extractText(message) {
  const msg = unwrapMessage(message);
  if (!msg) return "";
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    msg.listResponseMessage?.title ||
    msg.templateButtonReplyMessage?.selectedDisplayText ||
    msg.interactiveResponseMessage?.body?.text ||
    ""
  );
}

function extractMentions(message) {
  const msg = unwrapMessage(message);
  const ctx = msg?.extendedTextMessage?.contextInfo || msg?.contextInfo || {};
  const mentioned = ctx.mentionedJid || [];
  return unique(mentioned);
}

function extractQuoted(message) {
  const msg = unwrapMessage(message);
  const ctx =
    msg?.extendedTextMessage?.contextInfo ||
    msg?.imageMessage?.contextInfo ||
    msg?.videoMessage?.contextInfo ||
    msg?.contextInfo;
  return ctx?.quotedMessage
    ? {
        key: {
          remoteJid: ctx.remoteJid || "",
          fromMe: Boolean(ctx.fromMe),
          id: ctx.stanzaId,
          participant: ctx.participant,
        },
        message: ctx.quotedMessage,
        participant: ctx.participant,
        stanzaId: ctx.stanzaId,
      }
    : null;
}

function parseCommand(text, prefix) {
  const raw = String(text || "").trim();
  if (!raw.startsWith(prefix)) return null;
  const without = raw.slice(prefix.length).trim();
  if (!without) return null;
  const [name, ...rest] = without.split(/\s+/);
  return {
    name: name.toLowerCase(),
    args: rest,
    argText: rest.join(" "),
    full: without,
  };
}

function menuActionToCommand(id) {
  const value = String(id || "").trim();
  if (!value) return null;
  if (value.startsWith("cmd:"))
    return { name: value.slice(4), args: [], argText: "" };
  if (value.startsWith("menu:"))
    return {
      name: "__menu__",
      args: [value.slice(5)],
      argText: value.slice(5),
    };
  return null;
}

async function getMetadata(sock, jid, helpers) {
  if (!isGroupJid(jid)) return null;
  const cached = helpers.getCachedGroupMetadata?.(jid);
  if (cached) return cached;
  try {
    const metadata = await sock.groupMetadata(jid);
    helpers.cacheGroupMetadata?.(jid, metadata);
    return metadata;
  } catch (_) {
    return null;
  }
}

function senderFrom(msg, chatJid) {
  return (
    msg.key.participantPn ||
    msg.key.participantAlt ||
    msg.key.senderPn ||
    msg.key.participant ||
    msg.participant ||
    (isGroupJid(chatJid) ? "" : msg.key.remoteJidAlt || chatJid)
  );
}

async function buildContext(sock, msg, helpers) {
  const chatJid = msg.key.remoteJid;
  const inner = unwrapMessage(msg.message);
  const text = extractText(msg.message);
  const interactiveId = messages.extractInteractiveId(inner);
  const senderJid = senderFrom(msg, chatJid);
  const metadata = await getMetadata(sock, chatJid, helpers);
  const prefix = db.getPrefix();
  const parsed = parseCommand(text, prefix);
  const menuCmd = menuActionToCommand(interactiveId);

  return {
    sock,
    msg,
    key: msg.key,
    chatJid,
    senderJid,
    participant: msg.key.participant || senderJid,
    fromMe: Boolean(msg.key.fromMe),
    isGroup: isGroupJid(chatJid),
    isOwner: perms.isOwner(senderJid, msg.key.participant),
    text,
    prefix,
    command: parsed,
    interactiveId,
    menuCmd,
    mentions: extractMentions(msg.message),
    quoted: extractQuoted(msg.message),
    metadata,
    helpers,
    commands: allCommands(),
    getCommand,
    reply: (body) => messages.reply(sock, chatJid, body, msg),
    send: (body) => messages.sendText(sock, chatJid, body),
    react: (emoji) => messages.react(sock, chatJid, emoji, msg),
  };
}

async function handleMenu(ctx) {
  const category = String(ctx.menuCmd.args[0] || "main").toLowerCase();
  if (category === "main" || category === "menu") {
    await messages.sendMainMenu(ctx.sock, ctx.chatJid, ctx.prefix, ctx.msg);
    return true;
  }
  await messages.sendCategoryMenu(
    ctx.sock,
    ctx.chatJid,
    category,
    ctx.prefix,
    ctx.msg,
  );
  return true;
}

async function dispatchCommand(ctx, parsed) {
  const cmd = getCommand(parsed.name);
  if (!cmd) return false;
  try {
    await cmd.execute(ctx, parsed.args, parsed.argText);
  } catch (err) {
    logger("error", `Command failed: ${cmd.name}`);
    try {
      await ctx.reply(messages.userFacingError(err));
    } catch (_) {}
  }
  return true;
}

function warnKey(groupJid, userJid) {
  return `${groupJid}:${jidToUser(userJid)}`;
}

async function handleAntilink(ctx) {
  if (!ctx.isGroup || ctx.fromMe) return false;
  const settings = db.getAntilink(ctx.chatJid);
  if (!settings.enabled) return false;
  if (!containsLink(ctx.text)) return false;

  const urls = extractUrls(ctx.text);
  const offensive = urls.length
    ? urls.some((url) => !isWhitelistedUrl(url, settings.whitelist))
    : true;
  if (!offensive) return false;

  const appSettings = db.getSettings();
  const senderIsAdmin =
    perms.isGroupAdmin(ctx.metadata, ctx.senderJid) ||
    perms.isGroupAdmin(ctx.metadata, ctx.participant);
  if (appSettings.antilinkIgnoreAdmins && senderIsAdmin) return false;
  if (appSettings.antilinkIgnoreOwner && ctx.isOwner) return false;

  const mode = settings.mode || "warn_delete";
  const key = warnKey(ctx.chatJid, ctx.senderJid);
  const last = antilinkWarns.get(key) || 0;
  const now = Date.now();
  const shouldWarn = mode !== "delete" && now - last > 15000;

  if (shouldWarn) {
    antilinkWarns.set(key, now);
    try {
      await ctx.sock.sendMessage(
        ctx.chatJid,
        {
          text: messages.withFooter(
            `Links are not allowed here, @${jidToUser(ctx.senderJid)}.`,
          ),
          mentions: [ctx.senderJid],
        },
        { quoted: ctx.msg },
      );
    } catch (_) {}
  }

  if (mode === "delete" || mode === "warn_delete") {
    if (!perms.isBotAdmin(ctx.sock, ctx.metadata)) return true;
    try {
      await ctx.sock.sendMessage(ctx.chatJid, { delete: ctx.key });
    } catch (_) {}
  }

  return true;
}

async function onMessageUpsert(sock, upsert, helpers) {
  if (!upsert) return;
  if (upsert.type && upsert.type !== "notify") return;
  const list = Array.isArray(upsert.messages) ? upsert.messages : [];
  for (const msg of list) {
    try {
      if (!msg?.message || !msg.key?.remoteJid) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;
      if (msg.message.protocolMessage) continue;

      const ts = Number(msg.messageTimestamp) || 0;
      const tsMs = ts && ts < 1e12 ? ts * 1000 : ts;
      if (tsMs && Date.now() - tsMs > 120000) continue;

      const ctx = await buildContext(sock, msg, helpers);

      if (ctx.menuCmd) {
        if (ctx.menuCmd.name === "__menu__") {
          await handleMenu(ctx);
          continue;
        }
      }

      let interactiveCmd = null;

      if (ctx.interactiveId && !String(ctx.interactiveId).startsWith("menu:")) {
        const rawId = String(ctx.interactiveId).replace(/^cmd:/, "").trim();

        if (rawId) {
          const parts = rawId.split("_");
          const commandName = parts.shift();
          const args = parts;

          if (getCommand(commandName)) {
            interactiveCmd = {
              name: commandName.toLowerCase(),
              args,
              argText: args.join(" "),
              full: rawId,
            };
          }
        }
      }

      const parsed = ctx.command || interactiveCmd || ctx.menuCmd;
      if (parsed && parsed.name !== "__menu__") {
        const handled = await dispatchCommand(ctx, parsed);
        if (handled) continue;
      }

      await handleAntilink(ctx);
    } catch (err) {
      logger("error", "Message handler failed");
    }
  }
}

function participantIds(event) {
  const raw = event?.participants || event?.participant || [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return item.id || item.jid || item.lid || "";
    })
    .filter(Boolean);
}

function formatJoinLeave(template, userJid, metadata) {
  const mention = `@${jidToUser(userJid)}`;
  return String(template || "")
    .replace(/@user/gi, mention)
    .replace(/@group/gi, metadata?.subject || "the group");
}

async function onParticipantsUpdate(sock, event, helpers) {
  try {
    if (!event?.id || !isGroupJid(event.id)) return;
    const action = String(event.action || "").toLowerCase();
    if (action !== "add" && action !== "remove") return;

    let metadata = await getMetadata(sock, event.id, helpers);
    try {
      metadata = await sock.groupMetadata(event.id);
      helpers.cacheGroupMetadata?.(event.id, metadata);
    } catch (_) {}
    const users = participantIds(event);
    if (!users.length) return;

    const stamp = `${event.id}:${action}:${users.join(",")}:${event.stamp || Date.now()}`;
    if (pendingWelcome.has(stamp)) return;
    pendingWelcome.add(stamp);
    setTimeout(() => pendingWelcome.delete(stamp), 5000);

    if (action === "add") {
      const welcome = db.getWelcome(event.id);
      if (!welcome.enabled) return;
      for (const user of users) {
        if (sameUser(user, sock.user?.id)) continue;
        const text = formatJoinLeave(welcome.message, user, metadata);
        await sock.sendMessage(event.id, {
          text: clampText(messages.withFooter(text)),
          mentions: [user],
        });
      }
    }

    if (action === "remove") {
      const goodbye = db.getGoodbye(event.id);
      if (!goodbye.enabled) return;
      for (const user of users) {
        if (sameUser(user, sock.user?.id)) continue;
        const text = formatJoinLeave(goodbye.message, user, metadata);
        await sock.sendMessage(event.id, {
          text: clampText(messages.withFooter(text)),
          mentions: [user],
        });
      }
    }
  } catch (err) {
    logger("error", "Participant update handler failed");
  }
}

function attachHandler(sock, helpers = {}) {
  if (!sock || boundSockets.has(sock)) return;
  boundSockets.add(sock);

  const onUpsert = (upsert) => onMessageUpsert(sock, upsert, helpers);
  const onParticipants = (event) => onParticipantsUpdate(sock, event, helpers);

  sock.ev.on("messages.upsert", onUpsert);
  sock.ev.on("group-participants.update", onParticipants);

  sock.__hydraHandlers = { onUpsert, onParticipants };
}

function detachHandler(sock) {
  if (!sock?.__hydraHandlers) return;
  try {
    sock.ev.off("messages.upsert", sock.__hydraHandlers.onUpsert);
    sock.ev.off(
      "group-participants.update",
      sock.__hydraHandlers.onParticipants,
    );
  } catch (_) {}
  delete sock.__hydraHandlers;
}

module.exports = {
  attachHandler,
  detachHandler,
  getCommand,
  allCommands,
};
