import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Simple .env.local parser
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "code-assessor";

if (!uri) {
  console.error("Error: MONGODB_URI not found in environment or .env.local");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Starting data migration for database: ${dbName}...`);

    // 1. Migrate SUBJECTS (batchId: string -> ObjectId)
    const subjects = await db.collection('subjects').find({ batchId: { $type: "string" } }).toArray();
    console.log(`Found ${subjects.length} subjects to migrate...`);
    for (const sub of subjects) {
      if (ObjectId.isValid(sub.batchId)) {
        await db.collection('subjects').updateOne(
          { _id: sub._id },
          { $set: { batchId: new ObjectId(sub.batchId) } }
        );
      }
    }

    // 2. Migrate TRIALS (subjectId: string -> ObjectId, batchId: string -> ObjectId)
    const trials = await db.collection('trials').find({ 
      $or: [
        { subjectId: { $type: "string" } },
        { batchId: { $type: "string" } }
      ]
    }).toArray();
    console.log(`Found ${trials.length} trials to migrate...`);
    for (const trial of trials) {
      const update = {};
      if (typeof trial.subjectId === 'string' && ObjectId.isValid(trial.subjectId)) {
        update.subjectId = new ObjectId(trial.subjectId);
      }
      if (typeof trial.batchId === 'string' && ObjectId.isValid(trial.batchId)) {
        update.batchId = new ObjectId(trial.batchId);
      }
      if (Object.keys(update).length > 0) {
        await db.collection('trials').updateOne({ _id: trial._id }, { $set: update });
      }
    }

    // 3. Migrate BATCHES (candidateIds: string[] -> ObjectId[])
    const batches = await db.collection('batches').find({ candidateIds: { $elemMatch: { $type: "string" } } }).toArray();
    console.log(`Found ${batches.length} batches to migrate candidateIds...`);
    for (const batch of batches) {
      const newIds = batch.candidateIds
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      
      await db.collection('batches').updateOne(
        { _id: batch._id },
        { $set: { candidateIds: newIds } }
      );
    }

    // 4. Migrate SNIPPETS inside SUBJECTS (candidateId: string -> ObjectId)
    // Note: This is nested, so we check if any snippet has a string candidateId
    const subjectsWithSnippets = await db.collection('subjects').find({ "snippets.candidateId": { $type: "string" } }).toArray();
    console.log(`Found ${subjectsWithSnippets.length} subjects with snippets to migrate...`);
    for (const sub of subjectsWithSnippets) {
      const updatedSnippets = sub.snippets.map((s) => ({
        ...s,
        candidateId: ObjectId.isValid(s.candidateId) ? new ObjectId(s.candidateId) : s.candidateId
      }));
      await db.collection('subjects').updateOne(
        { _id: sub._id },
        { $set: { snippets: updatedSnippets } }
      );
    }

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

run();

