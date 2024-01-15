const API_URL_ADD_CHAPTER = 'https://add-chapter-i3rsqvn75a-lm.a.run.app/';
const API_URL_GENERATE_NEW_NOVEL = 'https://generate-audiobook-i3rsqvn75a-lm.a.run.app/';
const API_URL_REMOVE_NOVEL = 'https://delete-audiobook-i3rsqvn75a-lm.a.run.app/';

const STORIES_PER_PAGE = 5;
const NEW_USER_POINTS = 1;

firebase.initializeApp({
    apiKey: 'AIzaSyBzegpGaNrC-KHupiuNXnjI2XxkoaXzm2o',
    authDomain: 'novels-ai.com',
    databaseURL: 'https://ai-audiobook.firebaseio.com',
    projectId: 'ai-audiobook',
});
