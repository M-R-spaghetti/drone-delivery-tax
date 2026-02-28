import { Order } from '../api/orders';

export type TokenType = 'amount' | 'tax' | 'date' | 'text';

export interface ParsedToken {
    type: TokenType;
    value: string;
    raw: string;
    startIndex: number;
    endIndex: number;
}

export interface ParsedIntent {
    tokens: ParsedToken[];
    filters: {
        amount?: { operator: string; value: number };
        tax?: { operator: string; value: number };
        dateFrom?: string;
        dateTo?: string;
        text?: string;
    };
}

function parseAmount(val: string, filters: ParsedIntent['filters']) {
    const str = val.toLowerCase();
    let operator = '=';
    if (str.includes('>=')) operator = '>=';
    else if (str.includes('<=')) operator = '<=';
    else if (str.includes('>')) operator = '>';
    else if (str.includes('<')) operator = '<';
    else if (str.includes('over')) operator = '>';
    else if (str.includes('under')) operator = '<';

    const numStr = str.replace(/[^0-9.]/g, '');
    if (numStr === '') return;
    let num = parseFloat(numStr);
    // Only apply k/m multiplier when it appears right after the number (e.g. "500k", "$2.5m")
    if (/\d\s*k\b/.test(str)) num *= 1000;
    if (/\d\s*m\b/.test(str)) num *= 1000000;

    filters.amount = { operator, value: num };
}

function parseTax(val: string, filters: ParsedIntent['filters']) {
    const str = val.toLowerCase();
    let operator = '=';
    if (str.includes('>=')) operator = '>=';
    else if (str.includes('<=')) operator = '<=';
    else if (str.includes('>')) operator = '>';
    else if (str.includes('<')) operator = '<';
    else if (str.includes('over')) operator = '>';
    else if (str.includes('under')) operator = '<';

    const numStr = str.replace(/[^0-9.]/g, '');
    if (numStr === '') return;
    const num = parseFloat(numStr) / 100; // e.g. 4% -> 0.04

    filters.tax = { operator, value: num };
}

export function parseSearchQuery(query: string): ParsedIntent {
    const tokens: ParsedToken[] = [];
    const filters: ParsedIntent['filters'] = {};

    if (!query.trim()) {
        return { tokens: [{ type: 'text', value: '', raw: query, startIndex: 0, endIndex: query.length }], filters: {} };
    }

    const regexes = [
        {
            type: 'tax' as TokenType,
            regex: /(?:tax\s*(>|<|>=|<=|=)?\s*\d+(?:\.\d+)?%?)|(?:(>|<|>=|<=|=|over|under)?\s*\d+(?:\.\d+)?%\s*(?:tax)?)/gi
        },
        {
            type: 'amount' as TokenType,
            regex: /(?:(>|<|>=|<=|=|over|under)\s*\$?\d+(?:\.\d+)?(?:k|m)?)|(?:\$\d+(?:\.\d+)?(?:k|m)?)/gi
        },
        {
            type: 'date' as TokenType,
            regex: /\b(today|yesterday|this week|this month|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi
        }
    ];

    type Match = { type: TokenType; raw: string; start: number; end: number };
    const matches: Match[] = [];

    regexes.forEach(({ type, regex }) => {
        let match;
        // reset index
        regex.lastIndex = 0;
        while ((match = regex.exec(query)) !== null) {
            const start = match.index;
            const end = regex.lastIndex;
            // Overlap check
            const isOverlapping = matches.some(m =>
                (start >= m.start && start < m.end) ||
                (end > m.start && end <= m.end) ||
                (start <= m.start && end >= m.end)
            );
            if (!isOverlapping) {
                matches.push({ type, raw: match[0], start, end });
            }
        }
    });

    matches.sort((a, b) => a.start - b.start);

    let currentIndex = 0;
    matches.forEach(m => {
        if (m.start > currentIndex) {
            tokens.push({
                type: 'text',
                value: query.substring(currentIndex, m.start).trim(),
                raw: query.substring(currentIndex, m.start),
                startIndex: currentIndex,
                endIndex: m.start
            });
        }
        tokens.push({
            type: m.type,
            value: m.raw.trim(),
            raw: m.raw,
            startIndex: m.start,
            endIndex: m.end
        });
        currentIndex = m.end;
    });

    if (currentIndex < query.length) {
        tokens.push({
            type: 'text',
            value: query.substring(currentIndex).trim(),
            raw: query.substring(currentIndex),
            startIndex: currentIndex,
            endIndex: query.length
        });
    }

    let textFilter = '';
    tokens.forEach(t => {
        if (t.type === 'amount') parseAmount(t.value, filters);
        else if (t.type === 'tax') parseTax(t.value, filters);
        else if (t.type === 'date') {
            const dateStr = t.value.toLowerCase();
            const now = new Date();
            if (dateStr.includes('today')) {
                const today = now.toISOString().split('T')[0];
                filters.dateFrom = today;
                filters.dateTo = today;
            } else if (dateStr.includes('yesterday')) {
                const yest = new Date(now);
                yest.setDate(yest.getDate() - 1);
                const yesterday = yest.toISOString().split('T')[0];
                filters.dateFrom = yesterday;
                filters.dateTo = yesterday;
            } else if (dateStr.includes('this week')) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() + (6 - now.getDay()));
                filters.dateFrom = weekStart.toISOString().split('T')[0];
                filters.dateTo = weekEnd.toISOString().split('T')[0];
            } else if (dateStr.includes('this month')) {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                filters.dateFrom = monthStart.toISOString().split('T')[0];
                filters.dateTo = monthEnd.toISOString().split('T')[0];
            } else {
                // Try month names if matched
                const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                for (let i = 0; i < months.length; i++) {
                    if (dateStr.includes(months[i])) {
                        const monthStart = new Date(now.getFullYear(), i, 1);
                        const monthEnd = new Date(now.getFullYear(), i + 1, 0);
                        filters.dateFrom = monthStart.toISOString().split('T')[0];
                        filters.dateTo = monthEnd.toISOString().split('T')[0];
                        break;
                    }
                }
            }
        }
        else if (t.type === 'text' && t.value.trim()) {
            textFilter += (textFilter ? ' ' : '') + t.value.trim();
        }
    });

    if (textFilter) {
        // Remove common NLP filler words to improve Flexible Text/ILIKE matching against the DB
        const cleanedText = textFilter.replace(/\b(in|at|for|from|with|on|to|of|the|a|an)\b/gi, '').replace(/\s+/g, ' ').trim();
        filters.text = cleanedText ? cleanedText.toLowerCase() : textFilter.toLowerCase();
    }

    return { tokens, filters };
}

