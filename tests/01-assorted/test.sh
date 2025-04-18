#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# declare variables "LIBRE_TRANSLATE_API_KEY" and "LIBRE_TRANSLATE_API_URL"
source "${DIR}/../LIBRE_TRANSLATE_API_CREDENTIALS.sh"

function translate-android-strings {
  node "${DIR}/../../bin/translate-android-strings.js" "$@"
}

input_file="${DIR}/1-input/res/values/strings.xml"

# verbose
output_dir="${DIR}/2-output"
log_file="${output_dir}/test.log"

[ -d "$output_dir" ] && rm -rf "$output_dir"
mkdir -p "$output_dir"

translate-android-strings -i 'en' -o 'de' -f "$input_file" -d "$output_dir" -b 'John' -b 'Smith' -a -n --debug >"$log_file" 2>&1

# succinct
output_dir="${DIR}/3-output-succinct"
log_file="${output_dir}/test.log"

[ -d "$output_dir" ] && rm -rf "$output_dir"
mkdir -p "$output_dir"

translate-android-strings -i 'en' -o 'de' -f "$input_file" -d "$output_dir" -b 'John' -b 'Smith' --na --nc --nw --debug >"$log_file" 2>&1
