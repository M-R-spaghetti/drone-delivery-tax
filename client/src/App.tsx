import { useState } from 'react';
import CsvUpload from './components/CsvUpload';
import ManualOrderModal from './components/ManualOrderModal';
import OrdersTable from './components/OrdersTable';
import Layout from './components/Layout';

type Tab = 'orders' | 'upload';

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('orders');
    const [showModal, setShowModal] = useState(false);

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onNewOrder={() => setShowModal(true)}
        >
            {activeTab === 'orders' && <OrdersTable />}
            {activeTab === 'upload' && <CsvUpload />}
            <ManualOrderModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </Layout>
    );
}
