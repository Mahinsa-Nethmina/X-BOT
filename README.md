# HYDRA BOT

WhatsApp bot by **HYDRA**, built with Node.js and [`@innovatorssoft/baileys`](https://github.com/innovatorssoft/Baileys).

The bot connects with **pairing code authentication** (no QR-only setup), stores session files in `session/`, and keeps group settings in a lightweight JSON database.

## Requirements

- Node.js 20 or newer
- npm
- A WhatsApp account that can use Linked Devices
- The phone number with country code (digits only)

## Installation

```bash
# Install dependencies
npm install
```

Copy the example environment file and edit it:

```bash
# Create your local config from the example
cp .env.example .env
```

## `.env` configuration

```env
BOT_NAME=HYDRA BOT
AUTHOR=HYDRA
PREFIX=.
OWNER_NUMBER=YOUR_NUMBER
PAIRING_NUMBER=
LOG_LEVEL=info
```

| Variable | Description |
| --- | --- |
| `BOT_NAME` | Display name used in menus and status messages |
| `AUTHOR` | Author label shown in menus |
| `PREFIX` | Command prefix, default `.` |
| `OWNER_NUMBER` | Owner phone number with country code, digits only |
| `PAIRING_NUMBER` | Optional. If set, used automatically when pairing |
| `LOG_LEVEL` | Console log verbosity |

Do not hardcode secrets in source files. Keep `.env` and `session/` private.

## Start the bot

```bash
# Start HYDRA BOT
npm start
```

## Pairing code authentication

1. Start the bot with `npm start`.
2. If no session exists, the bot asks for a phone number (or uses `PAIRING_NUMBER`).
3. It prints a pairing code.
4. On your phone open **WhatsApp > Linked Devices > Link with phone number**.
5. Enter the pairing code.

After a successful pair, credentials are saved in `session/` and reused on the next start.

If WhatsApp logs the device out, delete the `session/` folder and pair again. The bot will not print session contents, private keys, or credentials.

## Session and database

- Session / auth state: `session/`
- Persistent bot settings: `database/data.json`

The database stores:

- Command prefix
- Owner number
- Per-group antilink, welcome, and goodbye settings

It does not store private chat history.

## Project structure

```text
index.js
config.js
connection.js
handler.js
commands/
  general.js
  group.js
  admin.js
  owner.js
lib/
  messages.js
  permissions.js
  database.js
  utils.js
database/
session/
```

New commands should be added as objects in the matching `commands/` module:

```js
{
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Show bot latency',
  execute
}
```

## Available commands

Default prefix is `.`

### General

| Command | Aliases | Description |
| --- | --- | --- |
| `.ping` | `.p` | Response time / latency |
| `.alive` | | Bot name, author, status, uptime, latency |
| `.menu` | `.m` | Interactive categorized menu |
| `.help` | `.h` | Command list and categories |
| `.owner` | | Configured owner information |
| `.botinfo` | `.info` | Name, author, version, runtime |
| `.runtime` | `.uptime` | Bot uptime |
| `.groupinfo` | `.ginfo` | Current group information |
| `.admins` | `.adminlist` | List / mention group admins |
| `.jid` | | Current chat JID |
| `.echo <text>` | | Reply with the provided text |
| `.say <text>` | | Send the provided text |

Menus use interactive buttons / native lists from Innovators Soft Baileys. Selecting a category opens that command set.

### Group

| Command | Description |
| --- | --- |
| `.groupinfo` | Name, ID, participants, admins, creator |
| `.admins` | Mention or list administrators |
| `.tagall [message]` | Mention all participants |
| `.hidetag [message]` | Mention all members without a long visible list |
| `.welcome on/off/status/set <msg>` | Welcome messages |
| `.goodbye on/off/status/set <msg>` | Goodbye messages |

Group-only commands return:

`This command can only be used in groups.`

### Admin

These require the sender to be a group admin (or the bot owner), and the bot must itself be a group admin before performing admin actions.

| Command | Description |
| --- | --- |
| `.kick @user` | Remove a participant |
| `.add <number>` | Add a participant where WhatsApp allows it |
| `.promote @user` | Promote a participant |
| `.demote @user` | Demote a participant |
| `.setname <name>` | Change the group subject |
| `.setdesc <description>` | Change the group description |
| `.delete` | Delete / revoke a quoted message |
| `.antilink on` | Enable antilink |
| `.antilink off` | Disable antilink |
| `.antilink status` | Show antilink config |
| `.antilink mode warn\|delete\|warn_delete` | Set antilink mode |

Permission replies:

- `Only group admins can use this command.`
- `I need to be a group admin to do that.`

### Owner

Owner checks use the configured owner **number / JID**, not display names.

| Command | Description |
| --- | --- |
| `.restart` | Restart the process |
| `.shutdown` | Stop the bot |
| `.broadcast <message>` | Send a message to all groups |
| `.setprefix <prefix>` | Change the command prefix |
| `.setowner <number>` | Change the owner number |

Unauthorized users receive:

`Only the bot owner can use this command.`

## Antilink

When enabled for a group, HYDRA BOT:

- Detects HTTP/HTTPS links
- Allows a per-group domain whitelist (defaults include `whatsapp.com` and `wa.me`)
- Warns the sender
- Deletes the message when the mode includes delete and the bot is admin
- Ignores group admins and the owner by default
- Rate-limits repeated warnings

Modes: `warn`, `delete`, `warn_delete`.

## Welcome / goodbye

Enable per group with `.welcome on` and `.goodbye on`.

Default templates:

- Welcome `@user` to the group!
- Goodbye `@user`!

Use `@user` and `@group` in custom messages.

## Group / admin permissions

Reusable checks live in `lib/permissions.js`:

- `isOwner()`
- `isGroup()`
- `isGroupAdmin()`
- `isBotAdmin()`

The bot never assumes it has admin rights. Group metadata is read before mentions or admin operations.

## Troubleshooting

**The bot asks for a pairing code every start**

The `session/` folder is missing, empty, or was logged out. Pair again and do not delete `session/` while the bot is running.

**`401` / logged out**

WhatsApp invalidated the device. Remove `session/` and generate a new pairing code.

**Buttons do not appear**

Some WhatsApp clients hide older button types. HYDRA BOT uses Innovators Soft interactive messages (`quick_reply` / `single_select`) and falls back to text if a type is rejected.

**Kick / promote fails**

Confirm both the sender and the bot are group admins. WhatsApp also blocks some add operations depending on privacy settings.

**Antilink does not delete messages**

The bot must be a group admin. Mode must be `delete` or `warn_delete`.

**Reconnect loop**

Temporary disconnects reconnect with backoff. Permanent logout is not retried.

## Security notes

- Never commit `.env` or `session/`
- Never print credentials, session files, or private keys
- Owner commands are number-based
- Command errors are caught and are not sent as stack traces
- SIGINT / SIGTERM shut the socket down cleanly

## License

MIT. Created by HYDRA.
