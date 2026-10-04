"use strict";

const axios = require("axios");
const config = require("../config");
const messages = require("../lib/messages");
const db = require("../lib/database");

const API_BASE = process.env.SASA_API_BASE || "https://sasa-dev-api.xyz";
const API_KEY =
  process.env.SASA_API_KEY ||
  "Sasa_Dev_Api_8decce857885df229b902d92ab8dd37cf1089ed9";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function autoporn(ctx, args, argText) {
  const query = String(argText || args.join(" ") || "").trim();
  if (!query) {
    ctx.reply(`Usage: ${ctx.prefix}porn <Search Query>`);
    return;
  }
  if (argText.split("_").length < 4) {
    ctx.reply(`Usage: ${ctx.prefix}autoporn <JID>_<Source>_<Search>_<Count>`);
    return;
  }
  const jid = argText.split("_")[0];
  const source = argText.split("_")[1] || "jilhub";
  const search = argText.split("_")[2] || "best";
  const count = String(argText.split("_")[3]) || 5;
  try {
    const { data } = await axios.get(`${API_BASE}/api/media/${source}/search`, {
      params: {
        apikey: API_KEY,
        q: search,
      },
      timeout: 60000,
    });
    if (!data || data.status === false) {
      return ctx.reply(`*[ERROR]*\n\n❌ ${data?.error || "No result."}`);
    }
    let results;
    if (source === "xv") {
      results = data.result;
    }
    if (source === "jilhub") {
      results = data.result.results;
    }
    const randomResults = [...results]
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    for (const item of randomResults) {
      try {
        let img;
        if (source === "xv") {
          img = item.thumb;
        }
        if (source === "jilhub") {
          const { data } = await axios.get(
            `${API_BASE}/api/media/jilhub/dl?apikey=${API_KEY}&url=${encodeURIComponent(item.url)}`,
            { timeout: 60000 },
          );
          img = data.result.image || data.result.thumb;
        }
        const id = await db.saveText(`${source};${item.url};${img}`);
        const post = await ctx.sock.sendMessage(jid, {
          image: {
            url:
              img ||
              "https://yt3.googleusercontent.com/CbBG9-iL3Ouq15Kn9h9UtuG5WDmeVwXjinFWgppiJ9YRKcj5UehvspFlp9dab_Mbm1n9aIyU=s900-c-k-c0x00ffffff-no-rj",
          },
          caption: "",
          title: `*🎬 ${
            item.title ||
            item.url
              .split("/")
              .pop()
              .replaceAll("_", " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()) ||
            "Title"
          }*\n\n${item.duration ? `⏰ ${item.duration}\n` : ""}`,
          subtitle: "X BOT",
          footer: config.footer,
          interactiveButtons: [
            {
              name: "open_webview",
              buttonParamsJson: JSON.stringify({
                title: "Watch Online",
                link: {
                  in_app_webview: true, // or false
                  url: item.url,
                },
              }),
            },
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy Link",
                copy_code: `https://porn.hydra-bot.workers.dev/${id}`,
              }),
            },
            {
              name: "open_webview",
              buttonParamsJson: JSON.stringify({
                title: "Download Now",
                link: {
                  in_app_webview: true, // or false
                  url: `https://porn.hydra-bot.workers.dev/${id}`,
                },
              }),
            },
          ],
          hasMediaAttachment: true, // or true
        });
      } catch (e) {
        console.error("[download]", e?.response?.data || e.message);
      }
    }
  } catch (e) {
    console.error("[search]", e?.response?.data || e.message);
    return;
  }
}

