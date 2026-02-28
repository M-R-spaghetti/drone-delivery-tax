import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

export interface CyberDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    align?: 'left' | 'right' | 'center';
}

const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function CyberDatePicker({
    value,
    onChange,
    placeholder = "YYYY-MM-DD",
    className = "",
    align = "left"
}: CyberDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Parse the current value, default to today if empty/invalid
    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr + "T00:00:00");
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const initialDate = parseDate(value);
    const [currentMonth, setCurrentMonth] = useState(initialDate);

    useEffect(() => {
        if (!isOpen && value) {
            setCurrentMonth(parseDate(value));
        }
    }, [value, isOpen]);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const numDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        // Find today's parts
        const todayObj = new Date();
        const tYear = todayObj.getFullYear();
        const tMonth = todayObj.getMonth();
        const tDate = todayObj.getDate();

        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let d = 1; d <= numDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            const isToday = tYear === year && tMonth === month && tDate === d;

            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => {
                        onChange(dateStr);
                        setIsOpen(false);
                    }}
                    className={`
                        w-8 h-8 flex items-center justify-center text-xs font-mono transition-all relative
                        border
                        ${isSelected ? 'bg-[#FFD700] border-[#FFD700] text-black font-bold shadow-[0_0_10px_rgba(255,215,0,0.5)] z-10' :
                            isToday ? 'border-[#FFD700]/80 text-[#FFD700] bg-[#FFD700]/10 hover:bg-[#FFD700]/30 z-10' :
                                'text-white bg-black hover:bg-[#71717A]/30 border-transparent hover:border-[#71717A]/50 z-0'}
                    `}
                >
                    {isSelected && (
                        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_4px_rgba(0,0,0,0.5)]"></div>
                    )}
                    {d}
                </button>
            );
        }
        return days;
    };

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between bg-[#09090B] border 
                    ${isOpen ? 'border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'border-[#FFD700] hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]'}
                    px-3 py-2 text-sm font-mono transition-all outline-none rounded-none uppercase tracking-widest
                    ${value ? 'text-white' : 'text-[#71717A]'}
                `}
            >
                {value ? value : placeholder}
                <Calendar className={`w-4 h-4 ml-2 transition-opacity ${isOpen ? 'opacity-100 text-[#FFD700]' : 'opacity-80'}`} />
            </button>

            {isOpen && (
                <div className={`
                    absolute top-full mt-2 z-[60] p-5 bg-[#050505]/95 backdrop-blur-xl border border-[#FFD700]/40
                    shadow-[0_0_40px_rgba(0,0,0,0.95),inset_0_0_15px_rgba(255,215,0,0.1)] min-w-[300px]
                    before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.03)_1px,transparent_1px)] before:bg-[size:10px_10px] before:pointer-events-none
                    after:content-[''] after:absolute after:top-0 after:left-0 after:w-2 after:h-2 after:border-t-2 after:border-l-2 after:border-[#FFD700]
                    ${align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'}
                `}>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#FFD700] pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.1),transparent_70%)] pointer-events-none"></div>

                    {/* Header */}
                    <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#71717A]/30 relative z-10">
                        <button
                            type="button"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                            className="text-[#71717A] hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-all p-1.5 border border-transparent hover:border-[#FFD700]/30"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="font-mono text-sm tracking-[0.2em] text-[#FFD700] font-bold uppercase drop-shadow-[0_0_5px_rgba(255,215,0,0.5)] flex items-center gap-2">
                            {monthNames[currentMonth.getMonth()]} <span className="text-white bg-[#71717A]/20 px-1.5 py-0.5 border border-[#71717A]/40">{currentMonth.getFullYear()}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                            className="text-[#71717A] hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-all p-1.5 border border-transparent hover:border-[#FFD700]/30"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1.5 mb-3 relative z-10 px-1">
                        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                            <div key={day} className="h-6 flex items-center justify-center text-[10px] font-mono text-[#71717A] tracking-widest border-b border-[#71717A]/20">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1.5 relative z-10 px-1">
                        {renderCalendar()}
                    </div>

                    {/* Bottom action */}
                    <div className="mt-6 pt-4 border-t border-[#71717A]/30 flex justify-between items-center relative z-10">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-mono text-[#71717A] hover:text-[#FFD700] bg-transparent hover:bg-[#FFD700]/5 border border-transparent hover:border-[#FFD700]/30 uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 transition-all"
                        >
                            <X className="w-3 h-3" /> CLEAR
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                onChange(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-mono text-black bg-[#FFD700] hover:bg-white border border-[#FFD700] hover:border-white shadow-[0_0_10px_rgba(255,215,0,0.3)] hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] px-4 py-1.5 uppercase tracking-widest transition-all font-black flex items-center gap-1.5"
                        >
                            <Calendar className="w-3 h-3" /> TODAY
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
