#!/bin/bash
# Deploy L&T-CORe to Corporate Azure Account (Bash)
# This script deploys the application under the corporate account (contact@tendworks.com)
# using the available domain name: eol-harish.azurewebsites.net.
# It automatically reads your local .env file to configure app settings.

set -e

# --- CONFIGURATION ---
TARGET_USER="contact@tendworks.com"
WEB_APP_NAME="eol-harish"
TARGET_RESOURCE_GROUP="eol-harish-rg"
TARGET_LOCATION="centralindia"
TARGET_APP_SERVICE_PLAN="eol-harish-plan"
BACKUP_DIR="./azure_backup"
ENV_FILE="./.env"

echo "=========================================================="
echo " STEP 1: Verify Azure CLI Session"
echo "=========================================================="

# Check logged in user
USER_NAME=$(az account show --query "user.name" -o tsv)
SUB_NAME=$(az account show --query "name" -o tsv)
SUB_ID=$(az account show --query "id" -o tsv)

echo "Active Account: $USER_NAME"
echo "Active Subscription: $SUB_NAME ($SUB_ID)"

if [ "$USER_NAME" != "$TARGET_USER" ]; then
    echo "Warning: You are currently logged in as $USER_NAME instead of $TARGET_USER."
    read -p "Would you like to log in as $TARGET_USER now? (yes/no): " LOGIN_CONFIRM
    if [ "$LOGIN_CONFIRM" == "yes" ]; then
        az login --user "$TARGET_USER"
    fi
fi

# --- PARSE LOCAL .ENV FILE ---
echo -e "\n=========================================================="
echo " STEP 2: Load Local Secrets (.env)"
echo "=========================================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "Local .env file not found at $ENV_FILE! Cannot configure app settings."
    exit 1
fi

echo "Reading environment variables from $ENV_FILE..."
APP_SETTINGS=""
while read -r line || [ -n "$line" ]; do
    # Trim whitespace
    line=$(echo "$line" | xargs)
    # Ignore comments and empty lines
    if [[ ! -z "$line" && ! "$line" =~ ^# && "$line" == *"="* ]]; then
        key=$(echo "$line" | cut -d'=' -f1 | xargs)
        value=$(echo "$line" | cut -d'=' -f2- | xargs)
        # Strip outer single or double quotes
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        if [ ! -z "$key" ]; then
            APP_SETTINGS+="$key=$value "
            echo "Found setting: $key"
        fi
    fi
done < "$ENV_FILE"

# --- CREATE AZURE RESOURCES ---
echo -e "\n=========================================================="
echo " STEP 3: Create Resource Group & App Service Plan"
echo "=========================================================="

echo "Creating Resource Group '$TARGET_RESOURCE_GROUP'..."
az group create --name "$TARGET_RESOURCE_GROUP" --location "$TARGET_LOCATION"

echo "Creating App Service Plan '$TARGET_APP_SERVICE_PLAN' (B1 Basic Linux)..."
az appservice plan create --name "$TARGET_APP_SERVICE_PLAN" --resource-group "$TARGET_RESOURCE_GROUP" --sku B1 --is-linux --location "$TARGET_LOCATION"

# --- CREATE & CONFIG WEB APP ---
echo -e "\n=========================================================="
echo " STEP 4: Create Web App '$WEB_APP_NAME'"
echo "=========================================================="

echo "Creating Web App..."
az webapp create --name "$WEB_APP_NAME" --resource-group "$TARGET_RESOURCE_GROUP" --plan "$TARGET_APP_SERVICE_PLAN" --runtime "PYTHON:3.11"

echo "Configuring custom startup command..."
az webapp config set --name "$WEB_APP_NAME" --resource-group "$TARGET_RESOURCE_GROUP" --startup-file "startup.sh"

if [ ! -z "$APP_SETTINGS" ]; then
    echo "Applying environment variables/secrets..."
    az webapp config appsettings set --name "$WEB_APP_NAME" --resource-group "$TARGET_RESOURCE_GROUP" --settings $APP_SETTINGS > /dev/null
    echo "App settings successfully loaded!"
fi

# --- BUILD AND DEPLOY CODE ---
echo -e "\n=========================================================="
echo " STEP 5: Build Frontend and Deploy"
echo "=========================================================="

# 1. Compile Frontend
echo "Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Package Backend
echo "Creating deployment package..."
mkdir -p "$BACKUP_DIR"
ZIP_FILE="$BACKUP_DIR/deployment-package.zip"
rm -f "$ZIP_FILE"

cd backend
zip -r "../$ZIP_FILE" ./* > /dev/null
cd - > /dev/null

# 3. Deploy
echo "Deploying to Azure..."
az webapp deploy --resource-group "$TARGET_RESOURCE_GROUP" --name "$WEB_APP_NAME" --src-path "$ZIP_FILE" --type zip --restart true

echo -e "\n=========================================================="
echo " DEPLOYMENT SUCCESSFUL!"
echo " Your app is running on your corporate account at:"
echo " https://$WEB_APP_NAME.azurewebsites.net"
echo "=========================================================="
