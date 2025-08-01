// Load saved entries when the page loads
window.onload = function () {
  loadEntries();
};

document.getElementById("saveButton").addEventListener("click", saveEntry);
document.getElementById("clearAllButton").addEventListener("click", clearAllEntries);

function saveEntry() {
  const input = document.getElementById("entryInput");
  const entryText = input.value.trim();

  if (entryText === "") {
    alert("Please write something you're grateful for.");
    return;
  }

  const timestamp = new Date().toLocaleString();
  const newEntry = {
    text: entryText,
    time: timestamp,
  };

  let entries = JSON.parse(localStorage.getItem("gratitudeEntries")) || [];
  entries.unshift(newEntry); // add to the top
  localStorage.setItem("gratitudeEntries", JSON.stringify(entries));

  input.value = ""; // clear input
  loadEntries(); // reload list
}

function loadEntries() {
  const entriesList = document.getElementById("entriesList");
  entriesList.innerHTML = "";

  const entries = JSON.parse(localStorage.getItem("gratitudeEntries")) || [];

  entries.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${entry.time}</strong><br>
      ${entry.text}
      <button onclick="deleteEntry(${index})">Delete</button>
    `;
    entriesList.appendChild(li);
  });
}

function deleteEntry(index) {
  let entries = JSON.parse(localStorage.getItem("gratitudeEntries")) || [];
  entries.splice(index, 1);
  localStorage.setItem("gratitudeEntries", JSON.stringify(entries));
  loadEntries();
}

function clearAllEntries() {
  const confirmClear = confirm("Are you sure you want to delete all entries?");
  if (confirmClear) {
    localStorage.removeItem("gratitudeEntries");
    loadEntries();
  }
}
