'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  searchTerms?: string; // Optional extra keywords to match on
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  error?: string;
  id?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  buttonClassName = '',
  error,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected Option Object
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered Options based on query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      const matchTerms = opt.searchTerms ? opt.searchTerms.toLowerCase().includes(q) : false;
      const matchValue = opt.value.toLowerCase().includes(q);
      return matchLabel || matchSublabel || matchBadge || matchTerms || matchValue;
    });
  }, [options, searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option-item]');
      const target = items[index] as HTMLElement;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border bg-white dark:bg-zinc-900 transition-all text-left outline-none ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
            : isOpen
            ? 'border-red-700 ring-2 ring-red-700/20 shadow-xs'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
          {selectedOption ? (
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                  {selectedOption.sublabel}
                </span>
              )}
            </span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-700' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Floating Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[280px] sm:min-w-[340px] max-w-[500px] z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-900/10 dark:shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header Bar */}
          <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 relative">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-0.5 rounded text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-zinc-400">
              <span>{filteredOptions.length} available</span>
              <span>Type code or name</span>
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 text-xs font-sans"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    data-option-item
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-red-700 text-white font-semibold'
                        : isHighlighted
                        ? 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200'
                        : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                              isSelected
                                ? 'bg-red-800 text-red-100'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-red-100' : 'text-zinc-400'
                          }`}
                        >
                          {opt.sublabel}
                        </p>
                      )}
                    </div>

                    {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
