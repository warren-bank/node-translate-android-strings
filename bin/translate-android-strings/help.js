const help = `
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
`

module.exports = help
