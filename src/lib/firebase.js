import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCCzLB8_aDkUmOzMw_4oKgpYMgMh8DhnEA',
  authDomain: 'food-resuce-agent.firebaseapp.com',
  projectId: 'food-resuce-agent',
  storageBucket: 'food-resuce-agent.firebasestorage.app',
  messagingSenderId: '1000541592276',
  appId: '1:1000541592276:web:95b6f0b36e98d65dd57941',
  measurementId: 'G-0C9LXLXZPT',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
