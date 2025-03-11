import { IonInput, IonItem, IonButton, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  sendMessage: () => void;
  stopResponse: () => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  inputMessage, 
  setInputMessage, 
  sendMessage, 
  stopResponse, 
  isLoading 
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLIonInputElement>(null);

  return (
    <IonToolbar>
      <div className="ion-padding-horizontal ion-margin-vertical">
        <IonItem lines="none">
          <IonInput
            ref={inputRef}
            fill="solid"
            value={inputMessage}
            placeholder={t('chat.inputPlaceholder')}
            onIonInput={e => setInputMessage(e.detail.value || '')}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputMessage.trim()) {
                sendMessage();
              }
            }}
          />
          {isLoading ? (
            <IonButton
              slot="end"
              onClick={stopResponse}
              color="danger"
              size="default"
            >
              {t('chat.stop')}
            </IonButton>
          ) : (
            <IonButton
              slot="end"
              onClick={sendMessage}
              disabled={!inputMessage.trim()}
              size="default"
            >
              {t('chat.send')}
            </IonButton>
          )}
        </IonItem>
      </div>
    </IonToolbar>
  );
};

export default ChatInput;