import type { GroupCommand } from "../application/groups";
import type { GroupData } from "../lib/types";

export async function deleteGroup(
  groupId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher("/api/groups", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Nao foi possivel excluir o grupo.");
  }
}

export async function loadGroups(
  fetcher: typeof fetch = fetch,
): Promise<GroupData> {
  const response = await fetcher("/api/groups", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? "Falha ao carregar os grupos.");
  return body;
}

export async function saveGroup(
  command: GroupCommand,
  fetcher: typeof fetch = fetch,
): Promise<{ id: string }> {
  const response = await fetcher("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Nao foi possivel salvar.");
  return body;
}
