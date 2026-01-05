import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "eu-west-2";

// Clients
const ddbClient = new DynamoDBClient({ region: REGION });
export const docClient = DynamoDBDocumentClient.from(ddbClient);
export const s3Client = new S3Client({ region: REGION });

// Constants
export const TABLE_NAME = process.env.TABLE_NAME || "governance_items";
export const EVIDENCE_BUCKET = process.env.EVIDENCE_BUCKET;

// Helpers
export const sendResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    // CORS headers just in case APIGW doesn't handle them fully, but typically it does.
    "Access-Control-Allow-Origin": "*", // Or specific origin
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  },
  body: JSON.stringify(body),
});

export const getUserId = (event) => {
  // Cognito Authorizer populates this
  // HTTP API: event.requestContext.authorizer.jwt.claims.sub
  return event.requestContext?.authorizer?.jwt?.claims?.sub || "unknown";
};

export const getUsername = (event) => {
  return event.requestContext?.authorizer?.jwt?.claims?.username || "unknown";
};
