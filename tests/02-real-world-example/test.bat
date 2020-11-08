@echo off

rem :: declare variables "IBM_TRANSLATOR_API_KEY" and "IBM_TRANSLATOR_API_URL"
call "%USERPROFILE%\IBM_TRANSLATOR_API_CREDENTIALS.bat"

set DIR=%~dp0.
goto :start

:translate-android-strings
  call node "%DIR%\..\..\bin\translate-android-strings.js" %*
  goto :eof

:start
set input_file=%DIR%\1-input\res\values\strings.xml
set output_dir=%DIR%\2-output\res
set log_file=%output_dir%\test.log

if exist "%output_dir%" rmdir /Q /S "%output_dir%"
mkdir "%output_dir%"

call :translate-android-strings -i "en" -o "de" -o "es" -o "fr" -o "zh" -o "zh-TW" -f "%input_file%" -d "%output_dir%" -m -b "Adam Adamant" -b "Blankety Blank" -b "Chucky Cheese" -a --debug >"%log_file%" 2>&1
