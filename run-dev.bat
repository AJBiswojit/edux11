@echo off
rem ============================================================================
rem  MediXO EduX Dev Launcher
rem ============================================================================
rem  Usage:
rem    run-dev.bat              Start both backend (:8000) and frontend (:5173)
rem    run-dev.bat restart      Kill stale servers on 8000/5173, then start clean
rem    run-dev.bat kill         Stop all running backend & frontend dev servers
rem    run-dev.bat install      Install/update backend & frontend dependencies
rem    run-dev.bat ingest       Re-import PYQ dataset first, then start servers
rem    run-dev.bat backend      Start backend API only (:8000)
rem    run-dev.bat frontend     Start frontend UI only (:5173)
rem    run-dev.bat status       Check health and port bindings
rem ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "ACTION=%~1"
if "%ACTION%"=="" set "ACTION=start"

if /i "%ACTION%"=="help" goto show_help
if /i "%ACTION%"=="-h" goto show_help
if /i "%ACTION%"=="/?" goto show_help
if /i "%ACTION%"=="kill" goto do_kill
if /i "%ACTION%"=="stop" goto do_kill
if /i "%ACTION%"=="status" goto do_status
if /i "%ACTION%"=="install" goto do_install

rem ----------------------------------------------------------------------------
rem 1. Python Environment Resolution
rem ----------------------------------------------------------------------------
set "PY="
if exist "%~dp0backend\.venv\Scripts\python.exe" set "PY=%~dp0backend\.venv\Scripts\python.exe"
if not defined PY if exist "%~dp0.venv\Scripts\python.exe" set "PY=%~dp0.venv\Scripts\python.exe"
if not defined PY if exist "%~dp0backend\venv\Scripts\python.exe" set "PY=%~dp0backend\venv\Scripts\python.exe"
if not defined PY if exist "%~dp0venv\Scripts\python.exe" set "PY=%~dp0venv\Scripts\python.exe"
if not defined PY set "PY=python"

"%PY%" --version >nul 2>&1
if errorlevel 1 (
    echo [error] Python executable not found or not working: %PY%
    echo         Please install Python 3.10+ and add it to your PATH.
    goto :fail
)

rem ----------------------------------------------------------------------------
rem 2. Directory Preparation
rem ----------------------------------------------------------------------------
if not exist "%~dp0backend\logs" mkdir "%~dp0backend\logs"
if not exist "%~dp0backend\media" mkdir "%~dp0backend\media"

rem ----------------------------------------------------------------------------
rem 3. Environment Files Validation
rem ----------------------------------------------------------------------------
if not exist "%~dp0backend\.env" (
    if exist "%~dp0backend\.env.example" (
        echo [setup] backend\.env not found. Creating from backend\.env.example...
        copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
        echo [warn] Created backend\.env - please verify your database credentials.
    ) else (
        echo [warn] backend\.env is missing!
    )
)

if not exist "%~dp0frontend\.env.development" (
    echo [setup] Creating frontend\.env.development for proxy mappings...
    (
        echo # Development configuration for Vite dev server
        echo # Same-origin /v1 and /media proxying prevents CORS issues
        echo VITE_API_BASE_URL=/v1
        echo VITE_DEV_API_TARGET=http://localhost:8000
    ) > "%~dp0frontend\.env.development"
)

rem ----------------------------------------------------------------------------
rem 4. Dependencies Check
rem ----------------------------------------------------------------------------
echo [check] Verifying backend dependencies...
"%PY%" -c "import fastapi; import uvicorn; import psycopg2" >nul 2>&1
set "NEED_BACKEND_DEPS=%errorlevel%"
if not "!NEED_BACKEND_DEPS!"=="0" (
    echo [setup] Installing missing backend dependencies...
    pushd "%~dp0backend"
    "%PY%" -m pip install -r requirements.txt || goto :fail
    popd
)

set "NEED_NPM_INSTALL=0"
if not exist "%~dp0frontend\node_modules" set "NEED_NPM_INSTALL=1"
if not exist "%~dp0frontend\node_modules\remark-math" set "NEED_NPM_INSTALL=1"
if not exist "%~dp0frontend\node_modules\rehype-katex" set "NEED_NPM_INSTALL=1"
if not exist "%~dp0frontend\node_modules\vite" set "NEED_NPM_INSTALL=1"

if "!NEED_NPM_INSTALL!"=="1" (
    echo [setup] Installing missing frontend dependencies ^(remark-math, rehype-katex, etc.^)...
    pushd "%~dp0frontend"
    call npm install || goto :fail
    popd
)

if /i "%ACTION%"=="ingest" (
    echo [setup] Importing PYQ dataset into database...
    pushd "%~dp0backend"
    "%PY%" -m app.cli.ingest_pyq --reset || goto :fail
    popd
)

rem ----------------------------------------------------------------------------
rem 5. Handle Port Cleanup if restart or if ports are currently occupied
rem ----------------------------------------------------------------------------
if /i "%ACTION%"=="restart" (
    echo [clean] Stopping any active servers on ports 8000 and 5173...
    call :free_ports
) else (
    rem Check if ports are already listening to avoid bind failure / port shift
    set "PORT_8000_BUSY=0"
    set "PORT_5173_BUSY=0"
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":8000.*LISTENING"') do (
        if not "%%a"=="0" set "PORT_8000_BUSY=1"
    )
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":5173.*LISTENING"') do (
        if not "%%a"=="0" set "PORT_5173_BUSY=1"
    )

    if "!PORT_8000_BUSY!"=="1" (
        if not "%ACTION%"=="frontend" (
            echo [notice] Port 8000 is occupied. Cleaning stale backend process...
            for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":8000.*LISTENING"') do (
                if not "%%a"=="0" taskkill /f /pid %%a >nul 2>&1
            )
        )
    )
    if "!PORT_5173_BUSY!"=="1" (
        if not "%ACTION%"=="backend" (
            echo [notice] Port 5173 is occupied. Cleaning stale frontend process...
            for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":5173.*LISTENING"') do (
                if not "%%a"=="0" taskkill /f /pid %%a >nul 2>&1
            )
        )
    )
)

