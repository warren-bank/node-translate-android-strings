@echo off

set DIR=%~dp0.

rem :: declare variables "LIBRE_TRANSLATE_API_KEY" and "LIBRE_TRANSLATE_API_URL"
call "%DIR%\..\..\LIBRE_TRANSLATE_API_CREDENTIALS.bat"

goto :start

:translate-android-strings
  call node "%DIR%\..\..\..\bin\translate-android-strings.js" -s "libre" %*
  goto :eof

:start
set input_file=%DIR%\1-input\res\values\strings.xml
set output_dir=%DIR%\2-output\res
set log_file=%output_dir%\test.log

if exist "%output_dir%" rmdir /Q /S "%output_dir%"
mkdir "%output_dir%"

call :translate-android-strings -i "en" -o "de" -o "es" -o "fr" -o "zh" -o "zh-TW" -o "zh-Hans" -o "zh-Hant" -f "%input_file%" -d "%output_dir%" --nb -m -b "Adam Adamant" -b "Blankety Blank" -b "Chucky Cheese" --nc --nw --debug >"%log_file%" 2>&1
