# Code Assessor: System Overview 🦅

Code Assessor is a specialized **Human-in-the-Loop Benchmarking Suite** designed to compare multiple code implementations (Candidates) through rigorous AI-driven architectural assessments. It prioritizes statistical significance and manual quality control over automated acceptance.

## 🏗️ Core Architecture & Hierarchy

The system follows a strict **Service-Oriented Architecture** with four distinct layers to ensure maintainability and separation of concerns:

1.  **UI Layer (`src/components`)**: React components handling user interaction and local state.
2.  **API Layer (`src/app/api`)**: Thin Next.js Route Handlers that parse requests and delegate to services.
3.  **Service Layer (`src/services`)**: Application/Business logic layer (LLM orchestration, domain workflows).
4.  **Repository Layer (`src/repositories`)**: Data Access layer. Centralizes MongoDB queries, sorting, and `ObjectId` mapping.

### The Hierarchical Data Model
The system supports comparative benchmarking over time through a structured hierarchy:

1.  **Candidate (Global)**: The primary identity of an implementation (e.g., "Senior Dev A", "Claude 3.5"). Candidates are stored in a global registry and reused across batches to maintain longitudinal data.
2.  **Project (Batch)**: A top-level container for a specific test suite (e.g., "Frontend Infrastructure 2025"). A Batch **subscribes** to a lineup of global candidates.
3.  **Task (Subject)**: The definition of a specific challenge. It contains:
    *   **Context**: The architectural requirements and constraints.
    *   **Snippets**: Implementation code for each candidate in the batch lineup, linked via `candidateId`.
4.  **Trial**: A single execution instance of a Task. Each trial is assigned a specific **LLM Provider and Model**, allowing for multi-judge assessments of the same task.
5.  **Assessment Result**: The raw AI response consisting of a Markdown Report and an extracted ranking (e.g., "1, 2, 3"). Rankings are mapped back to stable `candidateId`s for statistical tracking.

## 🔄 The Benchmarking Workflow (The Loop)

The system follows a strict **Review -> Rerun -> Approve** lifecycle:

1.  **Registry Management**: Operators define global candidates in the registry.
2.  **Preparation**: A project is created, and candidates are selected for the "Lineup." Tasks are then defined with their Context. Snippet editors are automatically generated for every candidate in the lineup.
3.  **Execution**: Trigger a **Trial**. The `AssessmentService`:
    *   Resolves `candidateId` to the current `name` for the prompt.
    *   Makes a **single LLM call** for both the architectural report and a structured ranking block (`<SCORES>`).
    *   Maps the returned ranks from names back to `candidateId` for stable storage.
4.  **Manual Vetting (Needs Review)**: The AI's output is presented as a draft. If the AI hallucinated or broke format, the operator hits **Rerun AI**.
5.  **Finalization**: Clicking **Approve Result** locks the trial and marks it as `completed`, allowing it to hit the statistics engine.

## 📂 Project Structure

- `src/app/api/`: Thin route handlers.
- `src/services/`: Business logic and LLM orchestration (e.g., `AssessmentService`).
- `src/repositories/`: Database access (CRUD and specialized queries).
- `src/components/`: Reusable UI components.
- `src/types/`: Centralized TypeScript definitions.
- `src/config/`: Model and provider configurations.
- `src/lib/`: Low-level infrastructure (e.g., MongoDB client).
- `scripts/`: Maintenance and migration utilities.

## 📊 Statistics Logic

The system deliberately defers mathematical operations to the frontend. Raw AI rankings (1..n) are stored exactly as returned. The `StatsDashboard` handles:

*   **Normalized Borda Count**: Converting raw ranks into a uniform 0-10 relative superiority score. 
    *   *Formula*: $\frac{n - \text{Rank}}{n - 1} \times 10$
*   **Aggregation**: Grouping these Borda points by `candidateId` across all projects and tasks.
*   **Consistency Tracking**: Visualizing performance stability using standard deviation of Borda scores across different trials.

```mermaid
graph TD
    UI[UI Components] -->|Fetch| API[Route Handlers]
    API -->|Call| SVC[Services]
    SVC -->|Query| REPO[Repositories]
    REPO -->|Connect| DB[(MongoDB)]
    SVC -->|Request| LLM[LLM Engine]
```
