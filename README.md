# Code Assessor 🚀

Code Assessor is a Next.js application designed to perform deep-dive architectural assessments of multiple code implementations. It supports multiple LLM providers (OpenAI, Anthropic, Google, Grok) to provide rigorous, objective comparisons across metrics like Integrity, DX, UX, and Data Flow.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)
![Multi-LLM](https://img.shields.io/badge/AI-Multi--Provider-blueviolet)

## ✨ Features

- **Multi-Provider Support**: Choose between OpenAI, Anthropic, Google, and Grok (xAI).
- **Flagship Model Access**: Access the latest models like GPT-5, Claude 4.5, and Gemini 3.
- **Multi-Implementation Comparison**: Compare two or more snippets side-by-side.
- **Smart Syntax Highlighting**: Interactive code editors for JavaScript, TypeScript, and Python.
- **AI Architectural Assessment**: Generates a professional report using a "Comparison Matrix" and "Implementation Tiers" format.
- **Automated Scoring Engine**: Automatically parses the assessment matrix to calculate weighted summary scores for each candidate.
- **PDF Export**: Generate high-quality, multi-page PDF reports with professional margins and word-wrapped methodology appendices.
- **Dark Mode Support**: Fully responsive UI that respects your system preferences.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **AI Multi-Provider Core**: [multi-llm-ts](https://nbonamy.github.io/multi-llm-ts/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Markdown Rendering**: [react-markdown](https://github.com/remarkjs/react-markdown) with [remark-gfm](https://github.com/remarkjs/remark-gfm)
- **Code Editor**: [react-simple-code-editor](https://github.com/satya164/react-simple-code-editor) + [PrismJS](https://prismjs.com/)
- **PDF Generation**: [react-to-print](https://github.com/MatthewHerbst/react-to-print)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- API Keys for your preferred LLM providers (OpenAI, Anthropic, Google, or Grok)

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

3. **Configure the API Keys**:
   Create a file named `config/api.ts` (or use the template) and add your keys:
   ```typescript
   export const OPENAI_API_KEY = "sk-...";
   export const ANTHROPIC_API_KEY = "sk-ant-...";
   export const GOOGLE_GENERATIVE_AI_API_KEY = "AIzaSy...";
   export const XAI_API_KEY = "xai-..."; // Grok
   ```

4. **Run the development server**:
   ```bash
   npm run dev
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
6. **Review & Export**: Once the AI generates the report, review the comparison matrix and summary scores. Click "Export as PDF" to save the report for your team.

## 📜 Assessment Methodology

The application uses a specialized prompt engineering strategy that instructs the model to:
- Conduct a deep-dive architectural assessment.
- Challenge patterns leading to technical debt.
- Focus on "Truth" and scalability rather than forced agreement.
- Provide objective Implementation Tiers.

The full prompt used for each assessment is included in the **Appendix** of every generated report.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
