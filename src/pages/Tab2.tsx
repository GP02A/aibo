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
  IonListHeader
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { languageOutline, trashOutline, moonOutline } from 'ionicons/icons';
import ApiSettings from '../components/ApiSettings';
import './Tab2.css';

// Theme constants - exported for use in other components
export const THEME_PREFERENCE_KEY = 'theme_preference';
export const THEME_AUTO = 'auto';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

const Tab2: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [themeMode, setThemeMode] = useState(THEME_AUTO);
  
  useEffect(() => {
    loadThemePreference();
  }, []);

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
          {/* API Settings Component */}
          <ApiSettings />

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
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
