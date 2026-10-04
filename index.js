'use strict'

const db = require('./lib/database')
const { logger } = require('./lib/utils')
const { startConnection, registerSignals } = require('./connection')
const config = require('./config')

async function main() {
  db.init()
  registerSignals()
  logger('info', `${config.botName} starting`, {
    author: config.author,
    prefix: db.getPrefix()
  })
  await startConnection()
}

main().catch(() => {
  logger('error', 'Fatal startup failure')
  process.exit(1)
})