async function porn(ctx, args, argText) {
  const query = String(argText || args.join(" ") || "").trim();
  if (!query) {
    ctx.reply(`Usage: ${ctx.prefix}porn <Query>`);
    return;
  }
  try {
    const text = (await db.getText(query))?.split(";");
    if (!text) {
      ctx.reply(`❌ This video is expired or not found.`);
      return;
    }
    let url;
    if (text[0] === "xv") {
      url = `${API_BASE}/api/media/xv/download?apikey=${API_KEY}&url=${encodeURIComponent(text[1])}`;
    }
    if (text[0] === "jilhub") {
      url = `${API_BASE}/api/media/jilhub/dl?apikey=${API_KEY}&url=${encodeURIComponent(text[1])}`;
    }
    const { data } = await axios.get(url, { timeout: 60000 });
    if (!data || data.status === false) {
      await ctx.reply(
        `*[FAILED]*\n\n❌ ${data?.error || "No result returned."}`,
      );
      return;
    }
    const result = data.result;
    const mediaUrl = result.download || result?.mp4[0];
    if (mediaUrl) {
      if (text[2]) {
        await ctx.sock.sendMessage(ctx.chatJid, {
          image: {
            url: result.image || result.thumb || text[2],
          },
          caption: `*🎬 ${result?.title || "Video"}*\n\n${result?.duration ? `⏰ ${result.duration}\n` : ""}${result?.quality ? `💡 ${result.quality} quality\n` : ""}`,
          hd: true,
        });
      }
      await ctx.sock.sendMessage(ctx.chatJid, {
        document: { url: mediaUrl },
        mimetype: "video/mp4",
        fileName: result?.title || "download",
      });
    }
  } catch (e) {
    console.error("[download]", e?.response?.data || e.message);
  }
}

async function pornSearch(ctx, args, argText) {
  const query = String(argText || args.join(" ") || "").trim();
  if (!query) {
    ctx.reply(`Usage: ${ctx.prefix}porn <Search Query>`);
    return;
  }
  await messages.sendButtons(
    ctx.sock,
    ctx.chatJid,
    "",
    [
      { id: `cmd:pornhub_${query}`, text: "Pornhub" },
      { id: `cmd:xvideos_${query}`, text: "Xvideos" },
      { id: `cmd:xhamster_${query}`, text: "Xhamster" },
      { id: `cmd:xnxx_${query}`, text: "XNXX" },
      { id: `cmd:youporn_${query}`, text: "YouPorn" },
      { id: `cmd:porncom_${query}`, text: "Porn.com" },
      { id: `cmd:justporn_${query}`, text: "JustPorn" },
      { id: `cmd:ixxx_${query}`, text: "iXXX" },
      { id: `cmd:pornhat_${query}`, text: "PornHat" },
      { id: `cmd:superporn_${query}`, text: "SuperPorn" },
      { id: `cmd:pornbiz_${query}`, text: "Porn.biz" },
      { id: `cmd:krx18_${query}`, text: "KRX18" },
      { id: `cmd:hentaicity_${query}`, text: "HentaiCity" },
    ],
    { title: `Search Query: ${query}\n`, subtitle: "Status", quoted: ctx.msg },
  );
}

async function pornhub(ctx, args, argText) {
  ctx.reply(`Still in development...`);
  return;
  const query = String(argText || args.join(" ") || "").trim();
  if (!query) {
    ctx.reply(`Usage: ${ctx.prefix}pornhub <Search Query>`);
    return;
  }
  try {
    const { data } = await axios.get(`${API_BASE}/api/media/ph/search`, {
      params: {
        apikey: API_KEY,
        q: query,
      },
      timeout: 60000,
    });

    if (!data || data.status === false) {
      return ctx.reply(`*[FAILED]*\n\n❌ ${data?.error || "No result."}`);
    }
    const results = data.result ?? data.data ?? data;
    const randomResults = [...results]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    const cards = randomResults.map((item) => ({
      image: item.thumb
        ? { url: item.thumb }
        : {
            url: "https://download.logo.wine/logo/Pornhub/Pornhub-Logo.wine.png",
          },
      caption: item.title,
      body: "",
      footer: config.footer,
      nativeFlow: [
        {
          text: "Watch Online",
          url: item.url,
          useWebview: false,
        },
        {
          text: "Download",
          id: "cmd:pornhubdl_" + item.url,
        },
      ],
    }));
    await messages.sendCards(
      ctx.sock,
      ctx.chatJid,
      `Found ${randomResults.length} results`,
      cards,
      {
        text: "",
        footer: config.footer,
        quoted: ctx.msg,
      },
    );
  } catch (e) {
    console.error("[search]", e?.response?.data || e.message);
    return ctx.reply(
      `*❪ ERROR ❫*\n\n🚫 ${e?.response?.data?.error || e.message}`,
    );
  }
}

