import { IonAlert } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { ModelConfiguration } from './types';

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

  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      header={isEditing ? t('settings.editConfig') : t('settings.addConfig')}
      inputs={[
        {
          name: 'name',
          type: 'text',
          placeholder: t('settings.configName') + ' *',
          value: config?.name,
          label: t('settings.configName') + ' *'
        },
        {
          name: 'baseURL',
          type: 'text',
          placeholder: t('settings.baseUrl'),
          value: config?.baseURL
        },
        {
          name: 'model',
          type: 'text',
          placeholder: t('settings.modelName'),
          value: config?.model
        },
        {
          name: 'apiKey',
          type: 'password',
          placeholder: t('settings.apiKey'),
          value: config?.apiKey
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
            if (config) {
              onSave({
                ...config,
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
  );
};

export default AddEditConfigModal;