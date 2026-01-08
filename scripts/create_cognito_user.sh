#!/usr/bin/env bash
set -euo pipefail

# create_cognito_user.sh
#
# Creates a user in the Zastras Governance Cognito User Pool
# and sets a PERMANENT password (no forced change on first login).
#
# Embedded environment:
AWS_PROFILE="gov"
AWS_REGION="eu-west-2"
USER_POOL_ID="eu-west-2_tJYdJDWiD"

# Required args:
#   --username <value>
#   --password <permanent password>
#
# Optional args:
#   --email <email>
#   --name <full name>
#   --given-name <first>
#   --family-name <last>
#   --phone <E.164 phone>
#   --suppress-email          (do not send invite email)
#   --force-alias
#   --group <groupName>       (repeatable)
#   --groups "a,b,c"
#   --no-groups
#   --list-groups
#   --dry-run

# Example:
# ./create_cognito_user.sh \
#   --username lex+1@zastras.uk \
#   --password 'StrongPermPassw0rd!23' \
#   --suppress-email

# or 

# ./create_cognito_user.sh --no-groups --username laurence.rixon@regtechpro.co.uk --password 'ZastrasConsorcia2026!' --suppress-email

# This creates the user, immediately converts the password to permanent, and the user will not be forced to change it on first login.

USERNAME=""
PASSWORD=""
EMAIL=""
NAME=""
GIVEN_NAME=""
FAMILY_NAME=""
PHONE=""
SUPPRESS_EMAIL="0"
FORCE_ALIAS="0"
NO_GROUPS="0"
LIST_GROUPS="0"
DRY_RUN="0"
GROUPS=()

die() { echo "Error: $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --username) USERNAME="${2:-}"; shift 2 ;;
    --password) PASSWORD="${2:-}"; shift 2 ;;
    --email) EMAIL="${2:-}"; shift 2 ;;
    --name) NAME="${2:-}"; shift 2 ;;
    --given-name) GIVEN_NAME="${2:-}"; shift 2 ;;
    --family-name) FAMILY_NAME="${2:-}"; shift 2 ;;
    --phone) PHONE="${2:-}"; shift 2 ;;
    --suppress-email) SUPPRESS_EMAIL="1"; shift ;;
    --force-alias) FORCE_ALIAS="1"; shift ;;
    --group) GROUPS+=("${2:-}"); shift 2 ;;
    --groups)
      IFS=',' read -r -a tmp <<< "${2:-}"
      for g in "${tmp[@]}"; do
        g="$(echo "$g" | xargs)"
        [[ -n "$g" ]] && GROUPS+=("$g")
      done
      shift 2
      ;;
    --no-groups) NO_GROUPS="1"; shift ;;
    --list-groups) LIST_GROUPS="1"; shift ;;
    --dry-run) DRY_RUN="1"; shift ;;
    -h|--help)
      sed -n '1,220p' "$0"
      exit 0
      ;;
    *) die "Unknown arg: $1" ;;
  esac
done

[[ -z "$USERNAME" ]] && die "--username is required"
[[ -z "$PASSWORD" ]] && die "--password is required"

export AWS_PAGER=""
AWS=(aws --no-cli-pager --profile "$AWS_PROFILE" --region "$AWS_REGION")

if [[ "$LIST_GROUPS" == "1" ]]; then
  "${AWS[@]}" cognito-idp list-groups --user-pool-id "$USER_POOL_ID" \
    | jq -r '.Groups[]? | [.GroupName, (.Description // ""), (.Precedence // "")] | @tsv' \
    | column -t -s $'\t'
  exit 0
fi

# Build attributes
ATTRS=()

if [[ -n "$EMAIL" ]]; then
  ATTRS+=("Name=email,Value=$EMAIL" "Name=email_verified,Value=true")
elif [[ "$USERNAME" == *"@"* ]]; then
  EMAIL="$USERNAME"
  ATTRS+=("Name=email,Value=$EMAIL" "Name=email_verified,Value=true")
fi

[[ -n "$NAME" ]] && ATTRS+=("Name=name,Value=$NAME")
[[ -n "$GIVEN_NAME" ]] && ATTRS+=("Name=given_name,Value=$GIVEN_NAME")
[[ -n "$FAMILY_NAME" ]] && ATTRS+=("Name=family_name,Value=$FAMILY_NAME")
[[ -n "$PHONE" ]] && ATTRS+=("Name=phone_number,Value=$PHONE" "Name=phone_number_verified,Value=true")

MSG_ACTION=()
[[ "$SUPPRESS_EMAIL" == "1" ]] && MSG_ACTION+=(--message-action SUPPRESS)

