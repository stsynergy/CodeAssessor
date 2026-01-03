# Code Assessor

Code Assessor is a Next.js application designed to perform deep-dive architectural assessments of multiple code implementations. It supports multiple LLM providers (OpenAI, Anthropic, Google, Grok) to provide rigorous, objective comparisons across metrics like Integrity, DX, UX, and Data Flow.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)
![Multi-LLM](https://img.shields.io/badge/AI-Multi--Provider-blueviolet)

## ✨ Features

- **Multi-Provider Support**: Choose between OpenAI, Anthropic, Google, OpenRouter or Local Ollama.
- **Flagship Model Access**: Access the latest models like GPT-5.2, Claude 4.5, and Gemini 3.
- **Per-Trial Model Assignment**: Assign different LLM judges to individual trials within the same task for objective cross-model comparison.
- **Batch Assessment Engine**: Manage multiple assessments in a single batch.
- **Review-First Workflow**: Run assessments, review AI output, and rerun as needed before finalizing results.
- **Single-Call Ranking Engine**: Automatically parses a mandated `<SCORES>` block from the model response to extract candidate rankings.
- **Borda Count Statistics**: Uses Normalized Borda Count to aggregate performance across trials with varying candidate counts.
- **PDF Export**: Generate professional PDF reports for individual assessments.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: MongoDB (via `mongodb` driver)
- **AI Multi-Provider Core**: [multi-llm-ts](https://nbonamy.github.io/multi-llm-ts/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Markdown Rendering**: [react-markdown](https://github.com/remarkjs/react-markdown)
- **Code Editor**: [react-simple-code-editor](https://github.com/satya164/react-simple-code-editor)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- MongoDB instance (local or Atlas)
- API Keys for LLM providers

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/stsynergy/CodeAssessor.git
   cd CodeAssessor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the Environment**:
   Create a `.env.local` file in the root directory. You can use `src/config/env.example` as a template:
   ```bash
   cp src/config/env.example .env.local
   # Then edit .env.local with your keys, ollama nad db config
   ```
   | Note: You need to setup DB and at least one provider API key.

4. **Initialize Database Indexes**:
   Run the following command to set up necessary database indexes and constraints:
   ```bash
   npm run db:indexes
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```


6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Architecture

Code Assessor follows a clean, service-oriented architecture:

- **`src/app/api`**: Thin Route Handlers for HTTP communication.
- **`src/services`**: Application logic layer (LLM orchestration, domain workflows).
- **`src/repositories`**: Data access layer for MongoDB.
- **`src/components`**: React UI components.
- **`src/types`**: Shared domain models.
- **`src/lib`**: Low-level infrastructure.


## 📝 Usage & Workflow

Code Assessor is optimized for **Human-in-the-Loop Benchmarking**. While a **Single Run** tool is available for quick testing, the core value lies in the multi-trial statistical analysis provided by the **Batch Runner**.

### 1. The Benchmark Suite (Main Workflow)
The primary workflow follows a **Setup → Execute → Review → Analyze** loop:

*   **Phase A: Setup (Candidates & Batches)**
    1.  **Define Candidates**: Go to the **Candidates** registry and define your global entities (e.g., "Senior Dev A", "Model X", "Model Y", etc.).

         **Make sure the candidate names are not recognizable by the judge models!**
         You can write real model names into description field.

    2.  **Create a Batch**: Create a **new Project** (Batch) and Select candidates that will participate in this specific suite (**Menage Lineup**).

*   **Phase B: Data Entry**

      3.  **Define Tasks**: **Add Task** or problem you want to assess.
      
      - **Manual**: Enter the "Thing Name", and "Context", then paste code snippets for each candidate.
      
      - **Bulk Import**: Use a JSON file to load multiple subjects at once (see [JSON Import Schema](#json-import-schema)).


*   **Phase C: Execution (Trials & Reruns)**
      
      4.  **Trigger Trials**: Each subject automatically generates multiple **Trials** (e.g., 3-5). You can assign different LLM judges to different trials to ensure objective cross-model comparison.
      **Run AI** for each trial.

      5.  **Manual Vetting**: AI results are initially saved as drafts. Review the report. If the AI hallucinated or the ranking is "messy", hit **Rerun AI** to try again.

      6.  **Finalize**: Click **Approve & Finalize** to save the result permanently. Only finalized trials are included in the global statistics.

*   **Phase D: Analysis**

    7.  **Dashboard**: Visit the **Statistics** view to see the **Normalized Borda Count** scores. This aggregates performance across all subjects and trials to show which candidate is architecturally superior.

### 2. Quick Testing (Single Run)
Use the **Single Run** view for:
- **Sanity Checks**: Verifying that your API keys and LLM providers are connected correctly.
- **Prompt Preview**: Testing how the "Senior Architect" judge handles a specific code pattern before adding it to a large batch.
- **Ad-hoc Reports**: Generating a quick one-off PDF report that doesn't need to be tracked statistically.

### 📥 JSON Import Schema
To bulk-load subjects into a batch, use the following format. Note that the `name` in snippets must match a name in your **Global Candidate Registry**.

```json
[
  {
    "thingName": "Auth Component",
    "context": "Implement a JWT-based login with refresh token support.",
    "language": "typescript",
    "trialsNeeded": 3,
    "snippets": [
      { "name": "Senior Dev A", "content": "..." },
      { "name": "Claude 3.5", "content": "..." }
    ]
  }
]
```


## 📜 Assessment Methodology

The application uses a specialized prompt engineering strategy that instructs the model to:
- Conduct a deep-dive architectural assessment.
- Challenge patterns leading to technical debt.
- Focus on "Truth" and scalability rather than forced agreement.
- Provide objective Implementation Tiers.

The full prompt used for each assessment is included in the **Appendix** of every generated report.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
