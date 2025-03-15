import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IonItemGroup, IonListHeader, IonLabel, IonIcon } from '@ionic/react';
import { key } from 'ionicons/icons';
import { ChatService } from '../../services/ChatService';
import ConfigSelector from './ConfigSelector';
import ActiveConfigDisplay from './ActiveConfigDisplay';
import ConfigList from './ConfigList';
import AddEditConfigModal from './AddEditConfigModal';
import DeleteConfigModal from './DeleteConfigModal';
import ValidationAlert from './ValidationAlert';

export interface ModelConfiguration {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const ApiSettingsContainer: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<ModelConfiguration[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>('');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Load configurations and active configuration on component mount
  useEffect(() => {
    loadConfigs();
    loadActiveConfig();

    // Add event listeners for configuration changes
    const handleConfigChange = () => {
      loadConfigs();
      loadActiveConfig();
    };

    document.addEventListener('activeConfigChanged', handleConfigChange);
    document.addEventListener('apiKeyChanged', handleConfigChange);

    return () => {
      document.removeEventListener('activeConfigChanged', handleConfigChange);
      document.removeEventListener('apiKeyChanged', handleConfigChange);
    };
  }, []);

  const loadConfigs = async () => {
    try {
      const loadedConfigs = await ChatService.getModelConfigurations();
      setConfigs(loadedConfigs);
    } catch (error) {
      console.error('Failed to load model configurations:', error);
      // Continue with empty configs array rather than crashing
    }
  };

  const loadActiveConfig = async () => {
    try {
      const configId = await ChatService.getActiveConfigId();
      if (configId) {
        setActiveConfigId(configId);
      }
    } catch (error) {
      console.error('Failed to load active configuration:', error);
      // Default to first config if available
      if (configs.length > 0) {
        setActiveConfigId(configs[0].id);
      }
    }
  };

  const handleConfigChange = async (configId: string) => {
    try {
      await ChatService.setActiveConfigId(configId);
      setActiveConfigId(configId);
    } catch (error) {
      console.error('Failed to set active configuration:', error);
    }
  };

  const handleAddConfig = () => {
    setIsEditing(false);
    setEditingConfig({
      id: `custom-${Date.now()}`,
      name: '',
      baseURL: '',
      apiKey: '',
      model: ''
    });
    setShowAddEditModal(true);
  };

  const handleEditConfig = (config: ModelConfiguration) => {
    setIsEditing(true);
    setEditingConfig({ ...config });
    setShowAddEditModal(true);
  };

  const handleDeleteConfig = (configId: string) => {
    // Allow deleting any configuration
    const config = configs.find(p => p.id === configId);
    if (config) {
      setEditingConfig(config);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDeleteConfig = async () => {
    if (!editingConfig) return;

    try {
      // Filter out the configuration to delete
      const updatedConfigs = configs.filter(p => p.id !== editingConfig.id);
      await ChatService.saveModelConfigurations(updatedConfigs);

      // If the deleted configuration was active, switch to another available configuration
      if (activeConfigId === editingConfig.id) {
        if (updatedConfigs.length > 0) {
          // Select the first available configuration from the remaining ones
          const newActiveConfigId = updatedConfigs[0].id;
          await ChatService.setActiveConfigId(newActiveConfigId);
          setActiveConfigId(newActiveConfigId);
        } else {
          // If no configurations left, handle appropriately
          // Reset activeConfigId since there are no configurations
          setActiveConfigId('');
        }
      }

      setConfigs(updatedConfigs);
      setShowDeleteConfirm(false);
      setEditingConfig(null);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
    }
  };

  const saveConfig = async (config: ModelConfiguration) => {
    try {
      // Validate that name is not empty
      if (!config.name.trim()) {
        // Show validation alert instead of browser alert
        setValidationMessage(t('settings.nameRequired'));
        setShowValidationAlert(true);
        return;
      }
      
      let updatedConfigs;
      
      if (isEditing) {
        // Update existing configuration
        updatedConfigs = configs.map(p => 
          p.id === config.id ? config : p
        );
      } else {
        // Add new configuration
        updatedConfigs = [...configs, config];
      }
      
      await ChatService.saveModelConfigurations(updatedConfigs);
      setConfigs(updatedConfigs);
      
      // If there's no active configuration or we're adding the first configuration,
      // automatically set the new configuration as active
      if (!activeConfigId || activeConfigId === '' || configs.length === 0) {
        await ChatService.setActiveConfigId(config.id);
        setActiveConfigId(config.id);
      }
      
      setShowAddEditModal(false);
      setEditingConfig(null);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  // Find the active configuration
  const activeConfig = configs.find(p => p.id === activeConfigId);

  return (
    <>
      <IonItemGroup>
        <IonListHeader>
          <IonLabel>
            <IonIcon icon={key} className="ion-margin-end" />
            {t('settings.apiSettings')}
          </IonLabel>
        </IonListHeader>

        <ConfigSelector 
          configs={configs} 
          activeConfigId={activeConfigId} 
          onConfigChange={handleConfigChange} 
        />

        {activeConfig && (
          <ActiveConfigDisplay 
            activeConfig={activeConfig} 
            onEditConfig={handleEditConfig} 
          />
        )}

        <ConfigList 
          configs={configs} 
          onAddConfig={handleAddConfig} 
          onEditConfig={handleEditConfig} 
          onDeleteConfig={handleDeleteConfig} 
        />
      </IonItemGroup>

      {/* Modals */}
      <AddEditConfigModal 
        isOpen={showAddEditModal}
        isEditing={isEditing}
        config={editingConfig}
        onDismiss={() => setShowAddEditModal(false)}
        onSave={saveConfig}
      />

      <DeleteConfigModal 
        isOpen={showDeleteConfirm}
        onDismiss={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteConfig}
      />

      <ValidationAlert 
        isOpen={showValidationAlert}
        message={validationMessage}
        onDismiss={() => setShowValidationAlert(false)}
      />
    </>
  );
};

export default ApiSettingsContainer;