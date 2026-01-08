#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-gov}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
TABLE="${TABLE:-governance_items}"
REGULATOR_KEY="${REGULATOR_KEY:-}"
UPDATED_BY="${UPDATED_BY:-cli}"
DRY_RUN="${DRY_RUN:-}"

TARGET_STATUS="${1:-}"

if [[ -z "$REGULATOR_KEY" ]]; then
  echo "REGULATOR_KEY required (e.g. FCA-SPI)"
  exit 2
fi

if [[ -z "$TARGET_STATUS" ]]; then
  echo "Usage: $0 \"NOT STARTED|DRAFT|REVIEW|FINAL\""
  exit 2
fi

case "$TARGET_STATUS" in
  "NOT STARTED"|"DRAFT"|"REVIEW"|"FINAL") ;;
  *) echo "Invalid status: $TARGET_STATUS"; exit 2 ;;
esac

export AWS_PAGER=""

now_iso() { date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"; }
status_token() { echo "$1" | tr '[:lower:]' '[:upper:]' | tr ' ' '_'; }

PK="REG#${REGULATOR_KEY}"
TOKEN="$(status_token "$TARGET_STATUS")"
NEW_GSI1PK="REG#${REGULATOR_KEY}#STATUS#${TOKEN}"

echo "Querying items for $PK..."

# ---- expression values JSON (NO ESCAPING) ----
EV_FILE="$(mktemp)"
cat > "$EV_FILE" <<EOF
{
  ":pk":  { "S": "$PK" },
  ":pfx": { "S": "ITEM#" }
}
EOF

QUERY_OUT="$(mktemp)"

aws --no-cli-pager \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  dynamodb query \
  --table-name "$TABLE" \
  --key-condition-expression "PK = :pk AND begins_with(SK, :pfx)" \
  --expression-attribute-values file://"$EV_FILE" \
  --projection-expression "PK,SK" \
  --output json > "$QUERY_OUT"

COUNT="$(jq -r '.Count' < "$QUERY_OUT")"
echo "Found $COUNT items."

i=0
jq -r '.Items[] | [.PK.S, .SK.S] | @tsv' < "$QUERY_OUT" |
while IFS=$'\t' read -r item_pk item_sk; do
  i=$((i+1))
  TS="$(now_iso)"

  if [[ -n "$DRY_RUN" ]]; then
    echo "[$i/$COUNT] DRY_RUN $item_sk → $TARGET_STATUS"
    continue
  fi

  aws --no-cli-pager \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    dynamodb update-item \
    --table-name "$TABLE" \
    --key "{\"PK\":{\"S\":\"$item_pk\"},\"SK\":{\"S\":\"$item_sk\"}}" \
    --update-expression "SET #s=:s, #g=:g, updatedAt=:u, updatedBy=:b" \
    --expression-attribute-names '{"#s":"status","#g":"GSI1PK"}' \
    --expression-attribute-values "{
      \":s\": {\"S\": \"$TARGET_STATUS\"},
      \":g\": {\"S\": \"$NEW_GSI1PK\"},
      \":u\": {\"S\": \"$TS\"},
      \":b\": {\"S\": \"$UPDATED_BY\"}
    }" \
    >/dev/null

  echo "[$i/$COUNT] Updated $item_sk"
done

rm -f "$EV_FILE" "$QUERY_OUT"
