@echo off
title DS Maintenance Suite — Portable Desktop System
cd /d "%~dp0"

echo ================================================================
echo           DS MAINTENANCE SUITE - DESKTOP SYSTEM
echo          100%% Offline Native Windows Desktop Suite
echo ================================================================
echo.

:: Detect Python executable
set PYTHON_CMD=python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) else if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Python\bin\python.exe"
    ) else if exist "C:\Python312\python.exe" (
        set PYTHON_CMD="C:\Python312\python.exe"
    )
)

echo Starting DS Maintenance Suite Engine...
echo Server URL: http://127.0.0.1:58920
%PYTHON_CMD% app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Opening fallback in default web browser...
    start "" "http://127.0.0.1:58920"
)

pause
