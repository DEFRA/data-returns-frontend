#!/usr/bin/env bash
cd /srv/data-returns
source ~ubuntu/.data-returns/.dr_env
npm install
echo "http_proxy= https_proxy= node server.js" > /srv/data-returns/data-returns.sh
chmod u+x /srv/data-returns/data-returns.sh
pm2 start data-returns.sh