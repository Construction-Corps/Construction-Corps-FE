'use client';

import React, { useState, useEffect } from 'react';
import { Button, Space, Modal, Form, Input, Select, message, InputNumber, Divider, TreeSelect } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, QrcodeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { fetchInventory, createInventory, updateInventory, deleteInventory, fetchCategoryTree, generateQRCode } from '../../../utils/InventoryApi';
import ProtectedRoute from '../../../components/ProtectedRoute';
import QRCodeModal from '../../../components/QRCodeModal';
import ItemEditModal from '../../../components/ItemEditModal';
import InventoryTable from '../../../components/InventoryTable';
import ManualCheckoutModal from '../../../components/ManualCheckoutModal';
import { generatePrintSheet } from '../../../utils/printUtils';

const { Option } = Select;

const ItemsPage = () => {
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [qrcodes, setQrcodes] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrValue, setSelectedQrValue] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
  const [printForm] = Form.useForm();
  const [categorySearchValue, setCategorySearchValue] = useState('');
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);

  const [dataManager, setDataManager] = useState(null);

  const itemTypes = ['TOOL', 'SUPPLY', 'EQUIPMENT'];
  const itemConditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN'];

  useEffect(() => {
    fetchSupportingData();
  }, []);

  const fetchSupportingData = async () => {
    try {
      const [locationsData, categoriesData, categoryTreeData, qrcodesData] = await Promise.all([
        fetchInventory('locations'),
        fetchInventory('categories'),
        fetchCategoryTree(),
        fetchInventory('qrcodes')
      ]);
      setLocations(locationsData);
      setCategories(categoriesData);
      setCategoryTree(categoryTreeData);
      setQrcodes(qrcodesData);
    } catch (error) {
      message.error('Failed to fetch supporting data');
    }
  };

  const showEditModal = (item) => {
    setEditingItem(item);
    setIsEditModalVisible(true);
  };

  const showAddModal = () => {
    addForm.resetFields();
    setIsAddModalVisible(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalVisible(false);
    setEditingItem(null);
  };

  const handleEditModalSuccess = () => {
    // Refresh will be handled by the InventoryTable component
  };

  const handleAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      const newItem = await createInventory('items', values);
      message.success('Item created successfully');
      setIsAddModalVisible(false);
      addForm.resetFields();
      if (dataManager) {
        dataManager.addItem(newItem);
      }
    } catch (error) {
      message.error('Failed to create item');
    }
  };

  const handleAddCancel = () => {
    setIsAddModalVisible(false);
    addForm.resetFields();
  };

  const handleDelete = async (id) => {
    try {
      await deleteInventory('items', id);
      message.success('Item deleted successfully');
      if (dataManager) {
        dataManager.removeItem(id);
      }
    } catch (error) {
      message.error('Failed to delete item');
    }
  };

  const handleGenerateQRCode = async (itemId) => {
    try {
      const result = await generateQRCode(itemId);
      message.success('QR code generated successfully');
      if (dataManager) {
        dataManager.updateItem(itemId, result.item);
      }
      return result.item;
    } catch (error) {
      // Error already handled by the InventoryApi utility
    }
  };

  const createNewCategory = async (name) => {
    try {
      const newCategory = await createInventory('categories', { name });
      setCategories(prev => [...prev, newCategory]);
      const updatedCategoryTree = await fetchCategoryTree();
      setCategoryTree(updatedCategoryTree);
      setCategorySearchValue('');
      return newCategory;
    } catch (error) {
      message.error('Failed to create category');
      throw error;
    }
  };

  const createNewLocation = async (name) => {
    try {
      const newLocation = await createInventory('locations', { name });
      setLocations(prev => [...prev, newLocation]);
      setLocationSearchValue('');
      return newLocation;
    } catch (error) {
      message.error('Failed to create location');
      throw error;
    }
  };

  const getCategoryDisplayPath = (categoryId) => {
    if (!categoryId || !categories.length) return '—';
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return '—';
    return category.parent_name ? `${category.parent_name} → ${category.name}` : category.name;
  };

  const handleCategoriesUpdate = async (newCategory, updatedCategoryTree) => {
    if (newCategory) {
      setCategories(prev => [...prev.filter(cat => cat.id !== newCategory.id), newCategory]);
    }
    if (updatedCategoryTree) {
      setCategoryTree(updatedCategoryTree);
    }
    const [categoriesData, categoryTreeData] = await Promise.all([
      fetchInventory('categories'),
      fetchCategoryTree()
    ]);
    setCategories(categoriesData);
    setCategoryTree(categoryTreeData);
  };

  const handleLocationsUpdate = async (newLocation) => {
    if (newLocation) {
      setLocations(prev => [...prev.filter(loc => loc.id !== newLocation.id), newLocation]);
    }
    const locationsData = await fetchInventory('locations');
    setLocations(locationsData);
  };

  const handleCellSave = async (record, dataIndex, newValue) => {
    setEditingCell(null);
    setCategorySearchValue('');
    setLocationSearchValue('');
    
    if (dataIndex === 'storage_location') {
      if (newValue === record.storage_location?.id) return;
      try {
        const updatedItem = await updateInventory('items', record.id, { storage_location_id: newValue });
        message.success('Item updated');
        if (dataManager) {
          dataManager.updateItem(record.id, updatedItem);
        }
      } catch (error) {
        message.error('Update failed');
      }
    } else if (dataIndex === 'category') {
      if (newValue === record.category?.id) return;
      try {
        const updatedItem = await updateInventory('items', record.id, { category_id: newValue });
        message.success('Item updated');
        if (dataManager) {
          dataManager.updateItem(record.id, updatedItem);
        }
      } catch (error) {
        message.error('Update failed');
      }
    } else {
      if (newValue === record[dataIndex]) return;
      try {
        const updatedItem = await updateInventory('items', record.id, { [dataIndex]: newValue });
        message.success('Item updated');
        if (dataManager) {
          dataManager.updateItem(record.id, updatedItem);
        }
      } catch (error) {
        message.error('Update failed');
      }
    }
  };

  const editableTextRender = (dataIndex) => (text, record) => {
    if (editingCell && editingCell.id === record.id && editingCell.dataIndex === dataIndex) {
      return (
        <Input
          defaultValue={text}
          autoFocus
          onBlur={(e) => handleCellSave(record, dataIndex, e.target.value)}
          onPressEnter={(e) => handleCellSave(record, dataIndex, e.target.value)}
        />
      );
    }
    return text || '—';
  };

  const editableNumberRender = (dataIndex) => (text, record) => {
    if (editingCell && editingCell.id === record.id && editingCell.dataIndex === dataIndex) {
      return (
        <Input
          type="number"
          defaultValue={text}
          autoFocus
          onBlur={(e) => handleCellSave(record, dataIndex, Number(e.target.value))}
          onPressEnter={(e) => handleCellSave(record, dataIndex, Number(e.target.value))}
        />
      );
    }
    return text;
  };

  const editableSelectRender = (dataIndex, optionsArray) => (text, record) => {
    if (editingCell && editingCell.id === record.id && editingCell.dataIndex === dataIndex) {
      return (
        <Select
          defaultValue={text}
          style={{ width: 120 }}
          onBlur={() => setEditingCell(null)}
          onChange={(value) => handleCellSave(record, dataIndex, value)}
          options={optionsArray.map(o => ({ value: o, label: o }))}
          autoFocus
          open
        />
      );
    }
    return text;
  };

  const editableLocationRender = () => (text, record) => {
    if (editingCell && editingCell.id === record.id && editingCell.dataIndex === 'storage_location') {
      const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(locationSearchValue.toLowerCase())
      );
      
      return (
        <Select
          defaultValue={record.storage_location?.id}
          style={{ width: 200 }}
          onBlur={() => {
            setEditingCell(null);
            setLocationSearchValue('');
          }}
          onChange={async (value) => {
            if (value === 'CREATE_NEW') {
              try {
                const newLocation = await createNewLocation(locationSearchValue);
                setEditingCell(null);
                setLocationSearchValue('');
                const updatedItem = await updateInventory('items', record.id, { storage_location_id: newLocation.id });
                message.success('Item updated');
                if (dataManager) {
                  dataManager.updateItem(record.id, updatedItem);
                }
              } catch (error) {
                // Error handled in createNewLocation
              }
            } else {
              handleCellSave(record, 'storage_location', value);
            }
          }}
          onSearch={(value) => setLocationSearchValue(value)}
          showSearch
          filterOption={false}
          allowClear
          autoFocus
          open
          dropdownRender={(menu) => (
            <>
              {menu}
              {locationSearchValue && !filteredLocations.some(loc => loc.name.toLowerCase() === locationSearchValue.toLowerCase()) && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: '#1890ff'
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      try {
                        const newLocation = await createNewLocation(locationSearchValue);
                        setEditingCell(null);
                        setLocationSearchValue('');
                        const updatedItem = await updateInventory('items', record.id, { storage_location_id: newLocation.id });
                        message.success('Item updated');
                        if (dataManager) {
                          dataManager.updateItem(record.id, updatedItem);
                        }
                      } catch (error) {
                        // Error handled in createNewLocation
                      }
                    }}
                  >
                    <PlusOutlined /> Create "{locationSearchValue}"
                  </div>
                </>
              )}
            </>
          )}
        >
          {filteredLocations.map(loc => (
            <Option key={loc.id} value={loc.id}>{loc.name}</Option>
          ))}
        </Select>
      );
    }
    return text || '—';
  };

  const editableCategoryRender = () => (text, record) => {
    if (editingCell && editingCell.id === record.id && editingCell.dataIndex === 'category') {
      return (
        <TreeSelect
          treeData={categoryTree}
          value={record.category?.id}
          style={{ width: 300 }}
          onBlur={() => {
            setEditingCell(null);
            setCategorySearchValue('');
          }}
          onChange={async (value) => {
            if (value === 'CREATE_NEW') {
              try {
                const newCategory = await createNewCategory(categorySearchValue);
                setEditingCell(null);
                setCategorySearchValue('');
                const updatedItem = await updateInventory('items', record.id, { category_id: newCategory.id });
                message.success('Item updated');
                if (dataManager) {
                  dataManager.updateItem(record.id, updatedItem);
                }
              } catch (error) {
                // Error handled in createNewCategory
              }
            } else {
              handleCellSave(record, 'category', value);
            }
          }}
          onSearch={(value) => setCategorySearchValue(value)}
          showSearch
          filterTreeNode={(input, node) =>
            node.title.toLowerCase().includes(input.toLowerCase())
          }
          allowClear
          autoFocus
          open
          treeDefaultExpandAll
          dropdownRender={(menu) => (
            <>
              {menu}
              {categorySearchValue && !categories.some(cat => cat.name.toLowerCase() === categorySearchValue.toLowerCase()) && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: '#1890ff'
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      try {
                        const newCategory = await createNewCategory(categorySearchValue);
                        setEditingCell(null);
                        setCategorySearchValue('');
                        const updatedItem = await updateInventory('items', record.id, { category_id: newCategory.id });
                        message.success('Item updated');
                        if (dataManager) {
                          dataManager.updateItem(record.id, updatedItem);
                        }
                      } catch (error) {
                        // Error handled in createNewCategory
                      }
                    }}
                  >
                    <PlusOutlined /> Create "{categorySearchValue}"
                  </div>
                </>
              )}
            </>
          )}
        />
      );
    }
    return text || '—';
  };

  const openQr = (val) => {
    setSelectedQrValue(val);
    setQrModalOpen(true);
  };

  const showPrintModal = () => {
    printForm.setFieldsValue({ rows: 3, columns: 3, padding: 0.0 });
    setIsPrintModalVisible(true);
  };

  const handlePrintModalCancel = () => {
    setIsPrintModalVisible(false);
  };

  const handlePrint = async () => {
    try {
      const values = await printForm.validateFields();
      const { rows, columns, padding } = values;
      const selectedItems = dataManager ? dataManager.data.filter(item => selectedRowKeys.includes(item.id)) : [];
      
      message.loading({ content: 'Generating PDF...', key: 'pdf' });
      await generatePrintSheet({ items: selectedItems, rows, columns, padding });
      message.success({ content: 'PDF generated successfully!', key: 'pdf', duration: 2 });
      
      const qrCodesToUpdate = selectedItems
        .filter(item => item.qr_code && item.qr_code.id && !item.qr_code.is_printed)
        .map(item => item.qr_code.id);

      if (qrCodesToUpdate.length > 0) {
        message.loading({ content: `Marking ${qrCodesToUpdate.length} QR code(s) as printed...`, key: 'update_qr' });
        try {
          const updatePromises = qrCodesToUpdate.map(qrId => 
            updateInventory('qrcodes', qrId, { is_printed: true })
          );
          await Promise.all(updatePromises);
          message.success({ content: 'QR codes marked as printed.', key: 'update_qr', duration: 2 });
        } catch (updateError) {
          console.error('Failed to update QR code status:', updateError);
          message.error({ content: 'Failed to mark QR codes as printed.', key: 'update_qr', duration: 2 });
        }
      }

      setIsPrintModalVisible(false);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      message.error({ content: 'Failed to generate PDF', key: 'pdf', duration: 2 });
    }
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const columns = [
    { 
      title: 'Name', 
      dataIndex: 'name', 
      key: 'name', 
      sorter: true,
      width: 220,
      render: editableTextRender('name'),
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'name') {
            setEditingCell({ id: record.id, dataIndex: 'name' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Description', 
      dataIndex: 'description', 
      key: 'description',
      width: 150,
      render: editableTextRender('description'),
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'description') {
            setEditingCell({ id: record.id, dataIndex: 'description' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Category', 
      key: 'category',
      sorter: true,
      width: 180,
      filters: categories.map(cat => ({ text: cat.name, value: cat.id })),
      render: (_, record) => {
        const categoryDisplay = getCategoryDisplayPath(record.category?.id);
        return editableCategoryRender()(categoryDisplay, record);
      },
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'category') {
            setEditingCell({ id: record.id, dataIndex: 'category' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Type', 
      dataIndex: 'item_type', 
      key: 'item_type', 
      sorter: true,
      width: 100,
      filters: itemTypes.map(type => ({ text: type, value: type })),
      render: editableSelectRender('item_type', itemTypes),
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'item_type') {
            setEditingCell({ id: record.id, dataIndex: 'item_type' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Condition', 
      dataIndex: 'condition', 
      key: 'condition', 
      sorter: true,
      width: 100,
      filters: itemConditions.map(cond => ({ text: cond, value: cond })),
      render: editableSelectRender('condition', itemConditions),
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'condition') {
            setEditingCell({ id: record.id, dataIndex: 'condition' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Quantity', 
      dataIndex: 'quantity', 
      key: 'quantity', 
      sorter: true,
      width: 80,
      render: editableNumberRender('quantity'),
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'quantity') {
            setEditingCell({ id: record.id, dataIndex: 'quantity' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Stored At', 
      dataIndex: ['storage_location', 'name'], 
      key: 'storage_location',
      sorter: true,
      width: 150,
      filters: locations.map(loc => ({ text: loc.name, value: loc.id })),
      render: editableLocationRender(),
      onCell: (record) => ({
        onClick: () => {
          if (!editingCell || editingCell.id !== record.id || editingCell.dataIndex !== 'storage_location') {
            setEditingCell({ id: record.id, dataIndex: 'storage_location' });
          }
        },
        style: { cursor: 'pointer' }
      })
    },
    { 
      title: 'Last Known', 
      dataIndex: ['last_known_location', 'short_name'], 
      key: 'last_known_location',
      width: 120,
      render: (name, record) => name || '—' 
    },
    { 
      title: 'Checked Out By', 
      dataIndex: ['last_known_location', 'user_name'], 
      key: 'checked_out_by',
      width: 160,
      render: (name, record) => name || '—'
    },
    { 
      title: 'QR Code', 
      dataIndex: 'qr_code', 
      key: 'qr_code',
      width: 120,
      filters: [
        { text: 'Has QR Code', value: 'true' },
        { text: 'No QR Code', value: 'false' }
      ],
      render: (qr, record) => {
        if (qr && qr.id) {
          return <Button icon={<QrcodeOutlined />} onClick={() => openQr(qr.id)} />;
        } else {
          return <Button icon={<PlusOutlined />} onClick={() => handleGenerateQRCode(record.id)}/>;
        }
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showEditModal(record)}/>
          <Button 
            icon={<ShoppingCartOutlined />} 
            onClick={() => {
              setSelectedRowKeys([record.id]);
              setIsCheckoutModalVisible(true);
            }}
          />
          <Button style={{ marginRight: 0 }} icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}/>
        </Space>
      ),
    },
  ];

  const extraFilters = [
    {
      key: 'category',
      label: 'Category',
      type: 'multiselect',
      options: categories.map(cat => ({ value: cat.id, label: cat.name }))
    },
    {
      key: 'item_type',
      label: 'Item Type',
      type: 'multiselect',
      options: itemTypes.map(type => ({ value: type, label: type }))
    },
    {
      key: 'condition',
      label: 'Condition',
      type: 'multiselect',
      options: itemConditions.map(cond => ({ value: cond, label: cond }))
    },
    {
      key: 'quantity',
      label: 'Quantity Range',
      type: 'numberrange'
    },
    {
      key: 'storage_location',
      label: 'Storage Location',
      type: 'multiselect',
      options: locations.map(loc => ({ value: loc.id, label: loc.name }))
    },
    {
      key: 'qr_code__isnull',
      label: 'QR Code Status',
      type: 'select',
      options: [
        { value: 'false', label: 'Has QR Code' },
        { value: 'true', label: 'No QR Code' }
      ]
    }
  ];

  const additionalActions = [
    <Button
      key="add"
      type="primary"
      icon={<PlusOutlined />}
      onClick={showAddModal}
    >
      Add Item
    </Button>,
    <Button
      key="checkout"
      type="primary"
      icon={<ShoppingCartOutlined />}
      onClick={() => setIsCheckoutModalVisible(true)}
      disabled={!selectedRowKeys.length}
    >
      Manual Checkout ({selectedRowKeys.length})
    </Button>,
    <Button
      key="print"
      type="primary"
      onClick={showPrintModal}
      disabled={!selectedRowKeys.length}
    >
      Generate Print Sheet ({selectedRowKeys.length})
    </Button>
  ];

  return (
    <ProtectedRoute>
      <div style={{ padding: '50px' }}>
        <h1>Inventory Items</h1>
        
        <InventoryTable
          resource="items"
          columns={columns}
          searchPlaceholder="Search items by name, description, category, location..."
          extraFilters={extraFilters}
          additionalActions={additionalActions}
          onRowSelect={onSelectChange}
          onDataChange={setDataManager}
        />

        {/* Add Item Modal */}
        <Modal
          title="Add Item"
          open={isAddModalVisible}
          onOk={handleAddOk}
          onCancel={handleAddCancel}
          destroyOnClose
        >
          <Form form={addForm} layout="vertical" name="add_item_form">
            <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Please enter item name' }]}>
              <Input placeholder="Enter item name" autoFocus />
            </Form.Item>
          </Form>
        </Modal>
        
        {/* Edit Item Modal */}
        <ItemEditModal
          open={isEditModalVisible}
          onCancel={handleEditModalClose}
          onSuccess={handleEditModalSuccess}
          item={editingItem}
          categories={categories}
          categoryTree={categoryTree}
          locations={locations}
          qrcodes={qrcodes}
          itemTypes={itemTypes}
          itemConditions={itemConditions}
          onCategoriesUpdate={handleCategoriesUpdate}
          onLocationsUpdate={handleLocationsUpdate}
        />

        {/* Print Modal */}
        <Modal
          title="Configure Print Sheet"
          open={isPrintModalVisible}
          onOk={handlePrint}
          onCancel={handlePrintModalCancel}
          okText="Generate PDF"
        >
          <Form form={printForm} layout="vertical" name="print_form">
            <Form.Item name="rows" label="Rows per page" rules={[{ required: true }]}>
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="columns" label="Columns per page" rules={[{ required: true }]}>
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="padding" label="Page Padding (inches)" rules={[{ required: true }]}>
              <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
        
        {/* QR Code Modal */}
        <QRCodeModal open={qrModalOpen} onCancel={() => setQrModalOpen(false)} qrCodeValue={selectedQrValue} />
        
        {/* Manual Checkout Modal */}
        <ManualCheckoutModal
          open={isCheckoutModalVisible}
          onCancel={() => setIsCheckoutModalVisible(false)}
          onSuccess={(result) => {
            // Refresh the table data after successful checkout
            if (dataManager) {
              dataManager.refreshData();
            }
            setSelectedRowKeys([]);
          }}
          preselectedItems={dataManager ? dataManager.data.filter(item => selectedRowKeys.includes(item.id)) : []}
        />
      </div>
    </ProtectedRoute>
  );
};

export default ItemsPage; 