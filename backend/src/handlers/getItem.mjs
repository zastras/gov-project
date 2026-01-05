import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, sendResponse } from "../utils.mjs";

export const getItem = async (event, regulatorKey, itemId) => {
    try {
        const cmd = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `REG#${regulatorKey}`,
                SK: `ITEM#${itemId}`,
            },
        });

        const res = await docClient.send(cmd);
        if (!res.Item) {
            return sendResponse(404, { error: "Item not found" });
        }

        return sendResponse(200, res.Item);
    } catch (err) {
        console.error(err);
        return sendResponse(500, { error: "Failed to get item" });
    }
};
