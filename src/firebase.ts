// Firebase initialization (simplrun-fb-dev).
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB118hVNA4PVXPt86mRpL3c9xyMlIn7K8Q",
  authDomain: "simplrun-fb-dev.firebaseapp.com",
  projectId: "simplrun-fb-dev",
  storageBucket: "simplrun-fb-dev.firebasestorage.app",
  messagingSenderId: "406209147306",
  appId: "1:406209147306:web:21fe84963dc81fa6d4fbd3",
  measurementId: "G-NHKC59WXRD",
};

export const app = initializeApp(firebaseConfig);

// Analytics only runs in supported browser environments; guard so it never
// throws during SSR/build or in unsupported contexts.
export let analytics: Analytics | null = null;
void isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
});
