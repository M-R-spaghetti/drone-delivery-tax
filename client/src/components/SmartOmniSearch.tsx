import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ParsedIntent } from '../lib/searchParser';
import { Command, Plus, X, MapPin, DollarSign, Percent, Calendar, Tag, Hash, Search } from 'lucide-react';
import { NY_COUNTIES } from '../lib/counties';
import { CyberDatePicker } from './CyberDatePicker';

// ─── Data Model ─────────────────────────────────────────────────
export interface FilterBlock {
    id: string;
    field: 'amount' | 'tax' | 'location' | 'date' | 'source' | 'id';
    operator: '>' | '<' | '>=' | '<=' | '=' | 'between';
    value: number | string;
    value2?: number | string;
}

type FieldType = FilterBlock['field'];
type OpType = FilterBlock['operator'];

const FIELD_META: Record<FieldType, { label: string; icon: typeof DollarSign; color: string; bgColor: string; borderColor: string }> = {
    amount: { label: 'Amount', icon: DollarSign, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    tax: { label: 'Tax %', icon: Percent, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
    location: { label: 'Location', icon: MapPin, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
    date: { label: 'Date', icon: Calendar, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },

    source: { label: 'Source', icon: Tag, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20' },
    id: { label: 'ID', icon: Hash, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20' },
};

const OPS: { sym: OpType; label: string }[] = [
    { sym: '>', label: '>' },
    { sym: '<', label: '<' },
    { sym: '>=', label: '≥' },
    { sym: '<=', label: '≤' },
    { sym: '=', label: '=' },
    { sym: 'between', label: '↔' },
];

const OP_DISPLAY: Record<string, string> = { '>': '>', '<': '<', '>=': '≥', '<=': '≤', '=': '=', 'between': '↔' };

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatValue(field: FieldType, value: number | string): string {
    if (field === 'amount') return `${Number(value).toLocaleString()} $`;
    if (field === 'tax') return `${value}%`;
    return String(value);
}

// ─── Smart Autocomplete Suggestions ─────────────────────────────
interface Suggestion {
    type: 'field' | 'county';
    label: string;
    icon: typeof DollarSign;
    color: string;
    action: () => void;
}

// ─── Convert FilterBlock[] to API params ────────────────────────
function blocksToFilters(blocks: FilterBlock[]): ParsedIntent['filters'] {
    const filters: ParsedIntent['filters'] = {};
    for (const b of blocks) {
        if (b.field === 'amount') {
            const val = Number(b.value);
            if (b.value === '' || isNaN(val)) continue;
            if (b.operator === 'between') {
                const val2 = Number(b.value2);
                if (b.value2 === '' || b.value2 === undefined || isNaN(val2)) continue;
                filters.amount = { operator: '>=', value: val };
                (filters as any).amountMax = val2;
            } else {
                filters.amount = { operator: b.operator, value: val };
            }
        } else if (b.field === 'tax') {
            const val = Number(b.value);
            if (b.value === '' || isNaN(val)) continue;
            if (b.operator === 'between') {
                const val2 = Number(b.value2);
                if (b.value2 === '' || b.value2 === undefined || isNaN(val2)) continue;
                filters.tax = { operator: '>=', value: val / 100 };
                (filters as any).taxMax = val2 / 100;
            } else {
                filters.tax = { operator: b.operator, value: val / 100 };
            }
        } else if (b.field === 'location') {
            if (!b.value) continue;
            filters.text = String(b.value).toLowerCase();
        } else if (b.field === 'id') {
            if (!b.value) continue;
            (filters as any).idSearch = String(b.value);
        } else if (b.field === 'source') {
            (filters as any).source = String(b.value);
        } else if (b.field === 'date') {
            if (!b.value) continue;
            filters.dateFrom = String(b.value);
            filters.dateTo = String(b.value);
        }
    }
    return filters;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
interface SmartOmniSearchProps {
    onSearch: (filters: ParsedIntent['filters']) => void;
}

export default function SmartOmniSearch({ onSearch }: SmartOmniSearchProps) {
    const [blocks, setBlocks] = useState<FilterBlock[]>([]);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [editingPart, setEditingPart] = useState<'operator' | 'value' | 'value2' | null>(null);
    const [draftText, setDraftText] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Emit filters to parent
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(blocksToFilters(blocks));
        }, 250);
        return () => clearTimeout(timer);
    }, [blocks, onSearch]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setShowAddMenu(false);
                setShowSuggestions(false);
                setEditingBlockId(null);
                setEditingPart(null);
                inputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowAddMenu(false);
                setShowSuggestions(false);
                setEditingBlockId(null);
                setEditingPart(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ─── Smart Suggestions ──────────────────────────────────────
    const suggestions = useMemo((): Suggestion[] => {
        const q = draftText.toLowerCase().trim();
        if (!q) return [];
        const results: Suggestion[] = [];

        // Field keyword matches
        const fieldKeywords: { keywords: string[]; field: FieldType }[] = [
            { keywords: ['amount', 'sum', 'price', 'total', 'money', '$', 'dollar'], field: 'amount' },
            { keywords: ['tax', 'rate', 'percent', '%'], field: 'tax' },
            { keywords: ['location', 'county', 'city', 'place', 'region', 'zone', 'area'], field: 'location' },
            { keywords: ['date', 'time', 'when', 'period', 'month', 'year'], field: 'date' },

            { keywords: ['source', 'batch', 'manual', 'import', 'origin'], field: 'source' },
            { keywords: ['id', 'hash', 'transaction', 'txn'], field: 'id' },
        ];

        for (const { keywords, field } of fieldKeywords) {
            if (keywords.some(k => k.includes(q) || q.includes(k))) {
                const meta = FIELD_META[field];
                results.push({
                    type: 'field',
                    label: `Add ${meta.label} filter`,
                    icon: meta.icon,
                    color: meta.color,
                    action: () => {
                        addBlock(field);
                        setDraftText('');
                        setShowSuggestions(false);
                    },
                });
            }
        }

        // County matches
        const matchingCounties = NY_COUNTIES.filter(c => c.toLowerCase().includes(q)).slice(0, 4);
        for (const county of matchingCounties) {
            results.push({
                type: 'county',
                label: county,
                icon: MapPin,
                color: 'text-blue-400',
                action: () => {
                    const newBlock: FilterBlock = { id: uid(), field: 'location', operator: '=', value: county };
                    setBlocks(prev => [...prev, newBlock]);
                    setDraftText('');
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                },
            });
        }

        return results.slice(0, 6);
    }, [draftText]);

    // Reset selection when suggestions change
    useEffect(() => { setSelectedSuggestionIdx(0); }, [suggestions]);

    // Show suggestions when typing
    useEffect(() => {
        if (draftText.trim() && suggestions.length > 0) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [draftText, suggestions.length]);

    const addBlock = useCallback((field: FieldType) => {
        const newBlock: FilterBlock = {
            id: uid(),
            field,
            operator: field === 'location' || field === 'source' || field === 'id' ? '=' : '>',
            value: field === 'source' ? 'batch' : '',
        };
        setBlocks(prev => [...prev, newBlock]);
        setEditingBlockId(newBlock.id);
        setEditingPart('value');
        setShowAddMenu(false);
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<FilterBlock>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        setEditingBlockId(null);
        setEditingPart(null);
    }, []);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Navigate suggestions with arrow keys
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIdx(prev => Math.min(prev + 1, suggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIdx(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                suggestions[selectedSuggestionIdx]?.action();
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                suggestions[selectedSuggestionIdx]?.action();
                return;
            }
        }

        if (e.key === 'Backspace' && draftText === '' && blocks.length > 0) {
            e.preventDefault();
            removeBlock(blocks[blocks.length - 1].id);
        }
        if (e.key === 'Enter' && draftText.trim() && !showSuggestions) {
            e.preventDefault();
            const newBlock: FilterBlock = { id: uid(), field: 'id', operator: '=', value: draftText.trim() };
            setBlocks(prev => [...prev, newBlock]);
            setDraftText('');
        }
    };

    return (
        <div ref={containerRef} className="relative w-full mb-8 z-50 group/omni">
            {/* ── Search Label Bar ── */}
            <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 tracking-[0.3em] uppercase">
                    <span className="w-2 h-2 bg-[#FFD700] animate-pulse shadow-[0_0_6px_rgba(255,215,0,0.6)]"></span>
                    SYS.QUERY_ENGINE // ACTIVE
                </div>
                <div className="text-[10px] font-mono text-zinc-600 tracking-widest">NODE_READY</div>
            </div>

            {/* Ambient OmniSearch Glow — always subtly visible */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700]/5 via-[#FFD700]/15 to-[#FFD700]/5 opacity-60 group-focus-within/omni:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none"></div>

            {/* Main bar */}
            <div
                className="flex items-center min-h-[56px] lg:min-h-[72px] bg-[#050505] border-2 border-[#FFD700]/30 transition-all duration-300 rounded-none px-4 lg:px-6 py-2 lg:py-3 focus-within:shadow-[0_0_50px_rgba(255,215,0,0.25),inset_0_0_30px_rgba(255,215,0,0.05)] focus-within:border-[#FFD700] hover:border-[#FFD700]/60 cursor-text relative overflow-visible"
                onClick={() => inputRef.current?.focus()}
            >
                {/* Gold gradient left accent */}
                <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-[#FFD700] via-[#FFD700]/50 to-transparent pointer-events-none"></div>
                {/* Top-right gold corner mark */}
                <div className="absolute top-0 right-0 w-4 h-4 lg:w-6 lg:h-6 border-t-2 border-r-2 border-[#FFD700]/60 pointer-events-none"></div>
                {/* Bottom-left gold corner mark */}
                <div className="absolute bottom-0 left-0 w-4 h-4 lg:w-6 lg:h-6 border-b-2 border-l-2 border-[#FFD700]/60 pointer-events-none"></div>

                {/* Search icon — large and glowing */}
                <div className="mr-3 lg:mr-5 flex-shrink-0 relative">
                    <div className="absolute inset-0 bg-[#FFD700]/20 blur-xl rounded-full pointer-events-none"></div>
                    <Search className="w-5 h-5 lg:w-7 lg:h-7 text-[#FFD700] relative z-10 drop-shadow-[0_0_8px_rgba(255,215,0,0.7)]" />
                </div>

                {/* Prompt label */}
                <div className="mr-3 lg:mr-5 font-mono text-[14px] lg:text-[18px] tracking-[0.1em] lg:tracking-[0.15em] font-bold flex items-center flex-shrink-0 select-none">
                    <span className="text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">QUERY</span>
                    <span className="text-zinc-600 mx-1">::</span>
                    <span className="w-1.5 h-4 lg:w-2 lg:h-5 bg-[#FFD700] animate-[pulse_1s_infinite] shadow-[0_0_6px_rgba(255,215,0,0.5)]"></span>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-2">
                    {blocks.map(block => (
                        <FilterChip
                            key={block.id}
                            block={block}
                            isEditing={editingBlockId === block.id}
                            editingPart={editingBlockId === block.id ? editingPart : null}
                            onEditPart={(part) => { setEditingBlockId(block.id); setEditingPart(part); setShowAddMenu(false); setShowSuggestions(false); }}
                            onUpdate={(updates) => updateBlock(block.id, updates)}
                            onRemove={() => removeBlock(block.id)}
                            onCommit={() => { setEditingBlockId(null); setEditingPart(null); inputRef.current?.focus(); }}
                        />
                    ))}

                    {/* Add Filter button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); setEditingBlockId(null); setEditingPart(null); setShowSuggestions(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-dashed border-[#FFD700]/30 text-zinc-500 hover:text-black hover:bg-[#FFD700] hover:border-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all text-[12px] font-mono uppercase tracking-[0.2em] active:scale-95 ml-1"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline font-bold">PARAM</span>
                    </button>

                    {/* Free text input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={draftText}
                        onChange={(e) => {
                            setDraftText(e.target.value);
                            if (e.target.value.trim()) setShowAddMenu(false);
                            else setShowAddMenu(true);
                        }}
                        onFocus={() => {
                            if (draftText.trim() && suggestions.length) setShowSuggestions(true);
                            else if (!draftText.trim()) setShowAddMenu(true);
                        }}
                        onBlur={() => {
                            setTimeout(() => {
                                setShowSuggestions(false);
                                setShowAddMenu(false);
                            }, 200);
                        }}
                        onKeyDown={handleInputKeyDown}
                        placeholder={blocks.length === 0 ? "Type to search orders, amounts, locations..." : ""}
                        spellCheck={false}
                        className="flex-1 min-w-[150px] lg:min-w-[200px] bg-transparent text-white outline-none font-mono text-[14px] lg:text-[18px] tracking-[0.05em] placeholder:text-zinc-600 py-1.5 lg:py-2 caret-[#FFD700]"
                    />
                </div>

                <div className="ml-5 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-none bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-[11px] font-mono shadow-[inset_0_0_8px_rgba(0,0,0,0.5)] uppercase tracking-widest flex-shrink-0">
                    <Command className="w-3.5 h-3.5" />
                    <span>K</span>
                </div>
            </div>

            {/* ─── Add Filter Menu ────────────────────────────── */}
            <AnimatePresence>
                {showAddMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 mt-2 bg-[#030303] border border-zinc-800 border-t-[#FFD700] rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(255,215,0,0.1)] overflow-hidden z-[100] [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]"
                    >
                        <div className="px-4 py-2.5 border-b border-[#FFD700]/20 text-[10px] uppercase tracking-widest text-[#FFD700] font-mono font-bold">
                            APPEND PARAMETER
                        </div>
                        <div className="p-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5 w-full min-w-[280px] sm:min-w-[320px]">
                            {(Object.entries(FIELD_META) as [FieldType, typeof FIELD_META['amount']][]).map(([field, meta]) => {
                                const Icon = meta.icon;
                                return (
                                    <button
                                        key={field}
                                        onClick={() => addBlock(field)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-none bg-black border border-zinc-800 text-zinc-400 hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 hover:text-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.1)] transition-all text-[12px] font-mono uppercase tracking-widest`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Smart Text Suggestions ─────────────────────── */}
            <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#030303]/95 backdrop-blur-2xl border border-zinc-800 border-t-[#FFD700] rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(255,215,0,0.1)] overflow-hidden z-[100] [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]"
                    >
                        <div className="p-1.5">
                            {suggestions.map((s, idx) => {
                                const Icon = s.icon;
                                const isSelected = idx === selectedSuggestionIdx;
                                return (
                                    <button
                                        key={`${s.label}-${idx}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            s.action();
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-none text-[13px] sm:text-[14px] tracking-wide font-mono flex items-center gap-4 transition-all ${isSelected ? 'bg-[#FFD700]/15 border-l-[3px] border-[#FFD700] text-white pl-[13px]' : 'border-l-[3px] border-transparent text-zinc-400 hover:bg-zinc-900/80 hover:text-white'}`}
                                        onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                                    >
                                        <Icon className={`w-4 h-4 ${s.color} ${isSelected ? 'scale-110 drop-shadow-[0_0_5px_currentColor]' : ''} transition-all`} />
                                        <span>{s.label}</span>
                                        {isSelected && (
                                            <span className="ml-auto text-[11px] text-[#FFD700] tracking-[0.2em] uppercase font-bold animate-pulse">
                                                [EXEC]
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-4 py-2 border-t border-zinc-900 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
                            [↑↓] NAVIGATE // [ENTER] EXECUTE // [ESC] ABORT
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// FILTER CHIP SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════
interface FilterChipProps {
    block: FilterBlock;
    isEditing: boolean;
    editingPart: 'operator' | 'value' | 'value2' | null;
    onEditPart: (part: 'operator' | 'value' | 'value2') => void;
    onUpdate: (updates: Partial<FilterBlock>) => void;
    onRemove: () => void;
    onCommit: () => void;
}

function FilterChip({ block, isEditing, editingPart, onEditPart, onUpdate, onRemove, onCommit }: FilterChipProps) {
    const meta = FIELD_META[block.field];
    const Icon = meta.icon;

    // Refs
    const valueInputRef = useRef<HTMLInputElement>(null);
    const value2InputRef = useRef<HTMLInputElement>(null);
    const locationInputRef = useRef<HTMLInputElement>(null);
    const operatorRef = useRef<HTMLDivElement>(null);

    // State for Location
    const [locationSearch, setLocationSearch] = useState(block.field === 'location' ? String(block.value || '') : '');
    const [locHoverIdx, setLocHoverIdx] = useState(0);

    // Filter counties
    const filteredCounties = useMemo(() => {
        if (block.field !== 'location') return [];
        return NY_COUNTIES.filter(c => c.toLowerCase().includes(locationSearch.toLowerCase())).slice(0, 5);
    }, [block.field, locationSearch]);

    // Handle focus
    useEffect(() => {
        if (!isEditing) return;
        if (editingPart === 'value') {
            if (block.field === 'location') setTimeout(() => locationInputRef.current?.focus(), 50);
            else setTimeout(() => valueInputRef.current?.focus(), 50);
        } else if (editingPart === 'value2') {
            setTimeout(() => value2InputRef.current?.focus(), 50);
        } else if (editingPart === 'operator') {
            setTimeout(() => operatorRef.current?.focus(), 50);
        }
    }, [isEditing, editingPart, block.field]);

    const isNumeric = block.field === 'amount' || block.field === 'tax';
    const showBetween = block.operator === 'between';
    const hasValue = block.value !== '' && block.value !== undefined;

    // Operator Keydown Array
    const handleOperatorKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') onCommit();
        if (e.key === 'Enter') onEditPart('value');
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            onRemove();
            return;
        }

        // Find current index
        const curIdx = Math.max(0, OPS.findIndex(o => o.sym === block.operator));
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (curIdx + 1) % OPS.length;
            onUpdate({ operator: OPS[nextIdx].sym });
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (curIdx - 1 + OPS.length) % OPS.length;
            onUpdate({ operator: OPS[prevIdx].sym });
        }

        // Quick type
        const char = e.key;
        if (['>', '<', '='].includes(char)) {
            e.preventDefault();
            const matching = OPS.find(o => o.label.includes(char) || o.sym.includes(char));
            if (matching) {
                onUpdate({ operator: matching.sym });
                onEditPart('value'); // Move seamlessly to value
            }
        }
    };

    // Location Keydown
    const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === 'Escape') onCommit();

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setLocHoverIdx(prev => Math.min(prev + 1, filteredCounties.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setLocHoverIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (filteredCounties[locHoverIdx]) {
                onUpdate({ value: filteredCounties[locHoverIdx] });
                setLocationSearch('');
                onCommit();
            }
        } else {
            // Reset hover index on typing
            setLocHoverIdx(0);
        }
    };

    return (
        <div className={`relative flex items-center gap-0.5 rounded-none border ${meta.borderColor} ${meta.bgColor} transition-all ${isEditing ? 'ring-1 ring-[#FFD700]' : ''}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Field icon */}
            <div className={`flex items-center pl-2 pr-1 py-1 ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Operator */}
            {isNumeric && (
                isEditing && editingPart === 'operator' ? (
                    <div
                        ref={operatorRef}
                        tabIndex={0}
                        onKeyDown={handleOperatorKeyDown}
                        className={`px-1.5 py-1 rounded-none font-mono text-[13px] bg-[#FFD700] text-black outline-none cursor-pointer font-bold`}
                    >
                        {OP_DISPLAY[block.operator] || block.operator}
                    </div>
                ) : (
                    <button
                        onClick={() => onEditPart('operator')}
                        className={`px-1.5 py-1 rounded-none font-mono text-[13px] ${meta.color} hover:bg-white/5 transition-colors cursor-pointer`}
                    >
                        {OP_DISPLAY[block.operator] || block.operator}
                    </button>
                )
            )}

            {/* Value segment */}
            {block.field === 'location' ? (
                <div className="relative">
                    {isEditing && editingPart === 'value' ? (
                        <input
                            ref={locationInputRef}
                            type="text"
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            onKeyDown={handleLocationKeyDown}
                            placeholder="Type county..."
                            className="w-[140px] bg-[#FFD700]/10 text-white outline-none ring-1 ring-[#FFD700] font-mono text-[13px] px-1.5 py-1 tracking-wide"
                        />
                    ) : (
                        <button
                            onClick={() => { setLocationSearch(String(block.value || '')); onEditPart('value'); }}
                            className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded-none transition-colors cursor-pointer ${!hasValue ? 'text-zinc-500 italic' : ''}`}
                        >
                            {hasValue ? String(block.value) : 'pick...'}
                        </button>
                    )}
                </div>
            ) : block.field === 'source' ? (
                <button
                    onClick={() => onUpdate({ value: block.value === 'batch' ? 'manual' : 'batch' })}
                    className="px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                >
                    {String(block.value)}
                </button>
            ) : block.field === 'id' ? (
                isEditing && editingPart === 'value' ? (
                    <input
                        ref={valueInputRef}
                        type="text"
                        value={String(block.value)}
                        onChange={(e) => onUpdate({ value: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') onCommit(); }}
                        onBlur={() => onCommit()}
                        className="w-[100px] bg-[#FFD700]/10 text-white outline-none ring-1 ring-[#FFD700] font-mono text-[13px] px-1.5 py-1 tracking-wider"
                    />
                ) : (
                    <button onClick={() => onEditPart('value')} className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded-none transition-colors cursor-pointer ${!hasValue ? 'text-zinc-500 italic' : ''}`}>
                        {hasValue ? String(block.value) : 'type...'}
                    </button>
                )
            ) : block.field === 'date' ? (
                <div className="relative z-50">
                    <CyberDatePicker
                        value={String(block.value || '')}
                        onChange={(val) => {
                            onUpdate({ value: val });
                            onCommit();
                        }}
                        className="w-[140px]"
                        placeholder="DATE..."
                    />
                </div>
            ) : (
                <>
                    {isEditing && editingPart === 'value' ? (
                        <input
                            ref={valueInputRef}
                            type="number"
                            step="any"
                            value={block.value === '' ? '' : Number(block.value)}
                            onChange={(e) => onUpdate({ value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                            onKeyDown={(e) => {
                                e.stopPropagation();

                                // Quick operator change while typing value
                                if (['>', '<', '='].includes(e.key)) {
                                    e.preventDefault();
                                    const matching = OPS.find(o => o.label.includes(e.key) || o.sym.includes(e.key));
                                    if (matching) onUpdate({ operator: matching.sym });
                                    return;
                                }

                                // Backspace to operator if empty
                                if (e.key === 'Backspace' && String(block.value) === '') {
                                    e.preventDefault();
                                    onEditPart('operator');
                                    return;
                                }

                                if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    if (showBetween) { onEditPart('value2'); }
                                    else onCommit();
                                }
                                if (e.key === 'Escape') onCommit();
                            }}
                            onBlur={() => { if (!showBetween) onCommit(); }}
                            placeholder="0"
                            className="w-[70px] bg-[#FFD700]/10 text-white outline-none ring-1 ring-[#FFD700] font-mono text-[13px] px-1.5 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    ) : (
                        <button
                            onClick={() => onEditPart('value')}
                            className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded-none transition-colors cursor-pointer ${!hasValue ? 'text-zinc-500 italic' : ''}`}
                        >
                            {hasValue ? formatValue(block.field, block.value) : '...'}
                        </button>
                    )}

                    {showBetween && (
                        <>
                            <span className={`text-[11px] ${meta.color} opacity-60 px-0.5`}>—</span>
                            {isEditing && editingPart === 'value2' ? (
                                <input
                                    ref={value2InputRef}
                                    type="number"
                                    step="any"
                                    value={block.value2 === undefined || block.value2 === '' ? '' : Number(block.value2)}
                                    onChange={(e) => onUpdate({ value2: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();

                                        // Backspace to value1 if empty
                                        if (e.key === 'Backspace' && (block.value2 === undefined || String(block.value2) === '')) {
                                            e.preventDefault();
                                            onEditPart('value');
                                            return;
                                        }

                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                            e.preventDefault();
                                            onCommit();
                                        }
                                    }}
                                    onBlur={() => onCommit()}
                                    placeholder="max"
                                    className="w-[70px] bg-[#FFD700]/10 text-white outline-none ring-1 ring-[#FFD700] font-mono text-[13px] px-1.5 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            ) : (
                                <button
                                    onClick={() => onEditPart('value2')}
                                    className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded-none transition-colors cursor-pointer ${!block.value2 && block.value2 !== 0 ? 'text-zinc-500 italic' : ''}`}
                                >
                                    {block.value2 !== undefined && block.value2 !== '' ? formatValue(block.field, block.value2) : 'max...'}
                                </button>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Remove */}
            <button
                onClick={() => onRemove()}
                className={`pr-2 pl-1 py-1.5 ${meta.color} opacity-40 hover:opacity-100 hover:text-red-500 transition-colors outline-none focus:ring-1 focus:ring-red-500 rounded-none`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onRemove();
                }}
            >
                <X className="w-3 h-3" />
            </button>

            {/* ─── Operator Picker Popover ────────────────────── */}
            <AnimatePresence>
                {isEditing && editingPart === 'operator' && isNumeric && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-[120%] left-0 mt-1 bg-black border border-[#FFD700] rounded-none shadow-[0_0_20px_rgba(255,215,0,0.15)] p-1.5 z-[100] grid gap-0.5"
                    >
                        <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] px-1.5 pb-2 pointer-events-none">[SELECT_OP]</div>
                        <div className="flex gap-0.5">
                            {OPS.map(op => (
                                <button
                                    key={op.sym}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onUpdate({ operator: op.sym });
                                        onEditPart('value');
                                    }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-none font-mono text-[14px] font-bold transition-colors cursor-pointer ${block.operator === op.sym ? 'bg-[#FFD700] text-black shadow-inner' : 'text-zinc-400 hover:bg-zinc-800 hover:text-[#FFD700]'}`}
                                >
                                    {op.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Location Typeahead Popover ─────────────────── */}
            <AnimatePresence>
                {isEditing && editingPart === 'value' && block.field === 'location' && filteredCounties.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-[120%] left-0 mt-1 w-52 bg-black border border-[#FFD700] rounded-none shadow-[0_0_20px_rgba(255,215,0,0.15)] overflow-hidden z-[100]"
                    >
                        <div className="max-h-[200px] overflow-y-auto py-1">
                            {filteredCounties.map((county, idx) => (
                                <button
                                    key={county}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onUpdate({ value: county });
                                        setLocationSearch('');
                                        onCommit();
                                    }}
                                    className={`w-full text-left px-3 py-2 text-[12px] font-mono tracking-widest flex items-center transition-all ${idx === locHoverIdx ? 'bg-[#FFD700] text-black font-bold' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-[#FFD700]'}`}
                                    onMouseEnter={() => setLocHoverIdx(idx)}
                                >
                                    <MapPin className={`w-3 h-3 inline mr-2 transition-opacity ${idx === locHoverIdx ? 'opacity-100 text-black' : 'opacity-40'}`} />
                                    {county}
                                    {idx === locHoverIdx && (
                                        <span className="ml-auto text-[10px] text-black tracking-widest uppercase">[EXEC]</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
