let currentUser = null;

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyACYvY5d_2Fr7POYuMF_AP7kvwTztC1ch8",
  authDomain: "campusconnect-1b2cd.firebaseapp.com",
  projectId: "campusconnect-1b2cd",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
function signInWithGoogle() {
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      const email = user.email;

      // 🔒 College email restriction
      if (!email.endsWith("@citchennai.net")) {
        alert("Please sign in using your college email ID only.");
        auth.signOut();
        return;
      }

      currentUser = user;

      document.getElementById("authStatus").innerText =
        "Logged in as: " + user.displayName;

      // ✅ Show form ONLY after login
      document.getElementById("formSection").classList.remove("hidden");
      document.getElementById("loginBtn").style.display = "none";
    })
    .catch((error) => {
      console.error(error);
      alert("Authentication failed");
    });
}


// Submit Profile (No Duplicates)
async function submitProfile() {
  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }

  const profile = {
    name: currentUser.displayName,
    email: currentUser.email,
    dept: document.getElementById("dept").value.trim(),
    skills: document.getElementById("skills").value.toLowerCase(),
    interests: document.getElementById("interests").value.toLowerCase(),
    project: document.getElementById("project").value.toLowerCase(),
  };

  await db.collection("students").doc(currentUser.uid).set(profile);
  findMatches(profile);
}


  // Check if profile already exists
  const existing = await db
    .collection("students")
    .where("name", "==", profile.name)
    .get();

  if (!existing.empty) {
    const docId = existing.docs[0].id;
    await db.collection("students").doc(docId).set(profile);
    alert("Profile updated successfully!");
  } else {
    await db.collection("students").add(profile);
    alert("Profile added successfully!");
  }

  findMatches(profile);


// Get All Students
async function getAllStudents() {
  const snapshot = await db.collection("students").get();
  return snapshot.docs.map(doc => doc.data());
}

// Matchmaking Logic (No Duplicate Names)
async function findMatches(userProfile) {
  const students = await getAllStudents();

  // Remove current user
  const others = students.filter(s => s.name !== userProfile.name);

  if (others.length === 0) {
    document.getElementById("results").innerText =
      "No other students found. Add more profiles.";
    return;
  }

  // Remove duplicate names
  const unique = {};
  others.forEach(s => {
    unique[s.name] = s;
  });
  const filteredOthers = Object.values(unique);

  const userSkills = userProfile.skills.split(",").map(s => s.trim());
  const userInterests = userProfile.interests.split(",").map(i => i.trim());

  const scoredMatches = filteredOthers.map(student => {
    let score = 0;

    // Skill similarity
    userSkills.forEach(skill => {
      if (student.skills.includes(skill)) score += 2;
    });

    // Interest similarity
    userInterests.forEach(interest => {
      if (student.interests.includes(interest)) score += 2;
    });

    // Project alignment
    if (student.project.includes(userProfile.project)) score += 1;

    // Department diversity bonus
    if (student.dept !== userProfile.dept) score += 4;

    return { student, score };
  });

  // Sort by score
  scoredMatches.sort((a, b) => b.score - a.score);

  // Show top 3 teammates
  const topMatches = scoredMatches.slice(0, 3);

  // Display results
  let output = "Top Matching Teammates:\n\n";

  topMatches.forEach((match, index) => {
    output += `${index + 1}. ${match.student.name}\n`;
    output += `   Dept: ${match.student.dept}\n`;
    output += `   Skills: ${match.student.skills}\n`;
    output += `   Interests: ${match.student.interests}\n\n`;
  });

  document.getElementById("results").innerText = output;
}