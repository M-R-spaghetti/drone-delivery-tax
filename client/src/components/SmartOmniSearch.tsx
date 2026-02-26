import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ParsedIntent } from '../lib/searchParser';
import { Search, Command, Plus, X, MapPin, DollarSign, Percent, Calendar, Tag, Hash } from 'lucide-react';
import { NY_COUNTIES } from '../lib/counties';

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
    if (field === 'amount') return `$${Number(value).toLocaleString()}`;
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
        <div ref={containerRef} className="relative w-full mb-6 z-50">
            {/* Main bar */}
            <div
                className="flex items-center min-h-[50px] bg-[#09090b]/90 backdrop-blur-xl border border-zinc-800 transition-all duration-300 rounded-xl px-4 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:border-zinc-500/50 focus-within:ring-1 focus-within:ring-white/10"
            >
                <Search className="w-5 h-5 mr-3 text-zinc-600" />

                <div className="flex-1 flex flex-wrap items-center gap-2 cursor-text" onClick={() => inputRef.current?.focus()}>
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
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all text-[12px] font-mono"
                    >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Filter</span>
                    </button>

                    {/* Free text input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onFocus={() => { if (draftText.trim() && suggestions.length) setShowSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={blocks.length === 0 ? "Type 'amount', 'tax', 'location' or a county name..." : ""}
                        spellCheck={false}
                        className="flex-1 min-w-[100px] bg-transparent text-white caret-white outline-none font-mono text-[14px] tracking-tight placeholder:text-zinc-600 py-1"
                    />
                </div>

                <div className="ml-3 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-mono shadow-inner">
                    <Command className="w-3 h-3" />
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
                        className="absolute top-full left-0 mt-2 bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
                    >
                        <div className="px-4 py-2.5 border-b border-zinc-900 text-[10px] uppercase tracking-widest text-zinc-500 font-sans font-bold">
                            Add Filter
                        </div>
                        <div className="p-1.5 grid grid-cols-3 gap-1 min-w-[300px]">
                            {(Object.entries(FIELD_META) as [FieldType, typeof FIELD_META['amount']][]).map(([field, meta]) => {
                                const Icon = meta.icon;
                                return (
                                    <button
                                        key={field}
                                        onClick={() => addBlock(field)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${meta.bgColor} border ${meta.borderColor} ${meta.color} hover:brightness-125 transition-all text-[12px] font-mono`}
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
                        className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0c]/95 backdrop-blur-2xl border border-zinc-800/80 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
                    >
                        <div className="p-1.5">
                            {suggestions.map((s, idx) => {
                                const Icon = s.icon;
                                const isSelected = idx === selectedSuggestionIdx;
                                return (
                                    <button
                                        key={`${s.label}-${idx}`}
                                        onClick={() => s.action()}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-mono flex items-center gap-3 transition-all ${isSelected ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-white'}`}
                                    >
                                        <Icon className={`w-4 h-4 ${s.color}`} />
                                        <span>{s.label}</span>
                                        {isSelected && (
                                            <span className="ml-auto text-[10px] text-zinc-600 tracking-widest uppercase">
                                                Enter ↵
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-4 py-2 border-t border-zinc-900 text-[10px] text-zinc-600 font-sans">
                            ↑↓ navigate · Enter to select · Esc to close
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
    const valueInputRef = useRef<HTMLInputElement>(null);
    const value2InputRef = useRef<HTMLInputElement>(null);
    const [locationSearch, setLocationSearch] = useState('');
    const locationInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && editingPart === 'value') {
            if (block.field === 'location') {
                setTimeout(() => locationInputRef.current?.focus(), 50);
            } else {
                setTimeout(() => valueInputRef.current?.focus(), 50);
            }
        }
        if (isEditing && editingPart === 'value2') {
            setTimeout(() => value2InputRef.current?.focus(), 50);
        }
    }, [isEditing, editingPart, block.field]);

    const isNumeric = block.field === 'amount' || block.field === 'tax';
    const showBetween = block.operator === 'between';
    const hasValue = block.value !== '' && block.value !== undefined;

    const filteredCounties = block.field === 'location'
        ? NY_COUNTIES.filter(c => c.toLowerCase().includes((locationSearch || '').toLowerCase())).slice(0, 5)
        : [];

    return (
        <div className={`relative flex items-center gap-0.5 rounded-lg border ${meta.borderColor} ${meta.bgColor} transition-all ${isEditing ? 'ring-1 ring-white/20' : ''}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Field icon */}
            <div className={`flex items-center pl-2 pr-1 py-1.5 ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Operator */}
            {isNumeric && (
                <button
                    onClick={() => onEditPart('operator')}
                    className={`px-1.5 py-1 rounded font-mono text-[13px] ${meta.color} hover:bg-white/5 transition-colors cursor-pointer`}
                >
                    {OP_DISPLAY[block.operator] || block.operator}
                </button>
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
                            onKeyDown={(e) => { if (e.key === 'Escape') onCommit(); }}
                            placeholder="Search county..."
                            className="w-[130px] bg-transparent text-white outline-none font-mono text-[13px] px-1.5 py-1"
                        />
                    ) : (
                        <button
                            onClick={() => { setLocationSearch(''); onEditPart('value'); }}
                            className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded transition-colors cursor-pointer ${!hasValue ? 'text-zinc-500 italic' : ''}`}
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
                        className="w-[100px] bg-transparent text-white outline-none font-mono text-[13px] px-1.5 py-1"
                    />
                ) : (
                    <button onClick={() => onEditPart('value')} className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded transition-colors cursor-pointer ${!hasValue ? 'text-zinc-500 italic' : ''}`}>
                        {hasValue ? String(block.value) : 'type...'}
                    </button>
                )
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
                                if (e.key === 'Enter') {
                                    if (showBetween) { onEditPart('value2'); }
                                    else onCommit();
                                }
                                if (e.key === 'Escape') onCommit();
                            }}
                            onBlur={() => { if (!showBetween) onCommit(); }}
                            placeholder="0"
                            className="w-[70px] bg-transparent text-white outline-none font-mono text-[13px] px-1.5 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    ) : (
                        <button
                            onClick={() => onEditPart('value')}
                            className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded transition-colors cursor-pointer ${!hasValue ? 'text-zinc-500 italic' : ''}`}
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
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') onCommit(); }}
                                    onBlur={() => onCommit()}
                                    placeholder="max"
                                    className="w-[70px] bg-transparent text-white outline-none font-mono text-[13px] px-1.5 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            ) : (
                                <button
                                    onClick={() => onEditPart('value2')}
                                    className={`px-1.5 py-1 font-mono text-[13px] text-white hover:bg-white/5 rounded transition-colors cursor-pointer ${!block.value2 && block.value2 !== 0 ? 'text-zinc-500 italic' : ''}`}
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
                className={`pr-2 pl-1 py-1.5 ${meta.color} opacity-40 hover:opacity-100 transition-opacity`}
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
                        className="absolute top-full left-0 mt-1.5 bg-[#0c0c0e] border border-zinc-800 rounded-lg shadow-xl p-1 z-[100] flex gap-0.5"
                    >
                        {OPS.map(op => (
                            <button
                                key={op.sym}
                                onClick={() => {
                                    onUpdate({ operator: op.sym });
                                    onEditPart('value');
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded-md font-mono text-[14px] transition-colors ${block.operator === op.sym ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                            >
                                {op.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Location Typeahead Popover ─────────────────── */}
            <AnimatePresence>
                {isEditing && editingPart === 'value' && block.field === 'location' && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 mt-1.5 w-52 bg-[#0c0c0e] border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-[100]"
                    >
                        <div className="max-h-[200px] overflow-y-auto">
                            {filteredCounties.length > 0 ? filteredCounties.map(county => (
                                <button
                                    key={county}
                                    onClick={() => { onUpdate({ value: county }); setLocationSearch(''); onCommit(); }}
                                    className="w-full text-left px-3 py-2 text-[12px] font-mono hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border-b border-zinc-900 last:border-0"
                                >
                                    <MapPin className="w-3 h-3 inline mr-2 opacity-50" />
                                    {county}
                                </button>
                            )) : (
                                <div className="px-3 py-3 text-[12px] text-zinc-600 font-mono">
                                    {locationSearch ? 'No match' : 'Type to search counties...'}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