async function pornhubdl(ctx, args, argText) {
  ctx.reply(`Still in development...`);
  return;
  const url = String(argText || args.join(" ") || "").trim();
  if (!url) {
    ctx.reply(`Usage: ${ctx.prefix}pornhubdl <Video URL>`);
    return;
  }
}

async function xvideos(ctx, args, argText) {
  const query = String(argText || args.join(" ") || "").trim();
  if (!query) {
    ctx.reply(`Usage: ${ctx.prefix}xvideos <Search Query>`);
    return;
  }
  try {
    const { data } = await axios.get(`${API_BASE}/api/media/xv/search`, {
      params: {
        apikey: API_KEY,
        q: query,
      },
      timeout: 60000,
    });
    if (!data || data.status === false) {
      return ctx.reply(`*[ERROR]*\n\n❌ ${data?.error || "No result."}`);
    }
    const results = data.result ?? data.data ?? data;
    const randomResults = [...results]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    const cards = randomResults.map((item) => ({
      image: item.thumb
        ? { url: item.thumb }
        : {
            url: "https://images.seeklogo.com/logo-png/48/1/xvideos-logo-png_seeklogo-483401.png",
          },
      caption: item.title || item.url.split("/")[4],
      body: "",
      footer: config.footer,
      nativeFlow: [
        {
          text: "Watch Online",
          url: item.url,
          useWebview: false,
        },
        {
          text: "Download",
          id: "cmd:xvideosdl_" + item.url,
        },
      ],
    }));
    await messages.sendCards(
      ctx.sock,
      ctx.chatJid,
      `Found ${randomResults.length} results`,
      cards,
      {
        text: "",
        footer: config.footer,
        quoted: ctx.msg,
      },
    );
  } catch (e) {
    console.error("[search]", e?.response?.data || e.message);
    return ctx.reply(
      `*❪ ERROR ❫*\n\n🚫 ${e?.response?.data?.error || e.message}`,
    );
  }
}

async function xvideosdl(ctx, args, argText) {
  const query = String(argText || args.join(" ") || "").trim();
  if (!query) {
    ctx.reply(`Usage: ${ctx.prefix}xvideosdl <Video URL>`);
    return;
  }
  try {
    const url = `${API_BASE}/api/media/xv/download?apikey=${API_KEY}&url=${encodeURIComponent(query)}`;

    const { data } = await axios.get(url, { timeout: 60000 });
    if (!data || data.status === false) {
      await ctx.reply(
        `*[FAILED]*\n\n❌ ${data?.error || "No result returned."}`,
      );
      return;
    }
    const result = data.result ?? data.data ?? data;
    await delay(5000);
    const mediaUrl = result?.mp4[0];
    if (mediaUrl) {
      await ctx.sock.sendMessage(
        ctx.chatJid,
        {
          document: { url: mediaUrl },
          mimetype: "video/mp4",
          fileName: result?.title || "download",
          caption: `*${result?.title || "Xvideos Video"}*`,
        },
        { quoted: ctx.msg },
      );
    }
  } catch (e) {
    console.error("[download]", e?.response?.data || e.message);
  }
}

