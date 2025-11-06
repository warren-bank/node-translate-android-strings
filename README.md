### [translate-android-strings](https://github.com/warren-bank/node-translate-android-strings)

Command-line utility to use an online language translation service to automate the localization of Android _string_ resources.

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

* access to a server hosting one of the supported language translation service APIs
  - [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate#mirrors)
    * API key
    * API URL
  - [DeepL](https://www.deepl.com/en/pro-api)
    * API key

#### Supported Languages

* the list of supported input and output languages depends upon the chosen API
  - [LibreTranslate](https://github.com/warren-bank/node-libre-language-translator#supported-languages)
    * there is no guarantee for consistency, either between server instances or over time
    * to obtain a real-time list of supported languages from a specific server instance, directly query its `<API URL>/languages` [API](https://libretranslate.com/docs) endpoint
  - [DeepL](https://github.com/warren-bank/node-deepl-language-translator#supported-input-languages)

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

"-s" <service>
"--api-service" <service>
    [required] Name of language translation service API.
    enum: "libre", "deepl"

"-k" <key>
"--api-key" <key>
    [optional] API key.
    Fallback for "libre" service: Value of the "LIBRE_TRANSLATE_API_KEY" environment variable, if one exists.
    Fallback for "deepl" service: Value of the "DEEPL_TRANSLATE_API_KEY" environment variable, if one exists.

"-u" <url>
"--api-url" <url>
    [optional] API URL.
    Fallback for "libre" service: Value of the "LIBRE_TRANSLATE_API_URL" environment variable, if one exists.
    Fallback for "deepl" service: Value of the "DEEPL_TRANSLATE_API_URL" environment variable, if one exists.
    Default for "libre" service: "https://libretranslate.com"
    Default for "deepl" service for free accounts: "https://api-free.deepl.com/v2"
    Default for "deepl" service for paid accounts: "https://api.deepl.com/v2"

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
    [required] File path to input string resource XML file.

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

"--nb"
"--no-break"
"--no-break-on-error"
    [optional] When translating multiple output languages and one encounters an error,
               print a log statement and continue processing the remaining output languages.
    Default: Disabled. The library throws an error, and the command-line utility exits with code.

"--debug"
    [optional] Writes raw data files to output directory.
    note: If enabled, then for each language:
          - output file is written in output directory
          - output filename extension includes language code
            (ex: '/out/debug.en.txt', '/out/debug.de.txt', '/out/debug.zh-TW.txt')
          - file with the input language code contains the list of parsed strings
          - file with an output language code contains the list of translated strings
    Default: Disabled.
```

#### Example:

* produce translated output files for all languages and save each in a distinct resource directory
  - bash script:
    ```bash
      source ~/LIBRE_TRANSLATE_API_CREDENTIALS.sh

      translate-android-strings -s 'libre' -i 'en' -f '/path/to/res/values/strings.xml' -d '/path/to/res' -m
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
      source ~/LIBRE_TRANSLATE_API_CREDENTIALS.sh

      translate-android-strings -s 'libre' -i 'en' -o 'de' -o 'es' -o 'fr' -f '/path/to/input/file.xml' -d '/path/to/output'
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
