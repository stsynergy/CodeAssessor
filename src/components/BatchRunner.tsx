import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Play, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight, 
  Trash2, 
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
  Edit3,
  Check,
  X,
  HelpCircle,
  Code,
  Award,
  FileText, 
  Layers,
  Users,
  User
} from 'lucide-react';
import { Batch, Subject, Trial, Language, Snippet, Candidate } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

interface Provider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
}

export const BatchRunner: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [activeTrial, setActiveTrial] = useState<Trial | null>(null);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState<string | null>(null); // ID of running trial
  
  // Manual entry state for Subject
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newThingName, setNewThingName] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newLanguage, setNewLanguage] = useState<Language>("javascript");
  const [newTrialsNeeded, setNewTrialsNeeded] = useState(3);

  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  const [showHelp, setShowHelp] = useState(false);
  const [isManagingCandidates, setIsManagingCandidates] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchProviders();
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates");
      const data = await response.json();
      if (Array.isArray(data)) setAllCandidates(data);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    }
  };

  useEffect(() => {
    if (selectedBatch) {
      fetchSubjects(selectedBatch._id!);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedSubject?._id) {
      fetchTrials(selectedSubject._id);
    }
  }, [selectedSubject?._id]);

  // Sync toolbar with active trial's specific model
  useEffect(() => {
    if (activeTrial) {
      if (activeTrial.providerId) setSelectedProviderId(activeTrial.providerId);
      if (activeTrial.modelId) setSelectedModelId(activeTrial.modelId);
    } else if (selectedSubject) {
      if (selectedSubject.providerId) setSelectedProviderId(selectedSubject.providerId);
      if (selectedSubject.modelId) setSelectedModelId(selectedSubject.modelId);
    }
  }, [activeTrial?._id]);

  // Auto-save subject changes with debounce
  useEffect(() => {
    if (!selectedSubject) return;
    
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedSubject),
        });
        // Update the subjects list in sidebar to stay in sync
        setSubjects(prev => prev.map(s => s._id === selectedSubject._id ? selectedSubject : s));
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [selectedSubject?.context, selectedSubject?.snippets, selectedSubject?.thingName, selectedSubject?.language, selectedSubject?.providerId, selectedSubject?.modelId]);

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches");
      const data = await response.json();
      if (Array.isArray(data)) setBatches(data);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    }
  };

  const fetchSubjects = async (batchId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/subjects?batchId=${batchId}`);
      const data = await response.json();
      if (Array.isArray(data)) setSubjects(data);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrials = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/trials?subjectId=${subjectId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setTrials(data);
        if (data.length > 0) {
          // Default to the first non-completed trial or the first one
          const firstPending = data.find(t => t.status !== 'completed');
          setActiveTrial(firstPending || data[0]);
        } else {
          setActiveTrial(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch trials:", error);
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

  const createBatch = async () => {
    const name = prompt("Enter batch name:");
    if (!name) return;

    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, candidateIds: [], createdAt: new Date() }),
      });
      const data = await response.json();
      setBatches([data, ...batches]);
      setSelectedBatch(data);
    } catch (error) {
      console.error("Failed to create batch:", error);
    }
  };

  const deleteBatch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure? This will delete all subjects and trials in this batch.")) return;

    try {
      await fetch(`/api/batches?id=${id}`, { method: "DELETE" });
      setBatches(batches.filter(b => b._id !== id));
      if (selectedBatch?._id === id) {
        setSelectedBatch(null);
        setSubjects([]);
        setSelectedSubject(null);
        setTrials([]);
      }
    } catch (error) {
      console.error("Failed to delete batch:", error);
    }
  };

  const toggleCandidateInBatch = async (candidateId: string) => {
    if (!selectedBatch) return;
    
    const isSubscribed = (selectedBatch.candidateIds || []).includes(candidateId);
    let newIds: string[];
    
    if (isSubscribed) {
      newIds = selectedBatch.candidateIds.filter(id => id !== candidateId);
    } else {
      newIds = [...(selectedBatch.candidateIds || []), candidateId];
    }

    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedBatch, candidateIds: newIds }),
      });
      const updated = await response.json();
      setSelectedBatch(updated);
      setBatches(batches.map(b => b._id === updated._id ? updated : b));
    } catch (error) {
      console.error("Failed to update batch candidates:", error);
    }
  };

  const deleteSubject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure? This will delete all trials for this task.")) return;

    try {
      await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
      setSubjects(subjects.filter(s => s._id !== id));
      if (selectedSubject?._id === id) {
        setSelectedSubject(null);
        setTrials([]);
        setActiveTrial(null);
      }
    } catch (error) {
      console.error("Failed to delete subject:", error);
    }
  };

  const addManualSubject = async () => {
    if (!selectedBatch || !newThingName) return;

    // Create snippets for all batch candidates
    const snippets: Snippet[] = (selectedBatch.candidateIds || []).map(cid => ({
      candidateId: cid,
      content: ""
    }));

    const subject: Partial<Subject> = {
      batchId: selectedBatch._id!,
      thingName: newThingName,
      context: newContext,
      language: newLanguage,
      trialsNeeded: newTrialsNeeded,
      snippets: snippets,
      providerId: selectedProviderId,
      modelId: selectedModelId,
      createdAt: new Date()
    };

    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject),
      });
      const savedSubject = await response.json();
      setSubjects([savedSubject, ...subjects]);
      setSelectedSubject(savedSubject);
      setIsAddingSubject(false);
      
      // Reset form
      setNewThingName("");
      setNewContext("");
      setNewTrialsNeeded(3);
      
      // Create initial trials
      for (let i = 0; i < newTrialsNeeded; i++) {
        await createTrial(savedSubject._id!);
      }
      fetchTrials(savedSubject._id!);
    } catch (error) {
      console.error("Failed to add subject:", error);
    }
  };

  const createTrial = async (subjectId: string) => {
    const trial: Partial<Trial> = {
      subjectId,
      batchId: selectedBatch!._id!,
      status: 'pending',
      providerId: selectedProviderId,
      modelId: selectedModelId,
      createdAt: new Date()
    };
    const response = await fetch("/api/trials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trial),
    });
    return response.json();
  };

  const runTrial = async (trial: Trial) => {
    if (!selectedSubject) return;
    setIsRunning(trial._id!);
    
    // Use trial-specific model/provider, falling back to selected toolbar values
    const currentProviderId = trial.providerId || selectedProviderId;
    const currentModelId = trial.modelId || selectedModelId;

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          thingName: selectedSubject.thingName, 
          context: selectedSubject.context, 
          snippets: selectedSubject.snippets,
          providerId: currentProviderId,
          modelId: currentModelId
        }),
      });

      const data = await response.json();
      if (data.report) {
        const updatedTrial: Trial = {
          ...trial,
          status: 'needs_review',
          result: {
            providerId: currentProviderId,
            modelId: currentModelId,
            reportMarkdown: data.report,
            scores: data.scores || {},
            timestamp: new Date()
          }
        };

        const saveResponse = await fetch("/api/trials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTrial),
        });
        const saved = await saveResponse.json();
        
        setTrials(prev => prev.map(t => t._id === saved._id ? saved : t));
        setActiveTrial(saved);
      }
    } catch (error) {
      console.error("Failed to run trial:", error);
    } finally {
      setIsRunning(null);
    }
  };

  const deleteTrial = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this trial?")) return;

    try {
      await fetch(`/api/trials?id=${id}`, { method: "DELETE" });
      setTrials(trials.filter(t => t._id !== id));
      if (activeTrial?._id === id) {
        setActiveTrial(null);
      }
    } catch (error) {
      console.error("Failed to delete trial:", error);
    }
  };

  const finalizeTrial = async (trial: Trial) => {
    if (!trial.result) return;
    try {
      const updatedTrial: Trial = { ...trial, status: 'completed' };
      const response = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTrial),
      });
      const saved = await response.json();
      
      const updatedTrials = trials.map(t => t._id === saved._id ? saved : t);
      setTrials(updatedTrials);
      
      // Automatically switch to the next trial that needs attention
      const nextTrial = updatedTrials.find(t => t.status !== 'completed');
      if (nextTrial) {
        setActiveTrial(nextTrial);
      } else {
        setActiveTrial(saved);
      }
    } catch (error) {
      console.error("Failed to finalize trial:", error);
    }
  };

  const importSubjects = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBatch || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      
      if (!content || content.trim() === "") {
        alert("The selected file is empty.");
        e.target.value = "";
        return;
      }

      let json;
      try {
        json = JSON.parse(content);
      } catch (parseError) {
        alert("Invalid JSON format. Please check your file syntax.");
        e.target.value = "";
        return;
      }

      try {
        const items = Array.isArray(json) ? json : [json];
        
        // 1. Delegate import logic to server
        const response = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            action: "import", 
            batchId: selectedBatch._id, 
            items 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || "Failed to import tasks onto the server.");
          return;
        }

        // 2. Refresh lineup if needed
        const batchRes = await fetch(`/api/batches?id=${selectedBatch._id}`);
        const updatedBatch = await batchRes.json();
        setSelectedBatch(updatedBatch);
        setBatches(prev => prev.map(b => b._id === updatedBatch._id ? updatedBatch : b));

        // 3. Refresh subjects list
        fetchSubjects(selectedBatch._id!);
        alert("Import successful!");
      } catch (error: any) {
        console.error("Failed to import subjects:", error);
        alert("An unexpected error occurred during import.");
      } finally {
        // Reset input so the same file can be selected again
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const updateSubjectSnippet = (candidateId: string, content: string) => {
    if (!selectedSubject) return;
    const updatedSnippets = [...selectedSubject.snippets];
    const index = updatedSnippets.findIndex(s => s.candidateId === candidateId);
    
    if (index !== -1) {
      updatedSnippets[index] = { ...updatedSnippets[index], content };
    } else {
      updatedSnippets.push({ candidateId, content });
    }

    setSelectedSubject({
      ...selectedSubject,
      snippets: updatedSnippets
    });
  };

  const updateTrialModel = async (trial: Trial, pId: string, mId: string) => {
    const updated = { ...trial, providerId: pId, modelId: mId };
    setActiveTrial(updated);
    setTrials(prev => prev.map(t => t._id === updated._id ? updated : t));
    
    try {
      await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (error) {
      console.error("Failed to update trial model:", error);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedProviderId(pId);
    const provider = availableProviders.find((p) => p.id === pId);
    if (provider && provider.models.length > 0) {
      const mId = provider.models[0].id;
      setSelectedModelId(mId);
      
      if (activeTrial) {
        updateTrialModel(activeTrial, pId, mId);
      } else if (selectedSubject) {
        setSelectedSubject({ ...selectedSubject, providerId: pId, modelId: mId });
      }
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mId = e.target.value;
    setSelectedModelId(mId);
    if (activeTrial) {
      updateTrialModel(activeTrial, selectedProviderId, mId);
    } else if (selectedSubject) {
      setSelectedSubject({ ...selectedSubject, modelId: mId });
    }
  };

  if (!selectedBatch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Benchmark Suite</h1>
          <button onClick={createBatch} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium">
            <Plus size={16} /> New Project
          </button>
        </div>
        <div className="grid gap-4">
          {batches.map((batch) => (
            <div key={batch._id} onClick={() => setSelectedBatch(batch)} className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 transition-all cursor-pointer shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg"><Layers size={20} className="text-zinc-500" /></div>
                <h3 className="font-semibold text-sm">{batch.name}</h3>
              </div>
              <button onClick={(e) => deleteBatch(batch._id!, e)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedBatch(null); setSelectedSubject(null); }} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm">← All Projects</button>
          <h1 className="text-2xl font-bold tracking-tight">{selectedBatch.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsManagingCandidates(!isManagingCandidates)} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${isManagingCandidates ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
            <Users size={16} /> {isManagingCandidates ? 'Close Lineup' : 'Manage Lineup'}
          </button>
          <button onClick={() => setIsAddingSubject(!isAddingSubject)} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors text-sm font-medium"><Plus size={16} /> Add Task</button>
          <label className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors text-sm font-medium cursor-pointer">
            <Upload size={16} /> Import JSON
            <input type="file" accept=".json" className="hidden" onChange={importSubjects} />
          </label>
        </div>
      </div>

      {isManagingCandidates && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Project Lineup</h3>
              <p className="text-xs text-zinc-500">Select candidates from the global registry to include in this project.</p>
            </div>
            <button onClick={() => setIsManagingCandidates(false)}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto p-1">
            {allCandidates.map(candidate => {
              const isActive = (selectedBatch.candidateIds || []).includes(candidate._id!);
              return (
                <button 
                  key={candidate._id} 
                  onClick={() => toggleCandidateInBatch(candidate._id!)}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${isActive ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 opacity-60'}`}
                >
                  <div className={`p-2 rounded-full mb-2 ${isActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    <User size={20} />
                  </div>
                  <span className={`text-[10px] font-bold text-center line-clamp-1 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-500'}`}>
                    {candidate.name}
                  </span>
                </button>
              );
            })}
            {allCandidates.length === 0 && (
              <div className="col-span-full py-10 text-center text-zinc-400 border-2 border-dashed rounded-lg">
                <p className="text-xs italic">No global candidates found. Go to Candidate Registry to add some.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isAddingSubject && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold">New Benchmark Task</h3><button onClick={() => setIsAddingSubject(false)}><X size={18} /></button></div>
          <div className="grid gap-4">
            <input placeholder="Task Name (e.g. JWT Auth)" className="w-full p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md text-sm" value={newThingName} onChange={(e) => setNewThingName(e.target.value)} />
            <textarea placeholder="Requirements/Context" className="w-full p-2 min-h-[80px] bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md text-sm" value={newContext} onChange={(e) => setNewContext(e.target.value)} />
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-400">Lineup</label>
              <div className="flex flex-wrap gap-2">
                {(selectedBatch.candidateIds || []).length > 0 ? (
                  (selectedBatch.candidateIds || []).map(cid => {
                    const cand = allCandidates.find(c => c._id === cid);
                    return (
                      <div key={cid} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold">
                        {cand?.name || "Unknown Candidate"}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-zinc-400 italic">No candidates selected for this project. Manage lineup first.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs">Trials Needed:</label>
                <input type="number" className="w-20 p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md text-sm" value={newTrialsNeeded} onChange={(e) => setNewTrialsNeeded(parseInt(e.target.value))} />
              </div>
              <button 
                onClick={addManualSubject} 
                disabled={!(selectedBatch.candidateIds || []) || (selectedBatch.candidateIds || []).length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium text-sm disabled:opacity-50"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-y-6 gap-x-0">
        {/* Subjects Column */}
        <div className="lg:col-span-2 space-y-4 pr-1">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Tasks</h3>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2">
            {subjects.map((s) => (
              <div key={s._id} className="group flex items-center gap-1">
                <button onClick={() => setSelectedSubject(s)} className={`flex-1 text-left p-2 rounded text-xs transition-colors ${selectedSubject?._id === s._id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                  {s.thingName}
                </button>
                <button onClick={(e) => deleteSubject(s._id!, e)} className="p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Trials Column */}
        <div className="lg:col-span-1 space-y-4 border-l pl-1 border-zinc-200 dark:border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Trials</h3>
          <div className="space-y-2">
            {trials.map((t, idx) => (
              <div key={t._id} className="group/trial relative">
                <button onClick={() => setActiveTrial(t)} className={`w-full flex items-center justify-between p-2 rounded border ${activeTrial?._id === t._id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200'}`}>
                  <span className="text-[10px] font-bold">#{idx + 1}</span>
                  {isRunning === t._id ? <Loader2 size={10} className="animate-spin text-blue-500" /> : t.status === 'completed' ? <CheckCircle2 size={10} className="text-green-500" /> : t.status === 'needs_review' ? <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />}
                </button>
                <button 
                  onClick={(e) => deleteTrial(t._id!, e)} 
                  className="absolute -top-1 -right-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full p-0.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover/trial:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
            <button onClick={() => selectedSubject && createTrial(selectedSubject._id!).then(() => fetchTrials(selectedSubject._id!))} className="w-full py-1.5 border border-dashed border-zinc-300 rounded text-[10px] text-zinc-400 hover:text-zinc-600 hover:border-zinc-400">+ Add Trial</button>
          </div>
        </div>

        {/* Workspace Column */}
        <div className="lg:col-span-9 pl-6">
          {selectedSubject ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[75vh]">
              {/* Toolbar */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black uppercase text-zinc-400">Model</label>
                    <select className="p-1 bg-white dark:bg-zinc-900 border rounded text-[10px] outline-none" value={selectedProviderId} onChange={handleProviderChange}>
                      {availableProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="p-1 bg-white dark:bg-zinc-900 border rounded text-[10px] outline-none" value={selectedModelId} onChange={handleModelChange}>
                      {availableProviders.find(p => p.id === selectedProviderId)?.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeTrial && activeTrial.status === 'needs_review' && <button onClick={() => finalizeTrial(activeTrial)} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold shadow-sm"><Check size={12} /> Approve Result</button>}
                  {activeTrial && <button onClick={() => runTrial(activeTrial)} disabled={!!isRunning} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-sm disabled:opacity-50">{isRunning === activeTrial._id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}{activeTrial.status === 'pending' ? 'Run AI' : 'Rerun AI'}</button>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Input Review */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 bg-zinc-50/50 dark:bg-zinc-950/30 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 max-h-[400px] overflow-y-auto">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Task Settings</h4>
                        {isSaving && <span className="text-[10px] text-zinc-400 animate-pulse flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Saving...</span>}
                      </div>
                      <div className="grid gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Task Name</label>
                          <input 
                            className="w-full text-xs p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 font-bold" 
                            value={selectedSubject.thingName} 
                            onChange={(e) => setSelectedSubject({...selectedSubject, thingName: e.target.value})} 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Language</label>
                          <select 
                            className="w-full text-xs p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800" 
                            value={selectedSubject.language} 
                            onChange={(e) => setSelectedSubject({...selectedSubject, language: e.target.value as Language})}
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
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Context</h4>
                      <textarea className="w-full text-xs p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 leading-relaxed min-h-[100px]" value={selectedSubject.context} onChange={(e) => setSelectedSubject({...selectedSubject, context: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Candidates</h4>
                    </div>
                    <div className="grid gap-4">
                      {(selectedBatch.candidateIds || []).map(cid => {
                        const candidate = allCandidates.find(c => c._id === cid);
                        const snippet = selectedSubject.snippets.find(s => s.candidateId === cid);
                        return (
                          <div key={cid} className="space-y-1">
                            <div className="flex items-center justify-between group/cand">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase">
                                {candidate?.name || "Unknown Candidate"}
                              </span>
                            </div>
                            <div className="border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden h-[150px] overflow-y-auto bg-white dark:bg-zinc-900">
                              <Editor 
                                value={snippet?.content || ""} 
                                onValueChange={(code) => updateSubjectSnippet(cid, code)} 
                                highlight={(code) => highlight(code, languages[selectedSubject.language] || languages.javascript, selectedSubject.language)} 
                                padding={8} 
                                className="font-mono text-[10px] min-h-full" 
                                style={{ fontFamily: '"Fira code", "Fira Mono", monospace' }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                      {((selectedBatch.candidateIds || [])).length === 0 && (
                        <p className="text-xs text-zinc-400 italic">No candidates selected for this project.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Result Display */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Assessment Result</h4>
                  </div>

                  {activeTrial ? (
                    activeTrial.result ? (
                      <div className="space-y-8 min-w-0">
                        {/* Unified Ranking Bar - Immediate Feedback */}
                        <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Candidate Ranking</h5>
                            {!activeTrial.result.scores || Object.keys(activeTrial.result.scores).length === 0 && (
                              <span className="text-[9px] text-amber-500 flex items-center gap-1"><AlertCircle size={10} /> Ranks not parsed</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {activeTrial.result.scores && Object.entries(activeTrial.result.scores).length > 0 ? (
                              Object.entries(activeTrial.result.scores)
                                .sort(([, a], [, b]) => parseInt(String(a)) - parseInt(String(b)))
                                .map(([cid, rank]) => {
                                  const candidate = allCandidates.find(c => c._id === cid);
                                  const displayName = candidate?.name || cid;
                                  return (
                                    <div key={cid} className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center shadow-sm relative overflow-hidden">
                                      {parseInt(String(rank)) === 1 && (
                                        <div className="absolute top-0 right-0 p-1">
                                          <Award size={12} className="text-amber-500" />
                                        </div>
                                      )}
                                      <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 truncate" title={displayName}>{displayName}</p>
                                      <p className="text-3xl font-black text-blue-600">
                                        <span className="text-sm font-normal opacity-40 mr-1">Rank</span>
                                        #{String(rank)}
                                      </p>
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="col-span-full py-4 text-center text-xs text-zinc-400 italic bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                                Waiting for assessment...
                              </div>
                            )}
                          </div>
                        </div>

                      <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm min-h-[842px] prose prose-zinc dark:prose-invert max-w-none min-w-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          h1: ({...props}) => <h1 className="text-3xl font-bold mt-8 mb-4 border-b pb-2" {...props} />,
                          h2: ({...props}) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                          table: ({...props}) => (
                            <div className="overflow-x-auto my-6">
                              <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700" {...props} />
                            </div>
                          ),
                          th: ({...props}) => <th className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-2 text-left" {...props} />,
                          td: ({...props}) => <td className="border border-zinc-300 dark:border-zinc-700 p-2" {...props} />,
                          pre: ({ ...props }) => (
                            <pre 
                              className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-sm font-mono my-4"
                              style={{ 
                                whiteSpace: 'pre-wrap',
                                width: '100%',
                                display: 'block',
                                boxSizing: 'border-box'
                              }}
                              {...props} 
                            />
                          ),
                          code: ({ ...props }) => (
                            <code 
                              style={{ 
                                whiteSpace: 'pre-wrap'
                              }}
                              {...props} 
                            />
                          ),
                        }}>
                          {activeTrial.result.reportMarkdown}
                        </ReactMarkdown>
                      </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-40 text-zinc-300 border-2 border-dashed rounded-2xl"><Code size={48} className="mb-4 opacity-10" /><p className="text-sm font-medium">Ready for trial #{trials.indexOf(activeTrial) + 1}</p></div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-300 border-2 border-dashed rounded-2xl italic text-xs">
                      Select a Trial from the left column to view or generate an assessment result.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center py-40 text-zinc-400">
              <Eye size={48} className="mb-4 opacity-20" /><p className="font-medium">Select a Task to start benchmarking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
