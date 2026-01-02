# Database Maintenance & Schema Reference

Operational guide for the CodeAssesor database.

## 1. Environment Configuration

The following environment variables must be set (e.g., in `.env.local` for development):

```text
MONGODB_URI=mongodb://localhost:27017/code-assessor
MONGODB_DB=code-assessor
```

## 2. Maintenance Commands

### Backup & Restore

**PowerShell (Windows):**
```powershell
# Backup
mongodump --db code-assessor --out "./db-backups/backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Restore
mongorestore --db code-assessor ./db-backups/backup-FOLDER_NAME/code-assessor
```

**Bash (Linux/macOS):**
```bash
# Backup
mongodump --db code-assessor --out ./db-backups/backup-$(date +%Y%m%d_%H%M%S)

# Restore
mongorestore --db code-assessor ./db-backups/backup-FOLDER_NAME/code-assessor
```

### Ensure Indexes
Always run this after a new installation or database migration to ensure performance:
```bash
npm run db:indexes
```

## 3. Data Model Summary

All `_id` and reference fields use the MongoDB `ObjectId` type.

### Key Collections

| Collection | Description | Key References |
|------------|-------------|----------------|
| `batches` | Groups of assessments | `candidateIds` (Array of ObjectId) |
| `subjects` | Assessment topics/problems | `batchId` (ObjectId) |
| `trials` | Individual LLM results | `subjectId`, `batchId` (ObjectId) |
| `candidates`| Implementation info | - |
| `assessments`| Generic/Independent runs | - |
