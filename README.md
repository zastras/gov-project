# Zastras Governance (Gov Project)

Internal governance portal to track compliance deliverables (for example FCA-SPI) and attach supporting evidence files (PDF, JPG, DOCX). Built as a React + Vite frontend with a serverless AWS backend (API Gateway HTTP API + Lambda + DynamoDB + S3).

## High-level architecture

* Frontend

  * Vite + React + Tailwind UI
  * Auth via AWS Cognito (Amplify v6)
  * Calls the API with the Cognito ID token in `Authorization: Bearer <token>`
* Backend

  * AWS Lambda (Node.js, ESM) behind API Gateway HTTP API
  * DynamoDB table stores:

    * deliverable items (status, owner, notes, description)
    * evidence metadata rows (fileName, s3Key, contentType, uploadedAt, uploadedBy)
  * S3 bucket stores the actual evidence files
  * Evidence uploads use a presigned S3 PUT URL + a commit step to store metadata in DynamoDB

## Repository structure

```
gov-project/
  frontend/                    React app (Vite)
  backend/                     Lambda source (index.mjs router + handlers)
    src/handlers/              Items, evidence, export
    scripts/                   Seed and import utilities for DynamoDB
    backend-update.zip         Convenience zip used for Lambda deployment
```

## Prerequisites

* Node.js 18+ (frontend) and Node.js 20/22 (backend Lambda runtime)
* AWS CLI configured with a profile that can access:

  * API Gateway
  * Lambda
  * DynamoDB table `governance_items`
  * Evidence S3 bucket (read/write as needed)
* Cognito User Pool credentials for login

## Configuration

### Frontend environment variables

Create `frontend/.env.local` for local dev:

```
VITE_API_URL=https://<api-id>.execute-api.eu-west-2.amazonaws.com/v1
VITE_USER_POOL_ID=eu-west-2_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

Production builds can use `frontend/.env.production`.

### Backend environment variables (Lambda)

These are expected by `backend/src/utils.mjs`:

* `TABLE_NAME` (default: `governance_items`)
* `EVIDENCE_BUCKET` (required)
* `AWS_REGION` (default: `eu-west-2`)

## Local development

### Frontend

```
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal and log in with a Cognito user.

### Backend

The backend is a Lambda handler (not a long-running HTTP server). Typical workflow is:

* deploy to AWS
* test via the frontend or `curl` against API Gateway

For quick local logic testing you can use the included `backend/test-event.json` with a local runner of your choice, but most testing is easiest against the deployed API because it relies on AWS services.

## Data model (DynamoDB)

Table: `governance_items`

Deliverables (items):

* `PK = REG#<regulatorKey>`
* `SK = ITEM#<itemId>`
* `GSI1PK = REG#<regulatorKey>#STATUS#<status>` (optional status filtering)
* `GSI1SK = ITEM#<itemId>`

Evidence metadata:

* `PK = REG#<regulatorKey>#ITEM#<itemId>`
* `SK = EVID#<uploadedAtIso>#<uuid>`
* attributes: `s3Key`, `fileName`, `contentType`, `sizeBytes`, `uploadedAt`, `uploadedBy`

S3 object key format:

* `evidence/<regulatorKey>/<itemId>/<yyyy>/<mm>/<dd>/<uuid>_<fileName>`

## API endpoints

Base URL: `.../v1`

Items:

* `GET  /regulators/{regulatorKey}/items`

  * optional query params:

    * `status=<NOT_STARTED|DRAFT|REVIEW|FINAL>`
    * `search=<string>`
* `POST /regulators/{regulatorKey}/items`
* `GET  /regulators/{regulatorKey}/items/{itemId}`
* `PUT  /regulators/{regulatorKey}/items/{itemId}`

Evidence:

* `POST /regulators/{regulatorKey}/items/{itemId}/evidence/presign`

  * body: `{ fileName, contentType }`
  * response: `{ uploadUrl, s3Key, bucket }`
* `POST /regulators/{regulatorKey}/items/{itemId}/evidence/commit`

  * body: `{ s3Key, fileName, contentType, sizeBytes }`
