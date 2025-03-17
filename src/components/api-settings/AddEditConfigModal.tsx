import { useState, useEffect } from 'react';
import { 
  IonModal, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonToggle, 
  IonButton, 
  IonRange, 
  IonText,
  IonIcon,
  IonList,
  IonNote,
  IonCard,
  IonCardContent
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { ModelConfiguration } from './types';
import { caretDown, caretUp, warning } from 'ionicons/icons';

interface AddEditConfigModalProps {
  isOpen: boolean;
  isEditing: boolean;
  config: ModelConfiguration | null;
  onDismiss: () => void;
  onSave: (config: ModelConfiguration) => void;
}

const AddEditConfigModal: React.FC<AddEditConfigModalProps> = ({
  isOpen,
  isEditing,
  config,
  onDismiss,
  onSave
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(config?.name || '');
  const [baseURL, setBaseURL] = useState(config?.baseURL || '');
  const [model, setModel] = useState(config?.model || '');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [showAdvanced, setShowAdvanced] = useState(config?.showAdvancedConfig || false);
  
  // Advanced configuration state
  const [temperature, setTemperature] = useState(config?.advancedConfig?.temperature || 1);
  const [topP, setTopP] = useState(config?.advancedConfig?.top_p || 1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(config?.advancedConfig?.frequency_penalty || 0);
  const [presencePenalty, setPresencePenalty] = useState(config?.advancedConfig?.presence_penalty || 0);
  const [maxTokens, setMaxTokens] = useState(config?.advancedConfig?.max_tokens || 2048);
  const [streamResponse, setStreamResponse] = useState(config?.advancedConfig?.stream !== false);

  // Reset form when config changes
  useEffect(() => {
    if (config) {
      setName(config.name || '');
      setBaseURL(config.baseURL || '');
      setModel(config.model || '');
      setApiKey(config.apiKey || '');
      setShowAdvanced(config.showAdvancedConfig || false);
      
      // Advanced settings
      setTemperature(config.advancedConfig?.temperature || 1);
      setTopP(config.advancedConfig?.top_p || 1);
      setFrequencyPenalty(config.advancedConfig?.frequency_penalty || 0);
      setPresencePenalty(config.advancedConfig?.presence_penalty || 0);
      setMaxTokens(config.advancedConfig?.max_tokens || 2048);
      setStreamResponse(config.advancedConfig?.stream !== false);
    }
  }, [config]);

  const handleSave = () => {
    if (config) {
      onSave({
        ...config,
        name,
        baseURL,
        model,
        apiKey,
        showAdvancedConfig: showAdvanced,
        advancedConfig: {
          temperature,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          max_tokens: maxTokens,
          stream: streamResponse
        }
      });
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isEditing ? t('settings.editConfig') : t('settings.addConfig')}</IonTitle>
          <IonButton slot="end" onClick={onDismiss}>{t('common.cancel')}</IonButton>
          <IonButton slot="end" onClick={handleSave}>{t('settings.save')}</IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {/* Basic Configuration */}
          <IonItem>
            <IonLabel position="stacked">{t('settings.configName')} *</IonLabel>
            <IonInput 
              value={name} 
              onIonInput={e => setName(e.detail.value || '')}
              placeholder={t('settings.configName')}
              required
            />
          </IonItem>
          
          <IonItem>
            <IonLabel position="stacked">{t('settings.baseUrl')}</IonLabel>
            <IonInput 
              value={baseURL} 
              onIonInput={e => setBaseURL(e.detail.value || '')}
              placeholder={t('settings.baseUrl')}
            />
          </IonItem>
          
          <IonItem>
            <IonLabel position="stacked">{t('settings.modelName')}</IonLabel>
            <IonInput 
              value={model} 
              onIonInput={e => setModel(e.detail.value || '')}
              placeholder={t('settings.modelName')}
            />
          </IonItem>
          
          <IonItem>
            <IonLabel position="stacked">{t('settings.apiKey')}</IonLabel>
            <IonInput 
              type="password"
              value={apiKey} 
              onIonInput={e => setApiKey(e.detail.value || '')}
              placeholder={t('settings.apiKey')}
            />
          </IonItem>
          
          {/* Advanced Configuration Toggle */}
          <IonItem button onClick={() => setShowAdvanced(!showAdvanced)} detail={false}>
            <IonLabel>{t('settings.advancedConfig')}</IonLabel>
            <IonIcon slot="end" icon={showAdvanced ? caretUp : caretDown} />
          </IonItem>
          
          {/* Advanced Configuration Warning */}
          {showAdvanced && (
            <IonCard color="warning">
              <IonCardContent>
                <IonItem lines="none" color="warning">
                  <IonIcon icon={warning} slot="start" />
                  <IonText>{t('settings.advancedConfigWarning')}</IonText>
                </IonItem>
              </IonCardContent>
            </IonCard>
          )}
          
          {/* Advanced Configuration Options */}
          {showAdvanced && (
            <>
              <IonItem>
                <IonLabel position="stacked">
                  {t('settings.temperature')} ({temperature.toFixed(2)})
                  <IonNote className="ion-padding-start">{t('settings.temperatureDescription')}</IonNote>
                </IonLabel>
                <IonRange 
                  min={0} 
                  max={2} 
                  step={0.01} 
                  value={temperature} 
                  onIonInput={e => setTemperature(e.detail.value as number)}
                />
              </IonItem>
              
              <IonItem>
                <IonLabel position="stacked">
                  {t('settings.topP')} ({topP.toFixed(2)})
                  <IonNote className="ion-padding-start">{t('settings.topPDescription')}</IonNote>
                </IonLabel>
                <IonRange 
                  min={0} 
                  max={1} 
                  step={0.01} 
                  value={topP} 
                  onIonInput={e => setTopP(e.detail.value as number)}
                />
              </IonItem>
              
              <IonItem>
                <IonLabel position="stacked">
                  {t('settings.frequencyPenalty')} ({frequencyPenalty.toFixed(2)})
                  <IonNote className="ion-padding-start">{t('settings.frequencyPenaltyDescription')}</IonNote>
                </IonLabel>
                <IonRange 
                  min={-2} 
                  max={2} 
                  step={0.01} 
                  value={frequencyPenalty} 
                  onIonInput={e => setFrequencyPenalty(e.detail.value as number)}
                />
              </IonItem>
              
              <IonItem>
                <IonLabel position="stacked">
                  {t('settings.presencePenalty')} ({presencePenalty.toFixed(2)})
                  <IonNote className="ion-padding-start">{t('settings.presencePenaltyDescription')}</IonNote>
                </IonLabel>
                <IonRange 
                  min={-2} 
                  max={2} 
                  step={0.01} 
                  value={presencePenalty} 
                  onIonInput={e => setPresencePenalty(e.detail.value as number)}
                />
              </IonItem>
              
              <IonItem>
                <IonLabel position="stacked">
                  {t('settings.maxTokens')} ({maxTokens})
                  <IonNote className="ion-padding-start">{t('settings.maxTokensDescription')}</IonNote>
                </IonLabel>
                <IonRange 
                  min={1} 
                  max={8192} 
                  step={1} 
                  value={maxTokens} 
                  onIonInput={e => setMaxTokens(e.detail.value as number)}
                />
              </IonItem>
              
              <IonItem>
                <IonLabel>
                  {t('settings.streamResponse')}
                  <IonNote className="ion-padding-start">{t('settings.streamResponseDescription')}</IonNote>
                </IonLabel>
                <IonToggle 
                  checked={streamResponse} 
                  onIonChange={e => setStreamResponse(e.detail.checked)}
                  slot="end"
                />
              </IonItem>
            </>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
};

export default AddEditConfigModal;