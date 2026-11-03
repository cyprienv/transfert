import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import cookieParser from "cookie-parser";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const FRONTEND_URL = process.env.FRONTEND_URL;
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI;
const KEY = process.env.TOKEN_ENCRYPTION_KEY;

if (!FRONTEND_ORIGIN || !FRONTEND_URL || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !KEY) {
  console.warn("Configuration incomplète : renseignez les variables Render avant utilisation.");
}
if (KEY && Buffer.from(KEY, "hex").length !== 32) {
  console.warn("TOKEN_ENCRYPTION_KEY doit être une clé hexadécimale de 32 octets (64 caractères).");
}

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 20 }
});

const cookieOptions = {
  httpOnly: true, secure: true, sameSite: "none",
  path: "/", maxAge: 30 * 24 * 60 * 60 * 1000
};

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
function decrypt(value) {
  const data = Buffer.from(value, "base64url");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(KEY, "hex"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
function sign(value) {
  return crypto.createHmac("sha256", KEY).update(value).digest("base64url");
}
function safeEqual(a, b) {
  const aa = Buffer.from(a || "");
  const bb = Buffer.from(b || "");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
async function tokenRequest(params) {
  const response = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Erreur Microsoft OAuth");
  return data;
}
async function getAccessToken(req, res) {
  const raw = req.cookies.transfert_session;
  if (!raw) return null;
  try {
    const refreshToken = decrypt(raw);
    const tokens = await tokenRequest({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: "refresh_token", refresh_token: refreshToken,
      scope: "offline_access User.Read Files.ReadWrite"
    });
    if (tokens.refresh_token) res.cookie("transfert_session", encrypt(tokens.refresh_token), cookieOptions);
    return tokens.access_token;
  } catch {
    res.clearCookie("transfert_session", { ...cookieOptions, maxAge: undefined });
    return null;
  }
}
async function graph(accessToken, path, options = {}) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) }
  });
  const body = await response.text();
  let data = {};
  try { data = body ? JSON.parse(body) : {}; } catch { data = { raw: body }; }
  if (!response.ok) throw new Error(data.error?.message || `Microsoft Graph : ${response.status}`);
  return data;
}
function safeFolderPart(value) {
  return String(value || "").trim().replace(/[\\/:*?"<>|#%]/g, "-").replace(/\s+/g, "_").slice(0, 80) || "Sans_nom";
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/status", async (req, res) => {
  const token = await getAccessToken(req, res);
  res.json({ connected: Boolean(token) });
});

app.get("/auth/login", (_req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  res.cookie("transfert_oauth_state", `${state}.${sign(state)}`, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 10 * 60 * 1000
  });
  const params = new URLSearchParams({
    client_id: CLIENT_ID, response_type: "code", redirect_uri: REDIRECT_URI,
    response_mode: "query", scope: "openid profile offline_access User.Read Files.ReadWrite",
    state, prompt: "select_account"
  });
  res.redirect(`https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`);
});

app.get("/auth/callback", async (req, res) => {
  try {
    const [state, signature] = (req.cookies.transfert_oauth_state || ".").split(".");
    if (!safeEqual(signature, sign(state)) || !safeEqual(req.query.state, state)) {
      throw new Error("Vérification de sécurité OAuth échouée.");
    }
    res.clearCookie("transfert_oauth_state", { path: "/" });
    if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
    const tokens = await tokenRequest({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "authorization_code",
      code: req.query.code, redirect_uri: REDIRECT_URI,
      scope: "openid profile offline_access User.Read Files.ReadWrite"
    });
    res.cookie("transfert_session", encrypt(tokens.refresh_token), cookieOptions);
    res.redirect(FRONTEND_URL);
  } catch (error) {
    res.status(400).send(`Connexion Microsoft impossible : ${String(error.message).replace(/[<>]/g, "")}`);
  }
});

app.post("/api/upload", upload.array("files", 20), async (req, res) => {
  try {
    const accessToken = await getAccessToken(req, res);
    if (!accessToken) return res.status(401).json({ error: "Connectez d'abord votre compte OneDrive." });
    if (!req.files?.length) return res.status(400).json({ error: "Aucun fichier reçu." });

    const folderName = `${safeFolderPart(req.body.client)}_${safeFolderPart(req.body.project)}`;
    let folder;
    try {
      folder = await graph(accessToken, "/me/drive/root/children", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename"
        })
      });
    } catch (error) {
      throw new Error(`Impossible de créer le dossier OneDrive : ${error.message}`);
    }

    const results = [];
    for (const file of req.files) {
      const safeName = file.originalname.replace(/[\\/]/g, "_");
      const encoded = encodeURIComponent(safeName);
      const uploaded = await graph(accessToken,
        `/me/drive/items/${folder.id}:/${encoded}:/content`, {
          method: "PUT",
          headers: { "content-type": file.mimetype || "application/octet-stream" },
          body: file.buffer
        });
      const link = await graph(accessToken, `/me/drive/items/${uploaded.id}/createLink`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "view", scope: "anonymous" })
      });
      results.push({ name: file.originalname, url: link.link.webUrl });
    }
    const folderLink = await graph(accessToken, `/me/drive/items/${folder.id}/createLink`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "view", scope: "anonymous" })
    });
    res.json({ folder: folderName, shareUrl: folderLink.link.webUrl, files: results });
  } catch (error) {
    res.status(500).json({ error: error.message || "Erreur pendant l'envoi." });
  }
});

app.post("/auth/logout", (_req, res) => {
  res.clearCookie("transfert_session", { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Transfert API listening on ${PORT}`));