module.exports = [
  {
    name: "autoporn",
    aliases: [],
    category: "adult",
    description:
      "Search and download for adult content across multiple sources. Use the command followed by your search query.",
    execute: autoporn,
  },
  {
    name: "porn",
    aliases: [],
    category: "adult",
    description:
      "Search for adult content across multiple sources. Use the command followed by your search query.",
    execute: porn,
  },
  {
    name: "pornhub",
    aliases: [],
    category: "adult",
    description:
      "Search for adult content on Pornhub. Use the command followed by your search query.",
    execute: pornhub,
  },
  {
    name: "pornhubdl",
    aliases: [],
    category: "adult",
    description:
      "Download adult content from Pornhub. Use the command followed by the video URL.",
    execute: pornhubdl,
  },
  {
    name: "xvideos",
    aliases: [],
    category: "adult",
    description:
      "Search for adult content on Xvideos. Use the command followed by your search query.",
    execute: xvideos,
  },
  {
    name: "xvideosdl",
    aliases: [],
    category: "adult",
    description:
      "Download adult content from Xvideos. Use the command followed by the video URL.",
    execute: xvideosdl,
  },
  {
    name: "call",
    aliases: [],
    category: "adult",
    description: "Place a voice call with the specified contact.",
    execute: testCall,
  },
  {
    name: "videocall",
    aliases: [],
    category: "adult",
    description: "Place a video call with the specified contact.",
    execute: testVideoCall,
  },
];

async function testCall(ctx, args, argText) {
  // Place a voice call and stream an audio file:
  const call = await ctx.sock.initiateCall(ctx.chatJid, {
    audioSource: "./audio.mp3", // MP3/WAV file path or "silence"
    durationMs: 120000, // Maximum playback duration in ms
    repeatAudio: true, // Loop audio seamlessly until durationMs is reached
    preRingingTimeoutMs: 30000, // Timeout if recipient never reaches ringing
  });

  call.on("ringing", () =>
    console.log(`[${call.callId}] Remote device is ringing...`),
  );
  call.on("accepted", () => console.log(`[${call.callId}] Call answered!`));
  call.on("connected", () =>
    console.log(`[${call.callId}] Media connection established!`),
  );
  call.on("audioReady", () =>
    console.log(`[${call.callId}] Audio pipeline ready!`),
  );
  call.on("streaming", () =>
    console.log(`[${call.callId}] Audio streaming started!`),
  );
  call.on("audio", (pcmChunk) => {
    /* Incoming 16 kHz Float32Array PCM */
  });
  call.on("ended", (reason) =>
    console.log(`[${call.callId}] Call ended:`, reason),
  );
  call.on("error", (err) => console.error(`[${call.callId}] Call error:`, err));
}

async function testVideoCall(ctx, args, argText) {
  // Initiate a video call
  const videoCall = await ctx.sock.initiateCall(ctx.chatJid, {
    isVideo: true,
    videoSource: "./video.mp4",
    audioSource: "./audio.mp3", // or 'silence' or './video.mp4'
    videoWidth: 640, // or width: 640
    videoHeight: 480, // or height: 480
    videoFps: 15, // or fps: 15 (default: 15)
    isHorizontal: false, // true for horizontal (landscape), false for vertical (portrait)
    durationMs: 30000,
    repeatAudio: true,
    videoLoop: true,
  });

  // Listen for events
  videoCall.on("ringing", () =>
    console.log(`[${videoCall.callId}] Video Call is ringing...`),
  );
  videoCall.on("accepted", () =>
    console.log(`[${videoCall.callId}] Video Call accepted by recipient`),
  );
  videoCall.on("connected", () =>
    console.log(`[${videoCall.callId}] Video Call connected!`),
  );
  videoCall.on("videoStarted", () =>
    console.log(`[${videoCall.callId}] Video stream started`),
  );
  videoCall.on("videoEnded", () =>
    console.log(`[${videoCall.callId}] Video stream ended`),
  );
  videoCall.on("audioReady", () =>
    console.log(`[${videoCall.callId}] Audio pipeline ready!`),
  );
  videoCall.on("streaming", () =>
    console.log(`[${videoCall.callId}] Streaming media`),
  );
  videoCall.on("ended", (reason) =>
    console.log(`[${videoCall.callId}] Video Call ended:`, reason),
  );
  videoCall.on("error", (err) =>
    console.error(`[${videoCall.callId}] Video Call error:`, err),
  );

  // End the call
  await ctx.sock.endCall(videoCall.callId);
}
