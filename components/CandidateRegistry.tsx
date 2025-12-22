import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Check, 
  X,
  User as UserIcon
} from 'lucide-react';
import { Candidate } from '@/types';

export const CandidateRegistry: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates");
      const data = await response.json();
      if (Array.isArray(data)) setCandidates(data);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCandidate = async () => {
    if (!newName) return;
    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await response.json();
      setCandidates([...candidates, data]);
      setIsAdding(false);
      setNewName("");
      setNewDesc("");
    } catch (error) {
      console.error("Failed to add candidate:", error);
    }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Are you sure? This will remove this candidate from the global registry.")) return;
    try {
      await fetch(`/api/candidates?id=${id}`, { method: "DELETE" });
      setCandidates(candidates.filter(c => c._id !== id));
    } catch (error) {
      console.error("Failed to delete candidate:", error);
    }
  };

  const startEditing = (candidate: Candidate) => {
    setEditingId(candidate._id!);
    setNewName(candidate.name);
    setNewDesc(candidate.description || "");
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, name: newName, description: newDesc }),
      });
      const updated = await response.json();
      setCandidates(candidates.map(c => c._id === id ? updated : c));
      setEditingId(null);
      setNewName("");
      setNewDesc("");
    } catch (error) {
      console.error("Failed to update candidate:", error);
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidate Registry</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Manage the global pool of developers, models, or patterns to be assessed.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
        >
          {isAdding ? <X size={16} /> : <UserPlus size={16} />}
          {isAdding ? "Cancel" : "Add Candidate"}
        </button>
      </div>

      {isAdding && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">New Global Candidate</h3>
          <div className="grid gap-4">
            <input 
              placeholder="Candidate Name (e.g. Senior Dev A, GPT-4o)" 
              className="w-full p-2 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md text-sm" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
            />
            <textarea 
              placeholder="Description or bio (optional)" 
              className="w-full p-2 min-h-[80px] bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md text-sm" 
              value={newDesc} 
              onChange={(e) => setNewDesc(e.target.value)} 
            />
            <button 
              onClick={addCandidate} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium text-sm"
            >
              Create Candidate
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          placeholder="Search candidates..." 
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCandidates.map((candidate) => (
          <div 
            key={candidate._id} 
            className="group p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                <UserIcon size={24} />
              </div>
              <div className="flex items-center gap-1">
                {editingId === candidate._id ? (
                  <button onClick={() => saveEdit(candidate._id!)} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"><Check size={16} /></button>
                ) : (
                  <button onClick={() => startEditing(candidate)} className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={16} /></button>
                )}
                <button 
                  onClick={() => deleteCandidate(candidate._id!)} 
                  className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {editingId === candidate._id ? (
              <div className="space-y-2">
                <input 
                  className="w-full p-1 text-sm font-bold bg-transparent border-b border-blue-500 outline-none" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                />
                <textarea 
                  className="w-full p-1 text-xs text-zinc-500 bg-transparent border rounded outline-none" 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)} 
                />
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-sm">{candidate.name}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {candidate.description || "No description provided."}
                </p>
              </div>
            )}
          </div>
        ))}

        {filteredCandidates.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center text-zinc-400 border-2 border-dashed rounded-xl">
            <Users size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm">No candidates found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

