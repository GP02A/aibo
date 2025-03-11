import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
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
import { useState, useEffect, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { chatbubbleEllipses, add } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './Tab1.css';
import '../i18n';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ChatSidebar from '../components/ChatSidebar';
import { ChatService, API_KEY_STORAGE } from '../services/ChatService';

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

const STORAGE_KEY = 'chat_sessions';
// Remove duplicate API_KEY_STORAGE constant since it's imported from ChatService

const Tab1: React.FC = () => {
  const { t } = useTranslation();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [currentTokenUsage, setCurrentTokenUsage] = useState<{
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | null>(null);

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
    const key = await ChatService.getApiKey();
    if (key) {
      setApiKey(key);
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
  // Update sendMessage function to use streaming
  // Add a reference to the content element
  const contentRef = useRef<HTMLIonContentElement>(null);
  
  // Add a function to scroll to bottom
  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollToBottom(300);
    }
  };
  
  // Update sendMessage function to scroll after updates
  // Function to stop the ongoing response
  const stopResponse = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      
      // Update the last message to indicate it was stopped
      setCurrentMessages(prev => {
        const newMessages = [...prev];
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: newMessages[newMessages.length - 1].content + 
                     `\n\n_${t('chat.responseStopped')}_`
          };
        }
        return newMessages;
      });
    }
  };
  
  // Update sendMessage function to use AbortController
  // Update sendMessage function to properly handle the async flow
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // If there's an ongoing request, stop it first
    if (abortController) {
      stopResponse();
    }
    
    // Create a new AbortController
    const controller = new AbortController();
    setAbortController(controller);
    
    // Reset token usage for new message
    setCurrentTokenUsage(null);

    // Check if API key is available
    if (!apiKey) {
      setCurrentMessages(prev => [...prev, { 
        role: 'assistant', 
        content: t('chat.noApiKey')
      }]);
      setTimeout(scrollToBottom, 100);
      setAbortController(null);
      return;
    }

    const newMessage: Message = { role: 'user', content: inputMessage };
    
    // Update messages with user input first
    const updatedMessages = [...currentMessages, newMessage];
    setCurrentMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    // Add a placeholder message for streaming responses with "thinking" text
    setCurrentMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `${t('chat.thinking')}` 
    }]);
    setTimeout(scrollToBottom, 100);

    try {
      await ChatService.sendChatRequest(
        apiKey,
        updatedMessages, // Use the updated messages array
        controller.signal,
        (content, tokenUsage) => {
          // Update the message with accumulated content
          setCurrentMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              // Make sure to include the token usage in the message
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: content,
                tokenUsage: tokenUsage // Ensure this is properly passed
              };
              
              // Remove this console log if it exists
              // console.log('Updating message with token usage:', tokenUsage);
            }
            return newMessages;
          });
          
          // Also update the current token usage state
          if (tokenUsage) {
            setCurrentTokenUsage(tokenUsage);
          }
          
          // Scroll to bottom periodically during streaming
          if (content.length % 100 === 0) {
            setTimeout(scrollToBottom, 50);
          }
        },
        (errorType, errorMessage) => {
          setCurrentMessages(prev => {
            // Replace the placeholder message
            const newMessages = [...prev];
            let errorContent = '';
            
            switch (errorType) {
              case 'auth_error':
                errorContent = t('chat.authError');
                break;
              case 'invalid_api_key':
                errorContent = t('chat.invalidApiKey');
                break;
              default:
                errorContent = `${t('chat.errorMessage')} ${errorMessage}`;
            }
            
            if (newMessages.length > 0) {
              newMessages[newMessages.length - 1] = { 
                role: 'assistant', 
                content: errorContent
              };
            }
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setCurrentMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: `${t('chat.errorMessage')} ${(error as Error).message}`
          };
        }
        return newMessages;
      });
    } finally {
      // Final scroll after streaming completes
      setTimeout(scrollToBottom, 100);
      
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setAbortController(null);
      }
    }
  };

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
