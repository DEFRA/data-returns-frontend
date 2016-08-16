#!/usr/bin/env bash
cd /srv/data-returns
source ~ubuntu/.dr_env
npm install
pm2 start server.js