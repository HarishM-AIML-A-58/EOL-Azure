# Deploy L&T-CORe to Corporate Azure Account (PowerShell)
# This script deploys the application under the corporate account (contact@tendworks.com)
# using the available domain name: eol-harish.azurewebsites.net.
# It automatically reads your local .env file to configure app settings.

$ErrorActionPreference = "Stop"

# --- CONFIGURATION ---
$TargetUser = "contact@tendworks.com"
$WebAppName = "eol-harish"
$TargetResourceGroup = "eol-harish-rg"
$TargetLocation = "centralindia"
$TargetAppServicePlan = "eol-harish-plan"
$BackupDir = "./azure_backup"
$EnvFile = "./.env"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STEP 1: Verify Azure CLI Session" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check logged in user
$accountInfo = az account show --output json | ConvertFrom-Json
Write-Host "Active Account: $($accountInfo.user.name)" -ForegroundColor Green
Write-Host "Active Subscription: $($accountInfo.name) ($($accountInfo.id))" -ForegroundColor Green

if ($accountInfo.user.name -ne $TargetUser) {
    Write-Host "Warning: You are currently logged in as $($accountInfo.user.name) instead of $TargetUser." -ForegroundColor Yellow
    $loginConfirm = Read-Host "Would you like to log in as $TargetUser now? (yes/no)"
    if ($loginConfirm -eq "yes") {
        az login --user $TargetUser
    }
}

# --- PARSE LOCAL .ENV FILE ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 2: Load Local Secrets (.env)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (!(Test-Path $EnvFile)) {
    Write-Error "Local .env file not found at $EnvFile! Cannot configure app settings."
}

Write-Host "Reading environment variables from $EnvFile..." -ForegroundColor Green
$appSettings = @()
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith("#") -and $line.Contains("=")) {
        $key = $line.Substring(0, $line.IndexOf("=")).Trim()
        $value = $line.Substring($line.IndexOf("=") + 1).Trim()
        # Remove surrounding quotes if present
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key) {
            $appSettings += "$key=$value"
            Write-Host "Found setting: $key" -ForegroundColor Yellow
        }
    }
}

# --- CREATE AZURE RESOURCES ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 3: Create Resource Group & App Service Plan" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "Creating Resource Group '$TargetResourceGroup'..." -ForegroundColor Green
az group create --name $TargetResourceGroup --location $TargetLocation

Write-Host "Creating App Service Plan '$TargetAppServicePlan' (B1 Basic Linux)..." -ForegroundColor Green
az appservice plan create --name $TargetAppServicePlan --resource-group $TargetResourceGroup --sku B1 --is-linux --location $TargetLocation

# --- CREATE & CONFIG WEB APP ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 4: Create Web App '$WebAppName'" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "Creating Web App..." -ForegroundColor Green
az webapp create --name $WebAppName --resource-group $TargetResourceGroup --plan $TargetAppServicePlan --runtime "PYTHON:3.11"

Write-Host "Configuring custom startup command..." -ForegroundColor Green
az webapp config set --name $WebAppName --resource-group $TargetResourceGroup --startup-file "startup.sh"

if ($appSettings.Count -gt 0) {
    Write-Host "Applying environment variables/secrets..." -ForegroundColor Green
    az webapp config appsettings set --name $WebAppName --resource-group $TargetResourceGroup --settings $appSettings | Out-Null
    Write-Host "App settings successfully loaded!" -ForegroundColor Green
}

# --- BUILD AND DEPLOY CODE ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 5: Build Frontend and Deploy" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Compile Frontend
Write-Host "Building React Frontend..." -ForegroundColor Green
cd frontend
npm install
npm run build
cd ..

# 2. Package Backend
Write-Host "Creating deployment package with forward-slash path separators..." -ForegroundColor Green
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}
$ZipFile = (Resolve-Path $BackupDir).Path + "/deployment-package.zip"
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}
$SourceDir = (Resolve-Path "./backend").Path

# Ensure startup.sh has Linux line endings (LF) and UTF8 without BOM
$startupPath = Join-Path $SourceDir "startup.sh"
if (Test-Path $startupPath) {
    Write-Host "Normalizing line endings for startup.sh to Linux LF (UTF-8 No BOM)..." -ForegroundColor Yellow
    $content = [System.IO.File]::ReadAllText($startupPath)
    $content = $content -replace "`r`n", "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($startupPath, $content, $utf8NoBom)
}

# Manually create the zip file using .NET ZipArchive to guarantee forward-slash path separators
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($ZipFile, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $SourceDir -Recurse | ForEach-Object {
    if (!$_.PSIsContainer) {
        $relativePath = $_.FullName.Substring($SourceDir.Length + 1)
        # Convert Windows backslashes to Linux forward-slashes
        $entryName = $relativePath.Replace("\", "/")
        
        $entry = $zip.CreateEntry($entryName)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($_.FullName)
        $fileStream.CopyTo($entryStream)
        $fileStream.Close()
        $entryStream.Close()
    }
}
$zip.Dispose()

Write-Host "Deployment package created at $ZipFile" -ForegroundColor Yellow

# 3. Deploy
Write-Host "Deploying to Azure..." -ForegroundColor Green
az webapp deploy --resource-group $TargetResourceGroup --name $WebAppName --src-path $ZipFile --type zip --restart true

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host " Your app is running on your corporate account at:" -ForegroundColor Green
Write-Host " https://$WebAppName.azurewebsites.net" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
