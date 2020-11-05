#! /usr/bin/env node

const argv_vals     = require('./translate-android-strings/process_argv')
const translate_cli = require('../lib/process_cli')

translate_cli(argv_vals)
.then(() => {
  process.exit(0)
})
.catch((e) => {
  console.log(e.message)
  process.exit(1)
})
