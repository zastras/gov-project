import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, sendResponse } from "../utils.mjs";

export const listItems = async (event, regulatorKey) => {
    const query = event.queryStringParameters || {};
    const statusFilter = query.status;
    const search = query.search?.toLowerCase();

    try {
        let items = [];

        if (statusFilter) {
            // Use GSI
            const cmd = new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "GSI1",
                KeyConditionExpression: "GSI1PK = :apk",
                ExpressionAttributeValues: {
                    ":apk": `REG#${regulatorKey}#STATUS#${statusFilter}`,
                },
            });
            const res = await docClient.send(cmd);
            items = res.Items || [];
        } else {
            // Query Main Table by PK
            const cmd = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: {
                    ":pk": `REG#${regulatorKey}`,
                    ":sk": "ITEM#",
                },
            });
            const res = await docClient.send(cmd);
            items = res.Items || [];
        }

        // In-memory search (simple approach for MVP)
        if (search) {
            items = items.filter(
                (i) =>
                    i.title?.toLowerCase().includes(search) ||
                    i.description?.toLowerCase().includes(search)
            );
        }

        return sendResponse(200, { items });
    } catch (err) {
        console.error(err);
        return sendResponse(500, { error: "Failed to list items" });
    }
};
