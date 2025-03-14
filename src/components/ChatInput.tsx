import { IonInput, IonItem, IonButton, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { isPlatform } from '@ionic/react';

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
  const toolbarRef = useRef<HTMLIonToolbarElement>(null);

  useEffect(() => {
    // Apply optimized styles for smoother transitions
    if (toolbarRef.current) {
      toolbarRef.current.style.willChange = 'transform';
      toolbarRef.current.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
      toolbarRef.current.style.zIndex = '1000';
      toolbarRef.current.style.position = 'relative';
    }

    // Check if we're on a mobile device
    const isMobile = isPlatform('ios') || isPlatform('android');

    if (isMobile) {
      // Mobile implementation using Capacitor
      const setupKeyboardListeners = async () => {
        try {
          // Handle keyboard showing
          await Keyboard.addListener('keyboardWillShow', (info) => {
            requestAnimationFrame(() => {
              if (toolbarRef.current) {
                toolbarRef.current.style.transform = `translateY(-${info.keyboardHeight}px)`;
              }
              
              // Focus after transform is applied
              setTimeout(() => {
                inputRef.current?.setFocus();
              }, 50);
            });
          });
          
          // Handle keyboard hiding
          await Keyboard.addListener('keyboardWillHide', () => {
            requestAnimationFrame(() => {
              if (toolbarRef.current) {
                toolbarRef.current.style.transform = 'translateY(0)';
              }
            });
          });
        } catch (error) {
          // Keyboard plugin error occurred
          // Continue without keyboard adjustments if plugin fails
        }
      };
      
      setupKeyboardListeners();
      
      // Clean up event listeners when component unmounts
      return () => {
        Keyboard.removeAllListeners().catch(err => {
          console.error('Error removing keyboard listeners:', err);
        });
      };
    } else {
      // Web implementation using DOM events
      const handleFocus = () => {
        // Ensure input is focused
        setTimeout(() => {
          inputRef.current?.setFocus();
        }, 50);
      };
      
      // Add focus event listener for web
      const inputElement = inputRef.current as HTMLElement | null;
      if (inputElement) {
        inputElement.addEventListener('focus', handleFocus);
      }
      
      return () => {
        // Clean up web event listeners
        if (inputElement) {
          inputElement.removeEventListener('focus', handleFocus);
        }
      };
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <IonToolbar ref={toolbarRef} className="chat-input-toolbar">
      <div className="ion-padding-horizontal ion-margin-vertical">
        <IonItem lines="none">
          <IonInput
            ref={inputRef}
            fill="solid"
            value={inputMessage}
            placeholder={t('chat.inputPlaceholder')}
            onIonInput={e => setInputMessage(e.detail.value || '')}
            onKeyDown={handleKeyDown}
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