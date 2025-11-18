import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    User,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbjUTjMcbxIowsqynitjIoCLCOQQitzIE",
  authDomain: "globetrecker-19599.firebaseapp.com",
  databaseURL: "https://globetrecker-19599-default-rtdb.firebaseio.com",
  projectId: "globetrecker-19599",
  storageBucket: "globetrecker-19599.firebasestorage.app",
  messagingSenderId: "631774811400",
  appId: "1:631774811400:web:729eda7c0541f9657d48bd"
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

export const signUpWithEmail = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const forgotPassword = (email: string) => {
    return sendPasswordResetEmail(auth, email);
};

export const logout = () => {
  // This function signs the current user out.
  return signOut(auth);
};

// Exporting onAuthStateChanged to be used in App.tsx to listen for auth state changes.
export { onAuthStateChanged };
export type { User as FirebaseUser };