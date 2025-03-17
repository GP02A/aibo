import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonList, IonItem, IonButton, IonFooter, IonSplitPane,
  IonMenu, IonMenuToggle, IonIcon, IonText, IonSelect, IonSelectOption
} from '@ionic/react';
import {
  useState, useEffect, useRef, useCallback
} from 'react';
import { throttle } from 'lodash-es';
import { Preferences } from '@capacitor/preferences';
import { chatbubbleEllipses, key } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './Tab1.css';
import '../i18n';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ChatSidebar from '../components/ChatSidebar';
import { ChatService } from '../services/ChatService';
import { useConfig } from '../contexts/ConfigContext';

// Define interfaces for messages and chat sessions
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

// Storage key for chat sessions
const CHAT_SESSIONS_STORAGE = 'chat_sessions';

const Tab1: React.FC = () => {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLIonContentElement>(null);
  
  // Chat state
  const [inputMessage, setInputMessage] = useState('');
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get configuration state from context
  const { configs, activeConfig, handleConfigChange } = useConfig();
  
  // Abort controller for stopping API requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);
  
  // Load chat sessions from storage
  const loadChatSessions = async () => {
    try {
      const { value } = await Preferences.get({ key: CHAT_SESSIONS_STORAGE });
      if (value) {
        setChatSessions(JSON.parse(value));
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };
  
  // Save chat sessions to storage
  const saveChatSessions = async (sessions: ChatSession[]) => {
    try {
      await Preferences.set({
        key: CHAT_SESSIONS_STORAGE,
        value: JSON.stringify(sessions),
      });
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  };
  

  
  // Group chat sessions by time period
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
      if (session.timestamp >= today) {
        groups[t('timeline.today')].push(session);
      } else if (session.timestamp >= yesterday) {
        groups[t('timeline.yesterday')].push(session);
      } else if (session.timestamp >= pastWeek) {
        groups[t('timeline.pastWeek')].push(session);
      } else if (session.timestamp >= pastMonth) {
        groups[t('timeline.pastMonth')].push(session);
      } else {
        groups[t('timeline.older')].push(session);
      }
    });
    
    // Sort sessions within each group by timestamp (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.timestamp - a.timestamp);
    });
    
    return groups;
  };
  
  // Delete a chat session
  const deleteSession = async (id: string) => {
    const updatedSessions = chatSessions.filter(session => session.id !== id);
    await saveChatSessions(updatedSessions);
    
    // If the current chat is deleted, clear the current messages
    const currentSession = chatSessions.find(session => session.id === id);
    if (currentSession && arraysEqual(currentSession.messages, currentMessages)) {
      setCurrentMessages([]);
    }
  };
  
  // Helper function to compare arrays
  const arraysEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  };
  
  // Save current chat as a session
  const saveCurrentChat = async () => {
    if (currentMessages.length === 0) return;
    
    // Create a title from the first user message
    const firstUserMessage = currentMessages.find(msg => msg.role === 'user');
    const title = firstUserMessage 
      ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
      : t('chat.newChat');
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      messages: [...currentMessages],
      timestamp: Date.now()
    };
    
    // Check if this chat is already saved
    const existingSessionIndex = chatSessions.findIndex(session => 
      arraysEqual(session.messages, currentMessages)
    );
    
    let updatedSessions: ChatSession[];
    
    if (existingSessionIndex !== -1) {
      // Update existing session
      updatedSessions = [...chatSessions];
      updatedSessions[existingSessionIndex] = {
        ...updatedSessions[existingSessionIndex],
        timestamp: Date.now() // Update timestamp
      };
    } else {
      // Add new session
      updatedSessions = [newSession, ...chatSessions];
    }
    
    await saveChatSessions(updatedSessions);
  };
  
  // Send a message to the API
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!activeConfig || !activeConfig.apiKey) {
      // Show error message if no API key is set
      const errorMessage: Message = {
        role: 'assistant',
        content: t('chat.noApiKey')
      };
      setCurrentMessages([...currentMessages, { role: 'user', content: inputMessage }, errorMessage]);
      setInputMessage('');
      return;
    }
    
    // Add user message to the chat
    const userMessage: Message = { role: 'user', content: inputMessage };
    const assistantMessage: Message = { role: 'assistant', content: t('chat.thinking') };
    
    setCurrentMessages([...currentMessages, userMessage, assistantMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      // Prepare messages for the API
      const messagesToSend = [...currentMessages, userMessage];
      
      // Send the request to the API
      await ChatService.sendChatRequest(
        activeConfig.apiKey,
        messagesToSend,
        abortControllerRef.current.signal,
        // Update callback
        (content, tokenUsage) => {
          setCurrentMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const lastIndex = newMessages.length - 1;
            
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                role: 'assistant',
                content,
                tokenUsage
              };
            }
            
            return newMessages;
          });
        },
        // Error callback
        (errorType, errorMessage) => {
          setCurrentMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const lastIndex = newMessages.length - 1;
            
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              let content = '';
              
              switch (errorType) {
                case 'abort':
                  content = t('chat.responseStopped');
                  break;
                case 'auth_error':
                  content = t('chat.authError');
                  break;
                case 'invalid_api_key':
                  content = t('chat.invalidApiKey');
                  break;
                case 'network_error':
                  content = t('chat.networkError');
                  break;
                default:
                  content = `${t('chat.errorMessage')} ${errorMessage}`;
              }
              
              newMessages[lastIndex] = {
                role: 'assistant',
                content
              };
            }
            
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };
  
  // Stop the current response
  const stopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
  
  // Scroll to the bottom of the chat
  const scrollToBottom = useCallback(
    throttle(() => {
      if (contentRef.current) {
        contentRef.current.scrollToBottom(300);
      }
    }, 100),
    [currentMessages]
  );

  return (
    <IonPage>
      <IonSplitPane contentId="main-content">
        <IonMenu contentId="main-content">
          <ChatSidebar 
            chatSessions={chatSessions}
            setCurrentMessages={setCurrentMessages}
            deleteSession={deleteSession}
            getGroupedSessions={getGroupedSessions}
          />
        </IonMenu>

        <div id="main-content" className="ion-page">
          <IonHeader>
            <IonToolbar>
              <IonMenuToggle slot="start">
                <IonButton fill="clear">
                  <IonIcon slot="icon-only" icon={chatbubbleEllipses} />
                </IonButton>
              </IonMenuToggle>
              <IonTitle>{t('app.title')}</IonTitle>
              
              {/* Add configuration selector */}
              <IonItem slot="end" lines="none" className="config-selector">
                <IonIcon icon={key} slot="start" />
                {configs.length > 0 ? (
                  <IonSelect
                    value={activeConfig?.id}
                    onIonChange={(e) => handleConfigChange(e.detail.value)}
                    interface="popover"
                    key={activeConfig ? `${activeConfig.id}-${activeConfig.name}` : 'no-config'}
                  >
                    {configs.map((config) => (
                      <IonSelectOption key={config.id} value={config.id}>
                        {t(`providers.${config.id}`) !== `providers.${config.id}` 
                          ? t(`providers.${config.id}`) 
                          : config.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                ) : (
                  <IonText color="medium">
                    {t('settings.noConfig')} - {t('settings.addConfig')}
                  </IonText>
                )}
              </IonItem>
              
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
          
          <IonContent ref={contentRef}>
            <IonList lines="none" className="ion-padding">
              {currentMessages.map((message, index) => (
                <MessageBubble 
                  key={index}
                  role={message.role}
                  content={message.content}
                  tokenUsage={message.tokenUsage}
                  isStreaming={isLoading && index === currentMessages.length - 1 && message.role === 'assistant'}
                />
              ))}
            </IonList>
          </IonContent>
          
          <IonFooter>
            <ChatInput
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              sendMessage={sendMessage}
              stopResponse={stopResponse}
              isLoading={isLoading}
            />
          </IonFooter>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};

export default Tab1;