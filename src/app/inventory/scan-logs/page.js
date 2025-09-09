'use client';

import React, { useState, useEffect } from 'react';
import { message, Tag, Button } from 'antd';
import { ReloadOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { fetchInventory, fetchUsers } from '../../../utils/InventoryApi';
import ProtectedRoute from '../../../components/ProtectedRoute';
import InventoryTable from '../../../components/InventoryTable';
import ManualCheckoutModal from '../../../components/ManualCheckoutModal';

const ScanLogsPage = () => {
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [dataManager, setDataManager] = useState(null);
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
  const [modalDefaults, setModalDefaults] = useState({ action: null, item: null, location_name: null });

  useEffect(() => {
    fetchSupportingData();
  }, []);
  
  const fetchSupportingData = async () => {
    try {
      const [usersData, itemsData] = await Promise.all([
        fetchUsers(),
        fetchInventory('items')
      ]);
      setUsers(usersData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to fetch supporting data:', error);
      // Fallback: fetch just items if users endpoint fails
      try {
        const itemsData = await fetchInventory('items');
        setItems(itemsData);
      } catch (itemsError) {
        message.error('Failed to fetch supporting data');
      }
    }
  };

  const refreshData = () => {
    fetchSupportingData();
    // Also refresh the main table data
    if (dataManager) {
      dataManager.refreshData();
    }
  };

  const columns = [
    { 
      title: 'Timestamp', 
      dataIndex: 'timestamp', 
      key: 'timestamp',
      sorter: true,
      render: (ts) => new Date(ts).toLocaleString(),
      width: 180,
    },
    { 
      title: 'Item', 
      key: 'item',
      sorter: true,
      render: (_, record) => {
        const itm = items.find(i => i.id === record.item);
        return itm ? (
          <div>
            <strong>{itm.name}</strong>
            {itm.category && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {itm.category.name}
              </div>
            )}
          </div>
        ) : `Item ID: ${record.item}`;
      },
    },
    { 
      title: 'User', 
      key: 'user',
      sorter: true,
      render: (_, record) => {
        const usr = users.find(u => u.id === record.user);
        if (usr) {
          const displayName = usr.first_name || usr.last_name ? 
            `${usr.first_name} ${usr.last_name}`.trim() : 
            usr.email;
          return (
            <div>
              <strong>{displayName}</strong>
              {usr.email && displayName !== usr.email && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {usr.email}
                </div>
              )}
            </div>
          );
        }
        return `User ID: ${record.user}`;
      },
    },
    { 
      title: 'Action', 
      dataIndex: 'action', 
      key: 'action',
      sorter: true,
      filters: [
        { text: 'Check In', value: 'CHECK_IN' },
        { text: 'Check Out', value: 'CHECK_OUT' },
        { text: 'Audit', value: 'AUDIT' }
      ],
      render: (action, record) => {
        let color = 'geekblue';
        if (action === 'CHECK_IN') color = 'green';
        if (action === 'CHECK_OUT') color = 'volcano';
        if (action === 'AUDIT') color = 'blue';
        const opposite = action === 'CHECK_OUT' ? 'CHECK_IN' : action === 'CHECK_IN' ? 'CHECK_OUT' : null;
        const tag = <Tag color={color}>{action.replace('_', ' ')}</Tag>;
        if (!opposite) return tag;
        return (
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const itm = items.find(i => i.id === record.item);
              setModalDefaults({ action: opposite, item: itm ? [itm] : [], location_name: record.location_name || null });
              setIsCheckoutModalVisible(true);
            }}
            title={`Click to ${opposite.replace('_', ' ').toLowerCase()}`}
          >
            {tag}
          </span>
        );
      },
      width: 120,
    },
    { 
      title: 'Location', 
      dataIndex: 'location_name', 
      key: 'location_name', 
      render: (val) => val || '—',
      ellipsis: true,
    },
    { 
      title: 'Coordinates', 
      key: 'coordinates',
      render: (_, record) => {
        if (record.latitude && record.longitude) {
          return (
            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
            </span>
          );
        }
        return '—';
      },
      width: 140,
    },
    { 
      title: 'JobTread Job', 
      dataIndex: 'jobtread_job_id', 
      key: 'jobtread_job_id', 
      render: (id) => id ? (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {id}
        </span>
      ) : '—',
      width: 120,
    },
  ];

  const extraFilters = [
    {
      key: 'user',
      label: 'User',
      type: 'multiselect',
      options: users.map(u => ({
        value: u.id,
        label: u.first_name || u.last_name ? 
          `${u.first_name} ${u.last_name}`.trim() : 
          u.email
      }))
    },
    {
      key: 'item',
      label: 'Item',
      type: 'multiselect',
      options: items.map(i => ({ value: i.id, label: i.name }))
    },
    {
      key: 'action',
      label: 'Action',
      type: 'multiselect',
      options: [
        { value: 'CHECK_IN', label: 'Check In' },
        { value: 'CHECK_OUT', label: 'Check Out' },
        { value: 'AUDIT', label: 'Audit' }
      ]
    },
    {
      key: 'timestamp',
      label: 'Date Range',
      type: 'daterange'
    },
    {
      key: 'jobtread_job_id',
      label: 'JobTread Job ID',
      type: 'text',
      placeholder: 'Enter Job ID'
    }
  ];

  const additionalActions = [
    <Button
      key="checkout"
      type="primary"
      icon={<ShoppingCartOutlined />}
      onClick={() => setIsCheckoutModalVisible(true)}
    >
      Manual Checkout
    </Button>,
    <Button
      key="refresh"
      icon={<ReloadOutlined />}
      onClick={refreshData}
    >
      Refresh Supporting Data
    </Button>
  ];

  return (
    <ProtectedRoute>
      <div style={{ padding: '50px' }}>
        <h1>Scan Logs</h1>
        
        <InventoryTable
          resource="scan-logs"
          columns={columns}
          searchPlaceholder="Search by item name, user, location, job ID..."
          extraFilters={extraFilters}
          additionalActions={additionalActions}
          defaultPageSize={25}
          onDataChange={setDataManager}
        />
        
        {/* Manual Checkout Modal */}
        <ManualCheckoutModal
          open={isCheckoutModalVisible}
          onCancel={() => setIsCheckoutModalVisible(false)}
          onSuccess={(result) => {
            // Refresh the table data after successful checkout
            if (dataManager) {
              dataManager.refreshData();
            }
          }}
          preselectedItems={modalDefaults.item || []}
          defaultAction={modalDefaults.action || undefined}
          defaultLocationName={modalDefaults.location_name || undefined}
        />
      </div>
    </ProtectedRoute>
  );
};

export default ScanLogsPage; 