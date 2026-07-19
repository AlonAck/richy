param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [int]$Port = 8899
)
Add-Type -AssemblyName System.Web
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"

$mime = @{
  ".html"="text/html"; ".htm"="text/html"; ".js"="application/javascript";
  ".jsx"="application/javascript"; ".json"="application/json";
  ".webmanifest"="application/manifest+json"; ".png"="image/png";
  ".css"="text/css"; ".svg"="image/svg+xml"; ".ico"="image/x-icon";
  ".map"="application/json"
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $rel = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath)
    if ($rel -eq "/" ) { $rel = "/preview.html" }
    $rel = $rel.TrimStart("/")
    $path = Join-Path $Root $rel
    if (Test-Path $path -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $res.ContentType = $ct
      $res.Headers.Add("Cache-Control","no-store")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $rel")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
  }
}