rem ----------------------------------------------------------------------------
rem 6. Launch Servers
rem ----------------------------------------------------------------------------
if /i "%ACTION%"=="frontend" goto :launch_frontend
if /i "%ACTION%"=="ui" goto :launch_frontend
if /i "%ACTION%"=="backend" goto :launch_backend
if /i "%ACTION%"=="api" goto :launch_backend

:launch_both
echo [start] Launching Backend on http://localhost:8000 ...
start "EduX Backend (:8000)" /D "%~dp0backend" cmd /k "title EduX Backend (:8000) && set PYTHONUNBUFFERED=1 && "%PY%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [start] Launching Frontend on http://localhost:5173 ...
start "EduX Frontend (:5173)" /D "%~dp0frontend" cmd /k "title EduX Frontend (:5173) && npm run dev"
goto :print_banner

:launch_backend
echo [start] Launching Backend on http://localhost:8000 ...
start "EduX Backend (:8000)" /D "%~dp0backend" cmd /k "title EduX Backend (:8000) && set PYTHONUNBUFFERED=1 && "%PY%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
goto :print_banner

:launch_frontend
echo [start] Launching Frontend on http://localhost:5173 ...
start "EduX Frontend (:5173)" /D "%~dp0frontend" cmd /k "title EduX Frontend (:5173) && npm run dev"
goto :print_banner

rem ----------------------------------------------------------------------------
rem 7. Status Banner
rem ----------------------------------------------------------------------------
:print_banner
echo.
echo ============================================================================
echo   MediXO EduX Development Servers
echo ============================================================================
echo   Frontend App:   http://localhost:5173  (or http://127.0.0.1:5173)
echo   Backend API:    http://localhost:8000  (FastAPI)
echo   API Docs:       http://localhost:8000/docs  (or http://localhost:5173/docs)
echo   API Health:     http://localhost:8000/health (or http://localhost:5173/health)
echo   Media / Crops:  http://localhost:8000/media/ (or http://localhost:5173/media/)
echo ----------------------------------------------------------------------------
echo   Proxy Mappings:
echo     Browser -> http://localhost:5173/v1/*    -> http://localhost:8000/v1/*
echo     Browser -> http://localhost:5173/media/* -> http://localhost:8000/media/*
echo     (Same-origin proxy eliminates CORS preflight errors)
echo ----------------------------------------------------------------------------
echo   Close either terminal window or run "run-dev.bat kill" to stop.
echo ============================================================================
echo.
endlocal
exit /b 0

rem ----------------------------------------------------------------------------
rem Helpers / Subcommands
rem ----------------------------------------------------------------------------
:free_ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":8000.*LISTENING"') do (
    if not "%%a"=="0" (
        echo   [kill] Killing process %%a on port 8000...
        taskkill /f /pid %%a >nul 2>&1
    )
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":5173.*LISTENING"') do (
    if not "%%a"=="0" (
        echo   [kill] Killing process %%a on port 5173...
        taskkill /f /pid %%a >nul 2>&1
    )
)
exit /b 0

:do_kill
echo [clean] Stopping any active servers on ports 8000 and 5173...
call :free_ports
echo [ok] Servers stopped.
endlocal
exit /b 0

:do_install
echo [setup] Installing backend dependencies...
pushd "%~dp0backend"
"%PY%" -m pip install -r requirements.txt || goto :fail
popd

echo [setup] Installing frontend dependencies...
pushd "%~dp0frontend"
call npm install || goto :fail
popd
echo [ok] Dependencies installed successfully.
endlocal
exit /b 0

:do_status
echo ============================================================================
echo   MediXO EduX Port and Server Status
echo ============================================================================
netstat -ano | findstr /r ":8000.*LISTENING" >nul
if errorlevel 1 (
    echo   Port 8000 [Backend API]:  STOPPED
) else (
    echo   Port 8000 [Backend API]:  RUNNING
)

netstat -ano | findstr /r ":5173.*LISTENING" >nul
if errorlevel 1 (
    echo   Port 5173 [Frontend UI]:  STOPPED
) else (
    echo   Port 5173 [Frontend UI]:  RUNNING
)
echo ============================================================================
endlocal
exit /b 0

:show_help
echo ============================================================================
echo   MediXO EduX Dev Launcher Usage:
echo ============================================================================
echo   run-dev.bat              Start both backend and frontend servers
echo   run-dev.bat restart      Stop running servers and start clean
echo   run-dev.bat kill         Stop all running dev servers
echo   run-dev.bat install      Install/update pip and npm dependencies
echo   run-dev.bat ingest       Ingest PYQ questions into database, then start
echo   run-dev.bat backend      Start only the FastAPI backend (:8000)
echo   run-dev.bat frontend     Start only the Vite frontend (:5173)
echo   run-dev.bat status       Display current server and port status
echo ============================================================================
endlocal
exit /b 0

:fail
echo.
echo [error] Launcher failed. See the messages above for details.
popd >nul 2>&1
endlocal
exit /b 1
