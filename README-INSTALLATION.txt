PACK TRANSFERT — INSTALLATION

Contenu :
- index.html, styles.css, app.js, config.js : interface du site
- server/index.js, package.json : serveur OneDrive

INSTALLATION GITHUB
1. Ouvrez https://github.com/cyprienv/transfert
2. Remplacez les fichiers à la racine par ceux du pack.
3. Remplacez aussi server/index.js et package.json dans le dossier server / racine indiqués.
4. Validez chaque modification sur la branche main.
5. Attendez la publication GitHub Pages et le redéploiement Render.

IMPORTANT — RÉGLAGES RENDER À CONSERVER
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_REDIRECT_URI
FRONTEND_ORIGIN
FRONTEND_URL
TOKEN_ENCRYPTION_KEY

Valeurs d'URL :
MICROSOFT_REDIRECT_URI=https://transfert-7ekb.onrender.com/auth/callback
FRONTEND_ORIGIN=https://cyprienv.github.io
FRONTEND_URL=https://cyprienv.github.io/transfert/
Ne remplacez pas les valeurs secrètes par celles écrites ici : conservez les valeurs déjà présentes dans Render.

DOSSIER ONEDRIVE
Le serveur recherche le dossier transfert_site à la racine de OneDrive.
Il doit exister avant le premier envoi.

LIMITES À CONNAÎTRE
- L'historique affiché sur l'accueil est conservé dans le navigateur utilisé pour créer les transferts (localStorage). Ce n'est pas encore un historique partagé entre plusieurs appareils.
- Les liens de prévisualisation Graph peuvent expirer. Le lien de téléchargement du fichier reste un lien OneDrive.
- Le site génère un lien de dossier OneDrive pour le téléchargement complet.
- La galerie intégrée est affichée juste après l'envoi dans le navigateur qui a créé le partage. Pour une galerie client durable accessible depuis un autre appareil, il faudra ajouter une page publique dédiée et un stockage persistant des métadonnées.
- L'option de sélection de dossier dépend du navigateur. Le glisser-déposer de dossier est pris en charge sur les navigateurs Chromium récents.
- La limite serveur est 100 Mo par fichier et 100 fichiers par transfert.
- Les liens anonymes dépendent des paramètres de partage de votre compte OneDrive.

TEST À FAIRE AVANT UTILISATION CLIENT
1. Connecter OneDrive.
2. Envoyer quelques photos tests.
3. Vérifier leur présence dans transfert_site / Client_Projet.
4. Ouvrir la galerie après l'envoi.
5. Tester le lien OneDrive dans une fenêtre privée.
