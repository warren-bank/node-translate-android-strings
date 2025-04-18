const process_argv = require('@warren-bank/node-process-argv')
const path         = require('path')

const argv_flags = {
  "--help":               {bool: true},
  "--version":            {bool: true},
  "--api-key":            {},
  "--api-url":            {},
  "--input-language":     {},
  "--output-language":    {many: true},
  "--input-file":         {file: "path-exists"},
  "--output-directory":   {file: "path-dirname-exists"},
  "--make-resource-dirs": {bool: true},
  "--blacklist":          {many: true},
  "--alias":              {bool: true},
  "--non-translatable":   {bool: true},
  "--no-arrays":          {bool: true},
  "--no-comments":        {bool: true},
  "--no-whitespace":      {bool: true},
  "--no-clobber":         {bool: true},
  "--no-break-on-error":  {bool: true},
  "--debug":              {bool: true}
}

const argv_flag_aliases = {
  "--help":               ["-h"],
  "--version":            ["-v"],
  "--api-key":            ["-k"],
  "--api-url":            ["-u"],
  "--input-language":     ["-i"],
  "--output-language":    ["-o"],
  "--input-file":         ["-f"],
  "--output-directory":   ["-d"],
  "--make-resource-dirs": ["-m"],
  "--blacklist":          ["-b"],
  "--alias":              ["-a"],
  "--non-translatable":   ["-n"],
  "--no-arrays":          ["--na"],
  "--no-comments":        ["--nc"],
  "--no-whitespace":      ["--nw"],
  "--no-clobber":         ["--nr", "--no-replace"],
  "--no-break-on-error":  ["--nb", "--no-break"]
}

let argv_vals = {}

try {
  argv_vals = process_argv(argv_flags, argv_flag_aliases)
}
catch(e) {
  console.log('ERROR: ' + e.message)
  process.exit(1)
}

if (argv_vals["--help"]) {
  const help = require('./help')
  console.log(help)
  process.exit(0)
}

if (argv_vals["--version"]) {
  const data = require('../../package.json')
  console.log(data.version)
  process.exit(0)
}

argv_vals["--api-key"] = argv_vals["--api-key"] || process.env["LIBRE_TRANSLATE_API_KEY"]
argv_vals["--api-url"] = argv_vals["--api-url"] || process.env["LIBRE_TRANSLATE_API_URL"]

if (!argv_vals["--api-key"]) {
  argv_vals["--api-key"] = null
}

if (!argv_vals["--api-url"]) {
  argv_vals["--api-url"] = 'https://libretranslate.com'
}

if (!argv_vals["--input-language"]) {
  console.log('ERROR: Language code for input file is required')
  process.exit(1)
}

if (!argv_vals["--output-language"] || !argv_vals["--output-language"].length) {
  // library will populate an array of all supported output languages
  argv_vals["--output-language"] = null
}

if (!argv_vals["--input-file"]) {
  console.log('ERROR: Path to input file is required')
  process.exit(1)
}

if (!argv_vals["--output-directory"]) {
  argv_vals["--output-directory"] = path.dirname(argv_vals["--input-file"])
}

module.exports = argv_vals
