
import { auth, db, firebaseConfigured } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

let user = null;
let role = "";
let profile = {};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

function msg(message, error = false) {
  const el = $("pageMessage");
  if (!el) return;

  el.textContent = message;
  el.classList.remove("hidden", "error");

  if (error) el.classList.add("error");
}

function km(a, b) {
  const r = 6371;
  const rad = x => x * Math.PI / 180;

  const d1 = rad(b.lat - a.lat);
  const d2 = rad(b.lng - a.lng);

  const v =
    Math.sin(d1 / 2) ** 2 +
    Math.cos(rad(a.lat)) *
    Math.cos(rad(b.lat)) *
    Math.sin(d2 / 2) ** 2;

  return 2 * r * Math.asin(Math.sqrt(v));
}

$("logoutButton")?.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "index.html";
});

onAuthStateChanged(auth, async u => {
  if (!u) {
    location.href = "login.html";
    return;
  }

  user = u;

  if (!firebaseConfigured) {
    msg("Configure Firebase in js/firebase.js first.", true);
    return;
  }

  try {
    const profileSnap = await getDoc(doc(db, "users", u.uid));

    profile = profileSnap.data() || {};
    role = profile.role || "donor";

    if (role === "admin") {
      $("adminNav")?.classList.remove("hidden");
    }

    await refresh();

  } catch (error) {
    console.error(error);
    msg("Could not load requests: " + error.message, true);
  }
});

async function refresh() {
  const [donSnap, reqSnap, noticeSnap] = await Promise.all([
    getDocs(query(
      collection(db, "donations"),
      where("status", "==", "available")
    )),

    getDocs(query(
      collection(db, "requests"),
      where("requesterId", "==", user.uid)
    )),

    getDocs(query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    ))
  ]);

  // AVAILABLE DONATIONS
  const available = $("availableList");

  if (available) {
    available.replaceChildren();

    let listings = donSnap.docs
      .filter(d => d.data().donorId !== user.uid)
      .map(d => ({ id: d.id, ...d.data() }));

    if (
      role === "trust" &&
      Number.isFinite(profile.lat) &&
      Number.isFinite(profile.lng)
    ) {
      listings = listings
        .map(x => ({
          ...x,
          distance:
            Number.isFinite(x.lat) && Number.isFinite(x.lng)
              ? km(profile, x)
              : null
        }))
        .filter(x => x.distance !== null && x.distance <= 50)
        .sort((a, b) => a.distance - b.distance);

    } else if (role === "trust") {
      available.innerHTML =
        '<div class="empty-state">Add your location at signup to see nearby donations.</div>';
    }

    if (
      !listings.length &&
      !(role === "trust" &&
        !(Number.isFinite(profile.lat) &&
          Number.isFinite(profile.lng)))
    ) {
      available.innerHTML =
        '<div class="empty-state">No nearby available donations right now.</div>';
    }

    for (const x of listings) {
      const card = document.createElement("article");
      card.className = "listing-card";

      card.innerHTML = `
        <h3>${esc(x.title)}</h3>
        <p><b>Quantity:</b> ${esc(x.quantity)} · ${esc(x.category)}</p>
        <p><b>Pickup:</b> ${esc(x.pickupLocation)}</p>
        <p><b>Distance:</b>
          ${x.distance === undefined
            ? "Location not attached"
            : x.distance.toFixed(1) + " km away"}
        </p>
        <p><b>Deadline:</b>
          ${esc(x.pickupDeadline?.toDate?.().toLocaleString?.() || "See donor for details")}
        </p>
        <p>${esc(x.notes || "No additional notes.")}</p>

        ${
          role === "trust"
            ? `<button class="btn btn-primary btn-small"
                data-request="${esc(x.id)}">
                Request collection
              </button>`
            : "<small>Sign in as a registered trust to request collection.</small>"
        }
      `;

      available.appendChild(card);
    }

    navRequestButtons(available);

    if (role === "trust" && noticeSnap.size) {
      const alert = document.createElement("div");
      alert.className = "message";
      alert.textContent =
        `${noticeSnap.size} food alert(s) in your inbox.`;
      available.prepend(alert);
    }
  }

  // TRUST'S OWN REQUESTS
  const mine = $("myRequests");

  if (mine) {
    mine.replaceChildren();

    const reqs = reqSnap.docs;

    if (!reqs.length) {
      mine.innerHTML =
        '<div class="empty-state">You have not submitted any requests.</div>';
    }

    for (const d of reqs) {
      const x = d.data();

      const card = document.createElement("article");
      card.className = "listing-card";

      card.innerHTML = `
        <h3>${esc(x.donationTitle || "Food request")}</h3>
        <p><b>Status:</b> ${esc(x.status || "pending")}</p>
        <p>Submitted:
          ${esc(x.createdAt?.toDate?.().toLocaleString?.() || "recently")}
        </p>
      `;

      mine.appendChild(card);
    }

    // DONOR'S INCOMING REQUESTS
    if (role === "donor") {
      const incomingSnap = await getDocs(query(
        collection(db, "requests"),
        where("donorId", "==", user.uid)
      ));

      for (const d of incomingSnap.docs) {
        const x = d.data();

        const card = document.createElement("article");
        card.className = "listing-card";

        card.innerHTML = `
          <h3>${esc(x.donationTitle || "Food request")}</h3>
          <p>Trust: ${esc(x.requesterName || "Registered trust")}</p>
          <p><b>Status:</b> ${esc(x.status || "pending")}</p>
        `;

        const status = String(x.status || "pending").toLowerCase();

if (status === "pending") {
  card.innerHTML += `
    <button class="btn btn-primary btn-small"
      data-approve="${esc(d.id)}">Approve</button>

    <button class="btn btn-outline btn-small"
      data-reject="${esc(d.id)}">Decline</button>
  `;
} else if (status === "approved") {
  card.innerHTML += `
    <p class="success-message">✓ Approved</p>
  `;
} else if (status === "rejected") {
  card.innerHTML += `
    <p class="error-message">Declined</p>
  `;
}

        mine.prepend(card);
      }

      mine.querySelectorAll("[data-approve]").forEach(button => {
        button.addEventListener("click", () =>
          decide(button.dataset.approve, "approved", button)
        );
      });

      mine.querySelectorAll("[data-reject]").forEach(button => {
        button.addEventListener("click", () =>
          decide(button.dataset.reject, "rejected", button)
        );
      });
    }
  }
}

