import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type FilterType = 'ALL' | '24H' | '7D' | '30D' | 'SPECIFIC_DAY' | 'SPECIFIC_MONTH';

export interface TimeFilterConfig {
    type: FilterType;
    dateStr?: string; // 'YYYY-MM-DD' or 'YYYY-MM'
}

interface TimeFilterProps {
    currentFilter: TimeFilterConfig;
    onFilterChange: (config: TimeFilterConfig) => void;
}

export default function TimeFilter({ currentFilter, onFilterChange }: TimeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getLabel = () => {
        switch (currentFilter.type) {
            case 'ALL': return 'ALL TIME';
            case '24H': return 'LAST 24 HOURS';
            case '7D': return 'LAST 7 DAYS';
            case '30D': return 'LAST 30 DAYS';
            case 'SPECIFIC_DAY': return `DAY: ${currentFilter.dateStr}`;
            case 'SPECIFIC_MONTH': return `MONTH: ${currentFilter.dateStr}`;
            default: return 'FILTER';
        }
    };

    const handleSelect = (type: FilterType) => {
        if (type !== 'SPECIFIC_DAY' && type !== 'SPECIFIC_MONTH') {
            onFilterChange({ type });
            setIsOpen(false);
        }
    };

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>, isMonth: boolean) => {
        if (e.target.value) {
            onFilterChange({
                type: isMonth ? 'SPECIFIC_MONTH' : 'SPECIFIC_DAY',
                dateStr: e.target.value
            });
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-[#FFFFFF] text-xs font-mono tracking-widest uppercase hover:bg-zinc-800 hover:border-zinc-700 transition-colors group"
            >
                <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {getLabel()}
                <svg className={`w-3 h-3 text-zinc-500 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-[#09090B] border border-zinc-800 shadow-2xl z-50 p-2 flex flex-col gap-1 backdrop-blur-xl"
                    >
                        <div className="text-[10px] text-zinc-500 font-sans uppercase tracking-widest px-2 py-1 mb-1 border-b border-zinc-800">
                            Presets
                        </div>
                        {(['ALL', '24H', '7D', '30D'] as FilterType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => handleSelect(type)}
                                className={`text-left px-2 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors ${currentFilter.type === type ? 'bg-[#E50000]/10 text-[#E50000]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                            >
                                {type === 'ALL' ? 'ALL TIME' : `LAST ${type}`}
                            </button>
                        ))}

                        <div className="text-[10px] text-zinc-500 font-sans uppercase tracking-widest px-2 py-1 mt-2 mb-1 border-b border-zinc-800">
                            Specific Date
                        </div>
                        <div className="flex flex-col gap-2 px-2 py-1">
                            <label className="text-[10px] text-zinc-400 font-mono flex flex-col gap-1">
                                Day:
                                <input
                                    type="date"
                                    onChange={(e) => handleDateSelect(e, false)}
                                    className="bg-zinc-900 border border-zinc-800 text-white text-[11px] p-1.5 outline-none focus:border-[#E50000]"
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </label>
                            <label className="text-[10px] text-zinc-400 font-mono flex flex-col gap-1">
                                Month:
                                <input
                                    type="month"
                                    onChange={(e) => handleDateSelect(e, true)}
                                    className="bg-zinc-900 border border-zinc-800 text-white text-[11px] p-1.5 outline-none focus:border-[#E50000]"
                                    max={new Date().toISOString().slice(0, 7)}
                                />
                            </label>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
