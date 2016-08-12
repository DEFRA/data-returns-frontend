#!/usr/bin/env bash
cd /srv/data-returns
pm2 stop all
npm prune
npm install
npm update
pm2 start data-returns.sh
