import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, sendResponse, getUsername } from "../utils.mjs";

export const createItem = async (event, regulatorKey) => {
    try {
        const body = JSON.parse(event.body || "{}");
        if (!body.id || !body.title) {
            return sendResponse(400, { error: "Missing required fields (id, title)" });
        }

        const itemId = body.id; // e.g. P1-D1
        const username = getUsername(event);
        const now = new Date().toISOString();

        const item = {
            PK: `REG#${regulatorKey}`,
            SK: `ITEM#${itemId}`,
            GSI1PK: `REG#${regulatorKey}#STATUS#${body.status || "NOT_STARTED"}`,
            GSI1SK: `ITEM#${itemId}`,
            regulatorKey,
            itemId,
            title: body.title,
            description: body.description || "",
            owner: body.owner || "",
            status: body.status || "NOT_STARTED",
            dependencies: body.dependencies || [],
            evidenceRequired: body.evidenceRequired || false,
            notes: body.notes || "",
            createdBy: username,
            createdAt: now,
            updatedAt: now,
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(PK)", // Prevent overwrite if intending to create new only
        }));

        return sendResponse(201, item);
    } catch (err) {
        console.error(err);
        if (err.name === 'ConditionalCheckFailedException') {
            return sendResponse(409, { error: "Item already exists" });
        }
        return sendResponse(500, { error: "Failed to create item" });
    }
};
