import { IonAlert } from '@ionic/react';
import { useTranslation } from 'react-i18next';

interface ValidationAlertProps {
  isOpen: boolean;
  message: string;
  onDismiss: () => void;
}

const ValidationAlert: React.FC<ValidationAlertProps> = ({
  isOpen,
  message,
  onDismiss
}) => {
  const { t } = useTranslation();

  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      header={t('common.error') || 'Error'}
      message={message}
      buttons={[
        {
          text: t('common.ok') || 'OK',
          role: 'cancel'
        }
      ]}
    />
  );
};

export default ValidationAlert;