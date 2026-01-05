import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(client);

const items = JSON.parse(readFileSync('./fca-spi-items.json', 'utf-8'));
const regulatorId = 'FCA-SPI';
const tableName = 'governance_items';
const createdBy = 'admin@zastras.com';

for (const item of items) {
    const now = new Date().toISOString();

    const dbItem = {
        PK: `REG#${regulatorId}`,
        SK: `ITEM#${item.itemId}`,
        itemId: item.itemId,
        title: item.title,
        description: item.description || '',
        owner: item.owner || '',
        status: item.status,
        evidenceRequired: item.evidenceRequired,
        notes: item.notes || '',
        createdBy: createdBy,
        createdAt: now,
        updatedAt: now,
        GSI1PK: `STATUS#${item.status}`,
        GSI1SK: now
    };

    await docClient.send(new PutCommand({
        TableName: tableName,
        Item: dbItem
    }));

    console.log(`✓ Imported ${item.itemId}: ${item.title}`);
}

console.log(`\n✅ Imported ${items.length} items successfully`);
