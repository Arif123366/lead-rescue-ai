Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = (Get-Item "$PSScriptRoot\..").FullName
$outDir = Join-Path $root "out"

# 1. Build frontend.zip (for Hostinger deployment)
$frontendZip = Join-Path $outDir "frontend.zip"
if (Test-Path $frontendZip) {
    Remove-Item $frontendZip -Force
}

Write-Host "Packaging out/frontend.zip with POSIX paths..."
$zip = [System.IO.Compression.ZipFile]::Open($frontendZip, [System.IO.Compression.ZipArchiveMode]::Create)

$files = Get-ChildItem -Path $outDir -Recurse -File
foreach ($file in $files) {
    if ($file.Name -ne "frontend.zip") {
        $relPath = $file.FullName.Substring($outDir.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relPath) | Out-Null
    }
}
$zip.Dispose()
Write-Host "✅ out/frontend.zip successfully created!"

# 2. Build lead-rescue-ai-updated.zip (Full source code package)
$fullZip = Join-Path $root "lead-rescue-ai-updated.zip"
if (Test-Path $fullZip) {
    Remove-Item $fullZip -Force
}

Write-Host "Packaging lead-rescue-ai-updated.zip..."
$zipFull = [System.IO.Compression.ZipFile]::Open($fullZip, [System.IO.Compression.ZipArchiveMode]::Create)

$includeDirs = @("app", "components", "lib", "server", "prisma", "out", "public")
$includeFiles = @("package.json", "next.config.mjs", "tsconfig.json", "render.yaml", "DNS_RESEND_SETUP.md")

foreach ($dir in $includeDirs) {
    $targetDirPath = Join-Path $root $dir
    if (Test-Path $targetDirPath) {
        $subFiles = Get-ChildItem -Path $targetDirPath -Recurse -File
        foreach ($sf in $subFiles) {
            if ($sf.Name -ne "frontend.zip" -and $sf.Name -ne "lead-rescue-ai-updated.zip") {
                $relPath = $sf.FullName.Substring($root.Length + 1).Replace("\", "/")
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFull, $sf.FullName, $relPath) | Out-Null
            }
        }
    }
}

foreach ($f in $includeFiles) {
    $targetFilePath = Join-Path $root $f
    if (Test-Path $targetFilePath) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFull, $targetFilePath, $f) | Out-Null
    }
}

$zipFull.Dispose()
Write-Host "✅ lead-rescue-ai-updated.zip successfully created!"
