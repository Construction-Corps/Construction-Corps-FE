import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Dropdown, Checkbox, Button, Input, Spin, Select } from 'antd';
import { SearchOutlined, ArrowUpOutlined, ArrowDownOutlined, FilterOutlined } from '@ant-design/icons';
import { fetchJobTread } from '@/utils/JobTreadApi';
import { useWindowSize } from './useWindowSize';

const FilterContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 50px;
  z-index: 10;
  display: flex;
  gap: 10px;
`;

const FilterButton = styled(Button)`
  // background: white;
  // border: 1px solid #d9d9d9;
  // box-shadow: 0 2px 0 rgba(0, 0, 0, 0.015);
  // border-radius: 4px;
  // display: flex;
  // align-items: center;
  // justify-content: center;
  // font-weight: 500;
  ${props => props.isMobile && `
    min-width: 36px;
    padding: 0 8px;
  `}
`;

const FilterMenu = styled.div`
  background: white;
  border-radius: 4px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
  padding: 8px;
  width: 250px;
  max-height: 400px;
  overflow-y: auto;
`;

const FilterOption = styled.div`
  padding: 6px 8px;
  display: flex;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const SearchInput = styled(Input)`
  width: ${props => props.isMobile ? '120px' : '200px'};
  border-radius: 4px;
`;

const FilterPanel = styled.div`
  background: white;
  border-radius: 4px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
  padding: ${props => props.isMobile ? '12px 8px' : '16px'};
  width: ${props => props.isMobile ? '100%' : '700px'};
  max-width: ${props => props.isMobile ? '100vw' : 'none'};
  display: flex;
  flex-direction: column;
  gap: ${props => props.isMobile ? '8px' : '12px'};
`;

const FilterRow = styled.div`
  display: flex;
  gap: ${props => props.isMobile ? '8px' : '12px'};
  flex-wrap: wrap;
  flex-direction: ${props => props.isMobile ? 'column' : 'row'};
`;

const FilterSection = styled.div`
  flex: 1;
  min-width: ${props => props.isMobile ? '100%' : '200px'};
`;

const SectionTitle = styled.div`
  font-weight: 500;
  margin-bottom: 8px;
  font-size: ${props => props.isMobile ? '14px' : '16px'};
`;

// Standard field IDs - centralized here only
const STANDARD_FIELDS = [
  { id: "22NwzQcjYUA4" }, // Stage
  { id: "22NwWybgjBTW" }, // Estimator
  { id: "22P2ZNybRiyG" }  // Manager
];

