import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, sendResponse, getUsername } from "../utils.mjs";

export const updateItem = async (event, regulatorKey, itemId) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const username = getUsername(event);
        const now = new Date().toISOString();

        // Fields allowed to update
        const allowedAttrs = ['title', 'description', 'owner', 'status', 'dependencies', 'evidenceRequired', 'notes'];

        let updateExp = "SET updatedAt = :ua, updatedBy = :ub";
        const exprAttrValues = {
            ":ua": now,
            ":ub": username
        };
        const exprAttrNames = {};

        let hasUpdates = false;
        for (const key of allowedAttrs) {
            if (body[key] !== undefined) {
                updateExp += `, #${key} = :${key}`;
                exprAttrValues[`:${key}`] = body[key];
                exprAttrNames[`#${key}`] = key;
                hasUpdates = true;
            }
        }

        // Special handling for GSI1 update if status changes
        if (body.status) {
            updateExp += ", GSI1PK = :gsi1pk";
            exprAttrValues[":gsi1pk"] = `REG#${regulatorKey}#STATUS#${body.status}`;
        }

        if (!hasUpdates) {
            return sendResponse(400, { error: "No valid fields to update" });
        }

        const cmd = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `REG#${regulatorKey}`,
                SK: `ITEM#${itemId}`,
            },
            UpdateExpression: updateExp,
            ExpressionAttributeNames: exprAttrNames,
            ExpressionAttributeValues: exprAttrValues,
            ReturnValues: "ALL_NEW",
        });

        const res = await docClient.send(cmd);
        return sendResponse(200, res.Attributes);
    } catch (err) {
        console.error(err);
        return sendResponse(500, { error: "Failed to update item" });
    }
};
