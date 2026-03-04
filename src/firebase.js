import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeApp } from "firebase/app";

const hardcodedConfig = {
  apiKey: "AIzaSyCIANQH87AVTl9ms_V9zx_695Em8G9-mAU",
  authDomain: "securityramarama.firebaseapp.com",
  projectId: "securityramarama",
  storageBucket: "securityramarama.firebasestorage.app",
  messagingSenderId: "968676126617",
  appId: "1:968676126617:web:2b5a580cfad27e3bc6ad08",
  measurementId: "G-8CJVL1B94N",
};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || hardcodedConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || hardcodedConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || hardcodedConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || hardcodedConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || hardcodedConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || hardcodedConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || hardcodedConfig.measurementId,
};

const app = initializeApp(firebaseConfig);
const analytics = null;

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { analytics };
export default app;
