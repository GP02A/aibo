import { IonItem, IonLabel, IonButton, IonIcon, IonList } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { add, create, trash } from 'ionicons/icons';
import { ModelConfiguration } from './types';

interface ConfigListProps {
  configs: ModelConfiguration[];
  onAddConfig: () => void;
  onEditConfig: (config: ModelConfiguration) => void;
  onDeleteConfig: (configId: string) => void;
}

const ConfigList: React.FC<ConfigListProps> = ({ 
  configs, 
  onAddConfig, 
  onEditConfig, 
  onDeleteConfig 
}) => {
  const { t } = useTranslation();

  return (
    <>
      <IonItem>
        <IonLabel>{t('settings.modelConfig')}</IonLabel>
        <IonButton
          fill="outline"
          slot="end"
          onClick={onAddConfig}
        >
          <IonIcon icon={add} slot="start" />
          {t('settings.addConfig')}
        </IonButton>
      </IonItem>

      <IonList className="ion-margin-start">
        {configs.map((config) => (
          <IonItem key={config.id}>
            <IonLabel>
              {t(`configs.${config.id}`) !== `configs.${config.id}` 
                ? t(`configs.${config.id}`) 
                : config.name}
            </IonLabel>
            <IonButton
              fill="clear"
              onClick={() => onEditConfig(config)}
            >
              <IonIcon icon={create} />
            </IonButton>
            <IonButton
              fill="clear"
              color="danger"
              onClick={() => onDeleteConfig(config.id)}
            >
              <IonIcon icon={trash} />
            </IonButton>
          </IonItem>
        ))}
      </IonList>
    </>
  );
};

export default ConfigList;