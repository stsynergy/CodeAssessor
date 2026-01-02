# Project Roadmap & TODOs

## 1. Architecture Refactoring
- [x] **Move to src/ layout**: Relocate code to src/ directory.
- [x] **Decouple Logic (Service Layer)**: Move database operations and business logic out of the route.ts files into a dedicated service layer.
- [x] **Repository Pattern**: Centralize MongoDB access in repositories.

## 2. Validation & Security
- [ ] **Strict Input Validation**: Implement a schema validation library (like Zod) to strictly reject requests with unknown or malformed fields (replacing the current silent filter).
- [ ] **Environment Guard**: Add a startup check to verify that required environment variables (`MONGODB_URI`, at least one LLM key) are present.

## 3. Error Handling & Robustness
- [ ] **LLM Error Mapping**: Refine error handling in `/api/assess` to provide more specific feedback for common provider issues (rate limits, context window overflow).
- [ ] **Frontend Error UI**: Update the UI to gracefully handle and display the new 400/404/500 API error responses.

## 4. Features & Optimization
- [ ] **Transaction Support**: If moving to a replica set, implement transactions for operations that touch multiple collections (e.g., deleting a subject and its trials).
- [ ] **Ad-hoc Reference Support**: Ensure ad-hoc snippets in the assessment engine are fully compatible with the new `ObjectId` reference model.
