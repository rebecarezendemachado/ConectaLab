@echo off
setlocal
chcp 65001 >nul 2>&1
title Matéria Reativa - Sistema Laboratorial

set "APP_DIR=%~dp0"
set "APP_DIR=%APP_DIR%."
cd /d "%APP_DIR%"

echo ===================================================================
echo     MATÉRIA REATIVA - SISTEMA INTEGRADO DE GESTÃO LABORATORIAL
echo ===================================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto SEM_NODE
for /f "tokens=1,2 delims=v." %%a in ('node --version') do (
  set "NODE_MAJOR=%%a"
  set "NODE_MINOR=%%b"
)
if not defined NODE_MAJOR goto NODE_INVALIDO
if %NODE_MAJOR% LSS 22 goto NODE_DESATUALIZADO
if %NODE_MAJOR% EQU 22 if %NODE_MINOR% LSS 13 goto NODE_DESATUALIZADO

where npm >nul 2>&1
if errorlevel 1 goto SEM_NPM

if not exist "%APP_DIR%\node_modules" (
  echo Instalando os componentes necessários. Na primeira vez pode levar alguns minutos...
  call npm install --include=dev
  if errorlevel 1 goto ERRO_INSTALACAO
)

echo Preparando o sistema...
call npm run build
if errorlevel 1 goto ERRO_COMPILACAO

echo.
echo Abrindo Matéria Reativa em http://127.0.0.1:3000
echo Mantenha esta janela aberta enquanto usa o sistema.
start "" http://127.0.0.1:3000
echo ===================================================================
call npm run dev
if errorlevel 1 goto ERRO_SERVIDOR
echo.
echo O servidor foi encerrado. Feche esta janela quando terminar.
goto PAUSAR

:ERRO_SERVIDOR
echo.
echo O servidor parou com erro. Mantenha esta janela aberta e envie uma foto da mensagem acima.
goto PAUSAR

:PAUSAR
echo.
pause

goto FIM

:SEM_NODE
echo O Node.js 22.13 ou superior precisa estar instalado para iniciar o sistema.
echo Instale a versão LTS em https://nodejs.org e depois abra este arquivo novamente.
goto PAUSAR

:NODE_INVALIDO
echo Não foi possível identificar a versão do Node.js.
goto PAUSAR

:NODE_DESATUALIZADO
echo Este sistema precisa do Node.js 22.13 ou superior.
echo Atualize em https://nodejs.org e depois abra este arquivo novamente.
goto PAUSAR

:SEM_NPM
echo O npm não foi encontrado junto com o Node.js. Reinstale o Node.js LTS em https://nodejs.org.
goto PAUSAR

:ERRO_INSTALACAO
echo Não foi possível instalar os componentes. Verifique a internet e tente novamente.
goto PAUSAR

:ERRO_COMPILACAO
echo Não foi possível preparar o sistema. Anote a mensagem acima para pedir ajuda.
goto PAUSAR

:FIM
endlocal
