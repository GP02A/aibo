import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonItemGroup, IonListHeader, IonLabel, IonIcon } from '@ionic/react';
import { key } from 'ionicons/icons';
import { ChatService } from '../services/ChatService';
import ConfigSelector from './api-settings/ConfigSelector';
import ActiveConfigDisplay from './api-settings/ActiveConfigDisplay';
import ConfigList from './api-settings/ConfigList';
import AddEditConfigModal from './api-settings/AddEditConfigModal';
import DeleteConfigModal from './api-settings/DeleteConfigModal';
import ValidationAlert from './api-settings/ValidationAlert';
import { ModelConfiguration } from './api-settings/types';
import { useConfig } from '../contexts/ConfigContext';

const ApiSettings: React.FC = () => {
  const { t } = useTranslation();
  const { configs, activeConfig, loadConfigs, handleConfigChange } = useConfig();
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Configuration state is now managed by ConfigContext

  const handleAddConfig = () => {
    setIsEditing(false);
    setEditingConfig({
      id: `custom-${Date.now()}`,
      name: '',
      baseURL: '',
      apiKey: '',
      model: '',
      advancedConfig: {
        temperature: 1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true,
        max_tokens: 2048
      },
      showAdvancedConfig: false
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
      if (activeConfig && activeConfig.id === editingConfig.id && updatedConfigs.length > 0) {
        // Select the first available configuration from the remaining ones
        await handleConfigChange(updatedConfigs[0].id);
      }

      // Reload configs after deletion
      loadConfigs();
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
      
      // If there's no active configuration or we're adding the first configuration,
      // automatically set the new configuration as active
      if (!activeConfig || configs.length === 0) {
        await handleConfigChange(config.id);
      } else {
        // Reload configs to reflect changes
        loadConfigs();
      }
      
      setShowAddEditModal(false);
      setEditingConfig(null);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  // Active configuration is now directly from context

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
          activeConfig={activeConfig} 
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

export default ApiSettings;