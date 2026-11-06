#!/usr/bin/env bash
# Builds the morning brief's shared corpus for the day. Run by
# .github/workflows/brief-corpus.yml; any other scheduler (Azure, Jenkins, cron)
# can run it the same way, between 02:00 and 04:00 Eastern. Needs SITE_URL and
# CRON_SECRET.
set -euo pipefail

: "${SITE_URL:?Set SITE_URL to the address of the site, for example https://terminal.example.com}"
: "${CRON_SECRET:?Set CRON_SECRET to the same value the site has}"

body=$(curl -fsS --max-time 150 -H "Authorization: Bearer $CRON_SECRET" "${SITE_URL%/}/api/cron/brief-corpus")
echo "$body"
# Zero items means every source failed; fail the run so someone looks.
case "$body" in *'"items":0,'*) exit 1 ;; esac
