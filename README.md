# Code Assessor 🚀

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
   git clone https://github.com/your-username/code-assessor.git
   cd code-assessor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the Environment**:
   Create a `.env.local` file in the root directory. You can use `src/config/env.example` as a template:
   ```bash
   cp src/config/env.example .env.local
   # Then edit .env.local with your keys
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

Code Assessor follows a clean, service-oriented architecture:

- **`src/app/api`**: Thin Route Handlers for HTTP communication.
- **`src/services`**: Application logic layer (LLM orchestration, domain workflows).
- **`src/repositories`**: Data access layer for MongoDB.
- **`src/components`**: React UI components.
- **`src/types`**: Shared domain models.
- **`src/lib`**: Low-level infrastructure.


## 📝 Batch Runner Workflow

The Batch Runner is designed for rigorous benchmarking where you control the quality of every assessment.

1. **Create a Batch**: Give your test suite a name.
2. **Input Data**: 
   - **Manual**: Add items one by one in the UI.
   - **Import JSON**: Bulk load multiple assessments using a JSON file.
3. **Trigger Assessment**: Run the AI for any item. It will generate a draft report.
4. **Review & Rerun**: 
   - If the AI result is "messy" or incorrect, hit **Rerun** to try again.
   - You can change the model between reruns to see which one performs better.
5. **Finalize**: Click **Approve & Finalize** to save the result permanently. Only finalized results appear in the Statistics dashboard.

### JSON Import Schema
```json
[
  {
    "thingName": "Auth Component",
    "context": "React component for user login.",
    "language": "typescript",
    "snippets": [
      { "id": "1", "name": "C45SO", "content": "..." },
      { "id": "2", "name": "C45OP", "content": "..." }
    ]
  }
]
```


Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📝 Usage

1. **Configuration**: Select your preferred **LLM Provider** and **Model** from the top configuration panel.
2. **The Thing Name**: Enter the name of the component or service you are assessing (e.g., "Auth Service").
3. **The Context**: Provide background on the architectural requirements or constraints.
4. **Implementations**: 
   - Name each implementation (e.g., "Standard Implementation", "Optimized Hook").
   - Select the language (JS/Python).
   - Paste your code into the editor.
5. **Generate**: Click "Generate Architectural Report".
6. **Review & Export**: Once the AI generates the report, review the ranking and tiered categories. Click "Export as PDF" to save the report for your team.

## 📜 Assessment Methodology

The application uses a specialized prompt engineering strategy that instructs the model to:
- Conduct a deep-dive architectural assessment.
- Challenge patterns leading to technical debt.
- Focus on "Truth" and scalability rather than forced agreement.
- Provide objective Implementation Tiers.

The full prompt used for each assessment is included in the **Appendix** of every generated report.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
