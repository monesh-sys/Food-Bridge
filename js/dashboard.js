import { auth, db, firebaseConfigured } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
function msg(t,error=false){const el=$("pageMessage");el.textContent=t;el.classList.remove("hidden","error");if(error)el.classList.add("error");}
$("logoutButton").addEventListener("click",async()=>{await signOut(auth);location.href="index.html";});
function dateText(v){if(!v)return "—";const d=v.toDate?v.toDate():new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString();}
onAuthStateChanged(auth,async user=>{if(!user){location.href="login.html";return;}if(!firebaseConfigured){msg("Configure Firebase in js/firebase.js first.",true);return;}
$("userGreeting").textContent=user.displayName||user.email;
try{const u=await getDoc(doc(db,"users",user.uid));const profile=u.data()||{};if(profile.role==="admin")$("adminNav").classList.remove("hidden");
const [allSnap,mineSnap,requestSnap]=await Promise.all([
getDocs(query(collection(db,"donations"),where("status","==","available"))),
getDocs(query(collection(db,"donations"),where("donorId","==",user.uid))),
getDocs(query(collection(db,"requests"),where("donorId","==",user.uid)))
]);
$("statAvailable").textContent=allSnap.size;$("statMine").textContent=mineSnap.size;$("statRequests").textContent=requestSnap.size;
const recent=allSnap.docs.slice(0,8);const tbody=$("recentDonations");tbody.replaceChildren();
if(!recent.length){tbody.innerHTML='<tr><td colspan="4">No available donations yet.</td></tr>';return;}
for(const d of recent){const x=d.data(),tr=document.createElement("tr");for(const value of [x.title||"Untitled",x.quantity||"—",dateText(x.pickupDeadline),x.status||"available"]){const td=document.createElement("td");td.textContent=value;tr.appendChild(td);}tbody.appendChild(tr);}
}catch(e){msg("Could not load dashboard data. Check Firestore rules and indexes: "+e.message,true);}
});
