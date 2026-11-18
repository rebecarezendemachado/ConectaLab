@echo off
setlocal
cd /d "%~dp0."
title Matéria Reativa - Inicialização e Diagnóstico
echo Iniciando o sistema. Esta janela ficará aberta para mostrar qualquer mensagem.
echo.
cmd /k call iniciar.bat
endlocal
