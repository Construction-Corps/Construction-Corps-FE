import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, InputNumber, Button, Space, Card, Typography, message, Divider, Tag } from 'antd';
import { PlusOutlined, MinusOutlined, UserOutlined, EnvironmentOutlined, AimOutlined } from '@ant-design/icons';
import { manualCheckout, fetchInventory, fetchPublicUsers } from '../utils/InventoryApi';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;

const ManualCheckoutModal = ({ 
  open, 
  onCancel, 
  onSuccess, 
  selectedItems = [],
  preselectedItems = [],
  defaultAction,
  defaultLocationName
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [itemQuantities, setItemQuantities] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchData();
      // Initialize with preselected items
      if (preselectedItems.length > 0) {
        const initialQuantities = {};
        const initialSelectedIds = new Set();
        preselectedItems.forEach(item => {
          initialQuantities[item.id] = item.quantity || 1;
          initialSelectedIds.add(item.id);
        });
        setItemQuantities(initialQuantities);
        setSelectedItemIds(initialSelectedIds);
      }
      
      // Set current user as default if available
      if (user?.id) {
        form.setFieldsValue({ user_id: user.id });
      }

      // Apply provided defaults
      if (defaultAction) {
        form.setFieldsValue({ action: defaultAction });
      }
      if (defaultLocationName) {
        form.setFieldsValue({ location_name: defaultLocationName });
      }
    }
  }, [open, preselectedItems, user, form, defaultAction, defaultLocationName]);

  const fetchData = async () => {
    try {
      const [itemsData, usersData] = await Promise.all([
        fetchInventory('items'),
        fetchPublicUsers()
      ]);
      setItems(itemsData);
      setUsers(usersData);
    } catch (error) {
      message.error('Failed to fetch data');
    }
  };

  const handleItemSelection = (itemId, checked) => {
    const newSelectedIds = new Set(selectedItemIds);
    if (checked) {
      newSelectedIds.add(itemId);
      setItemQuantities(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      newSelectedIds.delete(itemId);
      setItemQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[itemId];
        return newQuantities;
      });
    }
    setSelectedItemIds(newSelectedIds);
  };

  const handleQuantityChange = (itemId, quantity) => {
    setItemQuantities(prev => ({ ...prev, [itemId]: quantity }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setFieldsValue({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          message.success('Location captured successfully');
        },
        (error) => {
          message.warning('Could not get current location');
        }
      );
    } else {
      message.warning('Geolocation not supported');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Validate that at least one item is selected
      if (selectedItemIds.size === 0) {
        message.error('Please select at least one item to checkout');
        return;
      }
      
      // Build items array from selected items
      const itemsToCheckout = Array.from(selectedItemIds).map(itemId => ({
        item_id: itemId,
        quantity: itemQuantities[itemId] || 1
      }));

      const checkoutData = {
        items: itemsToCheckout,
        user_id: values.user_id,
        location_name: values.location_name,
        action: values.action || 'CHECK_OUT',
        ...(values.latitude && values.longitude && {
          latitude: values.latitude,
          longitude: values.longitude
        })
      };

      console.log('Submitting checkout data:', checkoutData);
      const result = await manualCheckout(checkoutData);
      
      message.success(`Successfully processed ${result.total_processed} items`);
      
      if (result.errors && result.errors.length > 0) {
        message.warning(`Some items had errors: ${result.errors.join(', ')}`);
      }

      onSuccess?.(result);
      handleCancel();
    } catch (error) {
      console.error('Checkout failed:', error);
      // Error message is handled by the API call
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedItemIds(new Set());
    setItemQuantities({});
    onCancel?.();
  };

  const getSelectedItems = () => {
    return items.filter(item => selectedItemIds.has(item.id));
  };

  const getTotalItems = () => {
    return Array.from(selectedItemIds).reduce((total, itemId) => {
      return total + (itemQuantities[itemId] || 1);
    }, 0);
  };

  return (
    <Modal
      title="Manual Checkout"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="Checkout Items"
      cancelText="Cancel"
      width={800}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ action: 'CHECK_OUT' }}>
        {/* User Selection */}
        <Form.Item 
          name="user_id" 
          label="User" 
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            placeholder="Select user"
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
                      {users.map(user => (
            <Option key={user.id} value={user.id}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ').trim() || `${user.id}`}
            </Option>
          ))}
          </Select>
        </Form.Item>

        {/* Action Selection */}
        <Form.Item name="action" label="Action">
          <Select>
            <Option value="CHECK_OUT">Check Out</Option>
            <Option value="CHECK_IN">Check In</Option>
            <Option value="AUDIT">Audit</Option>
          </Select>
        </Form.Item>

        {/* Location Information */}
        <Card size="small" title="Location Information" style={{ marginBottom: 16 }}>
          <Form.Item 
            name="location_name" 
            label="Location Name" 
            rules={[{ required: true, message: 'Please enter location name' }]}
          >
            <Input placeholder="e.g., Construction Site A, Downtown Project" />
          </Form.Item>
          
          <Space>
            <Form.Item name="latitude" label="Latitude">
              <InputNumber 
                placeholder="40.7128" 
                step="any" 
                style={{ width: 120 }}
              />
            </Form.Item>
            <Form.Item name="longitude" label="Longitude">
              <InputNumber 
                placeholder="-74.0060" 
                step="any" 
                style={{ width: 120 }}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                icon={<AimOutlined />} 
                onClick={getCurrentLocation}
                style={{ marginTop: 29 }}
              >
                Get Location
              </Button>
            </Form.Item>
          </Space>
        </Card>

        {/* Item Selection (hidden per UX request) */}
        {false && (
        <Card size="small" title="Select Items" style={{ marginBottom: 16 }}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {items.map(item => (
              <div key={item.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
                opacity: (!item.quantity || item.quantity <= 0) ? 0.6 : 1
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {item.description && `${item.description} • `}
                    {item.storage_location?.name && `Stored at: ${item.storage_location.name} • `}
                    <span style={{ color: (!item.quantity || item.quantity <= 0) ? '#ff4d4f' : '#52c41a' }}>
                      Available: {item.quantity || 0}
                    </span>
                  </div>
                </div>
                                 <Space>
                   {selectedItemIds.has(item.id) && (
                     <InputNumber
                       min={1}
                       max={item.quantity || 1}
                       value={itemQuantities[item.id] || 1}
                       onChange={(value) => handleQuantityChange(item.id, value)}
                       style={{ width: 80 }}
                       disabled={!item.quantity || item.quantity <= 0}
                     />
                   )}
                   <Button
                     type={selectedItemIds.has(item.id) ? 'primary' : 'default'}
                     size="small"
                     onClick={() => handleItemSelection(item.id, !selectedItemIds.has(item.id))}
                     disabled={!item.quantity || item.quantity <= 0}
                   >
                     {selectedItemIds.has(item.id) ? 'Selected' : 'Select'}
                   </Button>
                 </Space>
              </div>
            ))}
          </div>
        </Card>
        )}

        {/* Summary */}
        {selectedItemIds.size > 0 && (
          <Card size="small" title="Checkout Summary" style={{ marginBottom: 16 }}>
            <div>
              <Text strong>Selected Items: {selectedItemIds.size}</Text>
              <br />
              <Text strong>Total Quantity: {getTotalItems()}</Text>
              <Divider style={{ margin: '8px 0' }} />
              {getSelectedItems().map(item => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between', 
                  gap: 8,
                  marginBottom: '4px' 
                }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <Space>
                    <InputNumber 
                      min={1}
                      max={item.quantity || 9999}
                      value={itemQuantities[item.id] || 1}
                      onChange={(value) => handleQuantityChange(item.id, value)}
                      size="small"
                      style={{ width: 80 }}
                    />
                    <Button 
                      danger 
                      size="small" 
                      onClick={() => handleItemSelection(item.id, false)}
                    >
                      Remove
                    </Button>
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Form>
    </Modal>
  );
};

export default ManualCheckoutModal; 