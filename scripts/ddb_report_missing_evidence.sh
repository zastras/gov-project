#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-gov}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
TABLE="${TABLE:-governance_items}"
REGULATOR_KEY="${REGULATOR_KEY:-}"
OUT_MD="${OUT_MD:-/tmp/governance_missing_evidence.md}"
BASE_URL="${BASE_URL:-}"

if [[ -z "$REGULATOR_KEY" ]]; then
  echo "REGULATOR_KEY required"
  exit 2
fi

export AWS_PAGER=""

PK="REG#${REGULATOR_KEY}"

echo "Querying items for $PK..."

EV_FILE="$(mktemp)"
cat > "$EV_FILE" <<EOF
{
  ":pk":  { "S": "$PK" },
  ":pfx": { "S": "ITEM#" }
}
EOF

ITEMS_JSON="$(mktemp)"

# owner + status are reserved in ProjectionExpression, so alias both.
aws --no-cli-pager \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  dynamodb query \
  --table-name "$TABLE" \
  --key-condition-expression "PK = :pk AND begins_with(SK, :pfx)" \
  --expression-attribute-values file://"$EV_FILE" \
  --projection-expression "SK,itemId,title,#own,#st,updatedAt" \
  --expression-attribute-names '{"#st":"status","#own":"owner"}' \
  --output json > "$ITEMS_JSON"

COUNT="$(jq -r '.Count' < "$ITEMS_JSON")"
echo "Found $COUNT items."

TMP_ROWS="$(mktemp)"
i=0

jq -r '
  .Items[] |
  [
    (.itemId.S // (.SK.S | sub("^ITEM#"; ""))),
    (.title.S // ""),
    (.owner.S // ""),
    (.status.S // ""),
    (.updatedAt.S // "")
  ] | @tsv
' < "$ITEMS_JSON" |
while IFS=$'\t' read -r itemId title owner status updatedAt; do
  i=$((i+1))

  # ✅ Correct PK format (no embedded quotes)
  EVID_PK="REG#${REGULATOR_KEY}#ITEM#${itemId}"

  EVID_COUNT="$(
    aws --no-cli-pager \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      dynamodb query \
      --table-name "$TABLE" \
      --key-condition-expression "PK = :pk AND begins_with(SK, :e)" \
      --expression-attribute-values "{
        \":pk\": {\"S\": \"$EVID_PK\"},
        \":e\":  {\"S\": \"EVID#\"}
      }" \
      --select COUNT \
      --output json | jq -r '.Count'
  )"

  echo "[$i/$COUNT] $itemId evidence=$EVID_COUNT"

  if [[ "$EVID_COUNT" == "0" ]]; then
    LINK=""
    [[ -n "$BASE_URL" ]] && LINK="${BASE_URL%/}/${itemId}"
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
      "$REGULATOR_KEY" "$itemId" "$title" "$owner" "$status" "$updatedAt" "$LINK" >> "$TMP_ROWS"
  fi
done

{
  echo "# Governance items missing evidence"
  echo
  echo "| Regulator | Item ID | Title | Owner | Status | Updated At | Link |"
  echo "|---|---|---|---|---|---|---|"
  if [[ -s "$TMP_ROWS" ]]; then
    while IFS=$'\t' read -r reg itemId title owner status updatedAt link; do
      title="${title//|/\\|}"
      owner="${owner//|/\\|}"
      status="${status//|/\\|}"
      updatedAt="${updatedAt//|/\\|}"
      echo "| $reg | $itemId | $title | $owner | $status | $updatedAt | $link |"
    done < <(sort -t$'\t' -k2,2 "$TMP_ROWS")
  fi
} > "$OUT_MD"

echo "Report written to $OUT_MD"

rm -f "$EV_FILE" "$ITEMS_JSON" "$TMP_ROWS"
