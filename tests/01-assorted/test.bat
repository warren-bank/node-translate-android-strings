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

:verbose
set output_dir=%DIR%\2-output
set log_file=%output_dir%\test.log

if exist "%output_dir%" rmdir /Q /S "%output_dir%"
mkdir "%output_dir%"

call :translate-android-strings -i "en" -o "fr" -f "%input_file%" -d "%output_dir%" -b "John" -b "Smith" -a -n --debug >"%log_file%" 2>&1

:succinct
set output_dir=%DIR%\3-output-succinct
set log_file=%output_dir%\test.log

if exist "%output_dir%" rmdir /Q /S "%output_dir%"
mkdir "%output_dir%"

call :translate-android-strings -i "en" -o "fr" -f "%input_file%" -d "%output_dir%" -b "John" -b "Smith" --na --nc --nw --debug >"%log_file%" 2>&1
