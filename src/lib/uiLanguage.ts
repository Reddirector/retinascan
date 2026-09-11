import { useEffect, useState } from "react";

type Dictionary = Record<string, string>;
const translations: Record<string, Dictionary> = {
  Dutch: { "New Screening": "Nieuwe screening", "Screening History": "Screeninggeschiedenis", Patients: "Patiënten", Reports: "Rapporten", Settings: "Instellingen", Notifications: "Meldingen", "Mark all as read": "Alles als gelezen markeren", "AI System Online": "AI-systeem online", "Clinical handoff": "Klinische overdracht", Image: "Afbeelding", Quality: "Beeldkwaliteit", Analysis: "AI-analyse", Evidence: "Bewijs", Verification: "Verificatie", "Clinician review": "Beoordeling door arts", "New Retinal Screening": "Nieuwe netvliesscreening", "AI-assisted diabetic retinopathy assessment": "AI-ondersteunde beoordeling van diabetische retinopathie" },
  French: { "New Screening": "Nouveau dépistage", "Screening History": "Historique des dépistages", Patients: "Patients", Reports: "Rapports", Settings: "Paramètres", Notifications: "Notifications", "Mark all as read": "Tout marquer comme lu", "AI System Online": "Système IA en ligne", "Clinical handoff": "Synthèse clinique", Image: "Image", Quality: "Qualité d’image", Analysis: "Analyse IA", Evidence: "Preuves", Verification: "Vérification", "Clinician review": "Revue clinicien", "New Retinal Screening": "Nouveau dépistage rétinien", "AI-assisted diabetic retinopathy assessment": "Évaluation assistée par IA de la rétinopathie diabétique" },
  Hindi: { "New Screening": "नई स्क्रीनिंग", "Screening History": "स्क्रीनिंग इतिहास", Patients: "मरीज़", Reports: "रिपोर्ट", Settings: "सेटिंग्स", Notifications: "सूचनाएँ", "Mark all as read": "सभी को पढ़ा हुआ चिह्नित करें", "AI System Online": "AI सिस्टम ऑनलाइन", "Clinical handoff": "क्लिनिकल सारांश", Image: "छवि", Quality: "छवि गुणवत्ता", Analysis: "AI विश्लेषण", Evidence: "साक्ष्य", Verification: "सत्यापन", "Clinician review": "चिकित्सक समीक्षा", "New Retinal Screening": "नई रेटिनल स्क्रीनिंग", "AI-assisted diabetic retinopathy assessment": "डायबिटिक रेटिनोपैथी का AI-सहायित आकलन" },
};

export function translate(language: string, text: string) { return translations[language]?.[text] ?? text; }
export function useUiLanguage() {
  const [language, setLanguage] = useState(() => localStorage.getItem("rs.language") ?? "English");
  useEffect(() => { const refresh = () => setLanguage(localStorage.getItem("rs.language") ?? "English"); window.addEventListener("rs-preferences", refresh); return () => window.removeEventListener("rs-preferences", refresh); }, []);
  return (text: string) => translate(language, text);
}
