#!/bin/bash
# Azure Resource Recreation and Deployment Script (Bash)
# This script migrates your Azure Web Apps from the old student account to the new corporate account
# while maintaining the exact same domain names (lttseol-harish and eolproject-harish).

set -e

# --- CONFIGURATION ---
SOURCE_USER="230801238@rajalakshmi.edu.in"
TARGET_USER="contact@tendworks.com"
WEB_APP_NAMES=("lttseol-harish" "eolproject-harish")
TARGET_RESOURCE_GROUP="tendworks-eol-rg"
TARGET_LOCATION="eastus"
TARGET_APP_SERVICE_PLAN="tendworks-eol-plan"
BACKUP_DIR="./azure_backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "=========================================================="
echo " STEP 1: Log in to the SOURCE account ($SOURCE_USER)"
echo "=========================================================="
echo "Please sign in to the browser window that opens."
az login --user "$SOURCE_USER"

# Select Subscription
echo -e "\nRetrieving subscriptions..."
az account list --output table
echo ""
read -p "Enter the Subscription ID or Name you wish to migrate FROM: " SOURCE_SUB
az account set --subscription "$SOURCE_SUB"

# --- BACKUP APP SETTINGS ---
echo -e "\n=========================================================="
echo " STEP 2: Backup App Settings and Configs"
echo "=========================================================="

for AppName in "${WEB_APP_NAMES[@]}"; do
    echo "Checking if Web App '$AppName' exists..."
    # Check if webapp exists and capture its Resource Group
    RG=$(az webapp list --query "[?name=='$AppName'].resourceGroup" -o tsv)
    if [ ! -z "$RG" ]; then
        echo "Backing up settings for $AppName from Resource Group $RG..."
        # Get App Settings
        az webapp config appsettings list --name "$AppName" --resource-group "$RG" --output json > "$BACKUP_DIR/$AppName-settings.json"
        # Get General Config
        az webapp config show --name "$AppName" --resource-group "$RG" --output json > "$BACKUP_DIR/$AppName-config.json"
        echo "Settings backed up to $BACKUP_DIR/$AppName-settings.json"
    else
        echo "Web App '$AppName' not found in this subscription. Skipping backup."
    fi
done

# --- DELETE OLD WEB APPS ---
echo -e "\n=========================================================="
echo " STEP 3: Delete Old Web Apps (To Release Domain Names)"
echo "=========================================================="
echo "WARNING: This will delete the web apps from the old account,"
echo "which will make the domains (*.azurewebsites.net) temporarily available."
read -p "Are you absolutely sure you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled by user."
    exit 0
fi

for AppName in "${WEB_APP_NAMES[@]}"; do
    RG=$(az webapp list --query "[?name=='$AppName'].resourceGroup" -o tsv)
    if [ ! -z "$RG" ]; then
        echo "Deleting Web App '$AppName' from resource group '$RG'..."
        az webapp delete --name "$AppName" --resource-group "$RG" --keep-empty-plan false
        echo "Deleted $AppName successfully. Domain name has been released."
    fi
done

# --- LOGIN TO TARGET ACCOUNT ---
echo -e "\n=========================================================="
echo " STEP 4: Log in to the TARGET account ($TARGET_USER)"
echo "=========================================================="
echo "Please sign in to the browser window using your corporate credentials."
az login --user "$TARGET_USER"

# Select Target Subscription
echo -e "\nRetrieving corporate subscriptions..."
az account list --output table
echo ""
read -p "Enter the Target Subscription ID or Name to migrate TO: " TARGET_SUB
az account set --subscription "$TARGET_SUB"

# --- CREATE TARGET RESOURCES ---
echo -e "\n=========================================================="
echo " STEP 5: Create Resource Group and App Service Plan"
echo "=========================================================="

echo "Creating Resource Group '$TARGET_RESOURCE_GROUP' in '$TARGET_LOCATION'..."
az group create --name "$TARGET_RESOURCE_GROUP" --location "$TARGET_LOCATION"

echo "Creating App Service Plan '$TARGET_APP_SERVICE_PLAN' (B1 Basic Linux)..."
az appservice plan create --name "$TARGET_APP_SERVICE_PLAN" --resource-group "$TARGET_RESOURCE_GROUP" --sku B1 --is-linux --location "$TARGET_LOCATION"

# --- RECREATE WEB APPS AND RESTORE CONFIGS ---
echo -e "\n=========================================================="
echo " STEP 6: Recreate Web Apps and Restore Configs"
echo "=========================================================="

for AppName in "${WEB_APP_NAMES[@]}"; do
    echo "Recreating Web App '$AppName' with the exact same domain..."
    az webapp create --name "$AppName" --resource-group "$TARGET_RESOURCE_GROUP" --plan "$TARGET_APP_SERVICE_PLAN" --runtime "PYTHON:3.11" --location "$TARGET_LOCATION"
    
    echo "Configuring custom startup script..."
    az webapp config set --name "$AppName" --resource-group "$TARGET_RESOURCE_GROUP" --startup-file "startup.sh"

    # Restore App Settings
    SETTINGS_FILE="$BACKUP_DIR/$AppName-settings.json"
    if [ -f "$SETTINGS_FILE" ]; then
        echo "Restoring App Settings for $AppName..."
        
        # Build settings updates, skipping system read-only variables
        SETTINGS_PARAMS=""
        while read -r name value; do
            if [[ "$name" != WEBSITE_* && "$name" != APPINSIGHTS_* && "$name" != DIAGNOSTICS_* ]]; then
                SETTINGS_PARAMS+="$name=$value "
            fi
        done < <(jq -r '.[] | "\(.name) \(.value)"' "$SETTINGS_FILE")
        
        if [ ! -z "$SETTINGS_PARAMS" ]; then
            az webapp config appsettings set --name "$AppName" --resource-group "$TARGET_RESOURCE_GROUP" --settings $SETTINGS_PARAMS > /dev/null
            echo "App Settings restored successfully."
        fi
    fi
done

# --- BUILD AND DEPLOY CODE ---
echo -e "\n=========================================================="
echo " STEP 7: Build Frontend and Deploy Monolith"
echo "=========================================================="

# 1. Compile Frontend
echo "Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Package Backend Monolith
echo "Creating deployment package..."
ZIP_FILE="$BACKUP_DIR/deployment-package.zip"
rm -f "$ZIP_FILE"

# Zip the backend directory contents
cd backend
zip -r "../$ZIP_FILE" ./* > /dev/null
cd ..

# 3. Deploy to Azure Web Apps
for AppName in "${WEB_APP_NAMES[@]}"; do
    echo "Deploying code package to '$AppName'..."
    az webapp deploy --resource-group "$TARGET_RESOURCE_GROUP" --name "$AppName" --src-path "$ZIP_FILE" --type zip --restart true
    echo "Deployment to '$AppName' completed!"
done

echo -e "\n=========================================================="
echo " MIGRATION AND DEPLOYMENT SUCCESSFUL!"
echo " Both apps are running on the exact same domains in the new tenant:"
echo " - https://lttseol-harish.azurewebsites.net"
echo " - https://eolproject-harish.azurewebsites.net"
echo "=========================================================="
