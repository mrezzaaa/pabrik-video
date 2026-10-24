"use client";

import React, { useEffect, useState } from "react";
import { SchematicPanel } from "@/components/schematic/SchematicPanel";
import { ModelRouter } from "@/components/schematic/ModelRouter";
import { PipelineSchematic } from "@/components/schematic/PipelineSchematic";
import { LiveTerminal } from "@/components/schematic/LiveTerminal";
import { RenderBay } from "@/components/schematic/RenderBay";
import { Activity, Disc, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load: Fetch the most recent job if exists
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = await res.json();
          if (data.jobs && data.jobs.length > 0 && !activeJobId) {
            setActiveJobId(data.jobs[0].id);
            setActiveJob(data.jobs[0]);
          }
        }
      } catch (e) {}
    };
    fetchLatest();
  }, [activeJobId]);

  // Poll active job status
  useEffect(() => {
    if (!activeJobId) return;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveJob(data.job);
        }
      } catch (err) {
        console.error("Failed to poll job:", err);
      }
    };

    fetchJob();
    const interval = setInterval(fetchJob, 1500);

    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleJobSubmit = async (
    topic: string,
    modelId: string,
    pexelsApiKey: string
  ) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, modelId, pexelsApiKey }),
      });

      if (!res.ok) {
        throw new Error("Job submission failed");
      }

      const data = await res.json();
      setActiveJobId(data.job.id);
      setActiveJob(data.job);
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 flex flex-col space-y-4 max-w-[1600px] mx-auto">
      {/* Top Engineering Schematic Header */}
      <header className="border border-[#38BDF8]/40 bg-[#0B1D36]/90 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-[#38BDF8] animate-ping rounded-full" />
            <h1 className="text-lg md:text-xl font-mono font-bold tracking-widest text-[#F0F9FF]">
              PABRIK-VIDEO // BLUEPRINT CONTROL BAY
            </h1>
          </div>
          <p className="text-xs text-[#38BDF8] font-mono mt-1">
            AUTONOMOUS SHORT-FORM VIDEO PLATFORM // 9:16 VERTICAL ENGINE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[#071324] border border-[#38BDF8]/30 flex items-center space-x-2">
            <span className="text-slate-400">NODE STATUS:</span>
            <span className="text-[#10B981] font-bold">ONLINE</span>
          </div>
          <div className="px-3 py-1.5 bg-[#071324] border border-[#38BDF8]/30 flex items-center space-x-2">
            <span className="text-slate-400">ACTIVE JOB:</span>
            <span className="text-[#38BDF8] font-bold">
              {activeJobId ? activeJobId.slice(0, 10) : "STANDBY"}
            </span>
          </div>
        </div>
      </header>

      {/* 4-Quadrant Schematic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Column (Quadrants 1 & 2) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Module 01: Input Parameters & Model Router */}
          <SchematicPanel
            tag="SYS-MOD-01"
            title="INPUT_PARAMETERS // MODEL ROUTER"
            spec="SPEC: OMNIROUTE 1.0"
          >
            <ModelRouter
              onSubmit={handleJobSubmit}
              isLoading={isSubmitting || activeJob?.status === "PENDING" || (activeJob && !["COMPLETED", "FAILED"].includes(activeJob.status))}
            />
          </SchematicPanel>

          {/* Module 02: Pipeline DAG Schematic */}
          <SchematicPanel
            tag="SYS-MOD-02"
            title="PIPELINE_DAG // STAGE RUNTIME"
            spec="DAG: 5 STAGES"
          >
            <PipelineSchematic
              currentStage={activeJob?.currentStage}
              progress={activeJob?.progress || 0}
              status={activeJob?.status || "STANDBY"}
            />
          </SchematicPanel>
        </div>

        {/* Middle Column (Quadrant 3: Live Terminal & JSON Inspector) */}
        <div className="lg:col-span-5 flex flex-col">
          <SchematicPanel
            tag="SYS-MOD-03"
            title="STD_OUT // TELEMETRY & STORYBOARD"
            spec="STREAM: DUPLEX"
            className="h-full"
          >
            <LiveTerminal
              logs={activeJob?.logs || []}
              storyboard={activeJob?.storyboard}
            />
          </SchematicPanel>
        </div>

        {/* Right Column (Quadrant 4: Optical Output Viewport) */}
        <div className="lg:col-span-3 flex flex-col">
          <SchematicPanel
            tag="SYS-MOD-04"
            title="RENDER_BAY // 9:16 VERTICAL"
            spec="RES: 1080x1920 @ 30FPS"
            className="h-full"
          >
            <RenderBay
              videoUrl={activeJob?.renderOutputUrl}
              status={activeJob?.status || "STANDBY"}
              topic={activeJob?.topic}
            />
          </SchematicPanel>
        </div>
      </div>
    </main>
  );
}
