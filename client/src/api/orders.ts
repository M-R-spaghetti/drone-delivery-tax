// ─── Types ──────────────────────────────────────────────────────

export interface Order {
    id: string;
    lat: string;
    lon: string;
    subtotal: string;
    timestamp: string;
    composite_tax_rate: string;
    tax_amount: string;
    total_amount: string;
    breakdown: {
        state_rate: string | null;
        county_rate: string | null;
        city_rate: string | null;
        special_rate: string | null;
    };
    jurisdictions_applied: {
        id: string;
        name: string;
        type: string;
        rate: string;
    }[];
    created_at: string;
}

export interface OrdersResponse {
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface OrdersParams {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    minRate?: number;
    maxRate?: number;
}

// ─── API Functions ──────────────────────────────────────────────

const API_BASE = '/api';

export async function fetchOrders(params: OrdersParams = {}): Promise<OrdersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params.minRate !== undefined) searchParams.set('minRate', String(params.minRate));
    if (params.maxRate !== undefined) searchParams.set('maxRate', String(params.maxRate));

    const res = await fetch(`${API_BASE}/orders?${searchParams}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch orders: ${res.status}`);
    }
    return res.json();
}

export async function createOrder(data: {
    lat: number;
    lon: number;
    subtotal: number;
    timestamp?: string;
}): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create order: ${res.status}`);
    }
    return res.json();
}

export async function importCsv(
    file: File
): Promise<{ message: string; imported: number; errors: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/orders/import`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `CSV import failed: ${res.status}`);
    }
    return res.json();
}
