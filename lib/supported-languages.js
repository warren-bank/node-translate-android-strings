/* -----------------------------------------------------------------------------
 * https://developer.android.com/guide/topics/resources/providing-resources#LocaleQualifier
 *
 * The language is defined by a two-letter ISO 639-1 language code,
 * optionally followed by a two-letter ISO 3166-1-alpha-2 region code (preceded by lowercase r).
 *
 * http://www.loc.gov/standards/iso639-2/php/code_list.php
 *   ISO 639-1 language code
 * https://www.iso.org/obp/ui/#iso:pub:PUB500001:en
 *   ISO 3166-1-alpha-2 region code
 *
 * The codes are not case-sensitive.
 * -----------------------------------------------------------------------------
 */

const get_android_resource_directory_name = (output_language_code) => {
  // despite being case-insensitive,
  // enforce the convention:
  //   - lowercase language code
  //   - uppercase region code
  let [lcode, rcode] = output_language_code.split('-')

  if (!lcode)
    throw new Error('invalid output language code')

  lcode = lcode.toLowerCase()

  switch(lcode) {
    case 'zt':
      lcode = 'zh'
      rcode = 'TW'
      break
  }

  if (rcode) {
    rcode = rcode.toUpperCase()

    if (lcode === 'zh') {
      switch(rcode) {
        case 'HANS':
          rcode = null
          break
        case 'HANT':
          rcode = 'TW'
          break
      }
    }

    if (lcode === 'es') {
      switch(rcode) {
        case '419':
          rcode = 'MX'
          break
      }
    }
  }

  return rcode
    ? `values-${lcode}-r${rcode}`
    : `values-${lcode}`
}

module.exports = get_android_resource_directory_name
