export interface OrderTaxData {
    id: string;
    latitude: number; // NY bounds: 40.5 to 45.0
    longitude: number; // NY bounds: -79.0 to -71.9
    subtotal: number;
    timestamp: string; // ISO format
    composite_tax_rate: number;
    tax_amount: number;
    total_amount: number;
    breakdown: {
        state_rate: number;
        county_rate: number;
        city_rate: number;
        special_rates: number;
    };
    jurisdictions: string[];
}
