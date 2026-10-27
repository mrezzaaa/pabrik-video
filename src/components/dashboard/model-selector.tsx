"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Cpu, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OmniModel {
  id: string;
  ownedBy: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

const POPULAR_FILTERS = [
  "SEMUA",
  "AUTO",
  "GROK",
  "GEMINI",
  "CLAUDE",
  "DEEPSEEK",
] as const;

export function ModelSelector({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OmniModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("gc/grok-4.7");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("SEMUA");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Load models from API
  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Gagal mengambil model");
      const data = await res.json();
      setModels(Array.isArray(data.models) ? data.models : []);
      if (data.defaultModel) {
        setDefaultModel(data.defaultModel);
      }
    } catch (err) {
      console.warn("[ModelSelector] Gagal memuat model:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  // Sync internal query with selected value when dropdown is closed
  useEffect(() => {
    if (!open) {
      setQuery(value ? value : "");
      setActiveFilter("SEMUA");
    }
  }, [open, value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Filter models
  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Jika user sedang mengetik pencarian, prioritaskan query teks
    if (q) {
      return models.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.ownedBy.toLowerCase().includes(q),
      );
    }

    // Jika tidak mengetik, gunakan filter kategori
    if (activeFilter !== "SEMUA") {
      const tag = activeFilter.toLowerCase();
      return models.filter(
        (m) =>
          m.id.toLowerCase().includes(tag) ||
          m.ownedBy.toLowerCase().includes(tag),
      );
    }

    return models;
  }, [models, activeFilter, query]);

  const displayedModels = useMemo(
    () => filteredModels.slice(0, 100),
    [filteredModels],
  );

  const selectModel = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setQuery(modelId);
      setOpen(false);
    },
    [onChange],
  );

  const clearSelection = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onChange("");
      setQuery("");
      inputRef.current?.focus();
    },
    [onChange],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < displayedModels.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : displayedModels.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (displayedModels[highlightIndex]) {
        selectModel(displayedModels[highlightIndex].id);
      }
    }
  };

  return (
    <div className="relative w-full sm:w-72 lg:w-80" ref={containerRef}>
      {/* Autocomplete Input Container */}
      <div
        className={cn(
          "relative flex h-16 w-full items-center border border-zinc-700 bg-black/70 transition-all",
          "hover:border-primary/50",
          open && "border-primary ring-1 ring-primary/40",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
          Model &gt;
        </span>

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => {
            setOpen(true);
            if (models.length === 0 && !loading) {
              void loadModels();
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            if (activeFilter !== "SEMUA") setActiveFilter("SEMUA");
            setHighlightIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Default (${defaultModel})`}
          className="h-full w-full bg-transparent pl-[76px] pr-16 font-mono text-xs font-semibold text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={clearSelection}
              title="Reset ke Default"
              className="grid size-6 place-items-center text-zinc-500 hover:text-zinc-200"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="grid size-6 place-items-center text-zinc-400 hover:text-primary"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180 text-primary",
              )}
            />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 border border-zinc-700 bg-[#0b0b0e] shadow-[0_16px_40px_rgba(0,0,0,0.9)]">
          {/* Quick Filter Badges */}
          <div className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
            {POPULAR_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Keep input focus
                onClick={() => {
                  setActiveFilter(filter);
                  setQuery("");
                  setHighlightIndex(0);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
                  activeFilter === filter
                    ? "border border-primary/60 bg-primary/20 text-primary font-bold"
                    : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* List of Models */}
          <div
            ref={listRef}
            className="min-h-[140px] max-h-72 overflow-y-auto p-1.5 font-mono text-xs"
          >
            {/* Default Option */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectModel("")}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left transition-colors",
                !value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-zinc-300 hover:bg-zinc-800/60",
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span className="truncate">Default ({defaultModel})</span>
              </div>
              {!value && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
            </button>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-zinc-400">
                <RefreshCw className="size-4 animate-spin text-primary" />
                <span>Memuat daftar model dari OmniRoute...</span>
              </div>
            ) : models.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-400">
                <p className="text-zinc-300 font-medium">
                  Daftar model belum termuat.
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void loadModels()}
                  className="mt-3 inline-flex items-center gap-1.5 border border-primary/40 bg-primary/15 px-3 py-1.5 font-mono text-xs text-primary transition hover:bg-primary/25"
                >
                  <RefreshCw className="size-3" /> Muat Ulang Model
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-400">
                <p>
                  Tidak ada model yang cocok dengan kata kunci &quot;{query}&quot;.
                </p>
                {activeFilter !== "SEMUA" && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setActiveFilter("SEMUA");
                      setHighlightIndex(0);
                    }}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Cari di semua kategori ({activeFilter} &rarr; SEMUA)
                  </button>
                )}
              </div>
            ) : (
              displayedModels.map((model, idx) => {
                const isSelected = value === model.id;
                const isHighlighted = idx === highlightIndex;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectModel(model.id)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-primary/15 text-primary font-bold"
                        : isHighlighted
                          ? "bg-zinc-800/80 text-zinc-100"
                          : "text-zinc-300 hover:bg-zinc-800/60",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate">{model.id}</span>
                      {model.ownedBy && (
                        <span className="shrink-0 border border-zinc-800 bg-black/60 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-zinc-500">
                          {model.ownedBy}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Count */}
          <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
            <span>
              {models.length > 0
                ? `${filteredModels.length} dari ${models.length} model`
                : "0 model"}
            </span>
            {filteredModels.length > 100 && (
              <span className="text-zinc-500">menampilkan 100 teratas</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
