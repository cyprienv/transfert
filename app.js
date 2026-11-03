const screens = [...document.querySelectorAll("[data-screen]")];
function showScreen(name) {
  screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
  window.scrollTo({ top: 0, behavior: "instant" });
}
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

const API_BASE = (window.TRANSFERT_API_URL || "").replace(/\/$/, "");
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

async function checkConnection() {
  if (!API_BASE || API_BASE.includes("VOTRE-SERVICE")) return;
  try {
    const response = await fetch(`${API_BASE}/api/status`, { credentials: "include" });
    const data = await response.json();
    if (!data.connected) {
      const notice = document.querySelector('[data-screen="send"] .notice');
      if (notice) {
        notice.textContent = "Connectez votre OneDrive avant le premier envoi.";
        const link = document.createElement("a");
        link.href = `${API_BASE}/auth/login`;
        link.textContent = " Connecter OneDrive";
        link.style.color = "inherit";
        notice.append(link);
      }
    }
  } catch (_) {}
}

document.getElementById("share-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!selectedFiles.length) {
    alert("Ajoutez au moins un fichier avant de créer le partage.");
    return;
  }
  if (!API_BASE || API_BASE.includes("VOTRE-SERVICE")) {
    alert("L'adresse du serveur Render n'est pas encore configurée.");
    return;
  }

  const form = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Envoi vers OneDrive…";
  const result = document.getElementById("share-result");
  result.textContent = "Envoi des fichiers en cours. Ne fermez pas cette page.";

  try {
    const payload = new FormData();
    payload.append("client", form.get("client"));
    payload.append("project", form.get("project"));
    payload.append("message", form.get("message") || "");
    selectedFiles.forEach(file => payload.append("files", file, file.name));

    const response = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: payload,
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "L'envoi a échoué.");

    document.getElementById("client-name").textContent = form.get("client");
    document.getElementById("client-project").textContent = form.get("project");
    document.getElementById("client-message").textContent =
      form.get("message") || "Les fichiers de votre projet sont disponibles ci-dessous.";

    const preview = document.getElementById("client-files");
    preview.replaceChildren();
    data.files.forEach(file => {
      const card = document.createElement("article");
      card.className = "client-file";
      const label = document.createElement("strong");
      label.textContent = file.name;
      const link = document.createElement("a");
      link.href = file.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Télécharger";
      link.style.color = "inherit";
      card.append(label, link);
      preview.append(card);
    });
    result.replaceChildren();
    const share = document.createElement("a");
    share.href = data.shareUrl;
    share.target = "_blank";
    share.rel = "noopener";
    share.textContent = "Ouvrir le dossier partagé";
    share.style.color = "inherit";
    result.append("Partage créé sur OneDrive : ", share, " — ");
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copier le lien";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(data.shareUrl);
      copy.textContent = "Lien copié !";
    });
    result.append(copy);
    showScreen("client");
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

showScreen("home");
checkConnection();
