"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Mic, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceItem {
  voice_id: string;
  name: string;
  language: string | null;
}

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({
  value,
  onChange,
  disabled = false,
}: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [defaultVoice, setDefaultVoice] = useState("alloy");
  const [defaultVoiceName, setDefaultVoiceName] = useState("Alloy");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const loadVoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/voices");
      if (!res.ok) throw new Error("Gagal mengambil daftar suara");
      const data = await res.json();
      setVoices(Array.isArray(data.voices) ? data.voices : []);
      if (data.defaultVoice) setDefaultVoice(data.defaultVoice);
      if (data.defaultVoiceName) setDefaultVoiceName(data.defaultVoiceName);
    } catch (err) {
      console.warn("[VoiceSelector] Gagal memuat suara:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVoices();
  }, [loadVoices]);

  // Find voice object matching value
  const selectedVoiceObj = useMemo(() => {
    if (!value) return null;
    return (
      voices.find(
        (v) =>
          v.voice_id.toLowerCase() === value.toLowerCase() ||
          v.name.toLowerCase() === value.toLowerCase(),
      ) ?? null
    );
  }, [voices, value]);

  // Sync query when closed
  useEffect(() => {
    if (!open) {
      if (selectedVoiceObj) {
        setQuery(selectedVoiceObj.name);
      } else {
        setQuery(value ? value : "");
      }
    }
  }, [open, value, selectedVoiceObj]);

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

  // Filter voices
  const filteredVoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return voices;
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.voice_id.toLowerCase().includes(q) ||
        (v.language && v.language.toLowerCase().includes(q)),
    );
  }, [voices, query]);

  const selectVoice = useCallback(
    (voiceId: string, voiceName?: string) => {
      onChange(voiceId);
      setQuery(voiceName ?? voiceId);
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
        prev < filteredVoices.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredVoices.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredVoices[highlightIndex]) {
        selectVoice(
          filteredVoices[highlightIndex].voice_id,
          filteredVoices[highlightIndex].name,
        );
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Autocomplete Input */}
      <div
        className={cn(
          "relative flex h-16 w-full items-center border border-zinc-700 bg-black/70 transition-all",
          "hover:border-primary/50",
          open && "border-primary ring-1 ring-primary/40",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
          Suara &gt;
        </span>

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => {
            setOpen(true);
            if (voices.length === 0 && !loading) {
              void loadVoices();
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            setHighlightIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Default (${defaultVoiceName})`}
          className="h-full w-full bg-transparent pl-[76px] pr-16 font-mono text-xs font-semibold text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={clearSelection}
              title="Reset ke Suara Default"
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
          {/* List of Voices */}
          <div
            ref={listRef}
            className="min-h-[140px] max-h-72 overflow-y-auto p-1.5 font-mono text-xs"
          >
            {/* Default Option */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectModelDefault()}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left transition-colors",
                !value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-zinc-300 hover:bg-zinc-800/60",
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span className="truncate">Default ({defaultVoiceName})</span>
              </div>
              {!value && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
            </button>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-zinc-400">
                <RefreshCw className="size-4 animate-spin text-primary" />
                <span>Memuat daftar suara dari VoiceStudio...</span>
              </div>
            ) : voices.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-400">
                <p className="text-zinc-300 font-medium">
                  Daftar suara belum termuat.
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void loadVoices()}
                  className="mt-3 inline-flex items-center gap-1.5 border border-primary/40 bg-primary/15 px-3 py-1.5 font-mono text-xs text-primary transition hover:bg-primary/25"
                >
                  <RefreshCw className="size-3" /> Muat Ulang Suara
                </button>
              </div>
            ) : filteredVoices.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-400">
                <p>
                  Tidak ada suara yang cocok dengan &quot;{query}&quot;.
                </p>
              </div>
            ) : (
              filteredVoices.map((voiceItem, idx) => {
                const isSelected =
                  value.toLowerCase() === voiceItem.voice_id.toLowerCase();
                const isHighlighted = idx === highlightIndex;
                const isCustom =
                  voiceItem.language === "Auto" ||
                  voiceItem.voice_id.length === 8;

                return (
                  <button
                    key={voiceItem.voice_id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      selectVoice(voiceItem.voice_id, voiceItem.name)
                    }
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
                      <Mic className="size-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate font-semibold text-zinc-100">
                        {voiceItem.name}
                      </span>
                      <span className="shrink-0 border border-zinc-800 bg-black/60 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-zinc-500">
                        {isCustom ? "CLONED" : voiceItem.voice_id}
                      </span>
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
              {voices.length > 0
                ? `${filteredVoices.length} dari ${voices.length} suara`
                : "0 suara"}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  function selectModelDefault() {
    onChange("");
    setQuery("");
    setOpen(false);
  }
}
