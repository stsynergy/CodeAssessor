import { MongoClient } from 'mongodb';
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
    console.log("Connected to MongoDB");
    const db = client.db(dbName);

    console.log(`Ensuring indexes for database: ${dbName}...`);

    // Batches
    await db.collection('batches').createIndex({ createdAt: -1 });
    console.log("- batches: { createdAt: -1 }");

    // Subjects
    await db.collection('subjects').createIndex({ batchId: 1, createdAt: -1 });
    console.log("- subjects: { batchId: 1, createdAt: -1 }");

    // Trials
    await db.collection('trials').createIndex({ subjectId: 1, createdAt: 1 });
    await db.collection('trials').createIndex({ batchId: 1, createdAt: 1 });
    console.log("- trials: { subjectId: 1, createdAt: 1 }, { batchId: 1, createdAt: 1 }");

    // Candidates
    await db.collection('candidates').createIndex({ name: 1 }, { unique: true });
    console.log("- candidates: { name: 1 } (unique)");

    // Assessments (Sessions)
    await db.collection('assessments').createIndex({ batchId: 1, createdAt: -1 });
    console.log("- assessments: { batchId: 1, createdAt: -1 }");

    console.log("Indexes ensured successfully.");
  } catch (err) {
    console.error("Error ensuring indexes:", err);
  } finally {
    await client.close();
  }
}

run();

