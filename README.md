### [translate-android-strings](https://github.com/warren-bank/node-translate-android-strings)

Command-line utility to use the IBM Watson&trade; Language Translator service to translate Android `strings.xml`.

#### Features:

* supports [custom XML entity declarations](https://www.thedroidsonroids.com/blog/android-strings-xml-tips-tricks#gist85502357)
  - ex:
    ```xml
      <!DOCTYPE resources [
        <!ENTITY foo "Foo">
      ]>
    ```
* supports single-line string resource declarations
  - ex:
    ```xml
      <string name="bar">Bar</string>
    ```
* supports string resource declarations that contain XML entity values
  - ex:
    ```xml
      <string name="mixed_content">&foo; Bar</string>
    ```
* supports string resource declarations that contain nested XML tags
  - ex:
    ```xml
      <string name="styled_content">&foo; Bar:\n\t(<small>Baz</small>)</string>
    ```
* supports single-line _and_ multi-line string __array__ resource declarations
  - ex:
    ```xml
      <string-array name="multi_line_array">
          <item>&foo;</item>
          <item>Bar</item>
      </string-array>

      <string-array name="static_multi_line_array" translatable="false">
          <item>@string/mixed_content</item>
          <item>@string/styled_content</item>
      </string-array>
    ```

#### Limitations:

* does not translate string resource declarations that span multiple lines
  - ex:
    ```xml
      <string name="baz">
        Baz
      </string>
    ```

#### Requirements:

* an [IBM Cloud account](https://github.com/warren-bank/node-ibm-watson-language-translator/blob/master/.etc/docs/IBM-Cloud-account.md)
  - API key
  - API URL

#### Installation:

```bash
npm install --global @warren-bank/translate-android-strings
```

#### Usage:

```bash
translate-android-strings <options>

options:
========
"-h"
"--help"
    Print a help message describing all command-line options.

"-v"
"--version"
    Display the version.

"-k" <key>
"--api-key" <key>
    [optional] IBM Cloud account API key.
    Default: Value is read from "IBM_TRANSLATOR_API_KEY" environment variable.

"-u" <url>
"--api-url" <url>
    [optional] IBM Cloud account API URL.
    Default: Value is read from "IBM_TRANSLATOR_API_URL" environment variable.

"-i" <language>
"--input-language" <language>
    [required] Language code for input file.

"-o" <language>
"--output-language" <language>
    [optional] Language code for output file.
    note: This flag can be repeated to produce multiple output files.
    note: Input language is ignored.
    Default: Produce output files for all languages.

"-f" <filepath>
"--input-file" <filepath>
    [required] File path to input 'strings.xml' file.

"-d" <dirpath>
"--output-directory" <dirpath>
    [optional] Directory path to save output files.
    Default: Path to the input file's directory.

"-m"
"--make-resource-dirs"
    [optional] Make a subdirectory for each output language in output directory.
    note: If disabled, then for each output language:
          - output file is written in output directory
          - output filename extension includes language code
            (ex: '/out/strings.de.xml', '/out/strings.zh-TW.xml')
    note: If enabled, then for each output language:
          - an appropriately named subdirectory is created in output directory
          - output file is written in subdirectory
          - output filename is the same as the input filename
            (ex: '/out/values-es/strings.xml', '/out/values-zh-rTW/strings.xml')
    Default: Disabled.

"-b" <substring-regex>
"--blacklist" <substring-regex>
    [optional] Do not translate substrings that match the regex pattern.
    note: This flag can be repeated to blacklist multiple substring patterns.
    Default: empty list.

"-a"
"--alias"
    [optional] Include in output files: strings that alias another string resource.
    example: <string name="X">@string/Y</string>
    Default: Disabled.

"-n"
"--non-translatable"
    [optional] Include in output files: a verbatim copy of non-translatable strings.
    example: <string name="Y" translatable="false">3.14159</string>
    note: The "translatable" attribute on a string array applies to all items.
    Default: Disabled.

"--na"
"--no-arrays"
    [optional] Exclude from output files: string arrays.
    example: <string-array name="Z"><item>Foo</item><item>Bar</item></string-array>
    Default: Disabled.

"--nc"
"--no-comments"
    [optional] Exclude from output files: XML single-line comments.
    example: <!-- comment -->
    Default: Disabled.

"--nw"
"--no-whitespace"
    [optional] Exclude from output files: lines that are empty or only contain whitespace.
    Default: Disabled.

"--nr"
"--no-replace"
"--no-clobber"
    [optional] Skip output languages for which the output file already exists.
    Default: Disabled. Overwrite if exists.

"--debug"
    [optional] Writes raw data files to output directory.
    note: If enabled, then for each language:
          - output file is written in output directory
          - output filename extension includes language code
            (ex: '/out/debug.en.txt', '/out/debug.de.txt', '/out/debug.zh-TW.txt')
          - file with the input language code contains the list of parsed strings
          - file with an output language code contains the list of translated strings
    Default: Disabled.

language codes:
===============
  "ar"    Arabic
  "eu"    Basque [1]
  "bn"    Bengali
  "bs"    Bosnian
  "bg"    Bulgarian
  "ca"    Catalan [1]
  "zh"    Chinese (Simplified)
  "zh-TW" Chinese (Traditional)
  "hr"    Croatian
  "cs"    Czech
  "da"    Danish
  "nl"    Dutch
  "en"    English
  "et"    Estonian
  "fi"    Finnish
  "fr"    French
  "fr-CA" French (Canadian)
  "de"    German
  "el"    Greek
  "gu"    Gujarati
  "he"    Hebrew
  "hi"    Hindi
  "hu"    Hungarian
  "ga"    Irish
  "id"    Indonesian
  "it"    Italian
  "ja"    Japanese
  "ko"    Korean
  "lv"    Latvian
  "lt"    Lithuanian
  "ms"    Malay
  "ml"    Malayalam
  "mt"    Maltese
  "cnr"   Montenegrin
  "ne"    Nepali
  "nb"    Norwegian Bokmål
  "pl"    Polish
  "pt"    Portuguese
  "ro"    Romanian
  "ru"    Russian
  "sr"    Serbian
  "si"    Sinhala
  "sk"    Slovak
  "sl"    Slovenian
  "es"    Spanish
  "sv"    Swedish
  "ta"    Tamil
  "te"    Telugu
  "th"    Thai
  "tr"    Turkish
  "uk"    Ukrainian
  "ur"    Urdu
  "vi"    Vietnamese
  "cy"    Welsh

[1] Basque and Catalan are supported only for translation to and from Spanish.
```

#### Example:

* produce translated output files for all languages and save each in a distinct resource directory
  - bash script:
    ```bash
      source ~/IBM_TRANSLATOR_API_CREDENTIALS.sh

      translate-android-strings -i 'en' -f '/path/to/res/values/strings.xml' -d '/path/to/res' -m
    ```
  - produces output files:
    ```text
      /path/to/res/values-ar/strings.xml
      /path/to/res/values-eu/strings.xml
      /path/to/res/values-bn/strings.xml
      /path/to/res/values-bs/strings.xml
      etc...
    ```

* produce translated output files for a specific subset of languages
  - bash script:
    ```bash
      source ~/IBM_TRANSLATOR_API_CREDENTIALS.sh

      translate-android-strings -i 'en' -o 'de' -o 'es' -o 'fr' -f '/path/to/input/file.xml' -d '/path/to/output'
    ```
  - produces output files:
    ```text
      /path/to/output/file.de.xml
      /path/to/output/file.es.xml
      /path/to/output/file.fr.xml
    ```

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
