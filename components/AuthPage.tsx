import React, { useState } from 'react';
import { UserIcon, LockIcon, ArrowRightIcon, ArrowLeftIcon, GoogleIcon } from './icons';
import { signInWithGoogle, isFirebaseConfigured } from '../services/firebase';

interface AuthPageProps {
  onAuthSuccess: (user: { email: string }) => void;
  onBack: () => void;
  canGoBack: boolean;
  initialView?: 'login' | 'signup';
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onBack, canGoBack, initialView }) => {
  const [isLoginView, setIsLoginView] = useState(initialView !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
  
  const FirebaseWarning = () => (
    <div className="bg-orange-100 dark:bg-orange-900/50 border-l-4 border-orange-500 text-orange-700 dark:text-orange-300 p-4 rounded-r-lg" role="alert">
        <p className="font-bold">Firebase Not Configured</p>
        <p className="text-sm mt-1">
            Authentication is disabled. Please replace the placeholder values in 
            the <code className="bg-orange-200 dark:bg-orange-800/60 p-1 rounded text-xs">firebaseConfig</code> object 
            inside the <code className="bg-orange-200 dark:bg-orange-800/60 p-1 rounded text-xs">services/firebase.ts</code> file. 
            Detailed instructions are available in the comments within that file.
        </p>
    </div>
  );

  const validate = () => {
    const newErrors: { [key: string]: string | null } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
        newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long.";
    }

    if (!isLoginView) {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password.";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Auth success is now handled by the onAuthStateChanged listener in App.tsx,
      // which will automatically navigate the user away from the login page.
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      let errorMessage = "Failed to sign in with Google. Please ensure popups are not blocked and try again.";
      if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = "Sign-in window was closed. Please try again.";
      } else if (error.code === 'auth/api-key-not-valid') {
          errorMessage = "The application's API key is not valid. Please contact the administrator.";
      } else if (error.message && error.message.includes('identity-toolkit-api-has-not-been-used-in-project')) {
          errorMessage = "Firebase setup is incomplete. The Identity Toolkit API must be enabled for your project. Please follow the setup instructions in services/firebase.ts to fix this."
      }
      setErrors({ form: errorMessage });
    }
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    alert("In a real application, this would send a password reset link to your email.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    try {
      if (isLoginView) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (user) {
          onAuthSuccess({ email });
        } else {
          setErrors({ form: 'Invalid email or password.' });
        }
      } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some((u: any) => u.email === email)) {
          setErrors({ email: 'An account with this email already exists.' });
          return;
        }
        users.push({ email, password });
        localStorage.setItem('users', JSON.stringify(users));
        onAuthSuccess({ email });
      }
    } catch (e) {
      setErrors({ form: "An unexpected error occurred. Please try again." });
    }
  };
  
  const inputStyles = "form-input w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none transition-all dark:bg-gray-700 dark:text-white";
  const errorInputStyles = "border-red-500 ring-2 ring-red-500/50";
  const normalInputStyles = "border-gray-300 dark:border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 dark:focus:border-cyan-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 pt-20 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:border dark:border-gray-700 p-8 space-y-6 relative">
        {canGoBack && (
            <button 
                onClick={onBack}
                className="absolute top-6 left-6 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                aria-label="Go back"
            >
                <ArrowLeftIcon className="h-7 w-7" />
            </button>
        )}
        <div>
          <h2 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-100">
            {isLoginView ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-2">
            {isLoginView ? 'Log in to access your saved trips.' : 'Sign up to start planning your dream trips.'}
          </p>
        </div>

        {!isFirebaseConfigured && <FirebaseWarning />}
        
        <div className="space-y-4">
            <button 
                onClick={handleGoogleSignIn}
                disabled={!isFirebaseConfigured}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow-md hover:-translate-y-px transform transition-all duration-300 ease-in-out active:scale-95 active:shadow-sm active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <GoogleIcon className="h-5 w-5" />
                Continue with Google
            </button>
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">OR</span></div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={`${inputStyles} ${errors.email ? errorInputStyles : normalInputStyles}`}
              aria-invalid={!!errors.email}
              aria-describedby="email-error"
              disabled={!isFirebaseConfigured}
            />
             {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1 ml-2">{errors.email}</p>}
          </div>
          <div className="relative">
            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={`${inputStyles} ${errors.password ? errorInputStyles : normalInputStyles}`}
              aria-invalid={!!errors.password}
              aria-describedby="password-error"
              disabled={!isFirebaseConfigured}
            />
            {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1 ml-2">{errors.password}</p>}
          </div>
          {!isLoginView && (
            <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className={`${inputStyles} ${errors.confirmPassword ? errorInputStyles : normalInputStyles}`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby="confirm-password-error"
                disabled={!isFirebaseConfigured}
                />
                {errors.confirmPassword && <p id="confirm-password-error" className="text-red-500 text-xs mt-1 ml-2">{errors.confirmPassword}</p>}
            </div>
          )}
          {isLoginView && (
            <div className="text-right">
                <button
                    onClick={handleForgotPassword}
                    className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-500 focus:outline-none focus-visible:underline"
                    disabled={!isFirebaseConfigured}
                >
                    Forgot Password?
                </button>
            </div>
          )}
          {errors.form && <p className="text-red-500 text-sm text-center">{errors.form}</p>}
          <button
            type="submit"
            disabled={!isFirebaseConfigured}
            className="w-full py-3 px-4 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-300 ease-in-out active:scale-95 active:shadow-sm active:translate-y-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-700 dark:focus-visible:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoginView ? 'Login' : 'Create Account'}
            <ArrowRightIcon className="h-5 w-5 ml-2" />
          </button>
        </form>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
                setIsLoginView(!isLoginView);
                setErrors({});
            }}
            className="font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-500 focus:outline-none focus-visible:underline"
          >
            {isLoginView ? 'Sign Up' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