const JobStatusFilter = ({ 
  onFiltersChange,
  onFieldOptionsLoaded,
  customFieldId = null, // Additional field ID from parent
  defaultSelections = null,
  initialSelections = null,
  extraButtons = null,
  hideFilterOptions = [],
  skipStorageLoad = false // Skip loading from localStorage, always use defaults
}) => {
  const { isMobile } = useWindowSize();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for all field data
  const [fieldsData, setFieldsData] = useState([]);
  
  // Unified filter state
  const [filterState, setFilterState] = useState({
    search: "",
    sort: { field: "createdAt", order: "desc" }
  });
  
  // Helper to load from localStorage
  const loadFromStorage = (key, defaultValue) => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error('Error reading from localStorage', e);
      }
    }
    return defaultValue;
  };
  
  // Helper to save to localStorage
  const saveToStorage = (key, value) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing to localStorage', e);
      }
    }
  };
  
  // Initialize search and sort from localStorage
  useEffect(() => {
    setFilterState(prev => ({
      ...prev,
      search: skipStorageLoad ? '' : loadFromStorage('jobSearchTerm', ''),
      sort: skipStorageLoad ? { field: "createdAt", order: "desc" } : loadFromStorage('jobSortOptions', { field: "createdAt", order: "desc" })
    }));
  }, [skipStorageLoad]);
  
  // Fetch field data
  useEffect(() => {
    const fetchAllFields = async () => {
      setLoading(true);
      
      try {
        // Get all needed field IDs
        const fieldIds = [
          ...STANDARD_FIELDS.map(f => !hideFilterOptions.includes(f.id) ? f.id : null),
          // Add custom field if provided and not already included
          ...(customFieldId && !STANDARD_FIELDS.some(f => f.id === customFieldId) 
              ? [customFieldId] 
              : [])
        ];
        
        // Query all fields at once
        const query = {
          "organization": {
            "$": { "id": "22NwWhUAf6VB" },
            "id": {},
            "customFields": {
              "nodes": {
                "id": {},
                "name": {},
                "options": {}
              },
              "$": {
                "where": {
                  "or": fieldIds.map(id => ["id", "=", id])
                }
              }
            }
          }
        };
        
        const data = await fetchJobTread(query);
        
        if (data?.organization?.customFields?.nodes) {
          const fields = data.organization.customFields.nodes;
          setFieldsData(fields);
          
          // Initialize filter state for each field
          fields.forEach(field => {
            const storageKey = `jobFilter_${field.id}`;
            
            // Load values from localStorage or use defaults
            let defaultValues = [];
            // First, apply hardcoded fallback defaults for the 'Stage' field.
            if (field.name === 'Stage') {
              defaultValues = ["Job Started 🔨", "Job Mid Way ⚒️", "Job Complete ✅", 
                              "Pre-Production 🚧", "Awaiting Payment ⏲️"];
            }
            
            // Then, override with specific defaults from props if they exist for this field.
            if (Array.isArray(defaultSelections)) {
              const specificDefault = defaultSelections.find(d => d.fieldId === field.id);
              // A default object for this field was found in the array.
              if (specificDefault) {
                // Use the specific defaults. This can be an array of values or null to clear it.
                defaultValues = specificDefault.defaults;
              }
            }
            
            // Use defaults directly if skipStorageLoad is true, otherwise load from storage
            const values = skipStorageLoad ? defaultValues : loadFromStorage(storageKey, defaultValues);
            
            // Update filterState for this field using only its ID as the key
            setFilterState(prev => ({
              ...prev,
              [field.id]: values
            }));
          });
          
          // Create options object for backward compatibility
          const optionsObj = {
            fieldsData: fields
          };
          
          // Add field-specific options
          fields.forEach(field => {
            const key = `${field.id}_options`;
            optionsObj[key] = field.options || [];
            
            // Also add legacy keys for backward compatibility
            if (field.id === "22NwzQcjYUA4") { // Stage
              optionsObj.stageOptions = field.options || [];
            } else if (field.id === "22NwWybgjBTW") { // Estimator
              optionsObj.estimatorOptions = field.options || [];
            } else if (field.id === "22P2ZNybRiyG") { // Manager
              optionsObj.managerOptions = field.options || [];
            }
          });
          
          // Notify parent
          if (onFieldOptionsLoaded) {
            onFieldOptionsLoaded(optionsObj);
          }
        }
      } catch (error) {
        console.error("Error fetching fields:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllFields();
  }, [customFieldId, onFieldOptionsLoaded]);
  
  // Toggle value in a field
  const toggleFieldValue = (fieldId, stateKey, value) => {
    setFilterState(prev => {
      const currentValues = prev[fieldId] || []; // Use ID to get values
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      if (!skipStorageLoad) {
        saveToStorage(`jobFilter_${fieldId}`, newValues);
      }
      
      return { ...prev, [fieldId]: newValues }; // Only use ID as key
    });
  };
  
  // Select all values for a field
  const selectAllValues = (fieldId, stateKey, options) => {
    setFilterState(prev => {
      if (!skipStorageLoad) {
        saveToStorage(`jobFilter_${fieldId}`, options);
      }
      return { ...prev, [fieldId]: [...options] }; // Only use ID as key
    });
  };
  
  // Clear all values for a field
  const clearValues = (fieldId, stateKey) => {
    setFilterState(prev => {
      if (!skipStorageLoad) {
        saveToStorage(`jobFilter_${fieldId}`, []);
      }
      return { ...prev, [fieldId]: [] }; // Only use ID as key
    });
  };
  
  const handleSearchChange = (value) => {
    setFilterState(prev => ({
      ...prev,
      search: value
    }));
    if (!skipStorageLoad) {
      saveToStorage('jobSearchTerm', value);
    }
  };
  
  // Handle sort field change
  const handleSortFieldChange = (field) => {
    setFilterState(prev => {
      const newSort = { ...prev.sort, field };
      if (!skipStorageLoad) {
        saveToStorage('jobSortOptions', newSort);
      }
      return {
        ...prev,
        sort: newSort
      };
    });
  };
  
  // Toggle sort order
  const handleSortOrderToggle = () => {
    setFilterState(prev => {
      const newSort = { 
        ...prev.sort,
        order: prev.sort.order === 'asc' ? 'desc' : 'asc'
      };
      if (!skipStorageLoad) {
        saveToStorage('jobSortOptions', newSort);
      }
      return {
        ...prev,
        sort: newSort
      };
    });
  };
  
  // Get all possible sort fields
  const sortFields = [
    { label: "Created Date", value: "createdAt" },
    { label: "Updated Date", value: "updatedAt" },
    { label: "Job Name", value: "name" },
    // Add field-specific options
    // can't currently sort by custom fields so I commented it out
    // ...fieldsData.map(field => ({
    //   label: field.name,
    //   value: field.id
    // }))
  ];
  
  // Notify parent when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange(filterState); // Pass state directly
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filterState, onFiltersChange]);
  
  // Render field filter section
  const renderFieldFilter = (field) => {
    const stateKey = field.name.toLowerCase().replace(/\s+/g, '_');
    const values = filterState[field.id] || []; // Use ID to get values
    const options = field.options || [];
    
    return (
      <FilterSection isMobile={isMobile} key={field.id}>
        <SectionTitle isMobile={isMobile}>{field.name}</SectionTitle>
        <FilterRow>
          <Button onClick={() => selectAllValues(field.id, stateKey, options)} size="small" style={{ flex: 1 }}>Select All</Button>
          <Button onClick={() => clearValues(field.id, stateKey)} size="small" style={{ flex: 1 }}>Clear</Button>
        </FilterRow>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '2px', padding: '4px' }}>
          {options.map(option => (
            <FilterOption key={option} onClick={() => toggleFieldValue(field.id, stateKey, option)}>
              <Checkbox checked={values.includes(option)} />
              <span style={{ marginLeft: '8px' }}>{option}</span>
            </FilterOption>
          ))}
        </div>
      </FilterSection>
    );
  };
  
  return (
    <FilterContainer isMobile={isMobile}>
      {extraButtons}
      <SearchInput
        isMobile={isMobile}
        placeholder={isMobile ? "Search..." : "Search jobs..."}
        value={filterState.search}
        onChange={(e) => handleSearchChange(e.target.value)}
        prefix={<SearchOutlined />}
      />
      <Dropdown 
        overlay={
          <FilterPanel isMobile={isMobile}>
            <FilterRow isMobile={isMobile}>
              {/* Render all fields */}
              {fieldsData.map(field => renderFieldFilter(field))}
            </FilterRow>
            
            {/* Sort section */}
            <FilterRow isMobile={isMobile}>
              <FilterSection isMobile={isMobile}>
                <SectionTitle isMobile={isMobile}>Sort By</SectionTitle>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Select 
                    style={{ flex: 1 }}
                    value={filterState.sort.field}
                    onChange={handleSortFieldChange}
                    size={isMobile ? "small" : "middle"}
                  >
                    {sortFields.map(field => (
                      <Select.Option key={field.value} value={field.value}>
                        {field.label}
                      </Select.Option>
                    ))}
                  </Select>
                  
                  <Button 
                    icon={filterState.sort.order === 'asc' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    onClick={handleSortOrderToggle}
                    size={isMobile ? "small" : "middle"}
                  />
                </div>
              </FilterSection>
            </FilterRow>
          </FilterPanel>
        }
        trigger={['click']} 
        visible={open}
        onVisibleChange={setOpen}
        placement={isMobile ? "bottomRight" : "bottomLeft"}
      >
        <FilterButton isMobile={isMobile} onClick={() => setOpen(!open)}>
          {isMobile ? <FilterOutlined /> : "Filter"}
        </FilterButton>
      </Dropdown>
    </FilterContainer>
  );
};

export default JobStatusFilter;

