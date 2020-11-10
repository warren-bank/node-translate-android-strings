const translate = require('@warren-bank/ibm-watson-language-translator')

const path = require('path')
const fs   = require('fs')

const regex = {
  "file_ext": /(\.[^\.]+)$/,
  "entity":   /\<\!ENTITY\s+\S+\s+"([^"]+)"\s*\/?\>/ig,
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
const translatable   = []  // array of {index: line_number, value: text}
const non_exportable = []  // array of {index: line_number, xml: text}

const split_translatable_value = function(value, separator = regex.split.all) {
  return value
    .split(separator)
    .map(chunk => chunk.replace(regex.trim.whitespace_or_punctuation_from_start, '').replace(regex.trim.whitespace_or_punctuation_from_end, ''))
    .filter(chunk => chunk)
}

const remove_escape_characters = function(str) {
  return str
    .replace(regex.format.is_wrapped_in_double_quotes, '$1')
    .replace(regex.format.has_escape, '$1')
}

const add_escape_characters = function(str) {
  return str
    .replace(regex.format.non_escape, '\\$1')
}

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

  let index_tr = 0
  let index_no = 0
  let line, filtered, translation

  for (let i=0; i < all_lines.length; i++) {
    line     = all_lines[i]
    filtered = false

    while ((index_tr < translatable.length) && (translatable[index_tr].index === i)) {
      translation = translations.shift()
      line        = line.replace(translatable[index_tr].value, translation)
      index_tr++
    }

    while ((index_no < non_exportable.length) && (non_exportable[index_no].index === i)) {
      filtered = true
      line     = line.replace(non_exportable[index_no].xml, '')
      index_no++
    }

    if (argv_vals["--no-comments"] && regex.filter.xml_comment.test(line)) {
      filtered = true
      line     = line.replace(regex.filter.xml_comment, '')
    }

    if (argv_vals["--no-whitespace"])
      filtered = true

    if (!filtered || (line.trim() !== ''))
      lines.push(line)
  }

  return lines.join("\n")
}

const get_output_filepath = function(argv_vals, output_language_code){
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

// array_context
//   0: not currently processing a string-array
//   1: is currently processing a string-array with CLI option '--no-arrays'
//   2: is currently processing a string-array that is NOT translatable
//   3: is currently processing a string-array that is translatable
const process_input_line = function(i, line, argv_vals, translatable_value_separator, array_context){
  if (array_context > 0) {
    const matches = regex.string_array.tag_end.exec(line)

    if (array_context === 1) {
      const xml = (matches === null)
        ? line
        : matches[0]

      non_exportable.push({index: i, xml})
    }

    else if (array_context === 2) {
      if (!argv_vals["--non-translatable"]) {
        const xml = (matches === null)
          ? line
          : matches[0]

        non_exportable.push({index: i, xml})
      }
    }

    else if (array_context === 3) {
      const items = (matches === null)
        ? line
        : matches[1]

      items.replace(regex.string_array.item, function(xml, value){
        if (regex.exclude.has_string_alias.test(value)) {
          //if (!argv_vals["--alias"])
          //  non_exportable.push({index: i, xml})

          return ''
        }

        split_translatable_value(value, translatable_value_separator).forEach(chunk => {
          translatable.push({index: i, value: chunk})
        })

        return ''
      })
    }

    let line_remainder = ''
    if (matches !== null) {
      array_context  = 0
      line_remainder = line.substring(matches.index + matches[0].length).trim()
    }

    return (line_remainder)
      ? process_input_line(i, line_remainder, argv_vals, translatable_value_separator, 0)
      : array_context
  }

  line.replace(regex.entity, function(xml, value){
    split_translatable_value(value, translatable_value_separator).forEach(chunk => {
      translatable.push({index: i, value: chunk})
    })

    return ''
  })

  line.replace(regex.string, function(xml, xml_attributes, value){
    if (regex.exclude.not_translatable.test(xml_attributes)) {
      if (!argv_vals["--non-translatable"])
        non_exportable.push({index: i, xml})

      return ''
    }

    if (regex.exclude.has_string_alias.test(value)) {
      if (!argv_vals["--alias"])
        non_exportable.push({index: i, xml})

      return ''
    }

    split_translatable_value(value, translatable_value_separator).forEach(chunk => {
      translatable.push({index: i, value: chunk})
    })

    return ''
  })

  line.replace(regex.string_array.one_liner, function(xml, xml_attributes, items){
    if (argv_vals["--no-arrays"]) {
      non_exportable.push({index: i, xml})

      return ''
    }

    if (regex.exclude.not_translatable.test(xml_attributes)) {
      if (!argv_vals["--non-translatable"])
        non_exportable.push({index: i, xml})

      return ''
    }

    items.replace(regex.string_array.item, function(xml, value){
      if (regex.exclude.has_string_alias.test(value)) {
        //if (!argv_vals["--alias"])
        //  non_exportable.push({index: i, xml})

        return ''
      }

      split_translatable_value(value, translatable_value_separator).forEach(chunk => {
        translatable.push({index: i, value: chunk})
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

    if (argv_vals["--no-arrays"]) {
      non_exportable.push({index: i, xml})

      return 1
    }

    if (regex.exclude.not_translatable.test(xml_attributes)) {
      if (!argv_vals["--non-translatable"])
        non_exportable.push({index: i, xml})

      return 2
    }

    return (items)
      ? process_input_line(i, items, argv_vals, translatable_value_separator, 3)
      : 3
  }
}

const process_cli = async function(argv_vals){
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
    array_context = process_input_line(i, line, argv_vals, translatable_value_separator, array_context)
  }

  if (array_context > 0)
    throw new Error('ERROR: Input file contains a string-array with no closing tag!')

  const input_strings_array = get_input_strings_array()

  if (argv_vals["--debug"])
    fs.writeFileSync(path.join(argv_vals["--output-directory"], `debug.${argv_vals["--input-language"]}.txt`), JSON.stringify(input_strings_array, null, 2), {encoding: 'utf8', flag: 'w'})

  for (let i=0; i < argv_vals["--output-language"].length; i++) {
    const output_language_code = argv_vals["--output-language"][i]
    const translated_strings_array = await translate(
      argv_vals["--api-key"],
      argv_vals["--api-url"],
      argv_vals["--input-language"],
      output_language_code,
      input_strings_array
    )

    if (argv_vals["--debug"])
      fs.writeFileSync(path.join(argv_vals["--output-directory"], `debug.${output_language_code}.txt`), JSON.stringify(translated_strings_array, null, 2), {encoding: 'utf8', flag: 'w'})

    const text_output = get_output_text_translation(argv_vals, translated_strings_array)
    const file_output = get_output_filepath(argv_vals, output_language_code)

    if (argv_vals["--make-resource-dirs"]) {
      const resource_dir = path.dirname(file_output)

      if (!fs.existsSync(resource_dir))
        fs.mkdirSync(resource_dir)
    }

    fs.writeFileSync(file_output, text_output, {encoding: 'utf8', flag: 'w'})
  }
}

module.exports = process_cli
