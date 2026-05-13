import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import config from './environment.js';

let firebaseApp: App | null = null;

const hasFirebaseCredentials = (): boolean => {
  return Boolean(config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey);
};

export const getFirebaseApp = (): App | null => {
  if (!hasFirebaseCredentials()) {
    return null;
  }

  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
  });

  return firebaseApp;
};

export const getFirebaseMessaging = (): Messaging | null => {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  return getMessaging(app);
};
