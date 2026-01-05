import { sendResponse } from './src/utils.mjs';

// Import handlers (we will implement these next)
// For now, we stub them or use dynamic imports if preferred, 
// but static imports are safer for bundling if we were bundling.
// Since we are uploading the whole dir, standard imports work.

import { listItems } from './src/handlers/listItems.mjs';
import { getItem } from './src/handlers/getItem.mjs';
import { updateItem } from './src/handlers/updateItem.mjs';
import { createItem } from './src/handlers/createItem.mjs';
import { presignUpload } from './src/handlers/evidence.mjs';
import { commitEvidence } from './src/handlers/evidence.mjs';
import { listEvidence } from './src/handlers/evidence.mjs';
import { downloadEvidence } from './src/handlers/evidence.mjs';
import { exportData } from './src/handlers/export.mjs';

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event));

    const { routeKey, rawPath } = event;
    const method = event.requestContext.http.method;
    console.log(`Method: ${method}, Path: ${rawPath}, RouteKey: ${routeKey}`);

    // Basic routing logic based on method and path resource
    // Note: event.routeKey in HTTP API is like "GET /v1/health" if defined, or "$default"
    // We defined "ANY /v1/{proxy+}" and "GET /v1/health"

    try {
        if (method === "OPTIONS") {
            return sendResponse(200, { message: "OK" });
        }

        if (method === "GET" && rawPath === "/v1/health") {
            console.log("Health check requested");
            return sendResponse(200, { ok: true });
        }

        // Regulators
        // Path: /v1/regulators/{regulatorKey}/items...
        const pathParts = rawPath.split('/').filter(p => p);
        console.log("Path Parts:", JSON.stringify(pathParts));
        // pathParts: ['v1', 'regulators', 'FCA-SPI', 'items', ...]

        if (pathParts[1] === 'regulators') {
            const regulatorKey = pathParts[2];
            const resource = pathParts[3]; // 'items' or 'export'

            if (resource === 'items') {
                const itemId = pathParts[4]; // optional

                if (!itemId) {
                    // /v1/regulators/{reg}/items
                    if (method === 'GET') return await listItems(event, regulatorKey);
                    if (method === 'POST') return await createItem(event, regulatorKey);
                } else {
                    // /v1/regulators/{reg}/items/{itemId}...
                    const subResource = pathParts[5]; // 'evidence' ?

                    if (!subResource) {
                        if (method === 'GET') return await getItem(event, regulatorKey, itemId);
                        if (method === 'PUT') return await updateItem(event, regulatorKey, itemId);
                    } else if (subResource === 'evidence') {
                        const segment6 = pathParts[6]; // 'presign', 'commit', or evidenceId

                        if (method === 'POST') {
                            if (segment6 === 'presign') return await presignUpload(event, regulatorKey, itemId);
                            if (segment6 === 'commit') return await commitEvidence(event, regulatorKey, itemId);
                        }

                        if (method === 'GET') {
                            if (!segment6) {
                                return await listEvidence(event, regulatorKey, itemId);
                            }
                            if (pathParts[7] === 'download') {
                                return await downloadEvidence(event, regulatorKey, itemId, segment6);
                            }
                        }
                    }
                }
            } else if (resource === 'export' && method === 'POST') {
                return await exportData(event, regulatorKey);
            }
        }

        console.log(`No route matched for Path: ${rawPath}, Method: ${method}, Parts: ${JSON.stringify(pathParts)}`);
        return sendResponse(404, { error: "Route not found", path: rawPath, method, parts: pathParts });

    } catch (error) {
        console.error("Handler Error:", error);
        return sendResponse(500, { error: "Internal Server Error", details: error.message });
    }
};
