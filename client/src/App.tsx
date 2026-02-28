import { useState } from 'react';
import CsvUpload from './components/CsvUpload';
import ManualOrderModal from './components/ManualOrderModal';
import OrdersTable from './components/OrdersTable';
import Layout from './components/Layout';
import StatsDashboard from './components/stats/StatsDashboard';
import AdminConsole from './components/AdminConsole';

type Tab = 'stats' | 'orders' | 'upload' | 'admin';

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('stats');
    const [showModal, setShowModal] = useState(false);

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onNewOrder={() => setShowModal(true)}
        >
            {activeTab === 'stats' && <StatsDashboard />}
            {activeTab === 'orders' && <OrdersTable />}
            {activeTab === 'upload' && <CsvUpload />}
            {activeTab === 'admin' && <AdminConsole />}
            <ManualOrderModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </Layout>
    );
}
