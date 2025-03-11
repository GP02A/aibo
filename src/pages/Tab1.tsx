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
import { useState, useEffect, useRef } from 'react';
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
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // If there's an ongoing request, stop it first
    if (abortController) {
      stopResponse();
    }
    
    // Create a new AbortController
    const controller = new AbortController();
    setAbortController(controller);

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
    setCurrentMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    try {
      const formattedMessages = [...currentMessages, newMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add a placeholder message for streaming responses with "thinking" text
      setCurrentMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `${t('chat.thinking')}` 
      }]);
      setTimeout(scrollToBottom, 100);

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: formattedMessages,
          stream: true // Enable streaming
        }),
        signal: controller.signal // Add the abort signal
      });

      // Check for authentication errors first
      if (response.status === 401 || response.status === 403) {
        setCurrentMessages(prev => {
          // Replace the placeholder message
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: t('chat.authError')
          };
          return newMessages;
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        setCurrentMessages(prev => {
          // Replace the placeholder message
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = errorData.error && 
              errorData.error.type === 'invalid_request_error' && 
              errorData.error.message && 
              errorData.error.message.includes('API key')
            ? { 
                role: 'assistant', 
                content: t('chat.invalidApiKey')
              }
            : { 
                role: 'assistant', 
                content: `${t('chat.errorMessage')} ${errorData.error?.message || ''}`
              };
          return newMessages;
        });
        setIsLoading(false);
        return;
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedContent = '';
      let receivedFirstChunk = false;
  
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Process each line in the chunk
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            // Skip empty lines and "[DONE]" message
            if (line === 'data: [DONE]' || !line.trim()) continue;
            
            // Remove the "data: " prefix
            const jsonData = line.replace(/^data: /, '').trim();
            
            try {
              // Parse the JSON data
              const data = JSON.parse(jsonData);
              
              // Extract the content delta
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                const contentDelta = data.choices[0].delta.content;
                
                // If this is the first content chunk, replace the "thinking" message
                if (!receivedFirstChunk) {
                  accumulatedContent = contentDelta;
                  receivedFirstChunk = true;
                } else {
                  accumulatedContent += contentDelta;
                }
                
                // Update the message with accumulated content
                setCurrentMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: accumulatedContent
                  };
                  return newMessages;
                });
                
                // Scroll to bottom periodically during streaming (not on every update to avoid jankiness)
                if (accumulatedContent.length % 100 === 0) {
                  setTimeout(scrollToBottom, 50);
                }
              }
            } catch (e) {
              console.error('Error parsing streaming response:', e, jsonData);
            }
          }
        }
        // Final scroll after streaming completes
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      // Check if this is an abort error
      if ((error as Error).name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('API error:', error);
        setCurrentMessages(prev => {
          // Replace the placeholder message
          const newMessages = [...prev];
          if (prev[prev.length - 1].role === 'assistant') {
            newMessages[newMessages.length - 1] = { 
              role: 'assistant', 
              content: t('chat.errorMessage')
            };
            return newMessages;
          }
          return [...prev, { 
            role: 'assistant', 
            content: t('chat.errorMessage')
          }];
        });
      }
    } finally {
      if (!abortController?.signal.aborted) {
        setIsLoading(false);
        setAbortController(null);
      }
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
          
          <IonContent ref={contentRef}>
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
              
              {/* Remove the separate loading indicator since we're now integrating it with the streaming response */}
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
          </IonFooter>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};

export default Tab1;
