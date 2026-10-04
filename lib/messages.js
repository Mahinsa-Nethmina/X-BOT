"use strict";

const config = require("../config");
const { clampText, logger, safeError } = require("./utils");

const FOOTER = config.footer;

function withFooter(text) {
  const body = String(text || "").trim();
  if (body.includes("Created by HYDRA")) return body;
  return `${body}`;
}

async function sendText(sock, jid, text, options = {}) {
  if (!sock || !jid) return null;
  try {
    return await sock.sendMessage(
      jid,
      { text: clampText(withFooter(text)) },
      options,
    );
  } catch (err) {
    logger("error", "Failed to send text message");
    throw err;
  }
}

async function reply(sock, jid, text, quoted, extra = {}) {
  return sendText(sock, jid, text, { quoted, ...extra });
}

async function react(sock, jid, emoji, msg) {
  try {
    return await sock.sendMessage(jid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (err) {
    logger("error", "Failed to send reaction");
    throw err;
  }
}

async function sendCard(sock, jid, card, options = {}) {
  if (!sock || !jid || !card) return null;
  try {
    const baileys = require("@innovatorssoft/baileys");
    return await sock.sendMessage(
      jid,
      baileys.createContactCard(card),
      options,
    );
  } catch (err) {
    logger("error", "Failed to send card message");
    throw err;
  }
}

function mappedButtons(buttons) {
  return (Array.isArray(buttons) ? buttons : []).slice(0, 3).map((btn) => ({
    id: String(btn.id || btn.buttonId || ""),
    displayText: String(btn.text || btn.displayText || "Button"),
  }));
}

function quickReplyButtons(body, buttons, extra = {}) {
  const mapped = mappedButtons(buttons);
  try {
    const baileys = require("@innovatorssoft/baileys");
    if (typeof baileys.generateQuickReplyButtons === "function") {
      return baileys.generateQuickReplyButtons(clampText(body), mapped, {
        footer: extra.footer || FOOTER,
        title: extra.title || config.botName,
      });
    }
  } catch (_) {}

  return {
    text: clampText(body),
    title: extra.title || config.botName,
    subtitle: extra.subtitle || `Author: ${config.author}`,
    footer: extra.footer || FOOTER,
    interactiveButtons: mapped.map((btn) => ({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: btn.displayText,
        id: btn.id,
      }),
    })),
  };
}

function listMessage({ title, description, buttonText, sections, footer }) {
  return {
    text: clampText(description || title || config.botName),
    footer: footer || FOOTER,
    title: title || config.botName,
    buttonText: buttonText || "Open Menu",
    sections: Array.isArray(sections) ? sections : [],
  };
}

function nativeListButtons(
  body,
  { title, buttonText, sections, footer, subtitle },
) {
  return {
    text: clampText(body),
    title: title || config.botName,
    subtitle: subtitle || `Author: ${config.author}`,
    footer: footer || FOOTER,
    interactiveButtons: [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: buttonText || "Open Menu",
          sections: Array.isArray(sections) ? sections : [],
        }),
      },
    ],
  };
}

async function sendButtons(sock, jid, body, buttons, options = {}) {
  const content = quickReplyButtons(body, buttons, options);
  try {
    return await sock.sendMessage(
      jid,
      content,
      options.quoted ? { quoted: options.quoted } : undefined,
    );
  } catch (err) {
    logger("warn", "Interactive buttons unavailable, falling back to text");
    const fallback = [
      body,
      "",
      ...(buttons || []).map((btn) => {
        const id = String(btn.id || "");
        const hint = id.startsWith("menu:")
          ? `.menu ${id.slice(5)}`
          : `.${id.replace(/^cmd:/, "")}`;
        return `• ${btn.text}  →  ${hint}`;
      }),
    ].join("\n");
    return sendText(
      sock,
      jid,
      fallback,
      options.quoted ? { quoted: options.quoted } : undefined,
    );
  }
}

