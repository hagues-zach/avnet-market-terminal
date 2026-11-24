#!/usr/bin/env bash
# Writes Market News article briefs ahead of time, so readers never wait for one.
# Run by .github/workflows/news-briefs.yml; any other scheduler (Azure, Jenkins,
# cron) can run it the same way, every 30 minutes. Needs SITE_URL and CRON_SECRET.
set -euo pipefail

: "${SITE_URL:?Set SITE_URL to the address of the site, for example https://terminal.example.com}"
: "${CRON_SECRET:?Set CRON_SECRET to the same value the site has}"

body=$(curl -fsS --max-time 150 -H "Authorization: Bearer $CRON_SECRET" "${SITE_URL%/}/api/cron/news-briefs")
echo "$body"
# AI off on the site means nothing will ever be written; fail so someone looks.
case "$body" in *'"status":"off"'*) exit 1 ;; esac
