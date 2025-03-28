import { IonIcon, IonChip, IonLabel, IonItem, IonButton } from '@ionic/react';
import { hardwareChipOutline, personCircleOutline, copyOutline } from 'ionicons/icons';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ReactNode } from 'react';

interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  tokenUsage?: TokenUsage;
  isStreaming?: boolean;
}

const MessageBubble: React.FC<MessageProps> = ({ role, content, tokenUsage, isStreaming = false }) => {
  const { t } = useTranslation();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className={`ion-margin-vertical ${role === 'user' ? 'ion-text-end' : 'ion-text-start'}`}>
      <IonItem lines="none" className="ion-no-padding">
        <div className="ion-padding-horizontal ion-margin-vertical ion-no-padding" style={{ width: '100%' }}>
          {/* Message container with proper flex alignment */}
          <div className={`message-row ion-justify-content-${role === 'user' ? 'end' : 'start'}`}
               style={{ display: 'flex', alignItems: 'flex-start' }}>
            
            {/* Assistant avatar */}
            {role === 'assistant' && (
              <IonIcon icon={hardwareChipOutline} size="small" color="medium" className="ion-margin-end" />
            )}
            
            {/* Message bubble */}
            <div
              className={`ion-padding message-bubble ${role === 'user' ? 'user-message' : 'assistant-message'} message-bubble-responsive`}
              style={{
                maxWidth: '80%',
                borderRadius: role === 'user' ? '0' : '12px',
                boxShadow: role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.2)',
                backgroundColor: role === 'user' ? 'transparent' : 'var(--ion-color-light)',
                color: role === 'user' ? 'var(--ion-color-dark)' : 'var(--ion-color-dark)',
                whiteSpace: 'normal',
                wordBreak: 'break-word'
              }}
            >
              {role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}: {
                      node?: unknown;
                      inline?: boolean;
                      className?: string;
                      children?: ReactNode;
                    }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline ? (
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            right: '8px',
                            top: '8px',
                            zIndex: 1,
                            opacity: 1
                          }} className="code-copy-button">
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => handleCopyCode(String(children))}
                              style={{ '--padding-start': '4px', '--padding-end': '4px' }}
                            >
                              <IonIcon icon={copyOutline} size="small" />
                            </IonButton>
                          </div>
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match?.[1] || 'text'}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: '8px',
                              backgroundColor: '#1e1e1e',
                              fontSize: '0.9em'
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {content || (isStreaming ? t('chat.thinking') : '')}
                </ReactMarkdown>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
              )}
            </div>
            
            {/* User avatar */}
            {role === 'user' && (
              <IonIcon icon={personCircleOutline} size="small" color="primary" className="ion-margin-start" />
            )}
          </div>
          
          {/* Token usage information - only show when not streaming and when we have actual token data */}
          {role === 'assistant' && tokenUsage && (isStreaming === false) && 
           (tokenUsage.promptTokens !== undefined || tokenUsage.completionTokens !== undefined || tokenUsage.totalTokens !== undefined) && (
            <div className="ion-padding-start" style={{ 
              display: 'flex', 
              justifyContent: 'flex-start',
              marginTop: '4px',
              marginLeft: role === 'assistant' ? '24px' : '0',
            }}>
              <IonChip color="medium" outline={true} style={{ 
                fontSize: '0.7rem', 
                height: '20px',
                margin: '0'
              }}>
                <IonLabel color="medium" style={{ fontSize: '0.7rem' }}>
                  {t('chat.tokenUsage')} 
                  {tokenUsage.promptTokens !== undefined && ` ${t('chat.promptTokens')}: ${tokenUsage.promptTokens} |`}
                  {tokenUsage.completionTokens !== undefined && ` ${t('chat.completionTokens')}: ${tokenUsage.completionTokens} |`}
                  {tokenUsage.totalTokens !== undefined && ` ${t('chat.totalTokens')}: ${tokenUsage.totalTokens}`}
                </IonLabel>
              </IonChip>
            </div>
          )}
        </div>
      </IonItem>
    </div>
  );
};

export default MessageBubble;