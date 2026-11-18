import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEdouIhCg8p_gt_Zco_Z2sNKjeR50TiVU",
  authDomain: "materiareativa.firebaseapp.com",
  projectId: "materiareativa",
  storageBucket: "materiareativa.firebasestorage.app",
  messagingSenderId: "777380462082",
  appId: "1:777380462082:web:bb9159210477549aaff11b",
  measurementId: "G-V19BWHX5ZL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
