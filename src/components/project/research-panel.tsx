import { ExternalLink, Flame, Lightbulb, Quote } from "lucide-react";
import type { ResearchData } from "@/lib/types";

export function ResearchPanel({ data }: { data: ResearchData | null }) {
  if (!data) {
    return (
      <div className="border border-dashed border-zinc-800 bg-black/20 p-6 text-center text-xs text-zinc-500">
        Riset belum selesai. Data akan muncul otomatis setelah agent pertama
        kelar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.viralPotential ? (
        <div className="border border-primary/25 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-1.5 text-primary">
            <Flame className="size-3.5" />
            <span className="label-mono">Viral Potential</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
            {data.viralPotential}
          </p>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label-mono text-muted-foreground">Fakta Kunci</span>
          <span className="font-mono text-[9px] text-zinc-600">
            {data.facts.length} item
          </span>
        </div>
        <div className="space-y-1.5">
          {data.facts.map((fact, index) => (
            <div
              key={`${fact}-${index}`}
              className="flex gap-2 border border-zinc-900 bg-black/30 px-2.5 py-2"
            >
              <span className="font-mono text-[9px] text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                {fact}
              </p>
            </div>
          ))}
        </div>
      </div>

      {data.uniqueAngles.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Lightbulb className="size-3 text-warning" />
            <span className="label-mono text-muted-foreground">
              Angle Unik
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.uniqueAngles.map((angle) => (
              <span
                key={angle}
                className="border border-warning/20 bg-warning/5 px-2 py-1 text-[10px] text-warning/90"
              >
                {angle}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {data.controversy ? (
        <div className="flex gap-2 border border-hot/20 bg-hot/[0.04] p-2.5">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-hot" />
          <div>
            <div className="label-mono text-hot/80">Kontroversi</div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">
              {data.controversy}
            </p>
          </div>
        </div>
      ) : null}

      {data.sources.length > 0 ? (
        <div>
          <div className="label-mono mb-2 text-muted-foreground">Sumber</div>
          <div className="space-y-1">
            {data.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 border border-zinc-900 bg-black/20 px-2 py-1.5 text-[10px] text-zinc-500 transition-colors hover:border-primary/25 hover:text-primary"
              >
                <ExternalLink className="size-2.5 shrink-0" />
                <span className="truncate">{source.title}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
