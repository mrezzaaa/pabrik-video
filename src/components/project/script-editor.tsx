"use client";

import { useState } from "react";
import { Check, Loader2, RefreshCw, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type RerunStage = "tts" | "visual-planning" | "render";

export function ScriptEditor({
  project,
  onProject,
}: {
  project: ProjectDTO;
  onProject: (project: ProjectDTO) => void;
}) {
  const [hook, setHook] = useState(
    project.hook ?? project.fullScript?.hook ?? "",
  );
  const [script, setScript] = useState(
    project.fullScript?.script ??
      project.fullScript?.sentences.map((sentence) => sentence.text).join(" ") ??
      "",
  );
  const [saving, setSaving] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rerunFrom, setRerunFrom] = useState<RerunStage>("tts");

  const words = script.split(/\s+/).filter(Boolean).length;
  const dirty =
    hook !== (project.hook ?? project.fullScript?.hook ?? "") ||
    script !==
      (project.fullScript?.script ??
        project.fullScript?.sentences.map((sentence) => sentence.text).join(" ") ??
        "");

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook, script }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan.");
      if (data.project) onProject(data.project as ProjectDTO);
      setMessage(
        data.requiresRerun
          ? "Naskah tersimpan. Render ulang dari TTS untuk apply ke video."
          : "Naskah tersimpan.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Gagal menyimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function rerun() {
    setRerunning(true);
    setError(null);
    setMessage(null);
    try {
      if (dirty) {
        const saveResponse = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hook, script }),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) {
          throw new Error(saveData.error ?? "Gagal menyimpan naskah.");
        }
        if (saveData.project) onProject(saveData.project as ProjectDTO);
      }

      const response = await fetch(`/api/projects/${project.id}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: rerunFrom }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal rerun.");
      if (data.project) onProject(data.project as ProjectDTO);
      setMessage(`Antrean ${rerunFrom} dikirim ke worker.`);
    } catch (rerunError) {
      setError(
        rerunError instanceof Error ? rerunError.message : "Gagal rerun.",
      );
    } finally {
      setRerunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label-mono text-muted-foreground">
            Hook / Judul
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
            {hook.split(/\s+/).filter(Boolean).length}/12 kata
          </span>
        </div>
        <Textarea
          value={hook}
          onChange={(event) => setHook(event.target.value)}
          rows={2}
          className="min-h-0 resize-none border-zinc-800 text-sm font-semibold"
          placeholder="Hook viral max 12 kata..."
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label-mono text-muted-foreground">
            Naskah Narasi (TTS)
          </span>
          <span
            className={cn(
              "font-mono text-[9px] uppercase tracking-[0.1em]",
              words >= 80 && words <= 120 ? "text-primary" : "text-warning",
            )}
          >
            {words} kata // target 80-120
          </span>
        </div>
        <Textarea
          value={script}
          onChange={(event) => setScript(event.target.value)}
          rows={9}
          className="resize-y border-zinc-800 text-[13px] leading-relaxed"
          placeholder="Naskah lengkap untuk voice over..."
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void save()}
          disabled={saving || !dirty}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Simpan
        </Button>

        <div className="flex items-stretch">
          <select
            value={rerunFrom}
            onChange={(event) => setRerunFrom(event.target.value as RerunStage)}
            className="h-8 border border-r-0 border-border bg-black/50 px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-400 outline-none focus:border-primary/50"
            aria-label="Rerun dari stage"
          >
            <option value="tts">Dari TTS</option>
            <option value="visual-planning">Dari Visual</option>
            <option value="render">Dari Render</option>
          </select>
          <Button
            size="sm"
            onClick={() => void rerun()}
            disabled={rerunning}
            className="rounded-l-none"
          >
            {rerunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Render Ulang
          </Button>
        </div>

        {dirty ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-warning">
            ● Belum disimpan
          </span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
            <Check className="size-3" /> Tersimpan
          </span>
        )}
      </div>

      {message ? (
        <div className="flex items-start gap-2 border border-primary/30 bg-primary/5 px-2.5 py-2 text-[11px] text-primary">
          <Wand2 className="mt-0.5 size-3.5 shrink-0" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
          {error}
        </div>
      ) : null}

      {project.fullScript?.sentences?.length ? (
        <div className="space-y-1.5 border-t border-border pt-3">
          <div className="label-mono text-muted-foreground">
            Breakdown Kalimat
          </div>
          {project.fullScript.sentences.map((sentence, index) => (
            <div
              key={sentence.id}
              className="flex gap-2 border border-zinc-900 bg-black/30 px-2 py-1.5"
            >
              <span className="mt-0.5 font-mono text-[9px] text-zinc-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  {sentence.text}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-zinc-600">
                    {sentence.emotion}
                  </span>
                  {sentence.emphasisWords.map((word) => (
                    <span
                      key={word}
                      className="border border-warning/25 bg-warning/5 px-1 font-mono text-[8px] uppercase tracking-[0.08em] text-warning"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
