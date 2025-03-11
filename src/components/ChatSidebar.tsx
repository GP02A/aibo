import { 
  IonHeader, 
  IonToolbar, 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonList, 
  IonListHeader, 
  IonLabel, 
  IonItemSliding, 
  IonItem, 
  IonItemOptions, 
  IonItemOption 
} from '@ionic/react';
import { add, chatbubbleEllipses } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  setCurrentMessages: (messages: Message[]) => void;
  deleteSession: (id: string) => void;
  getGroupedSessions: () => { [key: string]: ChatSession[] };
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  chatSessions, 
  setCurrentMessages, 
  deleteSession, 
  getGroupedSessions 
}) => {
  const { t } = useTranslation();

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButton fill="clear" expand="block" onClick={() => setCurrentMessages([])}>
            <IonIcon slot="start" icon={add} />
            {t('chat.newChat')}
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {Object.entries(getGroupedSessions()).map(([period, sessions]) => (
            sessions.length > 0 && (
              <div key={period}>
                <IonListHeader>
                  <IonLabel>{period}</IonLabel>
                </IonListHeader>
                {sessions.map((session) => (
                  <IonItemSliding key={session.id}>
                    <IonItem button onClick={() => setCurrentMessages(session.messages)}>
                      <IonIcon slot="start" icon={chatbubbleEllipses} />
                      <IonLabel>{session.title}</IonLabel>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption color="danger" onClick={() => deleteSession(session.id)}>
                        {t('chat.delete')}
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))}
              </div>
            )
          ))}
        </IonList>
      </IonContent>
    </>
  );
};

export default ChatSidebar;