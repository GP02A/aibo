import { useState } from "react";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { useTranslation } from "react-i18next";
import { eyeOutline, eyeOffOutline, create } from "ionicons/icons";
import { ModelConfiguration } from "./types";

interface ActiveConfigDisplayProps {
  activeConfig: ModelConfiguration;
  onEditConfig: (config: ModelConfiguration) => void;
}

const ActiveConfigDisplay: React.FC<ActiveConfigDisplayProps> = ({
  activeConfig,
  onEditConfig,
}) => {
  const { t } = useTranslation();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <IonCard className="ion-margin">
      <IonCardHeader>
        <IonCardTitle>{activeConfig.name}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonText>
          <p>
            <strong>{t("settings.baseUrl")}:</strong> {activeConfig.baseURL}
          </p>
          <p>
            <strong>{t("settings.modelName")}:</strong> {activeConfig.model}
          </p>
          {activeConfig.showAdvancedConfig && (
            <p>
              <strong>{t("settings.advancedConfig")}:</strong>{" "}
              {t("common.enabled")}
            </p>
          )}
        </IonText>
        <IonItem lines="none">
          <IonLabel>
            <h3><IonText color="secondary">{t("settings.apiKey")}</IonText></h3>
            {showApiKey
              ? activeConfig.apiKey || t("settings.noApiKey")
              : activeConfig.apiKey
              ? "•".repeat(Math.min(activeConfig.apiKey.length, 20))
              : t("settings.noApiKey")}
          </IonLabel>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => setShowApiKey(!showApiKey)}
            slot="end"
          >
            <IonIcon icon={showApiKey ? eyeOffOutline : eyeOutline} />
          </IonButton>
          <IonButton
            fill="outline"
            size="small"
            onClick={() => onEditConfig(activeConfig)}
            slot="end"
          >
            <IonIcon icon={create} slot="start" />
            {t("settings.editApiKey")}
          </IonButton>
        </IonItem>
        <IonText className="ion-padding-start">
          <p className="ion-text-wrap">{t("settings.apiKeyDescription")}</p>
        </IonText>
      </IonCardContent>
    </IonCard>
  );
};

export default ActiveConfigDisplay;
