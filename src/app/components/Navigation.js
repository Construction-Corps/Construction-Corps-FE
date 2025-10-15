'use client';

import { useState } from 'react';
import { Button, Drawer, Menu, Divider, Spin } from 'antd';
import { MenuOutlined, LoginOutlined, LogoutOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

const Navigation = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { isAuthenticated, user, logout, visibleMenuItems, menuLoading } = useAuth();
  
  return (
    <>
      {/* Hamburger menu button */}
      <Button
        icon={<MenuOutlined />}
        onClick={() => setMenuVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 1000
        }}
      />
      
      {/* Navigation drawer */}
      <Drawer
        title="Navigation"
        placement="left"
        closable={true}
        onClose={() => setMenuVisible(false)}
        open={menuVisible}
        width={250}
      >
        <Menu mode="vertical">
          <Menu.Item key="home">
            <Link href="/">Home</Link>
          </Menu.Item>
          
          {/* Dynamic menu items based on context */}
          {isAuthenticated && menuLoading && (
            <Menu.Item key="loading" disabled>
              <Spin size="small" /> Loading items...
            </Menu.Item>
          )}
          {isAuthenticated && !menuLoading && visibleMenuItems.map(item => (
            <Menu.Item key={item.url || item.name}> {/* Use url or name as key */}
              <Link href={item.url}>{item.name}</Link>
            </Menu.Item>
          ))}

          {/* Hardcoded Inventory Menu */}
          {/* {isAuthenticated && (
            <Menu.ItemGroup key="inventory" title={<><AppstoreOutlined /> Inventory</>}>
              <Menu.Item key="/inventory/items">
                <Link href="/inventory/items">Items</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/categories">
                <Link href="/inventory/categories">Categories</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/locations">
                <Link href="/inventory/locations">Locations</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/qrcodes">
                <Link href="/inventory/qrcodes">QR Codes</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/scan-logs">
                <Link href="/inventory/scan-logs">Scan Logs</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/user-devices">
                <Link href="/inventory/user-devices">User Devices</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/device-registration-tokens">
                <Link href="/inventory/device-registration-tokens">Device Tokens</Link>
              </Menu.Item>
              <Menu.Item key="/inventory/scan">
                <Link href="/inventory/scan">Scan Simulator</Link>
              </Menu.Item>
            </Menu.ItemGroup>
          )} */}
        </Menu>
        
        <Divider style={{ margin: '24px 0 16px' }} />
        
        {/* Auth menu items */}
        <Menu mode="vertical">
          {isAuthenticated ? (
            <>
              <Menu.Item key="user" disabled style={{ color: '#1890ff' }}>
                <UserOutlined /> {user?.user?.name || user?.user?.email || 'User'}
              </Menu.Item>
              <Menu.Item key="logout" onClick={logout}>
                <LogoutOutlined /> Logout
              </Menu.Item>
            </>
          ) : (
            <Menu.Item key="login">
              <Link href="/login">
                <LoginOutlined /> Login
              </Link>
            </Menu.Item>
          )}
        </Menu>
        
        <Divider style={{ margin: '24px 0 16px' }} />
        
        <div style={{ padding: '0 16px' }}>
          <h4 style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Legal</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/privacy-policy" style={{ color: '#333', fontSize: '14px' }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ color: '#333', fontSize: '14px' }}>
              Terms of Service
            </Link>
            <Link href="/data-deletion" style={{ color: '#333', fontSize: '14px' }}>
              Data Deletion Request
            </Link>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default Navigation; 