import { useMemo, type ComponentPropsWithoutRef } from "react";

interface PersonOption {
  id: number;
  name: string;
}

type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "children">;

interface PersonSelectProps extends SelectProps {
  people: PersonOption[];
  excludeIds?: number[];
  placeholder?: string;
  extraOptions?: Array<{ value: string; label: string }>;
}

export function PersonSelect({
  people,
  excludeIds,
  placeholder,
  extraOptions,
  ...selectProps
}: PersonSelectProps) {
  const sorted = useMemo(() => {
    const exclude = new Set(excludeIds);
    return [...people]
      .filter((p) => !exclude.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [people, excludeIds]);

  return (
    <select {...selectProps}>
      {placeholder && <option value="">{placeholder}</option>}
      {sorted.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
      {extraOptions?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
