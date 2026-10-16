import type { SplitMode, SplitSpec } from "../lib/types";
import { parseMoney, parsePercentage } from "../lib/money";

export function readSplitSpec(
  mode: SplitMode,
  participants: string[],
  values: Record<string, string>,
): SplitSpec {
  if (mode === "equal") return { mode };
  return {
    mode,
    allocations: participants.map((memberId) => ({
      memberId,
      value:
        mode === "percentage"
          ? parsePercentage(values[memberId] ?? "")
          : parseMoney(values[memberId] ?? "", true),
    })),
  };
}
