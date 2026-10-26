import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMediaTags } from "../api";
import { filterTagSuggestions } from "../lib/search-autocomplete";

interface TagAddInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  excludeTags?: readonly string[];
  disabled?: boolean;
  saving?: boolean;
  suggestionsListId: string;
}

export function TagAddInput({
  value,
  onChange,
  onAdd,
  excludeTags = [],
  disabled = false,
  saving = false,
  suggestionsListId,
}: TagAddInputProps) {
  const tagsQuery = useQuery({
    queryKey: ["mediaTags"],
    queryFn: listMediaTags,
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const existing = tagsQuery.data?.tags ?? [];
    const draft = value.trim().toLowerCase();
    if (!draft) return [];
    return filterTagSuggestions(existing, draft).filter(
      (tag) => !excludeTags.includes(tag),
    );
  }, [value, tagsQuery.data?.tags, excludeTags]);

  return (
    <>
      <input
        type="text"
        className="viewer-details__datetime-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder="Add tag (e.g. summer2025)"
        disabled={disabled}
        aria-label="New tag"
        list={suggestionsListId}
      />
      <datalist id={suggestionsListId}>
        {suggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={onAdd}
        disabled={disabled}
      >
        {saving ? "Saving…" : "Add"}
      </button>
    </>
  );
}
