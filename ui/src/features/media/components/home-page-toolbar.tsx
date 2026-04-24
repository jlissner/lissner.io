import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listPeople } from "@/features/people/api";
import type { PersonSummary } from "@shared";
import { listMediaTags } from "../api";
import {
  filterPeopleSuggestions,
  filterTagSuggestions,
  parseActiveSearchToken,
  personSearchHandle,
} from "../lib/search-autocomplete";

interface HomePageToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  toolbarError: string | null;
  hasUnindexed: boolean;
}

type TagSuggestion = { type: "tag"; label: string };
type PersonSuggestion = {
  type: "person";
  label: string;
  handle: string;
  person: PersonSummary;
};
type SearchSuggestionItem = TagSuggestion | PersonSuggestion;

function suggestionKey(s: SearchSuggestionItem): string {
  if (s.type === "tag") {
    return `tag:${s.label}`;
  }
  return `person:${s.person.id}`;
}

export function HomePageToolbar({
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  onIndex,
  indexPolling,
  toolbarError,
  hasUnindexed,
}: HomePageToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const blurHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const tagsQuery = useQuery({
    queryKey: ["mediaTags"],
    queryFn: listMediaTags,
    staleTime: 60_000,
  });

  const peopleQuery = useQuery({
    queryKey: ["people"],
    queryFn: listPeople,
    staleTime: 60_000,
  });

  const syncCursor = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    setCursor(el.selectionStart ?? 0);
  }, []);

  const activeToken = useMemo(
    () => parseActiveSearchToken(searchQuery, cursor),
    [searchQuery, cursor],
  );

  const suggestionItems: SearchSuggestionItem[] = useMemo(() => {
    if (!activeToken) return [];
    const tagList = tagsQuery.data?.tags ?? [];
    const peopleList = peopleQuery.data ?? [];
    if (activeToken.kind === "tag") {
      return filterTagSuggestions(tagList, activeToken.prefix).map((label) => ({
        type: "tag" as const,
        label,
      }));
    }
    return filterPeopleSuggestions(peopleList, activeToken.prefix).map(
      (person) => {
        const handle = personSearchHandle(person.name);
        return {
          type: "person" as const,
          person,
          handle: handle.length > 0 ? handle : `person${person.id}`,
          label: person.name,
        };
      },
    );
  }, [activeToken, tagsQuery.data?.tags, peopleQuery.data]);

  const open = focused && activeToken != null && suggestionItems.length > 0;

  useLayoutEffect(() => {
    const el = inputRef.current;
    const pos = pendingCursorRef.current;
    if (el != null && pos != null) {
      el.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  }, [searchQuery]);

  useLayoutEffect(() => {
    setHighlight(0);
  }, [activeToken?.at, activeToken?.kind, activeToken?.prefix]);

  const applySuggestion = useCallback(
    (item: SearchSuggestionItem) => {
      const el = inputRef.current;
      const cur = el?.selectionStart ?? cursor;
      const token = parseActiveSearchToken(searchQuery, cur);
      if (!token) return;
      const replacement =
        item.type === "tag" ? `#${item.label}` : `@${item.handle}`;
      const next =
        searchQuery.slice(0, token.at) +
        replacement +
        searchQuery.slice(token.end) +
        " ";
      pendingCursorRef.current = token.at + replacement.length + 1;
      setSearchQuery(next);
    },
    [cursor, searchQuery, setSearchQuery],
  );

  const clearBlurTimer = useCallback(() => {
    if (blurHideRef.current != null) {
      clearTimeout(blurHideRef.current);
      blurHideRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearBlurTimer();
    },
    [clearBlurTimer],
  );

  return (
    <>
      <div className="toolbar">
        <div className="toolbar__search-wrap">
          <input
            ref={inputRef}
            type="search"
            placeholder="Search… (#tag @person words — adjacent terms combine with AND)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              syncCursor(e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (!open) {
                if (e.key === "Enter") {
                  onSearch();
                }
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setHighlight(0);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) =>
                  suggestionItems.length === 0
                    ? 0
                    : (h + 1) % suggestionItems.length,
                );
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) =>
                  suggestionItems.length === 0
                    ? 0
                    : (h - 1 + suggestionItems.length) % suggestionItems.length,
                );
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const item = suggestionItems[highlight];
                if (item != null) {
                  applySuggestion(item);
                }
                return;
              }
            }}
            onKeyUp={(e) => syncCursor(e.currentTarget)}
            onClick={(e) => syncCursor(e.currentTarget)}
            onSelect={(e) => syncCursor(e.currentTarget)}
            onFocus={() => {
              clearBlurTimer();
              setFocused(true);
              syncCursor(inputRef.current);
            }}
            onBlur={() => {
              blurHideRef.current = setTimeout(() => {
                setFocused(false);
              }, 120);
            }}
            className="form__input toolbar__search"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={open ? "search-autocomplete-list" : undefined}
            aria-activedescendant={
              open ? `search-autocomplete-option-${highlight}` : undefined
            }
          />
          {open && (
            <ul
              id="search-autocomplete-list"
              className="toolbar__autocomplete"
              role="listbox"
              onMouseDown={(ev) => ev.preventDefault()}
            >
              {suggestionItems.map((item, index) => {
                const id = `search-autocomplete-option-${index}`;
                const selected = index === highlight;
                return (
                  <li
                    key={suggestionKey(item)}
                    id={id}
                    role="option"
                    aria-selected={selected}
                    className={
                      selected
                        ? "toolbar__autocomplete-item toolbar__autocomplete-item--active"
                        : "toolbar__autocomplete-item"
                    }
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      applySuggestion(item);
                      inputRef.current?.focus();
                    }}
                  >
                    {item.type === "tag" ? (
                      <>
                        <span className="toolbar__autocomplete-kind">#</span>
                        {item.label}
                      </>
                    ) : (
                      <>
                        <span className="toolbar__autocomplete-kind">@</span>
                        <span className="toolbar__autocomplete-label">
                          {item.label}
                        </span>
                        <span className="toolbar__autocomplete-meta">
                          @{item.handle}
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button onClick={onSearch} disabled={searching} size="sm">
          {searching ? "Searching…" : "Search"}
        </Button>
        {(hasUnindexed || indexPolling) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onIndex(false)}
            disabled={indexPolling}
          >
            {indexPolling ? "Indexing…" : "Index new"}
          </Button>
        )}
      </div>
      {toolbarError && (
        <p className="toolbar__status toolbar__status--danger">
          {toolbarError}
        </p>
      )}
    </>
  );
}
