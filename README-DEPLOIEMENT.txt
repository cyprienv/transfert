TRANSFERT — SERVEUR ONEDRIVE

1) Déposez ces fichiers à la racine du dépôt GitHub transfert :
   index.html, styles.css, app.js, config.js, package.json, dossier server/
   (conservez aussi README.md et .github/workflows/pages.yml)

2) Dans Render, configurez :
   Language: Node
   Build Command: npm install
   Start Command: npm start
   Root Directory: laisser vide
   Instance: Free pour les essais

3) Variables Render à créer (ne partagez jamais leurs valeurs ici) :
   MICROSOFT_CLIENT_ID
   MICROSOFT_CLIENT_SECRET
   MICROSOFT_REDIRECT_URI
   FRONTEND_ORIGIN
   FRONTEND_URL
   TOKEN_ENCRYPTION_KEY

4) Dans Microsoft Entra, créez une application autorisant les comptes Microsoft personnels.
   Plateforme Web, URI de redirection = valeur MICROSOFT_REDIRECT_URI.
   Permissions déléguées Microsoft Graph : User.Read et Files.ReadWrite.
   Créez un secret client et saisissez-le uniquement dans Render.
   Générer TOKEN_ENCRYPTION_KEY avec : openssl rand -hex 32

5) Une fois le service Render déployé, remplacez dans config.js
   https://VOTRE-SERVICE.onrender.com par l'URL réelle du service.

IMPORTANT :
- FRONTEND_ORIGIN = origine exacte du site GitHub Pages, sans chemin final.
- FRONTEND_URL = URL complète de la page d'accueil GitHub Pages.
- MICROSOFT_REDIRECT_URI = https://NOM-DU-SERVICE.onrender.com/auth/callback
- Cette première version limite les fichiers à 100 Mo chacun et 20 fichiers par envoi.
- Les liens anonymes dépendent des paramètres de partage OneDrive.
- Le service doit être testé avant usage client. Ne partagez pas vos secrets dans une conversation.
