import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonInput, 
  IonButton, 
  IonFooter,
  IonSplitPane,
  IonMenu,
  IonMenuToggle,
  IonIcon,
  IonLabel,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonListHeader,
} from '@ionic/react';
import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { chatbubbleEllipses, add, ellipsisHorizontal, hardwareChipOutline, personCircleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import './Tab1.css';
import '../i18n';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

const STORAGE_KEY = 'chat_sessions';
const API_KEY_STORAGE = 'deepseek_api_key';

const Tab1: React.FC = () => {
  const { t } = useTranslation();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    loadChatSessions();
    loadApiKey();
    
    // Add event listener for API key changes
    const handleApiKeyChange = (event: CustomEvent) => {
      setApiKey(event.detail);
    };
    
    // Add event listener
    document.addEventListener('apiKeyChanged', handleApiKeyChange as EventListener);
    
    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('apiKeyChanged', handleApiKeyChange as EventListener);
    };
  }, []);

  const loadApiKey = async () => {
    try {
      const { value } = await Preferences.get({ key: API_KEY_STORAGE });
      if (value) {
        setApiKey(value);
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  };

  const loadChatSessions = async () => {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        setChatSessions(JSON.parse(value));
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  const saveChatSessions = async (sessions: ChatSession[]) => {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(sessions),
      });
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  };

  const saveCurrentChat = async () => {
    if (currentMessages.length === 0) return;
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: currentMessages[0].content.slice(0, 30) + '...',
      messages: currentMessages,
      timestamp: Date.now()
    };

    const updatedSessions = [newSession, ...chatSessions];
    setChatSessions(updatedSessions);
    saveChatSessions(updatedSessions);
    setCurrentMessages([]);
  };

  const getGroupedSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000; // 24 hours in milliseconds
    const pastWeek = today - 86400000 * 7;
    const pastMonth = today - 86400000 * 30;

    const groups: { [key: string]: ChatSession[] } = {
      [t('timeline.today')]: [],
      [t('timeline.yesterday')]: [],
      [t('timeline.pastWeek')]: [],
      [t('timeline.pastMonth')]: [],
      [t('timeline.older')]: []
    };

    chatSessions.forEach(session => {
      const timestamp = session.timestamp;
      if (timestamp >= today) {
        groups[t('timeline.today')].push(session);
      } else if (timestamp >= yesterday) {
        groups[t('timeline.yesterday')].push(session);
      } else if (timestamp >= pastWeek) {
        groups[t('timeline.pastWeek')].push(session);
      } else if (timestamp >= pastMonth) {
        groups[t('timeline.pastMonth')].push(session);
      } else {
        groups[t('timeline.older')].push(session);
      }
    });

    return groups;
  };

  const deleteSession = async (sessionId: string) => {
    const updatedSessions = chatSessions.filter(session => session.id !== sessionId);
    setChatSessions(updatedSessions);
    saveChatSessions(updatedSessions);
  };

  // Update error messages to use translations
  // Update sendMessage function to show loading state
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Check if API key is available
    if (!apiKey) {
      setCurrentMessages(prev => [...prev, { 
        role: 'assistant', 
        content: t('chat.noApiKey')
      }]);
      return;
    }

    const newMessage: Message = { role: 'user', content: inputMessage };
    setCurrentMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const formattedMessages = [...currentMessages, newMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: formattedMessages
        })
      });

      // Check for authentication errors first
      if (response.status === 401 || response.status === 403) {
        setCurrentMessages(prev => [...prev, { 
          role: 'assistant', 
          content: t('chat.authError')
        }]);
        return;
      }

      const data = await response.json();
      
      // Check for API errors
      if (data.error) {
        if (data.error.type === 'invalid_request_error' && 
            data.error.message && 
            data.error.message.includes('API key')) {
          setCurrentMessages(prev => [...prev, { 
            role: 'assistant', 
            content: t('chat.invalidApiKey')
          }]);
        } else {
          setCurrentMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `${t('chat.errorMessage')} ${data.error.message}`
          }]);
        }
        return;
      }
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setCurrentMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.choices[0].message.content 
        }]);
      } else {
        setCurrentMessages(prev => [...prev, { 
          role: 'assistant', 
          content: t('chat.unexpectedFormat')
        }]);
      }
    } catch (error) {
      console.error('API error:', error);
      setCurrentMessages(prev => [...prev, { 
        role: 'assistant', 
        content: t('chat.errorMessage')
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonSplitPane contentId="main-content">
        <IonMenu contentId="main-content">
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
        </IonMenu>

        {/* Replace IonPage with a div that has the id */}
        <div id="main-content" className="ion-page">
          <IonHeader>
            <IonToolbar>
              <IonMenuToggle slot="start">
                <IonButton fill="clear">
                  <IonIcon slot="icon-only" icon={chatbubbleEllipses} />
                </IonButton>
              </IonMenuToggle>
              <IonTitle>{t('app.title')}</IonTitle>
              <IonButton 
                slot="end" 
                fill="clear" 
                onClick={saveCurrentChat}
                disabled={currentMessages.length === 0}
              >
                {t('chat.saveChat')}
              </IonButton>
            </IonToolbar>
          </IonHeader>
          
          <IonContent>
            <IonList lines="none" className="ion-padding">
              {currentMessages.map((message, index) => (
                <div key={index} className={`ion-margin-vertical ${message.role === 'user' ? 'ion-text-end' : 'ion-text-start'}`}>
                  <div className="ion-padding-horizontal ion-margin-vertical">
                    <div className="message-container" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      {message.role === 'assistant' && (
                        <IonIcon icon={hardwareChipOutline} size="small" color="medium" className="ion-margin-end" />
                      )}
                      
                      <div 
                        className={`ion-padding message-bubble ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                        style={{
                          display: 'inline-block',
                          maxWidth: '80%',
                          borderRadius: message.role === 'user' ? '0' : '12px',
                          boxShadow: message.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.2)',
                          backgroundColor: message.role === 'user' ? 'transparent' : 'var(--ion-color-light)',
                          color: message.role === 'user' ? 'var(--ion-color-dark)' : 'var(--ion-color-dark)',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word'
                        }}
                      >
                        {message.role === 'assistant' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          message.content
                        )}
                      </div>
                      
                      {message.role === 'user' && (
                        <IonIcon icon={personCircleOutline} size="small" color="primary" className="ion-margin-start" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="ion-margin-vertical ion-text-start">
                  <div className="ion-padding-horizontal ion-margin-vertical">
                    <div className="message-container" style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <IonIcon icon={hardwareChipOutline} size="small" color="medium" className="ion-margin-end" />
                      
                      <div 
                        className="ion-padding message-bubble assistant-message"
                        style={{
                          display: 'inline-block',
                          maxWidth: '80%',
                          borderRadius: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          backgroundColor: 'var(--ion-color-light)',
                          color: 'var(--ion-color-dark)',
                          whiteSpace: 'normal'
                        }}
                      >
                        <div className="ion-text-center">
                          <IonIcon icon={ellipsisHorizontal} className="ion-padding-end" />
                          {t('chat.thinking')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </IonList>
          </IonContent>
          
          <IonFooter>
            <IonToolbar>
              <div className="ion-padding-horizontal ion-margin-vertical">
                <IonItem lines="none">
                  <IonInput
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
                  <IonButton
                    slot="end"
                    onClick={sendMessage}
                    disabled={!inputMessage.trim()}
                    size="default"
                  >
                    {t('chat.send')}
                  </IonButton>
                </IonItem>
              </div>
            </IonToolbar>
          </IonFooter>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};

export default Tab1;
