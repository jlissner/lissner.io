import { useMemo, useState, useCallback, useRef, useEffect } from "react";

export type PersonSelectValue = number | { createName: string };

type PersonOption = {
  id: number;
  name: string;
};

type PersonSelectProps = {
  people: PersonOption[];
  excludeIds?: number[];
  placeholder?: string;
  extraOptions?: Array<{ value: string; label: string }>;
  allowCreate?: boolean;
  onChange: (value: PersonSelectValue) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  style?: React.CSSProperties;
};

const defaultStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: "0.875rem",
  borderRadius: 6,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  minWidth: 120,
};

export function PersonSelect({
  people,
  excludeIds,
  placeholder,
  extraOptions,
  allowCreate = false,
  onChange,
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
  style,
}: PersonSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const sorted = useMemo(() => {
    const exclude = new Set(excludeIds);
    return [...people]
      .filter((p) => !exclude.has(p.id))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [people, excludeIds]);

  const filtered = useMemo(() => {
    if (!inputValue) return sorted;
    const lower = inputValue.toLowerCase();
    return sorted.filter((p) => p.name.toLowerCase().includes(lower));
  }, [sorted, inputValue]);

  const showCreateOption =
    inputValue.length > 0 &&
    !sorted.some((p) => p.name.toLowerCase() === inputValue.toLowerCase());

  // Build the list of selectable items
  const items: Array<
    | { type: "person"; id: number; name: string }
    | { type: "create"; name: string }
    | { type: "extra"; value: string; label: string }
  > = [
    ...filtered.map((p) => ({
      type: "person" as const,
      id: p.id,
      name: p.name,
    })),
    ...(showCreateOption
      ? [{ type: "create" as const, name: inputValue }]
      : []),
    ...(extraOptions || []).map((opt) => ({
      type: "extra" as const,
      value: opt.value,
      label: opt.label,
    })),
  ];

  const handleSelect = useCallback(
    (value: string | number) => {
      const prefix = "__create__:";
      if (typeof value === "string" && value.startsWith(prefix)) {
        const name = value.slice(prefix.length);
        onChange({ createName: name });
      } else if (value) {
        onChange(Number(value));
      }
      setInputValue("");
      setIsOpen(false);
      setActiveIndex(0);
    },
    [onChange],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(0);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Tab") {
      // Tab changes selection (does not submit)
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: move up
        if (activeIndex > 0) {
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else {
          // At first item - close dropdown, move focus to input
          setIsOpen(false);
          setActiveIndex(0);
        }
      } else {
        // Tab: move down
        if (activeIndex < items.length - 1) {
          setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
        } else {
          // At last item - close dropdown, let browser move focus
          setIsOpen(false);
          setActiveIndex(0);
        }
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) {
        if (item.type === "person") {
          handleSelect(item.id);
        } else if (item.type === "create") {
          handleSelect("__create__:" + item.name);
        } else if (item.type === "extra") {
          handleSelect(item.value);
        }
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!allowCreate) {
    return (
      <select
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        className={className}
        id={id}
        aria-label={ariaLabel}
        style={style}
      >
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

  const combinedStyle = { ...defaultStyle, ...(style || {}) };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-block", width: "100%" }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (e.target.value) {
            setIsOpen(true);
            setActiveIndex(0);
          }
        }}
        onFocus={() => inputValue && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type to search or create..."}
        disabled={disabled}
        className={className}
        id={id}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        style={{ ...combinedStyle, width: "100%" }}
      />
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 2000,
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            marginTop: 2,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={
                  item.type === "person"
                    ? item.id
                    : item.type === "create"
                      ? "create"
                      : item.value
                }
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => {
                  if (item.type === "person") {
                    handleSelect(item.id);
                  } else if (item.type === "create") {
                    handleSelect("__create__:" + item.name);
                  } else if (item.type === "extra") {
                    handleSelect(item.value);
                  }
                }}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                aria-selected={isActive}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--color-border)",
                  background: isActive
                    ? "var(--color-bg-elevated)"
                    : "transparent",
                  fontStyle: item.type === "create" ? "italic" : "normal",
                  color:
                    item.type === "create"
                      ? "var(--color-text-muted)"
                      : "var(--color-text)",
                }}
              >
                {item.type === "person" && item.name}
                {item.type === "create" && `Create: ${item.name}`}
                {item.type === "extra" && item.label}
              </div>
            );
          })}
          {items.length === 0 && (
            <div
              style={{ padding: "8px 10px", color: "var(--color-text-muted)" }}
            >
              No results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
