import { useState } from 'react';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonText, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonIcon 
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { eyeOutline, eyeOffOutline, create } from 'ionicons/icons';
import { ModelConfiguration } from './types';

interface ActiveConfigDisplayProps {
  activeConfig: ModelConfiguration;
  onEditConfig: (config: ModelConfiguration) => void;
}

const ActiveConfigDisplay: React.FC<ActiveConfigDisplayProps> = ({ 
  activeConfig, 
  onEditConfig 
}) => {
  const { t } = useTranslation();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <IonCard className="ion-margin">
      <IonCardHeader>
        <IonCardTitle>
          {activeConfig.name}
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <IonText>
                <p><strong>{t('settings.baseUrl')}:</strong> {activeConfig.baseURL || t('settings.noApiKey')}</p>
                <p><strong>{t('settings.modelName')}:</strong> {activeConfig.model || t('settings.noApiKey')}</p>
                {activeConfig.showAdvancedConfig && (
                  <p>
                    <strong>{t('settings.advancedConfig')}:</strong> {t('common.enabled')}
                  </p>
                )}
              </IonText>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="12">
              <IonItem lines="none">
                <IonLabel position="stacked">{t('settings.apiKey')}</IonLabel>
                <div className="ion-padding-top" style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontFamily: 'monospace' }}>
                    {showApiKey 
                      ? activeConfig.apiKey || t('settings.noApiKey')
                      : activeConfig.apiKey 
                        ? '•'.repeat(Math.min(activeConfig.apiKey.length, 20))
                        : t('settings.noApiKey')}
                  </div>
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    <IonIcon icon={showApiKey ? eyeOffOutline : eyeOutline} />
                  </IonButton>
                  <IonButton
                    fill="outline"
                    size="small"
                    onClick={() => onEditConfig(activeConfig)}
                  >
                    <IonIcon icon={create} slot="start" />
                    {t('settings.editApiKey')}
                  </IonButton>
                </div>
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
  );
};

export default ActiveConfigDisplay;