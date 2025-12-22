# Code Assessor: System Overview 🦅

Code Assessor is a specialized **Human-in-the-Loop Benchmarking Suite** designed to compare multiple code implementations (Candidates) through rigorous AI-driven architectural assessments. It prioritizes statistical significance and manual quality control over automated acceptance.

## 🏗️ Core Architecture & Hierarchy

The system is built on a hierarchical data model to support comparative benchmarking over time:

1.  **Project (Batch)**: A top-level container for a specific test suite (e.g., "Frontend Infrastructure 2025").
2.  **Task (Subject)**: The definition of a specific challenge. It contains:
    *   **Context**: The architectural requirements and constraints.
    *   **Candidates**: Multiple code snippets, each named after a candidate or specific approach.
    *   **Trials Needed**: The target number of assessments required to reach a stable average score.
3.  **Trial**: A single execution instance of a Task. A Task is only complete when it has enough **Approved** Trials.
4.  **Assessment (Output)**: The raw AI response consisting of a Markdown Report and extracted raw scores (e.g., "7/15").

## 🔄 The Benchmarking Workflow (The Loop)

The system follows a strict **Review -> Rerun -> Approve** lifecycle:

1.  **Preparation**: Tasks are added manually or imported via JSON.
2.  **Execution**: The operator triggers a **Trial**. The system makes two sequential LLM calls:
    *   **Call 1**: Generates a deep-dive architectural report with a Comparison Matrix.
    *   **Call 2**: Acts as a "Data Extraction Engine" to parse the matrix into raw score strings.
3.  **Manual Vetting (Needs Review)**: The AI's output is presented as a draft. 
    *   If the AI hallucinated or broke the table format, the operator hits **Rerun AI**.
    *   The previous draft is discarded, and a fresh assessment is generated for *that specific trial*.
4.  **Finalization**: Only when the operator is satisfied does he click **Approve Result**. This locks the trial and marks it as `completed`.

## 📂 Project Structure & Key Files

### Frontend Components (`/components`)
*   `Sidebar.tsx`: Global navigation and persistent history of tasks.
*   `SingleRun.tsx`: The "Playground" for quick, one-off tests (saves to a default project).
*   `BatchRunner.tsx`: The primary benchmarking workspace. Manages the split-pane view for Input Review and Output Approval.
*   `StatsDashboard.tsx`: The aggregator. It performs all the mathematical normalization (scaling raw strings like "4/15" to 10) and renders the candidate leaderboards.

### Backend Logic (`/app/api`)
*   `assess/route.ts`: The "brain." Contains the system prompts and the parsing logic that separates Markdown reports from JSON data blocks.
*   `subjects/` & `trials/`: CRUD operations for the persistent benchmarking hierarchy.
*   `providers/`: Dynamically fetches configured LLM models from the environment.

### Configuration & Persistence
*   `types/index.ts`: The Source of Truth for the data model (`Subject`, `Trial`, `AssessmentResult`).
*   `lib/mongodb.ts`: Database connection management.
*   `config/models.ts`: Registry of all supported LLM providers and their flagship models.

## 📊 Statistics Logic
The system deliberately defers all mathematical operations to the frontend. Raw AI data (like "7/15") is stored exactly as returned to maintain integrity. The `StatsDashboard` handles:
*   **Normalization**: Converting varied scales into a uniform 0-10 score.
*   **Aggregation**: Grouping scores by Candidate Name across all Approved Trials in the database.
*   **Consistency Tracking**: Showing how many trials back a specific candidate's score.

