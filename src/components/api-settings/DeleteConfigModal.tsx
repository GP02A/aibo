import { IonAlert } from '@ionic/react';
import { useTranslation } from 'react-i18next';

interface DeleteConfigModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

const DeleteConfigModal: React.FC<DeleteConfigModalProps> = ({
  isOpen,
  onDismiss,
  onConfirm
}) => {
  const { t } = useTranslation();

  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      header={t('settings.deleteConfig')}
      message={`${t('settings.confirmClearMessage')}`}
      buttons={[
        {
          text: t('common.cancel'),
          role: 'cancel'
        },
        {
          text: t('common.confirm'),
          handler: onConfirm
        }
      ]}
    />
  );
};

export default DeleteConfigModal;