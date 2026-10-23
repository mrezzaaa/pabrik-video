import React from "react";
import ts from "typescript";
import { parseVisual, type ParsedVisual } from "./validators";

export interface SvgSceneProps extends Partial<ParsedVisual> {
  progress?: number;
}

export type SvgSceneComponent = React.ComponentType<SvgSceneProps>;

const compiledCache = new Map<string, SvgSceneComponent | null>();

/**
 * Mengompilasi string TSX `export default function SvgScene({ progress = 0 })`
 * menjadi komponen React yang dapat dirender langsung di Remotion pada setiap frame.
 */
export function compileSvgScene(tsxCode: string): SvgSceneComponent | null {
  if (!tsxCode || !tsxCode.includes("SvgScene")) {
    return null;
  }

  const cached = compiledCache.get(tsxCode);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const sanitizedSource = tsxCode.replace(/\\\*/g, "*");

    const transpiled = ts.transpileModule(sanitizedSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        removeComments: false,
      },
    });

    const exportsObj: { default?: SvgSceneComponent } = {};
    const moduleObj = { exports: exportsObj };
    const requireFn = (mod: string) => {
      if (mod === "react") return React;
      throw new Error(`Module '${mod}' tidak diizinkan di dalam SvgScene`);
    };

    const factory = new Function("React", "exports", "module", "require", transpiled.outputText);
    factory(React, exportsObj, moduleObj, requireFn);

    const Comp = moduleObj.exports.default ?? exportsObj.default ?? null;
    compiledCache.set(tsxCode, Comp);
    return Comp;
  } catch (err) {
    console.warn("[svgRuntime] Gagal mengompilasi SvgScene:", err);
    compiledCache.set(tsxCode, null);
    return null;
  }
}

export function renderDynamicSvgOrMarkup(opts: {
  svgCode?: string;
  visual?: string;
  progress: number;
}): React.ReactNode {
  const { svgCode, visual, progress } = opts;
  if (!svgCode) return null;

  const parsed = visual ? parseVisual(visual) : null;
  const Comp = compileSvgScene(svgCode);

  if (Comp) {
    return <Comp progress={progress} {...(parsed ?? {})} />;
  }

  if (svgCode.trim().startsWith("<svg")) {
    return (
      <div
        style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        dangerouslySetInnerHTML={{ __html: svgCode }}
      />
    );
  }

  return null;
}