async function sendList(sock, jid, payload, options = {}) {
  try {
    const baileys = require("@innovatorssoft/baileys");
    if (typeof baileys.generateInteractiveListMessage === "function") {
      const generated = baileys.generateInteractiveListMessage({
        title: payload.title || config.botName,
        buttonText: payload.buttonText || "Open Menu",
        description: payload.description || payload.text || "",
        footer: payload.footer || FOOTER,
        sections: payload.sections || [],
      });
      return await sock.sendMessage(jid, generated, options);
    }
  } catch (_) {}
  try {
    return await sock.sendMessage(
      jid,
      nativeListButtons(payload.description || payload.text, payload),
      options,
    );
  } catch (err) {
    try {
      return await sock.sendMessage(jid, listMessage(payload), options);
    } catch (inner) {
      logger("warn", "List message unavailable, falling back to text");
      const lines = [
        payload.title || config.botName,
        payload.description || "",
      ];
      for (const section of payload.sections || []) {
        lines.push("", `*${section.title}*`);
        for (const row of section.rows || []) {
          lines.push(
            `• ${row.title}${row.description ? ` — ${row.description}` : ""}`,
          );
        }
      }
      return sendText(sock, jid, lines.join("\n"), options);
    }
  }
}

async function sendCards(sock, jid, body, cards, options = {}) {
  if (!sock || !jid || !Array.isArray(cards)) return null;

  const content = {
    text: clampText(body),
    title: options.title || config.botName,
    subtitle: options.subtitle || `Author: ${config.author}`,
    footer: options.footer || FOOTER,
    cards,
  };

  try {
    return await sock.sendMessage(
      jid,
      content,
      options.quoted ? { quoted: options.quoted } : undefined,
    );
  } catch (err) {
    logger("error", "Failed to send cards message");
    throw err;
  }
}

function mainMenuContent(prefix) {
  return {
    title: `${config.botName} Menu`,
    description: [
      `*${config.botName}*`,
      `Author: *${config.author}*`,
      `Prefix: *${prefix}*`,
      "",
      "Choose a category below. Buttons open the matching command set.",
    ].join("\n"),
    buttonText: "Open Categories",
    sections: [
      {
        title: "Categories",
        rows: [
          {
            header: "General",
            title: "General Menu",
            description: "Ping, alive, help, bot info",
            id: "menu:general",
          },
          {
            header: "Group",
            title: "Group Menu",
            description: "Group info, tag, welcome",
            id: "menu:group",
          },
          {
            header: "Admin",
            title: "Admin Menu",
            description: "Kick, promote, antilink",
            id: "menu:admin",
          },
          {
            header: "Owner",
            title: "Owner Menu",
            description: "Restart, broadcast, settings",
            id: "menu:owner",
          },
          {
            header: "Help",
            title: "Help",
            description: "Full command list",
            id: "menu:help",
          },
        ],
      },
    ],
  };
}

function generalMenuText(prefix) {
  return [
    `*${config.botName}* — General`,
    `Author: *${config.author}*`,
    "",
    `*${prefix}ping* — Bot latency`,
    `*${prefix}alive* — Online status`,
    `*${prefix}menu* — Interactive menu`,
    `*${prefix}help* — Command list`,
    `*${prefix}owner* — Owner info`,
    `*${prefix}botinfo* — Bot details`,
    `*${prefix}runtime* — Uptime`,
    `*${prefix}jid* — Chat JID`,
    `*${prefix}echo <text>* — Quote reply`,
    `*${prefix}say <text>* — Send text`,
  ].join("\n");
}

function groupMenuText(prefix) {
  return [
    `*${config.botName}* — Group`,
    "",
    `*${prefix}groupinfo* — Group details`,
    `*${prefix}admins* — List admins`,
    `*${prefix}tagall [msg]* — Mention everyone`,
    `*${prefix}hidetag [msg]* — Hidden mention`,
    `*${prefix}welcome on/off/status*`,
    `*${prefix}goodbye on/off/status*`,
  ].join("\n");
}

