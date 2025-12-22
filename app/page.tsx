"use client";

import { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-php";
import "prismjs/components/prism-rust";
import "prismjs/themes/prism-tomorrow.css";
import { Plus, Trash2, FileText, Loader2, Download, Settings2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

interface Snippet {
  id: string;
  name: string;
  content: string;
}

type Language = "javascript" | "typescript" | "python" | "c" | "cpp" | "java" | "csharp" | "php" | "rust";

interface Provider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
}

export default function Home() {
  const [thingName, setThingName] = useState("");
  const [context, setContext] = useState("");
  const [snippets, setSnippets] = useState<Snippet[]>([
    { id: "1", name: "Implementation 1", content: "" },
    { id: "2", name: "Implementation 2", content: "" },
  ]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("javascript");
  const [report, setReport] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // New state for providers and models
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `${thingName || "Architectural-Assessment"}-Report`,
    pageStyle: `
      @page {
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    `,
  });

  useEffect(() => {
    setMounted(true);
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/providers");
      const data = await response.json();
      if (data.providers && data.providers.length > 0) {
        setAvailableProviders(data.providers);
        setSelectedProviderId(data.providers[0].id);
        setSelectedModelId(data.providers[0].models[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedProviderId(providerId);
    const provider = availableProviders.find((p) => p.id === providerId);
    if (provider && provider.models.length > 0) {
      setSelectedModelId(provider.models[0].id);
    }
  };

  const addSnippet = () => {
    setSnippets([
      ...snippets,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: `Implementation ${snippets.length + 1}`,
        content: "",
      },
    ]);
  };

  const removeSnippet = (id: string) => {
    if (snippets.length <= 2) return;
    setSnippets(snippets.filter((s) => s.id !== id));
  };

  const updateSnippet = (id: string, updates: Partial<Snippet>) => {
    setSnippets(
      snippets.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const generateReport = async () => {
    setIsLoading(true);
    setReport("");
    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          thingName, 
          context, 
          snippets: snippets.map(s => ({ ...s, language: selectedLanguage })),
          providerId: selectedProviderId,
          modelId: selectedModelId
        }),
      });

      const data = await response.json();
      if (data.report) {
        setReport(data.report);
      } else {
        setReport("Failed to generate report: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      setReport("Error calling API: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-zinc-950" />;
  }

  const currentProvider = availableProviders.find(p => p.id === selectedProviderId);

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto space-y-8 bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Code Assessor</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Compare multiple implementations and get a deep-dive architectural assessment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info Section */}
        <div className="grid gap-6 p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="grid gap-4">
            <input
              type="text"
              autoCapitalize="off"
              className="w-full p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              placeholder="The Thing Name (e.g. Auth Service, Data Fetcher...)"
              value={thingName}
              onChange={(e) => setThingName(e.target.value)}
            />
            <textarea
              autoCapitalize="off"
              className="w-full p-2 min-h-[100px] bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
              placeholder="Context (Describe what it suppose to be: requirements, constraints, or goals...)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </div>

        {/* Model Selection Section */}
        <div className="grid gap-6 p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 size={18} className="text-zinc-500" />
            <h3 className="font-semibold">Who will do it</h3>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium min-w-[70px]">Provider</label>
              <div className="flex-1 space-y-2">
                <select
                  className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={selectedProviderId}
                  onChange={handleProviderChange}
                  disabled={availableProviders.length === 0}
                >
                  {availableProviders.length === 0 ? (
                    <option className="bg-white dark:bg-zinc-900">No providers configured</option>
                  ) : (
                    availableProviders.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900">
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
                {availableProviders.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Configure API keys in config/api.ts.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium min-w-[70px]">Model</label>
              <select
                className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!currentProvider}
              >
                {currentProvider?.models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-900">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold whitespace-nowrap">Implementations</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-500">Language:</label>
              <select
                className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm min-w-[120px]"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as Language)}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="php">PHP</option>
                <option value="rust">Rust</option>
              </select>
            </div>
          </div>
          <button
            onClick={addSnippet}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Add Implementation
          </button>
        </div>

        <div className="grid gap-6">
          {snippets.map((snippet, index) => (
            <div
              key={snippet.id}
              className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 relative group"
            >
              {snippets.length > 2 && (
                <button
                  onClick={() => removeSnippet(snippet.id)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors z-10"
                >
                  <Trash2 size={18} />
                </button>
              )}
              
              <div className="space-y-4">
                <input
                  type="text"
                  autoCapitalize="off"
                  className="w-full p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="Implementation Name (e.g. Standard, Optimized...)"
                  value={snippet.name}
                  onChange={(e) => updateSnippet(snippet.id, { name: e.target.value })}
                />

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden font-mono text-sm bg-zinc-50 dark:bg-zinc-950">
                  <div 
                    className="min-h-[200px] overflow-auto resize-y cursor-text"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        const textarea = e.currentTarget.querySelector('textarea');
                        textarea?.focus();
                      }
                    }}
                  >
                    <Editor
                      value={snippet.content}
                      onValueChange={(content) => updateSnippet(snippet.id, { content })}
                      highlight={(code) => {
                        const grammar = languages[selectedLanguage] || languages.javascript;
                        return highlight(code, grammar, selectedLanguage);
                      }}
                      padding={16}
                      className="min-h-full"
                      textareaClassName="outline-none"
                      placeholder="Paste or write your code implementation here..."
                      style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 14,
                        minHeight: '200px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={generateReport}
          disabled={isLoading || !thingName || snippets.some(s => !s.content) || !selectedProviderId}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} /> Generating Assessment...
            </>
          ) : (
            <>
              <FileText size={20} /> Generate Architectural Report
            </>
          )}
        </button>
      </div>

      {report && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <h2 className="text-2xl font-bold">Architectural Assessment Report</h2>
            <button
              onClick={() => handlePrint()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm font-medium shadow-sm"
            >
              <Download size={16} /> Export as PDF
            </button>
          </div>
          
          <div
            ref={reportRef}
            className="prose prose-zinc dark:prose-invert max-w-none p-8 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm print:shadow-none print:border-none print:p-0 print:text-black print:prose-zinc"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 border-b pb-2 print:border-zinc-300" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-medium mt-4 mb-2" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 mb-4" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 mb-4" {...props} />,
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 print:border-zinc-400" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => <th className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 text-left print:bg-zinc-100 print:border-zinc-400" {...props} />,
                td: ({ node, ...props }) => <td className="border border-zinc-300 dark:border-zinc-700 p-2 print:border-zinc-400" {...props} />,
                pre: ({ node, ...props }) => (
                  <pre 
                    className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-sm font-mono my-4 print:bg-zinc-50 print:border-zinc-300 print:text-xs"
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere'
                    }}
                    {...props} 
                  />
                ),
                code: ({ node, ...props }) => (
                  <code 
                    className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded font-mono text-sm print:bg-zinc-100"
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere'
                    }}
                    {...props} 
                  />
                ),
              }}
            >
              {report}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  );
}
