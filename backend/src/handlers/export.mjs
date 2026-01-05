import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { docClient, s3Client, TABLE_NAME, EVIDENCE_BUCKET, sendResponse } from "../utils.mjs";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import stream from "stream";

// Helper to stream S3 to Archiver
const getS3Stream = (key) => {
    const command = new GetObjectCommand({ Bucket: EVIDENCE_BUCKET, Key: key });
    // This requires a bit of wiring because V3 SDK returns a readable stream in Body
    // but it's a "SdkStream" which is often a Node readable stream.
    // However, we need to handle the promise.
    return s3Client.send(command).then(res => res.Body);
};

export const exportData = async (event, regulatorKey) => {
    // NOTE: This runs in Lambda. 
    // Memory limit: 256MB (set in TF). 
    // Time limit: 15s.
    // Large exports will FAIL. 
    // For MVP with small files, this is okay. 
    // For production, this should be an async Step Function or ECS task.

    try {
        // 1. Fetch all items
        let items = [];
        let exclusiveStartKey = undefined;
        do {
            const cmd = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk",
                ExpressionAttributeValues: { ":pk": `REG#${regulatorKey}` },
                ExclusiveStartKey: exclusiveStartKey
            });
            const res = await docClient.send(cmd);
            items.push(...(res.Items || []));
            exclusiveStartKey = res.LastEvaluatedKey;
        } while (exclusiveStartKey);

        // Filter into Deliverables vs Evidence
        const deliverables = items.filter(i => i.SK.startsWith("ITEM#"));
        const evidencedItems = items.filter(i => i.SK.startsWith("EVID#")); // Actually EVID is under ITEM PK? 
        // wait. My schema says: 
        // Deliverable: PK=REG#FCA, SK=ITEM#...
        // Evidence: PK=REG#FCA#ITEM#..., SK=EVID#...

        // The query above `PK=REG#FCA` ONLY returns deliverables.
        // To get evidence we need to Query each item OR Scan (bad) OR GSI ??
        // The design didn't put Evidence in the same PK as Deliverables.
        // Design: 
        //    PK=REG#FCA (Deliverables)
        //    PK=REG#FCA#ITEM#... (Evidence)

        // To export EVERYTHING, we need to find all evidence.
        // Iterating all deliverables and querying evidence in parallel is feasible for <100 items.

        const manifest = {
            regulator: regulatorKey,
            generatedAt: new Date().toISOString(),
            deliverables: []
        };

        const evidenceToDownload = [];

        // Parallel fetch of evidence
        // Limit concurrency to avoid throttling
        const chunks = [];
        for (let i = 0; i < deliverables.length; i += 10) {
            chunks.push(deliverables.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (d) => {
                const deliv = { ...d };
                // Query evidence
                const eCmd = new QueryCommand({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: "PK = :pk",
                    ExpressionAttributeValues: { ":pk": `REG#${regulatorKey}#ITEM#${d.itemId}` }
                });
                const eRes = await docClient.send(eCmd);
                const evs = eRes.Items || [];

                deliv.evidence = evs;
                manifest.deliverables.push(deliv);

                evs.forEach(e => {
                    evidenceToDownload.push({ s3Key: e.s3Key, fileName: `${d.itemId}/${e.fileName}` });
                });
            }));
        }

        // 2. Start Zip
        const exportKey = `exports/${regulatorKey}/${Date.now()}.zip`;
        // We can't write to disk easily if > 512MB /tmp. 
        // Better to stream DIRECTLY to S3 upload.

        const passThrough = new stream.PassThrough();

        // Use @aws-sdk/lib-storage for robust streaming upload
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: EVIDENCE_BUCKET,
                Key: exportKey,
                Body: passThrough,
                ContentType: 'application/zip',
                // Explicitly disable checksums to avoid x-amz-decoded-content-length issues with streaming
                ChecksumAlgorithm: undefined
            }
        });

        const archive = archiver('zip', { zlib: { level: 9 } });

        // Error handling for streams
        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            passThrough.destroy(err);
        });

        passThrough.on('error', (err) => {
            console.error('PassThrough error:', err);
        });

        archive.pipe(passThrough);

        // Start Upload
        const uploadPromise = upload.done();

        // Append manifest
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        // Append Files
        // WARNING: Doing this in sequence or parallel for many files will be slow/memory heavy.
        // We attach S3 streams to the Archive.

        for (const f of evidenceToDownload) {
            try {
                const fileStream = await getS3Stream(f.s3Key);
                archive.append(fileStream, { name: `evidence/${f.fileName}` });
            } catch (e) {
                console.warn(`Skipping missing file ${f.s3Key}`);
                archive.append(JSON.stringify({ error: "File not found" }), { name: `evidence/${f.fileName}.error.txt` });
            }
        }

        await archive.finalize();
        await uploadPromise;

        // 3. Presign download
        const getCmd = new GetObjectCommand({ Bucket: EVIDENCE_BUCKET, Key: exportKey });
        const downloadUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 3600 }); // 1 hour

        return sendResponse(200, { downloadUrl, expiresInSeconds: 3600 });

    } catch (err) {
        console.error(err);
        return sendResponse(500, { error: "Export failed", details: err.message });
    }
};
