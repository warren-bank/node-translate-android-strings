#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# declare variables "DEEPL_TRANSLATE_API_KEY" and "DEEPL_TRANSLATE_API_URL"
source "${DIR}/../../DEEPL_TRANSLATE_API_CREDENTIALS.sh"

function translate-android-strings {
  node "${DIR}/../../../bin/translate-android-strings.js" -s 'deepl' "$@"
}

input_file="${DIR}/1-input/res/values/strings.xml"
output_dir="${DIR}/2-output/res"
log_file="${output_dir}/test.log"

[ -d "$output_dir" ] && rm -rf "$output_dir"
mkdir -p "$output_dir"

translate-android-strings -i 'en' -o 'de' -o 'es' -o 'fr' -o 'zh' -o 'zh-TW' -o 'zh-Hans' -o 'zh-Hant' -f "$input_file" -d "$output_dir" --nb -m -b 'Adam Adamant' -b 'Blankety Blank' -b 'Chucky Cheese' -a --debug >"$log_file" 2>&1
