import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, TrendingUp, Cpu, Award, Zap, AlertTriangle, RefreshCw, User, Filter, Calendar, Code } from 'lucide-react';
import { Trial, Candidate, Batch, Subject } from '@/types';

export const StatsDashboard: React.FC = () => {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      fetchTrials(),
      fetchCandidates(),
      fetchBatches(),
      fetchSubjects()
    ]).finally(() => setIsLoading(false));
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates");
      const data = await response.json();
      if (Array.isArray(data)) setCandidates(data);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches");
      const data = await response.json();
      if (Array.isArray(data)) setBatches(data);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      if (Array.isArray(data)) setSubjects(data);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const fetchTrials = async () => {
    try {
      const response = await fetch("/api/trials");
      const data = await response.json();
      if (Array.isArray(data)) {
        setTrials(data.filter(t => t.status === 'completed' && t.result));
      }
    } catch (error) {
      console.error("Failed to fetch trials:", error);
    }
  };

  // Helper to parse scores like "7/15" or "8.5" into a numeric value
  const parseScore = (scoreStr: string | number): number => {
    if (typeof scoreStr === 'number') return scoreStr;
    if (!scoreStr) return 0;
    
    if (scoreStr.includes('/')) {
      const [achieved, total] = scoreStr.split('/').map(num => parseFloat(num.trim()));
      if (isNaN(achieved) || isNaN(total) || total === 0) return 0;
      return (achieved / total) * 10; // Normalize to 10
    }
    
    const parsed = parseFloat(scoreStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Filtered Trials
  const filteredTrials = useMemo(() => {
    return trials.filter(t => {
      const matchesBatch = selectedBatchId === "all" || t.batchId === selectedBatchId;
      
      let matchesLanguage = true;
      if (selectedLanguage !== "all") {
        const subject = subjects.find(s => s._id === t.subjectId);
        matchesLanguage = subject?.language === selectedLanguage;
      }
      
      return matchesBatch && matchesLanguage;
    });
  }, [trials, selectedBatchId, selectedLanguage, subjects]);

  // Languages present in subjects
  const availableLanguages = useMemo(() => {
    const langs = new Set(subjects.map(s => s.language));
    return Array.from(langs).sort();
  }, [subjects]);

  // Aggregations
  const modelStats = useMemo(() => {
    return filteredTrials.reduce((acc: any, curr) => {
      const modelId = curr.result?.modelId || 'unknown';
      if (!acc[modelId]) {
        acc[modelId] = { totalScore: 0, count: 0, providerId: curr.result?.providerId };
      }
      
      const scores = Object.values(curr.result?.scores || {}).map(s => parseScore(s));
      if (scores.length > 0) {
        const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        acc[modelId].totalScore += avg;
        acc[modelId].count += 1;
      }
      return acc;
    }, {});
  }, [filteredTrials]);

  const modelAverages = useMemo(() => {
    return Object.entries(modelStats).map(([modelId, stats]: [string, any]) => ({
      modelId,
      avgScore: (stats.totalScore / stats.count).toFixed(2),
      count: stats.count,
      providerId: stats.providerId
    })).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
  }, [modelStats]);

  const candidateStats = useMemo(() => {
    return filteredTrials.reduce((acc: any, curr) => {
      Object.entries(curr.result?.scores || {}).forEach(([cid, scoreStr]) => {
        const score = parseScore(scoreStr);
        const candidate = candidates.find(c => c._id === cid);
        const displayName = candidate?.name || cid;
        
        if (!acc[cid]) {
          acc[cid] = { 
            scores: [], 
            totalScore: 0, 
            count: 0, 
            displayName: displayName,
            min: 10,
            max: 0
          };
        }
        acc[cid].scores.push(score);
        acc[cid].totalScore += score;
        acc[cid].count += 1;
        acc[cid].min = Math.min(acc[cid].min, score);
        acc[cid].max = Math.max(acc[cid].max, score);
      });
      return acc;
    }, {});
  }, [filteredTrials, candidates]);

  const topCandidates = useMemo(() => {
    return Object.entries(candidateStats).map(([cid, stats]: [string, any]) => {
      const avg = stats.totalScore / stats.count;
      // Calculate Standard Deviation
      const squareDiffs = stats.scores.map((s: number) => Math.pow(s - avg, 2));
      const avgSquareDiff = squareDiffs.reduce((a: number, b: number) => a + b, 0) / stats.count;
      const stdDev = Math.sqrt(avgSquareDiff);

      return {
        id: cid,
        name: stats.displayName,
        avgScore: avg.toFixed(2),
        count: stats.count,
        min: stats.min.toFixed(1),
        max: stats.max.toFixed(1),
        stdDev: stdDev.toFixed(2),
        consistency: (10 - stdDev).toFixed(2) // Higher is more consistent
      };
    }).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
  }, [candidateStats]);

  const subjectStats = useMemo(() => {
    return filteredTrials.reduce((acc: any, curr) => {
      const subject = subjects.find(s => s._id === curr.subjectId);
      const name = subject?.thingName || 'Unknown Subject';
      
      if (!acc[curr.subjectId]) {
        acc[curr.subjectId] = { totalScore: 0, count: 0, name: name };
      }
      
      const scores = Object.values(curr.result?.scores || {}).map(s => parseScore(s));
      if (scores.length > 0) {
        const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        acc[curr.subjectId].totalScore += avg;
        acc[curr.subjectId].count += 1;
      }
      return acc;
    }, {});
  }, [filteredTrials, subjects]);

  const subjectAverages = useMemo(() => {
    return Object.entries(subjectStats).map(([sid, stats]: [string, any]) => ({
      id: sid,
      name: stats.name,
      avgScore: (stats.totalScore / stats.count).toFixed(2),
      count: stats.count
    })).sort((a, b) => parseFloat(a.avgScore) - parseFloat(b.avgScore)); // Show hardest first
  }, [subjectStats]);

  const candidateModelStats = useMemo(() => {
    const stats: any = {};
    filteredTrials.forEach(t => {
      const modelId = t.result?.modelId || 'unknown';
      Object.entries(t.result?.scores || {}).forEach(([cid, scoreStr]) => {
        const score = parseScore(scoreStr);
        if (!stats[cid]) stats[cid] = {};
        if (!stats[cid][modelId]) stats[cid][modelId] = { total: 0, count: 0 };
        stats[cid][modelId].total += score;
        stats[cid][modelId].count += 1;
      });
    });
    return stats;
  }, [filteredTrials]);

  const allModelIds = useMemo(() => {
    const models = new Set<string>();
    filteredTrials.forEach(t => {
      if (t.result?.modelId) models.add(t.result.modelId);
    });
    return Array.from(models).sort();
  }, [filteredTrials]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (trials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-zinc-400">
        <BarChart2 size={64} className="mb-4 opacity-10" />
        <h2 className="text-xl font-semibold mb-2 text-zinc-600 dark:text-zinc-300">No Benchmarks Yet</h2>
        <p>Run and approve some trials in the Benchmark Suite to see statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benchmark Statistics</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Aggregate insights from {filteredTrials.length} {selectedBatchId !== 'all' || selectedLanguage !== 'all' ? 'filtered' : 'approved'} trials.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-zinc-400" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Code size={14} className="text-zinc-400" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="all">All Languages</option>
              {availableLanguages.map(lang => (
                <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
              ))}
            </select>
          </div>

          {(selectedBatchId !== "all" || selectedLanguage !== "all") && (
            <button 
              onClick={() => { setSelectedBatchId("all"); setSelectedLanguage("all"); }}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
              <Zap size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Trials</h3>
          </div>
          <p className="text-4xl font-black">{filteredTrials.length}</p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Mean Score</h3>
          </div>
          <p className="text-4xl font-black">
            {filteredTrials.length > 0 ? (filteredTrials.reduce((acc, curr) => {
              const scores = Object.values(curr.result?.scores || {}).map(s => parseScore(s));
              return acc + (scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0);
            }, 0) / filteredTrials.length).toFixed(1) : "0.0"}
            <span className="text-xl text-zinc-400 font-normal">/10</span>
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
              <Cpu size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Models</h3>
          </div>
          <p className="text-4xl font-black">{Object.keys(modelStats).length}</p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
              <Award size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Candidates</h3>
          </div>
          <p className="text-4xl font-black">{Object.keys(candidateStats).length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Candidate Performance Leaderboard */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            Candidate Leaderboard
          </h3>
          <div className="space-y-4">
            {topCandidates.map((cand, idx) => (
              <div key={cand.id} className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{cand.name}</div>
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter">
                        {cand.count} approved trials
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-600">{cand.avgScore}</div>
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Average Score</div>
                  </div>
                </div>
                
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${parseFloat(cand.avgScore) * 10}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-tight">
                  <div className="flex flex-col p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400">Consistency</span>
                    <span className="text-blue-500">{cand.consistency}</span>
                  </div>
                  <div className="flex flex-col p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400">Min Score</span>
                    <span className="text-zinc-600 dark:text-zinc-300">{cand.min}</span>
                  </div>
                  <div className="flex flex-col p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400">Max Score</span>
                    <span className="text-zinc-600 dark:text-zinc-300">{cand.max}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* Model Consistency */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <RefreshCw className="text-blue-500" size={20} />
              Model Grading Severity
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Model</th>
                    <th className="px-4 py-3 text-center font-semibold">Trials</th>
                    <th className="px-4 py-3 text-right font-semibold">Avg Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {modelAverages.map((m) => (
                    <tr key={m.modelId}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-700 dark:text-zinc-300">{m.modelId}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{m.providerId}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400 font-medium">{m.count}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-blue-600">{m.avgScore}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hardest Subjects */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              Hardest Tasks (Lowest Avg)
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Task Name</th>
                    <th className="px-4 py-3 text-center font-semibold">Trials</th>
                    <th className="px-4 py-3 text-right font-semibold">Avg Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {subjectAverages.slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400 font-medium">{s.count}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-orange-600">{s.avgScore}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Performance by Model Breakdown */}
      {topCandidates.length > 0 && allModelIds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="text-purple-500" size={20} />
            Model-specific Candidate Performance
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-10">Candidate</th>
                  {allModelIds.map(modelId => (
                    <th key={modelId} className="px-4 py-3 text-center font-semibold whitespace-nowrap">
                      {modelId}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {topCandidates.map((cand) => (
                  <tr key={cand.id}>
                    <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-zinc-100 dark:border-zinc-800">
                      {cand.name}
                    </td>
                    {allModelIds.map(modelId => {
                      const stats = candidateModelStats[cand.id]?.[modelId];
                      const score = stats ? (stats.total / stats.count).toFixed(1) : null;
                      return (
                        <td key={modelId} className="px-4 py-3 text-center">
                          {score ? (
                            <div className="flex flex-col items-center">
                              <span className={`font-bold ${parseFloat(score) > 8 ? 'text-green-600' : parseFloat(score) < 5 ? 'text-red-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {score}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-medium uppercase">{stats.count} trials</span>
                            </div>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-700">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right bg-blue-50/30 dark:bg-blue-900/10">
                      <span className="font-black text-blue-600">{cand.avgScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-zinc-400 italic">
            Note: Scores are normalized to 0-10. Higher is better. Cells show average score and trial count per model.
          </p>
        </div>
      )}
    </div>
  );
};

const Loader2: React.FC<{ className?: string, size?: number }> = ({ className, size = 16 }) => (
  <RefreshCw className={`${className} animate-spin`} size={size} />
);
