import { IonInput, IonItem, IonButton, IonToolbar } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { useRef, useEffect } from "react";

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
  isLoading,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLIonInputElement>(null);
  const toolbarRef = useRef<HTMLIonToolbarElement>(null);

  useEffect(() => {
    // Apply optimized styles for smoother transitions
    if (toolbarRef.current) {
      toolbarRef.current.style.willChange = "transform";
      toolbarRef.current.style.transition =
        "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)";
      toolbarRef.current.style.zIndex = "1000";
      toolbarRef.current.style.position = "relative";
    }

    // More responsive keyboard show handler with improved timing
    const handleKeyboardDidShow = (event: CustomEvent<any>) => {
      const keyboardHeight = event.detail?.keyboardHeight || 0;

      // Use RAF for better sync with rendering cycle
      requestAnimationFrame(() => {
        if (toolbarRef.current) {
          // Apply transform immediately
          toolbarRef.current.style.transform = `translateY(-${keyboardHeight}px)`;
        }

        // Focus after transform is applied
        setTimeout(() => {
          inputRef.current?.setFocus();
        }, 50);
      });
    };

    // Smoother keyboard hide transition
    const handleKeyboardDidHide = () => {
      requestAnimationFrame(() => {
        if (toolbarRef.current) {
          toolbarRef.current.style.transform = "translateY(0)";
        }
      });
    };

    // Store event listeners in variables so we can properly remove them
    const keyboardShowListener = handleKeyboardDidShow as EventListener;
    const keyboardHideListener = handleKeyboardDidHide as EventListener;

    window.addEventListener(
      "ionKeyboardDidShow",
      keyboardShowListener
    );
    window.addEventListener(
      "ionKeyboardDidHide",
      keyboardHideListener
    );

    return () => {
      // Use the stored references to ensure we remove the exact same listeners
      window.removeEventListener(
        "ionKeyboardDidShow",
        keyboardShowListener
      );
      window.removeEventListener(
        "ionKeyboardDidHide",
        keyboardHideListener
      );
    };
  }, []);

  return (
    <IonToolbar ref={toolbarRef} className="chat-input-toolbar">
      <div className="ion-padding-horizontal ion-margin-vertical">
        <IonItem lines="none">
          <IonInput
            ref={inputRef}
            fill="solid"
            value={inputMessage}
            placeholder={t("chat.inputPlaceholder")}
            onIonInput={(e) => setInputMessage(e.detail.value || "")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputMessage.trim()) {
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
              {t("chat.stop")}
            </IonButton>
          ) : (
            <IonButton
              slot="end"
              onClick={sendMessage}
              disabled={!inputMessage.trim()}
              size="default"
            >
              {t("chat.send")}
            </IonButton>
          )}
        </IonItem>
      </div>
    </IonToolbar>
  );
};

export default ChatInput;
