'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Calendar,
  Flag,
  ArrowUpAZ,
  ArrowDownZA,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { SortOption } from '@/hooks/useAllTasks';

interface CategoryWithWorkspace {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  workspace_id: string;
  workspace?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (ids: string[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  categories: CategoryWithWorkspace[] | undefined;
  onClearFilters: () => void;
  isLoading?: boolean;
}

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'due_date',
    label: 'Due date',
    icon: <Calendar className="h-4 w-4" />,
  },
  { value: 'priority', label: 'Priority', icon: <Flag className="h-4 w-4" /> },
  { value: 'title_asc', label: 'A-Z', icon: <ArrowUpAZ className="h-4 w-4" /> },
  {
    value: 'title_desc',
    label: 'Z-A',
    icon: <ArrowDownZA className="h-4 w-4" />,
  },
];

export function TaskFilters({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  sortBy,
  onSortChange,
  categories,
  onClearFilters,
  isLoading = false,
}: TaskFiltersProps) {
  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger search if at least 2 characters or empty
      if (localSearch.length >= 2 || localSearch.length === 0) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Sync local search with prop when it changes externally (e.g., clear filters)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      if (selectedCategories.includes(categoryId)) {
        onCategoriesChange(
          selectedCategories.filter((id) => id !== categoryId)
        );
      } else {
        onCategoriesChange([...selectedCategories, categoryId]);
      }
    },
    [selectedCategories, onCategoriesChange]
  );

  const handleClearCategories = useCallback(() => {
    onCategoriesChange([]);
  }, [onCategoriesChange]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedCategories.length > 0 ||
    sortBy !== 'due_date';

  // Group categories by workspace for display
  const categoriesByWorkspace = categories?.reduce(
    (acc, category) => {
      const workspaceName = category.workspace?.name || 'Unknown';
      if (!acc[workspaceName]) {
        acc[workspaceName] = [];
      }
      acc[workspaceName].push(category);
      return acc;
    },
    {} as Record<string, CategoryWithWorkspace[]>
  );

  // Get selected category names for display
  const selectedCategoryNames = categories
    ?.filter((c) => selectedCategories.includes(c.id))
    .map((c) => c.name);

  return (
    <div className="space-y-4">
      {/* Search and Clear Row */}
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pr-9 pl-9"
            disabled={isLoading}
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Search hint */}
      {localSearch.length === 1 && (
        <p className="text-muted-foreground text-xs">
          Type at least 2 characters to search
        </p>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2">
        {/* Category Multi-Select */}
        <Popover
          open={categoryPopoverOpen}
          onOpenChange={setCategoryPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 justify-start"
              disabled={isLoading || !categories || categories.length === 0}
            >
              <span className="text-muted-foreground mr-1">Categories:</span>
              {selectedCategories.length === 0 ? (
                <span>All</span>
              ) : (
                <span>{selectedCategories.length} selected</span>
              )}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2">
              {selectedCategories.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCategories}
                  className="mb-2 w-full justify-start"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </Button>
              )}
              <div className="max-h-64 overflow-y-auto">
                {categoriesByWorkspace &&
                  Object.entries(categoriesByWorkspace).map(
                    ([workspaceName, workspaceCategories]) => (
                      <div key={workspaceName} className="mb-2">
                        {Object.keys(categoriesByWorkspace).length > 1 && (
                          <div className="text-muted-foreground mb-1 px-2 text-xs font-medium">
                            {workspaceName}
                          </div>
                        )}
                        {workspaceCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => handleCategoryToggle(category.id)}
                            className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                          >
                            <Checkbox
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={() =>
                                handleCategoryToggle(category.id)
                              }
                            />
                            {category.color && (
                              <div
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            {category.icon && (
                              <span className="shrink-0">{category.icon}</span>
                            )}
                            <span className="truncate">{category.name}</span>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                {(!categories || categories.length === 0) && (
                  <p className="text-muted-foreground p-2 text-sm">
                    No categories available
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort Dropdown */}
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-auto">
            <span className="text-muted-foreground mr-1">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Categories Badges */}
      {selectedCategoryNames && selectedCategoryNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories
            ?.filter((c) => selectedCategories.includes(c.id))
            .map((category) => (
              <Badge
                key={category.id}
                variant="secondary"
                className="gap-1 pr-1"
                style={
                  category.color
                    ? {
                        backgroundColor: `${category.color}20`,
                        color: category.color,
                      }
                    : undefined
                }
              >
                {category.icon && <span>{category.icon}</span>}
                {category.name}
                <button
                  type="button"
                  onClick={() => handleCategoryToggle(category.id)}
                  className="hover:bg-foreground/10 ml-0.5 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
