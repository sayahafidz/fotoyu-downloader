# Build the TSX file content
$lines = @()
$lines += '"use client";'
$lines += ''
$lines += 'import { useState } from "react";'
$lines += ''
$lines += 'const APP_URL ='
$lines += '  process.env.NEXT_PUBLIC_APP_URL ||'
$lines += '  (typeof window !== "undefined" ? window.location.origin : "");'
$lines += ''
$lines += 'const CONSOLE_CODE = `(function(){'
$lines += '  var APP_URL = "${APP_URL}";'
$lines += '  function fallback() {'
$lines += "    var v = localStorage.getItem('persist:root');"
$lines += "    if (!v) { alert('persist:root tidak ditemukan. Pastikan kamu sudah login di fotoyu.com.'); return; }"
$lines += "    location.href = APP_URL + '/#t=' + encodeURIComponent(v);"
$lines += '  }'

$outpath = '"d:\PYTHON PROJECT\fotoyu downloader\web\components\BookmarkletSection.tsx"'
$joined = $lines -join "`n"
$joined | Out-File -FilePath $outpath -Encoding utf8

Write-Host "part1 done"
