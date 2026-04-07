import { createContext, useContext, useEffect, useState } from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { firebaseAuth, isFirebaseConfigured } from "../services/firebase";

const AuthContext = createContext(null);

const devBypassEnabled = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
const devAdminEmail = import.meta.env.VITE_DEV_ADMIN_EMAIL || "admin@kpdevcell.dev";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (devBypassEnabled) {
      setUser({
        email: devAdminEmail,
        displayName: "Local Dev Admin",
      });
      setToken("dev-bypass-token");
      setLoading(false);
      return undefined;
    }

    if (!isFirebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setToken("");
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setToken(await firebaseUser.getIdToken());
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signIn(email, password) {
    if (devBypassEnabled) {
      setUser({
        email: email || devAdminEmail,
        displayName: "Local Dev Admin",
      });
      setToken("dev-bypass-token");
      return;
    }

    if (!firebaseAuth) {
      throw new Error("Firebase auth is not configured in this environment.");
    }

    await signInWithEmailAndPassword(firebaseAuth, email, password);
  }

  async function signOut() {
    if (devBypassEnabled) {
      setUser(null);
      setToken("");
      return;
    }

    if (firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signOut,
        authEnabled: isFirebaseConfigured,
        devBypassEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

