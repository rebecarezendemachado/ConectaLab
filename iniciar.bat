@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Matéria Reativa - Sistema Laboratorial

:: Obtém o diretório deste script sem a barra invertida final
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

echo ===================================================================
echo     MATÉRIA REATIVA - SISTEMA INTEGRADO DE GESTÃO LABORATÓRIO
echo ===================================================================
echo.
echo [i] Pasta do projeto: %APP_DIR%
echo [i] Verificando melhor forma de iniciar no seu computador...
echo.

:: 1. TENTAR NODE.JS (Se você tiver o Node instalado)
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Node.js detectado com sucesso!
    
    if not exist "%APP_DIR%\node_modules" (
        echo [i] Primeira execução: Instalando dependências (isso pode levar 1 minuto)...
        call npm install
        if %ERRORLEVEL% NEQ 0 (
            echo [!] npm install apresentou avisos. Continuando...
        )
    )

    if not exist "%APP_DIR%\dist\index.html" (
        echo [i] Gerando compilação otimizada do sistema...
        call npm run build
    )

    echo [✓] Abrindo o sistema no seu navegador (http://localhost:3000)...
    start "" http://localhost:3000
    echo [✓] Servidor Matéria Reativa rodando! Pressione Ctrl+C para encerrar.
    echo -------------------------------------------------------------------
    call npm run dev
    goto FIM
)

:: 2. TENTAR PHP DO XAMPP (Para quem tem XAMPP instalado em C:\xampp)
if exist "C:\xampp\php\php.exe" (
    echo [✓] Servidor PHP do XAMPP detectado em C:\xampp\php\php.exe!
    echo [✓] Abrindo o sistema no seu navegador (http://localhost:3000)...
    start "" http://localhost:3000
    echo [✓] Servidor local ativo! Mantenha esta janela aberta enquanto utiliza o sistema.
    echo -------------------------------------------------------------------
    "C:\xampp\php\php.exe" -S localhost:3000 -t "%APP_DIR%"
    goto FIM
)

where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] PHP detectado no sistema!
    echo [✓] Abrindo o sistema no seu navegador (http://localhost:3000)...
    start "" http://localhost:3000
    echo [✓] Servidor local ativo! Mantenha esta janela aberta enquanto utiliza o sistema.
    echo -------------------------------------------------------------------
    php -S localhost:3000 -t "%APP_DIR%"
    goto FIM
)

:: 3. SERVIDOR NATIVO DO WINDOWS (POWERSHELL - Roda direto em qualquer Windows sem instalar nada)
where powershell.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Iniciando servidor nativo do Windows (PowerShell)...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%\servidor_windows.ps1" -Port 3000
    if %ERRORLEVEL% EQU 0 goto FIM
)

:: 4. TENTAR PYTHON (Se disponível)
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Python detectado! Iniciando servidor local...
    start "" http://localhost:3000
    if exist "%APP_DIR%\dist" (
        python -m http.server 3000 --directory "%APP_DIR%\dist"
    ) else (
        python -m http.server 3000 --directory "%APP_DIR%"
    )
    goto FIM
)

:: 5. MENSAGEM FINAL CLARA (A janela nunca fecha sozinha)
echo.
echo ===================================================================
echo [!] COMO INICIAR O SISTEMA MANUALMENTE:
echo.
echo 1. No VS Code:
echo    - Abra a pasta do projeto no VS Code
echo    - Abra o Terminal (Ctrl + ') e digite: npm run dev
echo.
echo 2. Pelo XAMPP (Apache):
echo    - Inicie o Apache no XAMPP Control Panel
echo    - Abra no navegador: http://localhost/matéria-reativa%%20(5)/
echo.
echo 3. Acessar Online Imediatamente sem Instalar Nada:
echo    - Acesse: https://ais-dev-knkresr6hid2cxyy6rkvrk-483494016021.us-west1.run.app
echo ===================================================================
echo.
pause

:FIM