export function applySearchFilters(data: Order[], query: string): Order[] {
    const { filters } = parseSearchQuery(query);

    return data.filter(order => {
        // Evaluate Amount filter checking total_amount
        if (filters.amount) {
            const amt = parseFloat(order.total_amount);
            const target = filters.amount.value;
            const op = filters.amount.operator;
            if (op === '>' && !(amt > target)) return false;
            if (op === '<' && !(amt < target)) return false;
            if (op === '>=' && !(amt >= target)) return false;
            if (op === '<=' && !(amt <= target)) return false;
            if (op === '=' && Math.abs(amt - target) > 0.01) return false;
        }

        // Evaluate Tax filter checking composite_tax_rate
        if (filters.tax) {
            const tax = parseFloat(order.composite_tax_rate);
            const target = filters.tax.value;
            const op = filters.tax.operator;
            if (op === '>' && !(tax > target)) return false;
            if (op === '<' && !(tax < target)) return false;
            if (op === '>=' && !(tax >= target)) return false;
            if (op === '<=' && !(tax <= target)) return false;
            if (op === '=' && Math.abs(tax - target) > 0.0001) return false;
        }

        // Evaluate Date filter
        if (filters.dateFrom || filters.dateTo) {
            const ts = new Date(order.timestamp).getTime();
            if (filters.dateFrom) {
                const fromTs = new Date(filters.dateFrom).getTime();
                if (ts < fromTs) return false;
            }
            if (filters.dateTo) {
                // Add 1 day to dateTo for inclusive range
                const toDate = new Date(filters.dateTo);
                toDate.setDate(toDate.getDate() + 1);
                const toTs = toDate.getTime();
                if (ts >= toTs) return false;
            }
        }

        // Evaluate text filter (used for fuzzy location, generic IDs)
        if (filters.text) {
            const searchTerms = filters.text.split(/\s+/);
            const textMatches = searchTerms.every(term => {
                // Return true if location matches
                if (order.jurisdictions_applied.some(j => j.name.toLowerCase().includes(term))) return true;
                // Return true if ID matches
                if (order.id.toLowerCase().includes(term)) return true;
                return false;
            });
            if (!textMatches) return false;
        }

        return true;
    });
}
