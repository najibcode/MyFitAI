import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  type User, 
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { getCloudProfile, clearAllLocalState, type CloudData } from '../services/cloudSync';
import { storage } from '../utils/storage';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous?: boolean;
}

interface AuthContextType {
  user: User | AppUser | null;
  loading: boolean;
  cloudData: CloudData | null;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | AppUser | null>(() => {
    return storage.get<AppUser>('myfitai_local_guest');
  });
  const [loading, setLoading] = useState(true);
  const [cloudData, setCloudData] = useState<CloudData | null>(null);

  useEffect(() => {
    // Safety fallback: if auth takes too long to initialize, unblock UI
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(safetyTimer);
      if (currentUser) {
        setUser(currentUser);
        storage.remove('myfitai_local_guest');
        // Fetch cloud profile in the background without blocking the UI
        getCloudProfile()
          .then((data) => setCloudData(data))
          .catch(() => setCloudData(null));
      } else {
        const localGuest = storage.get<AppUser>('myfitai_local_guest');
        if (localGuest) {
          setUser(localGuest);
        } else {
          setUser(null);
          setCloudData(null);
        }
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const loginAsGuest = () => {
    const guestUser: AppUser = {
      uid: 'guest_athlete',
      email: null,
      displayName: 'Guest Athlete',
      isAnonymous: true,
    };
    storage.set('myfitai_local_guest', guestUser);
    setUser(guestUser);
  };

  const logout = async () => {
    try {
      storage.remove('myfitai_local_guest');
      clearAllLocalState();
      await signOut(auth).catch(() => {});
      window.location.reload(); // Guarantee memory is flushed
    } catch (error) {
      console.error('Logout error:', error);
      window.location.reload();
    }
  };

  const value = {
    user,
    loading,
    cloudData,
    loginAsGuest,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