* `GET  /regulators/{regulatorKey}/items/{itemId}/evidence`

  * response: `{ evidence: [...] }`
* Download (current implementation uses query param `s3Key`)

  * `GET /regulators/{regulatorKey}/items/{itemId}/evidence/<anything>/download?s3Key=<urlencoded>`
  * response: `{ downloadUrl }`

Export:

* `POST /regulators/{regulatorKey}/export`

  * Creates a zip in S3 under `exports/<regulatorKey>/<timestamp>.zip` and returns a presigned download URL

## Evidence upload workflow (frontend)

1. Request presigned upload URL
2. Upload file directly to S3 with `PUT` to the presigned URL
3. Commit metadata to DynamoDB
4. Refresh evidence list

Implementation reference:

* Frontend: `frontend/src/pages/DeliverableDetail.tsx`
* API client: `frontend/src/services/api.ts`
* Backend: `backend/src/handlers/evidence.mjs`

## Seeding and importing deliverables

Backend scripts write directly to DynamoDB using your AWS credentials.

Example seed for FCA-SPI:

```
cd backend
AWS_REGION=eu-west-2 TABLE_NAME=governance_items node scripts/seed.mjs
```

There are also import scripts under `backend/scripts/` that can load from JSON.

## Deployments

### Backend (Lambda)

The backend code is not deployed to CloudFront. It is deployed to AWS Lambda.

If you keep using the existing `backend/backend-update.zip` approach:

1. Update the zip contents (example updates only one file)

```
cd backend
zip -ur backend-update.zip src/handlers/evidence.mjs
```

2. Push the zip to Lambda

```
aws lambda update-function-code \
  --profile <your-profile> \
  --region eu-west-2 \
  --function-name <your-lambda-name> \
  --zip-file fileb://backend-update.zip \
  --publish
```

To find the function name:

```
aws lambda list-functions \
  --profile <your-profile> \
  --region eu-west-2 \
  --query "Functions[].FunctionName" \
  --output text
```

### Frontend (S3 + CloudFront)

1. Build

```
cd frontend
npm install
npm run build
```

2. Upload `frontend/dist` to the frontend origin S3 bucket

```
aws s3 sync frontend/dist s3://<frontend-bucket>/ \
  --profile <your-profile> \
  --region eu-west-2 \
  --delete
```

3. Invalidate CloudFront (if required)

```
aws cloudfront create-invalidation \
  --profile <your-profile> \
  --distribution-id <dist-id> \
  --paths "/*"
```

## Common troubleshooting

### FE shows evidence entries that are not in S3

The evidence list is driven by DynamoDB metadata (`GET .../evidence`). Deleting an object directly in S3 does not remove the corresponding DynamoDB row, so the FE can still show it.

Fix options:

* Delete the stale DynamoDB row (manual cleanup)
* Add a delete endpoint that removes both S3 + DynamoDB
* Update `listEvidence()` to filter out (and optionally delete) rows whose S3 object no longer exists

### Duplicate evidence entries with the same filename

Uploading the same file multiple times creates multiple DynamoDB rows (unique SK each time). The FE currently renders every row and does not dedupe by `fileName`.

Fix options:

* Implement idempotency in `commitEvidence()` (for example, one active evidence per fileName)
* Add a delete UX + endpoint so old rows can be removed cleanly
* Deduplicate in the FE (display latest per fileName)

### S3 list access denied via CLI

Some roles are allowed to `PutObject` or `GetObject` (via presigned URLs) but not allowed to `ListBucket`. If you need to list keys under a prefix, the role needs `s3:ListBucket` on the bucket with an appropriate `s3:prefix` condition.

## Security notes

* Frontend uses Cognito User Pool authentication and sends an ID token to the API.
* Backend extracts username from JWT claims in `getUsername()` and stores it as `uploadedBy`.
* CORS in `backend/src/utils.mjs` is currently permissive (`Access-Control-Allow-Origin: *`). For production, restrict this to the CloudFront domain(s).

## License

Internal project. 
(Add a license file if you intend to distribute externally.)
