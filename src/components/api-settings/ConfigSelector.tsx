import { IonItem, IonLabel, IonSelect, IonSelectOption, IonText } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { ModelConfiguration } from './types';

interface ConfigSelectorProps {
  configs: ModelConfiguration[];
  activeConfig: ModelConfiguration | null;
  onConfigChange: (configId: string) => void;
}

const ConfigSelector: React.FC<ConfigSelectorProps> = ({ 
  configs, 
  activeConfig, 
  onConfigChange 
}) => {
  const { t } = useTranslation();

  return (
    <IonItem>
      <IonLabel>{t('settings.activeConfig')}</IonLabel>
      {configs.length > 0 ? (
        <IonSelect
          value={activeConfig?.id}
          onIonChange={(e) => onConfigChange(e.detail.value)}
          interface="popover"
          slot="end"
          key={activeConfig ? `${activeConfig.id}-${activeConfig.name}` : 'no-config'}
        >
          {configs.map((config) => (
            <IonSelectOption key={config.id} value={config.id}>
              {config.name}
            </IonSelectOption>
          ))}
        </IonSelect>
      ) : (
        <IonText color="medium" slot="end">
          {t('settings.noConfig')} - {t('settings.addConfig')}
        </IonText>
      )}
    </IonItem>
  );
};

export default ConfigSelector;