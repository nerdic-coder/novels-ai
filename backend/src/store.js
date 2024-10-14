import admin from './admin.js';

export default async function storeMetadata(
  uid,
  requestId,
  title,
  chapters,
  messages,
  starring,
  genre,
  style,
  plot,
  voice,
  pov,
) {
  const audioBucketUrl = `https://storage.googleapis.com/generated-books/${uid}/${requestId}/`;
  const chaptersData = [];
  for (let index = 1; index <= chapters; index += 1) {
    chaptersData.push({
      chapterId: index,
      chapterUrl: `${audioBucketUrl}chapter-${index}.wav`,
    });
  }
  // Create a reference to the Firestore collection for the user
  const userRef = admin.firestore().collection('users').doc(uid);
  // Check if the user document already exists
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    // If the user document does not exist, create it with an empty audiobooks array
    await userRef.set({});
  }

  // Create a reference to the audiobooks collection for the user
  const audiobooksRef = userRef.collection('audiobooks');

  // Add the new audiobook to the audiobooks collection
  return audiobooksRef.add({
    requestId,
    title,
    chapters: chaptersData,
    messages,
    starring,
    genre,
    style,
    plot,
    voice,
    pov,
    status: 'progress',
    createdDate: new Date(),
  });
}

export async function spendUserPoints(userRef, points) {
  let userSnapshot = await userRef.get();
  let userPoints;

  // If user does not exist, create with default points
  if (!userSnapshot.exists || !Object.prototype.hasOwnProperty.call(userSnapshot.data(), 'points')) {
    await userRef.set({
      points: 1,
    });
    userPoints = 1;
  }

  userSnapshot = await userRef.get();
  userPoints = userSnapshot.data().points || 0;

  if (userPoints > 0) {
    await userRef.update({ points: userPoints - points });
  } else {
    await userRef.update({ points: 0 });
    userPoints = 0;
  }

  return userPoints;
}
