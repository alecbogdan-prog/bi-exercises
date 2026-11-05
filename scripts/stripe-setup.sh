#!/usr/bin/env bash
# Creates the three products and prices in the Stripe account the Stripe CLI is logged in to (test mode by default).
# The site finds prices by lookup key, so nothing needs copying afterwards.
# Usage: scripts/stripe-setup.sh          (test mode)
#        scripts/stripe-setup.sh --live   (live mode, once you are ready to take real payments)
set -euo pipefail
MODE=()
[[ "${1:-}" == "--live" ]] && MODE=(--live)

# Tax code: Training Services - Self-study Web-based (eligible for Stripe Managed Payments).
TAX_CODE=txcd_20060058
product() { stripe products create ${MODE[@]+"${MODE[@]}"} --name "$1" --description "$2" -d "tax_code=$TAX_CODE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])'; }

PRO=$(product "Power BI Exercises Pro" "Every exercise, project and PL-300 practice test")
stripe prices create ${MODE[@]+"${MODE[@]}"} --product "$PRO" --currency usd --unit-amount 7900 -d "recurring[interval]=year" --lookup-key pro_yearly --nickname "Pro yearly" >/dev/null
stripe prices create ${MODE[@]+"${MODE[@]}"} --product "$PRO" --currency usd --unit-amount 1299 -d "recurring[interval]=month" --lookup-key pro_monthly --nickname "Pro monthly" >/dev/null

PREP=$(product "PL-300 Prep" "3 months of PL-300 practice tests")
stripe prices create ${MODE[@]+"${MODE[@]}"} --product "$PREP" --currency usd --unit-amount 4900 --lookup-key pl300_prep --nickname "PL-300 Prep, 3 months" >/dev/null

TEAM=$(product "Power BI Exercises Team" "Pro for every seat, a manager dashboard and company invoices. Billed yearly per seat.")
stripe prices create ${MODE[@]+"${MODE[@]}"} --product "$TEAM" --currency usd --unit-amount 14400 -d "recurring[interval]=year" --lookup-key team_seat_yearly --nickname "Team seat, yearly" >/dev/null

echo "Created: Pro ($PRO) with pro_yearly + pro_monthly, PL-300 Prep ($PREP) with pl300_prep, Team ($TEAM) with team_seat_yearly."
