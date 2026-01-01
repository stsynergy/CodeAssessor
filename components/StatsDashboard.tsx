import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, TrendingUp, Cpu, Award, Zap, AlertTriangle, RefreshCw, User, Filter, Calendar, Code, Download } from 'lucide-react';
import { Trial, Candidate, Batch, Subject } from '@/types';

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  python: '#3776AB',
  java: '#ED8B00',
  c: '#00599C',
  cpp: '#00599C',
  csharp: '#512BD4',
  php: '#777BB4',
  rust: '#DEA584',
};

const LANGUAGE_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  rust: 'Rust',
};

export const StatsDashboard: React.FC = () => {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedModelId, setSelectedModelId] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

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

  // Helper to calculate Normalized Borda Count points
  // Formula: (n - Rank) / (n - 1)
  // Rank 1 of 5 -> (5 - 1) / (5 - 1) = 1.0
  // Rank 5 of 5 -> (5 - 5) / (5 - 1) = 0.0
  const calculateBordaPoints = (rankStr: string | number, totalCandidates: number): number => {
    const rank = typeof rankStr === 'number' ? rankStr : parseInt(String(rankStr));
    if (isNaN(rank) || totalCandidates <= 1) return 1.0; // Default to top if singular or error
    return (totalCandidates - rank) / (totalCandidates - 1);
  };

  // Filtered Trials
  const filteredTrials = useMemo(() => {
    return trials.filter(t => {
      const matchesBatch = selectedBatchId === "all" || t.batchId === selectedBatchId;
      const matchesModel = selectedModelId === "all" || t.result?.modelId === selectedModelId;
      const matchesSubject = selectedSubjectId === "all" || t.subjectId === selectedSubjectId;
      
      let matchesLanguage = true;
      if (selectedLanguage !== "all") {
        const subject = subjects.find(s => s._id === t.subjectId);
        matchesLanguage = subject?.language === selectedLanguage;
      }
      
      return matchesBatch && matchesLanguage && matchesModel && matchesSubject;
    });
  }, [trials, selectedBatchId, selectedLanguage, selectedModelId, selectedSubjectId, subjects]);

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
        acc[modelId] = { totalBorda: 0, count: 0, providerId: curr.result?.providerId };
      }
      
      const trialScores = curr.result?.scores || {};
      const n = Object.keys(trialScores).length;
      const points = Object.values(trialScores).map(rank => calculateBordaPoints(rank, n));
      
      if (points.length > 0) {
        const avg = points.reduce((a: number, b: number) => a + b, 0) / points.length;
        acc[modelId].totalBorda += avg;
        acc[modelId].count += 1;
      }
      return acc;
    }, {});
  }, [filteredTrials]);

  const modelAverages = useMemo(() => {
    return Object.entries(modelStats).map(([modelId, stats]: [string, any]) => ({
      modelId,
      avgScore: (stats.totalBorda / stats.count * 10).toFixed(2), // Scaled to 10 for UI
      count: stats.count,
      providerId: stats.providerId
    })).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
  }, [modelStats]);

  const candidateStats = useMemo(() => {
    return filteredTrials.reduce((acc: any, curr) => {
      const trialScores = curr.result?.scores || {};
      const n = Object.keys(trialScores).length;

      Object.entries(trialScores).forEach(([cid, rank]) => {
        const points = calculateBordaPoints(rank, n) * 10; // Scale to 10 for UI
        const candidate = candidates.find(c => c._id === cid);
        const displayName = candidate?.name || cid;
        
        if (!acc[cid]) {
          acc[cid] = { 
            pointsList: [], 
            totalPoints: 0, 
            count: 0, 
            displayName: displayName,
            min: 10,
            max: 0
          };
        }
        acc[cid].pointsList.push(points);
        acc[cid].totalPoints += points;
        acc[cid].count += 1;
        acc[cid].min = Math.min(acc[cid].min, points);
        acc[cid].max = Math.max(acc[cid].max, points);
      });
      return acc;
    }, {});
  }, [filteredTrials, candidates]);

  const topCandidates = useMemo(() => {
    return Object.entries(candidateStats).map(([cid, stats]: [string, any]) => {
      const avg = stats.totalPoints / stats.count;
      // Calculate Standard Deviation
      const squareDiffs = stats.pointsList.map((s: number) => Math.pow(s - avg, 2));
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
        consistency: (10 - (stdDev * 2)).toFixed(2) // Heuristic for consistency
      };
    }).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
  }, [candidateStats]);

  const subjectStats = useMemo(() => {
    return filteredTrials.reduce((acc: any, curr) => {
      const subject = subjects.find(s => s._id === curr.subjectId);
      const name = subject?.thingName || 'Unknown Subject';
      const language = subject?.language || 'unknown';
      
      if (!acc[curr.subjectId]) {
        acc[curr.subjectId] = { totalPoints: 0, count: 0, name: name, language: language };
      }
      
      const trialScores = curr.result?.scores || {};
      const n = Object.keys(trialScores).length;
      const points = Object.values(trialScores).map(rank => calculateBordaPoints(rank, n) * 10);
      
      if (points.length > 0) {
        const avg = points.reduce((a: number, b: number) => a + b, 0) / points.length;
        acc[curr.subjectId].totalPoints += avg;
        acc[curr.subjectId].count += 1;
      }
      return acc;
    }, {});
  }, [filteredTrials, subjects]);

  const subjectAverages = useMemo(() => {
    return Object.entries(subjectStats).map(([sid, stats]: [string, any]) => ({
      id: sid,
      name: stats.name,
      language: stats.language,
      avgScore: (stats.totalPoints / stats.count).toFixed(2),
      count: stats.count
    })).sort((a, b) => {
      // First group by language
      if (a.language < b.language) return -1;
      if (a.language > b.language) return 1;
      // Then sort by hardest first (lowest avg points)
      return parseFloat(a.avgScore) - parseFloat(b.avgScore);
    });
  }, [subjectStats]);

  const taskCandidateStats = useMemo(() => {
    const matrix: any = {};
    filteredTrials.forEach(t => {
      const sid = t.subjectId;
      const trialScores = t.result?.scores || {};
      const n = Object.keys(trialScores).length;

      Object.entries(trialScores).forEach(([cid, rank]) => {
        const points = calculateBordaPoints(rank, n) * 10;
        if (!matrix[sid]) matrix[sid] = {};
        if (!matrix[sid][cid]) matrix[sid][cid] = { total: 0, count: 0 };
        matrix[sid][cid].total += points;
        matrix[sid][cid].count += 1;
      });
    });
    return matrix;
  }, [filteredTrials]);

  const candidateModelStats = useMemo(() => {
    const stats: any = {};
    filteredTrials.forEach(t => {
      const modelId = t.result?.modelId || 'unknown';
      const trialScores = t.result?.scores || {};
      const n = Object.keys(trialScores).length;

      Object.entries(trialScores).forEach(([cid, rank]) => {
        const points = calculateBordaPoints(rank, n) * 10;
        if (!stats[cid]) stats[cid] = {};
        if (!stats[cid][modelId]) stats[cid][modelId] = { total: 0, count: 0 };
        stats[cid][modelId].total += points;
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

  const handleExportCSV = () => {
    const langSet = new Set<string>();
    const candSet = new Set<string>();
    const matrix: Record<string, Record<string, { total: number, count: number }>> = {};

    filteredTrials.forEach(t => {
      const subject = subjects.find(s => s._id === t.subjectId);
      const lang = subject?.language || 'unknown';
      langSet.add(lang);

      const trialScores = t.result?.scores || {};
      const n = Object.keys(trialScores).length;

      Object.entries(trialScores).forEach(([cid, rank]) => {
        candSet.add(cid);
        const points = calculateBordaPoints(rank, n) * 10;
        
        if (!matrix[lang]) matrix[lang] = {};
        if (!matrix[lang][cid]) matrix[lang][cid] = { total: 0, count: 0 };
        
        matrix[lang][cid].total += points;
        matrix[lang][cid].count += 1;
      });
    });

    const sortedLangs = Array.from(langSet).sort();
    const sortedCandIds = Array.from(candSet).sort((a, b) => {
      const candA = candidates.find(c => c._id === a);
      const candB = candidates.find(c => c._id === b);
      return (candA?.name || '').localeCompare(candB?.name || '');
    });

    const header = ['Language', ...sortedCandIds.map(cid => {
      const cand = candidates.find(c => c._id === cid);
      return cand?.description || cand?.name || cid;
    })].join(';');

    const rows = sortedLangs.map(lang => {
      const row = [LANGUAGE_NAMES[lang.toLowerCase()] || lang];
      sortedCandIds.forEach(cid => {
        const stats = matrix[lang]?.[cid];
        if (stats) {
          row.push((stats.total / stats.count).toFixed(1));
        } else {
          row.push('');
        }
      });
      return row.join(';');
    });

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `benchmark_stats_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <Filter size={14} className="text-zinc-400" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none max-w-[150px] truncate"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="all">All Tasks</option>
              {subjects.filter(s => selectedBatchId === 'all' || s.batchId === selectedBatchId).map(s => (
                <option key={s._id} value={s._id}>{s.thingName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-zinc-400" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none"
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setSelectedSubjectId("all"); // Reset subject when batch changes
              }}
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Cpu size={14} className="text-zinc-400" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
            >
              <option value="all">All Judges</option>
              {allModelIds.map(modelId => (
                <option key={modelId} value={modelId}>{modelId}</option>
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

          {(selectedBatchId !== "all" || selectedLanguage !== "all" || selectedModelId !== "all" || selectedSubjectId !== "all") && (
            <button 
              onClick={() => { 
                setSelectedBatchId("all"); 
                setSelectedLanguage("all"); 
                setSelectedModelId("all"); 
                setSelectedSubjectId("all");
              }}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Clear Filters
            </button>
          )}

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
              <Cpu size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Scoring models</h3>
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

      {/* Candidate Performance by Task Matrix */}
      {topCandidates.length > 0 && subjectAverages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Filter className="text-blue-500" size={20} />
            Task-Candidate Performance Matrix
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-sm">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-10 w-48">Task Subject</th>
                  <th className="px-2 py-3 text-left font-semibold w-24 text-[10px] uppercase tracking-tighter text-zinc-400">Lang</th>
                  {topCandidates.map(cand => (
                    <th key={cand.id} className="px-4 py-3 text-center font-semibold truncate">
                      {cand.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {subjectAverages.map((subject) => (
                  <tr key={subject.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-3 py-3 font-medium text-zinc-700 dark:text-zinc-300 sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-zinc-100 dark:border-zinc-800 w-48">
                      <div className="flex flex-col">
                        <span className="truncate w-full" title={subject.name}>{subject.name}</span>
                        <span className="text-[10px] text-zinc-400 font-normal uppercase">{subject.count} trials</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 w-24 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20">
                      <div 
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ 
                          backgroundColor: `${LANGUAGE_COLORS[subject.language.toLowerCase()] || '#ccc'}20`, 
                          color: LANGUAGE_COLORS[subject.language.toLowerCase()] || '#666',
                          border: `1px solid ${LANGUAGE_COLORS[subject.language.toLowerCase()] || '#ccc'}40`
                        }}
                      >
                        {LANGUAGE_NAMES[subject.language.toLowerCase()] || subject.language}
                      </div>
                    </td>
                    {topCandidates.map(cand => {
                      const stats = taskCandidateStats[subject.id]?.[cand.id];
                      const score = stats ? (stats.total / stats.count).toFixed(1) : null;
                      return (
                        <td key={cand.id} className="px-4 py-3 text-center">
                          {score ? (
                            <span className={`font-bold ${parseFloat(score) > 8 ? 'text-green-600' : parseFloat(score) < 5 ? 'text-red-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {score}
                            </span>
                          ) : (
                            <span className="text-zinc-200 dark:text-zinc-800">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Borda Score (0-10)</div>
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
        {/* Right side left empty to preserve layout */}
        <div className="hidden lg:block" />
      </div>

      {/* Candidate Performance by Model Breakdown */}
      {topCandidates.length > 0 && allModelIds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="text-purple-500" size={20} />
            Candidate Performance by Judge
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-10">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                      Candidate ↓ / Judge →
                    </div>
                  </th>
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
        </div>
      )}

      {/* Trial History Log */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <HistoryIcon className="text-zinc-500" size={20} />
          Detailed Trial History
        </h3>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Task</th>
                <th className="px-4 py-3 text-left font-semibold">Judge</th>
                {topCandidates.map(cand => (
                  <th key={cand.id} className="px-4 py-3 text-center font-semibold">
                    {cand.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredTrials.slice(0, 20).map((t) => (
                <tr key={t._id}>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium truncate max-w-[150px]">
                    {subjects.find(s => s._id === t.subjectId)?.thingName || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 truncate max-w-[100px]">
                    {t.result?.modelId}
                  </td>
                  {topCandidates.map(cand => {
                    const rank = t.result?.scores[cand.id];
                    return (
                      <td key={cand.id} className="px-4 py-3 text-center">
                        {rank ? (
                          <span className={`font-bold ${parseInt(String(rank)) === 1 ? 'text-green-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            #{rank}
                          </span>
                        ) : (
                          <span className="text-zinc-200 dark:text-zinc-800">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const HistoryIcon: React.FC<{ size?: number, className?: string }> = ({ size = 16, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const Loader2: React.FC<{ className?: string, size?: number }> = ({ className, size = 16 }) => (
  <RefreshCw className={`${className} animate-spin`} size={size} />
);
