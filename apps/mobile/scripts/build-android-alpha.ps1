param(
    [ValidateSet('arm64-v8a', 'arm64-v8a,x86_64')]
    [string]$Architectures = 'arm64-v8a,x86_64',
    [switch]$Resume
)

$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$previousVariant = $env:APP_VARIANT
$previousNodeEnv = $env:NODE_ENV
$previousParallelism = $env:CMAKE_BUILD_PARALLEL_LEVEL

if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) {
    throw 'Postavi JAVA_HOME (JDK 21) i ANDROID_HOME prije builda.'
}

Push-Location $mobileRoot
try {
    $env:APP_VARIANT = 'preview'
    $env:NODE_ENV = 'production'
    $env:CMAKE_BUILD_PARALLEL_LEVEL = '2'
    $artifactDirectory = Join-Path $mobileRoot 'artifacts'
    New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null

    # Preserve the previous development APK before regenerating native config.
    $developmentApk = Join-Path $mobileRoot 'android/app/build/outputs/apk/debug/app-debug.apk'
    if (Test-Path -LiteralPath $developmentApk) {
        Copy-Item -LiteralPath $developmentApk -Destination (Join-Path $artifactDirectory 'higio-previous-debug.apk')
    }

    if ($Resume) {
        $gradleFile = Join-Path $mobileRoot 'android/app/build.gradle'
        if (-not (Test-Path -LiteralPath $gradleFile) -or
            -not (Select-String -LiteralPath $gradleFile -SimpleMatch "applicationId 'com.domag.higio.preview'" -Quiet)) {
            throw 'Resume zahtijeva postojeći Android preview projekt. Pokreni build bez -Resume.'
        }
    } else {
        & node node_modules/expo/bin/cli prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild nije uspio.' }
    }

    Push-Location (Join-Path $mobileRoot 'android')
    try {
        & .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --max-workers=2 --no-daemon --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Android release build nije uspio.' }
    } finally {
        Pop-Location
    }

    $sourceApk = Join-Path $mobileRoot 'android/app/build/outputs/apk/release/app-release.apk'
    $targetApk = Join-Path $artifactDirectory 'higio-alpha.apk'
    Copy-Item -LiteralPath $sourceApk -Destination $targetApk
    $hash = (Get-FileHash -LiteralPath $targetApk -Algorithm SHA256).Hash
    Set-Content -LiteralPath (Join-Path $artifactDirectory 'higio-alpha.apk.sha256') -Value "$hash  higio-alpha.apk"
    Write-Output "Alpha APK: $targetApk"
    Write-Output 'Lokalni release s razvojnim potpisom; samo za privatno testiranje.'
} finally {
    $env:APP_VARIANT = $previousVariant
    $env:NODE_ENV = $previousNodeEnv
    $env:CMAKE_BUILD_PARALLEL_LEVEL = $previousParallelism
    Pop-Location
}
