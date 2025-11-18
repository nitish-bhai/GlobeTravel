import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

// --- 🛑 ATTENTION: ACTION REQUIRED 🛑 ---
//
// You are seeing a Firebase error, likely one of the following:
//   - "auth/api-key-not-valid"
//   - "auth/identity-toolkit-api-has-not-been-used-in-project..."
//
// This is because your Firebase project has not been configured correctly.
//
// PLEASE FOLLOW THESE STEPS CAREFULLY:
//
// --- PART 1: GET YOUR FIREBASE CONFIGURATION ---
//
// 1. Go to the Firebase Console: https://console.firebase.google.com/
// 2. Create a new project (or use an existing one).
// 3. In your project, go to Project Settings (click the ⚙️ icon) > General tab.
// 4. Under "Your apps", click the web icon (</>) to register a new web app.
// 5. Give your app a nickname and click "Register app".
// 6. You will be shown a `firebaseConfig` object. COPY this entire object.
// 7. PASTE the copied object here, replacing the placeholder `firebaseConfig` below.
//
// --- PART 2: ENABLE AUTHENTICATION METHODS ---
//
// 8. In the Firebase console, navigate to "Authentication" from the left menu.
// 9. Go to the "Sign-in method" tab.
// 10. Click on "Google" from the list of providers, enable it, and save.
//
// --- PART 3: ENABLE THE NECESSARY GOOGLE CLOUD API (IMPORTANT FIX!) ---
//
// 11. The error "identity-toolkit-api-has-not-been-used..." means a required
//     API is disabled in your Google Cloud project.
// 12. Click this link to go directly to the API page:
//     https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com
// 13. Make sure the project selected in the top navigation bar is the SAME
//     as your Firebase project.
// 14. Click the "ENABLE" button. If it's already enabled, you don't need to do anything.
// 15. Wait a few minutes for the change to take effect.
//
// --- AFTER COMPLETING, YOUR CONFIG SHOULD LOOK LIKE THIS: ---
// const firebaseConfig = {
//   apiKey: "AIzaSy...your...key",
//   authDomain: "your-project-id.firebaseapp.com",
//   projectId: "your-project-id",
//   storageBucket: "your-project-id.appspot.com",
//   messagingSenderId: "123456789012",
//   appId: "1:123456789012:web:abcdef1234567890"
// };
//
const firebaseConfig = {
  apiKey: "AIzaSyBbf_QVoasQRQNRMmagdIj_fBZ7-136jFU",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check for placeholder values
export const isFirebaseConfigured = !Object.values(firebaseConfig).some(
    (value) => typeof value === 'string' && value.includes('YOUR_')
);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  // This function initiates the Google Sign-In popup flow.
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  // This function signs the current user out.
  return signOut(auth);
};

// Exporting onAuthStateChanged to be used in App.tsx to listen for auth state changes.
export { onAuthStateChanged };
export type { User as FirebaseUser };
