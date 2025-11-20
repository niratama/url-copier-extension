$zipName = "url-copier-extension.zip"
$distDir = "dist"

Write-Host "Packaging extension..."

# Clean up previous build
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
if (Test-Path $zipName) { Remove-Item $zipName -Force }

# Create dist directory
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

# List of files and directories to include in the release
$includes = @(
    "manifest.json",
    "background.js",
    "content-palette.js",
    "constants.js",
    "offscreen.html",
    "offscreen.js",
    "options.html",
    "options.js",
    "options.css",
    "icon16.png",
    "icon48.png",
    "icon128.png",
    "LICENSE",
    "_locales"
)

foreach ($item in $includes) {
    if (Test-Path $item) {
        Copy-Item -Path $item -Destination $distDir -Recurse
    } else {
        Write-Warning "Item not found: $item"
    }
}

# Compress
Compress-Archive -Path "$distDir/*" -DestinationPath $zipName -Force

# Cleanup
Remove-Item $distDir -Recurse -Force

Write-Host "Successfully created $zipName"
