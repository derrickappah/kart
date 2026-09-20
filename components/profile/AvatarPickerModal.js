'use client';

import { useState, useMemo, useCallback } from 'react';
import { Dices, Sparkles, Check, X, RefreshCw, Eye } from 'lucide-react';
import {
    getAdventurerAvatarUrl,
    AVATAR_PALETTES,
    PRESET_AVATARS
} from '@/utils/avatar';

function generateRandomSeed() {
    return 'kart_' + Math.random().toString(36).substring(2, 10);
}

export default function AvatarPickerModal({ isOpen, onClose, onSelectAvatar, initialUrl }) {
    const [currentSeed, setCurrentSeed] = useState(() => generateRandomSeed());
    const [selectedPalette, setSelectedPalette] = useState(AVATAR_PALETTES[0]);
    const [withGlasses, setWithGlasses] = useState(false);
    const [isRolling, setIsRolling] = useState(false);

    // Dynamic gallery seeds that can be reshuffled
    const [gallerySeeds, setGallerySeeds] = useState(() => 
        PRESET_AVATARS.map((preset) => ({
            name: preset.name,
            seed: preset.seed,
            options: preset.options
        }))
    );

    const currentUrl = useMemo(() => {
        return getAdventurerAvatarUrl(currentSeed, {
            backgroundColor: selectedPalette.colors,
            glassesProbability: withGlasses ? 100 : 0,
        });
    }, [currentSeed, selectedPalette, withGlasses]);

    const handleRollRandom = useCallback(() => {
        setIsRolling(true);
        const newSeed = generateRandomSeed();
        setCurrentSeed(newSeed);
        setTimeout(() => setIsRolling(false), 400);
    }, []);

    const handleShuffleGallery = useCallback(() => {
        const adjectives = ['Cool', 'Sunny', 'Breeze', 'Sky', 'Echo', 'Nova', 'Blaze', 'Swift', 'Chill', 'Spark', 'Zen', 'Wave'];
        setGallerySeeds(adjectives.map((adj) => {
            const seed = adj + '_' + Math.floor(Math.random() * 900 + 100);
            return {
                name: adj,
                seed,
                options: {
                    backgroundColor: selectedPalette.colors,
                    glassesProbability: Math.random() > 0.5 ? 100 : 0
                }
            };
        }));
    }, [selectedPalette]);

    const handleSelectPreset = (preset) => {
        setCurrentSeed(preset.seed);
        if (preset.options?.glassesProbability !== undefined) {
            setWithGlasses(preset.options.glassesProbability > 0);
        }
    };

    const handleConfirm = () => {
        onSelectAvatar(currentUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1a2328] rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800/80">
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[#1daddd] flex items-center justify-center">
                            <Sparkles className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose Adventurer Avatar</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Personalize your expressive profile character</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Live Preview Area */}
                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-[#151c20] rounded-2xl border border-slate-100 dark:border-slate-800/60 relative">
                        <div className="size-32 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-[#232f35] bg-white transition-transform duration-300">
                            <img
                                src={currentUrl}
                                alt="Adventurer avatar preview"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Roll Dice Action Button */}
                        <div className="flex items-center gap-3 mt-4">
                            <button
                                type="button"
                                onClick={handleRollRandom}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1daddd] text-white rounded-xl text-xs font-bold hover:bg-[#179bc7] active:scale-95 transition-all shadow-md"
                            >
                                <Dices className={`size-4 ${isRolling ? 'animate-spin' : ''}`} />
                                Roll Random Avatar
                            </button>

                            <button
                                type="button"
                                onClick={() => setWithGlasses(!withGlasses)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    withGlasses
                                        ? 'bg-sky-50 dark:bg-sky-950/40 border-[#1daddd] text-[#1daddd]'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                <Eye className="size-3.5" />
                                {withGlasses ? 'Glasses On' : 'Glasses Off'}
                            </button>
                        </div>
                    </div>

                    {/* Palette Switcher */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                            Background Style
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AVATAR_PALETTES.map((palette) => {
                                const isSelected = selectedPalette.id === palette.id;
                                return (
                                    <button
                                        key={palette.id}
                                        type="button"
                                        onClick={() => setSelectedPalette(palette)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            isSelected
                                                ? 'bg-[#1daddd] text-white font-bold shadow-sm'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {palette.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Curated Style Gallery */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                Or pick a character
                            </label>
                            <button
                                type="button"
                                onClick={handleShuffleGallery}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1daddd] hover:underline cursor-pointer"
                            >
                                <RefreshCw className="size-3" />
                                Shuffle Gallery
                            </button>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {gallerySeeds.map((item, idx) => {
                                const previewItemUrl = getAdventurerAvatarUrl(item.seed, {
                                    backgroundColor: selectedPalette.colors,
                                    glassesProbability: item.options?.glassesProbability ?? 0
                                });
                                const isCurrentlySelected = currentSeed === item.seed;

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectPreset(item)}
                                        className={`group relative flex flex-col items-center p-2 rounded-2xl transition-all border ${
                                            isCurrentlySelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 border-[#1daddd] shadow-sm ring-2 ring-[#1daddd]/30'
                                                : 'bg-slate-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="size-12 rounded-full overflow-hidden bg-white shadow-xs">
                                            <img
                                                src={previewItemUrl}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                loading="lazy"
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
                                            {item.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a2328]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1daddd] hover:bg-[#179bc7] active:scale-95 transition-all shadow-md shadow-[#1daddd]/25"
                    >
                        <Check className="size-4" />
                        Use This Avatar
                    </button>
                </div>
            </div>
        </div>
    );
}
