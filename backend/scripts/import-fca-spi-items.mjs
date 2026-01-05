// backend/scripts/import-fca-spi-items.mjs
// Node.js 22+ (ESM). Run locally with AWS credentials.
//
// Usage examples:
//   AWS_PROFILE=stg AWS_REGION=eu-west-2 node backend/scripts/import-fca-spi-items.mjs \
//     --table governance_items \
//     --file backend/seed/fca-spi-items.json \
//     --regulator FCA-SPI \
//     --createdBy admin@zastras.com \
//     --confirm
//
// Notes:
// - This script is idempotent for the same itemId (PutCommand will overwrite).
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from "node:fs";

function getArg(name, fallback) {
    const idx = process.argv.indexOf(name);
    if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
    return fallback;
}

const confirm = process.argv.includes("--confirm");
const region = process.env.AWS_REGION || "eu-west-2";
const tableName = getArg("--table", process.env.TABLE_NAME || "governance_items");
const filePath = getArg("--file", "./fca-spi-items.json");
const regulatorKey = getArg("--regulator", "FCA-SPI");
const createdBy = getArg("--createdBy", "admin@zastras.com");

console.log(`Config: Table=${tableName}, Region=${region}, Regulator=${regulatorKey}, File=${filePath}`);
if (!confirm) {
    console.log("DRY RUN: Pass --confirm to actually write to DynamoDB.");
}

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});

const raw = readFileSync(filePath, "utf-8");
const items = JSON.parse(raw);

if (!Array.isArray(items)) {
    console.error("Seed file must be a JSON array.");
    process.exit(1);
}

function nowIso() {
    return new Date().toISOString();
}

for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (!item.itemId || !item.title) {
        console.warn("Skipping invalid item (missing itemId/title):", item);
        continue;
    }

    const now = nowIso();
    const status = item.status || "NOT_STARTED";

    const record = {
        PK: `REG#${regulatorKey}`,
        SK: `ITEM#${item.itemId}`,
        itemId: item.itemId,
        title: item.title,
        description: item.description || "",
        owner: item.owner || "",
        status,
        evidenceRequired: Boolean(item.evidenceRequired),
        notes: item.notes || "",
        createdBy,
        createdAt: now,
        updatedAt: now,
        // GSI for status queries (as per app documentation)
        GSI1PK: `REG#${regulatorKey}#STATUS#${status}`,
        GSI1SK: now,
    };

    if (confirm) {
        await docClient.send(
            new PutCommand({
                TableName: tableName,
                Item: record,
            }),
        );
        console.log(`Upserted: ${regulatorKey} ${item.itemId}`);
    } else {
        console.log(`Would upsert: ${regulatorKey} ${item.itemId}`);
    }
}

console.log("Done.");
