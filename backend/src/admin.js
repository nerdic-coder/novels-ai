import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.ADMIN_SECRET)),
  databaseURL: 'https://ai-audiobook.firebaseio.com',
});

export default admin;
