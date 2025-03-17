import React from 'react';
import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { chatbubbleEllipses, settings } from 'ionicons/icons';
import { Redirect, Route } from 'react-router-dom';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import { useTranslation } from 'react-i18next';
import { ConfigProvider } from './contexts/ConfigContext';

// Import theme constants directly from Tab2
import { THEME_PREFERENCE_KEY, THEME_AUTO, THEME_LIGHT, THEME_DARK } from './pages/Tab2';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    initializeTheme();
  }, []);

  const initializeTheme = async () => {
    try {
      const { value } = await Preferences.get({ key: THEME_PREFERENCE_KEY });
      if (value === THEME_DARK) {
        document.body.classList.add('dark');
      } else if (value === THEME_LIGHT) {
        document.body.classList.remove('dark');
      } else {
        // If no preference is set or set to auto, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark', prefersDark);
      }
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      // Default to system preference on error
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', prefersDark);
    }
  };

  return (
    <IonApp>
      <ConfigProvider>
        <IonReactRouter>
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/tab1">
                <Tab1 />
              </Route>
              <Route exact path="/tab2">
                <Tab2 />
              </Route>
              <Route exact path="/">
                <Redirect to="/tab1" />
              </Route>
            </IonRouterOutlet>
            <IonTabBar slot="bottom">
              <IonTabButton tab="tab1" href="/tab1">
                <IonIcon icon={chatbubbleEllipses} />
                <IonLabel>{t('tabs.chat')}</IonLabel>
              </IonTabButton>
              <IonTabButton tab="tab2" href="/tab2">
                <IonIcon icon={settings} />
                <IonLabel>{t('tabs.settings')}</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </IonReactRouter>
      </ConfigProvider>
    </IonApp>
  );
};

export default App;
