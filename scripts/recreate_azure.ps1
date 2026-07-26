# Azure Resource Recreation and Deployment Script (PowerShell)
# This script migrates your Azure Web Apps from the old student account to the new corporate account
# while maintaining the exact same domain names (lttseol-harish and eolproject-harish).
# It does this by backing up configs, deleting the old instances (to release the names),
# recreating them in the new account, and deploying the application.

$ErrorActionPreference = "Stop"

# --- CONFIGURATION ---
$SourceUser = "230801238@rajalakshmi.edu.in"
$TargetUser = "contact@tendworks.com"
$WebAppNames = @("lttseol-harish", "eolproject-harish")
$TargetResourceGroup = "tendworks-eol-rg"
$TargetLocation = "eastus"
$TargetAppServicePlan = "tendworks-eol-plan"
$BackupDir = "./azure_backup"

# Create backup directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STEP 1: Log in to the SOURCE account ($SourceUser)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Please sign in to the browser window that opens." -ForegroundColor Yellow
az login --user $SourceUser

# Select Subscription
Write-Host "`nRetrieving subscriptions..." -ForegroundColor Cyan
az account list --output table
$SourceSub = Read-Host "`nEnter the Subscription ID or Name you wish to migrate FROM"
az account set --subscription $SourceSub

# --- BACKUP APP SETTINGS ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 2: Backup App Settings and Configs" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

foreach ($AppName in $WebAppNames) {
    Write-Host "Checking if Web App '$AppName' exists..." -ForegroundColor Green
    $exists = az webapp list --query "[?name=='$AppName']" | ConvertFrom-Json
    if ($exists.Count -gt 0) {
        Write-Host "Backing up settings for $AppName..." -ForegroundColor Green
        # Get App Settings
        az webapp config appsettings list --name $AppName --resource-group $exists[0].resourceGroup --output json > "$BackupDir/$AppName-settings.json"
        # Get General Connection/Routing Config
        az webapp config show --name $AppName --resource-group $exists[0].resourceGroup --output json > "$BackupDir/$AppName-config.json"
        
        Write-Host "Settings backed up to $BackupDir/$AppName-settings.json" -ForegroundColor Yellow
    } else {
        Write-Host "Web App '$AppName' not found in this subscription. Skipping backup." -ForegroundColor Red
    }
}

# --- DELETE OLD WEB APPS ---
Write-Host "`n==========================================================" -ForegroundColor Red
Write-Host " STEP 3: Delete Old Web Apps (To Release Domain Names)" -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red
Write-Host "WARNING: This will delete the web apps from the old account," -ForegroundColor Red
Write-Host "which will make the domains (*.azurewebsites.net) temporarily available." -ForegroundColor Red
$confirm = Read-Host "Are you absolutely sure you want to proceed? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Migration cancelled by user." -ForegroundColor Yellow
    exit
}

foreach ($AppName in $WebAppNames) {
    $exists = az webapp list --query "[?name=='$AppName']" | ConvertFrom-Json
    if ($exists.Count -gt 0) {
        Write-Host "Deleting Web App '$AppName' from resource group '$($exists[0].resourceGroup)'..." -ForegroundColor Red
        az webapp delete --name $AppName --resource-group $($exists[0].resourceGroup) --keep-empty-plan false
        Write-Host "Deleted $AppName successfully. Domain name has been released." -ForegroundColor Green
    }
}

# --- LOGIN TO TARGET ACCOUNT ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 4: Log in to the TARGET account ($TargetUser)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Please sign in to the browser window using your corporate credentials." -ForegroundColor Yellow
az login --user $TargetUser

# Select Target Subscription
Write-Host "`nRetrieving corporate subscriptions..." -ForegroundColor Cyan
az account list --output table
$TargetSub = Read-Host "`nEnter the Target Subscription ID or Name to migrate TO"
az account set --subscription $TargetSub

# --- CREATE TARGET RESOURCES ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 5: Create Resource Group and App Service Plan" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Create Resource Group
Write-Host "Creating Resource Group '$TargetResourceGroup' in '$TargetLocation'..." -ForegroundColor Green
az group create --name $TargetResourceGroup --location $TargetLocation

# Create Linux App Service Plan (B1 Tier for Custom Startups/Linux Containers)
Write-Host "Creating App Service Plan '$TargetAppServicePlan' (B1 Basic Linux)..." -ForegroundColor Green
az appservice plan create --name $TargetAppServicePlan --resource-group $TargetResourceGroup --sku B1 --is-linux --location $TargetLocation

# --- RECREATE WEB APPS AND RESTORE CONFIGS ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 6: Recreate Web Apps and Restore Configs" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

foreach ($AppName in $WebAppNames) {
    Write-Host "Recreating Web App '$AppName' with the exact same domain..." -ForegroundColor Green
    az webapp create --name $AppName --resource-group $TargetResourceGroup --plan $TargetAppServicePlan --runtime "PYTHON:3.11" --location $TargetLocation
    
    # Configure custom startup script
    Write-Host "Configuring custom startup script..." -ForegroundColor Green
    az webapp config set --name $AppName --resource-group $TargetResourceGroup --startup-file "startup.sh"

    # Restore App Settings
    if (Test-Path "$BackupDir/$AppName-settings.json") {
        Write-Host "Restoring App Settings for $AppName..." -ForegroundColor Green
        
        # Load settings from backup, filtering out read-only platform settings
        $settings = Get-Content "$BackupDir/$AppName-settings.json" | ConvertFrom-Json
        $filteredSettings = @()
        foreach ($setting in $settings) {
            # Skip read-only Azure/System variables
            if ($setting.name -notlike "WEBSITE_*" -and $setting.name -notlike "APPINSIGHTS_*" -and $setting.name -notlike "DIAGNOSTICS_*") {
                $filteredSettings += "$($setting.name)=$($setting.value)"
            }
        }
        
        # Apply setting updates
        if ($filteredSettings.Count -gt 0) {
            az webapp config appsettings set --name $AppName --resource-group $TargetResourceGroup --settings $filteredSettings | Out-Null
            Write-Host "App Settings restored successfully." -ForegroundColor Yellow
        }
    }
}

# --- BUILD AND DEPLOY CODE ---
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " STEP 7: Build Frontend and Deploy Monolith" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Compile Frontend
Write-Host "Building React Frontend..." -ForegroundColor Green
cd frontend
npm install
npm run build
cd ..

# 2. Package Backend Monolith
Write-Host "Creating deployment package..." -ForegroundColor Green
$ZipFile = "$BackupDir/deployment-package.zip"
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}

# Zip the backend directory (which now contains frontend assets under backend/static/dist)
Compress-Archive -Path ./backend/* -DestinationPath $ZipFile

# 3. Deploy to Azure Web Apps
# We deploy the compiled package to the Web Apps
foreach ($AppName in $WebAppNames) {
    Write-Host "Deploying code package to '$AppName'..." -ForegroundColor Green
    az webapp deploy --resource-group $TargetResourceGroup --name $AppName --src-path $ZipFile --type zip --restart true
    Write-Host "Deployment to '$AppName' completed!" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " MIGRATION AND DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host " Both apps are running on the exact same domains in the new tenant:" -ForegroundColor Green
Write-Host " - https://lttseol-harish.azurewebsites.net" -ForegroundColor Yellow
Write-Host " - https://eolproject-harish.azurewebsites.net" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
