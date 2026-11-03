const screens = [...document.querySelectorAll("[data-screen]")];
function showScreen(name) {
  screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
  window.scrollTo({ top: 0, behavior: "instant" });
}
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const fileList = document.getElementById("file-list");
let selectedFiles = [];

function addFiles(files) {
  selectedFiles = [...selectedFiles, ...Array.from(files)];
  renderFiles();
}
function renderFiles() {
  fileList.replaceChildren();
  selectedFiles.forEach((file, index) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = `${file.name} (${formatSize(file.size)})`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Retirer";
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFiles();
    });
    item.append(name, remove);
    fileList.append(item);
  });
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
fileInput.addEventListener("change", event => addFiles(event.target.files));
dropZone.addEventListener("dragover", event => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragging"));
dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  addFiles(event.dataTransfer.files);
});

document.getElementById("share-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  document.getElementById("client-name").textContent = form.get("client");
  document.getElementById("client-project").textContent = form.get("project");
  document.getElementById("client-message").textContent =
    form.get("message") || "Les fichiers de votre projet sont disponibles ci-dessous.";
  const preview = document.getElementById("client-files");
  preview.replaceChildren();
  selectedFiles.forEach(file => {
    const card = document.createElement("article");
    card.className = "client-file";
    const label = document.createElement("strong");
    label.textContent = file.name;
    const size = document.createElement("span");
    size.textContent = formatSize(file.size);
    card.append(label, size);
    preview.append(card);
  });
  showScreen("client");
});

showScreen("home");
// Cette version est un prototype front-end. Aucun fichier n'est envoyé à OneDrive
// et aucun lien public n'est créé tant que le backend sécurisé n'est pas configuré.
