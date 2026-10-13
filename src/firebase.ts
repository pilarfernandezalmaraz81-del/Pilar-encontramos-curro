import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ShareLinkConfig, WorkspaceState } from './types';

export const AUTHORIZED_OWNER_EMAIL = 'pilarfernandezalmaraz81@gmail.com';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
];

export const GMAIL_SCOPES = WORKSPACE_SCOPES;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory OAuth access token cache (NEVER stored in localStorage/sessionStorage per security rules)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export const initAuth = (
  onAuthChange: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      onAuthChange(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
      }
      onAuthChange(null, null);
    }
  });
};

export const googleSignInWithGmail = async (): Promise<{
  user: User;
  accessToken: string | null;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignInWithWorkspace = googleSignInWithGmail;

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutUser = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Private Workspace Persistence (/workspaces/{userId})
export async function loadOwnerWorkspace(userId: string): Promise<WorkspaceState | null> {
  const path = `workspaces/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'workspaces', userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data?.payloadJson && typeof data.payloadJson === 'string') {
      return JSON.parse(data.payloadJson) as WorkspaceState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveOwnerWorkspace(
  user: User,
  state: WorkspaceState
): Promise<void> {
  if (!user.email || user.email.toLowerCase() !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
    throw new Error('Acceso denegado: solo la propietaria autorizada puede guardar en Firestore.');
  }
  const path = `workspaces/${user.uid}`;
  const payloadJson = JSON.stringify(state).slice(0, 890000);
  try {
    const existingSnap = await getDoc(doc(db, 'workspaces', user.uid));
    if (!existingSnap.exists()) {
      await setDoc(doc(db, 'workspaces', user.uid), {
        ownerId: user.uid,
        ownerEmail: AUTHORIZED_OWNER_EMAIL,
        payloadJson,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'workspaces', user.uid), {
        payloadJson,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteOwnerWorkspaceData(
  user: User,
  shareTokens: string[]
): Promise<void> {
  const workspacePath = `workspaces/${user.uid}`;
  try {
    for (const token of shareTokens) {
      const shareSnap = await getDoc(doc(db, 'public_shares', token));
      if (shareSnap.exists()) {
        await deleteDoc(doc(db, 'public_shares', token));
      }
    }
    const wsSnap = await getDoc(doc(db, 'workspaces', user.uid));
    if (wsSnap.exists()) {
      await deleteDoc(doc(db, 'workspaces', user.uid));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, workspacePath);
  }
}

// Public Share Snapshot Persistence (/public_shares/{token})
export async function publishCompanyShareSnapshot(
  user: User,
  shareConfig: ShareLinkConfig,
  state: WorkspaceState
): Promise<void> {
  const path = `public_shares/${shareConfig.token}`;
  // Sanitize strictly: NEVER include private notes, postal address, emails list, or Kanban data
  const sanitizedPublicProfile = {
    fullName: state.profile.fullName,
    headline: state.profile.headline,
    residenceGeneral: 'Comarca de Torrijos / Toledo, España (Vehículo propio)',
    priorityLocations: state.profile.priorityLocations,
    targetRoles: state.profile.targetRoles,
    drivingLicenseAndOwnCar: state.profile.drivingLicenseAndOwnCar,
    acceptedSchedules: state.profile.acceptedSchedules,
    acceptedModalities: state.profile.acceptedModalities,
    professionalGoal: state.profile.professionalGoal,
    publicContactEmail: state.profile.publicContactEmail,
    publicContactPhoneOptional: state.profile.publicContactPhoneOptional,
    experiences: state.profile.experiences.filter((e) => e.verifiedByOwner),
    education: state.profile.education.filter((e) => e.verifiedByOwner),
    confirmedSkills: state.profile.confirmedSkills,
    digitalTools: state.profile.digitalTools,
    recommendationLetters: state.profile.recommendationLetters.filter(
      (r) => r.confirmedAuthenticByUser
    ),
    customGreeting: shareConfig.customGreeting,
    companyName: shareConfig.companyName,
  };

  const publicProfileJson = JSON.stringify(sanitizedPublicProfile).slice(0, 240000);
  const effectiveIsActive = Boolean(state.profile.publicWebEnabled && shareConfig.isActive);

  try {
    const existing = await getDoc(doc(db, 'public_shares', shareConfig.token));
    if (!existing.exists()) {
      await setDoc(doc(db, 'public_shares', shareConfig.token), {
        token: shareConfig.token,
        ownerId: user.uid,
        companyName: shareConfig.companyName.slice(0, 120),
        isActive: effectiveIsActive,
        requiresPin: Boolean(shareConfig.requiresPin),
        pinCode: (shareConfig.pinCode || '').slice(0, 64),
        expiresAtIso: shareConfig.expiresAtIso.slice(0, 64),
        allowCvDownload: Boolean(shareConfig.allowCvDownload),
        publicProfileJson,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'public_shares', shareConfig.token), {
        companyName: shareConfig.companyName.slice(0, 120),
        isActive: effectiveIsActive,
        requiresPin: Boolean(shareConfig.requiresPin),
        pinCode: (shareConfig.pinCode || '').slice(0, 64),
        expiresAtIso: shareConfig.expiresAtIso.slice(0, 64),
        allowCvDownload: Boolean(shareConfig.allowCvDownload),
        publicProfileJson,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchPublicShareByToken(token: string): Promise<{
  token: string;
  companyName: string;
  isActive: boolean;
  requiresPin: boolean;
  pinCode: string;
  expiresAtIso: string;
  allowCvDownload: boolean;
  publicProfile: any;
} | null> {
  const cleanToken = token.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64);
  if (!cleanToken) return null;
  try {
    const snap = await getDoc(doc(db, 'public_shares', cleanToken));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      token: data.token,
      companyName: data.companyName,
      isActive: Boolean(data.isActive),
      requiresPin: Boolean(data.requiresPin),
      pinCode: data.pinCode || '',
      expiresAtIso: data.expiresAtIso,
      allowCvDownload: Boolean(data.allowCvDownload),
      publicProfile: JSON.parse(data.publicProfileJson || '{}'),
    };
  } catch {
    return null;
  }
}
