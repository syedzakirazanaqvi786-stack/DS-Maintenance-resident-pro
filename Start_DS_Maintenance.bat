@echo off
title DS Maintenance Suite — Portable Desktop System
cd /d "%~dp0"

echo ================================================================
echo           DS MAINTENANCE SUITE - DESKTOP SYSTEM
echo          100%% Offline Native Windows Desktop Suite
echo ================================================================
echo.

:: 1. Check if compiled standalone executable exists in current directory (Root of USB / Folder)
if exist "%~dp0DS_MAINTENANCE.exe" (
    echo Launching Native Windows Standalone App...
    start "" "%~dp0DS_MAINTENANCE.exe"
    exit /b
)

:: 1b. Check if compiled standalone executable exists in dist\DS_MAINTENANCE
if exist "%~dp0dist\DS_MAINTENANCE\DS_MAINTENANCE.exe" (
    echo Launching Native Windows Standalone App...
    start "" "%~dp0dist\DS_MAINTENANCE\DS_MAINTENANCE.exe"
    exit /b
)

:: 1b. Check if compiled standalone executable exists in dist\DS_Maintenance_Suite
if exist "dist\DS_Maintenance_Suite\DS_Maintenance_Suite.exe" (
    echo Launching Native Windows Standalone App...
    start "" "dist\DS_Maintenance_Suite\DS_Maintenance_Suite.exe"
    exit /b
)

:: 2. Check if single-file standalone executable exists in dist
if exist "dist\DS_Maintenance_Suite.exe" (
    echo Launching Native Windows Standalone App...
    start "" "dist\DS_Maintenance_Suite.exe"
    exit /b
)

:: 3. Run with Python
set PYTHON_CMD=python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Python\bin\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else if exist "C:\Python312\python.exe" (
        set PYTHON_CMD="C:\Python312\python.exe"
    )
)

echo Starting DS Maintenance Suite Engine...
%PYTHON_CMD% app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Opening fallback in default web browser...
    start "" "http://127.0.0.1:58920"
)

pause
