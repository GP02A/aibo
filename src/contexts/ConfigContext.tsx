import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ChatService } from '../services/ChatService';
import { ModelConfiguration } from '../components/api-settings/types';

interface ConfigContextType {
  configs: ModelConfiguration[];
  activeConfig: ModelConfiguration | null;
  loadConfigs: () => Promise<void>;
  handleConfigChange: (configId: string) => Promise<void>;
  saveConfigs: (updatedConfigs: ModelConfiguration[]) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [configs, setConfigs] = useState<ModelConfiguration[]>([]);
  const [activeConfigId, setActiveConfigId] = useState('');
  const [activeConfig, setActiveConfig] = useState<ModelConfiguration | null>(null);

  // Load configurations on component mount
  useEffect(() => {
    loadConfigs();
    
    // Add event listeners for configuration changes
    const handleConfigChangeEvent = () => {
      loadConfigs();
    };
    
    document.addEventListener('modelConfigurationsChanged', handleConfigChangeEvent);
    document.addEventListener('activeConfigChanged', handleConfigChangeEvent);
    
    return () => {
      document.removeEventListener('modelConfigurationsChanged', handleConfigChangeEvent);
      document.removeEventListener('activeConfigChanged', handleConfigChangeEvent);
    };
  }, []);
  
  // Load model configurations
  const loadConfigs = async () => {
    try {
      const loadedConfigs = await ChatService.getModelConfigurations();
      setConfigs(loadedConfigs);
      
      const configId = await ChatService.getActiveConfigId();
      setActiveConfigId(configId);
      
      if (configId) {
        const config = loadedConfigs.find(c => c.id === configId) || null;
        setActiveConfig(config);
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  };
  
  // Handle configuration change
  const handleConfigChange = async (configId: string) => {
    try {
      await ChatService.setActiveConfigId(configId);
      setActiveConfigId(configId);
      
      const config = configs.find(c => c.id === configId) || null;
      setActiveConfig(config);
    } catch (error) {
      console.error('Failed to set active configuration:', error);
    }
  };

  // Save model configurations
  const saveConfigs = async (updatedConfigs: ModelConfiguration[]) => {
    try {
      await ChatService.saveModelConfigurations(updatedConfigs);
      // After saving, reload the configurations to ensure state is in sync
      await loadConfigs();
    } catch (error) {
      console.error('Failed to save configurations:', error);
      throw error;
    }
  };

  const value = {
    configs,
    activeConfig,
    loadConfigs,
    handleConfigChange,
    saveConfigs
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};