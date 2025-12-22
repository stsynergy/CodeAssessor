import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Cpu, Award, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { Trial } from '@/types';

export const StatsDashboard: React.FC = () => {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrials();
  }, []);

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

  const fetchTrials = async () => {
    try {
      // Fetch all trials that are completed
      const response = await fetch("/api/trials");
      const data = await response.json();
      if (Array.isArray(data)) {
        setTrials(data.filter(t => t.status === 'completed' && t.result));
      }
    } catch (error) {
      console.error("Failed to fetch trials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregations
  const modelStats = trials.reduce((acc: any, curr) => {
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

  const modelAverages = Object.entries(modelStats).map(([modelId, stats]: [string, any]) => ({
    modelId,
    avgScore: (stats.totalScore / stats.count).toFixed(2),
    count: stats.count,
    providerId: stats.providerId
  })).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));

  const candidateStats = trials.reduce((acc: any, curr) => {
    Object.entries(curr.result?.scores || {}).forEach(([name, scoreStr]) => {
      const score = parseScore(scoreStr);
      // Normalize name to lowercase for aggregation (e.g. "Candidate A" vs "candidate a")
      const normalized = name.toLowerCase().trim();
      if (!acc[normalized]) {
        acc[normalized] = { totalScore: 0, count: 0, displayName: name };
      }
      acc[normalized].totalScore += score;
      acc[normalized].count += 1;
    });
    return acc;
  }, {});

  const topCandidates = Object.entries(candidateStats).map(([_, stats]: [string, any]) => ({
    name: stats.displayName,
    avgScore: (stats.totalScore / stats.count).toFixed(2),
    count: stats.count
  })).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benchmark Statistics</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Aggregate insights from {trials.length} approved trials across all projects.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
              <Zap size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Approved Trials</h3>
          </div>
          <p className="text-4xl font-black">{trials.length}</p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Mean Quality Score</h3>
          </div>
          <p className="text-4xl font-black">
            {(trials.reduce((acc, curr) => {
              const scores = Object.values(curr.result?.scores || {}).map(s => parseScore(s));
              return acc + (scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0);
            }, 0) / trials.length).toFixed(1)}
            <span className="text-xl text-zinc-400 font-normal">/10</span>
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
              <Cpu size={20} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Architectural Models</h3>
          </div>
          <p className="text-4xl font-black">{Object.keys(modelStats).length}</p>
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
              <div key={cand.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-400">{idx + 1}.</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {cand.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {cand.count} trials
                    </span>
                  </div>
                  <span className="font-black text-blue-600">{cand.avgScore}/10</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${parseFloat(cand.avgScore) * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Consistency */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <RefreshCw className="text-blue-500" size={20} />
            Model Grading Performance
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Model</th>
                  <th className="px-4 py-3 text-left font-semibold">Trials Graded</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {modelAverages.map((m) => (
                  <tr key={m.modelId}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.modelId}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{m.providerId}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{m.count}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-blue-600">{m.avgScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2: React.FC<{ className?: string, size?: number }> = ({ className, size = 16 }) => (
  <RefreshCw className={`${className} animate-spin`} size={size} />
);
