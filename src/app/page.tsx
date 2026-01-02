"use client";

import { useState, useEffect } from "react";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { SingleRun } from "@/components/SingleRun";
import { BatchRunner } from "@/components/BatchRunner";
import { StatsDashboard } from "@/components/StatsDashboard";
import { CandidateRegistry } from "@/components/CandidateRegistry";
import { Subject } from "@/types";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>("batch"); // Default to Benchmark Suite
  const [recentSubjects, setRecentSubjects] = useState<Subject[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchRecentSubjects();
  }, []);

  const fetchRecentSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      if (Array.isArray(data)) {
        setRecentSubjects(data.slice(0, 15));
      }
    } catch (error) {
      console.error("Failed to fetch recent subjects:", error);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-zinc-950" />;
  }

  const renderView = () => {
    switch (currentView) {
      case "single":
        return <SingleRun onSave={() => fetchRecentSubjects()} />;
      case "batch":
        return <BatchRunner />;
      case "stats":
        return <StatsDashboard />;
      case "candidates":
        return <CandidateRegistry />;
      default:
        return <BatchRunner />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        historyItems={recentSubjects}
      />
      <main className={`flex-1 overflow-y-auto p-8 mx-auto w-full ${currentView === 'single' ? 'max-w-5xl' : 'max-w-[1600px]'}`}>
        {renderView()}
      </main>
    </div>
  );
}
