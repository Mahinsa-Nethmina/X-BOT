"use strict";

const fs = require("fs");
const config = require("../config");
const { logger } = require("./utils");

const DEFAULT_GROUP = {
  antilink: {
    enabled: false,
    mode: "warn_delete",
    whitelist: ["whatsapp.com", "wa.me"],
  },
  welcome: {
    enabled: false,
    message: "Welcome @user to the group! 🎉",
  },
  goodbye: {
    enabled: false,
    message: "Goodbye @user! 👋",
  },
};

const DEFAULT_DATA = {
  prefix: config.prefix,
  ownerNumber: config.ownerNumber,
  settings: {
    antilinkIgnoreAdmins: true,
    antilinkIgnoreOwner: true,
  },
  groups: {},
  data: {
    texts: {},
  },
};

let cache = null;
let writeTimer = null;
let writing = false;
let pendingWrite = false;

function ensureDirs() {
  fs.mkdirSync(config.databaseDir, { recursive: true });
  fs.mkdirSync(config.sessionDir, { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeGroup(raw) {
  const base = clone(DEFAULT_GROUP);
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    antilink: {
      enabled: Boolean(data.antilink?.enabled),
      mode: ["warn", "delete", "warn_delete"].includes(data.antilink?.mode)
        ? data.antilink.mode
        : base.antilink.mode,
      whitelist: Array.isArray(data.antilink?.whitelist)
        ? data.antilink.whitelist.map((item) => String(item).toLowerCase())
        : clone(base.antilink.whitelist),
    },
    welcome: {
      enabled: Boolean(data.welcome?.enabled),
      message: String(data.welcome?.message || base.welcome.message),
    },
    goodbye: {
      enabled: Boolean(data.goodbye?.enabled),
      message: String(data.goodbye?.message || base.goodbye.message),
    },
  };
}

function normalize(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const groups = {};
  if (data.groups && typeof data.groups === "object") {
    for (const [jid, value] of Object.entries(data.groups)) {
      if (typeof jid === "string" && jid.endsWith("@g.us")) {
        groups[jid] = mergeGroup(value);
      }
    }
  }
  return {
    prefix: String(data.prefix || config.prefix || ".").slice(0, 5) || ".",
    ownerNumber: String(data.ownerNumber || config.ownerNumber || "").replace(
      /[^\d]/g,
      "",
    ),
    settings: {
      antilinkIgnoreAdmins: data.settings?.antilinkIgnoreAdmins !== false,
      antilinkIgnoreOwner: data.settings?.antilinkIgnoreOwner !== false,
    },
    groups,
    data: {
      ...(data.data && typeof data.data === "object" ? data.data : {}),
      texts:
        data.data?.texts &&
        typeof data.data.texts === "object" &&
        !Array.isArray(data.data.texts)
          ? data.data.texts
          : {},
    },
  };
}

function readFile() {
  try {
    if (!fs.existsSync(config.databaseFile)) return clone(DEFAULT_DATA);
    const raw = fs.readFileSync(config.databaseFile, "utf8");
    return normalize(JSON.parse(raw));
  } catch (err) {
    logger("warn", "Database file unreadable, recreating store");
    return clone(DEFAULT_DATA);
  }
}

function persistSync() {
  ensureDirs();
  const tmp = `${config.databaseFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, config.databaseFile);
}

function scheduleWrite() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flush();
  }, 80);
}

function flush() {
  if (!cache) return;
  if (writing) {
    pendingWrite = true;
    return;
  }
  writing = true;
  try {
    persistSync();
  } catch (err) {
    logger("error", "Failed to persist database");
  } finally {
    writing = false;
    if (pendingWrite) {
      pendingWrite = false;
      scheduleWrite();
    }
  }
}

function init() {
  ensureDirs();
  if (!cache) cache = readFile();
  if (!fs.existsSync(config.databaseFile)) persistSync();
  return cache;
}

function getData() {
  if (!cache) init();
  return cache;
}

function save() {
  if (!cache) init();
  scheduleWrite();
}

function getPrefix() {
  return getData().prefix || config.prefix || ".";
}

function setPrefix(prefix) {
  const next = String(prefix || "")
    .trim()
    .slice(0, 5);
  if (!next) throw new Error("Prefix cannot be empty");
  getData().prefix = next;
  save();
  return next;
}

function getOwnerNumber() {
  return getData().ownerNumber || config.ownerNumber || "";
}

function setOwnerNumber(number) {
  const digits = String(number || "").replace(/[^\d]/g, "");
  if (!digits) throw new Error("Owner number is invalid");
  getData().ownerNumber = digits;
  save();
  return digits;
}

function getSettings() {
  return getData().settings;
}

function getGroup(jid) {
  const data = getData();
  if (!data.groups[jid]) {
    data.groups[jid] = clone(DEFAULT_GROUP);
    save();
  }
  return data.groups[jid];
}

function updateGroup(jid, updater) {
  const group = getGroup(jid);
  updater(group);
  save();
  return group;
}

function getAntilink(jid) {
  return getGroup(jid).antilink;
}

function setAntilinkEnabled(jid, enabled) {
  return updateGroup(jid, (group) => {
    group.antilink.enabled = Boolean(enabled);
  }).antilink;
}

function setAntilinkMode(jid, mode) {
  const allowed = ["warn", "delete", "warn_delete"];
  if (!allowed.includes(mode)) throw new Error("Invalid antilink mode");
  return updateGroup(jid, (group) => {
    group.antilink.mode = mode;
  }).antilink;
}

function getWelcome(jid) {
  return getGroup(jid).welcome;
}

function setWelcomeEnabled(jid, enabled) {
  return updateGroup(jid, (group) => {
    group.welcome.enabled = Boolean(enabled);
  }).welcome;
}

function setWelcomeMessage(jid, message) {
  const text = String(message || "").trim();
  if (!text) throw new Error("Welcome message cannot be empty");
  return updateGroup(jid, (group) => {
    group.welcome.message = text.slice(0, 1000);
  }).welcome;
}

function getGoodbye(jid) {
  return getGroup(jid).goodbye;
}

function setGoodbyeEnabled(jid, enabled) {
  return updateGroup(jid, (group) => {
    group.goodbye.enabled = Boolean(enabled);
  }).goodbye;
}

function setGoodbyeMessage(jid, message) {
  const text = String(message || "").trim();
  if (!text) throw new Error("Goodbye message cannot be empty");
  return updateGroup(jid, (group) => {
    group.goodbye.message = text.slice(0, 1000);
  }).goodbye;
}

function getTextStore() {
  const data = getData();
  if (!data.data || typeof data.data !== "object") {
    data.data = {};
  }
  if (
    !data.data.texts ||
    typeof data.data.texts !== "object" ||
    Array.isArray(data.data.texts)
  ) {
    data.data.texts = {};
  }
  return data.data.texts;
}

function generateTextId() {
  const texts = getTextStore();
  let id;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (texts[id]);
  return id;
}

function saveText(text) {
  const value = String(text ?? "");
  if (!value) {
    throw new Error("Text cannot be empty");
  }
  const texts = getTextStore();
  // Same text already exists
  for (const [id, item] of Object.entries(texts)) {
    if (item?.text === value) {
      return id;
    }
  }
  const id = generateTextId();
  texts[id] = {
    text: value,
    uses: 0,
    createdAt: new Date().toISOString(),
  };
  save();
  return id;
}

function getText(id) {
  const texts = getTextStore();
  const key = String(id).trim();
  const count = config.maxDownloadCount || 10;
  const item = texts[key];
  if (!item) {
    return null;
  }
  // 10 times use wela nam delete
  if (item.uses >= count) {
    delete texts[key];
    save();
    return null;
  }
  // Use count +1
  item.uses += 1;
  // 10th use eken passe save + delete
  if (item.uses >= count) {
    const text = item.text;
    delete texts[key];
    save();
    return text;
  }
  save();
  return item.text;
}

function deleteText(id) {
  const texts = getTextStore();
  const key = String(id).trim();
  if (!texts[key]) return false;
  delete texts[key];
  save();
  return true;
}

module.exports = {
  init,
  flush,
  getData,
  getPrefix,
  setPrefix,
  getOwnerNumber,
  setOwnerNumber,
  getSettings,
  getGroup,
  getAntilink,
  setAntilinkEnabled,
  setAntilinkMode,
  getWelcome,
  setWelcomeEnabled,
  setWelcomeMessage,
  getGoodbye,
  setGoodbyeEnabled,
  setGoodbyeMessage,
  generateTextId,
  saveText,
  getText,
  deleteText,
  DEFAULT_GROUP,
};