function adminMenuText(prefix) {
  return [
    `*${config.botName}* — Admin`,
    "",
    `*${prefix}kick @user* — Remove member`,
    `*${prefix}add <number>* — Add member`,
    `*${prefix}promote @user* — Make admin`,
    `*${prefix}demote @user* — Remove admin`,
    `*${prefix}setname <name>* — Change subject`,
    `*${prefix}setdesc <text>* — Change description`,
    `*${prefix}delete* — Delete quoted message`,
    `*${prefix}antilink on/off/status*`,
  ].join("\n");
}

function ownerMenuText(prefix) {
  return [
    `*${config.botName}* — Owner`,
    "",
    `*${prefix}restart* — Restart the bot`,
    `*${prefix}shutdown* — Stop the bot`,
    `*${prefix}broadcast <msg>* — Message all groups`,
    `*${prefix}setprefix <prefix>* — Change prefix`,
    `*${prefix}setowner <number>* — Change owner`,
  ].join("\n");
}

function helpText(prefix) {
  return [
    `*${config.botName}* Help`,
    `Author: *${config.author}*`,
    `Prefix: *${prefix}*`,
    "",
    generalMenuText(prefix),
    "",
    groupMenuText(prefix),
    "",
    adminMenuText(prefix),
    "",
    ownerMenuText(prefix),
  ].join("\n");
}

async function sendMainMenu(sock, jid, prefix, quoted) {
  const content = mainMenuContent(prefix);
  await sendList(sock, jid, content, quoted ? { quoted } : undefined);
  await sendButtons(
    sock,
    jid,
    [`*${config.botName}*`, "Tap a category to open its commands."].join("\n"),
    [
      { id: "menu:general", text: "General" },
      { id: "menu:group", text: "Group" },
      { id: "menu:admin", text: "Admin" },
    ],
    { quoted, title: config.botName, subtitle: "Main Menu" },
  );
}

async function sendCategoryMenu(sock, jid, category, prefix, quoted) {
  const map = {
    general: generalMenuText,
    group: groupMenuText,
    admin: adminMenuText,
    owner: ownerMenuText,
    help: helpText,
  };
  const renderer = map[category] || helpText;
  const buttons = [
    { id: "menu:main", text: "Main Menu" },
    { id: "menu:help", text: "Help" },
    { id: "menu:general", text: "General" },
  ];
  return sendButtons(sock, jid, renderer(prefix), buttons, {
    quoted,
    title: `${config.botName} — ${String(category).toUpperCase()}`,
    subtitle: `Prefix: ${prefix}`,
  });
}

function extractInteractiveId(message) {
  if (!message || typeof message !== "object") return "";

  const buttons = message.buttonsResponseMessage;
  if (buttons?.selectedButtonId) return String(buttons.selectedButtonId);

  const template = message.templateButtonReplyMessage;
  if (template?.selectedId) return String(template.selectedId);

  const list = message.listResponseMessage;
  const rowId = list?.singleSelectReply?.selectedRowId || list?.title;
  if (rowId) return String(rowId);

  const interactive = message.interactiveResponseMessage;
  if (interactive) {
    const native = interactive.nativeFlowResponseMessage;
    if (native?.paramsJson) {
      try {
        const parsed = JSON.parse(native.paramsJson);
        return String(
          parsed.id ||
            parsed.selectedId ||
            parsed.rowId ||
            parsed.selectedRowId ||
            "",
        );
      } catch (_) {}
    }
    if (interactive.body?.text) return String(interactive.body.text);
  }

  return "";
}

function userFacingError(err) {
  return `Operation failed: ${safeError(err)}`;
}

module.exports = {
  FOOTER,
  withFooter,
  sendText,
  reply,
  react,
  sendButtons,
  sendList,
  sendCard,
  sendCards,
  sendMainMenu,
  sendCategoryMenu,
  mainMenuContent,
  generalMenuText,
  groupMenuText,
  adminMenuText,
  ownerMenuText,
  helpText,
  extractInteractiveId,
  userFacingError,
};
