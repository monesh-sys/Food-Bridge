import { auth, db, firebaseConfigured } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

const loginForm = $("loginForm");
const signupForm = $("signupForm");
const message = $("authMessage");

let coords = null;
let pendingProfile = null;

// DISPLAY MESSAGE
function showMessage(t, error = false) {
  message.textContent = t;
  message.classList.remove("hidden", "error");

  if (error) {
    message.classList.add("error");
  }
}

// FIREBASE ERROR HANDLING
function explain(err) {
  const code = err?.code || "";

  const known = {
    "auth/email-already-in-use":
      "This email already has an account. Switch to Sign in and use the same email/password.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/user-not-found":
      "No account was found with this email address.",

    "auth/weak-password":
      "Use a password with at least 6 characters.",

    "auth/wrong-password":
      "Incorrect password. Please try again.",

    "auth/invalid-credential":
      "Incorrect email or password. Please check your details.",

    "auth/too-many-requests":
      "Too many attempts. Please wait before trying again.",

    "auth/operation-not-allowed":
      "Enable Email/Password in Firebase Console → Authentication.",

    "auth/network-request-failed":
      "Network error. Check your internet connection.",

    "auth/unauthorized-domain":
      "Add this domain in Firebase Console → Authentication → Settings → Authorized domains.",

    "permission-denied":
      "Firebase sign-in succeeded, but Firestore blocked profile saving. Check your Firestore rules.",

    "unavailable":
      "Firestore is temporarily unavailable. Check your connection and retry."
  };

  return known[code] ||
    `${err?.message || "Unknown error"}${code ? ` (${code})` : ""}`;
}

// FIREBASE CONFIGURATION CHECK
function ready() {
  if (!firebaseConfigured) {
    showMessage(
      "Firebase is not configured. Check your Firebase Web App config in js/firebase.js.",
      true
    );
    return false;
  }

  return true;
}

// SAVE USER PROFILE
async function saveProfile(user, p) {
  const profile = {
    name: p.name || user.displayName || "FoodBridge user",
    email: user.email || "",
    role: p.role || "donor",
    orgName: p.orgName || "",
    createdAt: serverTimestamp()
  };

  if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
    profile.lat = p.lat;
    profile.lng = p.lng;
  }

  await setDoc(doc(db, "users", user.uid), profile, {
    merge: true
  });

  await setDoc(doc(db, "publicProfiles", user.uid), {
    uid: user.uid,
    name: profile.name,
    role: profile.role,
    orgName: profile.orgName,
    ...(profile.lat !== undefined
      ? { lat: profile.lat, lng: profile.lng }
      : {}),
    createdAt: profile.createdAt
  }, {
    merge: true
  });
}

// LOCATION DETECTION
$("signupLocation")?.addEventListener("click", () => {
  const status = $("signupLocationStatus");

  if (!navigator.geolocation) {
    status.textContent =
      "Location is unsupported. You can continue without it.";
    return;
  }

  status.textContent = "Requesting location permission…";

  navigator.geolocation.getCurrentPosition(
    p => {
      coords = {
        lat: p.coords.latitude,
        lng: p.coords.longitude
      };

      status.textContent =
        "Location saved for nearby matching.";
    },
    e => {
      status.textContent =
        `Location unavailable (${e.message}). You can continue without it.`;
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000
    }
  );
});

// SWITCH LOGIN / SIGNUP
$("switchMode").addEventListener("click", () => {
  const up = signupForm.classList.contains("hidden");

  signupForm.classList.toggle("hidden", !up);
  loginForm.classList.toggle("hidden", up);

  $("formTitle").textContent =
    up ? "Create your account" : "Welcome back";

  $("formDescription").textContent =
    up
      ? "Join the FoodBridge community."
      : "Sign in to continue.";

  $("switchText").textContent =
    up
      ? "Already have an account?"
      : "New to FoodBridge?";

  $("switchMode").textContent =
    up ? "Sign in" : "Create an account";

  message.classList.add("hidden");
});

// FORGOT PASSWORD
const forgotButton = $("forgotPasswordButton");

console.log("Forgot password button:", forgotButton);

forgotButton?.addEventListener("click", async () => {
    console.log("Forgot password clicked!");

    if (!ready()) return;

    const email = $("loginEmail").value.trim();

    if (!email) {
        showMessage("Please enter your email address first.", true);
        $("loginEmail").focus();
        return;
    }

    try {
        showMessage("Sending password reset email...");

        await sendPasswordResetEmail(auth, email);

        showMessage(
            "Password reset email sent! Check your inbox and spam folder."
        );

    } catch (error) {
        console.error("Password reset error:", error);
        showMessage(explain(error), true);
    }
});

  } finally {
    button.disabled = false;
    button.textContent = "Forgot password?";
  }
});

// LOGIN
loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  if (!ready()) return;

  const b = loginForm.querySelector('button[type="submit"]');

  b.disabled = true;

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );

    const snap = await getDoc(
      doc(db, "users", cred.user.uid)
    );

    if (!snap.exists()) {
      const role = new URLSearchParams(location.search).get("role");

      await saveProfile(
        cred.user,
        pendingProfile || {
          name: cred.user.displayName ||
            cred.user.email.split("@")[0],
          role: role === "trust" ? "trust" : "donor",
          orgName: ""
        }
      );
    }

    location.href = "dashboard.html";

  } catch (err) {
    showMessage(explain(err), true);

  } finally {
    b.disabled = false;
  }
});

// SIGNUP
signupForm.addEventListener("submit", async e => {
  e.preventDefault();

  if (!ready()) return;

  const b = signupForm.querySelector('button[type="submit"]');

  b.disabled = true;

  try {
    const p = {
      name: $("signupName").value.trim(),
      role: $("signupRole").value,
      orgName: $("signupOrg").value.trim()
    };

    pendingProfile = {
      ...p,
      ...(coords || {})
    };

    const cred = await createUserWithEmailAndPassword(
      auth,
      $("signupEmail").value.trim(),
      $("signupPassword").value
    );

    await updateProfile(cred.user, {
      displayName: p.name
    });

    await saveProfile(cred.user, pendingProfile);

    location.href = "dashboard.html";

  } catch (err) {
    showMessage(explain(err), true);

  } finally {
    b.disabled = false;
  }
});

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (
    user &&
    location.pathname.endsWith("login.html")
  ) {
    const role = new URLSearchParams(location.search).get("role");

    if (role === "donor" || role === "trust") {
      $("signupRole").value = role;
    }
  }
});

// INITIAL CHECK
if (!firebaseConfigured) {
  showMessage(
    "Setup required: add your Firebase Web App config in js/firebase.js before creating an account.",
    true
  );
}
