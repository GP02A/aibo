import { IonItem, IonLabel, IonSelect, IonSelectOption, IonText } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { ModelConfiguration } from '../ApiSettings';

interface ConfigSelectorProps {
  configs: ModelConfiguration[];
  activeConfigId: string;
  onConfigChange: (configId: string) => void;
}

const ConfigSelector: React.FC<ConfigSelectorProps> = ({ 
  configs, 
  activeConfigId, 
  onConfigChange 
}) => {
  const { t } = useTranslation();

  return (
    <IonItem>
      <IonLabel>{t('settings.activeConfig')}</IonLabel>
      {configs.length > 0 ? (
        <IonSelect
          value={activeConfigId}
          onIonChange={(e) => onConfigChange(e.detail.value)}
          interface="popover"
          slot="end"
        >
          {configs.map((config) => (
            <IonSelectOption key={config.id} value={config.id}>
              {t(`configs.${config.id}`) !== `configs.${config.id}` 
                ? t(`configs.${config.id}`) 
                : config.name}
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