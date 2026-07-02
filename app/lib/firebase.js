import admin from 'firebase-admin';

// Singleton: evita múltiplas inicializações em hot-reload do Next.js
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  // Suporta chave com \n literal (como vem de variável de ambiente)
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export function getFirestore() {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}
