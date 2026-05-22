@echo off
title Home Meal Calculation - PHP Backend Server
echo ========================================================
echo   Home Meal Calculation - PHP Backend Server Starter
echo ========================================================
echo.

:: Check if PHP is in PATH
where php >nul 2>nul
if %errorlevel% neq 0 (
    :: Check default XAMPP location
    if exist "C:\xampp\php\php.exe" (
        echo [INFO] PHP command not found in PATH.
        echo [INFO] Detected XAMPP PHP at C:\xampp\php\php.exe. Using it...
        set "PHP_CMD=C:\xampp\php\php.exe"
    ) else (
        echo [ERROR] PHP was not found in your PATH or at C:\xampp\php\php.exe.
        echo Please make sure XAMPP is installed and PHP is added to your environment variables.
        echo.
        pause
        exit /b
    )
) else (
    set "PHP_CMD=php"
)

:: Get local IP address (IPv4)
echo [INFO] Finding your local IPv4 address...
set "IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4"') do (
    set "temp_ip=%%A"
    :: Strip spaces
    setlocal enabledelayedexpansion
    set "temp_ip=!temp_ip: =!"
    if not "!temp_ip!"=="" (
        :: Keep the first non-empty IPv4 address found
        if "!IP!"=="" (
            endlocal
            set "IP=%%A"
        ) else (
            endlocal
        )
    )
)

:: Trim spaces from IP
for /f "tokens=* delims= " %%A in ("%IP%") do set "IP=%%A"
for /f "tokens=* delims= " %%A in ("%IP%") do set "IP=%%A"

echo [SUCCESS] Your computer's local IP address is: %IP%
echo.
echo ========================================================
echo   Starting PHP server on: http://0.0.0.0:8000
echo   Local access: http://localhost:8000
echo   Network access: http://%IP%:8000
echo ========================================================
echo.
echo Press Ctrl+C in this window to stop the backend server.
echo.

"%PHP_CMD%" -S 0.0.0.0:8000
pause
