'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

/**
 * Reusable search input with debouncing and minimum character validation.
 *
 * Features:
 * - 300ms debounce to prevent excessive queries
 * - Requires 2+ characters to trigger search (or empty to clear)
 * - SQL wildcard escaping for special characters
 * - Visual hint when only 1 character is entered
 * - Clear button when input has value
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
}: SearchInputProps) {
  // Local state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(value);

  // Track if we initiated the change to avoid sync loops
  const isInternalChange = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger search if at least 2 characters or empty
      if (localSearch.length >= 2 || localSearch.length === 0) {
        isInternalChange.current = true;
        // Escape SQL LIKE wildcards to treat them as literal characters
        const escapedSearch = localSearch.replace(/[%_\\]/g, '\\$&');
        onChange(escapedSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onChange]);

  // Sync local search with prop only when it changes externally (e.g., clear filters)
  useEffect(() => {
    if (isInternalChange.current) {
      // This change was from our debounce, ignore it
      isInternalChange.current = false;
      return;
    }
    // External change (e.g., clear filters button, workspace change)
    if (value !== localSearch) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setLocalSearch(value);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={placeholder}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pr-9 pl-9"
          aria-label={placeholder}
          aria-describedby={
            localSearch.length === 1 ? 'search-hint' : undefined
          }
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => setLocalSearch('')}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search hint */}
      {localSearch.length === 1 && (
        <p
          id="search-hint"
          className="text-muted-foreground text-xs"
          role="status"
        >
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
