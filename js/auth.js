/**
 * Auth Helpers
 * Wraps Firebase Auth methods and handles redirects & fallback authentication.
 */

import { initFirebase, db, auth, isFirebaseConfigured } from './firebase-client.js';
import { signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

export async function loginWithGoogle() {
  const configured = await initFirebase();
  if (!configured || !auth) {
    return { data: null, error: { message: 'Firebase not configured.' } };
  }

  try {
    // Redirect flow: popups are blocked by many mobile and in-app browsers
    await signInWithRedirect(auth, new GoogleAuthProvider());
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message || 'Google Authentication failed.' } };
  }
}

// Call on page load to finish a Google redirect sign-in
export async function completeGoogleRedirect() {
  const configured = await initFirebase();
  if (!configured || !auth) {
    return { data: null, error: null };
  }

  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) {
      return { data: null, error: null };
    }

    // Check if the user is the authorized admin
    if (result.user.email !== 'orvillewilliams010@gmail.com') {
      await signOut(auth);
      return { data: null, error: { message: 'Unauthorized. Only the owner can access this portal.' } };
    }

    return { data: { user: result.user, session: { user: result.user } }, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message || 'Google Authentication failed.' } };
  }
}

export async function loginWithEmail(email, password) {
  const configured = await initFirebase();
  if (!configured || !auth) {
    if (email && password && password.length >= 6) {
      const mockSession = {
        user: { email, id: 'demo-owner-id', user_metadata: { name: 'Barbershop Owner' } },
        is_demo: true
      };
      localStorage.setItem('bearded_demo_session', JSON.stringify(mockSession));
      return { data: { session: mockSession, user: mockSession.user }, error: null };
    }
    return { data: null, error: { message: 'Please enter a valid email and password (min 6 characters).' } };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { data: { user: userCredential.user, session: { user: userCredential.user } }, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message || 'Authentication failed.' } };
  }
}

export async function logout() {
  localStorage.removeItem('bearded_demo_session');
  await initFirebase();
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
  }
  window.location.href = './login.html';
}

export async function getSession() {
  const configured = await initFirebase();
  if (!configured || !auth) {
    const demo = localStorage.getItem('bearded_demo_session');
    if (demo) {
      try {
        return JSON.parse(demo);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve({ user });
      } else {
        const demo = localStorage.getItem('bearded_demo_session');
        resolve(demo ? JSON.parse(demo) : null);
      }
    });
  });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = './login.html';
    return null;
  }
  return session;
}
