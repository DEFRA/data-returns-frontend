#!/usr/bin/env bash
cd /srv/data-returns
source ~ubuntu/.data-returns/.dr_env
npm install
pm2 start server.js