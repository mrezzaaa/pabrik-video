import gsap from "gsap";
import * as THREE from "three";
import type { ExplainerShot, ObjectFlow, ObjectModel } from "../../lib/explainer/model";
import type { P3 } from "./iso";

/**
 * Deterministic GSAP + Three.js animation & spline engine for Remotion.
 * Uses paused GSAP timelines (`gsap.timeline({ paused: true })`) scrubbed
 * by exact frame time `t` so animations have authentic GSAP easing curves
 * (`power3.inOut`, `expo.out`, `back.out`) while remaining 100% deterministic
 * across parallel Remotion render workers.
 */

export interface InterpolatedShotState {
  cutaway: number;
  explode: number;
  zoom: number;
  yaw: number;
  calloutProgress: number;
  hudProgress: number;
  stepProgress: number;
  blueprintMix: number;
}

const DEFAULT_SHOT: ExplainerShot = {
  focus: [],
  cutaway: 0.65,
  explode: 0.15,
  zoom: 1.06,
  labels: "all",
  yaw: -15,
};

/**
 * Scrub a GSAP timeline between the previous scene's shot and the current scene's shot
 * so the 3D model never resets or jumps abruptly between scenes.
 */
export function evaluateGsapShot(input: {
  sceneTime: number;
  sceneDuration: number;
  shot: ExplainerShot;
  prevShot?: ExplainerShot;
  isBlueprint: boolean;
  wasBlueprint: boolean;
  isFirstScene: boolean;
}): InterpolatedShotState {
  const { sceneTime, sceneDuration, shot, prevShot, isBlueprint, wasBlueprint, isFirstScene } = input;
  const from: ExplainerShot = prevShot
    ? { ...DEFAULT_SHOT, ...prevShot }
    : {
        ...DEFAULT_SHOT,
        ...shot,
        cutaway: isFirstScene ? 0.15 : shot.cutaway,
        explode: isFirstScene ? 0 : shot.explode,
        zoom: isFirstScene ? 0.92 : shot.zoom,
        yaw: (shot.yaw ?? -15) - 18,
      };

  const state: InterpolatedShotState = {
    cutaway: from.cutaway,
    explode: from.explode,
    zoom: from.zoom,
    yaw: from.yaw,
    calloutProgress: 0,
    hudProgress: 0,
    stepProgress: 0,
    blueprintMix: wasBlueprint ? 1 : 0,
  };

  const transitionDur = Math.min(1.15, Math.max(0.55, sceneDuration * 0.32));
  const holdDur = Math.max(0.2, sceneDuration - transitionDur);

  const tl = gsap.timeline({ paused: true });

  // 1. Smooth 3D camera + cutaway + explode transition from previous shot
  tl.to(
    state,
    {
      cutaway: shot.cutaway,
      explode: shot.explode,
      zoom: shot.zoom,
      yaw: shot.yaw,
      blueprintMix: isBlueprint ? 1 : 0,
      duration: transitionDur,
      ease: "power3.inOut",
    },
    0,
  );

  // 2. Gentle continuous orbital drift during the hold phase so the 3D model stays alive
  tl.to(
    state,
    {
      yaw: shot.yaw + holdDur * 4.2,
      duration: holdDur,
      ease: "sine.inOut",
    },
    transitionDur,
  );

  // 3. Staggered reveal for callout labels, telemetry HUD, and process steps
  tl.to(
    state,
    {
      calloutProgress: 1,
      duration: 0.65,
      ease: "expo.out",
    },
    0.18,
  );

  tl.to(
    state,
    {
      hudProgress: 1,
      duration: 0.75,
      ease: "back.out(1.3)",
    },
    0.24,
  );

  tl.to(
    state,
    {
      stepProgress: 1,
      duration: 0.6,
      ease: "power2.out",
    },
    0.15,
  );

  tl.time(Math.max(0, Math.min(sceneDuration, sceneTime)));
  return state;
}

/**
 * Evaluate a single staggered item progress using GSAP easing.
 */
export function gsapStagger(sceneTime: number, index: number, baseDelay = 0.22, stagger = 0.1, duration = 0.55): number {
  const proxy = { v: 0 };
  const tl = gsap.timeline({ paused: true });
  tl.to(proxy, {
    v: 1,
    duration,
    ease: "power3.out",
  }, baseDelay + index * stagger);
  tl.time(Math.max(0, sceneTime));
  return proxy.v;
}

/**
 * Build a smooth 3D Catmull-Rom spline (`THREE.CatmullRomCurve3`) through the centers
 * of the parts in an ObjectFlow so particles travel along organic 3D trajectories.
 */
export function buildThreeFlowCurve(
  flow: ObjectFlow,
  centers: Record<string, P3>,
): THREE.CatmullRomCurve3 | null {
  const pts = flow.through
    .map((id) => centers[id])
    .filter((p): p is P3 => Boolean(p))
    .map((p) => new THREE.Vector3(p.x, p.y, p.z));

  if (pts.length < 2) return null;
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
}

/**
 * Sample N evenly-spaced 3D points along the Three.js spline curve.
 */
export function sampleCurvePoints(curve: THREE.CatmullRomCurve3, segments = 36): P3[] {
  return curve.getPoints(segments).map((v) => ({ x: v.x, y: v.y, z: v.z }));
}

/**
 * Sample a point and tangent along the Three.js spline at parameter u in [0, 1].
 */
export function sampleCurveAt(
  curve: THREE.CatmullRomCurve3,
  u: number,
): { point: P3; tangent: P3 } {
  const clamped = THREE.MathUtils.clamp(((u % 1) + 1) % 1, 0, 1);
  const p = curve.getPointAt(clamped);
  const t = curve.getTangentAt(clamped);
  return {
    point: { x: p.x, y: p.y, z: p.z },
    tangent: { x: t.x, y: t.y, z: t.z },
  };
}

/**
 * Compute smooth focus center interpolation using THREE.Vector3.lerp.
 */
export function interpolateFocusCenter(
  model: ObjectModel,
  centers: Record<string, P3>,
  shot: ExplainerShot,
  prevShot: ExplainerShot | undefined,
  sceneTime: number,
): P3 | undefined {
  const curId = shot.focus[0];
  const prevId = prevShot?.focus?.[0];
  const curCenter = curId ? centers[curId] : undefined;
  const prevCenter = prevId ? centers[prevId] : undefined;

  if (!curCenter && !prevCenter) return undefined;
  const fallback: P3 = { x: 0, y: 0, z: 30 };
  const fromVec = new THREE.Vector3(
    (prevCenter ?? fallback).x,
    (prevCenter ?? fallback).y,
    (prevCenter ?? fallback).z,
  );
  const toVec = new THREE.Vector3(
    (curCenter ?? fallback).x,
    (curCenter ?? fallback).y,
    (curCenter ?? fallback).z,
  );

  const proxy = { k: 0 };
  const tl = gsap.timeline({ paused: true });
  tl.to(proxy, { k: 1, duration: 0.85, ease: "power3.inOut" }, 0);
  tl.time(Math.max(0, sceneTime));

  fromVec.lerp(toVec, proxy.k);
  return { x: fromVec.x, y: fromVec.y, z: fromVec.z };
}

