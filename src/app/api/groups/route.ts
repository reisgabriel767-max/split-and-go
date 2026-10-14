import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/lib/db";
import { splitEqually } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const name = z.string().trim().min(1).max(60);
const createGroup = z
  .object({
    action: z.literal("group"),
    name: z.string().trim().min(1).max(80),
    currency: z.enum(["BRL", "USD", "EUR"]),
    category: z.enum(["trip", "home", "event"]),
    members: z.array(name).min(1).max(30),
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
const createExpense = z
  .object({
    action: z.literal("expense"),
    groupId: z.uuid(),
    payerId: z.uuid(),
    description: z.string().trim().min(1).max(120),
    amount: z.number().int().positive().max(999999999),
    spentOn: z.iso.date(),
    memberIds: z.array(z.uuid()).min(1).max(30),
  })
  .refine(
    (data) => new Set(data.memberIds).size === data.memberIds.length,
    "Participantes repetidos.",
  );
const input = z.union([createGroup, createMember, createExpense]);

export async function GET() {
  try {
    const db = await database();
    const data = await db.transaction(async (tx) => ({
      groups: await tx.query("SELECT * FROM groups ORDER BY created_at, id"),
      members: await tx.query(
        "SELECT id, group_id, name FROM members ORDER BY created_at, id",
      ),
      expenses: await tx.query(
        "SELECT id, group_id, payer_id, description, amount, to_char(spent_on, 'YYYY-MM-DD') AS spent_on FROM expenses ORDER BY spent_on DESC, created_at DESC, id",
      ),
      shares: await tx.query(
        "SELECT expense_id, member_id, amount FROM expense_shares",
      ),
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Loading groups failed", error);
    return NextResponse.json(
      { error: "Nao foi possivel carregar os grupos. Tente novamente." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  // This initial local MVP has no accounts. Reject cross-origin browser mutations.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? request.nextUrl.host;
  let sameOrigin = !origin;
  try {
    sameOrigin = !origin || new URL(origin).host === host;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return NextResponse.json(
      { error: "Origem da requisicao invalida." },
      { status: 403 },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }
  const parsed = input.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Confira os campos, os participantes e os valores informados." },
      { status: 400 },
    );
  const value = parsed.data;
  try {
    const db = await database();
    const id = await db.transaction(async (tx) => {
      const id = randomUUID();
      if (value.action === "group") {
        await tx.query(
          "INSERT INTO groups (id, name, currency, category) VALUES ($1,$2,$3,$4)",
          [id, value.name, value.currency, value.category],
        );
        for (const member of value.members)
          await tx.query(
            "INSERT INTO members (id, group_id, name) VALUES ($1,$2,$3)",
            [randomUUID(), id, member],
          );
      } else {
        const group = await tx.query(
          "SELECT id FROM groups WHERE id=$1 FOR UPDATE",
          [value.groupId],
        );
        if (!group.length) throw new Error("GROUP_NOT_FOUND");
        if (value.action === "member") {
          const count = await tx.query<{ count: string }>(
            "SELECT count(*) FROM members WHERE group_id=$1",
            [value.groupId],
          );
          if (Number(count[0].count) >= 30) throw new Error("MEMBER_LIMIT");
          await tx.query(
            "INSERT INTO members (id, group_id, name) VALUES ($1,$2,$3)",
            [id, value.groupId, value.name],
          );
        } else {
          const members = await tx.query<{ id: string }>(
            "SELECT id FROM members WHERE group_id=$1",
            [value.groupId],
          );
          const ids = new Set(members.map((m) => m.id));
          if (
            !ids.has(value.payerId) ||
            value.memberIds.some((member) => !ids.has(member))
          )
            throw new Error("INVALID_MEMBERS");
          await tx.query(
            "INSERT INTO expenses (id,group_id,payer_id,description,amount,spent_on) VALUES ($1,$2,$3,$4,$5,$6)",
            [
              id,
              value.groupId,
              value.payerId,
              value.description,
              value.amount,
              value.spentOn,
            ],
          );
          for (const share of splitEqually(value.amount, value.memberIds)) {
            await tx.query(
              "INSERT INTO expense_shares (expense_id,group_id,member_id,amount) VALUES ($1,$2,$3,$4)",
              [id, value.groupId, share.memberId, share.amount],
            );
          }
        }
      }
      return id;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = (error as Error).message;
    if (code === "23505")
      return NextResponse.json(
        { error: "Ja existe um participante com esse nome no grupo." },
        { status: 409 },
      );
    if (
      ["GROUP_NOT_FOUND", "INVALID_MEMBERS", "MEMBER_LIMIT"].includes(message)
    ) {
      return NextResponse.json(
        {
          error:
            message === "MEMBER_LIMIT"
              ? "O grupo atingiu o limite de 30 participantes."
              : "Grupo ou participantes invalidos. Atualize a pagina.",
        },
        { status: 400 },
      );
    }
    console.error("Saving group data failed", error);
    return NextResponse.json(
      { error: "Nao foi possivel salvar. Tente novamente." },
      { status: 503 },
    );
  }
}
