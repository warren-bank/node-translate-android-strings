#!/usr/bin/env bash

# declare variables "IBM_TRANSLATOR_API_KEY" and "IBM_TRANSLATOR_API_URL"
source "${HOME}/IBM_TRANSLATOR_API_CREDENTIALS.sh"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function translate-android-strings {
  node "${DIR}/../../bin/translate-android-strings.js" "$@"
}

input_file="${DIR}/1-input/res/values/strings.xml"
output_dir="${DIR}/2-output/res"
log_file="${output_dir}/test.log"

[ -d "$output_dir" ] && rm -rf "$output_dir"
mkdir -p "$output_dir"

translate-android-strings -i 'en' -o 'de' -o 'es' -o 'fr' -o 'zh' -o 'zh-TW' -f "$input_file" -d "$output_dir" -m -b 'Adam Adamant' -b 'Blankety Blank' -b 'Chucky Cheese' -a --debug >"$log_file" 2>&1
