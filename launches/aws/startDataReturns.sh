#!/usr/bin/env bash

ENV_VARS_FILE="~ubuntu/.data-returns/.dr_env"
SERVICE_HOME="/srv/data-returns"
LOG_DIR="${SERVICE_HOME}/logs"

source ${ENV_VARS_FILE}

cd ${SERVICE_HOME}

# Install node modules
npm install

# Create log folder
if [ ! -d ${LOG_DIR} ]; then
    mkdir ${LOG_DIR}
fi
echo "http_proxy= https_proxy= node server.js" > /srv/data-returns/data-returns.sh
chmod u+x /srv/data-returns/data-returns.sh
pm2 start data-returns.sh