import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonSelect, 
  IonSelectOption, 
  IonButton, 
  IonAlert,
  IonIcon,
  IonItemDivider,
  IonItemGroup,
  IonListHeader,
  IonInput,
  IonModal,
  IonFooter,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { languageOutline, trashOutline, keyOutline, moonOutline, chevronForward } from 'ionicons/icons';
import './Tab2.css';

// Theme constants
const THEME_PREFERENCE_KEY = 'theme_preference';
const API_KEY_STORAGE = 'deepseek_api_key';
const THEME_AUTO = 'auto';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

const Tab2: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [themeMode, setThemeMode] = useState(THEME_AUTO);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyOptions, setShowApiKeyOptions] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    loadThemePreference();
    loadApiKey();
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

  const openApiKeyModal = () => {
    setTempApiKey(apiKey);
    setIsEditing(!apiKey); // Start in edit mode if no key exists
    setIsApiKeyModalOpen(true);
  };

  const saveApiKey = async () => {
    try {
      await Preferences.set({
        key: API_KEY_STORAGE,
        value: tempApiKey,
      });
      setApiKey(tempApiKey);
      setIsEditing(false);
      // Dispatch custom event to notify other components
      document.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: tempApiKey }));
      // Close the modal automatically after saving
      setIsApiKeyModalOpen(false);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const deleteApiKey = async () => {
    try {
      await Preferences.remove({ key: API_KEY_STORAGE });
      setApiKey('');
      setTempApiKey('');
      setShowApiKeyOptions(false);
      // Dispatch custom event with empty string to notify other components
      document.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: '' }));
      setIsApiKeyModalOpen(false);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const loadThemePreference = async () => {
    try {
      const { value } = await Preferences.get({ key: THEME_PREFERENCE_KEY });
      if (value) {
        setThemeMode(value);
        applyTheme(value);
      } else {
        // Default to auto if no preference is set
        setThemeMode(THEME_AUTO);
        applyTheme(THEME_AUTO);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      // Default to auto on error
      setThemeMode(THEME_AUTO);
      applyTheme(THEME_AUTO);
    }
  };

  const applyTheme = (mode: string) => {
    if (mode === THEME_AUTO) {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', prefersDark);
    } else {
      // Apply specific theme
      document.body.classList.toggle('dark', mode === THEME_DARK);
    }
  };

  const changeTheme = (mode: string) => {
    setThemeMode(mode);
    applyTheme(mode);
    saveThemePreference(mode);
  };

  const saveThemePreference = async (mode: string) => {
    try {
      await Preferences.set({
        key: THEME_PREFERENCE_KEY,
        value: mode,
      });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };
  
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const clearAllHistory = async () => {
    try {
      await Preferences.remove({ key: 'chat_sessions' });
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('settings.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItemGroup>
            <IonListHeader>
              <IonLabel>
                <IonIcon icon={keyOutline} className="ion-margin-end" />
                {t('settings.apiSettings')}
              </IonLabel>
            </IonListHeader>
            <IonItem button onClick={openApiKeyModal}>
              <IonLabel>
                {t('settings.deepseekApiKey')}
                <p className="ion-text-wrap">
                  {apiKey ? '••••••••••••••••' : t('settings.noApiKey')}
                </p>
              </IonLabel>
              <IonIcon icon={chevronForward} slot="end" />
            </IonItem>
          </IonItemGroup>

          <IonItemDivider className="ion-margin-top" />

          <IonItemGroup>
            <IonListHeader>
              <IonLabel>
                <IonIcon icon={moonOutline} className="ion-margin-end" />
                {t('settings.appearance')}
              </IonLabel>
            </IonListHeader>
            <IonItem>
              <IonLabel>{t('settings.themeMode')}</IonLabel>
              <IonSelect
                value={themeMode}
                onIonChange={(e) => changeTheme(e.detail.value)}
                interface="popover"
                slot="end"
              >
                <IonSelectOption value={THEME_AUTO}>{t('settings.themes.auto')}</IonSelectOption>
                <IonSelectOption value={THEME_LIGHT}>{t('settings.themes.light')}</IonSelectOption>
                <IonSelectOption value={THEME_DARK}>{t('settings.themes.dark')}</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonItemGroup>

          <IonItemDivider className="ion-margin-top" />

          <IonItemGroup>
            <IonListHeader>
              <IonLabel>
                <IonIcon icon={languageOutline} className="ion-margin-end" />
                {t('settings.language')}
              </IonLabel>
            </IonListHeader>
            <IonItem>
              <IonLabel>{t('settings.preferredLanguage')}</IonLabel>
              <IonSelect 
                value={i18n.language} 
                onIonChange={(e) => changeLanguage(e.detail.value)}
                interface="popover"
                slot="end"
              >
                <IonSelectOption value="en">{t('settings.languages.english')}</IonSelectOption>
                <IonSelectOption value="zh">{t('settings.languages.chinese')}</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonItemGroup>

          <IonItemDivider className="ion-margin-top" />

          <IonItemGroup>
            <IonListHeader>
              <IonLabel>
                <IonIcon icon={trashOutline} className="ion-margin-end" />
                {t('settings.dataManagement')}
              </IonLabel>
            </IonListHeader>
            <IonItem>
              <IonLabel color="danger">{t('settings.clearAllHistory')}</IonLabel>
              <IonButton 
                slot="end"
                fill="outline" 
                color="danger" 
                onClick={() => setShowClearConfirm(true)}
              >
                {t('settings.clear')}
              </IonButton>
            </IonItem>
          </IonItemGroup>
        </IonList>

        <IonAlert
          isOpen={showClearConfirm}
          onDidDismiss={() => setShowClearConfirm(false)}
          header={t('settings.confirmClear')}
          message={t('settings.confirmClearMessage')}
          buttons={[
            {
              text: t('common.cancel'),
              role: 'cancel',
              handler: () => {
                setShowClearConfirm(false);
              },
            },
            {
              text: t('common.confirm'),
              handler: clearAllHistory,
            },
          ]}
        />

        <IonAlert
          isOpen={showApiKeyOptions}
          onDidDismiss={() => setShowApiKeyOptions(false)}
          header={t('settings.apiKeyOptions')}
          buttons={[
            {
              text: t('common.cancel'),
              role: 'cancel',
              handler: () => {
                setShowApiKeyOptions(false);
              },
            },
            {
              text: t('settings.deleteApiKey'),
              role: 'destructive',
              handler: deleteApiKey,
            },
          ]}
        />

        <IonModal isOpen={isApiKeyModalOpen} onDidDismiss={() => setIsApiKeyModalOpen(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('settings.manageApiKey')}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">{t('settings.deepseekApiKey')}</IonLabel>
              <IonInput
                type="text"
                value={tempApiKey}
                placeholder={t('settings.enterApiKey')}
                onIonInput={e => setTempApiKey(e.detail.value || '')}
                readonly={!isEditing}
                className={!isEditing && apiKey ? 'ion-text-muted' : ''}
              />
            </IonItem>
            <div className="ion-padding">
              <p className="ion-text-wrap ion-text-small ion-color-medium">
                {t('settings.apiKeyDescription')}
              </p>
            </div>
          </IonContent>
          <IonFooter>
            <IonToolbar>
              {!apiKey ? (
                // No API key saved - Add/Cancel buttons
                <IonSegment>
                  <IonSegmentButton onClick={saveApiKey} disabled={!tempApiKey.trim()}>
                    <IonLabel color="primary">{t('settings.save')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton onClick={() => setIsApiKeyModalOpen(false)}>
                    <IonLabel>{t('common.cancel')}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              ) : !isEditing ? (
                // API key saved, not editing - Edit/Delete/Cancel buttons
                <IonSegment>
                  <IonSegmentButton onClick={() => setIsEditing(true)}>
                    <IonLabel color="primary">{t('settings.editApiKey')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton onClick={deleteApiKey} >
                    <IonLabel color="danger">{t('settings.deleteApiKey')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton onClick={() => setIsApiKeyModalOpen(false)}>
                    <IonLabel>{t('common.cancel')}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              ) : (
                // API key saved, editing - Save/Cancel buttons
                <IonSegment>
                  <IonSegmentButton onClick={saveApiKey} disabled={!tempApiKey.trim()}>
                    <IonLabel color="primary">{t('settings.save')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton onClick={() => {
                    setIsEditing(false);
                    setTempApiKey(apiKey);
                  }}>
                    <IonLabel>{t('common.cancel')}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              )}
            </IonToolbar>
          </IonFooter>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
