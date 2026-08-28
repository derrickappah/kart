'use client';

import React, { useState, useEffect, useRef } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export const CATEGORIES = [
    { name: 'Textbooks', icon: 'menu_book', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10' },
    { name: 'Electronics', icon: 'devices', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
    { name: 'Dorm Furniture', icon: 'chair', color: 'text-lime-700 dark:text-lime-400 bg-lime-500/10' },
    { name: 'Clothing', icon: 'checkroom', color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10' },
    { name: 'School Supplies', icon: 'school', color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
    { name: 'Tickets & Events', icon: 'confirmation_number', color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10' },
    { name: 'Services & Tutoring', icon: 'support_agent', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10' },
    { name: 'Beauty & Grooming', icon: 'face_retouching_natural', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
    { name: 'Sports & Fitness', icon: 'sports_soccer', color: 'text-green-700 dark:text-green-400 bg-green-500/10' },
    { name: 'Kitchenware', icon: 'kitchen', color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10' },
    { name: 'Musical Instruments', icon: 'piano', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
    { name: 'Games & Consoles', icon: 'sports_esports', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
    { name: 'Health & Wellness', icon: 'favorite', color: 'text-red-600 dark:text-red-400 bg-red-500/10' },
    { name: 'Arts & Crafts', icon: 'palette', color: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10' },
    { name: 'Home Appliances', icon: 'home_iot_device', color: 'text-teal-700 dark:text-teal-400 bg-teal-500/10' },
];

export default function CategorySelector({
    value = '',
    onChange,
    disabled = false,
    className = '',
    id = 'category',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedCategory = CATEGORIES.find((cat) => cat.name === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Close on Escape
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    const filteredCategories = CATEGORIES.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    const handleSelect = (categoryName) => {
        if (onChange) {
            onChange(categoryName);
        }
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* Custom Trigger Button */}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`w-full h-[56px] bg-[#F5F5F5] dark:bg-[#2E2E32] rounded-xl px-3.5 flex items-center justify-between gap-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 ${
                    isOpen ? 'ring-2 ring-primary/50' : ''
                }`}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectedCategory ? (
                        <>
                            <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${selectedCategory.color}`}>
                                <DynamicLucideIcon name={selectedCategory.icon} size={15} />
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {selectedCategory.name}
                            </span>
                        </>
                    ) : (
                        <span className="text-base font-medium text-gray-400 pl-0.5 truncate">
                            Select
                        </span>
                    )}
                </div>
                <div className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
                    <DynamicLucideIcon name="expand_more" size={20} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    role="listbox"
                    aria-label="Categories"
                    className="absolute z-50 right-0 w-[280px] sm:w-[300px] mt-2 bg-white dark:bg-[#2E2E32] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in"
                >
                    {/* Search Input */}
                    <div className="p-2.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#28282b]">
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search category..."
                                className="w-full bg-white dark:bg-[#1e1e20] text-gray-900 dark:text-white text-xs font-medium rounded-lg pl-8 pr-7 py-2 border border-gray-200 dark:border-gray-700/60 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-gray-400"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <DynamicLucideIcon name="search" size={14} />
                            </div>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                                >
                                    <DynamicLucideIcon name="close" size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map((cat) => {
                                const isSelected = cat.name === value;
                                return (
                                    <button
                                        key={cat.name}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(cat.name)}
                                        className={`w-full px-2.5 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 group ${
                                            isSelected
                                                ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                                                : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-medium'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${cat.color}`}
                                            >
                                                <DynamicLucideIcon name={cat.icon} size={17} />
                                            </div>
                                            <span className="text-xs truncate">{cat.name}</span>
                                        </div>

                                        {isSelected && (
                                            <div className="text-primary shrink-0">
                                                <DynamicLucideIcon name="check" size={16} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs font-semibold text-gray-400">
                                No categories found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
