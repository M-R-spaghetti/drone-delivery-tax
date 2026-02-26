import { OrderTaxData } from '../types';

export const generateMockData = (count: number = 1000): OrderTaxData[] => {
    const data: OrderTaxData[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        // NY bounds: 40.5 to 45.0
        const lat = 40.5 + Math.random() * 4.5;
        // NY bounds: -79.0 to -71.9
        const lng = -79.0 + Math.random() * 7.1;

        const subtotal = Math.floor(Math.random() * 50000) / 100 + 10;

        // Random dates within last 365 days
        const pastDate = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);

        const state_rate = 0.04;
        const county_rate = Math.random() > 0.5 ? 0.04 : 0.03;
        const city_rate = Math.random() > 0.7 ? 0.00875 : 0;
        const special_rates = Math.random() > 0.8 ? 0.00375 : 0;

        const composite = state_rate + county_rate + city_rate + special_rates;
        const tax = parseFloat((subtotal * composite).toFixed(2));

        const jurisdictions = ['New York State'];
        if (county_rate > 0) jurisdictions.push('County');
        if (city_rate > 0) jurisdictions.push('City');
        if (special_rates > 0) jurisdictions.push('Special District');

        data.push({
            id: `TRX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            latitude: lat,
            longitude: lng,
            subtotal,
            timestamp: pastDate.toISOString(),
            composite_tax_rate: parseFloat(composite.toFixed(5)),
            tax_amount: tax, // Fixed the variable reference to be just `tax`
            total_amount: parseFloat((subtotal + tax).toFixed(2)),
            breakdown: {
                state_rate,
                county_rate,
                city_rate,
                special_rates
            },
            jurisdictions
        });
    }

    // Sort by timestamp asc
    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const MOCK_ORDERS = generateMockData(1500);
