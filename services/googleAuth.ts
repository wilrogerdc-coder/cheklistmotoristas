
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Interfaces para compatibilidade com o restante do app
export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  displayName?: string;
  photoURL?: string;
}

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        const googleUser: GoogleUser = {
          email: user.email || '',
          name: user.displayName || '',
          picture: user.photoURL || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || ''
        };
        if (onAuthSuccess) onAuthSuccess(googleUser, cachedAccessToken);
      } else if (!isSigningIn) {
        // Se temos usuário mas não temos token, precisamos pedir login novamente
        // para obter o token de acesso (Firebase não persiste o token de acesso OAuth no storage)
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: GoogleUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    
    const googleUser: GoogleUser = {
      email: result.user.email || '',
      name: result.user.displayName || '',
      picture: result.user.photoURL || '',
      displayName: result.user.displayName || '',
      photoURL: result.user.photoURL || ''
    };

    return { user: googleUser, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no login Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const fetchUserProfile = async (token: string): Promise<GoogleUser> => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao obter perfil do Google');
  return await res.json();
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const saveGoogleSession = (user: GoogleUser, token: string) => {
  // Mantido apenas para compatibilidade de assinatura, 
  // mas agora o Firebase gerencia a sessão.
  cachedAccessToken = token;
};
