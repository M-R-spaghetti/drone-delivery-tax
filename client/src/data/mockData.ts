import { OrderTaxData } from '../types';

const JURISDICTIONS = [
    "New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse",
    "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"
];

const generateMockData = (count: number): OrderTaxData[] => {
    const data: OrderTaxData[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const subtotal = Math.floor(Math.random() * 500) + 50;
        const state_rate = 0.04;
        const county_rate = 0.04;
        const city_rate = Math.random() > 0.5 ? 0.00875 : 0;
        const special_rates = Math.random() > 0.7 ? 0.00375 : 0;

        const composite_tax_rate = state_rate + county_rate + city_rate + special_rates;
        const tax_amount = parseFloat((subtotal * composite_tax_rate).toFixed(2));
        const total_amount = subtotal + tax_amount;

        const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();

        data.push({
            id: `DRN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            latitude: 40.5 + Math.random() * 4.5,
            longitude: -79.0 + Math.random() * 7.1,
            subtotal,
            timestamp,
            composite_tax_rate,
            tax_amount,
            total_amount,
            breakdown: {
                state_rate,
                county_rate,
                city_rate,
                special_rates
            },
            jurisdictions: [
                JURISDICTIONS[Math.floor(Math.random() * JURISDICTIONS.length)],
                "New York State"
            ]
        });
    }

    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const mockOrders: OrderTaxData[] = generateMockData(50);
