import {
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonInput,
  IonAlert,
  IonItemGroup,
  IonListHeader,
  IonList,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonText
} from '@ionic/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { key, add, create, trash, save } from 'ionicons/icons';
import { ChatService } from '../services/ChatService';

interface ModelConfiguration {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const ApiSettings: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<ModelConfiguration[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>('');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleSaveApiKey = async (apiKey: string) => {
    try {
      await ChatService.saveApiKey(apiKey);
      
      // Wait for the save operation to complete before reloading configs
      // Use a longer delay to ensure the data is properly saved
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload configs to reflect the updated API key
      await loadConfigs();
      
      // Double-check that the API key was saved correctly
      const configs = await ChatService.getModelConfigurations();
      const activeConfig = configs.find(p => p.id === activeConfigId);
      
      if (activeConfig && activeConfig.apiKey !== apiKey) {
        console.warn('API key verification failed in component - retrying save');
        // Try saving again
        await ChatService.saveApiKey(apiKey);
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadConfigs();
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
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
    // Don't allow deleting the default configurations
    const config = configs.find(p => p.id === configId);
    if (config && !['deepseek'].includes(config.id)) {
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
          console.warn('No configurations available after deletion');
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

        <IonItem>
          <IonLabel>{t('settings.activeConfig')}</IonLabel>
          <IonSelect
            value={activeConfigId}
            onIonChange={(e) => handleConfigChange(e.detail.value)}
            interface="popover"
            slot="end"
          >
            {configs.map((config) => (
              <IonSelectOption key={config.id} value={config.id}>
                {t(`providers.${config.id}`) !== `providers.${config.id}` 
                  ? t(`providers.${config.id}`) 
                  : config.name}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {activeConfig && (
          <IonCard className="ion-margin">
            <IonCardHeader>
              <IonCardTitle>
                {t(`providers.${activeConfig.id}`) !== `providers.${activeConfig.id}` 
                  ? t(`providers.${activeConfig.id}`) 
                  : activeConfig.name}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12">
                    <IonText>
                      <p><strong>{t('settings.baseUrl')}:</strong> {activeConfig.baseURL || t('settings.noApiKey')}</p>
                      <p><strong>{t('settings.modelName')}:</strong> {activeConfig.model || t('settings.noApiKey')}</p>
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonItem lines="none">
                      <IonLabel position="stacked">{t('settings.apiKey')}</IonLabel>
                      <IonInput
                        type="password"
                        value={activeConfig.apiKey}
                        placeholder={t('settings.enterApiKey')}
                        onIonChange={(e) => handleSaveApiKey(e.detail.value || '')}
                      />
                    </IonItem>
                    <IonText className="ion-padding-start">
                      <p className="ion-text-wrap">
                        {t('settings.apiKeyDescription')}
                      </p>
                    </IonText>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        <IonItem>
          <IonLabel>{t('settings.modelConfig')}</IonLabel>
          <IonButton
            fill="outline"
            slot="end"
            onClick={handleAddConfig}
          >
            <IonIcon icon={add} slot="start" />
            {t('settings.addConfig')}
          </IonButton>
        </IonItem>

        <IonList className="ion-margin-start">
          {configs.map((config) => (
            <IonItem key={config.id}>
              <IonLabel>
                {t(`providers.${config.id}`) !== `providers.${config.id}` 
                  ? t(`providers.${config.id}`) 
                  : config.name}
              </IonLabel>
              <IonButton
                fill="clear"
                onClick={() => handleEditConfig(config)}
              >
                <IonIcon icon={create} />
              </IonButton>
              {!['deepseek'].includes(config.id) && (
                <IonButton
                  fill="clear"
                  color="danger"
                  onClick={() => handleDeleteConfig(config.id)}
                >
                  <IonIcon icon={trash} />
                </IonButton>
              )}
            </IonItem>
          ))}
        </IonList>
      </IonItemGroup>

      {/* Add/Edit Configuration Modal */}
      <IonAlert
        isOpen={showAddEditModal}
        onDidDismiss={() => setShowAddEditModal(false)}
        header={isEditing ? t('settings.editConfig') : t('settings.addConfig')}
        inputs={[
          {
            name: 'name',
            type: 'text',
            placeholder: t('settings.configName'),
            value: editingConfig?.name
          },
          {
            name: 'baseURL',
            type: 'text',
            placeholder: t('settings.baseUrl'),
            value: editingConfig?.baseURL
          },
          {
            name: 'model',
            type: 'text',
            placeholder: t('settings.modelName'),
            value: editingConfig?.model
          },
          {
            name: 'apiKey',
            type: 'password',
            placeholder: t('settings.apiKey'),
            value: editingConfig?.apiKey
          }
        ]}
        buttons={[
          {
            text: t('common.cancel'),
            role: 'cancel'
          },
          {
            text: t('settings.save'),
            handler: (data) => {
              if (editingConfig) {
                saveConfig({
                  ...editingConfig,
                  name: data.name,
                  baseURL: data.baseURL,
                  model: data.model,
                  apiKey: data.apiKey
                });
              }
            }
          }
        ]}
      />

      {/* Delete Configuration Confirmation */}
      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header={t('settings.deleteConfig')}
        message={`${t('settings.confirmClearMessage')}`}
        buttons={[
          {
            text: t('common.cancel'),
            role: 'cancel'
          },
          {
            text: t('common.confirm'),
            handler: confirmDeleteConfig
          }
        ]}
      />
    </>
  );
};

export default ApiSettings;