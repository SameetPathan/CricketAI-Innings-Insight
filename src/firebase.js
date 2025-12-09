import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiJf1SDTPpfRHr4NwckDu_1ImNpju6y14",
  authDomain: "jarvis-systems-commons.firebaseapp.com",
  databaseURL: "https://jarvis-systems-commons-default-rtdb.firebaseio.com",
  projectId: "jarvis-systems-commons",
  storageBucket: "jarvis-systems-commons.appspot.com",
  messagingSenderId: "383480447879",
  appId: "1:383480447879:web:45baeaa9517cbb97088922",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const storage = getStorage(app);
