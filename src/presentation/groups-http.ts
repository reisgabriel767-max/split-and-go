import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApplicationError } from "../application/errors";
import { SplitError } from "../lib/money";
import { CurrencyError } from "../lib/fx";
import { MAX_GROUP_MEMBERS } from "../lib/limits";

const name = z.string().trim().min(1).max(60);
const createGroup = z
  .object({
    action: z.literal("group"),
    name: z.string().trim().min(1).max(80),
    currency: z.enum(["BRL", "USD", "EUR"]),
    category: z.enum(["trip", "home", "event"]),
    members: z.array(name).min(1).max(MAX_GROUP_MEMBERS),
  })
  .refine(
    (data) =>
      new Set(data.members.map((n) => n.toLowerCase())).size ===
      data.members.length,
    "Os nomes dos participantes devem ser diferentes.",
  );
const createMember = z.object({
  action: z.literal("member"),
  groupId: z.uuid(),
  name,
});
const allocation = z.object({
  memberId: z.uuid(),
  value: z.number().int().nonnegative().max(999999999),
});
const splitSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("equal") }),
  z.object({
    mode: z.literal("percentage"),
    allocations: z
      .array(allocation.extend({ value: z.number().int().min(0).max(10000) }))
      .min(1)
      .max(30),
  }),
  z.object({
    mode: z.literal("fixed"),
    allocations: z.array(allocation).min(1).max(30),
  }),
]);
const createExpense = z
  .object({
    action: z.literal("expense"),
    groupId: z.uuid(),
    payerId: z.uuid(),
    description: z.string().trim().min(1).max(120),
    amount: z.number().int().positive().max(999999999),
    spentOn: z.iso.date(),
    memberIds: z.array(z.uuid()).min(1).max(30),
    split: splitSchema.default({ mode: "equal" }),
    currency: z.enum(["BRL", "USD", "EUR"]).optional(),
    exchangeRate: z.string().trim().max(20).optional(),
  })
  .refine(
    (data) => new Set(data.memberIds).size === data.memberIds.length,
    "Participantes repetidos.",
  );
export const groupInput = z.union([createGroup, createMember, createExpense]);

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? request.nextUrl.host;
  try {
    return !origin || new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function groupErrorResponse(error: unknown, operation: "load" | "save") {
  if (operation === "save") {
    if (error instanceof SplitError || error instanceof CurrencyError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ApplicationError) {
      if (error.code === "DUPLICATE_MEMBER")
        return NextResponse.json(
          { error: "Ja existe um participante com esse nome no grupo." },
          { status: 409 },
        );
      const message =
        error.code === "MEMBER_LIMIT"
          ? `O grupo atingiu o limite de ${MAX_GROUP_MEMBERS} participantes.`
          : error.code === "INVALID_INPUT"
            ? "Confira os campos, os participantes e os valores informados."
            : "Grupo ou participantes invalidos. Atualize a pagina.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  console.error(
    operation === "load" ? "Loading groups failed" : "Saving group data failed",
    error,
  );
  return NextResponse.json(
    {
      error:
        operation === "load"
          ? "Nao foi possivel carregar os grupos. Tente novamente."
          : "Nao foi possivel salvar. Tente novamente.",
    },
    { status: 503 },
  );
}
