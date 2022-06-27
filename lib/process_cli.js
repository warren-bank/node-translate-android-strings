const translate       = require('@warren-bank/ibm-watson-language-translator')
const DuplicatesStore = require('@warren-bank/ibm-watson-language-translator/lib/optimize-duplicates/duplicates_store')

const path = require('path')
const fs   = require('fs')

// -----------------------------------------------------------------------------

const regex = {
  "file_ext": /(\.[^\.]+)$/,
  "entity":   /\<\!ENTITY\s+\S+\s+"([^"]+)"\s*\/?\>/igd,
  "string":   /\<string([^\>]+)\>(.+?)\<\/string\>/ig,
  "string_array": {
    "one_liner": /\<string-array([^\>]+)\>(.+?)\<\/string-array\>/ig,
    "tag_start": /\<string-array([^\>]+)\>(.*)$/ig,
    "tag_end":   /^(.*?)\<\/string-array\>/ig,
    "item":      /\<item[^\>]*\>(.+?)\<\/item\>/ig
  },
  "exclude": {
    "not_translatable": /\stranslatable="false"/i,
    "has_string_alias": /^@string\//
  },
  "split": {  // CRLF and LF, TAB, XML entity value, XML tag (opening and closing, including attributes, excluding contents), formatting string (https://developer.android.com/guide/topics/resources/string-resource.html#formatting-strings)
    "all": /(?:(?:\\r)?\\n|\\t|&\S+;|\<\/?[^\>]*?\>|(?<=^|\s*)\%(?:\d+\$)?[a-zA-Z]*?(?:\d+(?:\.\d+)?)?[a-zA-Z]+(?=\s*|$))/g
  },
  "format": { // https://developer.android.com/guide/topics/resources/string-resource.html#FormattingAndStyling
    "is_wrapped_in_double_quotes": /^"(.+)"$/,
    "has_escape": /\\(['"@\?])/g,
    "non_escape": /(?<!\\)(['"@\?])/g
  },
  "trim": {
    "whitespace_or_punctuation_from_start": /^(?:[\s\uFEFF\xA0]|[\x20-\x2f]|[\x3a-\x40]|[\x5b-\x60]|[\x7b-\x7e])+/g,
    "whitespace_or_punctuation_from_end":    /(?:[\s\uFEFF\xA0]|[\x20-\x2f]|[\x3a-\x40]|[\x5b-\x60]|[\x7b-\x7e])+$/g
  },
  "filter": {
    "xml_comment": /\<\!--.*?--\>/g
  }
}

let   all_lines      = []  // array of string
const translatable   = []  // array of {index: line_number, value: string, skip_offset: integer: skip_tokens: integer} => 'value' is a translatable string
const non_exportable = []  // array of {index: line_number, value: string, skip_offset: integer: skip_tokens: integer} => 'value' is an XML tag to censor from output files
                           //   => 'skip_offset' and 'skip_tokens' are both relative to the START of the corresponding 'line_number' (ie: they are not additive)

// ----------------------------------------------------------------------------- helper utilities:

const split_translatable_value = function(value, separator = regex.split.all) {
  return value
    .split(separator)
    .filter(chunk => !!chunk)
    .map(chunk => chunk.replace(regex.trim.whitespace_or_punctuation_from_start, '').replace(regex.trim.whitespace_or_punctuation_from_end, ''))
    .filter(chunk => !!chunk)
}

const remove_escape_characters = function(str) {
  return str
    .replace(regex.format.is_wrapped_in_double_quotes, '$1')
    .replace(regex.format.has_escape, '$1')
}

const add_escape_characters = function(str) {
  return str
    .replace(regex.format.non_escape, '\\$1')
    .replace(/\</g, '&lt;')
    .replace(/\&/g, '&amp;')
}

const replace_values_in_string = function(string, line_index, search_index, search_values, replace_values, token) {
  let modified = false

  let search_value, skip_offset, skip_tokens, replace_value

  while ((search_index < search_values.length) && (search_values[search_index].index === line_index)) {
    modified     = true
    search_value = search_values[search_index]
    skip_offset  = search_value.skip_offset || 0
    skip_tokens  = search_value.skip_tokens || 0

    replace_value = Array.isArray(replace_values)
      ? replace_values.shift()
      : replace_values

    while (token && skip_tokens) {
      let new_offset = string.indexOf(token, skip_offset) + 1

      if (new_offset > skip_offset)
        skip_offset = new_offset

      skip_tokens--
    }

    if (skip_offset > 0) {
      let done = string.substring(0, skip_offset)
      let todo = string.substring(skip_offset)

      string = done + todo.replace(search_value.value, replace_value)
    }
    else {
      string = string.replace(search_value.value, replace_value)
    }

    search_index++
  }

  return {string, index: search_index, modified}
}

// ----------------------------------------------------------------------------- export:

const process_cli = async function(argv_vals) {
  all_lines = fs.readFileSync(argv_vals["--input-file"], {encoding: 'utf8'})
  all_lines = all_lines.split(/\r?\n/)

  let translatable_value_separator = regex.split.all
  if (Array.isArray(argv_vals["--blacklist"]) && argv_vals["--blacklist"].length) {
    try {
      translatable_value_separator = new RegExp(`${regex.split.all.source.slice(0, -1)}|${argv_vals["--blacklist"].join('|')})`, 'g')
    }
    catch(e) {
      if (argv_vals["--debug"]) {
        console.log('ERROR:', 'Failed to compile substring regex patterns in blacklist!')
        console.log(`  blacklist = /(?:${argv_vals["--blacklist"].join('|')})/g`)
        throw new Error('')
      }
      else {
        throw new Error('ERROR: Failed to compile substring regex patterns in blacklist!')
      }
    }
  }

  let line
  let array_context = 0

  for (let i=0; i < all_lines.length; i++) {
    line          = all_lines[i]
    array_context = process_input_line(i, 0, line, argv_vals, translatable_value_separator, array_context)
  }

  if (array_context > 0)
    throw new Error('ERROR: Input file contains a string-array with no closing tag!')

  if (!translatable.length)
    throw new Error('ERROR: Failed to extract strings from input file')

  const input_strings_array = get_input_strings_array()

  if (!Array.isArray(input_strings_array) || (input_strings_array.length !== translatable.length))
    throw new Error('ERROR: Failed to extract strings from input file')

  // dedupe input strings
  const duplicates_store = new DuplicatesStore(input_strings_array)
  const deduped_input_strings_array = duplicates_store.dehydrate_input_strings_array()

  if (argv_vals["--debug"])
    fs.writeFileSync(path.join(argv_vals["--output-directory"], `debug.${argv_vals["--input-language"]}.txt`), JSON.stringify(deduped_input_strings_array, null, 2), {encoding: 'utf8', flag: 'w'})

  // useful for debugging (ex: -i "en" -o "en" --debug)
  if ((argv_vals["--output-language"].length === 1) && (argv_vals["--output-language"][0] === argv_vals["--input-language"])) return

  for (let i=0; i < argv_vals["--output-language"].length; i++) {
    const output_language_code = argv_vals["--output-language"][i]
    const file_output          = get_output_filepath(argv_vals, output_language_code)

    if (argv_vals["--no-clobber"]) {
      if (fs.existsSync(file_output))
        continue
    }

    const deduped_translated_strings_array = await translate(
      argv_vals["--api-key"],
      argv_vals["--api-url"],
      argv_vals["--input-language"],
      output_language_code,
      deduped_input_strings_array
    )

    if (argv_vals["--debug"])
      fs.writeFileSync(path.join(argv_vals["--output-directory"], `debug.${output_language_code}.txt`), JSON.stringify(deduped_translated_strings_array, null, 2), {encoding: 'utf8', flag: 'w'})

    if (deduped_translated_strings_array.length !== deduped_input_strings_array.length) {
      if (argv_vals["--debug"]) {
        console.log('ERROR:', `Number of "${output_language_code}" translated strings is incorrect!`, `Expected #${deduped_input_strings_array.length} but received #${deduped_translated_strings_array.length} from server.`, {deduped_translated_strings_array})
        throw new Error('')
      }
      else {
        throw new Error(`ERROR: Number of "${output_language_code}" translated strings is incorrect!`)
      }
    }

    const translated_strings_array = duplicates_store.rehydrate_translated_strings_array(deduped_translated_strings_array)

    if (translated_strings_array.length !== input_strings_array.length) {
      if (argv_vals["--debug"]) {
        console.log('ERROR:', `Number of "${output_language_code}" translated strings is incorrect!`, `Expected #${input_strings_array.length} but received #${translated_strings_array.length} from duplicates store.`, {translated_strings_array})
        throw new Error('')
      }
      else {
        throw new Error(`ERROR: Number of "${output_language_code}" translated strings is incorrect!`)
      }
    }

    const text_output = get_output_text_translation(argv_vals, translated_strings_array)

    if (argv_vals["--make-resource-dirs"]) {
      const resource_dir = path.dirname(file_output)

      if (!fs.existsSync(resource_dir))
        fs.mkdirSync(resource_dir)
    }

    fs.writeFileSync(file_output, text_output, {encoding: 'utf8', flag: 'w'})
  }
}

// -----------------------------------------------------------------------------

// array_context
//   0: not currently processing a string-array
//   1: is currently processing a string-array with CLI option '--no-arrays'
//   2: is currently processing a string-array that is NOT translatable
//   3: is currently processing a string-array that is translatable
const process_input_line = function(i, initial_offset, line, argv_vals, translatable_value_separator, array_context) {
  if (array_context > 0) {
    const matches = regex.string_array.tag_end.exec(line)

    if (array_context === 1) {
      const xml = (matches === null)
        ? line
        : matches[0]

      non_exportable.push({index: i, value: xml, skip_offset: initial_offset, skip_tokens: 0})
    }

    else if (array_context === 2) {
      if (!argv_vals["--non-translatable"]) {
        const xml = (matches === null)
          ? line
          : matches[0]

        non_exportable.push({index: i, value: xml, skip_offset: initial_offset, skip_tokens: 0})
      }
    }

    else if (array_context === 3) {
      const items = (matches === null)
        ? line
        : matches[1]

      items.replace(regex.string_array.item, function(xml, value, item_offset) {
        const offset = initial_offset + item_offset

        if (regex.exclude.has_string_alias.test(value)) {
          //if (!argv_vals["--alias"])
          //  non_exportable.push({index: i, value: xml, skip_offset: offset, skip_tokens: 0})

          return ''
        }

        split_translatable_value(value, translatable_value_separator).forEach(chunk => {
          translatable.push({index: i, value: chunk, skip_offset: offset, skip_tokens: 1})
        })

        return ''
      })
    }

    let remainder_offset, remainder_line
    if (matches !== null) {
      array_context  = 0
      remainder_offset  = matches.index + matches[0].length
      remainder_line    = line.substring(remainder_offset).trim()
      remainder_offset += initial_offset
    }

    return (remainder_line)
      ? process_input_line(i, remainder_offset, remainder_line, argv_vals, translatable_value_separator, 0)
      : array_context
  }

  {
    const matches = []
    let match
    while (match = regex.entity.exec(line)) {
      matches.push({value: match[1], match_offset: match['indices'][1][0]})
    }
    while (matches.length) {
      // process in reverse order: from last match in line to first
      match = matches.pop()
      split_translatable_value(match.value, translatable_value_separator).forEach(chunk => {
        translatable.push({index: i, value: chunk, skip_offset: (initial_offset + match.match_offset), skip_tokens: 0})
      })
    }
  }

  line.replace(regex.string, function(xml, xml_attributes, value, string_offset) {
    const offset = initial_offset + string_offset

    if (regex.exclude.not_translatable.test(xml_attributes)) {
      if (!argv_vals["--non-translatable"])
        non_exportable.push({index: i, value: xml, skip_offset: offset, skip_tokens: 0})

      return ''
    }

    if (regex.exclude.has_string_alias.test(value)) {
      if (!argv_vals["--alias"])
        non_exportable.push({index: i, value: xml, skip_offset: offset, skip_tokens: 0})

      return ''
    }

    split_translatable_value(value, translatable_value_separator).forEach(chunk => {
      translatable.push({index: i, value: chunk, skip_offset: offset, skip_tokens: 1})
    })

    return ''
  })

  line.replace(regex.string_array.one_liner, function(xml, xml_attributes, items, array_offset) {
    array_offset += initial_offset

    if (argv_vals["--no-arrays"]) {
      non_exportable.push({index: i, value: xml, skip_offset: array_offset, skip_tokens: 0})

      return ''
    }

    if (regex.exclude.not_translatable.test(xml_attributes)) {
      if (!argv_vals["--non-translatable"])
        non_exportable.push({index: i, value: xml, skip_offset: array_offset, skip_tokens: 0})

      return ''
    }

    const items_offset = array_offset + ('<string-array>').length + xml_attributes.length

    items.replace(regex.string_array.item, function(xml, value, item_offset) {
      const offset = items_offset + item_offset

      if (regex.exclude.has_string_alias.test(value)) {
        //if (!argv_vals["--alias"])
        //  non_exportable.push({index: i, value: xml, skip_offset: offset, skip_tokens: 0})

        return ''
      }

      split_translatable_value(value, translatable_value_separator).forEach(chunk => {
        translatable.push({index: i, value: chunk, skip_offset: offset, skip_tokens: 1})
      })

      return ''
    })

    return ''
  })

  //if (array_context === 0)
  {
    const matches = regex.string_array.tag_start.exec(line)

    if (matches === null)
      return 0

    const xml            = matches[0]
    const xml_attributes = matches[1]
    const items          = matches[2].trim()
    const array_offset   = matches.index + initial_offset

    if (argv_vals["--no-arrays"]) {
      non_exportable.push({index: i, value: xml, skip_offset: array_offset, skip_tokens: 0})

      return 1
    }

    if (regex.exclude.not_translatable.test(xml_attributes)) {
      if (!argv_vals["--non-translatable"])
        non_exportable.push({index: i, value: xml, skip_offset: array_offset, skip_tokens: 0})

      return 2
    }

    const items_offset = array_offset + ('<string-array>').length + xml_attributes.length

    return (items)
      ? process_input_line(i, items_offset, items, argv_vals, translatable_value_separator, 3)
      : 3
  }
}

// -----------------------------------------------------------------------------

const get_input_strings_array = function() {
  let strings  = []
  let index_tr = 0

  for (let i=0; i < all_lines.length; i++) {
    while ((index_tr < translatable.length) && (translatable[index_tr].index === i)) {
      strings.push(translatable[index_tr].value)
      index_tr++
    }
  }

  strings = strings.map(remove_escape_characters)

  return strings
}

// -----------------------------------------------------------------------------

const get_output_text_translation = function(argv_vals, translations) {
  if (translations.length !== translatable.length) {
    if (argv_vals["--debug"]) {
      console.log('ERROR:', 'Number of translated strings is incorrect!', `Expected #${translatable.length} but received #${translations.length} from server.`, {translations})
      throw new Error('')
    }
    else {
      throw new Error('ERROR: Number of translated strings is incorrect!')
    }
  }

  translations = translations.map(add_escape_characters)

  const lines = []

  const index = {
    translatable:   0,
    non_exportable: 0
  }

  let line, filtered, result

  for (let i=0; i < all_lines.length; i++) {
    line     = all_lines[i]
    filtered = false

    result               = replace_values_in_string(line, i, index.translatable,   translatable, translations, '>')
    line                 = result.string
    index.translatable   = result.index

    result               = replace_values_in_string(line, i, index.non_exportable, non_exportable, '', '')
    line                 = result.string
    filtered             = result.modified
    index.non_exportable = result.index

    if (argv_vals["--no-comments"] && regex.filter.xml_comment.test(line)) {
      line     = line.replace(regex.filter.xml_comment, '')
      filtered = true
    }

    if (argv_vals["--no-whitespace"])
      filtered = true

    if (!filtered || (line.trim() !== ''))
      lines.push(line)
  }

  return lines.join("\n")
}

// -----------------------------------------------------------------------------

const get_output_filepath = function(argv_vals, output_language_code) {
  let dname, fname
  dname = ''
  fname = path.basename(argv_vals["--input-file"])

  if (argv_vals["--make-resource-dirs"]) {
    dname = `values-${output_language_code.replace('-', '-r')}`
  }
  else {
    fname = regex.file_ext.test(fname)
      ? fname.replace(regex.file_ext, `.${output_language_code}$1`)
      : (fname + `.${output_language_code}.xml`)
  }

  return path.join(argv_vals["--output-directory"], dname, fname)
}

// -----------------------------------------------------------------------------

module.exports = process_cli
