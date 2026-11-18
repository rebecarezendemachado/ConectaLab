# =============================================================================
# MATÉRIA REATIVA - SERVIDOR LOCAL NATIVO WINDOWS (POWERSHELL / TCP SOCKETS)
# NÃO REQUER PRIVILÉGIOS DE ADMINISTRADOR NEM INSTALAÇÃO DE NODE/PYTHON
# TOTALMENTE COMPATÍVEL COM POWERSHELL 5.1, 7+ E QUALQUER VERSÃO DO WINDOWS
# =============================================================================

param (
    [int]$Port = 3000
)

$rootPath = $PSScriptRoot
if (-not $rootPath) {
    $rootPath = (Get-Location).Path
}

# Define UTF-8 no console do PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   MATERIA REATIVA - SISTEMA INTEGRADO DE GESTAO" -ForegroundColor White
Write-Host "   Iniciando servidor local nativo na porta $Port..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

function Get-MimeType($file) {
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    switch ($ext) {
        '.html' { return 'text/html; charset=utf-8' }
        '.js'   { return 'application/javascript; charset=utf-8' }
        '.mjs'  { return 'application/javascript; charset=utf-8' }
        '.css'  { return 'text/css; charset=utf-8' }
        '.png'  { return 'image/png' }
        '.jpg'  { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.svg'  { return 'image/svg+xml' }
        '.json' { return 'application/json; charset=utf-8' }
        '.ico'  { return 'image/x-icon' }
        '.woff2'{ return 'font/woff2' }
        '.woff' { return 'font/woff' }
        '.ttf'  { return 'font/ttf' }
        Default { return 'application/octet-stream' }
    }
}

try {
    $ip = [System.Net.IPAddress]::Loopback
    $listener = [System.Net.Sockets.TcpListener]::new($ip, $Port)
    $listener.Start()
    Write-Host "[✓] Servidor conectado com sucesso em http://localhost:$Port/" -ForegroundColor Green
    Write-Host "[✓] Abrindo o sistema no seu navegador padrao..." -ForegroundColor Cyan
    Start-Process "http://localhost:$Port/"
} catch {
    Write-Host "[!] Nao foi possivel iniciar na porta $Port: $_" -ForegroundColor Red
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "[INFO] Sistema pronto e rodando!" -ForegroundColor Green
Write-Host "[INFO] Mantenha esta janela aberta enquanto utiliza o sistema." -ForegroundColor Yellow
Write-Host "[INFO] Para encerrar o sistema, feche esta janela." -ForegroundColor Gray
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
        $requestLine = $reader.ReadLine()

        if ($requestLine) {
            $tokens = $requestLine.Split(' ')
            if ($tokens.Length -ge 2) {
                $rawPath = $tokens[1].TrimStart('/')
                if ($rawPath.Contains('?')) {
                    $rawPath = $rawPath.Substring(0, $rawPath.IndexOf('?'))
                }
                if ([string]::IsNullOrWhiteSpace($rawPath)) {
                    $rawPath = 'index.html'
                }

                # Localização do arquivo: tenta dist/ depois raiz
                $targetFile = Join-Path (Join-Path $rootPath 'dist') $rawPath
                if (-not (Test-Path $targetFile -PathType Leaf)) {
                    $targetFile = Join-Path $rootPath $rawPath
                }
                if (-not (Test-Path $targetFile -PathType Leaf)) {
                    $targetFile = Join-Path (Join-Path $rootPath 'dist') 'index.html'
                    if (-not (Test-Path $targetFile -PathType Leaf)) {
                        $targetFile = Join-Path $rootPath 'index.html'
                    }
                }

                if (Test-Path $targetFile -PathType Leaf) {
                    $bytes = [System.IO.File]::ReadAllBytes($targetFile)
                    $mime = Get-MimeType $targetFile
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $notFound = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                    $notFoundBytes = [System.Text.Encoding]::ASCII.GetBytes($notFound)
                    $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
                }
                $stream.Flush()
            }
        }
        $client.Close()
    } catch {
        # Continua escutando requisições seguintes
    }
}
