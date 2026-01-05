import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "eu-west-2";
const TABLE_NAME = process.env.TABLE_NAME || "governance_items";

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const seedFcaSpi = async () => {
    console.log(`Seeding FCA-SPI items into ${TABLE_NAME}...`);

    const phases = [
        { p: "P0", range: 3 },
        { p: "P1", range: 4 },
        { p: "P2", range: 6 },
        { p: "P3", range: 5 },
        { p: "P4", range: 6 },
        { p: "P5", range: 5 },
        { p: "P6", range: 5 },
        { p: "P7", range: 3 },
        { p: "P8", range: 6 }
    ];

    let count = 0;
    for (const phase of phases) {
        for (let i = 1; i <= phase.range; i++) {
            const itemId = `${phase.p}-D${i}`;
            const title = `Deliverable ${itemId} - Phase ${phase.p}`; // Placeholder title
            const item = {
                PK: `REG#FCA-SPI`,
                SK: `ITEM#${itemId}`,
                GSI1PK: `REG#FCA-SPI#STATUS#NOT_STARTED`,
                GSI1SK: `ITEM#${itemId}`,
                regulatorKey: "FCA-SPI",
                itemId,
                title,
                description: "Standard deliverable for FCA compliance.",
                status: "NOT_STARTED",
                evidenceRequired: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));
            count++;
            process.stdout.write(".");
        }
    }
    console.log(`\nSeeded ${count} items.`);
};

seedFcaSpi();
