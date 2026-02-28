// ============================================================================
// ADVANCED ACCOUNTING TIME FILTER — TYPE DEFINITIONS & EXPORTS
// ============================================================================

export type FilterType =
    | 'ALL'                 // All time
    | '24H' | '7D' | '30D' | '90D'  // Rolling windows
    | 'MTD' | 'QTD' | 'YTD'         // To-date snapshots
    | 'MONTH'              // Specific calendar month
    | 'QUARTER'            // Standard fiscal quarter (Q1-Q4)
    | 'YEAR'               // Full calendar year
    | 'NYS_QUARTER'        // NYS sales tax quarter (Mar 1 cycle)
    | 'CUSTOM_RANGE';      // Start date → End date

export interface TimeFilterConfig {
    type: FilterType;
    dateStr?: string;       // 'YYYY-MM' for month, 'YYYY' for year
    quarter?: number;       // 1-4 for QUARTER/NYS_QUARTER
    year?: number;          // Year selector
    startDate?: string;     // Custom range start (YYYY-MM-DD)
    endDate?: string;       // Custom range end (YYYY-MM-DD)
}

// ============================================================================
// NYS SALES TAX QUARTER DEFINITIONS
// ============================================================================
export const NYS_QUARTERS = [
    { q: 1, label: 'MAR–MAY', startMonth: 2, startDay: 1, endMonth: 4, endDay: 31, filing: 'JUN 20' },
    { q: 2, label: 'JUN–AUG', startMonth: 5, startDay: 1, endMonth: 7, endDay: 31, filing: 'SEP 20' },
    { q: 3, label: 'SEP–NOV', startMonth: 8, startDay: 1, endMonth: 10, endDay: 30, filing: 'DEC 20' },
    { q: 4, label: 'DEC–FEB', startMonth: 11, startDay: 1, endMonth: 1, endDay: 28, filing: 'MAR 20' },
] as const;

// ============================================================================
// DATE RANGE RESOLVER — converts any TimeFilterConfig into { start, end }
// ============================================================================
export function resolveFilterDateRange(config: TimeFilterConfig): { start: Date | null; end: Date | null } {
    const now = new Date();
    // "today" end-of-day in UTC to match ISO timestamp comparisons
    const todayEndUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    switch (config.type) {
        case 'ALL':
            return { start: null, end: null };

        case '24H':
            return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: todayEndUTC };

        case '7D':
            return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: todayEndUTC };

        case '30D':
            return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: todayEndUTC };

        case '90D':
            return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: todayEndUTC };

        case 'MTD': {
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            return { start, end: todayEndUTC };
        }

        case 'QTD': {
            const qMonth = Math.floor(now.getUTCMonth() / 3) * 3;
            return { start: new Date(Date.UTC(now.getUTCFullYear(), qMonth, 1)), end: todayEndUTC };
        }

        case 'YTD':
            return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: todayEndUTC };

        case 'MONTH': {
            if (!config.dateStr) return { start: null, end: null };
            const [y, m] = config.dateStr.split('-').map(Number);
            // UTC: first millisecond of month → last millisecond of month
            const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
            const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // day 0 of next month = last day of this month
            return { start, end };
        }

        case 'QUARTER': {
            const year = config.year || now.getUTCFullYear();
            const q = config.quarter || 1;
            const startMonth = (q - 1) * 3;
            const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
            const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
            return { start, end };
        }

        case 'YEAR': {
            const year = config.year || now.getUTCFullYear();
            return {
                start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
                end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
            };
        }

        case 'NYS_QUARTER': {
            const year = config.year || now.getUTCFullYear();
            const q = config.quarter || 1;
            const nysQ = NYS_QUARTERS[q - 1];
            let start: Date, end: Date;

            if (q === 4) {
                // DEC of year → FEB of next year
                start = new Date(Date.UTC(year, nysQ.startMonth, nysQ.startDay, 0, 0, 0, 0));
                end = new Date(Date.UTC(year + 1, nysQ.endMonth, nysQ.endDay, 23, 59, 59, 999));
            } else {
                start = new Date(Date.UTC(year, nysQ.startMonth, nysQ.startDay, 0, 0, 0, 0));
                end = new Date(Date.UTC(year, nysQ.endMonth, nysQ.endDay, 23, 59, 59, 999));
            }
            return { start, end };
        }

        case 'CUSTOM_RANGE': {
            // Parse as UTC explicitly to avoid timezone shifts
            const start = config.startDate ? new Date(config.startDate + 'T00:00:00.000Z') : null;
            const end = config.endDate ? new Date(config.endDate + 'T23:59:59.999Z') : null;
            return { start, end };
        }

        default:
            return { start: null, end: null };
    }
}

// ============================================================================
// FILTER LABEL GENERATOR
// ============================================================================
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function getFilterLabel(config: TimeFilterConfig): string {
    switch (config.type) {
        case 'ALL': return 'ALL TIME';
        case '24H': return 'T-24H';
        case '7D': return 'T-7D';
        case '30D': return 'T-30D';
        case '90D': return 'T-90D';
        case 'MTD': return 'MTD';
        case 'QTD': return 'QTD';
        case 'YTD': return 'YTD';
        case 'MONTH': {
            if (!config.dateStr) return 'MONTH';
            const [y, m] = config.dateStr.split('-').map(Number);
            return `${MONTH_NAMES[m - 1]} ${y}`;
        }
        case 'QUARTER':
            return `Q${config.quarter || 1}·${config.year || new Date().getFullYear()}`;
        case 'YEAR':
            return `FY ${config.year || new Date().getFullYear()}`;
        case 'NYS_QUARTER': {
            const q = config.quarter || 1;
            return `NYS_Q${q} ${config.year || new Date().getFullYear()}`;
        }
        case 'CUSTOM_RANGE':
            return config.startDate && config.endDate
                ? `${config.startDate} → ${config.endDate}`
                : 'CUSTOM';
        default: return 'FILTER';
    }
}
