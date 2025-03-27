import {
  IonContent, IonHeader, IonPage, IonToolbar,
  IonList, IonItem, IonButton, IonFooter, IonSplitPane,
  IonMenu, IonMenuToggle, IonIcon, IonText, IonSelect, IonSelectOption
} from '@ionic/react';
import {
  useState, useEffect, useRef, useCallback, useLayoutEffect
} from 'react';
import { Preferences } from '@capacitor/preferences';
import { chatbubbleEllipses, key, addCircleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './Tab1.css';
import '../i18n';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ChatSidebar from '../components/ChatSidebar';
import { ChatService } from '../services/ChatService';
import { useConfig } from '../contexts/ConfigContext';
import { throttle } from '../utils';

// Storage key for chat sessions
const CHAT_SESSIONS_STORAGE = 'chat_sessions';

// Define Message interface
interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// Define ChatSession interface
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

const Tab1: React.FC = () => {
  const { t } = useTranslation();
  const { configs, activeConfig, handleConfigChange } = useConfig();
  
  // State for chat messages and sessions
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const contentRef = useRef<HTMLIonContentElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);
  
  // Scroll to bottom when messages change
  useLayoutEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (currentMessages.length > 0) {
      // Add a small delay to ensure DOM is fully updated
      timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
    
    // Cleanup function to clear the timeout if component unmounts
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
  
  // Save current chat as a session and optionally start a new chat
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
    
    // Automatically start a new chat after saving
    setCurrentMessages([]);
  };
  
  // Send a message to the AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    // Create a new user message
    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim()
    };
    
    // Add user message to the current messages
    const updatedMessages = [...currentMessages, userMessage];
    setCurrentMessages(updatedMessages);
    
    // Clear input
    setInputMessage('');
    
    // Check if there's an active configuration
    if (!activeConfig) {
      // Add an error message
      const errorMessage: Message = {
        role: 'assistant',
        content: t('chat.errors.no_active_config')
      };
      setCurrentMessages([...updatedMessages, errorMessage]);
      return;
    }
    
    // Create a placeholder for the assistant's response
    const assistantMessage: Message = {
      role: 'assistant',
      content: t('chat.thinking')
    };
    
    // Add the placeholder message
    setCurrentMessages([...updatedMessages, assistantMessage]);
    
    // Set loading state
    setIsLoading(true);
    
    // Create an AbortController for cancellation
    abortControllerRef.current = new AbortController();
    
    try {
      // Send the request to the API
      await ChatService.sendChatRequest({
        messages: updatedMessages,
        config: activeConfig,
        onUpdate: (content) => {
          // Update the assistant's message with the streaming content
          setCurrentMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content
              };
            }
            return updated;
          });
        },
        onComplete: (content) => {
          // Update the assistant's message with the final content
          setCurrentMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content
              };
            }
            return updated;
          });
          setIsLoading(false);
          abortControllerRef.current = null;
        },
        onError: (error) => {
          // Handle errors
          const errorMessage = error.type 
            ? t(`chat.errors.${error.type}`, { message: error.message })
            : t('chat.errors.unknown_error', { message: error.message });
          
          // Update the assistant's message with the error
          setCurrentMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: errorMessage
              };
            }
            return updated;
          });
          setIsLoading(false);
          abortControllerRef.current = null;
        },
        onTokenUsage: (usage) => {
          // Update the assistant's message with token usage information
          setCurrentMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                tokenUsage: usage
              };
            }
            return updated;
          });
        },
        signal: abortControllerRef.current.signal
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };
  
  // Stop the current response
  const stopResponse = () => {
    if (abortControllerRef.current) {
      // Abort the request
      abortControllerRef.current.abort();
      
      // Update the current message to indicate it was stopped by the user
      setCurrentMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          const lastMessage = updated[updated.length - 1];
          // Append a note that the response was stopped
          updated[updated.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + '\n\n_' + t('chat.errors.request_cancelled') + '_'
          };
        }
        return updated;
      });
      
      // Reset loading state
      setIsLoading(false);
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
    []
  );
  // Cleanup any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
              
              {/* Add configuration selector */}
              <IonItem lines="none" className="config-selector">
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
                <IonIcon slot="icon-only" icon={addCircleOutline} />
              </IonButton>
            </IonToolbar>
            </IonHeader>
          
          <IonContent ref={contentRef}>
            <IonList lines="none" className="ion-padding-md">
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