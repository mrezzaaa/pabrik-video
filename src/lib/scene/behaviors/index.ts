import { useRotateBehavior } from "./rotate.behavior";
import { useExplodeBehavior } from "./explode.behavior";
import { BehaviorType } from "../types";

export * from "./rotate.behavior";
export * from "./explode.behavior";

export const behaviors: Record<
  BehaviorType,
  (options: any) => { transform: string; [key: string]: any }
> = {
  rotate: useRotateBehavior,
  explode: useExplodeBehavior,
  static: () => ({ transform: "none" }),
};
