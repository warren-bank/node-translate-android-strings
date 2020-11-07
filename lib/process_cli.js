const translate = require('@warren-bank/ibm-watson-language-translator')

const path = require('path')
const fs   = require('fs')

const regex = {
  "file_ext": /(\.[^\.]+)$/,
  "entity":   /\<\!ENTITY\s+\S+\s+"([^"]+)"\s*\/?\>/ig,
  "string":   /\<string[^\>]+\>(.+?)\<\/string\>/ig,
  "exclude": {
    "not_translatable": /\stranslatable="false"/i,
    "has_string_alias": /^@string\//
  },
  "split": {
    "all": /(?:(?:\\r)?\\n|\\t|&\S+;|\<\/?[^\>]*?\>)/g  // CRLF and LF, TAB, XML entity value, XML tag (opening and closing, including attributes, excluding contents)
  },
  "filter": {
    "punctutation": /^(?:[\x20-\x2f]|[\x3a-\x40]|[\x5b-\x60]|[\x7b-\x7e])+$/,
    "xml_comment":  /\<\!--.*?--\>/g
  }
}

let   all_lines    = []  // array of string
const translatable = {
  "entity": [],          // array of {index: line_number, value: text}
  "string": []           // array of {index: line_number, value: text}
}
const non_translatable = {
  "string": []           // array of {index: line_number, xml: text}
}

const split_string_value = function(value) {
  return value.split(regex.split.all).filter(chunk => chunk && !regex.filter.punctutation.test(chunk)).map(chunk => chunk.trim())
}

const get_input_strings_array = function() {
  const strings = []

  let index_entity = 0
  let index_string = 0

  for (let i=0; i < all_lines.length; i++) {
    while ((index_entity < translatable.entity.length) && (translatable.entity[index_entity].index === i)) {
      strings.push(translatable.entity[index_entity].value)
      index_entity++
    }
    while ((index_string < translatable.string.length) && (translatable.string[index_string].index === i)) {
      strings.push(translatable.string[index_string].value)
      index_string++
    }
  }

  return strings
}

const get_output_text_translation = function(argv_vals, translations) {
  if (translations.length !== (translatable.entity.length + translatable.string.length)) {
    console.log('Number of translated strings is incorrect!', `Expected #${translatable.entity.length + translatable.string.length} but received #${translations.length} from server.`, {translations})
    throw new Error('')
  }

  const lines = []

  let index_entity = 0
  let index_string = 0
  let index_nt_string = 0
  let line, filtered, translation

  for (let i=0; i < all_lines.length; i++) {
    line     = all_lines[i]
    filtered = false

    while ((index_entity < translatable.entity.length) && (translatable.entity[index_entity].index === i)) {
      translation = translations.shift()
      line        = line.replace(translatable.entity[index_entity].value, translation)
      index_entity++
    }
    while ((index_string < translatable.string.length) && (translatable.string[index_string].index === i)) {
      translation = translations.shift()
      line        = line.replace(translatable.string[index_string].value, translation)
      index_string++
    }

    if (!argv_vals["--non-translatable"]) {
      while ((index_nt_string < non_translatable.string.length) && (non_translatable.string[index_nt_string].index === i)) {
        filtered = true
        line     = line.replace(non_translatable.string[index_nt_string].xml, '')
        index_nt_string++
      }
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

const process_cli = async function(argv_vals){
  all_lines = fs.readFileSync(argv_vals["--input-file"], {encoding: 'utf8'})
  all_lines = all_lines.split(/\r?\n/)

  let line
  for (let i=0; i < all_lines.length; i++) {
    line = all_lines[i]

    line.replace(regex.entity, function(xml, value){
      translatable.entity.push({index: i, value})
      return ''
    })

    line.replace(regex.string, function(xml, value){
      if (regex.exclude.not_translatable.test(xml)) {
        if (!argv_vals["--non-translatable"])
          non_translatable.string.push({index: i, xml})

        return ''
      }

      if (regex.exclude.has_string_alias.test(value))
        return ''

      split_string_value(value).forEach(chunk => {
        translatable.string.push({index: i, value: chunk})
      })
      return ''
    })
  }

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
