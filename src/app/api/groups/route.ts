import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createGroupUseCases } from "@/application/groups";
import { database } from "@/infrastructure/database";
import { SqlGroupRepository } from "@/infrastructure/sql-group-repository";
import {
  groupInput,
  deleteGroupInput,
  groupErrorResponse,
  isSameOrigin,
} from "@/presentation/groups-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Composition root: only this boundary selects the concrete repository and ID source.
const groups = createGroupUseCases(
  new SqlGroupRepository(database),
  randomUUID,
);

export async function GET() {
  try {
    return NextResponse.json(await groups.getGroupsSnapshot());
  } catch (error) {
    return groupErrorResponse(error, "load");
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisicao invalida." },
      { status: 403 },
    );
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }
  const parsed = deleteGroupInput.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Informe um grupo valido para exclusao." },
      { status: 400 },
    );
  try {
    await groups.deleteGroup(parsed.data.groupId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return groupErrorResponse(error, "delete");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisicao invalida." },
      { status: 403 },
    );
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }
  const parsed = groupInput.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Confira os campos, os participantes e os valores informados." },
      { status: 400 },
    );
  const input = parsed.data;
  try {
    const id =
      input.action === "group"
        ? await groups.createGroup(input)
        : input.action === "member"
          ? await groups.addGroupMember(input)
          : await groups.createExpense(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return groupErrorResponse(error, "save");
  }
}
