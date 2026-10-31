# FoodBridge — Firebase Hackathon Prototype

FoodBridge is a prototype that helps food donors publish surplus-food listings and lets community organizations request collection.

## Project structure

- `index.html` — public landing page
- `login.html` — email/password sign in and registration
- `dashboard.html` — summary of donation activity
- `donate.html` — publish a food donation
- `requests.html` — browse available donations and submit requests
- `admin.html` — admin donation-status management
- `css/style.css` — responsive styling
- `js/firebase.js` — Firebase initialization
- `js/auth.js` — registration, sign in and sign out
- `js/dashboard.js` — dashboard data
- `js/donations.js` — donation publishing
- `js/requests.js` — requests
- `js/admin.js` — admin panel
- `firestore.rules` — database permissions
- `firebase.json` — Firebase Hosting setup

## 1. Create a Firebase project

1. Open https://console.firebase.google.com/ and create a project.
2. Add a Web App to the project.
3. Copy the Firebase configuration object into `js/firebase.js`, replacing every `PASTE_...` placeholder.
4. In **Authentication → Sign-in method**, enable **Email/Password**.
5. In **Firestore Database**, create a database.
6. Open Firestore **Rules**, paste `firestore.rules`, and publish the rules.

Do not put private service-account keys in browser code. Firebase web config is designed for client apps, but access is protected by Authentication and Firestore rules.

## 2. Run locally

Because the project uses JavaScript modules, do not open `index.html` by double-clicking it (`file://`).

In VS Code, install/use Live Server and open `index.html` with Live Server, or run a local HTTP server from this directory. Add `localhost` to Firebase Authentication's authorized domains if Firebase asks.

## 3. Make an admin account

1. Create a normal account through `login.html`.
2. Open Firebase Console → Firestore Database → `users`.
3. Open the document whose ID is that account's Firebase Authentication UID.
4. Change its `role` field from `donor` or `trust` to `admin`.
5. Reload the site and open `admin.html`.

Only a trusted project owner should assign the admin role. Do not allow users to choose `admin` in the registration form.

## 4. Deploy to Firebase Hosting

Install Node.js, then install the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```

Run these commands from this project folder. Select the Firebase project you created. Review the files and rules before deploying.

## Important prototype limitations

- This is a hackathon starter, not a certified food-safety or charity-verification service.
- Do not use real people's private details or coordinate unsafe food collection.
- Validate organizations, donor authority, food condition, allergens, storage, pickup timing and applicable local requirements before real-world use.
- The current UI uses Firebase Auth and Firestore; it does not include email notifications, map routing, payment handling, image uploads or formal organization verification.
- Firestore may ask you to create indexes for compound queries; follow the Firebase Console link in the error if one appears.


## Automated nearby matching (added)

- Trusts select **Community organization / trust** and use **Use my current location** during signup. Donors attach pickup coordinates before publishing a donation. Browser location permission is required; use HTTPS (Firebase Hosting provides HTTPS) or localhost.
- When a donor publishes, the browser finds registered trust profiles within 50 km, sorts them by distance, and writes an in-app notification for up to 20 nearest matches. Trust accounts see available donations within 50 km, nearest first, and can request collection. Donors approve or decline requests.
- This is client-triggered matching while the donor is online, not a background server job or push notification. For always-on matching/email/SMS/push alerts, deploy a trusted Cloud Function and Firebase Cloud Messaging after the prototype is tested.
- `publicProfiles` contains only fields needed for matching and is readable by signed-in users; do not add phone numbers, private addresses, or sensitive data to it. The donation coordinates represent the pickup point and are visible to signed-in participants.
- Update Firestore Rules with the supplied `firestore.rules`. Existing accounts must register their matching coordinates; this prototype captures coordinates at signup and does not retroactively geocode addresses.
- The matching radius is currently 50 km. Change `km<=50` in `js/donations.js` and `x.distance<=50` in `js/requests.js` to change it.

## Important setup checklist
1. Add your Firebase Web App config in `js/firebase.js`.
2. Enable Email/Password Authentication and create Firestore.
3. Publish the updated `firestore.rules`.
4. Run using VS Code Live Server or deploy with Firebase Hosting (not `file://`).
5. Test with two accounts: one donor and one trust, each granting location permission. Create a donation from the donor and verify the trust sees it in **Food requests**.
6. Assign admin role only in Firebase Console to a trusted project owner. Never allow public signup to select admin.

This is a working hackathon prototype, not a food-safety certification or verified charity directory. Confirm organization identity, pickup arrangements, food condition, allergens, storage and local requirements before collection.

## Account creation troubleshooting

1. Replace every `PASTE_...` placeholder in `js/firebase.js` with the config from Firebase Console → Project settings → Your apps → Web app.
2. Enable Email/Password under Firebase Console → Authentication → Sign-in method.
3. Create Firestore Database and publish this project's `firestore.rules` under Firestore → Rules.
4. Run using VS Code Live Server (`http://localhost`) or Firebase Hosting; do not open the HTML with `file://`.
5. Add `localhost` and your deployed domain under Authentication → Settings → Authorized domains.
6. If Firebase says `auth/email-already-in-use`, switch to Sign in using the same email/password. Authentication may have created the account before the Firestore profile save failed; this updated login code attempts to repair a missing profile.

The updated login page shows clearer Firebase errors. If it still fails, open browser Developer Tools (F12) → Console and share the exact error code/message. Never share your password or service-account private key.
