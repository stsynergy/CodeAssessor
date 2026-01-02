"use client";

import { useState, useEffect, useRef } from "react";
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
import { Plus, Trash2, FileText, Loader2, Download, Settings2, Save, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReactToPrint } from "react-to-print";
import { Snippet, Language, Subject, Trial, Candidate } from "@/types";

interface Provider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
}

interface SingleRunProps {
  onSave?: () => void;
}

export const SingleRun: React.FC<SingleRunProps> = ({ onSave }) => {
  const [thingName, setThingName] = useState("");
  const [context, setContext] = useState("");
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("javascript");
  const [report, setReport] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `${thingName || "Architectural-Assessment"}-Report`,
  });

  useEffect(() => {
    fetchProviders();
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates");
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllCandidates(data);
        if (data.length >= 2) {
          setSnippets([
            { candidateId: data[0]._id!, content: "" },
            { candidateId: data[1]._id!, content: "" },
          ]);
        } else if (data.length === 1) {
          setSnippets([
            { candidateId: data[0]._id!, content: "" }
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    }
  };

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
    if (allCandidates.length === 0) return;
    
    // Find first candidate not already in snippets
    const usedIds = new Set(snippets.map(s => s.candidateId));
    const nextCandidate = allCandidates.find(c => !usedIds.has(c._id!)) || allCandidates[0];

    setSnippets([
      ...snippets,
      {
        candidateId: nextCandidate._id!,
        content: "",
      },
    ]);
  };

  const removeSnippet = (index: number) => {
    if (snippets.length <= 2) return;
    setSnippets(snippets.filter((_, i) => i !== index));
  };

  const updateSnippet = (index: number, updates: Partial<Snippet>) => {
    setSnippets(
      snippets.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const generateReport = async () => {
    setIsLoading(true);
    setReport("");
    setScores({});
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
        setScores(data.scores || {});
      } else {
        setReport("Failed to generate report: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      setReport("Error calling API: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAssessment = async () => {
    if (!thingName || !report) return;
    setIsSaving(true);
    try {
      // 1. Get or create "Playground" batch and ensure candidates are in lineup
      const batchResponse = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "getOrCreatePlayground", 
          candidateIds: snippets.map(s => s.candidateId) 
        }),
      });
      const playgroundBatch = await batchResponse.json();

      // 2. Create a Subject
      const subject: Partial<Subject> = {
        batchId: playgroundBatch._id,
        thingName,
        context,
        language: selectedLanguage,
        snippets: snippets.map(s => ({ ...s, language: selectedLanguage })),
        trialsNeeded: 1,
        providerId: selectedProviderId,
        modelId: selectedModelId,
        createdAt: new Date()
      };

      const subjectRes = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject),
      });
      const savedSubject = await subjectRes.json();

      // 3. Create a Trial
      const trial: Partial<Trial> = {
        subjectId: savedSubject._id,
        batchId: playgroundBatch._id,
        status: 'completed',
        providerId: selectedProviderId,
        modelId: selectedModelId,
        result: {
          providerId: selectedProviderId,
          modelId: selectedModelId,
          reportMarkdown: report,
          scores: scores,
          timestamp: new Date()
        },
        createdAt: new Date()
      };

      await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trial),
      });

      if (onSave) onSave();
      alert("Saved to Playground project!");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentProvider = availableProviders.find(p => p.id === selectedProviderId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Single Assessment</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Quickly test implementations. Saves will go to the "Playground" project.
          </p>
        </div>
        <button
          onClick={saveAssessment}
          disabled={!report || isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save to History
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
              className="w-full p-2 min-h-[100px] bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y text-sm"
              placeholder="Context (Describe what it suppose to be: requirements, constraints, or goals...)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 size={18} className="text-zinc-500" />
            <h3 className="font-semibold text-sm">Model Configuration</h3>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium min-w-[70px]">Provider</label>
              <select
                className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                value={selectedProviderId}
                onChange={handleProviderChange}
                disabled={availableProviders.length === 0}
              >
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium min-w-[70px]">Model</label>
              <select
                className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!currentProvider}
              >
                {currentProvider?.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
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
                {["javascript", "typescript", "python", "java", "c", "cpp", "csharp", "php", "rust"].map(lang => (
                  <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                ))}
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
          {snippets.map((snippet, idx) => {
            const candidate = allCandidates.find(c => c._id === snippet.candidateId);
            return (
              <div
                key={idx}
                className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 relative"
              >
                {snippets.length > 2 && (
                  <button
                    onClick={() => removeSnippet(idx)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors z-10"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-zinc-500" />
                    <select
                      className="flex-1 p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                      value={snippet.candidateId}
                      onChange={(e) => updateSnippet(idx, { candidateId: e.target.value })}
                    >
                      {allCandidates.map(c => {
                        const isSelectedElsewhere = snippets.some((s, i) => i !== idx && s.candidateId === c._id);
                        return (
                          <option key={c._id} value={c._id} disabled={isSelectedElsewhere}>
                            {c.name} {isSelectedElsewhere ? "(Selected)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden font-mono text-sm bg-zinc-50 dark:bg-zinc-950">
                    <Editor
                      value={snippet.content}
                      onValueChange={(content) => updateSnippet(idx, { content })}
                      highlight={(code) => {
                        const grammar = languages[selectedLanguage] || languages.javascript;
                        return highlight(code, grammar, selectedLanguage);
                      }}
                      padding={16}
                      className="min-h-[200px]"
                      textareaClassName="outline-none"
                      placeholder="Paste or write your code implementation here..."
                      style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {allCandidates.length === 0 && (
            <div className="p-10 text-center border-2 border-dashed rounded-xl text-zinc-400">
              <p>No candidates found in registry. Please add candidates first.</p>
            </div>
          )}
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
                h1: ({ ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 border-b pb-2" {...props} />,
                h2: ({ ...props }) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700" {...props} />
                  </div>
                ),
                th: ({ ...props }) => <th className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 text-left" {...props} />,
                td: ({ ...props }) => <td className="border border-zinc-300 dark:border-zinc-700 p-2" {...props} />,
                pre: ({ ...props }) => (
                  <pre 
                    className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-sm font-mono my-4"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
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
    </div>
  );
};
