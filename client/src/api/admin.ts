// src/api/admin.ts
const API_URL = '/api';

export interface AdminStats {
    total_orders: string;
    total_jurisdictions: string;
    total_tax_rates: string;
    total_imports: string;
    last_import_date: string;
    db_size_bytes: string;
}

export interface HealthStatus {
    status: string;
    ping_ms: number;
    version: string;
}

export interface ImportLog {
    id: string;
    filename: string;
    file_hash: string;
    rows_imported: number;
    rows_failed: number;
    processing_time_ms: number;
    file_size_bytes: string;
    created_at: string;
}

export interface TaxRateHistory {
    rate_id: string;
    rate: string;
    valid_from: string;
    valid_to: string | null;
}

export interface JurisdictionRates {
    jurisdiction_id: string;
    name: string;
    type: string;
    rates: TaxRateHistory[];
}

export const adminApi = {
    getStats: async (): Promise<AdminStats> => {
        const res = await fetch(`${API_URL}/admin/stats`);
        if (!res.ok) throw new Error("Failed to fetch admin stats");
        return res.json();
    },

    getHealth: async (): Promise<HealthStatus> => {
        const res = await fetch(`${API_URL}/admin/health`);
        if (!res.ok) throw new Error("Failed to check system health");
        return res.json();
    },

    purgeAll: async (): Promise<{ message: string }> => {
        const res = await fetch(`${API_URL}/admin/purge-all`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to purge datastore");
        return res.json();
    },

    purgeDateRange: async (startDate: string, endDate: string) => {
        const params = new URLSearchParams({ startDate, endDate });
        const res = await fetch(`${API_URL}/admin/purge-date-range?${params}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to purge by date range");
        return res.json();
    },

    getImports: async (): Promise<ImportLog[]> => {
        const res = await fetch(`${API_URL}/admin/imports`);
        if (!res.ok) throw new Error("Failed to fetch import history");
        return res.json();
    },

    rollbackImport: async (id: string) => {
        const res = await fetch(`${API_URL}/admin/imports/${id}/rollback`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to rollback import");
        }
        return res.json();
    },

    getTaxRates: async (): Promise<JurisdictionRates[]> => {
        const res = await fetch(`${API_URL}/admin/tax-rates`);
        if (!res.ok) throw new Error("Failed to fetch tax rates");
        return res.json();
    },

    updateTaxRate: async (jurisdiction_id: string, new_rate: number, effective_date: string) => {
        const res = await fetch(`${API_URL}/admin/tax-rates/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jurisdiction_id, new_rate, effective_date }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to update tax rate");
        }
        return res.json();
    },
};
