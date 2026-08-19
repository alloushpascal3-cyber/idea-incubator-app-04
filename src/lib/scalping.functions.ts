import { createServerFn } from "@tanstack/react-start";

import { analyzeSequence, classifyShots } from "./scalping.server";
import type { AnalyzeInput, ClassifyInput } from "./scalping.server";

export const classifyChartShots = createServerFn({ method: "POST" })
  .inputValidator((data: ClassifyInput) => data)
  .handler(async ({ data }) => classifyShots(data));

export const analyzeChartSequence = createServerFn({ method: "POST" })
  .inputValidator((data: AnalyzeInput) => data)
  .handler(async ({ data }) => analyzeSequence(data));