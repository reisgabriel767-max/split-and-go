import type { Group } from "../lib/types";

export default function DeleteGroupConfirmation({
  group,
  value,
  onChange,
}: {
  group: Pick<Group, "name">;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="delete-group-confirmation">
      <p id="delete-group-warning">
        O grupo <strong>{group.name}</strong> sera excluido permanentemente,
        junto com todos os participantes, despesas e rateios. Esta acao nao pode
        ser desfeita.
      </p>
      <label>
        Digite o nome do grupo para confirmar
        <input
          name="confirmation"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby="delete-group-warning"
          autoComplete="off"
          spellCheck={false}
          required
          maxLength={80}
        />
      </label>
    </div>
  );
}
