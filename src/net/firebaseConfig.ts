/**
 * ============================================================================
 * CONFIGURATION FIREBASE - [CYBERSTRIKE // PROTOCOL]
 * ============================================================================
 * 
 * Ce fichier regroupe la configuration Firebase pour :
 *  - Firebase Authentication (authentification anonyme pour chaque joueur)
 *  - Cloud Firestore (stockage persistant des profils, crédits, skins et statistiques)
 * 
 * INSTRUCTIONS POUR REMPLIR VOS CLÉS :
 * 1. Rendez-vous sur la console Firebase : https://console.firebase.google.com/
 * 2. Créez un projet ou sélectionnez votre projet existant
 * 3. Activez "Authentication" -> Méthodes de connexion -> Activez "Anonyme"
 * 4. Activez "Cloud Firestore" (en mode production ou test)
 * 5. Créez une application Web ("</>") et copiez les paramètres firebaseConfig ci-dessous,
 *    ou renseignez votre fichier `.env` avec les variables VITE_FIREBASE_* correspondantes.
 */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Configuration chargée depuis les variables d'environnement Vite ou placeholders
export const firebaseConfig: FirebaseClientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "VOTRE_API_KEY_ICI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "votre-projet.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "votre-projet-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "votre-projet.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

/**
 * Vérifie si les identifiants Firebase ont été renseignés ou s'il s'agit de placeholders
 */
export function isFirebaseConfigured(): boolean {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== "VOTRE_API_KEY_ICI" &&
    firebaseConfig.projectId !== "votre-projet-id" &&
    !firebaseConfig.apiKey.startsWith("VOTRE_")
  );
}
