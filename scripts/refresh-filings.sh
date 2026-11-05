#!/usr/bin/env bash
# Refreshes cached company filings before visitors would have to, one batch at a
# time. Run by .github/workflows/refresh-filings.yml; any other scheduler (Azure,
# Jenkins, cron) can run it the same way. Needs SITE_URL and CRON_SECRET.
set -euo pipefail

: "${SITE_URL:?Set SITE_URL to the address of the site, for example https://terminal.example.com}"
: "${CRON_SECRET:?Set CRON_SECRET to the same value the site has}"

# Keeps the run under SEC's limit of 10 requests a second.
PAUSE_SECONDS=5
from=0
failed=0

while :; do
  body=$(curl -fsS --max-time 120 -H "Authorization: Bearer $CRON_SECRET" "${SITE_URL%/}/api/cron/refresh-filings?from=$from")
  echo "from $from: $body"
  case "$body" in *'"failed":[]'*) ;; *) failed=1 ;; esac
  from=$(printf '%s' "$body" | sed -n 's/.*"next":\([0-9][0-9]*\).*/\1/p')
  [ -n "$from" ] || break
  sleep "$PAUSE_SECONDS"
done

exit "$failed"
