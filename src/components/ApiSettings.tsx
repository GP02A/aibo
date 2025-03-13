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
  IonItemDivider,
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

interface ApiProvider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const ApiSettings: React.FC = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>('');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load providers and active provider on component mount
  useEffect(() => {
    loadProviders();
    loadActiveProvider();

    // Add event listeners for provider changes
    const handleProviderChange = () => {
      loadProviders();
      loadActiveProvider();
    };

    document.addEventListener('activeProviderChanged', handleProviderChange);
    document.addEventListener('apiKeyChanged', handleProviderChange);

    return () => {
      document.removeEventListener('activeProviderChanged', handleProviderChange);
      document.removeEventListener('apiKeyChanged', handleProviderChange);
    };
  }, []);

  const loadProviders = async () => {
    try {
      const loadedProviders = await ChatService.getApiProviders();
      setProviders(loadedProviders);
    } catch (error) {
      console.error('Failed to load API providers:', error);
      // Continue with empty providers array rather than crashing
    }
  };

  const loadActiveProvider = async () => {
    try {
      const providerId = await ChatService.getActiveProviderId();
      if (providerId) {
        setActiveProviderId(providerId);
      }
    } catch (error) {
      console.error('Failed to load active provider:', error);
      // Default to first provider if available
      if (providers.length > 0) {
        setActiveProviderId(providers[0].id);
      }
    }
  };

  const handleProviderChange = async (providerId: string) => {
    try {
      await ChatService.setActiveProviderId(providerId);
      setActiveProviderId(providerId);
    } catch (error) {
      console.error('Failed to set active provider:', error);
    }
  };

  const handleSaveApiKey = async (apiKey: string) => {
    try {
      await ChatService.saveApiKey(apiKey);
      loadProviders(); // Reload providers to reflect the updated API key
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const handleAddProvider = () => {
    setIsEditing(false);
    setEditingProvider({
      id: `custom-${Date.now()}`,
      name: '',
      baseURL: '',
      apiKey: '',
      model: ''
    });
    setShowAddEditModal(true);
  };

  const handleEditProvider = (provider: ApiProvider) => {
    setIsEditing(true);
    setEditingProvider({ ...provider });
    setShowAddEditModal(true);
  };

  const handleDeleteProvider = (providerId: string) => {
    // Don't allow deleting the default providers
    const provider = providers.find(p => p.id === providerId);
    if (provider && !['deepseek', 'openai', 'openrouter', 'custom'].includes(provider.id)) {
      setEditingProvider(provider);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDeleteProvider = async () => {
    if (!editingProvider) return;

    try {
      // Filter out the provider to delete
      const updatedProviders = providers.filter(p => p.id !== editingProvider.id);
      await ChatService.saveApiProviders(updatedProviders);

      // If the deleted provider was active, switch to deepseek
      if (activeProviderId === editingProvider.id) {
        await ChatService.setActiveProviderId('deepseek');
        setActiveProviderId('deepseek');
      }

      setProviders(updatedProviders);
      setShowDeleteConfirm(false);
      setEditingProvider(null);
    } catch (error) {
      console.error('Failed to delete provider:', error);
    }
  };

  const saveProvider = async (provider: ApiProvider) => {
    try {
      let updatedProviders;
      
      if (isEditing) {
        // Update existing provider
        updatedProviders = providers.map(p => 
          p.id === provider.id ? provider : p
        );
      } else {
        // Add new provider
        updatedProviders = [...providers, provider];
      }
      
      await ChatService.saveApiProviders(updatedProviders);
      setProviders(updatedProviders);
      setShowAddEditModal(false);
      setEditingProvider(null);
    } catch (error) {
      console.error('Failed to save provider:', error);
    }
  };

  // Find the active provider
  const activeProvider = providers.find(p => p.id === activeProviderId);

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
          <IonLabel>{t('settings.activeProvider')}</IonLabel>
          <IonSelect
            value={activeProviderId}
            onIonChange={(e) => handleProviderChange(e.detail.value)}
            interface="popover"
            slot="end"
          >
            {providers.map((provider) => (
              <IonSelectOption key={provider.id} value={provider.id}>
                {t(`providers.${provider.id}`) !== `providers.${provider.id}` 
                  ? t(`providers.${provider.id}`) 
                  : provider.name}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {activeProvider && (
          <IonCard className="ion-margin">
            <IonCardHeader>
              <IonCardTitle>
                {t(`providers.${activeProvider.id}`) !== `providers.${activeProvider.id}` 
                  ? t(`providers.${activeProvider.id}`) 
                  : activeProvider.name}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12">
                    <IonText>
                      <p><strong>{t('settings.baseUrl')}:</strong> {activeProvider.baseURL || t('settings.noApiKey')}</p>
                      <p><strong>{t('settings.modelName')}:</strong> {activeProvider.model || t('settings.noApiKey')}</p>
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12">
                    <IonItem lines="none">
                      <IonLabel position="stacked">{t('settings.apiKey')}</IonLabel>
                      <IonInput
                        type="password"
                        value={activeProvider.apiKey}
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
          <IonLabel>{t('settings.apiProviders')}</IonLabel>
          <IonButton
            fill="outline"
            slot="end"
            onClick={handleAddProvider}
          >
            <IonIcon icon={add} slot="start" />
            {t('settings.addProvider')}
          </IonButton>
        </IonItem>

        <IonList className="ion-margin-start">
          {providers.map((provider) => (
            <IonItem key={provider.id}>
              <IonLabel>
                {t(`providers.${provider.id}`) !== `providers.${provider.id}` 
                  ? t(`providers.${provider.id}`) 
                  : provider.name}
              </IonLabel>
              <IonButton
                fill="clear"
                onClick={() => handleEditProvider(provider)}
              >
                <IonIcon icon={create} />
              </IonButton>
              {!['deepseek', 'openai', 'openrouter', 'custom'].includes(provider.id) && (
                <IonButton
                  fill="clear"
                  color="danger"
                  onClick={() => handleDeleteProvider(provider.id)}
                >
                  <IonIcon icon={trash} />
                </IonButton>
              )}
            </IonItem>
          ))}
        </IonList>
      </IonItemGroup>

      {/* Add/Edit Provider Modal */}
      <IonAlert
        isOpen={showAddEditModal}
        onDidDismiss={() => setShowAddEditModal(false)}
        header={isEditing ? t('settings.editProvider') : t('settings.addProvider')}
        inputs={[
          {
            name: 'name',
            type: 'text',
            placeholder: t('settings.providerName'),
            value: editingProvider?.name
          },
          {
            name: 'baseURL',
            type: 'text',
            placeholder: t('settings.baseUrl'),
            value: editingProvider?.baseURL
          },
          {
            name: 'model',
            type: 'text',
            placeholder: t('settings.modelName'),
            value: editingProvider?.model
          },
          {
            name: 'apiKey',
            type: 'password',
            placeholder: t('settings.apiKey'),
            value: editingProvider?.apiKey
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
              if (editingProvider) {
                saveProvider({
                  ...editingProvider,
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

      {/* Delete Confirmation */}
      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header={t('settings.deleteProvider')}
        message={`${t('settings.confirmClearMessage')}`}
        buttons={[
          {
            text: t('common.cancel'),
            role: 'cancel'
          },
          {
            text: t('common.confirm'),
            handler: confirmDeleteProvider
          }
        ]}
      />
    </>
  );
};

export default ApiSettings;