ALIAS_ARGS=()
[[ "$FORCE_ALIAS" == "1" ]] && ALIAS_ARGS+=(--force-alias-creation)

echo "User Pool ID: $USER_POOL_ID"
echo "Region: $AWS_REGION"
echo "Profile: $AWS_PROFILE"
echo "Username: $USERNAME"
[[ -n "$EMAIL" ]] && echo "Email: $EMAIL"
[[ -n "$NAME" ]] && echo "Name: $NAME"
[[ "$SUPPRESS_EMAIL" == "1" ]] && echo "Invite email: SUPPRESSED"
[[ "$NO_GROUPS" == "1" ]] && echo "Groups: (skipped)"
[[ "$DRY_RUN" == "1" ]] && echo "Mode: DRY_RUN"
echo

# Step 1: create user (temp password is a random throwaway)
# Generate a Cognito-policy-friendly temp password:
# - at least 1 upper, 1 lower, 1 digit, 1 symbol
# - length 16
gen_temp_password() {
  local upper lower digit sym rest
  upper="$(LC_ALL=C tr -dc 'A-Z' </dev/urandom | head -c 1)"
  lower="$(LC_ALL=C tr -dc 'a-z' </dev/urandom | head -c 1)"
  digit="$(LC_ALL=C tr -dc '0-9' </dev/urandom | head -c 1)"
  sym="$(LC_ALL=C tr -dc '!@#$%^&*()_+-=' </dev/urandom | head -c 1)"
  rest="$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+-=' </dev/urandom | head -c 12)"
  # shuffle to avoid predictable positions
  printf '%s' "${upper}${lower}${digit}${sym}${rest}" | fold -w1 | awk 'BEGIN{srand()} {a[NR]=$0} END{for(i=NR;i>1;i--){j=int(rand()*i)+1; t=a[i]; a[i]=a[j]; a[j]=t} for(i=1;i<=NR;i++) printf a[i] }'
}
TEMP_PASSWORD="$(gen_temp_password)"


CREATE_CMD=(
  "${AWS[@]}" cognito-idp admin-create-user
  --user-pool-id "$USER_POOL_ID"
  --username "$USERNAME"
  --temporary-password "$TEMP_PASSWORD"
  "${MSG_ACTION[@]}"
  "${ALIAS_ARGS[@]}"
)
[[ "${#ATTRS[@]}" -gt 0 ]] && CREATE_CMD+=(--user-attributes "${ATTRS[@]}")

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Would run:"
  printf ' %q' "${CREATE_CMD[@]}"
  echo
else
  "${CREATE_CMD[@]}" >/dev/null
  echo "Created user: $USERNAME"
fi

# Step 2: immediately set permanent password
SET_PASS_CMD=(
  "${AWS[@]}" cognito-idp admin-set-user-password
  --user-pool-id "$USER_POOL_ID"
  --username "$USERNAME"
  --password "$PASSWORD"
  --permanent
)

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Would run:"
  printf ' %q' "${SET_PASS_CMD[@]}"
  echo
else
  "${SET_PASS_CMD[@]}" >/dev/null
  echo "Permanent password set"
fi

# Group handling
if [[ "$NO_GROUPS" == "1" || "${#GROUPS[@]}" -eq 0 ]]; then
  echo "Done."
  exit 0
fi

VALID_GROUPS_JSON="$("${AWS[@]}" cognito-idp list-groups --user-pool-id "$USER_POOL_ID" --output json)"
mapfile -t VALID_GROUPS < <(jq -r '.Groups[]?.GroupName' <<<"$VALID_GROUPS_JSON")

is_valid_group() {
  local g="$1"
  for vg in "${VALID_GROUPS[@]}"; do
    [[ "$vg" == "$g" ]] && return 0
  done
  return 1
}

invalid=()
valid=()

for g in "${GROUPS[@]}"; do
  if is_valid_group "$g"; then
    valid+=("$g")
  else
    invalid+=("$g")
  fi
done

if [[ "${#invalid[@]}" -gt 0 ]]; then
  echo "Warning: skipping non-existent groups:"
  for g in "${invalid[@]}"; do echo "  - $g"; done
fi

for g in "${valid[@]}"; do
  ADD_CMD=("${AWS[@]}" cognito-idp admin-add-user-to-group --user-pool-id "$USER_POOL_ID" --username "$USERNAME" --group-name "$g")
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "Would run:"
    printf ' %q' "${ADD_CMD[@]}"
    echo
  else
    "${ADD_CMD[@]}" >/dev/null
    echo "Added to group: $g"
  fi
done

echo "Done."