// TRUST REQUEST BUTTONS
function navRequestButtons(root) {
  root.querySelectorAll("[data-request]").forEach(button => {
    button.addEventListener("click", () =>
      requestDonation(button.dataset.request, button)
    );
  });
}

// CREATE FOOD COLLECTION REQUEST
async function requestDonation(id, button) {
  button.disabled = true;

  try {
    const snap = await getDoc(doc(db, "donations", id));

    if (!snap.exists() || snap.data().status !== "available") {
      throw new Error("This donation is no longer available.");
    }

    const donation = snap.data();

    await addDoc(collection(db, "requests"), {
      donationId: id,
      donationTitle: donation.title,
      donorId: donation.donorId,
      requesterId: user.uid,
      requesterName:
        profile.orgName || profile.name || user.email,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    msg("Collection request sent. Waiting for donor approval.");

    await refresh();

  } catch (error) {
    console.error(error);
    msg("Could not send request: " + error.message, true);

  } finally {
    button.disabled = false;
  }
}

// DONOR APPROVES OR DECLINES REQUEST
async function decide(id, status, button) {
  if (!user || role !== "donor") {
    msg("Only the donor can approve or decline this request.", true);
    return;
  }

  button.disabled = true;

  try {
    const requestRef = doc(db, "requests", id);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error("Request not found.");
    }

    const requestData = requestSnap.data();

    if (requestData.donorId !== user.uid) {
      throw new Error("You are not authorized to update this request.");
    }

    if (requestData.status !== "pending") {
      throw new Error("This request has already been processed.");
    }

    await updateDoc(requestRef, {
      status: status,
      updatedAt: serverTimestamp(),
      decidedAt: serverTimestamp()
    });

    msg(
      status === "approved"
        ? "Request approved successfully. The trust can now see the approved status."
        : "Request declined successfully."
    );

    await refresh();

  } catch (error) {
    console.error("Request decision error:", error);
    msg("Could not update request: " + error.message, true);

  } finally {
    button.disabled = false;
  }
}
