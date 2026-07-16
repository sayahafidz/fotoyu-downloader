# Test script untuk Windows - Jalankan development server
# Usage: .\test-download.ps1

Write-Host "Starting Fotoyu Downloader development server..." -ForegroundColor Green

Set-Location -Path "web"
npm run dev

# Server akan berjalan di http://localhost:3000
# Tekan Ctrl+C untuk stop
