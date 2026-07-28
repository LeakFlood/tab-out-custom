/* ================================================================
   Tab Out — Dashboard App (Pure Extension Edition)

   This file is the brain of the dashboard. Now that the dashboard
   IS the extension page (not inside an iframe), it can call
   chrome.tabs and chrome.storage directly — no postMessage bridge needed.

   What this file does:
   1. Reads open browser tabs directly via chrome.tabs.query()
   2. Groups tabs by domain with a landing pages category
   3. Renders domain cards, banners, and stats
   4. Handles all user actions (close tabs, save for later, focus tab)
   5. Stores "Saved for Later" tabs in chrome.storage.local (no server)
   ================================================================ */

'use strict';


/* ----------------------------------------------------------------
   I18N — FR / EN language packs
   ---------------------------------------------------------------- */

const I18N = {
  fr: {
    greetingMorning: "Bonjour",
    greetingAfternoon: "Bon après-midi",
    greetingEvening: "Bonsoir",
    timePrefix: "Il est",
    datePrefix: "Nous sommes le",
    locale: "fr-FR",

    openTabs: "Onglets ouverts",
    unassignedTabs: "Onglets non assignés",
    homepages: "Pages d’accueil",
    domains: "domaines",
    domain: "domaine",
    tabs: "onglets",
    tab: "onglet",
    open: "ouverts",
    closeAllTabs: "Fermer les {count} onglets",
    closeAllDomainTabs: "Fermer les {count} onglets",
    closeDuplicate: "Fermer {count} doublon",
    closeDuplicates: "Fermer {count} doublons",
    duplicate: "doublon",
    duplicates: "doublons",
    showTabs: "Afficher les {count} onglets",
    showMoreTabs: "Voir {count} de plus",
    hideTabs: "Masquer les {count} onglets",

    inboxZeroTitle: "Zéro onglet.",
    inboxZeroSubtitle: "Tu es libre.",
    noResults: "Aucun résultat",
    filterTabs: "Filtrer les onglets…",
    searchTabs: "Rechercher dans les onglets non assignés",
    closeTabSearch: "Fermer la recherche",
    noMatchingTabs: "Aucun onglet ne correspond à cette recherche.",
    allTabsAssignedTitle: "Tout est organisé.",
    allTabsAssignedSubtitle: "Tous les onglets ouverts sont déjà assignés à une session.",
    unassignedTabsClosed: "Tous les onglets non assignés ont été fermés.",
    unassignedTabsClosedPartial: "{count} onglet(s) non assigné(s) fermé(s)",
    unassignedDuplicatesClosed: "Doublons fermés, une copie conservée",
    unassignedDuplicatesClosedPartial: "Les doublons disponibles ont été fermés",
    unassignedUndoRemoval: "Annuler fermeture",
    unassignedUndoRemovalTitle: "Restaurer la dernière fermeture · {count} disponible(s)",
    unassignedUndoRemovalEmpty: "Aucune fermeture d’onglets non assignés à annuler",
    unassignedRemovalRestored: "{count} onglet(s) restauré(s)",
    unassignedRemovalRestorePartial: "{restored} onglet(s) restauré(s) · {failed} échec(s)",
    unassignedRemovalRestoreFailed: "Impossible de restaurer les onglets fermés",
    unassignedRemovalAlreadyRestored: "Ces onglets sont déjà ouverts",
    unassignedRemovalCloseFailed: "Impossible de fermer les onglets sélectionnés",

    justNow: "à l’instant",
    minAgo: "il y a {count} min",
    hourAgo: "il y a {count} h",
    yesterday: "hier",
    daysAgo: "il y a {count} jours",

    itemCount: "{count} élément",
    itemsCount: "{count} éléments",

    sessions: "Sessions",
    sessionsSubtitle: "Rouvre rapidement un groupe d’onglets.",
    createSessionButton: "+ Session",
    noSavedSession: "Aucune session sauvegardée pour le moment.",
    sessionsReordered: "Ordre des sessions sauvegardé",
    editSession: "Modifier cette session",
    createSessionTitle: "Créer une session",
    editSessionTitle: "Modifier la session",
    sessionNameRequired: "Donne un nom à ta session.",
    sessionEditorSubtitle: "Ajoute ou retire les onglets de cette session.",
    undo: "Annuler la dernière action",
    includedTabs: "Onglets inclus",
    availableTabs: "Onglets ouverts disponibles",
    removeAll: "Tout retirer",
    addAll: "Tout ajouter",
    removeTab: "Retirer",
    addTab: "Ajouter",
    noIncludedTabs: "Cette session est vide.",
    noAvailableTabs: "Tous les onglets ouverts sont déjà inclus.",
    sessionChangedConflict: "Cette session a été modifiée ailleurs. Ferme puis rouvre cette fenêtre pour éviter d’écraser les changements.",
    sessionSaved: "Session sauvegardée",
    sessionDeleted: "Session supprimée",
    sessionOpened: "Session ouverte : {name}",
    deleteSessionConfirm: "Supprimer cette session ?",
    sessionTabCount: "{count} onglet",
    sessionTabsCount: "{count} onglets",
    assignTabDrag: "Assigner l’onglet",
    dropAddToSession: "Déposer pour ajouter",
    dropCreatePair: "Créer une session avec ces 2 onglets",
    dropMoveToSession: "Déplacer vers cette session",
    dropMoveToUnassigned: "Déplacer vers les onglets non assignés",
    moveSavedTabLabel: "Déplacer l’onglet enregistré",
    moveSavedTab: "Déplacer {title}",
    showSessionTabs: "Afficher les onglets de la session",
    hideSessionTabs: "Masquer les onglets de la session",
    sessionTabsList: "Onglets de la session {name}",
    sessionTabMoveFailed: "Impossible de déplacer cet onglet",
    sessionTabBackgroundOpenFailed: "Impossible d’ouvrir cet onglet en arrière-plan",
    unassignSharedTabConfirm: "Cet onglet appartient à {count} sessions. Le retirer de toutes ?",
    unassignFromAll: "Retirer de toutes",
    sessionTabAlreadyMoved: "Cet onglet ne se trouve plus dans la session source",
    sessionTabRemovedFromSource: "L’onglet était déjà dans la destination et a été retiré de la source",
    sessionTabMovedToUnassigned: "Onglet déplacé vers les onglets non assignés",
    sessionTabMoved: "Onglet déplacé vers {name}",
    tabAssignedToSession: "Onglet ajouté à « {name} »",
    tabAlreadyAssigned: "Cet onglet est déjà dans cette session.",
    tabAssignmentFailed: "Impossible d’assigner cet onglet.",
    newSessionDefaultName: "Nouvelle session",
    sessionCreatedFromTabs: "Session créée avec 2 onglets",
    sessionCreationFailed: "Impossible de créer cette session.",
    renameSession: "Renommer la session",
    sessionRenamed: "Session renommée",
    sessionRenameFailed: "Impossible de renommer cette session.",
    back: "← Retour",
    importGroupButton: "Importer un groupe",
    importGroupTitle: "Importer un groupe d’onglets",
    chooseGroupSubtitle: "Choisis le groupe Chrome ou Brave à transformer en session.",
    chooseGroupModeSubtitle: "Crée une session ou ajoute ce groupe à une session existante.",
    chooseSessionSubtitle: "Choisis la session à mettre à jour avec ce groupe.",
    reviewGroupSubtitle: "Sélectionne les onglets que la session doit conserver.",
    noChromeGroupsForImport: "Aucun groupe d’onglets ouvert à importer.",
    importAsNewSession: "Créer une nouvelle session",
    updateExistingSession: "Mettre à jour une session",
    linkedToSession: "Lié à « {name} »",
    groupCurrentWindow: "Fenêtre actuelle",
    groupOtherWindow: "Autre fenêtre",
    groupOpenStatus: "Groupe ouvert",
    groupChangedStatus: "Modifications disponibles",
    groupClosedStatus: "Groupe fermé",
    groupTabInBoth: "Dans la session et le groupe",
    groupTabNew: "Nouveau depuis le groupe",
    groupTabSessionOnly: "Uniquement dans la session",
    applyGroupReview: "Appliquer",
    groupReviewSummary: "{kept} conservé(s) · {added} ajouté(s) · {removed} retiré(s)",
    groupReviewSaved: "Session mise à jour depuis le groupe",
    openAsGroup: "Ouvrir comme groupe",
    showOpenGroup: "Afficher le groupe ouvert",
    openGroupCopy: "Ouvrir une copie du groupe",
    groupCopyTitle: "{name} (copie)",
    reviewGroupChanges: "Examiner les modifications",
    connectGroup: "Associer un groupe",
    changeGroup: "Changer de groupe associé",
    disconnectGroup: "Dissocier le groupe",
    disconnectGroupConfirm: "Dissocier ce groupe de la session ? La session sera conservée.",
    groupDisconnected: "Groupe dissocié",
    groupOpenedLinked: "Groupe ouvert et associé à « {name} »",
    groupFocused: "Groupe ouvert affiché",
    sessionActions: "Actions de la session",
    selectAll: "Tout sélectionner",
    clearAll: "Tout décocher",
    save: "Sauvegarder",
    cancel: "Annuler",
    delete: "Supprimer",
    collectionDetailBack: "← Retour",
    collectionDetailHint: "Sélectionne des onglets pour les ouvrir en arrière-plan, ou utilise « Ouvrir et basculer » pour afficher immédiatement un onglet.",
    collectionDetailSession: "Session sauvegardée",
    collectionDetailLiveGroup: "Groupe ouvert",
    collectionDetailSavedGroup: "Groupe sauvegardé",
    collectionDetailChangedNotice: "Ce groupe a changé dans le navigateur. Cette liste correspond à la version sauvegardée.",
    collectionDetailClosedNotice: "Ce groupe est fermé. Cette liste correspond à la version sauvegardée.",
    collectionDetailSelected: "{count} sélectionné(s)",
    collectionDetailOpenSelected: "Ouvrir la sélection en arrière-plan",
    collectionDetailOpenSelectedCount: "Ouvrir {count} en arrière-plan",
    collectionDetailOpenAll: "Tout ouvrir en arrière-plan",
    collectionDetailOpenAllGroup: "Tout ouvrir dans un nouveau groupe",
    collectionDetailRestoreGroup: "Restaurer tout le groupe",
    collectionDetailOpenAndSwitch: "Ouvrir et basculer",
    collectionDetailSwitchToTab: "Basculer vers l’onglet",
    collectionDetailOpenedOne: "1 onglet ouvert en arrière-plan",
    collectionDetailOpenedMany: "{count} onglets ouverts en arrière-plan",
    collectionDetailOpenedGroup: "Groupe ouvert avec {count} onglet(s)",
    collectionDetailOpenPartial: "{opened} onglet(s) ouvert(s), {failed} échec(s)",
    collectionDetailOpenFailed: "Impossible d’ouvrir les onglets sélectionnés",
    collectionDetailUnavailable: "Cette collection n’est plus disponible.",
    collectionDetailAlreadyOpen: "Déjà ouvert",
    collectionDetailAllAlreadyOpen: "Tous les onglets sont déjà ouverts",
    collectionDetailSelectedAlreadyOpen: "Les onglets sélectionnés sont déjà ouverts",
    collectionDetailGroupCopyHint: "L’ouverture du groupe complet crée volontairement une copie de tous ses onglets, même s’ils sont déjà ouverts.",
    collectionDetailOpenSummary: "{opened} ouvert(s) · {skipped} déjà ouvert(s)",
    collectionDetailOpenSummaryFailed: "{opened} ouvert(s) · {skipped} déjà ouvert(s) · {failed} échec(s)",
    collectionManualUrlLabel: "Lien",
    collectionManualUrlPlaceholder: "https://example.com",
    collectionManualTitleLabel: "Nom facultatif",
    collectionManualTitlePlaceholder: "Ex : Documentation",
    collectionManualAddSubmit: "Ajouter",
    collectionManualAlreadyAdded: "Cet onglet est déjà présent dans cette collection.",
    collectionManualInvalidUrl: "Saisis un lien valide.",
    collectionManualUnsupportedUrl: "Ce type de lien ne peut pas être ajouté.",
    collectionManualAddFailed: "Impossible d’ajouter cet onglet.",

    shortcuts: "Raccourcis",
    shortcutAddButton: "Raccourci",
    addShortcutTitle: "Ajouter un raccourci",
    editShortcutTitle: "Modifier le raccourci",
    editShortcut: "Modifier ce raccourci",
    deleteShortcut: "Supprimer ce raccourci",
    saveShortcut: "Enregistrer",
    addShortcut: "Ajouter",
    deleteShortcutConfirm: "Supprimer le raccourci \"{name}\" ?",
    resetShortcutsConfirm: "Réinitialiser tous les raccourcis par défaut ?",

    saveForLater: "Sauvegarder pour plus tard",
    nothingSaved: "Rien de sauvegardé. Tu vis dans le présent.",
    archive: "Archive",
    archiveSearchPlaceholder: "Rechercher dans les onglets archivés...",
    restoreArchivedTab: "Restaurer dans À consulter plus tard",
    deleteArchivedTab: "Supprimer définitivement",
    archivedTabRestored: "Onglet restauré dans À consulter plus tard",
    archivedTabDeleted: "Onglet archivé supprimé",
    archivedTabDeleteUndone: "Onglet restauré dans l’archive",
    archivedTabActionFailed: "Impossible de modifier cet onglet archivé",
    undoDelete: "Annuler",
    tabOutDupePrefix: "Tu as",
    tabOutDupeSuffix: "onglets Tab Out ouverts. Garder uniquement celui-ci ?",
    closeExtras: "Fermer les autres",
    sessionNameLabel: "Nom de la session",
    sessionNamePlaceholder: "Ex : Dev Ultra",
    nameLabel: "Nom",
    urlLabel: "URL",
    shortcutNamePlaceholder: "Ex : Netflix",
    shortcutUrlPlaceholder: "https://example.com",
    savedForLater: "Sauvegardé pour plus tard",
    failedToSaveTab: "Impossible de sauvegarder l’onglet",
    tabClosed: "Onglet fermé",
    tabLinkCopied: "Lien de l’onglet copié",
    tabLinkCopyFailed: "Impossible de copier le lien de l’onglet",
    closeThisTab: "Fermer cet onglet",
    dismiss: "Retirer",
    archiveSearchFailed: "Recherche archive échouée",
    closedExtraTabOutTabs: "Onglets Tab Out en trop fermés",
    closedTabsFrom: "{count} onglet fermé depuis {name}",
    closedTabsFromPlural: "{count} onglets fermés depuis {name}",

    weatherSun: "Ensoleillé",
    weatherPartly: "Partiellement nuageux",
    weatherCloud: "Couvert",
    weatherFog: "Brume",
    weatherRain: "Pluie",
    weatherSnow: "Neige",
    weatherStorm: "Orage",
    weatherGeneric: "Météo",
    weatherFeelsLike: "Ressenti {temp}°C",
    weatherEnable: "Activer la météo",
    weatherLoading: "Chargement...",
    weatherPermissionDenied: "Accès à la position refusé. Autorise la localisation pour Tab Out dans Brave, puis réessaie.",
    weatherLocationUnavailable: "Position indisponible. Vérifie les réglages de localisation de Brave, puis réessaie.",
    weatherLocationTimeout: "La localisation prend trop de temps. Réessaie dans un instant.",
    weatherNetworkError: "Le service météo est indisponible. Vérifie ta connexion, puis réessaie.",
    weatherLoadFailed: "Impossible de charger la météo. Réessaie dans un instant.",
    showCity: "Afficher la ville",
    hideCity: "Masquer la ville",

    backupMenuTitle: "Sauvegarde des données",
    exportData: "Exporter les données",
    importData: "Importer les données",
    exportSuccess: "Données exportées",
    exportFailed: "Export impossible",
    importConfirm: "Importer ces données va remplacer tes raccourcis, sessions, onglets archivés et préférences locales. Continuer ?",
    importSuccess: "Données importées",
    importFailed: "Import impossible",
    invalidBackupFile: "Fichier de sauvegarde invalide",

    protectedGroupsTab: "Groupes sauvegardés",
    syncChromeGroups: "Synchroniser",
    protectActiveGroup: "+ Protéger le groupe actif",
    protectChromeGroup: "Protéger ce groupe",
    chromeGroupUnprotected: "Non protégé",
    chromeGroupNativeColor: "Couleur du groupe Chrome",
    noChromeGroups: "Aucun groupe Chrome à afficher.",
    noProtectedGroups: "Aucun groupe sauvegardé pour le moment.",
    protectedGroupsEmptyTitle: "Aucun groupe sauvegardé pour le moment.",
    protectedGroupsEmptySubtitle: "Crée un groupe dans Chrome, puis utilise le crayon pour le sauvegarder dans Tab Out.",
    noActiveChromeGroup: "Aucun groupe Chrome actif sur cet onglet.",
    chromeGroupProtected: "Groupe sauvegardé : {name}",
    chromeGroupSnapshotUpdated: "Sauvegarde mise à jour : {name}",
    chromeGroupRestored: "Groupe restauré : {name}",
    chromeGroupCopyOpened: "Copie ouverte : {name}",
    chromeGroupDeleted: "Protection supprimée",
    chromeGroupIgnored: "Changement ignoré",
    chromeGroupSynced: "Sync",
    chromeGroupChanged: "Modifié",
    chromeGroupMissing: "Fermé",
    untitledChromeGroup: "Groupe sans nom",
    chromeGroupChangeAdded: "+{added}",
    chromeGroupChangeRemoved: "-{removed}",
    chromeGroupChangeAddedRemoved: "+{added} -{removed}",
    chromeGroupChangeTooltip: "Modifié : {added} onglet(s) ajouté(s), {removed} onglet(s) retiré(s).",
    chromeGroupTooltipStatusColor: "Barre gauche : état Tab Out. Point droit : couleur native Chrome.",
    chromeGroupLastSaved: "Dernière sauvegarde : {time}",
    chromeGroupTabCount: "{count} onglet",
    chromeGroupTabsCount: "{count} onglets",
    restoreProtectedGroup: "Restaurer",
    openProtectedGroupCopy: "Ouvrir comme nouveau groupe",
    updateProtectedGroup: "Mettre à jour depuis Chrome",
    ignoreProtectedGroupChange: "Ignorer le changement",
    deleteProtectedGroup: "Supprimer la protection",
    restoreProtectedGroupConfirm: "Ce groupe existe déjà dans Chrome. Restaurer la sauvegarde créera une copie. Continuer ?",
    updateProtectedGroupConfirm: "Remplacer la sauvegarde par l’état actuel du groupe Chrome ?",
    deleteProtectedGroupConfirm: "Supprimer cette protection ?",

    languageSwitchToEnglish: "Passer en anglais",
    languageSwitchToFrench: "Passer en français",
    settingsOpen: "Ouvrir les réglages",
    settingsEyebrow: "Personnalisation",
    settingsTitle: "Réglages",
    settingsLayout: "Disposition",
    settingsKeyboard: "Clavier",
    settingsGeneral: "Général",
    settingsPresets: "Dispositions rapides",
    settingsPresetsHint: "Commence par une base, puis personnalise-la.",
    settingsLayoutFrameTitle: "Largeur du tableau de bord",
    settingsLayoutFrameHint: "Ajuste l’espace à gauche et à droite du contenu.",
    settingsContainerPaddingTitle: "Espacement horizontal du contenu",
    settingsContainerPaddingHint: "À 0 px, le contenu utilise toute la largeur disponible. La largeur se recentre progressivement et s’adapte sur tablette et mobile.",
    settingsHeaderModules: "En-tête",
    settingsContentModules: "Contenu",
    settingsModules: "Éléments",
    settingsGridHint: "Fais glisser un élément sur une grille. Utilise son bord pour le redimensionner.",
    settingsHiddenModules: "Éléments masqués",
    settingsHiddenHint: "Les éléments masqués conservent leur position.",
    settingsNothingHidden: "Aucun élément masqué",
    settingsPreview: "Aperçu du tableau de bord",
    settingsPreviewHint: "Les positions s’alignent sur une grille responsive de 12 colonnes.",
    settingsDropHere: "Dépose les éléments ici",
    settingsDragModule: "Déplacer",
    settingsLanguagePosition: "Position de la langue",
    settingsReorderHint: "Fais glisser les éléments ou utilise les flèches.",
    settingsContentHint: "Les sections principales peuvent aussi être masquées.",
    settingsKeyboardTitle: "Raccourcis clavier",
    settingsKeyboardHint: "Sélectionne une commande, puis saisis une combinaison. Le raccourci du menu est géré par Brave.",
    settingsLanguageTitle: "Langue",
    settingsAppearanceTitle: "Apparence",
    settingsAppearanceHint: "Choisis le thème de couleurs de l’extension. Le mode sombre conserve l’apparence actuelle.",
    settingsThemeLabel: "Thème de couleurs",
    settingsThemeDark: "Sombre",
    settingsThemeLight: "Clair",
    gmailOptionalIntegration: "Intégration facultative",
    gmailSettingsTitle: "Notifications Gmail",
    gmailSettingsHint: "Connecte un ou plusieurs comptes pour lire les messages, suivre les non-lus et agir sans quitter Tab Out.",
    gmailPrivacyTitle: "Confidentiel par conception",
    gmailPrivacyHint: "Les e-mails et jetons OAuth restent dans ce profil de navigateur et sont envoyés uniquement à Google.",
    gmailMaskAccountsTitle: "Masquer les adresses des comptes",
    gmailMaskAccountsHint: "Recouvre les adresses connectées d’une barre noire dans le tableau de bord, les réglages et le menu de l’extension.",
    gmailSetupHelpOpen: "Afficher la procédure de configuration Gmail",
    gmailSharedClientTitle: "Client OAuth partagé",
    gmailSharedClientHint: "Utilise un même client OAuth Google Desktop pour autant de comptes Gmail que nécessaire.",
    gmailDedicatedClientTitle: "Client OAuth dédié",
    gmailDedicatedClientHint: "Ces identifiants seront associés uniquement au compte Gmail sélectionné chez Google.",
    gmailClientIdLabel: "ID client",
    gmailClientSecretLabel: "Secret client",
    gmailClientSecretPlaceholder: "Saisis le secret client",
    gmailClientSecretSavedPlaceholder: "Secret enregistré · saisir pour le remplacer",
    gmailClientSecretHint: "Le secret enregistré n’est jamais réaffiché. Laisse ce champ vide pour le conserver.",
    gmailClientSecretRequiredHint: "L’ID et le secret du client Google Desktop sont obligatoires.",
    gmailDedicatedSecretKeepHint: "Laisse le secret vide pour conserver le client dédié actuel.",
    gmailSaveSharedClient: "Enregistrer le client partagé",
    gmailRemoveSharedClient: "Supprimer le client partagé",
    gmailAddWithShared: "Ajouter avec le client partagé",
    gmailAddWithDedicated: "Ajouter avec son propre client",
    gmailConnectDedicated: "Connecter avec ce client",
    gmailClientConfigured: "Configuré",
    gmailClientNotConfigured: "Non configuré",
    gmailSharedClientBadge: "Client partagé",
    gmailDedicatedClientBadge: "Client dédié",
    gmailReplaceDedicatedClient: "Remplacer le client",
    gmailUseDedicatedClient: "Utiliser un client dédié",
    gmailUseSharedClient: "Utiliser le client partagé",
    gmailReplaceAndReconnect: "Remplacer et reconnecter",
    gmailSharedClientRequired: "Configure d’abord le client OAuth partagé, ou utilise l’option avec un client dédié.",
    gmailClientValidationError: "Saisis un ID client Google valide et le secret correspondant.",
    gmailClientSaving: "Enregistrement du client OAuth…",
    gmailClientSaved: "Configuration OAuth enregistrée.",
    gmailClientSaveFailed: "Impossible d’enregistrer la configuration OAuth.",
    gmailClientRemoved: "Client OAuth partagé supprimé.",
    gmailReplaceSharedConfirm: "Remplacer ce client déconnectera {count} compte(s) utilisant le client partagé. Ils devront être reconnectés. Continuer ?",
    gmailRemoveSharedConfirm: "Supprimer ce client déconnectera {count} compte(s) utilisant le client partagé. Continuer ?",
    gmailSetupHelpEyebrow: "Configuration Google Cloud",
    gmailSetupHelpTitle: "Connecter Gmail à Tab Out",
    gmailSetupHelpIntro: "Configuration initiale : suis les étapes 1 à 7 dans l’ordre. Garde cette fenêtre ouverte ; chaque bouton ouvre directement la bonne page Google Cloud dans un nouvel onglet.",
    gmailSetupPrerequisiteTitle: "Avant de commencer",
    gmailSetupPrerequisiteHint: "Utilise le compte Google qui gérera le projet Cloud. Tu dois pouvoir créer ou modifier un projet Google Cloud et accéder à chaque adresse Gmail que tu souhaites connecter.",
    gmailSetupProjectTitle: "Créer ou sélectionner le projet Google Cloud",
    gmailSetupProjectOpen: "Ouvre le sélecteur de projets. Vérifie le nom du projet affiché dans la barre supérieure : toutes les étapes suivantes doivent être réalisées dans ce même projet.",
    gmailSetupProjectCreate: "Si nécessaire, clique sur « NEW PROJECT » / « NOUVEAU PROJET », saisis un nom comme « Tab Out personnel », puis clique sur « CREATE » / « CRÉER ».",
    gmailSetupProjectSelect: "Sélectionne ensuite ce projet et attends que son nom apparaisse en haut de la Console avant de continuer.",
    gmailSetupLinkProject: "Ouvrir le sélecteur de projets",
    gmailSetupApiTitle: "Activer Gmail API",
    gmailSetupApiOpen: "Ouvre la fiche « Gmail API » en vérifiant que le bon projet est toujours sélectionné en haut de la page.",
    gmailSetupApiEnable: "Clique sur « ENABLE » / « ACTIVER ». Si le bouton indique « MANAGE » / « GÉRER », Gmail API est déjà activée.",
    gmailSetupLinkApi: "Ouvrir la fiche Gmail API",
    gmailSetupBrandingTitle: "Initialiser Google Auth Platform",
    gmailSetupBrandingOpen: "Ouvre « Google Auth Platform → Branding ». Si le message « Google Auth Platform not configured yet » apparaît, clique sur « GET STARTED ».",
    gmailSetupBrandingInfo: "Dans « App Information », renseigne « App name » (par exemple « Tab Out personnel ») et « User support email », puis clique sur « NEXT ».",
    gmailSetupBrandingAudience: "Dans « Audience », choisis « External » pour des comptes Gmail personnels. « Internal » convient uniquement aux comptes de la même organisation Google Workspace.",
    gmailSetupBrandingContact: "Dans « Contact Information », saisis ton adresse e-mail. Dans « Finish », accepte la Google API Services User Data Policy, puis clique sur « CONTINUE » et « CREATE ».",
    gmailSetupLinkAuth: "Ouvrir Google Auth Platform",
    gmailSetupAudienceTitle: "Autoriser les comptes Gmail de test",
    gmailSetupAudienceOpen: "Ouvre « Google Auth Platform → Audience » et vérifie que « Publishing status » indique « Testing » si l’application reste privée.",
    gmailSetupAudienceUsers: "Si le type est « External » et l’état « Testing », va dans « Test users », clique sur « ADD USERS », ajoute chaque adresse Gmail à connecter, puis clique sur « SAVE ».",
    gmailSetupAudienceImportant: "Dans ce mode, une adresse absente de « Test users » ne pourra pas autoriser l’accès. Pour plusieurs comptes, ajoute-les tous ici avant de les connecter dans Tab Out.",
    gmailSetupAudienceExpiry: "En mode « Testing », Google limite l’autorisation hors connexion à 7 jours : une reconnexion périodique est donc normale. Le passage en production avec le champ Gmail restreint peut exiger une vérification Google.",
    gmailSetupLinkAudience: "Ouvrir la page Audience",
    gmailSetupScopeTitle: "Déclarer l’autorisation Gmail utilisée",
    gmailSetupScopeOpen: "Ouvre « Google Auth Platform → Data Access », puis clique sur « ADD OR REMOVE SCOPES ».",
    gmailSetupScopeAdd: "Recherche l’adresse exacte ci-dessous. Si elle n’apparaît pas, utilise « Manually add scopes » et colle-la sans la modifier.",
    gmailSetupScopeConfirm: "Coche le champ « gmail.modify », clique sur « UPDATE », puis sur « SAVE » si ce bouton est proposé sur la page principale.",
    gmailSetupScopeReason: "Tab Out utilise ce champ pour lire les messages et permettre les actions lu/non lu, suivi, archivage et corbeille. Il ne permet pas une suppression définitive contournant la corbeille.",
    gmailSetupLinkScopes: "Ouvrir la page Data Access",
    gmailSetupClientTitle: "Créer le client OAuth Desktop",
    gmailSetupClientOpen: "Ouvre « Google Auth Platform → Clients », puis clique sur « CREATE CLIENT ».",
    gmailSetupClientType: "Dans « Application type », sélectionne exactement « Desktop app ». N’utilise ni « Web application » ni « Chrome extension ».",
    gmailSetupClientName: "Dans « Name », saisis un nom reconnaissable comme « Tab Out - Brave », puis clique sur « CREATE ».",
    gmailSetupClientCopy: "Dans la fenêtre de résultat, copie immédiatement « Client ID » et « Client secret ». Depuis 2025, Google peut ne plus réafficher le secret complet ; utilise aussi « DOWNLOAD JSON » comme sauvegarde si disponible.",
    gmailSetupClientRedirect: "Ne crée pas de clé API, d’origine JavaScript ni d’URI de redirection. Le client Desktop accepte la redirection locale 127.0.0.1 utilisée automatiquement par Tab Out avec PKCE.",
    gmailSetupLinkClients: "Ouvrir la page Clients",
    gmailSetupTabOutTitle: "Enregistrer le client dans Tab Out",
    gmailSetupTabOutOpen: "Reviens dans Tab Out, ouvre « Réglages → Général », puis descends tout en bas jusqu’à « Notifications Gmail ».",
    gmailSetupTabOutPaste: "Dans « Client OAuth partagé », colle le « Client ID » et le « Client secret » provenant du même client Desktop, puis clique sur « Enregistrer le client partagé ».",
    gmailSetupTabOutConfigured: "Attends que l’état affiche « Configuré », puis clique sur « Ajouter avec le client partagé ».",
    gmailSetupTabOutConsent: "Dans la fenêtre Google, choisis l’adresse Gmail voulue et accepte l’accès demandé. Si Google affiche un avertissement d’application non vérifiée, ne continue que si tu reconnais ton propre projet et que cette adresse figure bien dans « Test users ».",
    gmailSetupTabOutConfirm: "À la fin, la fenêtre Google se ferme et une carte portant l’adresse exacte du compte doit apparaître dans les réglages et dans le widget Gmail du tableau de bord.",
    gmailSetupMultipleTitle: "Ajouter plusieurs comptes Gmail",
    gmailSetupMultipleIntro: "Tu n’as normalement pas besoin de recréer un projet, d’activer l’API ou de créer un nouveau client : le « Client OAuth partagé » peut connecter plusieurs comptes.",
    gmailSetupMultipleUsers: "En mode « Testing », retourne d’abord dans « Google Auth Platform → Audience → Test users » et ajoute toute nouvelle adresse Gmail.",
    gmailSetupMultipleRepeat: "Dans « Réglages → Général → Notifications Gmail », clique de nouveau sur « Ajouter avec le client partagé » pour chaque compte supplémentaire.",
    gmailSetupMultipleChooser: "Dans le sélecteur Google, choisis le nouveau compte. S’il n’est pas affiché, clique sur « Use another account » / « Utiliser un autre compte » et connecte-toi avec cette adresse.",
    gmailSetupMultipleResult: "Répète l’opération compte par compte. Chaque adresse reçoit sa propre carte, son propre nombre de non-lus et ses propres options d’affichage, de filtres et de notifications.",
    gmailSetupMultipleDedicated: "Utilise « Ajouter avec son propre client » uniquement si tu veux isoler un compte avec un autre client OAuth Desktop. Dans ce cas, crée et conserve séparément la paire Client ID / Client secret correspondante.",
    gmailSetupImportantTitle: "Important",
    gmailSetupImportantHint: "Le « Client ID » et le « Client secret » doivent provenir du même client de type « Desktop app ». Ces identifiants restent dans le stockage local de ce profil de navigateur.",
    gmailSetupTroubleshootingTitle: "Vérification rapide en cas d’échec",
    gmailSetupTroubleshootingAccess: "« Access blocked » ou compte refusé : vérifie « Audience », le type External/Internal et la présence exacte de l’adresse dans « Test users ».",
    gmailSetupTroubleshootingClient: "« invalid_client » : recrée un client « Desktop app » si le secret a été perdu, puis recopie l’ID et le secret de cette même création.",
    gmailSetupTroubleshootingApi: "Erreur Gmail API : vérifie que Gmail API est activée dans le même projet que celui contenant le client OAuth.",
    gmailSetupTroubleshootingExpiry: "Reconnexion après 7 jours : c’est le comportement normal d’un projet External conservé en mode « Testing ».",
    gmailSetupOfficialAudience: "Documentation officielle : Audience et utilisateurs test",
    gmailSetupOfficialScopes: "Documentation officielle : Data Access et champs d’application",
    gmailSetupOfficialClients: "Documentation officielle : clients OAuth",
    gmailSetupOfficialGmailScopes: "Documentation officielle : champs Gmail",
    gmailSetupOfficialLinks: "Documentation officielle Google",
    gmailConnectedAccount: "Compte connecté",
    gmailConnect: "Connecter Gmail",
    gmailAddAccount: "Ajouter un compte Gmail",
    gmailConnecting: "Connexion…",
    gmailCancelConnection: "Annuler la connexion",
    gmailReconnect: "Reconnecter Gmail",
    gmailDisconnect: "Déconnecter",
    gmailDisconnectConfirm: "Déconnecter Gmail, révoquer l’autorisation Google et effacer les données locales de ce compte ?",
    gmailConnected: "Gmail est connecté.",
    gmailDisconnected: "Gmail est déconnecté.",
    gmailConnectFailed: "Impossible de connecter Gmail.",
    gmailDisconnectFailed: "Impossible de déconnecter Gmail complètement.",
    gmailFilters: "Messages à afficher",
    gmailFilterInbox: "Boîte de réception",
    gmailFilterUnread: "Non lus",
    gmailFilterStarred: "Suivis",
    gmailFilterImportant: "Importants",
    gmailAdvancedQuery: "Recherche Gmail avancée",
    gmailAdvancedQueryPlaceholder: "from:example.com newer_than:7d",
    gmailAdvancedQueryHint: "Ajoutée aux filtres sélectionnés avec la syntaxe de recherche Gmail.",
    gmailResultLimit: "Nombre de conversations",
    gmailPollingEnabled: "Vérifier automatiquement les nouveaux messages",
    gmailShowAccount: "Afficher ce compte dans le tableau de bord",
    gmailPollingInterval: "Fréquence de vérification",
    gmailPolling1: "Toutes les minutes",
    gmailPolling5: "Toutes les 5 minutes",
    gmailPolling15: "Toutes les 15 minutes",
    gmailPolling30: "Toutes les 30 minutes",
    gmailNotificationsEnabled: "Afficher les notifications système",
    gmailNotificationPreview: "Contenu des notifications",
    gmailPreviewPrivate: "Privé — nouveau message uniquement",
    gmailPreviewSenderSubject: "Expéditeur et objet",
    gmailPreviewFull: "Aperçu complet",
    gmailBadgeMode: "Badge de la barre d’outils",
    gmailBadgeOpenTabs: "Onglets ouverts",
    gmailBadgeUnread: "Messages Gmail non lus",
    gmailBadgeCombined: "Total combiné",
    gmailBadgeHidden: "Masqué",
    gmailServiceConfigurationTitle: "Client OAuth nécessaire",
    gmailServiceUnavailableTitle: "Autorisation Gmail indisponible",
    gmailServiceCheckingTitle: "Vérification OAuth locale",
    gmailServiceChecking: "Vérification de la configuration OAuth enregistrée dans ce profil.",
    gmailStatusConnected: "Connecté",
    gmailStatusConnecting: "Connexion…",
    gmailStatusDisconnecting: "Déconnexion…",
    gmailStatusDisconnected: "Désactivé",
    gmailStatusReconnectRequired: "Reconnexion requise",
    gmailStatusUnavailable: "Configuration OAuth requise",
    gmailStatusError: "Erreur",
    settingsSuspendedTabsTitle: "Onglets suspendus",
    settingsSuspendedTabsHint: "Utilise le titre et l’adresse d’origine des onglets suspendus par The Marvellous Suspender.",
    settingsRightClickCopyTitle: "Copie des liens au clic droit",
    settingsRightClickCopyHint: "Clique avec le bouton droit sur un onglet dans Tab Out pour copier son URL.",
    settingsUnassignedTabDragTitle: "Déplacement des onglets non assignés",
    settingsUnassignedTabDragHint: "Fais glisser un onglet non assigné vers une session ou un autre onglet.",
    settingsSessionReorderTitle: "Réorganisation des sessions",
    settingsSessionReorderHint: "Fais glisser les sessions sauvegardées pour modifier leur ordre.",
    settingsExpandSessionTabsTitle: "Déplier les onglets des sessions",
    settingsExpandSessionTabsHint: "Affiche la liste complète des onglets directement dans chaque carte de session.",
    settingsDragSessionTabsTitle: "Déplacer les onglets enregistrés",
    settingsDragSessionTabsHint: "Déplace un onglet enregistré vers une autre session ou vers les onglets non assignés.",
    settingsLanguageHint: "La langue reste disponible ici lorsque son bouton est masqué.",
    settingsResetTitle: "Réinitialiser l’affichage",
    settingsResetHint: "Restaure la disposition Originale et les raccourcis par défaut.",
    settingsReset: "Réinitialiser",
    restoreDefaults: "Valeurs par défaut",
    close: "Fermer",
    language: "Langue",
    moduleGreeting: "Message d’accueil",
    moduleTime: "Heure",
    moduleDate: "Date",
    moduleWeather: "Météo",
    moduleShortcuts: "Raccourcis web",
    moduleLanguage: "Langue",
    moduleSessions: "Sessions",
    moduleUnassigned: "Onglets non assignés",
    moduleSavedLater: "À consulter plus tard",
    moduleGmail: "Gmail",
    moduleStats: "Statistiques des onglets",
    moduleVisible: "Afficher",
    moduleView: "Affichage",
    moveLeft: "Déplacer à gauche",
    moveRight: "Déplacer à droite",
    moveUp: "Monter",
    moveDown: "Descendre",
    makeNarrower: "Réduire la largeur",
    makeWider: "Augmenter la largeur",
    resizeModule: "Redimensionner",
    moduleColumns: "{count} col.",
    resizeStatus: "{module} : {count} colonnes",
    placementFloating: "Flottant · {position}",
    placementGrid: "{region} · colonne {column} · largeur {width}",
    previewDesktop: "Ordinateur",
    previewTablet: "Tablette",
    previewMobile: "Mobile",
    dockTopLeft: "En haut à gauche",
    dockTopRight: "En haut à droite",
    dockBottomLeft: "En bas à gauche",
    dockBottomRight: "En bas à droite",
    styleTiles: "Tuiles",
    styleCompact: "Compact",
    styleCards: "Cartes",
    styleList: "Liste",
    styleDomainGrid: "Grille par domaine",
    styleCompactList: "Liste compacte",
    stylePanel: "Panneau",
    unassignedDisplayOptions: "Affichage des onglets non assignés",
    unassignedDensity: "Densité",
    densityComfortable: "Confortable",
    densityCompact: "Compacte",
    unassignedColumns: "Colonnes",
    columnsResponsive: "Multiples adaptatives",
    columnsSingle: "Colonne unique",
    unassignedMinColumnWidth: "Largeur minimale",
    unassignedVisibleTabs: "Titres visibles",
    visibleTabsTwo: "2 titres",
    visibleTabsFour: "4 titres",
    visibleTabsAll: "Tous les titres",
    presetOriginal: "Original",
    presetOriginalHint: "La disposition historique exacte de Tab Out.",
    presetFocus: "Concentration",
    presetFocusHint: "L’essentiel : heure, date, sessions et onglets.",
    presetCompact: "Compact",
    presetCompactHint: "Tous les éléments dans une présentation plus dense.",
    presetCustom: "Personnalisé",
    keyboardOpenSettings: "Ouvrir les réglages",
    keyboardSearchUnassigned: "Rechercher les onglets non assignés",
    keyboardFocusShortcuts: "Afficher les raccourcis web",
    keyboardFocusSessions: "Afficher les sessions",
    keyboardFocusUnassigned: "Afficher les onglets non assignés",
    keyboardFocusSavedLater: "Afficher À consulter plus tard",
    keyboardCreateSession: "Créer une session",
    keyboardAddShortcut: "Ajouter un raccourci web",
    keyboardOpenPopup: "Ouvrir le menu de l’extension",
    keyboardRecord: "Définir",
    keyboardPressKeys: "Appuie sur une combinaison…",
    keyboardUnassigned: "Non attribué",
    keyboardClear: "Effacer",
    keyboardManage: "Gérer",
    keyboardManagedByBrowser: "Ce raccourci est géré par Brave.",
    keyboardManagerOpenFailed: "Impossible d’ouvrir les raccourcis de Brave.",
    keyboardConflict: "Cette combinaison est déjà utilisée par « {action} ».",
    keyboardReserved: "Cette combinaison est réservée par le navigateur.",
    keyboardStructural: "Cette touche est réservée à la navigation.",
    settingsSaved: "Réglages enregistrés.",
    settingsSaveFailed: "Impossible d’enregistrer les réglages.",
    settingsModuleHidden: "Active « {module} » dans les réglages pour utiliser cette commande.",
    settingsExternalChange: "Les réglages ont changé dans un autre onglet.",
    settingsUnsaved: "Modifications non enregistrées",
    moduleTodo: "Liste TODO",
    todoWidgetTitle: "Liste TODO",
    todoWidgetHint: "Garde les prochaines actions visibles et locales.",
    todoAddTask: "Ajouter une tÃ¢che",
    todoUndo: "Annuler",
    todoTaskTitleLabel: "Titre de la tÃ¢che",
    todoTaskTitlePlaceholder: "Que faut-il faire ?",
    todoMoreDetails: "Plus de dÃ©tails",
    todoNotesLabel: "Notes",
    todoNotesPlaceholder: "Ajoute un commentaire ou du contexteâ€¦",
    todoTaskAppearanceTitle: "Apparence de la tâche",
    todoTaskAppearanceHint: "Ajoute un repère visuel facultatif sans modifier la priorité de l’échéance.",
    todoTaskColorLabel: "Couleur",
    todoTaskColorNone: "Aucune couleur",
    todoTaskColorCustom: "Couleur personnalisée",
    todoTaskColorRed: "Rouge",
    todoTaskColorOrange: "Orange",
    todoTaskColorYellow: "Jaune",
    todoTaskColorGreen: "Vert",
    todoTaskColorBlue: "Bleu",
    todoTaskColorPurple: "Violet",
    todoTaskColorPink: "Rose",
    todoTaskColorSlate: "Gris ardoise",
    todoTaskIconLabel: "Icône",
    todoTaskIconNone: "Aucune icône",
    todoTaskIconWork: "Travail",
    todoTaskIconPersonal: "Personnel",
    todoTaskIconEmail: "E-mail",
    todoTaskIconCall: "Appel",
    todoTaskIconShopping: "Achats",
    todoTaskIconWarning: "Avertissement",
    todoTaskIconStar: "Étoile",
    todoDeadlineDateLabel: "Date limite",
    todoDeadlineTimeLabel: "Heure facultative",
    todoChecklistLabel: "Liste",
    todoChecklistPlaceholder: "Ajouter une Ã©tapeâ€¦",
    todoAddChecklistItem: "Ajouter",
    todoChecklistItemLabel: "Ã‰tape de la liste",
    todoRemoveChecklistItem: "Supprimer cette Ã©tape",
    todoSaveTask: "Enregistrer la tÃ¢che",
    todoSaveChanges: "Enregistrer les modifications",
    todoEmptyTitle: "Rien Ã  faire pour lâ€™instant.",
    todoEmptyHint: "Ajoute une tÃ¢che pour garder la prochaine Ã©tape Ã  portÃ©e de main.",
    todoTaskCount: "{count} tÃ¢che",
    todoTasksCount: "{count} tÃ¢ches",
    todoDeadlineOverdue: "En retard",
    todoDeadlineToday: "Aujourdâ€™hui",
    todoDeadlineSoon: "BientÃ´t",
    todoDeadlineFuture: "Ã€ venir",
    todoToggleComplete: "Marquer la tÃ¢che comme terminÃ©e",
    todoEditTask: "Modifier la tÃ¢che",
    todoReorderTask: "Faire glisser pour réordonner. Utiliser les flèches haut et bas au clavier.",
    todoExpandTask: "DÃ©velopper le contenu de la tÃ¢che",
    todoCollapseTask: "RÃ©duire le contenu de la tÃ¢che",
    todoArchiveTask: "Archiver la tÃ¢che",
    todoRestoreTask: "Restaurer la tÃ¢che",
    todoDeleteTask: "Supprimer la tÃ¢che",
    todoCreatedDate: "CrÃ©Ã©e le {date}",
    todoCompletedDate: "TerminÃ©e le {date}",
    todoTitleRequired: "Le titre de la tÃ¢che est obligatoire.",
    todoSaveFailed: "Impossible dâ€™enregistrer la modification TODO.",
    todoTaskAdded: "TÃ¢che ajoutÃ©e.",
    todoTaskUpdated: "TÃ¢che mise Ã  jour.",
    todoTaskCompleted: "TÃ¢che terminÃ©e.",
    todoTaskReopened: "TÃ¢che rouverte.",
    todoTaskArchived: "TÃ¢che archivÃ©e.",
    todoTaskRestored: "TÃ¢che restaurÃ©e.",
    todoTaskDeleted: "TÃ¢che supprimÃ©e.",
    todoTasksReordered: "Ordre des tâches enregistré.",
    todoNothingToUndo: "Aucune modification TODO Ã  annuler.",
    todoUndoSuccess: "Modification TODO annulÃ©e.",
    todoUndoConflict: "Cette modification ne peut plus Ãªtre annulÃ©e aprÃ¨s un changement externe.",
    todoUndoFailed: "Impossible dâ€™annuler la modification TODO.",
    todoUndoAdd: "ajout de tÃ¢che",
    todoUndoEdit: "modification de tÃ¢che",
    todoUndoChecklist: "modification de liste",
    todoUndoComplete: "tÃ¢che terminÃ©e",
    todoUndoReopen: "rÃ©ouverture de tÃ¢che",
    todoUndoArchive: "archivage de tÃ¢che",
    todoUndoRestore: "restauration de tÃ¢che",
    todoUndoDelete: "suppression de tÃ¢che",
    todoUndoReorder: "réorganisation des tâches",
    todoUndoChange: "derniÃ¨re modification",
    todoOptionalWidget: "Widget local facultatif",
    todoSettingsTitle: "Liste TODO",
    todoSettingsHint: "Configure ce qui arrive aux tÃ¢ches terminÃ©es et la maniÃ¨re dont les Ã©chÃ©ances indiquent lâ€™urgence.",
    todoLocalOnlyTitle: "StockÃ© localement",
    todoLocalOnlyHint: "Les tÃ¢ches et lâ€™historique dâ€™annulation restent dans ce profil de navigateur.",
    todoEmailIntegrationTitle: "Transformer les e-mails en tâches",
    todoEmailIntegrationHint: "Ajoute une action rapide aux conversations Gmail pour créer une tâche liée. Les tâches déjà liées restent disponibles si cette option est désactivée.",
    todoEmailCompletionActionLabel: "Lorsqu’une tâche liée à un e-mail est terminée",
    todoEmailCompletionKeep: "Ne pas modifier l’e-mail",
    todoEmailCompletionMarkRead: "Marquer l’e-mail comme lu",
    todoEmailCompletionArchive: "Archiver l’e-mail",
    todoEmailCompletionHint: "Cette action s’applique uniquement à la finalisation. Rouvrir la tâche n’annule pas l’action Gmail.",
    todoAddEmailTask: "Ajouter cet e-mail à la liste TODO",
    todoViewEmailTask: "Afficher la tâche liée",
    todoEmailTaskComposerTitle: "Créer une tâche depuis cet e-mail",
    todoEmailTaskTitleLabel: "Titre de la tâche",
    todoEmailTaskCommentLabel: "Commentaire facultatif",
    todoEmailTaskCommentPlaceholder: "Ajouter le contexte ou la prochaine action…",
    todoEmailTaskDeadlineLabel: "Date limite facultative",
    todoEmailTaskDeadlineTimeLabel: "Heure facultative",
    todoEmailTaskAdd: "Ajouter à TODO",
    todoEmailTaskAdded: "E-mail ajouté à la liste TODO.",
    todoEmailTaskAlreadyExists: "Cet e-mail est déjà lié à une tâche.",
    todoEmailTaskAddFailed: "Impossible de créer la tâche liée à cet e-mail.",
    todoEmailTaskView: "Voir la tâche",
    todoEmailTaskOpen: "Ouvrir l’e-mail",
    todoEmailTaskShow: "Afficher dans le widget",
    todoEmailTaskOpenExternal: "Ouvrir dans Gmail ↗",
    todoEmailTaskSourceLabel: "Conversation Gmail liée",
    todoEmailTaskUnavailable: "Impossible d’ouvrir cette conversation Gmail.",
    todoEmailTaskWidgetHidden: "La tâche existe, mais le widget TODO est masqué dans la disposition.",
    todoEmailTaskShowWidgetHidden: "Le widget Gmail est masqué dans la disposition. Réactive-le dans Réglages → Disposition.",
    todoEmailTaskShowAccountHidden: "Ce compte Gmail est masqué. Réactive-le dans Réglages → Général.",
    todoEmailTaskShowDisconnected: "Ce compte Gmail n’est plus connecté.",
    todoEmailTaskShowReconnect: "Reconnecte ce compte Gmail avant d’afficher la conversation.",
    todoEmailTaskShowFailed: "Impossible d’afficher cette conversation dans le widget Gmail.",
    todoEmailActionFailed: "La tâche est terminée, mais l’action Gmail n’a pas pu être appliquée.",
    todoCompletionActionLabel: "Lorsquâ€™une tÃ¢che est terminÃ©e",
    todoCompletionArchive: "Archiver automatiquement",
    todoCompletionKeep: "Conserver comme terminÃ©e avant archivage manuel",
    todoCompletionDelete: "Supprimer automatiquement",
    todoShowFullTitlesTitle: "Afficher les titres complets",
    todoShowFullTitlesHint: "Autorise les titres longs Ã  utiliser plusieurs lignes au lieu de les raccourcir.",
    todoDeadlineColorsTitle: "Couleurs de prioritÃ© des Ã©chÃ©ances",
    todoDeadlineColorsHint: "DiffÃ©rencie les Ã©chÃ©ances en retard, du jour, proches et futures.",
    todoDueSoonThresholdTitle: "Seuil dâ€™Ã©chÃ©ance proche",
    todoDueSoonThresholdHint: "Les Ã©chÃ©ances dans ce nombre de jours utilisent la prioritÃ© proche.",
    todoDueSoonDaysValue: "{count} jours",
    todoLayoutHint: "Affiche, dÃ©place, redimensionne ou masque ce widget depuis le menu Disposition.",
    todoResetColors: "RÃ©initialiser les couleurs",
    gmailDisplayOptions: "Lisibilité Gmail",
    gmailDisplayPreset: "Préréglage",
    gmailPresetScan: "Lecture rapide",
    gmailPresetBalanced: "Équilibré",
    gmailPresetReading: "Lecture",
    gmailPresetScanHint: "Lignes compactes, extraits courts et messages non lus très visibles.",
    gmailPresetBalancedHint: "Hiérarchie plus claire, extraits sur deux lignes et volet de lecture adaptatif.",
    gmailPresetReadingHint: "Texte plus grand, espacement généreux et largeur de lecture concentrée.",
    gmailPresetCustomHint: "Combinaison personnalisée des options d’affichage Gmail.",
    gmailResetDisplay: "Rétablir Équilibré",
    gmailListDensity: "Densité de la liste",
    gmailDensityCompact: "Compacte",
    gmailDensityComfortable: "Confortable",
    gmailDensitySpacious: "Aérée",
    gmailTextSize: "Taille du texte",
    gmailTextSmall: "Petite",
    gmailTextMedium: "Moyenne",
    gmailTextLarge: "Grande",
    gmailSnippetLines: "Lignes d’extrait",
    gmailSnippetHidden: "Masqué",
    gmailSnippetOne: "1 ligne",
    gmailSnippetTwo: "2 lignes",
    gmailSnippetThree: "3 lignes",
    gmailUnreadEmphasis: "Messages non lus",
    gmailUnreadSubtle: "Discret",
    gmailUnreadStrong: "Marqué",
    gmailConversationDisplay: "Ouverture des conversations",
    gmailDisplayInline: "Dans la liste",
    gmailDisplaySplit: "Volet séparé",
    gmailReadingWidth: "Largeur de lecture",
    gmailReadingFocused: "Concentrée",
    gmailReadingNormal: "Normale",
    gmailReadingWide: "Large",
    gmailMessageSpacing: "Espacement des messages",
    gmailSpacingCompact: "Compact",
    gmailSpacingComfortable: "Confortable",
    gmailSpacingSpacious: "Aéré",
    gmailReadingPane: "Volet de lecture Gmail",
    gmailReadingPaneEmptyTitle: "Sélectionne un message",
    gmailReadingPaneEmptyHint: "Choisis une conversation à gauche pour la lire sans quitter le tableau de bord.",
    gmailNoSubject: "(Sans objet)",
    gmailExpandMessage: "Développer cet ancien message",
    gmailCollapseMessage: "Réduire cet ancien message",
    gmailWidgetTitle: "Gmail",
    gmailRefresh: "Actualiser Gmail",
    gmailExpandAccount: "Déplier ce compte",
    gmailCollapseAccount: "Réduire ce compte",
    gmailOpenInbox: "Ouvrir Gmail",
    gmailOpenConversation: "Ouvrir dans Gmail",
    gmailWidgetDisconnected: "Connecte Gmail depuis les réglages pour afficher tes conversations.",
    gmailWidgetAccountsHidden: "Tous les comptes Gmail connectés sont masqués. Réactive un compte dans Réglages → Général.",
    gmailWidgetUnavailable: "Configure un client OAuth Google Desktop dans Réglages → Général pour connecter Gmail.",
    gmailWidgetLoading: "Chargement des conversations…",
    gmailWidgetEmpty: "Aucune conversation ne correspond à ces filtres.",
    gmailWidgetStale: "Impossible d’actualiser. Affichage du dernier résultat disponible.",
    gmailWidgetError: "Impossible de charger Gmail.",
    gmailInvalidQuery: "La recherche Gmail avancée n’est pas valide.",
    gmailAuthorizationExpired: "L’autorisation Gmail a expiré. Reconnecte le compte.",
    gmailPermissionDenied: "L’autorisation optionnelle Gmail a été refusée.",
    gmailConfigMissing: "Configure un client OAuth partagé ou dédié dans Réglages → Général.",
    gmailNetworkError: "Le service Gmail est temporairement indisponible.",
    gmailOAuthCancelled: "Connexion Gmail annulée.",
    gmailConversationCount: "{count} messages",
    gmailShowLatest: "Lire le dernier message",
    gmailLoadConversation: "Charger toute la conversation",
    gmailHidePreview: "Fermer l’aperçu",
    gmailBodyLoading: "Chargement du message…",
    gmailConversationLoading: "Chargement de la conversation…",
    gmailNoBody: "Aucun contenu texte disponible. Ouvre la conversation dans Gmail.",
    gmailLastUpdatedNow: "À l’instant",
    gmailLastUpdatedMinutes: "Il y a {count} min",
    gmailShownCount: "{count} affichées",
    gmailNeverUpdated: "Pas encore actualisé",
    gmailAccountCount: "{count} compte(s)",
    gmailUnreadCount: "{count} non lu(s)",
    gmailTrashConfirm: "Placer cette conversation dans la corbeille ?",
    gmailActionFailed: "Impossible d’appliquer cette action Gmail.",
    gmailActionComplete: "Action Gmail appliquée.",
    gmailMarkRead: "Marquer comme lu",
    gmailMarkUnread: "Marquer comme non lu",
    gmailStar: "Ajouter aux suivis",
    gmailUnstar: "Retirer des suivis",
    gmailArchive: "Archiver",
    gmailTrash: "Mettre à la corbeille",
    gmailAccountAlreadyConnected: "Ce compte Gmail est déjà connecté.",
    gmailAccountNotFound: "Ce compte Gmail n’est plus connecté.",
    gmailServiceUnavailable: "L’autorisation Gmail locale est indisponible.",
    gmailBrowserUnsupported: "Ce navigateur ne permet pas de terminer cette connexion OAuth sans intermédiaire.",
    gmailOAuthCallbackFailed: "Google n’a pas renvoyé de réponse d’autorisation exploitable.",
    gmailOAuthTimeout: "La demande d’autorisation Gmail a expiré.",
    gmailApiNotEnabled: "Active l’API Gmail dans le projet Google Cloud associé à ce client OAuth.",
    gmailOAuthAuthorizationCodeRejected: "Google a rejeté le code d’autorisation à usage unique. Recharge Tab Out puis recommence la connexion.",
    gmailOAuthClientInUse: "Ce client OAuth est utilisé par des comptes connectés. Confirme son remplacement pour continuer.",
    gmailOAuthClientSecretMissing: "Google exige le secret associé à ce client OAuth Desktop. Ajoute-le aux identifiants OAuth de l’extension puis recharge-la.",
    gmailOAuthInvalidClient: "Google a rejeté l’identifiant ou le secret OAuth. Copie les deux valeurs depuis le même client Application de bureau actif.",
    gmailOAuthInvalidRequest: "Google a rejeté la requête OAuth. Recharge l’extension puis réessaie.",
    gmailOAuthRedirectMismatch: "Google a refusé l’adresse de retour locale de ce client OAuth.",
    gmailOAuthScopeNotGranted: "L’autorisation Gmail requise n’a pas été accordée ou configurée.",
    gmailOAuthUnauthorizedClient: "Ce client OAuth n’est pas autorisé à utiliser le flux Application de bureau.",
    gmailReconnectAccountMismatch: "Sélectionne le même compte Gmail que celui que tu souhaites reconnecter.",
    gmailRefreshTokenMissing: "Google n’a pas accordé l’accès hors connexion. Révoque l’ancien accès puis réessaie.",
    gmailOAuthStateMismatch: "La réponse OAuth n’a pas pu être vérifiée de manière sûre.",
    gmailTokenExchangeFailed: "Google n’a pas pu échanger le code d’autorisation.",
    gmailNotificationsDenied: "Les notifications système ont été refusées."
  },

  en: {
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    timePrefix: "It is",
    datePrefix: "Today is",
    locale: "en-US",

    openTabs: "Open tabs",
    unassignedTabs: "Unassigned tabs",
    homepages: "Homepages",
    domains: "domains",
    domain: "domain",
    tabs: "tabs",
    tab: "tab",
    open: "open",
    closeAllTabs: "Close {count} tabs",
    closeAllDomainTabs: "Close all {count} tabs",
    closeDuplicate: "Close {count} duplicate",
    closeDuplicates: "Close {count} duplicates",
    duplicate: "duplicate",
    duplicates: "duplicates",
    showTabs: "Show {count} tabs",
    showMoreTabs: "Show {count} more",
    hideTabs: "Hide {count} tabs",

    inboxZeroTitle: "Inbox zero, but for tabs.",
    inboxZeroSubtitle: "You're free.",
    noResults: "No results",
    filterTabs: "Filter tabs…",
    searchTabs: "Search unassigned tabs",
    closeTabSearch: "Close search",
    noMatchingTabs: "No tabs match this search.",
    allTabsAssignedTitle: "Everything is organized.",
    allTabsAssignedSubtitle: "Every open tab is already assigned to a session.",
    unassignedTabsClosed: "All unassigned tabs were closed.",
    unassignedTabsClosedPartial: "Closed {count} unassigned tab(s)",
    unassignedDuplicatesClosed: "Closed duplicates, kept one copy each",
    unassignedDuplicatesClosedPartial: "Closed the available duplicates",
    unassignedUndoRemoval: "Undo close",
    unassignedUndoRemovalTitle: "Restore the last closed tabs · {count} available",
    unassignedUndoRemovalEmpty: "No unassigned-tab closure to undo",
    unassignedRemovalRestored: "Restored {count} tab(s)",
    unassignedRemovalRestorePartial: "Restored {restored} tab(s) · {failed} failed",
    unassignedRemovalRestoreFailed: "Could not restore the closed tabs",
    unassignedRemovalAlreadyRestored: "Those tabs are already open",
    unassignedRemovalCloseFailed: "Could not close the selected tabs",

    justNow: "just now",
    minAgo: "{count} min ago",
    hourAgo: "{count} hr ago",
    yesterday: "yesterday",
    daysAgo: "{count} days ago",

    itemCount: "{count} item",
    itemsCount: "{count} items",

    sessions: "Sessions",
    sessionsSubtitle: "Quickly reopen a group of tabs.",
    createSessionButton: "+ Session",
    noSavedSession: "No saved session yet.",
    sessionsReordered: "Session order saved",
    editSession: "Edit this session",
    createSessionTitle: "Create a session",
    editSessionTitle: "Edit session",
    sessionNameRequired: "Name your session.",
    sessionEditorSubtitle: "Add or remove tabs from this session.",
    undo: "Undo last action",
    includedTabs: "Included tabs",
    availableTabs: "Available open tabs",
    removeAll: "Remove all",
    addAll: "Add all",
    removeTab: "Remove",
    addTab: "Add",
    noIncludedTabs: "This session is empty.",
    noAvailableTabs: "All open tabs are already included.",
    sessionChangedConflict: "This session changed elsewhere. Close and reopen this window to avoid overwriting those changes.",
    sessionSaved: "Session saved",
    sessionDeleted: "Session deleted",
    sessionOpened: "Session opened: {name}",
    deleteSessionConfirm: "Delete this session?",
    sessionTabCount: "{count} tab",
    sessionTabsCount: "{count} tabs",
    assignTabDrag: "Assign tab",
    dropAddToSession: "Drop to add",
    dropCreatePair: "Create a session with these 2 tabs",
    dropMoveToSession: "Move to this session",
    dropMoveToUnassigned: "Move to unassigned tabs",
    moveSavedTabLabel: "Move saved tab",
    moveSavedTab: "Move {title}",
    showSessionTabs: "Show session tabs",
    hideSessionTabs: "Hide session tabs",
    sessionTabsList: "Tabs in session {name}",
    sessionTabMoveFailed: "Could not move this tab",
    sessionTabBackgroundOpenFailed: "Could not open this tab in the background",
    unassignSharedTabConfirm: "This tab belongs to {count} sessions. Remove it from all of them?",
    unassignFromAll: "Remove from all",
    sessionTabAlreadyMoved: "This tab is no longer in the source session",
    sessionTabRemovedFromSource: "The tab was already in the destination and was removed from the source",
    sessionTabMovedToUnassigned: "Tab moved to Unassigned tabs",
    sessionTabMoved: "Tab moved to {name}",
    tabAssignedToSession: "Tab added to “{name}”",
    tabAlreadyAssigned: "This tab is already in that session.",
    tabAssignmentFailed: "Could not assign this tab.",
    newSessionDefaultName: "New session",
    sessionCreatedFromTabs: "Session created with 2 tabs",
    sessionCreationFailed: "Could not create this session.",
    renameSession: "Rename session",
    sessionRenamed: "Session renamed",
    sessionRenameFailed: "Could not rename this session.",
    back: "← Back",
    importGroupButton: "Import group",
    importGroupTitle: "Import a tab group",
    chooseGroupSubtitle: "Choose the Chrome or Brave group to turn into a session.",
    chooseGroupModeSubtitle: "Create a session or add this group to an existing session.",
    chooseSessionSubtitle: "Choose the session to update with this group.",
    reviewGroupSubtitle: "Select the tabs the session should keep.",
    noChromeGroupsForImport: "No open tab group is available to import.",
    importAsNewSession: "Create a new session",
    updateExistingSession: "Update a session",
    linkedToSession: "Linked to “{name}”",
    groupCurrentWindow: "Current window",
    groupOtherWindow: "Other window",
    groupOpenStatus: "Group open",
    groupChangedStatus: "Changes available",
    groupClosedStatus: "Group closed",
    groupTabInBoth: "In the session and group",
    groupTabNew: "New from the group",
    groupTabSessionOnly: "Only in the session",
    applyGroupReview: "Apply",
    groupReviewSummary: "{kept} kept · {added} added · {removed} removed",
    groupReviewSaved: "Session updated from the group",
    openAsGroup: "Open as group",
    showOpenGroup: "Show open group",
    openGroupCopy: "Open a group copy",
    groupCopyTitle: "{name} (copy)",
    reviewGroupChanges: "Review changes",
    connectGroup: "Connect a group",
    changeGroup: "Change connected group",
    disconnectGroup: "Disconnect group",
    disconnectGroupConfirm: "Disconnect this group from the session? The session will be kept.",
    groupDisconnected: "Group disconnected",
    groupOpenedLinked: "Group opened and connected to “{name}”",
    groupFocused: "Open group focused",
    sessionActions: "Session actions",
    selectAll: "Select all",
    clearAll: "Clear all",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    collectionDetailBack: "← Back",
    collectionDetailHint: "Select tabs to open them in the background, or use “Open & switch” to display one immediately.",
    collectionDetailSession: "Saved session",
    collectionDetailLiveGroup: "Open group",
    collectionDetailSavedGroup: "Saved group",
    collectionDetailChangedNotice: "This group changed in the browser. This list shows the saved version.",
    collectionDetailClosedNotice: "This group is closed. This list shows the saved version.",
    collectionDetailSelected: "{count} selected",
    collectionDetailOpenSelected: "Open selected in background",
    collectionDetailOpenSelectedCount: "Open {count} in background",
    collectionDetailOpenAll: "Open all in background",
    collectionDetailOpenAllGroup: "Open all as a new group",
    collectionDetailRestoreGroup: "Restore the complete group",
    collectionDetailOpenAndSwitch: "Open & switch",
    collectionDetailSwitchToTab: "Switch to tab",
    collectionDetailOpenedOne: "1 tab opened in the background",
    collectionDetailOpenedMany: "{count} tabs opened in the background",
    collectionDetailOpenedGroup: "Group opened with {count} tab(s)",
    collectionDetailOpenPartial: "{opened} tab(s) opened, {failed} failed",
    collectionDetailOpenFailed: "Could not open the selected tabs",
    collectionDetailUnavailable: "This collection is no longer available.",
    collectionDetailAlreadyOpen: "Already open",
    collectionDetailAllAlreadyOpen: "All tabs are already open",
    collectionDetailSelectedAlreadyOpen: "The selected tabs are already open",
    collectionDetailGroupCopyHint: "Opening the complete group intentionally creates a copy of every tab, including tabs that are already open.",
    collectionDetailOpenSummary: "{opened} opened · {skipped} already open",
    collectionDetailOpenSummaryFailed: "{opened} opened · {skipped} already open · {failed} failed",
    collectionManualUrlLabel: "Link",
    collectionManualUrlPlaceholder: "https://example.com",
    collectionManualTitleLabel: "Optional name",
    collectionManualTitlePlaceholder: "E.g. Documentation",
    collectionManualAddSubmit: "Add",
    collectionManualAlreadyAdded: "This tab is already in this collection.",
    collectionManualInvalidUrl: "Enter a valid link.",
    collectionManualUnsupportedUrl: "This type of link cannot be added.",
    collectionManualAddFailed: "Could not add this tab.",

    shortcuts: "Shortcuts",
    shortcutAddButton: "Shortcut",
    addShortcutTitle: "Add shortcut",
    editShortcutTitle: "Edit shortcut",
    editShortcut: "Edit this shortcut",
    deleteShortcut: "Delete this shortcut",
    saveShortcut: "Save",
    addShortcut: "Add",
    deleteShortcutConfirm: "Delete shortcut \"{name}\"?",
    resetShortcutsConfirm: "Reset all shortcuts to default?",

    saveForLater: "Save for later",
    nothingSaved: "Nothing saved. Living in the moment.",
    archive: "Archive",
    archiveSearchPlaceholder: "Search archived tabs...",
    restoreArchivedTab: "Restore to Saved for later",
    deleteArchivedTab: "Delete permanently",
    archivedTabRestored: "Tab restored to Saved for later",
    archivedTabDeleted: "Archived tab deleted",
    archivedTabDeleteUndone: "Tab restored to the archive",
    archivedTabActionFailed: "Could not update this archived tab",
    undoDelete: "Undo",
    tabOutDupePrefix: "You have",
    tabOutDupeSuffix: "Tab Out tabs open. Keep just this one?",
    closeExtras: "Close extras",
    sessionNameLabel: "Session name",
    sessionNamePlaceholder: "E.g. Dev Ultra",
    nameLabel: "Name",
    urlLabel: "URL",
    shortcutNamePlaceholder: "E.g. Netflix",
    shortcutUrlPlaceholder: "https://example.com",
    savedForLater: "Saved for later",
    failedToSaveTab: "Failed to save tab",
    tabClosed: "Tab closed",
    tabLinkCopied: "Tab link copied",
    tabLinkCopyFailed: "Could not copy the tab link",
    closeThisTab: "Close this tab",
    dismiss: "Dismiss",
    archiveSearchFailed: "Archive search failed",
    closedExtraTabOutTabs: "Closed extra Tab Out tabs",
    closedTabsFrom: "Closed {count} tab from {name}",
    closedTabsFromPlural: "Closed {count} tabs from {name}",

    weatherSun: "Sunny",
    weatherPartly: "Partly cloudy",
    weatherCloud: "Cloudy",
    weatherFog: "Fog",
    weatherRain: "Rain",
    weatherSnow: "Snow",
    weatherStorm: "Storm",
    weatherGeneric: "Weather",
    weatherFeelsLike: "Feels like {temp}°C",
    weatherEnable: "Enable weather",
    weatherLoading: "Loading...",
    weatherPermissionDenied: "Location access was denied. Allow location for Tab Out in Brave, then try again.",
    weatherLocationUnavailable: "Your location is unavailable. Check Brave's location settings, then try again.",
    weatherLocationTimeout: "Location is taking too long. Please try again in a moment.",
    weatherNetworkError: "The weather service is unavailable. Check your connection, then try again.",
    weatherLoadFailed: "Could not load the weather. Please try again in a moment.",
    showCity: "Show city",
    hideCity: "Hide city",

    backupMenuTitle: "Data backup",
    exportData: "Export data",
    importData: "Import data",
    exportSuccess: "Data exported",
    exportFailed: "Export failed",
    importConfirm: "Importing this backup will replace your shortcuts, sessions, archived tabs, and local preferences. Continue?",
    importSuccess: "Data imported",
    importFailed: "Import failed",
    invalidBackupFile: "Invalid backup file",

    protectedGroupsTab: "Saved groups",
    syncChromeGroups: "Sync",
    protectActiveGroup: "+ Protect active group",
    protectChromeGroup: "Save this group",
    chromeGroupUnprotected: "Unsaved",
    chromeGroupNativeColor: "Chrome group color",
    noChromeGroups: "No Chrome group to show.",
    noProtectedGroups: "No saved group yet.",
    protectedGroupsEmptyTitle: "No saved group yet.",
    protectedGroupsEmptySubtitle: "Create a group in Chrome, then use the pencil to save it in Tab Out.",
    noActiveChromeGroup: "No active Chrome group on this tab.",
    chromeGroupProtected: "Saved group: {name}",
    chromeGroupSnapshotUpdated: "Saved version updated: {name}",
    chromeGroupRestored: "Group restored: {name}",
    chromeGroupCopyOpened: "Copy opened: {name}",
    chromeGroupDeleted: "Protection removed",
    chromeGroupIgnored: "Change ignored",
    chromeGroupSynced: "Sync",
    chromeGroupChanged: "Changed",
    chromeGroupMissing: "Closed",
    untitledChromeGroup: "Untitled group",
    chromeGroupChangeAdded: "+{added}",
    chromeGroupChangeRemoved: "-{removed}",
    chromeGroupChangeAddedRemoved: "+{added} -{removed}",
    chromeGroupChangeTooltip: "Changed: {added} tab(s) added, {removed} tab(s) removed.",
    chromeGroupTooltipStatusColor: "Left bar: Tab Out status. Right dot: native Chrome color.",
    chromeGroupLastSaved: "Last saved: {time}",
    chromeGroupTabCount: "{count} tab",
    chromeGroupTabsCount: "{count} tabs",
    restoreProtectedGroup: "Restore",
    openProtectedGroupCopy: "Open as new group",
    updateProtectedGroup: "Update from Chrome",
    ignoreProtectedGroupChange: "Ignore change",
    deleteProtectedGroup: "Remove protection",
    restoreProtectedGroupConfirm: "This group already exists in Chrome. Restoring the saved version will create a copy. Continue?",
    updateProtectedGroupConfirm: "Replace the saved version with the current Chrome group?",
    deleteProtectedGroupConfirm: "Remove this protection?",

    languageSwitchToEnglish: "Switch to English",
    languageSwitchToFrench: "Switch to French",
    settingsOpen: "Open settings",
    settingsEyebrow: "Customization",
    settingsTitle: "Settings",
    settingsLayout: "Layout",
    settingsKeyboard: "Keyboard",
    settingsGeneral: "General",
    settingsPresets: "Quick layouts",
    settingsPresetsHint: "Start with a layout, then make it yours.",
    settingsLayoutFrameTitle: "Dashboard width",
    settingsLayoutFrameHint: "Adjust the space to the left and right of the content.",
    settingsContainerPaddingTitle: "Horizontal content padding",
    settingsContainerPaddingHint: "At 0px, content uses the full available width. Width recenters progressively and adapts on tablet and mobile.",
    settingsHeaderModules: "Header",
    settingsContentModules: "Content",
    settingsModules: "Elements",
    settingsGridHint: "Drag an element onto either grid. Use its edge to resize it.",
    settingsHiddenModules: "Hidden elements",
    settingsHiddenHint: "Hidden elements keep their saved position.",
    settingsNothingHidden: "Nothing hidden",
    settingsPreview: "Dashboard preview",
    settingsPreviewHint: "Positions snap to a responsive 12-column grid.",
    settingsDropHere: "Drop elements here",
    settingsDragModule: "Move",
    settingsLanguagePosition: "Language position",
    settingsReorderHint: "Drag items or use the arrow buttons.",
    settingsContentHint: "Main sections can also be hidden.",
    settingsKeyboardTitle: "Keyboard shortcuts",
    settingsKeyboardHint: "Select a command, then press a combination. The popup shortcut is managed by the browser.",
    settingsLanguageTitle: "Language",
    settingsAppearanceTitle: "Appearance",
    settingsAppearanceHint: "Choose the extension color theme. Dark keeps the current appearance.",
    settingsThemeLabel: "Color theme",
    settingsThemeDark: "Dark",
    settingsThemeLight: "Light",
    gmailOptionalIntegration: "Optional integration",
    gmailSettingsTitle: "Gmail notifier",
    gmailSettingsHint: "Connect one or more accounts to read messages, track unread mail, and take action without leaving Tab Out.",
    gmailPrivacyTitle: "Private by design",
    gmailPrivacyHint: "Mail and OAuth tokens stay in this browser profile and are sent only to Google.",
    gmailMaskAccountsTitle: "Mask email account addresses",
    gmailMaskAccountsHint: "Cover connected addresses with a black privacy bar in the dashboard, Settings, and extension popup.",
    gmailSetupHelpOpen: "Show the Gmail setup procedure",
    gmailSharedClientTitle: "Shared OAuth client",
    gmailSharedClientHint: "Use one Google Desktop OAuth client for any number of Gmail accounts.",
    gmailDedicatedClientTitle: "Dedicated OAuth client",
    gmailDedicatedClientHint: "These credentials are assigned only to the Gmail account selected at Google.",
    gmailClientIdLabel: "Client ID",
    gmailClientSecretLabel: "Client secret",
    gmailClientSecretPlaceholder: "Enter the client secret",
    gmailClientSecretSavedPlaceholder: "Secret saved · enter a value to replace it",
    gmailClientSecretHint: "The saved secret is never displayed again. Leave this empty to keep it.",
    gmailClientSecretRequiredHint: "The Google Desktop client ID and client secret are required.",
    gmailDedicatedSecretKeepHint: "Leave the secret empty to keep the current dedicated client.",
    gmailSaveSharedClient: "Save shared client",
    gmailRemoveSharedClient: "Remove shared client",
    gmailAddWithShared: "Add using shared client",
    gmailAddWithDedicated: "Add using its own client",
    gmailConnectDedicated: "Connect with this client",
    gmailClientConfigured: "Configured",
    gmailClientNotConfigured: "Not configured",
    gmailSharedClientBadge: "Shared client",
    gmailDedicatedClientBadge: "Dedicated client",
    gmailReplaceDedicatedClient: "Replace client",
    gmailUseDedicatedClient: "Use dedicated client",
    gmailUseSharedClient: "Use shared client",
    gmailReplaceAndReconnect: "Replace and reconnect",
    gmailSharedClientRequired: "Configure the shared OAuth client first, or use the dedicated-client option.",
    gmailClientValidationError: "Enter a valid Google client ID and its corresponding client secret.",
    gmailClientSaving: "Saving the OAuth client…",
    gmailClientSaved: "OAuth configuration saved.",
    gmailClientSaveFailed: "Could not save the OAuth configuration.",
    gmailClientRemoved: "Shared OAuth client removed.",
    gmailReplaceSharedConfirm: "Replacing this client will disconnect {count} account(s) using the shared client. They must be reconnected. Continue?",
    gmailRemoveSharedConfirm: "Removing this client will disconnect {count} account(s) using the shared client. Continue?",
    gmailSetupHelpEyebrow: "Google Cloud setup",
    gmailSetupHelpTitle: "Connect Gmail to Tab Out",
    gmailSetupHelpIntro: "Initial setup: complete steps 1 through 7 in order. Keep this window open; every button opens the exact Google Cloud page you need in a new tab.",
    gmailSetupPrerequisiteTitle: "Before you begin",
    gmailSetupPrerequisiteHint: "Use the Google account that will manage the Cloud project. You must be able to create or edit a Google Cloud project and access every Gmail address you want to connect.",
    gmailSetupProjectTitle: "Create or select the Google Cloud project",
    gmailSetupProjectOpen: "Open the project selector. Check the project name shown in the top bar: every following step must be completed in this same project.",
    gmailSetupProjectCreate: "If needed, click “NEW PROJECT”, enter a name such as “Personal Tab Out”, then click “CREATE”.",
    gmailSetupProjectSelect: "Select that project and wait until its name appears at the top of the Console before continuing.",
    gmailSetupLinkProject: "Open the project selector",
    gmailSetupApiTitle: "Enable the Gmail API",
    gmailSetupApiOpen: "Open the “Gmail API” page and confirm that the correct project is still selected at the top.",
    gmailSetupApiEnable: "Click “ENABLE”. If the button says “MANAGE”, the Gmail API is already enabled.",
    gmailSetupLinkApi: "Open the Gmail API page",
    gmailSetupBrandingTitle: "Initialize Google Auth Platform",
    gmailSetupBrandingOpen: "Open “Google Auth Platform → Branding”. If you see “Google Auth Platform not configured yet”, click “GET STARTED”.",
    gmailSetupBrandingInfo: "Under “App Information”, enter an “App name” such as “Personal Tab Out” and choose a “User support email”, then click “NEXT”.",
    gmailSetupBrandingAudience: "Under “Audience”, choose “External” for personal Gmail accounts. “Internal” works only for accounts in the same eligible Google Workspace organization.",
    gmailSetupBrandingContact: "Under “Contact Information”, enter your email. Under “Finish”, accept the Google API Services User Data Policy, then click “CONTINUE” and “CREATE”.",
    gmailSetupLinkAuth: "Open Google Auth Platform",
    gmailSetupAudienceTitle: "Authorize the Gmail test accounts",
    gmailSetupAudienceOpen: "Open “Google Auth Platform → Audience” and confirm that “Publishing status” is “Testing” if the app remains private.",
    gmailSetupAudienceUsers: "If the type is “External” and the status is “Testing”, open “Test users”, click “ADD USERS”, add every Gmail address to connect, then click “SAVE”.",
    gmailSetupAudienceImportant: "In this mode, an address missing from “Test users” cannot authorize access. For multiple accounts, add every address here before connecting them in Tab Out.",
    gmailSetupAudienceExpiry: "In “Testing”, Google limits offline authorization to 7 days, so periodic reconnection is expected. Publishing with the restricted Gmail scope can require Google verification.",
    gmailSetupLinkAudience: "Open the Audience page",
    gmailSetupScopeTitle: "Declare the Gmail permission Tab Out uses",
    gmailSetupScopeOpen: "Open “Google Auth Platform → Data Access”, then click “ADD OR REMOVE SCOPES”.",
    gmailSetupScopeAdd: "Search for the exact URL below. If it is not listed, use “Manually add scopes” and paste it without changing it.",
    gmailSetupScopeConfirm: "Select the “gmail.modify” row, click “UPDATE”, then click “SAVE” if that button is shown on the main page.",
    gmailSetupScopeReason: "Tab Out uses this scope to read messages and support read/unread, star, archive, and trash actions. It does not allow permanent deletion that bypasses Trash.",
    gmailSetupLinkScopes: "Open the Data Access page",
    gmailSetupClientTitle: "Create the Desktop OAuth client",
    gmailSetupClientOpen: "Open “Google Auth Platform → Clients”, then click “CREATE CLIENT”.",
    gmailSetupClientType: "Under “Application type”, select exactly “Desktop app”. Do not choose “Web application” or “Chrome extension”.",
    gmailSetupClientName: "Under “Name”, enter a recognizable name such as “Tab Out - Brave”, then click “CREATE”.",
    gmailSetupClientCopy: "In the result dialog, immediately copy “Client ID” and “Client secret”. Since 2025, Google might not display the complete secret again; also use “DOWNLOAD JSON” as a backup when available.",
    gmailSetupClientRedirect: "Do not create an API key, JavaScript origin, or redirect URI. The Desktop client accepts the local 127.0.0.1 redirect that Tab Out configures automatically with PKCE.",
    gmailSetupLinkClients: "Open the Clients page",
    gmailSetupTabOutTitle: "Save the client in Tab Out",
    gmailSetupTabOutOpen: "Return to Tab Out, open “Settings → General”, and scroll to “Gmail notifier” at the very bottom.",
    gmailSetupTabOutPaste: "Under “Shared OAuth client”, paste the “Client ID” and “Client secret” from the same Desktop client, then click “Save shared client”.",
    gmailSetupTabOutConfigured: "Wait until the status says “Configured”, then click “Add with shared client”.",
    gmailSetupTabOutConsent: "In the Google window, choose the intended Gmail address and approve access. If Google shows an unverified-app warning, continue only when you recognize your own project and the address is listed under “Test users”.",
    gmailSetupTabOutConfirm: "When complete, the Google window closes and a card with the exact account address appears in Settings and in the dashboard Gmail widget.",
    gmailSetupMultipleTitle: "Add multiple Gmail accounts",
    gmailSetupMultipleIntro: "You normally do not need another project, API activation, or client: the “Shared OAuth client” can connect multiple accounts.",
    gmailSetupMultipleUsers: "While in “Testing”, first return to “Google Auth Platform → Audience → Test users” and add every new Gmail address.",
    gmailSetupMultipleRepeat: "In “Settings → General → Gmail notifier”, click “Add with shared client” again for each additional account.",
    gmailSetupMultipleChooser: "In Google’s account chooser, select the new account. If it is not shown, click “Use another account” and sign in with that address.",
    gmailSetupMultipleResult: "Repeat once per account. Every address gets its own card, unread count, visibility, filters, and notification preferences.",
    gmailSetupMultipleDedicated: "Use “Add with its own client” only when you want to isolate an account behind another Desktop OAuth client. Keep that client’s Client ID / Client secret pair separate.",
    gmailSetupImportantTitle: "Important",
    gmailSetupImportantHint: "The “Client ID” and “Client secret” must come from the same “Desktop app” client. These credentials stay in this browser profile’s local storage.",
    gmailSetupTroubleshootingTitle: "Quick checks when connection fails",
    gmailSetupTroubleshootingAccess: "“Access blocked” or rejected account: check “Audience”, External/Internal, and the exact address under “Test users”.",
    gmailSetupTroubleshootingClient: "“invalid_client”: if the secret was lost, create a new “Desktop app” client and copy the ID and secret from that same creation.",
    gmailSetupTroubleshootingApi: "Gmail API error: confirm Gmail API is enabled in the same project that contains the OAuth client.",
    gmailSetupTroubleshootingExpiry: "Reconnect requested after 7 days: this is expected for an External project kept in “Testing”.",
    gmailSetupOfficialAudience: "Official guide: Audience and test users",
    gmailSetupOfficialScopes: "Official guide: Data Access and scopes",
    gmailSetupOfficialClients: "Official guide: OAuth clients",
    gmailSetupOfficialGmailScopes: "Official guide: Gmail scopes",
    gmailSetupOfficialLinks: "Official Google documentation",
    gmailConnectedAccount: "Connected account",
    gmailConnect: "Connect Gmail",
    gmailAddAccount: "Add Gmail account",
    gmailConnecting: "Connecting…",
    gmailCancelConnection: "Cancel connection",
    gmailReconnect: "Reconnect Gmail",
    gmailDisconnect: "Disconnect",
    gmailDisconnectConfirm: "Disconnect Gmail, revoke Google authorization, and clear this account’s local data?",
    gmailConnected: "Gmail is connected.",
    gmailDisconnected: "Gmail is disconnected.",
    gmailConnectFailed: "Could not connect Gmail.",
    gmailDisconnectFailed: "Could not completely disconnect Gmail.",
    gmailFilters: "Messages to display",
    gmailFilterInbox: "Inbox",
    gmailFilterUnread: "Unread",
    gmailFilterStarred: "Starred",
    gmailFilterImportant: "Important",
    gmailAdvancedQuery: "Advanced Gmail query",
    gmailAdvancedQueryPlaceholder: "from:example.com newer_than:7d",
    gmailAdvancedQueryHint: "Appended to the selected filters using Gmail search syntax.",
    gmailResultLimit: "Conversation limit",
    gmailPollingEnabled: "Automatically check for new mail",
    gmailShowAccount: "Show this account on the dashboard",
    gmailPollingInterval: "Check frequency",
    gmailPolling1: "Every minute",
    gmailPolling5: "Every 5 minutes",
    gmailPolling15: "Every 15 minutes",
    gmailPolling30: "Every 30 minutes",
    gmailNotificationsEnabled: "Show system notifications",
    gmailNotificationPreview: "Notification content",
    gmailPreviewPrivate: "Private — new mail only",
    gmailPreviewSenderSubject: "Sender and subject",
    gmailPreviewFull: "Full preview",
    gmailBadgeMode: "Toolbar badge",
    gmailBadgeOpenTabs: "Open tabs",
    gmailBadgeUnread: "Gmail unread",
    gmailBadgeCombined: "Combined total",
    gmailBadgeHidden: "Hidden",
    gmailServiceConfigurationTitle: "OAuth client required",
    gmailServiceUnavailableTitle: "Gmail authorization unavailable",
    gmailServiceCheckingTitle: "Checking local OAuth",
    gmailServiceChecking: "Checking the OAuth configuration saved in this browser profile.",
    gmailStatusConnected: "Connected",
    gmailStatusConnecting: "Connecting…",
    gmailStatusDisconnecting: "Disconnecting…",
    gmailStatusDisconnected: "Disabled",
    gmailStatusReconnectRequired: "Reconnect required",
    gmailStatusUnavailable: "OAuth configuration required",
    gmailStatusError: "Error",
    settingsSuspendedTabsTitle: "Suspended tabs",
    settingsSuspendedTabsHint: "Use the original title and URL for tabs suspended by The Marvellous Suspender.",
    settingsRightClickCopyTitle: "Right-click link copying",
    settingsRightClickCopyHint: "Right-click a tab in Tab Out to copy its URL.",
    settingsUnassignedTabDragTitle: "Drag unassigned tabs",
    settingsUnassignedTabDragHint: "Drag an unassigned tab onto a session or another tab.",
    settingsSessionReorderTitle: "Reorder sessions",
    settingsSessionReorderHint: "Drag saved sessions to change their order.",
    settingsExpandSessionTabsTitle: "Expand session tabs",
    settingsExpandSessionTabsHint: "Show the complete saved tab list directly inside each session card.",
    settingsDragSessionTabsTitle: "Drag saved session tabs",
    settingsDragSessionTabsHint: "Move a saved tab to another session or back to Unassigned tabs.",
    settingsLanguageHint: "Language remains available here when its dashboard button is hidden.",
    settingsResetTitle: "Reset dashboard",
    settingsResetHint: "Restore the Original layout and default keyboard shortcuts.",
    settingsReset: "Reset",
    restoreDefaults: "Restore defaults",
    close: "Close",
    language: "Language",
    moduleGreeting: "Greeting",
    moduleTime: "Time",
    moduleDate: "Date",
    moduleWeather: "Weather",
    moduleShortcuts: "Website shortcuts",
    moduleLanguage: "Language",
    moduleSessions: "Sessions",
    moduleUnassigned: "Unassigned tabs",
    moduleSavedLater: "Saved for later",
    moduleGmail: "Gmail",
    moduleStats: "Tab statistics",
    moduleVisible: "Show",
    moduleView: "View",
    moveLeft: "Move left",
    moveRight: "Move right",
    moveUp: "Move up",
    moveDown: "Move down",
    makeNarrower: "Make narrower",
    makeWider: "Make wider",
    resizeModule: "Resize",
    moduleColumns: "{count} col.",
    resizeStatus: "{module}: {count} columns",
    placementFloating: "Floating · {position}",
    placementGrid: "{region} · column {column} · width {width}",
    previewDesktop: "Desktop",
    previewTablet: "Tablet",
    previewMobile: "Mobile",
    dockTopLeft: "Top left",
    dockTopRight: "Top right",
    dockBottomLeft: "Bottom left",
    dockBottomRight: "Bottom right",
    styleTiles: "Tiles",
    styleCompact: "Compact",
    styleCards: "Cards",
    styleList: "List",
    styleDomainGrid: "Domain grid",
    styleCompactList: "Compact list",
    stylePanel: "Panel",
    unassignedDisplayOptions: "Unassigned tabs display",
    unassignedDensity: "Density",
    densityComfortable: "Comfortable",
    densityCompact: "Compact",
    unassignedColumns: "Columns",
    columnsResponsive: "Responsive multiple",
    columnsSingle: "Single column",
    unassignedMinColumnWidth: "Minimum width",
    unassignedVisibleTabs: "Visible titles",
    visibleTabsTwo: "2 titles",
    visibleTabsFour: "4 titles",
    visibleTabsAll: "All titles",
    presetOriginal: "Original",
    presetOriginalHint: "The exact historical Tab Out layout.",
    presetFocus: "Focus",
    presetFocusHint: "Only time, date, sessions, and tabs.",
    presetCompact: "Compact",
    presetCompactHint: "Every module in a denser presentation.",
    presetCustom: "Custom",
    keyboardOpenSettings: "Open Settings",
    keyboardSearchUnassigned: "Search unassigned tabs",
    keyboardFocusShortcuts: "Focus website shortcuts",
    keyboardFocusSessions: "Focus Sessions",
    keyboardFocusUnassigned: "Focus unassigned tabs",
    keyboardFocusSavedLater: "Focus Saved for later",
    keyboardCreateSession: "Create a session",
    keyboardAddShortcut: "Add a website shortcut",
    keyboardOpenPopup: "Open the extension popup",
    keyboardRecord: "Set",
    keyboardPressKeys: "Press a combination…",
    keyboardUnassigned: "Unassigned",
    keyboardClear: "Clear",
    keyboardManage: "Manage",
    keyboardManagedByBrowser: "This shortcut is managed by the browser.",
    keyboardManagerOpenFailed: "Could not open the browser shortcut settings.",
    keyboardConflict: "This combination is already used by “{action}”.",
    keyboardReserved: "This combination is reserved by the browser.",
    keyboardStructural: "This key is reserved for navigation.",
    settingsSaved: "Settings saved.",
    settingsSaveFailed: "Could not save settings.",
    settingsModuleHidden: "Enable “{module}” in Settings to use this command.",
    settingsExternalChange: "Settings changed in another Tab Out page.",
    settingsUnsaved: "Unsaved changes",
    moduleTodo: "TODO list",
    todoWidgetTitle: "TODO list",
    todoWidgetHint: "Keep the next actions visible and local.",
    todoAddTask: "Add task",
    todoUndo: "Undo",
    todoTaskTitleLabel: "Task title",
    todoTaskTitlePlaceholder: "What needs to be done?",
    todoMoreDetails: "More details",
    todoNotesLabel: "Notes",
    todoNotesPlaceholder: "Add a comment or useful contextâ€¦",
    todoTaskAppearanceTitle: "Task appearance",
    todoTaskAppearanceHint: "Add an optional visual marker without changing deadline priority.",
    todoTaskColorLabel: "Color",
    todoTaskColorNone: "No color",
    todoTaskColorCustom: "Custom color",
    todoTaskColorRed: "Red",
    todoTaskColorOrange: "Orange",
    todoTaskColorYellow: "Yellow",
    todoTaskColorGreen: "Green",
    todoTaskColorBlue: "Blue",
    todoTaskColorPurple: "Purple",
    todoTaskColorPink: "Pink",
    todoTaskColorSlate: "Slate gray",
    todoTaskIconLabel: "Icon",
    todoTaskIconNone: "No icon",
    todoTaskIconWork: "Work",
    todoTaskIconPersonal: "Personal",
    todoTaskIconEmail: "Email",
    todoTaskIconCall: "Call",
    todoTaskIconShopping: "Shopping",
    todoTaskIconWarning: "Warning",
    todoTaskIconStar: "Star",
    todoDeadlineDateLabel: "Deadline date",
    todoDeadlineTimeLabel: "Optional time",
    todoChecklistLabel: "Checklist",
    todoChecklistPlaceholder: "Add a stepâ€¦",
    todoAddChecklistItem: "Add",
    todoChecklistItemLabel: "Checklist item",
    todoRemoveChecklistItem: "Remove this checklist item",
    todoSaveTask: "Save task",
    todoSaveChanges: "Save changes",
    todoEmptyTitle: "Nothing to do yet.",
    todoEmptyHint: "Add a task and keep the next step within reach.",
    todoTaskCount: "{count} task",
    todoTasksCount: "{count} tasks",
    todoDeadlineOverdue: "Overdue",
    todoDeadlineToday: "Due today",
    todoDeadlineSoon: "Due soon",
    todoDeadlineFuture: "Future",
    todoToggleComplete: "Mark task as completed",
    todoEditTask: "Edit task",
    todoReorderTask: "Drag to reorder. Use the Up and Down arrow keys with the keyboard.",
    todoExpandTask: "Expand task content",
    todoCollapseTask: "Collapse task content",
    todoArchiveTask: "Archive task",
    todoRestoreTask: "Restore task",
    todoDeleteTask: "Delete task",
    todoCreatedDate: "Created {date}",
    todoCompletedDate: "Done {date}",
    todoTitleRequired: "A task title is required.",
    todoSaveFailed: "Could not save the TODO change.",
    todoTaskAdded: "Task added.",
    todoTaskUpdated: "Task updated.",
    todoTaskCompleted: "Task completed.",
    todoTaskReopened: "Task reopened.",
    todoTaskArchived: "Task archived.",
    todoTaskRestored: "Task restored.",
    todoTaskDeleted: "Task deleted.",
    todoTasksReordered: "Task order saved.",
    todoNothingToUndo: "There is no TODO change to undo.",
    todoUndoSuccess: "TODO change undone.",
    todoUndoConflict: "That change can no longer be undone after an external update.",
    todoUndoFailed: "Could not undo the TODO change.",
    todoUndoAdd: "task addition",
    todoUndoEdit: "task edit",
    todoUndoChecklist: "checklist change",
    todoUndoComplete: "task completion",
    todoUndoReopen: "task reopening",
    todoUndoArchive: "task archive",
    todoUndoRestore: "task restoration",
    todoUndoDelete: "task deletion",
    todoUndoReorder: "task reordering",
    todoUndoChange: "latest change",
    todoOptionalWidget: "Optional local widget",
    todoSettingsTitle: "TODO list",
    todoSettingsHint: "Configure what happens when tasks are completed and how deadlines communicate urgency.",
    todoLocalOnlyTitle: "Stored locally",
    todoLocalOnlyHint: "Tasks and undo history stay in this browser profile.",
    todoEmailIntegrationTitle: "Turn emails into tasks",
    todoEmailIntegrationHint: "Add a quick action to Gmail conversations for creating a linked task. Existing linked tasks remain available when this is disabled.",
    todoEmailCompletionActionLabel: "When a linked email task is completed",
    todoEmailCompletionKeep: "Keep the email unchanged",
    todoEmailCompletionMarkRead: "Mark the email as read",
    todoEmailCompletionArchive: "Archive the email",
    todoEmailCompletionHint: "This applies only when completing the task. Reopening it does not reverse the Gmail action.",
    todoAddEmailTask: "Add this email to TODO",
    todoViewEmailTask: "View linked task",
    todoEmailTaskComposerTitle: "Create a task from this email",
    todoEmailTaskTitleLabel: "Task title",
    todoEmailTaskCommentLabel: "Optional comment",
    todoEmailTaskCommentPlaceholder: "Add context or the next action…",
    todoEmailTaskDeadlineLabel: "Optional deadline",
    todoEmailTaskDeadlineTimeLabel: "Optional time",
    todoEmailTaskAdd: "Add to TODO",
    todoEmailTaskAdded: "Email added to the TODO list.",
    todoEmailTaskAlreadyExists: "This email is already linked to a task.",
    todoEmailTaskAddFailed: "Could not create the linked email task.",
    todoEmailTaskView: "View task",
    todoEmailTaskOpen: "Open email",
    todoEmailTaskShow: "Show in widget",
    todoEmailTaskOpenExternal: "Open in Gmail ↗",
    todoEmailTaskSourceLabel: "Linked Gmail conversation",
    todoEmailTaskUnavailable: "This Gmail conversation could not be opened.",
    todoEmailTaskWidgetHidden: "The task exists, but the TODO widget is hidden from the layout.",
    todoEmailTaskShowWidgetHidden: "The Gmail widget is hidden from the layout. Enable it again in Settings → Layout.",
    todoEmailTaskShowAccountHidden: "This Gmail account is hidden. Show it again in Settings → General.",
    todoEmailTaskShowDisconnected: "This Gmail account is no longer connected.",
    todoEmailTaskShowReconnect: "Reconnect this Gmail account before displaying the conversation.",
    todoEmailTaskShowFailed: "This conversation could not be displayed in the Gmail widget.",
    todoEmailActionFailed: "The task was completed, but the Gmail action could not be applied.",
    todoCompletionActionLabel: "When a task is completed",
    todoCompletionArchive: "Archive automatically",
    todoCompletionKeep: "Keep completed until manually archived",
    todoCompletionDelete: "Delete automatically",
    todoShowFullTitlesTitle: "Show complete task titles",
    todoShowFullTitlesHint: "Allow long titles to wrap onto multiple lines instead of shortening them.",
    todoDeadlineColorsTitle: "Deadline priority colors",
    todoDeadlineColorsHint: "Show overdue, today, soon, and future deadlines with distinct accents.",
    todoDueSoonThresholdTitle: "Due soon threshold",
    todoDueSoonThresholdHint: "Deadlines within this many calendar days use the due-soon priority.",
    todoDueSoonDaysValue: "{count} days",
    todoLayoutHint: "Show, move, resize, or hide this widget from the Layout menu.",
    todoResetColors: "Reset colors",
    gmailDisplayOptions: "Gmail readability",
    gmailDisplayPreset: "Preset",
    gmailPresetScan: "Scan",
    gmailPresetBalanced: "Balanced",
    gmailPresetReading: "Reading",
    gmailPresetScanHint: "Compact rows, short snippets, and strongly emphasized unread mail.",
    gmailPresetBalancedHint: "Clearer hierarchy, two-line snippets, and an adaptive reading pane.",
    gmailPresetReadingHint: "Larger text, generous spacing, and a focused reading width.",
    gmailPresetCustomHint: "A custom combination of Gmail display options.",
    gmailResetDisplay: "Reset to Balanced",
    gmailListDensity: "List density",
    gmailDensityCompact: "Compact",
    gmailDensityComfortable: "Comfortable",
    gmailDensitySpacious: "Spacious",
    gmailTextSize: "Text size",
    gmailTextSmall: "Small",
    gmailTextMedium: "Medium",
    gmailTextLarge: "Large",
    gmailSnippetLines: "Snippet lines",
    gmailSnippetHidden: "Hidden",
    gmailSnippetOne: "1 line",
    gmailSnippetTwo: "2 lines",
    gmailSnippetThree: "3 lines",
    gmailUnreadEmphasis: "Unread emphasis",
    gmailUnreadSubtle: "Subtle",
    gmailUnreadStrong: "Strong",
    gmailConversationDisplay: "Conversation display",
    gmailDisplayInline: "Inline",
    gmailDisplaySplit: "Split pane",
    gmailReadingWidth: "Reading width",
    gmailReadingFocused: "Focused",
    gmailReadingNormal: "Normal",
    gmailReadingWide: "Wide",
    gmailMessageSpacing: "Message spacing",
    gmailSpacingCompact: "Compact",
    gmailSpacingComfortable: "Comfortable",
    gmailSpacingSpacious: "Spacious",
    gmailReadingPane: "Gmail reading pane",
    gmailReadingPaneEmptyTitle: "Select an email",
    gmailReadingPaneEmptyHint: "Choose a conversation on the left to read it without leaving the dashboard.",
    gmailNoSubject: "(No subject)",
    gmailExpandMessage: "Expand this earlier message",
    gmailCollapseMessage: "Collapse this earlier message",
    gmailWidgetTitle: "Gmail",
    gmailRefresh: "Refresh Gmail",
    gmailExpandAccount: "Expand this account",
    gmailCollapseAccount: "Collapse this account",
    gmailOpenInbox: "Open Gmail",
    gmailOpenConversation: "Open in Gmail",
    gmailWidgetDisconnected: "Connect Gmail from Settings to display your conversations.",
    gmailWidgetAccountsHidden: "All connected Gmail accounts are hidden. Show an account again in Settings → General.",
    gmailWidgetUnavailable: "Configure a Google Desktop OAuth client in Settings → General to connect Gmail.",
    gmailWidgetLoading: "Loading conversations…",
    gmailWidgetEmpty: "No conversations match these filters.",
    gmailWidgetStale: "Could not refresh. Showing the latest available result.",
    gmailWidgetError: "Could not load Gmail.",
    gmailInvalidQuery: "The advanced Gmail query is not valid.",
    gmailAuthorizationExpired: "Gmail authorization expired. Reconnect the account.",
    gmailPermissionDenied: "The optional Gmail permission was denied.",
    gmailConfigMissing: "Configure a shared or dedicated OAuth client in Settings → General.",
    gmailNetworkError: "The Gmail service is temporarily unavailable.",
    gmailOAuthCancelled: "Gmail connection cancelled.",
    gmailConversationCount: "{count} messages",
    gmailShowLatest: "Read latest message",
    gmailLoadConversation: "Load full conversation",
    gmailHidePreview: "Close preview",
    gmailBodyLoading: "Loading message…",
    gmailConversationLoading: "Loading conversation…",
    gmailNoBody: "No text content is available. Open the conversation in Gmail.",
    gmailLastUpdatedNow: "Just now",
    gmailLastUpdatedMinutes: "{count} min ago",
    gmailShownCount: "{count} shown",
    gmailNeverUpdated: "Not refreshed yet",
    gmailAccountCount: "{count} account(s)",
    gmailUnreadCount: "{count} unread",
    gmailTrashConfirm: "Move this conversation to Trash?",
    gmailActionFailed: "Could not apply this Gmail action.",
    gmailActionComplete: "Gmail action applied.",
    gmailMarkRead: "Mark as read",
    gmailMarkUnread: "Mark as unread",
    gmailStar: "Star",
    gmailUnstar: "Unstar",
    gmailArchive: "Archive",
    gmailTrash: "Move to Trash",
    gmailAccountAlreadyConnected: "This Gmail account is already connected.",
    gmailAccountNotFound: "This Gmail account is no longer connected.",
    gmailServiceUnavailable: "Local Gmail authorization is unavailable.",
    gmailBrowserUnsupported: "This browser could not complete the direct OAuth connection.",
    gmailOAuthCallbackFailed: "Google did not return a usable authorization response.",
    gmailOAuthTimeout: "The Gmail authorization request expired.",
    gmailApiNotEnabled: "Enable the Gmail API in the Google Cloud project associated with this OAuth client.",
    gmailOAuthAuthorizationCodeRejected: "Google rejected the one-time authorization code. Reload Tab Out and start a new connection.",
    gmailOAuthClientInUse: "Connected accounts use this OAuth client. Confirm its replacement to continue.",
    gmailOAuthClientSecretMissing: "Google requires the secret issued with this Desktop OAuth client. Add it to the extension OAuth credentials and reload it.",
    gmailOAuthInvalidClient: "Google rejected the OAuth client ID or client secret. Copy both values from the same active Desktop app client.",
    gmailOAuthInvalidRequest: "Google rejected the OAuth request. Reload the extension and try again.",
    gmailOAuthRedirectMismatch: "Google rejected the local callback address for this OAuth client.",
    gmailOAuthScopeNotGranted: "The required Gmail permission was not granted or configured.",
    gmailOAuthUnauthorizedClient: "This OAuth client is not authorized to use the Desktop application flow.",
    gmailReconnectAccountMismatch: "Select the same Gmail account that you are trying to reconnect.",
    gmailRefreshTokenMissing: "Google did not grant offline access. Revoke the previous grant and try again.",
    gmailOAuthStateMismatch: "The OAuth response could not be verified safely.",
    gmailTokenExchangeFailed: "Google could not exchange the authorization code.",
    gmailNotificationsDenied: "System notifications were denied."
  }
};

let currentLanguage = "fr";

async function getLanguage() {
  const { tabOutLanguage = "fr" } = await chrome.storage.local.get("tabOutLanguage");
  currentLanguage = I18N[tabOutLanguage] ? tabOutLanguage : "fr";
  return currentLanguage;
}

async function setLanguage(language) {
  currentLanguage = I18N[language] ? language : "fr";
  await chrome.storage.local.set({ tabOutLanguage: currentLanguage });
}

function t(key, vars = {}) {
  const pack = I18N[currentLanguage] || I18N.fr;
  let value = pack[key] || I18N.fr[key] || key;

  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });

  return value;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    element.title = t(key);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    element.setAttribute("aria-label", t(key));
  });
}


function activeLocale() {
  return t("locale");
}

function plural(count, singularKey, pluralKey) {
  return t(count === 1 ? singularKey : pluralKey, { count });
}


/* ----------------------------------------------------------------
   CHROME TABS — Direct API Access

   Since this page IS the extension's new tab page, it has full
   access to chrome.tabs and chrome.storage. No middleman needed.
   ---------------------------------------------------------------- */

// All open tabs — populated by fetchOpenTabs()
let openTabs = [];
let unassignedOpenTabs = [];
const UNASSIGNED_REMOVAL_HISTORY_KEY =
  "unassignedTabRemovalHistory";
const UNASSIGNED_REMOVAL_HISTORY_VERSION = 1;
const MAX_UNASSIGNED_REMOVAL_ENTRIES = 20;
let unassignedRemovalHistory = [];
let unassignedRemovalUndoBusy = false;

async function getIncludeSuspendedTabsPreference() {
  try {
    const runtime = globalThis.TabOutDashboardRuntime;

    if (runtime?.ready) {
      await runtime.ready;
      return runtime.getEffectiveSettings()?.behavior?.includeSuspendedTabs !==
        false;
    }

    const settingsApi = globalThis.TabOutDashboardSettings;

    if (!settingsApi) {
      return true;
    }

    const stored = await chrome.storage.local.get(settingsApi.STORAGE_KEY);
    return settingsApi.normalizeSettings(
      stored[settingsApi.STORAGE_KEY]
    ).behavior.includeSuspendedTabs !== false;
  } catch {
    return true;
  }
}

async function queryTabsWithMetadata(query = {}) {
  const [tabs, includeSuspendedTabs] = await Promise.all([
    chrome.tabs.query(query),
    getIncludeSuspendedTabsPreference()
  ]);
  const metadataApi = globalThis.TabOutTabMetadata;

  if (!metadataApi) {
    return tabs;
  }

  return tabs.map((tab) =>
    metadataApi.normalizeBrowserTab(tab, { includeSuspendedTabs })
  );
}

function createUnassignedRemovalId() {
  const randomPart = globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(16).slice(2);
  return `unassigned-removal-${Date.now()}-${randomPart}`;
}

function normalizeUnassignedRemovalTab(value) {
  const url = String(value?.url || "").trim();

  if (!url) {
    return null;
  }

  return {
    sourceTabId: Number.isInteger(value?.sourceTabId)
      ? value.sourceTabId
      : null,
    url: url.slice(0, 16384),
    title: String(value?.title || url).slice(0, 1024),
    windowId: Number.isInteger(value?.windowId)
      ? value.windowId
      : null,
    index: Number.isInteger(value?.index) && value.index >= 0
      ? value.index
      : null,
    pinned: Boolean(value?.pinned)
  };
}

function normalizeUnassignedRemovalEntry(value) {
  const tabs = (Array.isArray(value?.tabs) ? value.tabs : [])
    .map(normalizeUnassignedRemovalTab)
    .filter(Boolean);

  if (tabs.length < 1) {
    return null;
  }

  const fallbackCounts = new Map();
  tabs.forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.url);
    fallbackCounts.set(url, (fallbackCounts.get(url) || 0) + 1);
  });
  const targetCounts = new Map();
  const storedCounts = Array.isArray(value?.targetUrlCounts)
    ? value.targetUrlCounts
    : [];

  storedCounts.forEach((item) => {
    const url = normalizeOpenTabUrl(item?.url);
    const count = Number.parseInt(item?.count, 10);

    if (url && Number.isFinite(count) && count > 0) {
      targetCounts.set(url, Math.min(count, 100000));
    }
  });
  fallbackCounts.forEach((count, url) => {
    if (!targetCounts.has(url)) {
      targetCounts.set(url, count);
    }
  });

  return {
    id: String(value?.id || createUnassignedRemovalId()).slice(0, 200),
    createdAt: Number.isFinite(Date.parse(value?.createdAt))
      ? new Date(value.createdAt).toISOString()
      : new Date().toISOString(),
    kind: ["single", "domain", "duplicates", "all"].includes(value?.kind)
      ? value.kind
      : "single",
    tabs,
    targetUrlCounts: Array.from(targetCounts, ([url, count]) => ({
      url,
      count
    }))
  };
}

function normalizeUnassignedRemovalHistory(value) {
  const entries = Array.isArray(value)
    ? value
    : Array.isArray(value?.entries)
      ? value.entries
      : [];

  return entries
    .map(normalizeUnassignedRemovalEntry)
    .filter(Boolean)
    .slice(-MAX_UNASSIGNED_REMOVAL_ENTRIES);
}

function updateUnassignedRemovalUndoControl() {
  const button = document.querySelector(
    '[data-action="undo-unassigned-removal"]'
  );

  if (!button) {
    return;
  }

  const count = unassignedRemovalHistory.length;
  const title = count > 0
    ? t("unassignedUndoRemovalTitle", { count })
    : t("unassignedUndoRemovalEmpty");
  const countBadge = button.querySelector(".open-tabs-undo-count");

  button.disabled = unassignedRemovalUndoBusy || count < 1;
  button.title = title;
  button.setAttribute("aria-label", title);

  if (countBadge) {
    countBadge.textContent = String(count);
    countBadge.hidden = count <= 1;
  }
}

async function loadUnassignedRemovalHistory({ required = false } = {}) {
  try {
    const stored = await chrome.storage.local.get(
      UNASSIGNED_REMOVAL_HISTORY_KEY
    );
    unassignedRemovalHistory = normalizeUnassignedRemovalHistory(
      stored[UNASSIGNED_REMOVAL_HISTORY_KEY]
    );
  } catch (error) {
    console.warn(
      "[tab-out] Could not load unassigned removal history:",
      error
    );

    if (required) {
      throw error;
    }
  }

  updateUnassignedRemovalUndoControl();
  return unassignedRemovalHistory;
}

async function writeUnassignedRemovalHistory(entries) {
  const previousHistory = unassignedRemovalHistory;
  const nextHistory = normalizeUnassignedRemovalHistory(entries);

  try {
    await chrome.storage.local.set({
      [UNASSIGNED_REMOVAL_HISTORY_KEY]: {
        version: UNASSIGNED_REMOVAL_HISTORY_VERSION,
        entries: nextHistory
      }
    });
    unassignedRemovalHistory = nextHistory;
  } catch (error) {
    unassignedRemovalHistory = previousHistory;
    updateUnassignedRemovalUndoControl();
    throw error;
  }

  updateUnassignedRemovalUndoControl();
  return unassignedRemovalHistory;
}

async function appendUnassignedRemovalEntry(entry) {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  await writeUnassignedRemovalHistory([...history, entry]);
  return entry;
}

async function replaceUnassignedRemovalEntry(entry) {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  const index = history.findIndex((item) => item.id === entry.id);

  if (index < 0) {
    return false;
  }

  history[index] = entry;
  await writeUnassignedRemovalHistory(history);
  return true;
}

async function removeUnassignedRemovalEntry(entryId) {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  const nextHistory = history.filter((entry) => entry.id !== entryId);

  if (nextHistory.length === history.length) {
    return false;
  }

  await writeUnassignedRemovalHistory(nextHistory);
  return true;
}

function createUnassignedRemovalEntry(kind, selectedTabs, allTabs) {
  const selected = selectedTabs
    .map((tab) => normalizeUnassignedRemovalTab({
      sourceTabId: tab.id,
      url: tab.pendingUrl || tab.url,
      title: tab.title,
      windowId: tab.windowId,
      index: tab.index,
      pinned: tab.pinned
    }))
    .filter(Boolean);
  const selectedUrls = new Set(
    selected.map((tab) => normalizeOpenTabUrl(tab.url))
  );
  const targetCounts = new Map();

  allTabs.forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.pendingUrl || tab.url);

    if (selectedUrls.has(url)) {
      targetCounts.set(url, (targetCounts.get(url) || 0) + 1);
    }
  });

  return normalizeUnassignedRemovalEntry({
    id: createUnassignedRemovalId(),
    createdAt: new Date().toISOString(),
    kind,
    tabs: selected,
    targetUrlCounts: Array.from(targetCounts, ([url, count]) => ({
      url,
      count
    }))
  });
}

async function closeUnassignedTabsWithUndo(tabIds, kind) {
  const requestedIds = new Set(
    (tabIds || []).filter(Number.isInteger)
  );

  if (requestedIds.size < 1) {
    return null;
  }

  const allTabs = await queryTabsWithMetadata({});
  const selectedTabs = allTabs.filter((tab) =>
    requestedIds.has(tab.id)
  );
  const entry = createUnassignedRemovalEntry(
    kind,
    selectedTabs,
    allTabs
  );

  if (!entry) {
    return null;
  }

  await appendUnassignedRemovalEntry(entry);
  let removalError = null;

  try {
    await chrome.tabs.remove(
      selectedTabs.map((tab) => tab.id)
    );
  } catch (error) {
    removalError = error;
  }

  let removedTabs = entry.tabs;

  try {
    const remainingTabs = await chrome.tabs.query({});
    const remainingIds = new Set(
      remainingTabs.map((tab) => tab.id)
    );
    removedTabs = entry.tabs.filter(
      (tab) => !remainingIds.has(tab.sourceTabId)
    );
  } catch (error) {
    console.warn(
      "[tab-out] Could not reconcile removed unassigned tabs:",
      error
    );
  }

  if (removedTabs.length < 1) {
    await removeUnassignedRemovalEntry(entry.id);

    if (removalError) {
      throw removalError;
    }

    return null;
  }

  if (removedTabs.length !== entry.tabs.length) {
    entry.tabs = removedTabs;
    await replaceUnassignedRemovalEntry(entry);
  }

  if (removalError) {
    console.warn(
      "[tab-out] Some unassigned tabs could not be closed:",
      removalError
    );
  }

  await fetchOpenTabs();
  return {
    entry,
    closedTabs: removedTabs,
    error: removalError
  };
}

function countTabsByNormalizedUrl(tabs) {
  const counts = new Map();

  (tabs || []).forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.pendingUrl || tab.url);

    if (url) {
      counts.set(url, (counts.get(url) || 0) + 1);
    }
  });

  return counts;
}

async function restoreLatestUnassignedRemoval() {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  const entry = history[history.length - 1];

  if (!entry) {
    return {
      restored: 0,
      failed: 0,
      alreadyPresent: 0,
      empty: true
    };
  }

  const currentTabs = await queryTabsWithMetadata({});
  const currentCounts = countTabsByNormalizedUrl(currentTabs);
  const targetCounts = new Map(
    entry.targetUrlCounts.map((item) => [
      normalizeOpenTabUrl(item.url),
      item.count
    ])
  );
  const descriptorsByUrl = new Map();

  entry.tabs.forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.url);

    if (!descriptorsByUrl.has(url)) {
      descriptorsByUrl.set(url, []);
    }

    descriptorsByUrl.get(url).push(tab);
  });

  const tabsToRestore = [];
  let alreadyPresent = 0;

  descriptorsByUrl.forEach((descriptors, url) => {
    const targetCount = targetCounts.get(url) || descriptors.length;
    const currentCount = currentCounts.get(url) || 0;
    const missingCount = Math.max(
      0,
      Math.min(descriptors.length, targetCount - currentCount)
    );

    tabsToRestore.push(...descriptors.slice(0, missingCount));
    alreadyPresent += descriptors.length - missingCount;
  });

  tabsToRestore.sort((first, second) => {
    const firstWindow = first.windowId ?? Number.MAX_SAFE_INTEGER;
    const secondWindow = second.windowId ?? Number.MAX_SAFE_INTEGER;

    if (firstWindow !== secondWindow) {
      return firstWindow - secondWindow;
    }

    return (first.index ?? Number.MAX_SAFE_INTEGER) -
      (second.index ?? Number.MAX_SAFE_INTEGER);
  });

  const [windows, currentWindow] = await Promise.all([
    chrome.windows.getAll({ windowTypes: ["normal"] }),
    chrome.windows.getCurrent()
  ]);
  const availableWindowIds = new Set(
    windows.map((window) => window.id)
  );
  let restored = 0;
  let failed = 0;
  const failedTabs = [];

  for (const tab of tabsToRestore) {
    const hasOriginalWindow = availableWindowIds.has(tab.windowId);
    const createProperties = {
      url: tab.url,
      active: false,
      pinned: tab.pinned,
      windowId: hasOriginalWindow
        ? tab.windowId
        : currentWindow.id
    };

    if (hasOriginalWindow && Number.isInteger(tab.index)) {
      createProperties.index = tab.index;
    }

    try {
      await chrome.tabs.create(createProperties);
      restored += 1;
    } catch (error) {
      failed += 1;
      failedTabs.push(tab);
      console.warn(
        "[tab-out] Could not restore an unassigned tab:",
        tab.url,
        error
      );
    }
  }

  if (failed < 1) {
    await removeUnassignedRemovalEntry(entry.id);
  } else {
    entry.tabs = failedTabs;
    await replaceUnassignedRemovalEntry(entry);
  }

  await fetchOpenTabs();
  return {
    restored,
    failed,
    alreadyPresent,
    empty: false
  };
}

/**
 * fetchOpenTabs()
 *
 * Reads all currently open browser tabs directly from Chrome.
 * Sets the extensionId flag so we can identify Tab Out's own pages.
 */
async function fetchOpenTabs() {
  try {
    const extensionId = chrome.runtime.id;
    // The new URL for this page is now index.html (not newtab.html)
    const newtabUrl = `chrome-extension://${extensionId}/index.html`;

    const tabs = await queryTabsWithMetadata({});
    openTabs = tabs.map(t => {
      const tabUrl = t.pendingUrl || t.url || "";

      return {
        id:       t.id,
        url:      tabUrl,
        title:    t.title,
        windowId: t.windowId,
        groupId:  t.groupId,
        active:   t.active,
        favIconUrl: t.favIconUrl || "",
        // Flag Tab Out's own pages so we can detect duplicate new tabs
        isTabOut: tabUrl === newtabUrl || tabUrl === 'chrome://newtab/',
      };
    });
  } catch {
    // chrome.tabs API unavailable (shouldn't happen in an extension page)
    openTabs = [];
  }
}

/**
 * closeTabsByUrls(urls)
 *
 * Closes all open tabs whose hostname matches any of the given URLs.
 * After closing, re-fetches the tab list to keep our state accurate.
 *
 * Special case: file:// URLs are matched exactly (they have no hostname).
 */
async function closeTabsByUrls(urls) {
  if (!urls || urls.length === 0) return;

  // Separate file:// URLs (exact match) from regular URLs (hostname match)
  const targetHostnames = [];
  const exactUrls = new Set();

  for (const u of urls) {
    if (u.startsWith('file://')) {
      exactUrls.add(u);
    } else {
      try { targetHostnames.push(new URL(u).hostname); }
      catch { /* skip unparseable */ }
    }
  }

  const allTabs = await queryTabsWithMetadata({});
  const toClose = allTabs
    .filter(tab => {
      const tabUrl = tab.url || '';
      if (tabUrl.startsWith('file://') && exactUrls.has(tabUrl)) return true;
      try {
        const tabHostname = new URL(tabUrl).hostname;
        return tabHostname && targetHostnames.includes(tabHostname);
      } catch { return false; }
    })
    .map(tab => tab.id);

  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

/**
 * closeTabsExact(urls)
 *
 * Closes tabs by exact URL match (not hostname). Used for landing pages
 * so closing "Gmail inbox" doesn't also close individual email threads.
 */
async function closeTabsExact(urls) {
  if (!urls || urls.length === 0) return;
  const urlSet = new Set(urls);
  const allTabs = await queryTabsWithMetadata({});
  const toClose = allTabs.filter(t => urlSet.has(t.url)).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

/**
 * focusTab(url)
 *
 * Switches Chrome to the tab with the given URL (exact match first,
 * then hostname fallback). Also brings the window to the front.
 */
async function focusTab(url) {
  if (!url) return;
  const allTabs = await queryTabsWithMetadata({});
  const currentWindow = await chrome.windows.getCurrent();

  // Try exact URL match first
  let matches = allTabs.filter(t => t.url === url);

  // Fall back to hostname match
  if (matches.length === 0) {
    try {
      const targetHost = new URL(url).hostname;
      matches = allTabs.filter(t => {
        try { return new URL(t.url).hostname === targetHost; }
        catch { return false; }
      });
    } catch {}
  }

  if (matches.length === 0) return;

  // Prefer a match in a different window so it actually switches windows
  const match = matches.find(t => t.windowId !== currentWindow.id) || matches[0];
  await chrome.tabs.update(match.id, { active: true });
  await chrome.windows.update(match.windowId, { focused: true });
}

/**
 * closeDuplicateTabs(urls, keepOne)
 *
 * Closes duplicate tabs for the given list of URLs.
 * keepOne=true → keep one copy of each, close the rest.
 * keepOne=false → close all copies.
 */
async function closeDuplicateTabs(urls, keepOne = true) {
  const allTabs = await queryTabsWithMetadata({});
  const toClose = [];

  for (const url of urls) {
    const matching = allTabs.filter(t => t.url === url);
    if (keepOne) {
      const keep = matching.find(t => t.active) || matching[0];
      for (const tab of matching) {
        if (tab.id !== keep.id) toClose.push(tab.id);
      }
    } else {
      for (const tab of matching) toClose.push(tab.id);
    }
  }

  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

/**
 * closeTabOutDupes()
 *
 * Closes all duplicate Tab Out new-tab pages except the current one.
 */
async function closeTabOutDupes() {
  const extensionId = chrome.runtime.id;
  const newtabUrl = `chrome-extension://${extensionId}/index.html`;

  const allTabs = await queryTabsWithMetadata({});
  const currentWindow = await chrome.windows.getCurrent();
  const tabOutTabs = allTabs.filter(t =>
    t.url === newtabUrl || t.url === 'chrome://newtab/'
  );

  if (tabOutTabs.length <= 1) return;

  // Keep the active Tab Out tab in the CURRENT window — that's the one the
  // user is looking at right now. Falls back to any active one, then the first.
  const keep =
    tabOutTabs.find(t => t.active && t.windowId === currentWindow.id) ||
    tabOutTabs.find(t => t.active) ||
    tabOutTabs[0];
  const toClose = tabOutTabs.filter(t => t.id !== keep.id).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}


/* ----------------------------------------------------------------
   SAVED FOR LATER — chrome.storage.local

   Replaces the old server-side SQLite + REST API with Chrome's
   built-in key-value storage. Data persists across browser sessions
   and doesn't require a running server.

   Data shape stored under the "deferred" key:
   [
     {
       id: "1712345678901",          // timestamp-based unique ID
       url: "https://example.com",
       title: "Example Page",
       savedAt: "2026-04-04T10:00:00.000Z",  // ISO date string
       completed: false,             // true = checked off (archived)
       dismissed: false              // true = dismissed without reading
     },
     ...
   ]
   ---------------------------------------------------------------- */

/**
 * saveTabForLater(tab)
 *
 * Saves a single tab to the "Saved for Later" list in chrome.storage.local.
 * @param {{ url: string, title: string }} tab
 */
async function saveTabForLater(tab) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  deferred.push({
    id:        Date.now().toString(),
    url:       tab.url,
    title:     tab.title,
    savedAt:   new Date().toISOString(),
    completed: false,
    dismissed: false,
  });
  await chrome.storage.local.set({ deferred });
}

/**
 * getSavedTabs()
 *
 * Returns all saved tabs from chrome.storage.local.
 * Filters out dismissed items (those are gone for good).
 * Splits into active (not completed) and archived (completed).
 */
async function getSavedTabs() {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const visible = deferred.filter(t => !t.dismissed);
  return {
    active:   visible.filter(t => !t.completed),
    archived: visible.filter(t => t.completed),
  };
}

/**
 * checkOffSavedTab(id)
 *
 * Marks a saved tab as completed (checked off). It moves to the archive.
 */
async function checkOffSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.completed = true;
    tab.completedAt = new Date().toISOString();
    await chrome.storage.local.set({ deferred });
  }
}

/**
 * dismissSavedTab(id)
 *
 * Marks a saved tab as dismissed (removed from all lists).
 */
async function dismissSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.dismissed = true;
    await chrome.storage.local.set({ deferred });
  }
}

async function restoreArchivedSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(item => item.id === id && item.completed && !item.dismissed);

  if (!tab) {
    return false;
  }

  tab.completed = false;
  delete tab.completedAt;
  await chrome.storage.local.set({ deferred });
  return true;
}

async function deleteArchivedSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const index = deferred.findIndex(
    item => item.id === id && item.completed && !item.dismissed
  );

  if (index === -1) {
    return null;
  }

  const [item] = deferred.splice(index, 1);
  await chrome.storage.local.set({ deferred });
  return { item, index };
}

async function reinsertArchivedSavedTab(item, index) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');

  if (deferred.some(savedTab => savedTab.id === item.id)) {
    return false;
  }

  const insertionIndex = Math.max(0, Math.min(index, deferred.length));
  deferred.splice(insertionIndex, 0, item);
  await chrome.storage.local.set({ deferred });
  return true;
}


/* ----------------------------------------------------------------
   UI HELPERS
   ---------------------------------------------------------------- */

/**
 * playCloseSound()
 *
 * Plays a clean "swoosh" sound when tabs are closed.
 * Built entirely with the Web Audio API — no sound files needed.
 * A filtered noise sweep that descends in pitch, like air moving.
 */
function playCloseSound() {
    return;
  }
/**
 * shootConfetti(x, y)
 *
 * Shoots a burst of colorful confetti particles from the given screen
 * coordinates (typically the center of a card being closed).
 * Pure CSS + JS, no libraries.
 */
function shootConfetti(x, y) {
  const colors = [
    '#c8713a', // amber
    '#e8a070', // amber light
    '#5a7a62', // sage
    '#8aaa92', // sage light
    '#5a6b7a', // slate
    '#8a9baa', // slate light
    '#d4b896', // warm paper
    '#b35a5a', // rose
  ];

  const particleCount = 17;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');

    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6; // 5–11px
    const color = colors[Math.floor(Math.random() * colors.length)];

    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      opacity: 1;
    `;
    document.body.appendChild(el);

    // Physics: random angle and speed for the outward burst
    const angle   = Math.random() * Math.PI * 2;
    const speed   = 60 + Math.random() * 120;
    const vx      = Math.cos(angle) * speed;
    const vy      = Math.sin(angle) * speed - 80; // bias upward
    const gravity = 200;

    const startTime = performance.now();
    const duration  = 700 + Math.random() * 200; // 700–900ms

    function frame(now) {
      const elapsed  = (now - startTime) / 1000;
      const progress = elapsed / (duration / 1000);

      if (progress >= 1) { el.remove(); return; }

      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      const rotate  = elapsed * 200 * (isCircle ? 0 : 1);

      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${rotate}deg)`;
      el.style.opacity = opacity;

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}

/**
 * animateCardOut(card)
 *
 * Smoothly removes a mission card: fade + scale down, then confetti.
 * After the animation, checks if the grid is now empty.
 */
function animateCardOut(card) {
  if (!card) return;

  const rect = card.getBoundingClientRect();
  shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

  card.classList.add('closing');
  setTimeout(() => {
    card.remove();
    checkAndShowEmptyState();
  }, 300);
}

let toastTimeoutId = null;
let toastSequence = 0;

function hideToast(sequence) {
  if (sequence !== undefined && sequence !== toastSequence) {
    return;
  }

  const toast = document.getElementById('toast');
  const actionButton = document.getElementById('toastAction');
  const cancelButton = document.getElementById('toastCancelAction');

  if (!toast) {
    return;
  }

  toast.classList.remove('visible', 'has-action');

  if (actionButton) {
    actionButton.hidden = true;
    actionButton.disabled = false;
    actionButton.onclick = null;
  }

  if (cancelButton) {
    cancelButton.hidden = true;
    cancelButton.disabled = false;
    cancelButton.onclick = null;
  }
}

/**
 * showToast(message, options)
 *
 * Brief pop-up notification at the bottom of the screen.
 */
function showToast(message, options = {}) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  const actionButton = document.getElementById('toastAction');
  const cancelButton = document.getElementById('toastCancelAction');

  if (!toast || !text) {
    return;
  }

  const {
    actionLabel = "",
    onAction = null,
    cancelLabel = "",
    onCancel = null,
    duration = 2500
  } = options;
  const sequence = ++toastSequence;
  const hasAction = Boolean(actionButton && actionLabel && typeof onAction === "function");
  const hasCancel = Boolean(
    cancelButton &&
    cancelLabel &&
    typeof onCancel === "function"
  );

  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }

  text.textContent = message;
  toast.classList.toggle('has-action', hasAction);

  if (actionButton) {
    actionButton.hidden = !hasAction;
    actionButton.disabled = false;
    actionButton.onclick = null;

    if (hasAction) {
      actionButton.textContent = actionLabel;
      actionButton.onclick = async () => {
        if (sequence !== toastSequence) {
          return;
        }

        actionButton.disabled = true;

        try {
          await onAction();
        } catch (error) {
          console.warn('[tab-out] Toast action failed:', error);
        } finally {
          if (sequence === toastSequence) {
            hideToast(sequence);
          }
        }
      };
    }
  }

  if (cancelButton) {
    cancelButton.hidden = !hasCancel;
    cancelButton.disabled = false;
    cancelButton.onclick = null;

    if (hasCancel) {
      cancelButton.textContent = cancelLabel;
      cancelButton.onclick = async () => {
        if (sequence !== toastSequence) {
          return;
        }

        cancelButton.disabled = true;

        try {
          await onCancel();
        } catch (error) {
          console.warn('[tab-out] Toast cancel action failed:', error);
        } finally {
          if (sequence === toastSequence) {
            hideToast(sequence);
          }
        }
      };
    }
  }

  toast.classList.add('visible');
  toastTimeoutId = duration > 0
    ? setTimeout(() => hideToast(sequence), duration)
    : null;
}

document.addEventListener("keydown", (event) => {
  const toast = document.getElementById("toast");
  const cancelButton = document.getElementById("toastCancelAction");

  if (
    event.key === "Escape" &&
    toast?.classList.contains("visible") &&
    cancelButton &&
    !cancelButton.hidden
  ) {
    event.preventDefault();
    cancelButton.click();
  }
});

function copyTextWithExecCommand(text) {
  const previousFocus = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

async function copyTextToClipboard(value) {
  const text = String(value || "");

  if (!text) {
    return false;
  }

  let clipboardRequest = null;

  if (navigator.clipboard?.writeText) {
    try {
      clipboardRequest = navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => false);
    } catch {}
  }

  const fallbackCopied = copyTextWithExecCommand(text);
  return clipboardRequest
    ? (await clipboardRequest) || fallbackCopied
    : fallbackCopied;
}

function isDashboardBehaviorEnabled(behaviorKey) {
  return globalThis.TabOutDashboardRuntime
    ?.getEffectiveSettings()
    ?.behavior
    ?.[behaviorKey] !== false;
}

function isTabLinkRightClickCopyEnabled() {
  return isDashboardBehaviorEnabled("copyTabLinksOnRightClick");
}

document.addEventListener("contextmenu", async (event) => {
  if (!isTabLinkRightClickCopyEnabled()) {
    return;
  }

  const tabElement = event.target.closest?.("[data-tab-url]");
  const tabUrl = tabElement?.dataset.tabUrl || "";

  if (!tabUrl) {
    return;
  }

  event.preventDefault();
  const copied = await copyTextToClipboard(tabUrl);
  showToast(t(copied ? "tabLinkCopied" : "tabLinkCopyFailed"));
});

/**
 * checkAndShowEmptyState()
 *
 * Shows a cheerful "Inbox zero" message when all domain cards are gone.
 */
function checkAndShowEmptyState() {
  const missionsEl = document.getElementById('openTabsMissions');
  if (!missionsEl) return;

  const remaining = missionsEl.querySelectorAll('.mission-card:not(.closing)').length;
  if (remaining > 0) return;

  missionsEl.innerHTML = `
    <div class="missions-empty-state">
      <div class="empty-checkmark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <div class="empty-title">${t("allTabsAssignedTitle")}</div>
      <div class="empty-subtitle">${t("allTabsAssignedSubtitle")}</div>
    </div>
  `;

  const countEl = document.getElementById('openTabsSectionCount');
  const countLabel = document.getElementById("openTabsFilteredCount");

  if (countLabel) {
    countLabel.textContent = `0 ${t("domains")}`;
  } else if (countEl) {
    countEl.innerHTML = renderOpenTabsSearchControls(0);
  }

  const closeAllButton = countEl?.querySelector(
    '[data-action="close-all-open-tabs"]'
  );

  if (closeAllButton) {
    closeAllButton.disabled = true;
  }

  updateUnassignedRemovalUndoControl();
}

/**
 * timeAgo(dateStr)
 *
 * Converts an ISO date string into a human-friendly relative time.
 * "2026-04-04T10:00:00Z" → "2 hrs ago" or "yesterday"
 */
function timeAgo(dateStr) {
  if (!dateStr) return "";

  const then = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now - then) / 60000);
  const diffHours = Math.floor((now - then) / 3600000);
  const diffDays = Math.floor((now - then) / 86400000);

  if (diffMins < 1) return t("justNow");
  if (diffMins < 60) return t("minAgo", { count: diffMins });
  if (diffHours < 24) return t("hourAgo", { count: diffHours });
  if (diffDays === 1) return t("yesterday");

  return t("daysAgo", { count: diffDays });
}

/**
 * getGreeting() — "Good morning / afternoon / evening"
 */
function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return t("greetingMorning");
  }

  if (hour < 18) {
    return t("greetingAfternoon");
  }

  return t("greetingEvening");
}

/**
 * getDateDisplay() — "Friday, April 4, 2026"
 */
function getDateDisplay() {
  const date = new Date().toLocaleDateString(activeLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedDate = date.charAt(0).toUpperCase() + date.slice(1);

  return `${t("datePrefix")} ${formattedDate}`;
}


function updateTimeDisplay() {
  if (
    globalThis.TabOutDashboardRuntime &&
    !globalThis.TabOutDashboardRuntime.isModuleVisible("time")
  ) {
    return;
  }

  const timeEl = document.getElementById("timeDisplay");

  if (!timeEl) {
    return;
  }

  const time = new Date().toLocaleTimeString(activeLocale(), {
    hour: "2-digit",
    minute: "2-digit"
  });

  timeEl.textContent = `${t("timePrefix")} ${time}`;
}

let dashboardTimeInterval = null;

function syncDashboardClockVisibility() {
  const visible =
    !globalThis.TabOutDashboardRuntime ||
    globalThis.TabOutDashboardRuntime.isModuleVisible("time");

  if (!visible && dashboardTimeInterval) {
    clearInterval(dashboardTimeInterval);
    dashboardTimeInterval = null;
    return;
  }

  if (visible && !dashboardTimeInterval) {
    updateTimeDisplay();
    dashboardTimeInterval = setInterval(updateTimeDisplay, 1000);
  }
}

/* ----------------------------------------------------------------
   DOMAIN & TITLE CLEANUP HELPERS
   ---------------------------------------------------------------- */

// Map of known hostnames → friendly display names.
const FRIENDLY_DOMAINS = {
  'github.com':           'GitHub',
  'www.github.com':       'GitHub',
  'gist.github.com':      'GitHub Gist',
  'youtube.com':          'YouTube',
  'www.youtube.com':      'YouTube',
  'music.youtube.com':    'YouTube Music',
  'x.com':                'X',
  'www.x.com':            'X',
  'twitter.com':          'X',
  'www.twitter.com':      'X',
  'reddit.com':           'Reddit',
  'www.reddit.com':       'Reddit',
  'old.reddit.com':       'Reddit',
  'substack.com':         'Substack',
  'www.substack.com':     'Substack',
  'medium.com':           'Medium',
  'www.medium.com':       'Medium',
  'linkedin.com':         'LinkedIn',
  'www.linkedin.com':     'LinkedIn',
  'stackoverflow.com':    'Stack Overflow',
  'www.stackoverflow.com':'Stack Overflow',
  'news.ycombinator.com': 'Hacker News',
  'google.com':           'Google',
  'www.google.com':       'Google',
  'mail.google.com':      'Gmail',
  'docs.google.com':      'Google Docs',
  'drive.google.com':     'Google Drive',
  'calendar.google.com':  'Google Calendar',
  'meet.google.com':      'Google Meet',
  'gemini.google.com':    'Gemini',
  'chatgpt.com':          'ChatGPT',
  'www.chatgpt.com':      'ChatGPT',
  'chat.openai.com':      'ChatGPT',
  'claude.ai':            'Claude',
  'www.claude.ai':        'Claude',
  'code.claude.com':      'Claude Code',
  'notion.so':            'Notion',
  'www.notion.so':        'Notion',
  'figma.com':            'Figma',
  'www.figma.com':        'Figma',
  'slack.com':            'Slack',
  'app.slack.com':        'Slack',
  'discord.com':          'Discord',
  'www.discord.com':      'Discord',
  'wikipedia.org':        'Wikipedia',
  'en.wikipedia.org':     'Wikipedia',
  'amazon.com':           'Amazon',
  'www.amazon.com':       'Amazon',
  'netflix.com':          'Netflix',
  'www.netflix.com':      'Netflix',
  'spotify.com':          'Spotify',
  'open.spotify.com':     'Spotify',
  'vercel.com':           'Vercel',
  'www.vercel.com':       'Vercel',
  'npmjs.com':            'npm',
  'www.npmjs.com':        'npm',
  'developer.mozilla.org':'MDN',
  'arxiv.org':            'arXiv',
  'www.arxiv.org':        'arXiv',
  'huggingface.co':       'Hugging Face',
  'www.huggingface.co':   'Hugging Face',
  'producthunt.com':      'Product Hunt',
  'www.producthunt.com':  'Product Hunt',
  'xiaohongshu.com':      'RedNote',
  'www.xiaohongshu.com':  'RedNote',
  'local-files':          'Local Files',
};

function friendlyDomain(hostname) {
  if (!hostname) return '';
  if (FRIENDLY_DOMAINS[hostname]) return FRIENDLY_DOMAINS[hostname];

  if (hostname.endsWith('.substack.com') && hostname !== 'substack.com') {
    return capitalize(hostname.replace('.substack.com', '')) + "'s Substack";
  }
  if (hostname.endsWith('.github.io')) {
    return capitalize(hostname.replace('.github.io', '')) + ' (GitHub Pages)';
  }

  let clean = hostname
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|ai|dev|app|so|me|xyz|info|us|uk|co\.uk|co\.jp)$/, '');

  return clean.split('.').map(part => capitalize(part)).join(' ');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripTitleNoise(title) {
  if (!title) return '';
  // Strip leading notification count: "(2) Title"
  title = title.replace(/^\(\d+\+?\)\s*/, '');
  // Strip inline counts like "Inbox (16,359)"
  title = title.replace(/\s*\([\d,]+\+?\)\s*/g, ' ');
  // Strip email addresses (privacy + cleaner display)
  title = title.replace(/\s*[\-\u2010-\u2015]\s*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  // Clean X/Twitter format
  title = title.replace(/\s+on X:\s*/, ': ');
  title = title.replace(/\s*\/\s*X\s*$/, '');
  return title.trim();
}

function cleanTitle(title, hostname) {
  if (!title || !hostname) return title || '';

  const friendly = friendlyDomain(hostname);
  const domain   = hostname.replace(/^www\./, '');
  const seps     = [' - ', ' | ', ' — ', ' · ', ' – '];

  for (const sep of seps) {
    const idx = title.lastIndexOf(sep);
    if (idx === -1) continue;
    const suffix     = title.slice(idx + sep.length).trim();
    const suffixLow  = suffix.toLowerCase();
    if (
      suffixLow === domain.toLowerCase() ||
      suffixLow === friendly.toLowerCase() ||
      suffixLow === domain.replace(/\.\w+$/, '').toLowerCase() ||
      domain.toLowerCase().includes(suffixLow) ||
      friendly.toLowerCase().includes(suffixLow)
    ) {
      const cleaned = title.slice(0, idx).trim();
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return title;
}

function smartTitle(title, url) {
  if (!url) return title || '';
  let pathname = '', hostname = '';
  try { const u = new URL(url); pathname = u.pathname; hostname = u.hostname; }
  catch { return title || ''; }

  const titleIsUrl = !title || title === url || title.startsWith(hostname) || title.startsWith('http');

  if ((hostname === 'x.com' || hostname === 'twitter.com' || hostname === 'www.x.com') && pathname.includes('/status/')) {
    const username = pathname.split('/')[1];
    if (username) return titleIsUrl ? `Post by @${username}` : title;
  }

  if (hostname === 'github.com' || hostname === 'www.github.com') {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo, ...rest] = parts;
      if (rest[0] === 'issues' && rest[1]) return `${owner}/${repo} Issue #${rest[1]}`;
      if (rest[0] === 'pull'   && rest[1]) return `${owner}/${repo} PR #${rest[1]}`;
      if (rest[0] === 'blob' || rest[0] === 'tree') return `${owner}/${repo} — ${rest.slice(2).join('/')}`;
      if (titleIsUrl) return `${owner}/${repo}`;
    }
  }

  if ((hostname === 'www.youtube.com' || hostname === 'youtube.com') && pathname === '/watch') {
    if (titleIsUrl) return 'YouTube Video';
  }

  if ((hostname === 'www.reddit.com' || hostname === 'reddit.com' || hostname === 'old.reddit.com') && pathname.includes('/comments/')) {
    const parts  = pathname.split('/').filter(Boolean);
    const subIdx = parts.indexOf('r');
    if (subIdx !== -1 && parts[subIdx + 1]) {
      if (titleIsUrl) return `r/${parts[subIdx + 1]} post`;
    }
  }

  return title || url;
}


/* ----------------------------------------------------------------
   SVG ICON STRINGS
   ---------------------------------------------------------------- */
const ICONS = {
  tabs:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18" /></svg>`,
  close:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
  undo:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14 4 9m0 0 5-5M4 9h10a6 6 0 0 1 0 12h-1" /></svg>`,
  archive: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>`,
  focus:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>`,
};


/* ----------------------------------------------------------------
   IN-MEMORY STORE FOR OPEN-TAB GROUPS
   ---------------------------------------------------------------- */
let domainGroups = [];
let openTabsFilterQuery = "";
let openTabsSearchVisible = false;


/* ----------------------------------------------------------------
   HELPER: filter out browser-internal pages
   ---------------------------------------------------------------- */

/**
 * getRealTabs()
 *
 * Returns tabs that are real web pages — no chrome://, extension
 * pages, about:blank, etc.
 */
function getRealTabs() {
  return openTabs.filter(t => {
    const url = t.url || '';
    return (
      !url.startsWith('chrome://') &&
      !url.startsWith('chrome-extension://') &&
      !url.startsWith('about:') &&
      !url.startsWith('edge://') &&
      !url.startsWith('brave://')
    );
  });
}

/**
 * checkTabOutDupes()
 *
 * Counts how many Tab Out pages are open. If more than 1,
 * shows a banner offering to close the extras.
 */
function checkTabOutDupes() {
  const tabOutTabs = openTabs.filter(t => t.isTabOut);
  const banner  = document.getElementById('tabOutDupeBanner');
  const countEl = document.getElementById('tabOutDupeCount');
  if (!banner) return;

  if (tabOutTabs.length > 1) {
    if (countEl) countEl.textContent = tabOutTabs.length;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}


/* ----------------------------------------------------------------
   OVERFLOW CHIPS ("+N more" expand button in domain cards)
   ---------------------------------------------------------------- */

function buildOverflowChips(hiddenTabs, urlCounts = {}) {
  const hiddenChips = hiddenTabs.map(tab => {
    const label    = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), '');
    const count    = urlCounts[tab.url] || 1;
    const dupeTag  = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl   = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
    let domain = '';
    try { domain = new URL(tab.url).hostname; } catch {}
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-open-tab-draggable="true" data-tab-id="${tab.id}" data-tab-url="${safeUrl}" draggable="false" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" draggable="false" onerror="this.style.display='none'">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="${t("saveForLater")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="${t("closeThisTab")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="page-chips-overflow" style="display:none">${hiddenChips}</div>
    <div class="page-chip page-chip-overflow clickable" data-action="expand-chips">
      <span class="chip-text">+${hiddenTabs.length} more</span>
    </div>`;
}


/* ----------------------------------------------------------------
   OPEN TABS FILTER
   ---------------------------------------------------------------- */

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeFilterText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getDomainGroupSearchText(group) {
  const parts = [
    group.domain,
    group.label,
    friendlyDomain(group.domain)
  ];

  for (const tab of group.tabs || []) {
    parts.push(tab.title, tab.url);
    try {
      const parsed = new URL(tab.url);
      parts.push(parsed.hostname, parsed.pathname, friendlyDomain(parsed.hostname));
    } catch {}
  }

  return normalizeFilterText(parts.filter(Boolean).join(" "));
}

function getFilteredDomainGroups(groups = domainGroups) {
  const query = normalizeFilterText(openTabsFilterQuery);
  if (!query) return groups;

  const terms = query.split(/\s+/).filter(Boolean);
  return groups.filter((group) => {
    const haystack = getDomainGroupSearchText(group);
    return terms.every((term) => haystack.includes(term));
  });
}

function getOpenTabsCountLabel(filteredGroups, allGroups) {
  const filteredCount = filteredGroups.length;
  const totalCount = allGroups.length;
  const domainLabel = filteredCount === 1 ? t("domain") : t("domains");

  if (normalizeFilterText(openTabsFilterQuery)) {
    return `${filteredCount}/${totalCount} ${domainLabel}`;
  }

  return `${totalCount} ${totalCount === 1 ? t("domain") : t("domains")}`;
}

function renderOpenTabsSearchControls(unassignedTabCount) {
  const searchValue = escapeAttr(openTabsFilterQuery);
  const activeClass = openTabsSearchVisible ? " is-visible" : "";
  const undoCount = unassignedRemovalHistory.length;
  const undoDisabled = unassignedRemovalUndoBusy || undoCount < 1;
  const undoTitle = undoCount > 0
    ? t("unassignedUndoRemovalTitle", { count: undoCount })
    : t("unassignedUndoRemovalEmpty");

  return `
    <span id="openTabsFilteredCount" class="open-tabs-count-label"></span>
    <button class="open-tabs-undo-btn" data-action="undo-unassigned-removal" title="${escapeAttr(undoTitle)}" aria-label="${escapeAttr(undoTitle)}" ${undoDisabled ? "disabled" : ""}>
      ${ICONS.undo}
      <span class="open-tabs-undo-label">${t("unassignedUndoRemoval")}</span>
      <span class="open-tabs-undo-count"${undoCount > 1 ? "" : " hidden"}>${undoCount}</span>
    </button>
    <button class="open-tabs-search-btn" data-action="toggle-open-tabs-search" title="${escapeAttr(t("searchTabs"))}" aria-label="${escapeAttr(t("searchTabs"))}" aria-expanded="${openTabsSearchVisible ? "true" : "false"}">
      <svg class="open-tabs-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
      </svg>
    </button>
    <span class="open-tabs-search-wrap${activeClass}" id="openTabsSearchWrap">
      <input type="text" id="openTabsFilterInput" class="open-tabs-search-input" value="${searchValue}" placeholder="${escapeAttr(t("filterTabs"))}" autocomplete="off" spellcheck="false">
      <button type="button" class="open-tabs-search-clear" data-action="clear-open-tabs-search" title="${escapeAttr(t("closeTabSearch"))}" aria-label="${escapeAttr(t("closeTabSearch"))}">×</button>
    </span>
    <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;" ${unassignedTabCount === 0 ? "disabled" : ""}>${ICONS.close} ${t("closeAllTabs", { count: unassignedTabCount })}</button>
  `;
}

function updateOpenTabsFilterUI(filteredGroups = getFilteredDomainGroups(), allGroups = domainGroups) {
  const countLabel = document.getElementById("openTabsFilteredCount");
  if (countLabel) {
    countLabel.textContent = getOpenTabsCountLabel(filteredGroups, allGroups);
  }

  const clearButton = document.querySelector(".open-tabs-search-clear");
  if (clearButton) {
    clearButton.hidden = !openTabsSearchVisible;
  }
}

function renderFilteredOpenTabs() {
  const openTabsMissionsEl = document.getElementById("openTabsMissions");
  if (!openTabsMissionsEl) return;

  const filteredGroups = getFilteredDomainGroups(domainGroups);

  if (filteredGroups.length > 0) {
    openTabsMissionsEl.innerHTML = filteredGroups.map(g => renderDomainCard(g)).join("");
  } else {
    const hasQuery = Boolean(normalizeFilterText(openTabsFilterQuery));
    openTabsMissionsEl.innerHTML = `
      <div class="missions-empty-state open-tabs-filter-empty">
        <div class="empty-title">${t(hasQuery ? "noResults" : "allTabsAssignedTitle")}</div>
        <div class="empty-subtitle">${t(hasQuery ? "noMatchingTabs" : "allTabsAssignedSubtitle")}</div>
      </div>
    `;
  }

  updateOpenTabsFilterUI(filteredGroups, domainGroups);
}


/* ----------------------------------------------------------------
   DOMAIN CARD RENDERER
   ---------------------------------------------------------------- */

/**
 * renderDomainCard(group, groupIndex)
 *
 * Builds the HTML for one domain group card.
 * group = { domain: string, tabs: [{ url, title, id, windowId, active }] }
 */
function renderDomainCard(group) {
  const tabs      = group.tabs || [];
  const tabCount  = tabs.length;
  const isLanding = group.domain === '__landing-pages__';
  const stableId  = 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');

  // Count duplicates (exact URL match)
  const urlCounts = {};
  for (const tab of tabs) urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  const dupeUrls   = Object.entries(urlCounts).filter(([, c]) => c > 1);
  const hasDupes   = dupeUrls.length > 0;
  const totalExtras = dupeUrls.reduce((s, [, c]) => s + c - 1, 0);

  const tabBadge = `<span class="open-tabs-badge">
    ${ICONS.tabs}
    ${tabCount} ${tabCount === 1 ? t("tab") : t("tabs")} ${t("open")}
  </span>`;

  const dupeBadge = hasDupes
    ? `<span class="open-tabs-badge" style="color:var(--accent-amber);background:rgba(200,113,58,0.08);">
        ${totalExtras} ${totalExtras === 1 ? t("duplicate") : t("duplicates")}
      </span>`
    : '';

  // Deduplicate for display: show each URL once, with (Nx) badge if duped
  const seen = new Set();
  const uniqueTabs = [];
  for (const tab of tabs) {
    if (!seen.has(tab.url)) { seen.add(tab.url); uniqueTabs.push(tab); }
  }

  const visibleTabSetting =
    document.documentElement.dataset.unassignedVisibleTabCount;
  const visibleTabLimit =
    visibleTabSetting === "all"
      ? uniqueTabs.length
      : visibleTabSetting === "4"
        ? 4
        : 2;
  const visibleTabs = uniqueTabs.slice(0, visibleTabLimit);
  const hiddenTabs = uniqueTabs.slice(visibleTabLimit);

  const pageChips = visibleTabs.map(tab => {
    let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), group.domain);
  
    try {
      const parsed = new URL(tab.url);
      if (parsed.hostname === 'localhost' && parsed.port) label = `${parsed.port} ${label}`;
    } catch {}
  
    const count    = urlCounts[tab.url];
    const dupeTag  = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl   = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
  
    let domain = '';
    try { domain = new URL(tab.url).hostname; } catch {}
  
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';
  
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-open-tab-draggable="true" data-tab-id="${tab.id}" data-tab-url="${safeUrl}" draggable="false" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" draggable="false" onerror="this.style.display='none'">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="${t("saveForLater")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="${t("closeThisTab")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  const closeAllHtml = `
    <button class="action-btn close-tabs domain-close-all" data-action="close-domain-tabs" data-domain-id="${stableId}">
      ${ICONS.close}
      ${t("closeAllDomainTabs", { count: tabCount })}
    </button>`;
  let actionsHtml = "";

  if (hasDupes) {
    const dupeUrlsEncoded = dupeUrls.map(([url]) => encodeURIComponent(url)).join(',');
    actionsHtml = `
      <button class="action-btn" data-action="dedup-keep-one" data-dupe-urls="${dupeUrlsEncoded}">
        ${totalExtras === 1 ? t("closeDuplicate", { count: totalExtras }) : t("closeDuplicates", { count: totalExtras })}
      </button>`;
  }

  return `
    <div class="mission-card domain-card ${hasDupes ? 'has-amber-bar' : 'has-neutral-bar'}" data-domain-id="${stableId}">
      <div class="status-bar"></div>
      <div class="mission-content">
        ${closeAllHtml}
        <div class="mission-top">
          <span class="mission-name">${isLanding ? t("homepages") : (group.label || friendlyDomain(group.domain))}</span>
          ${tabBadge}
          ${dupeBadge}
        </div>
        <div class="mission-pages">${pageChips}</div>
        ${renderTabDropdown(hiddenTabs, `${stableId}-dropdown`)}
        ${actionsHtml ? `<div class="actions">${actionsHtml}</div>` : ""}
      </div>
      <div class="mission-meta">
        <div class="mission-page-count">${tabCount}</div>
        <div class="mission-page-label">${tabCount === 1 ? t("tab") : t("tabs")}</div>
      </div>
    </div>`;
}

function renderTabDropdown(tabs, groupId) {
  if (!tabs || tabs.length === 0) {
    return "";
  }

  const items = tabs.map((tab) => {
    const safeUrl = (tab.url || "").replace(/"/g, "&quot;");
    const rawTitle = cleanTitle(
      smartTitle(stripTitleNoise(tab.title || ""), tab.url),
      ""
    );

    const safeTitle = rawTitle.replace(/"/g, "&quot;");

    let domain = "";
    try {
      domain = new URL(tab.url).hostname;
    } catch {}

    const faviconUrl = domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
      : "";

    return `
      <button class="tab-dropdown-item" data-action="focus-tab" data-open-tab-draggable="true" data-tab-id="${tab.id}" data-tab-url="${safeUrl}" draggable="false" title="${safeTitle}">
        ${faviconUrl ? `<img src="${faviconUrl}" alt="" draggable="false">` : ""}
        <span>${rawTitle}</span>
      </button>
    `;
  }).join("");

  return `
    <div class="tab-dropdown">
      <button class="tab-dropdown-toggle" data-action="toggle-tab-dropdown" data-dropdown-id="${groupId}">
        ${t("showMoreTabs", { count: tabs.length })}
      </button>

      <div class="tab-dropdown-list" id="${groupId}" hidden>
        ${items}
      </div>
    </div>
  `;
}


/* ----------------------------------------------------------------
   SAVED FOR LATER — Render Checklist Column
   ---------------------------------------------------------------- */

/**
 * renderDeferredColumn()
 *
 * Reads saved tabs from chrome.storage.local and renders the right-side
 * "Saved for Later" checklist column. Shows active items as a checklist
 * and completed items in a collapsible archive.
 */
async function renderDeferredColumn() {
  const column         = document.getElementById('deferredColumn');
  const list           = document.getElementById('deferredList');
  const empty          = document.getElementById('deferredEmpty');
  const countEl        = document.getElementById('deferredCount');
  const archiveEl      = document.getElementById('deferredArchive');
  const archiveCountEl = document.getElementById('archiveCount');
  const archiveList    = document.getElementById('archiveList');
  const moduleWrapper  = column?.closest('[data-dashboard-module="savedLater"]');

  if (!column) return;

  try {
    const { active, archived } = await getSavedTabs();

    // Hide the entire column if there's nothing to show
    if (active.length === 0 && archived.length === 0) {
      column.style.display = 'none';
      moduleWrapper?.classList.add("is-data-empty");
      return;
    }

    moduleWrapper?.classList.remove("is-data-empty");
    column.style.display = 'block';

    // Render active checklist items
    if (active.length > 0) {
      countEl.textContent = plural(active.length, "itemCount", "itemsCount");
      list.innerHTML = active.map(item => renderDeferredItem(item)).join('');
      list.style.display = '';
      empty.style.display = 'none';
    } else {
      list.style.display = 'none';
      countEl.textContent = '';
      empty.style.display = 'block';
    }

    // Render archive section
    if (archived.length > 0) {
      archiveCountEl.textContent = `(${archived.length})`;
      renderArchiveItems(archived);
      archiveEl.style.display = 'block';
    } else {
      archiveCountEl.textContent = '';
      archiveList.innerHTML = '';
      archiveEl.style.display = 'none';
    }

  } catch (err) {
    console.warn('[tab-out] Could not load saved tabs:', err);
    column.style.display = 'none';
    moduleWrapper?.classList.add("is-data-empty");
  }
}

/**
 * renderDeferredItem(item)
 *
 * Builds HTML for one active checklist item: checkbox, title link,
 * domain, time ago, dismiss button.
 */
function renderDeferredItem(item) {
  let domain = '';
  try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  const ago = timeAgo(item.savedAt);

  return `
    <div class="deferred-item" data-deferred-id="${item.id}">
      <input type="checkbox" class="deferred-checkbox" data-action="check-deferred" data-deferred-id="${item.id}">
      <div class="deferred-info">
        <a href="${item.url}" target="_blank" rel="noopener" class="deferred-title" title="${(item.title || '').replace(/"/g, '&quot;')}">
          <img src="${faviconUrl}" alt="" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px" onerror="this.style.display='none'">${item.title || item.url}
        </a>
        <div class="deferred-meta">
          <span>${domain}</span>
          <span>${ago}</span>
        </div>
      </div>
      <button class="deferred-dismiss" data-action="dismiss-deferred" data-deferred-id="${item.id}" title="${t("dismiss")}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>`;
}

/**
 * renderArchiveItem(item)
 *
 * Builds HTML for one completed/archived item (simpler: just title + date).
 */
function renderArchiveItem(item) {
  const ago = item.completedAt ? timeAgo(item.completedAt) : timeAgo(item.savedAt);
  const safeId = escapeAttr(item.id);
  const safeUrl = escapeAttr(item.url);
  const safeTitle = escapeAttr(item.title || item.url);
  return `
    <div class="archive-item" data-deferred-id="${safeId}">
      <a href="${safeUrl}" target="_blank" rel="noopener" class="archive-item-title" title="${safeTitle}">
        ${safeTitle}
      </a>
      <span class="archive-item-date">${ago}</span>
      <div class="archive-item-actions">
        <button type="button" class="archive-item-action archive-item-restore" data-action="restore-archived-tab" data-deferred-id="${safeId}" title="${escapeAttr(t("restoreArchivedTab"))}" aria-label="${escapeAttr(t("restoreArchivedTab"))}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12a8.25 8.25 0 1 0 2.42-5.83L3.75 8.59m0-4.84v4.84h4.84" />
          </svg>
        </button>
        <button type="button" class="archive-item-action archive-item-delete" data-action="delete-archived-tab" data-deferred-id="${safeId}" title="${escapeAttr(t("deleteArchivedTab"))}" aria-label="${escapeAttr(t("deleteArchivedTab"))}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 7.5h15m-10.5 0V4.75h6V7.5m-8.25 0 .75 12h9l.75-12M10 11v5m4-5v5" />
          </svg>
        </button>
      </div>
    </div>`;
}

function filterArchivedTabs(archived, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return archived;
  }

  return archived.filter(item =>
    (item.title || '').toLowerCase().includes(normalizedQuery) ||
    (item.url || '').toLowerCase().includes(normalizedQuery)
  );
}

function renderArchiveItems(archived) {
  const archiveList = document.getElementById('archiveList');
  const query = document.getElementById('archiveSearch')?.value || "";

  if (!archiveList) {
    return;
  }

  const visibleItems = filterArchivedTabs(archived, query);
  archiveList.innerHTML = visibleItems.map(item => renderArchiveItem(item)).join('')
    || `<div class="archive-search-empty">${escapeAttr(t("noResults"))}</div>`;
}


/* ----------------------------------------------------------------
   MAIN DASHBOARD RENDERER
   ---------------------------------------------------------------- */

/**
 * renderStaticDashboard()
 *
 * The main render function:
 * 1. Paints greeting + date
 * 2. Fetches open tabs via chrome.tabs.query()
 * 3. Groups tabs by domain (with landing pages pulled out to their own group)
 * 4. Renders domain cards
 * 5. Updates footer stats
 * 6. Renders the "Saved for Later" checklist
 */
async function renderStaticDashboard() {
  // --- Header ---
  const greetingEl = document.getElementById('greeting');
  const dateEl     = document.getElementById('dateDisplay');
  if (greetingEl) greetingEl.textContent = getGreeting();
  if (dateEl)     dateEl.textContent     = getDateDisplay();
  syncDashboardClockVisibility();

  // --- Fetch tabs ---
  await fetchOpenTabs();
  await loadUnassignedRemovalHistory();
  const realTabs = getRealTabs();
  let sessions = [];

  try {
    sessions = await getSavedSessions();
  } catch (error) {
    console.warn("[tab-out] could not load sessions for tab assignment:", error);
  }

  const assignedUrls = getAssignedSessionUrlSet(sessions);
  const assignedGroupIds = getAssignedSessionGroupIdSet(sessions);
  (provisionalSessionState?.tabs || []).forEach((tab) => {
    const normalizedUrl = normalizeOpenTabUrl(tab.url);

    if (normalizedUrl) {
      assignedUrls.add(normalizedUrl);
    }
  });
  unassignedOpenTabs = realTabs.filter(
    (tab) =>
      !assignedUrls.has(normalizeOpenTabUrl(tab.url)) &&
      !assignedGroupIds.has(tab.groupId)
  );

  // --- Group tabs by domain ---
  // Landing pages (Gmail inbox, Twitter home, etc.) get their own special group
  // so they can be closed together without affecting content tabs on the same domain.
  const LANDING_PAGE_PATTERNS = [
    { hostname: 'mail.google.com', test: (p, h) =>
        !h.includes('#inbox/') && !h.includes('#sent/') && !h.includes('#search/') },
    { hostname: 'x.com',               pathExact: ['/home'] },
    { hostname: 'www.linkedin.com',    pathExact: ['/'] },
    { hostname: 'github.com',          pathExact: ['/'] },
    { hostname: 'www.youtube.com',     pathExact: ['/'] },
    // Merge personal patterns from config.local.js (if it exists)
    ...(typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined' ? LOCAL_LANDING_PAGE_PATTERNS : []),
  ];

  function isLandingPage(url) {
    try {
      const parsed = new URL(url);
      return LANDING_PAGE_PATTERNS.some(p => {
        // Support both exact hostname and suffix matching (for wildcard subdomains)
        const hostnameMatch = p.hostname
          ? parsed.hostname === p.hostname
          : p.hostnameEndsWith
            ? parsed.hostname.endsWith(p.hostnameEndsWith)
            : false;
        if (!hostnameMatch) return false;
        if (p.test)       return p.test(parsed.pathname, url);
        if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
        if (p.pathExact)  return p.pathExact.includes(parsed.pathname);
        return parsed.pathname === '/';
      });
    } catch { return false; }
  }

  domainGroups = [];
  const groupMap    = {};
  const landingTabs = [];

  // Custom group rules from config.local.js (if any)
  const customGroups = typeof LOCAL_CUSTOM_GROUPS !== 'undefined' ? LOCAL_CUSTOM_GROUPS : [];

  // Check if a URL matches a custom group rule; returns the rule or null
  function matchCustomGroup(url) {
    try {
      const parsed = new URL(url);
      return customGroups.find(r => {
        const hostMatch = r.hostname
          ? parsed.hostname === r.hostname
          : r.hostnameEndsWith
            ? parsed.hostname.endsWith(r.hostnameEndsWith)
            : false;
        if (!hostMatch) return false;
        if (r.pathPrefix) return parsed.pathname.startsWith(r.pathPrefix);
        return true; // hostname matched, no path filter
      }) || null;
    } catch { return null; }
  }

  for (const tab of unassignedOpenTabs) {
    try {
      if (isLandingPage(tab.url)) {
        landingTabs.push(tab);
        continue;
      }

      // Check custom group rules first (e.g. merge subdomains, split by path)
      const customRule = matchCustomGroup(tab.url);
      if (customRule) {
        const key = customRule.groupKey;
        if (!groupMap[key]) groupMap[key] = { domain: key, label: customRule.groupLabel, tabs: [] };
        groupMap[key].tabs.push(tab);
        continue;
      }

      let hostname;
      if (tab.url && tab.url.startsWith('file://')) {
        hostname = 'local-files';
      } else {
        hostname = new URL(tab.url).hostname;
      }
      if (!hostname) continue;

      if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
      groupMap[hostname].tabs.push(tab);
    } catch {
      // Skip malformed URLs
    }
  }

  if (landingTabs.length > 0) {
    groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landingTabs };
  }

  // Sort: landing pages first, then domains from landing page sites, then by tab count
  // Collect exact hostnames and suffix patterns for priority sorting
  const landingHostnames = new Set(LANDING_PAGE_PATTERNS.map(p => p.hostname).filter(Boolean));
  const landingSuffixes = LANDING_PAGE_PATTERNS.map(p => p.hostnameEndsWith).filter(Boolean);
  function isLandingDomain(domain) {
    if (landingHostnames.has(domain)) return true;
    return landingSuffixes.some(s => domain.endsWith(s));
  }
  domainGroups = Object.values(groupMap).sort((a, b) => {
    const aIsLanding = a.domain === '__landing-pages__';
    const bIsLanding = b.domain === '__landing-pages__';
    if (aIsLanding !== bIsLanding) return aIsLanding ? -1 : 1;

    const aIsPriority = isLandingDomain(a.domain);
    const bIsPriority = isLandingDomain(b.domain);
    if (aIsPriority !== bIsPriority) return aIsPriority ? -1 : 1;

    return b.tabs.length - a.tabs.length;
  });

  // --- Render domain cards ---
  const openTabsSection      = document.getElementById('openTabsSection');
  const openTabsMissionsEl   = document.getElementById('openTabsMissions');
  const openTabsSectionCount = document.getElementById('openTabsSectionCount');
  const openTabsSectionTitle = document.getElementById('openTabsSectionTitle');

  if (openTabsSection) {
    if (openTabsSectionTitle) openTabsSectionTitle.textContent = t("unassignedTabs");
    openTabsSectionCount.innerHTML = renderOpenTabsSearchControls(
      unassignedOpenTabs.length
    );
    renderFilteredOpenTabs();
    openTabsSection.style.display = 'block';
  }

  // --- Footer stats ---
  const statTabs = document.getElementById('statTabs');
  if (statTabs) statTabs.textContent = openTabs.length;

  // --- Check for duplicate Tab Out tabs ---
  checkTabOutDupes();

  // --- Render "Saved for Later" column ---
  await renderDeferredColumn();
}

async function renderDashboard() {
  await renderStaticDashboard();
}


/* ----------------------------------------------------------------
   SAVED SESSIONS
   ---------------------------------------------------------------- */

   let unifiedSessionMigrationPromise = null;

   async function ensureUnifiedSessionStorage() {
     if (!unifiedSessionMigrationPromise) {
       unifiedSessionMigrationPromise = sendCollectionRuntimeMessage({
         type: "tabOut:ensureSessionMigration"
       }).then((response) => {
         if (!response.ok) {
           throw new Error(response.code || "session_migration_failed");
         }

         return response;
       }).catch((error) => {
         unifiedSessionMigrationPromise = null;
         console.warn("[tab-out] session migration failed:", error);
         return null;
       });
     }

     return unifiedSessionMigrationPromise;
   }

   async function getSavedSessions() {
     await ensureUnifiedSessionStorage();
     const { savedSessions = [] } = await chrome.storage.local.get("savedSessions");
     const sessions = Array.isArray(savedSessions) ? savedSessions : [];
     const metadataApi = globalThis.TabOutTabMetadata;

     if (!metadataApi) {
       return sessions;
     }

     const includeSuspendedTabs =
       await getIncludeSuspendedTabsPreference();
     return sessions.map((session) =>
       metadataApi.normalizeSavedSession(session, {
         includeSuspendedTabs
       })
     );
   }
   
   async function saveSavedSessions(sessions) {
     await chrome.storage.local.set({ savedSessions: sessions });
   }
   
   function getTabDisplayTitle(tab) {
     return cleanTitle(
       smartTitle(stripTitleNoise(tab.title || ""), tab.url),
       getTabDomain(tab.url)
     );
   }
   
   function getTabDomain(url) {
     try {
       return new URL(url).hostname;
     } catch {
       return "";
     }
   }
   
   function getTabFavicon(url, size = 16) {
     const domain = getTabDomain(url);
   
     if (!domain) {
       return "";
     }
   
     return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
   }
   
   function createSessionId() {
     return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
   }

   let collectionDetailState = null;
   let collectionDetailReturnFocus = null;
   let collectionDetailScrollY = 0;
   let collectionDetailOpenStateRefreshTimer = null;

   function normalizeOpenTabUrl(url = "") {
     try {
       return new URL(url).toString();
     } catch {
       return String(url || "").trim();
     }
   }

   function getAssignedSessionUrlSet(sessions = []) {
     const assignedUrls = new Set();

     sessions.forEach((session) => {
       (session.tabs || []).forEach((tab) => {
         const normalizedUrl = normalizeOpenTabUrl(tab.url);

         if (normalizedUrl) {
           assignedUrls.add(normalizedUrl);
         }
       });
     });

     return assignedUrls;
   }

   function getAssignedSessionGroupIdSet(sessions = []) {
     return new Set(
       sessions
         .map((session) => session.groupLink?.chromeGroupId)
         .filter(Number.isInteger)
     );
   }

   async function getCurrentWindowTabsByUrl(windowId = null) {
     const targetWindowId = Number.isInteger(windowId)
       ? windowId
       : await getCollectionTargetWindowId();
     const tabs = await queryTabsWithMetadata(
       Number.isInteger(targetWindowId)
         ? { windowId: targetWindowId }
         : { currentWindow: true }
     );
     const byUrl = new Map();

     tabs.forEach((tab) => {
       const normalizedUrl = normalizeOpenTabUrl(tab.pendingUrl || tab.url);

       if (!normalizedUrl) {
         return;
       }

       const existingTab = byUrl.get(normalizedUrl);

       if (!existingTab || tab.active) {
         byUrl.set(normalizedUrl, tab);
       }
     });

     return {
       windowId: targetWindowId,
       tabs,
       byUrl
     };
   }

   function applyCollectionDetailOpenState(detail, openState) {
     detail.targetWindowId = openState.windowId;

     detail.tabs.forEach((item) => {
       item.existingTab = openState.byUrl.get(
         normalizeOpenTabUrl(item.url)
       ) || null;

       if (item.existingTab) {
         detail.selectedKeys?.delete(item.key);
       }
     });
   }

   async function refreshCollectionDetailOpenState({ render = true } = {}) {
     const detail = collectionDetailState;

     if (!detail) {
       return;
     }

     const openState = await getCurrentWindowTabsByUrl(detail.targetWindowId);

     if (collectionDetailState !== detail) {
       return;
     }

     applyCollectionDetailOpenState(detail, openState);

     if (render) {
       renderCollectionDetail();
     }
   }

   function scheduleCollectionDetailOpenStateRefresh() {
     if (!collectionDetailState) {
       return;
     }

     clearTimeout(collectionDetailOpenStateRefreshTimer);
     collectionDetailOpenStateRefreshTimer = setTimeout(() => {
       refreshCollectionDetailOpenState();
     }, 250);
   }

   function createCollectionDetailTabs(tabs = [], sourceKey = "collection") {
     return tabs
       .map((tab, index) => ({
         key: `${sourceKey}-${tab.id ?? "saved"}-${index}`,
         id: Number.isInteger(tab.id) ? tab.id : null,
         windowId: Number.isInteger(tab.windowId) ? tab.windowId : null,
         title: tab.title || tab.url || "",
         url: tab.url || "",
         favIconUrl: tab.favIconUrl || getTabFavicon(tab.url || "", 16)
       }))
       .filter((tab) => tab.url);
   }

   function getKnownCollectionLiveTab(detail, item) {
     if (!detail || !item) {
       return null;
     }

     if (detail.kind === "live-group") {
       return detail.liveGroup?.tabs?.find((tab) => tab.id === item.id) || null;
     }

     if (!detail.liveGroup) {
       return null;
     }

     const normalizedUrl = normalizeOpenTabUrl(item.url);

     return detail.liveGroup.tabs.find(
       (tab) => normalizeOpenTabUrl(tab.url) === normalizedUrl
     ) || null;
   }

   function getCollectionDetailElements() {
     return {
       overlay: document.getElementById("collectionDetailOverlay"),
       panel: document.querySelector(".collection-detail-panel"),
       source: document.getElementById("collectionDetailSource"),
       title: document.getElementById("collectionDetailTitle"),
       meta: document.getElementById("collectionDetailMeta"),
       notice: document.getElementById("collectionDetailNotice"),
       groupCopyHint: document.getElementById("collectionDetailGroupCopyHint"),
       tabs: document.getElementById("collectionDetailTabs"),
       selection: document.getElementById("collectionDetailSelection"),
       openGroup: document.getElementById("collectionDetailOpenGroup"),
       openAll: document.getElementById("collectionDetailOpenAll"),
       openSelected: document.getElementById("collectionDetailOpenSelected")
     };
   }

   function getCollectionDetailSourceLabel(detail) {
     if (detail.kind === "session") {
       return t("collectionDetailSession");
     }

     if (detail.kind === "protected-group") {
       return t("collectionDetailSavedGroup");
     }

     return t("collectionDetailLiveGroup");
   }

   function getCollectionDetailTabsLabel(detail) {
     const count = detail.tabs.length;

     if (detail.kind === "session") {
       return plural(count, "sessionTabCount", "sessionTabsCount");
     }

     return plural(count, "chromeGroupTabCount", "chromeGroupTabsCount");
   }

   function getCollectionDetailOpenAllLabel(detail) {
     if (detail.kind === "session") {
       return t("collectionDetailOpenAll");
     }

     if (detail.kind === "protected-group" && !detail.liveGroup) {
       return t("collectionDetailRestoreGroup");
     }

     return t("collectionDetailOpenAllGroup");
   }

   function updateCollectionDetailSelectionUi() {
     const detail = collectionDetailState;
     const elements = getCollectionDetailElements();

     if (!detail || !elements.overlay || elements.overlay.hidden) {
       return;
     }

     const selectedCount = detail.selectedKeys.size;
     const openableCount = detail.tabs.filter((tab) => !tab.existingTab).length;

     if (elements.selection) {
       elements.selection.textContent = t("collectionDetailSelected", {
         count: selectedCount
       });
     }

     if (elements.openSelected) {
       elements.openSelected.textContent = selectedCount
         ? t("collectionDetailOpenSelectedCount", { count: selectedCount })
         : t("collectionDetailOpenSelected");
       elements.openSelected.disabled = detail.busy || selectedCount === 0;
     }

     if (elements.openAll) {
       elements.openAll.disabled = detail.busy ||
         detail.tabs.length === 0 ||
         (detail.kind === "session" && openableCount === 0);
     }

     if (elements.openGroup) {
       elements.openGroup.disabled = detail.busy || detail.tabs.length === 0;
     }

     elements.overlay
       .querySelectorAll(
         '[data-action="open-collection-tab-and-switch"], ' +
         '[data-action="select-all-collection-tabs"], ' +
         '[data-action="clear-collection-tabs"]'
       )
       .forEach((control) => {
         if (control.dataset.action === "select-all-collection-tabs") {
           control.disabled = detail.busy || openableCount === 0;
           return;
         }

         if (control.dataset.action === "clear-collection-tabs") {
           control.disabled = detail.busy || selectedCount === 0;
           return;
         }

         control.disabled = detail.busy;
       });

     elements.overlay
       .querySelectorAll("input[data-collection-tab-key]")
       .forEach((checkbox) => {
         checkbox.disabled = detail.busy ||
           checkbox.dataset.alreadyOpen === "true";
       });

     if (elements.panel) {
       elements.panel.setAttribute("aria-busy", String(detail.busy));
     }
   }

   function renderCollectionDetail() {
     const detail = collectionDetailState;
     const elements = getCollectionDetailElements();

     if (!detail || !elements.overlay || !elements.tabs) {
       return;
     }

     const validKeys = new Set(detail.tabs.map((tab) => tab.key));
     detail.selectedKeys.forEach((key) => {
       if (!validKeys.has(key)) {
         detail.selectedKeys.delete(key);
       }
     });

     elements.source.textContent = getCollectionDetailSourceLabel(detail);
     elements.title.textContent = detail.title;
     elements.meta.textContent = [
       getCollectionDetailTabsLabel(detail),
       detail.statusLabel || ""
     ].filter(Boolean).join(" · ");

     if (detail.noticeKey) {
       elements.notice.hidden = false;
       elements.notice.textContent = t(detail.noticeKey);
     } else {
       elements.notice.hidden = true;
       elements.notice.textContent = "";
     }

     if (elements.groupCopyHint) {
       elements.groupCopyHint.hidden = detail.kind === "session";
       elements.groupCopyHint.textContent = detail.kind === "session"
         ? ""
         : t("collectionDetailGroupCopyHint");
     }

     const allSessionTabsOpen = detail.kind === "session" &&
       detail.tabs.length > 0 &&
       detail.tabs.every((tab) => tab.existingTab);

     elements.openAll.textContent = allSessionTabsOpen
       ? t("collectionDetailAllAlreadyOpen")
       : getCollectionDetailOpenAllLabel(detail);

     if (elements.openGroup) {
       elements.openGroup.hidden = detail.kind !== "session";
       elements.openGroup.textContent = detail.liveGroup
         ? t("showOpenGroup")
         : t("openAsGroup");
     }

     elements.tabs.innerHTML = "";

     detail.tabs.forEach((item) => {
       const row = document.createElement("div");
       row.className = "collection-detail-tab-row";
       row.dataset.tabUrl = item.url;
       row.setAttribute("role", "listitem");

       if (item.existingTab) {
         row.classList.add("is-already-open");
       }

       const selectLabel = document.createElement("label");
       selectLabel.className = "collection-detail-tab-select";

       const checkbox = document.createElement("input");
       checkbox.type = "checkbox";
       checkbox.checked = detail.selectedKeys.has(item.key);
       checkbox.dataset.collectionTabKey = item.key;
       checkbox.dataset.alreadyOpen = String(Boolean(item.existingTab));

       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = item.favIconUrl || getTabFavicon(item.url, 16);
       favicon.addEventListener("error", () => {
         favicon.hidden = true;
       }, { once: true });

       const info = document.createElement("span");
       info.className = "collection-detail-tab-info";

       const tabTitle = document.createElement("span");
       tabTitle.className = "collection-detail-tab-title";
       tabTitle.textContent = item.title || item.url;

       const tabDomain = document.createElement("span");
       tabDomain.className = "collection-detail-tab-domain";
       tabDomain.textContent = getTabDomain(item.url) || item.url;

       info.appendChild(tabTitle);
       info.appendChild(tabDomain);

       if (item.existingTab) {
         const openBadge = document.createElement("span");
         openBadge.className = "collection-detail-open-badge";
         openBadge.textContent = t("collectionDetailAlreadyOpen");
         info.appendChild(openBadge);
       }

       selectLabel.appendChild(checkbox);
       selectLabel.appendChild(favicon);
       selectLabel.appendChild(info);

       const switchButton = document.createElement("button");
       switchButton.type = "button";
       switchButton.className = "collection-detail-switch";
       switchButton.dataset.action = "open-collection-tab-and-switch";
       switchButton.dataset.tabKey = item.key;
       switchButton.textContent = (
         getKnownCollectionLiveTab(detail, item) ||
         item.existingTab
       )
         ? t("collectionDetailSwitchToTab")
         : t("collectionDetailOpenAndSwitch");

       row.appendChild(selectLabel);
       row.appendChild(switchButton);
       elements.tabs.appendChild(row);
     });

     updateCollectionDetailSelectionUi();
   }

   function sendCollectionRuntimeMessage(message) {
     return new Promise((resolve) => {
       chrome.runtime.sendMessage(message, (response) => {
         if (chrome.runtime.lastError) {
           resolve({ ok: false, code: "chrome_api_failed" });
           return;
         }

         resolve(response || { ok: false, code: "chrome_api_failed" });
       });
     });
   }

   async function reloadCollectionDetailSource() {
     const detail = collectionDetailState;

     if (!detail) {
       return false;
     }

     if (detail.kind === "session") {
       const [sessions, liveGroups] = await Promise.all([
         getSavedSessions(),
         getCurrentChromeGroups()
       ]);
       const session = sessions.find((item) => item.id === detail.id);

       if (!session) {
         return false;
       }

       detail.title = session.name;
       detail.session = session;
       detail.tabs = createCollectionDetailTabs(session.tabs, session.id);
       detail.liveGroup = findLiveGroupForSession(session, liveGroups);
       detail.statusLabel =
         getSessionGroupStatus(session, detail.liveGroup)?.label || "";
     } else if (detail.kind === "protected-group") {
       const [protectedGroups, liveGroups] = await Promise.all([
         getProtectedGroups(),
         getCurrentChromeGroups()
       ]);
       const snapshot = protectedGroups.find((group) => group.id === detail.id);

       if (!snapshot) {
         return false;
       }

       const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);
       const diff = diffProtectedGroup(snapshot, liveGroup);
       const status = getProtectedGroupStatus(snapshot, liveGroup, diff);

       detail.title = snapshot.title;
       detail.color = snapshot.color;
       detail.snapshot = snapshot;
       detail.liveGroup = liveGroup;
       detail.tabs = createCollectionDetailTabs(snapshot.tabs, snapshot.id);
       detail.statusLabel = status.label;
       detail.noticeKey = diff.missing
         ? "collectionDetailClosedNotice"
         : diff.changed && !diff.ignored
           ? "collectionDetailChangedNotice"
           : "";
     } else {
       const liveGroups = await getCurrentChromeGroups();
       const liveGroup = liveGroups.find(
         (group) => String(group.chromeGroupId) === String(detail.id)
       );

       if (!liveGroup) {
         return false;
       }

       detail.title = liveGroup.title;
       detail.color = liveGroup.color;
       detail.liveGroup = liveGroup;
       detail.tabs = createCollectionDetailTabs(
         liveGroup.tabs,
         `live-group-${liveGroup.chromeGroupId}`
       );
     }

     await refreshCollectionDetailOpenState();
     await renderSavedSessions();
     return true;
   }

   async function showCollectionDetail(detail, originElement = null) {
     const elements = getCollectionDetailElements();

     if (!elements.overlay) {
       return;
     }

     const openState = await getCurrentWindowTabsByUrl();

     collectionDetailReturnFocus = originElement instanceof HTMLElement
       ? originElement
       : document.activeElement;
     collectionDetailScrollY = window.scrollY;
     collectionDetailState = {
       ...detail,
       selectedKeys: new Set(),
       busy: false
     };
     applyCollectionDetailOpenState(collectionDetailState, openState);

     closeProtectedGroupMenus();
     elements.overlay.hidden = false;
     document.body.classList.add("collection-detail-is-open");
     renderCollectionDetail();

     requestAnimationFrame(() => {
       elements.overlay
         .querySelector('[data-action="close-collection-detail"]')
         ?.focus();
     });
   }

   function closeCollectionDetail() {
     const elements = getCollectionDetailElements();
     const returnFocus = collectionDetailReturnFocus;
     const returnScrollY = collectionDetailScrollY;
     const detail = collectionDetailState;

     if (!elements.overlay || elements.overlay.hidden) {
       return;
     }

     elements.overlay.hidden = true;
     document.body.classList.remove("collection-detail-is-open");
     clearTimeout(collectionDetailOpenStateRefreshTimer);
     collectionDetailState = null;
     collectionDetailReturnFocus = null;
     window.scrollTo(0, returnScrollY);

     requestAnimationFrame(() => {
       if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
         returnFocus.focus();
         return;
       }

       const selector = detail?.kind === "session"
         ? `[data-action="view-saved-session"][data-session-id="${CSS.escape(detail.id)}"]`
         : detail?.kind === "live-group"
           ? `[data-action="view-live-chrome-group"][data-group-id="${CSS.escape(detail.id)}"]`
           : detail?.kind === "protected-group"
             ? `[data-action="view-protected-group"][data-snapshot-id="${CSS.escape(detail.id)}"]`
             : "";

       if (selector) {
         document.querySelector(selector)?.focus();
       }
     });
   }

   async function showSavedSessionDetail(sessionId, originElement = null) {
     const [sessions, liveGroups] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups()
     ]);
     const session = sessions.find((item) => item.id === sessionId);

     if (!session) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const liveGroup = findLiveGroupForSession(session, liveGroups);
     const status = getSessionGroupStatus(session, liveGroup);

     await showCollectionDetail({
       kind: "session",
       id: session.id,
       title: session.name,
       tabs: createCollectionDetailTabs(session.tabs, session.id),
       statusLabel: status?.label || "",
       noticeKey: "",
       session,
       liveGroup
     }, originElement);
   }

   async function showLiveChromeGroupDetail(chromeGroupId, originElement = null) {
     const liveGroups = await getCurrentChromeGroups();
     const liveGroup = liveGroups.find(
       (group) => String(group.chromeGroupId) === String(chromeGroupId)
     );

     if (!liveGroup) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     await showCollectionDetail({
       kind: "live-group",
       id: String(liveGroup.chromeGroupId),
       title: liveGroup.title,
       color: liveGroup.color,
       tabs: createCollectionDetailTabs(
         liveGroup.tabs,
         `live-group-${liveGroup.chromeGroupId}`
       ),
       statusLabel: t("chromeGroupUnprotected"),
       noticeKey: "",
       liveGroup
     }, originElement);
   }

   async function showProtectedGroupDetail(snapshotId, originElement = null) {
     const [protectedGroups, liveGroups] = await Promise.all([
       getProtectedGroups(),
       getCurrentChromeGroups()
     ]);
     const snapshot = protectedGroups.find((group) => group.id === snapshotId);

     if (!snapshot) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);
     const diff = diffProtectedGroup(snapshot, liveGroup);
     const status = getProtectedGroupStatus(snapshot, liveGroup, diff);

     await showCollectionDetail({
       kind: "protected-group",
       id: snapshot.id,
       title: snapshot.title,
       color: snapshot.color,
       tabs: createCollectionDetailTabs(snapshot.tabs, snapshot.id),
       statusLabel: status.label,
       noticeKey: diff.missing
         ? "collectionDetailClosedNotice"
         : diff.changed && !diff.ignored
           ? "collectionDetailChangedNotice"
           : "",
       snapshot,
       liveGroup
     }, originElement);
   }

   async function getCollectionTargetWindowId() {
     const currentTab = await chrome.tabs.getCurrent();

     if (Number.isInteger(currentTab?.windowId)) {
       return currentTab.windowId;
     }

     const [activeTab] = await queryTabsWithMetadata({
       active: true,
       currentWindow: true
     });

     return Number.isInteger(activeTab?.windowId) ? activeTab.windowId : null;
   }

   async function createCollectionTabs(
     items,
     { active = false, allowDuplicates = false } = {}
   ) {
     const successes = [];
     const failures = [];
     const skipped = [];
     const windowId = await getCollectionTargetWindowId();
     const openState = allowDuplicates
       ? null
       : await getCurrentWindowTabsByUrl(windowId);

     for (const item of items) {
       const normalizedUrl = normalizeOpenTabUrl(item.url);
       const existingTab = openState?.byUrl.get(normalizedUrl);

       if (existingTab) {
         skipped.push({ item, tab: existingTab });
         continue;
       }

       try {
         const createdTab = await chrome.tabs.create({
           url: item.url,
           active,
           ...(Number.isInteger(windowId) ? { windowId } : {})
         });

         successes.push({ item, tab: createdTab });

         if (openState && normalizedUrl) {
           openState.byUrl.set(normalizedUrl, createdTab);
         }
       } catch (error) {
         console.warn("[tab-out] tab creation failed:", item.url, error);
         failures.push({ item, error });
       }
     }

     return { successes, failures, skipped, windowId };
   }

   async function createNativeCollectionGroup(items, options = {}) {
     const {
       title = t("untitledChromeGroup"),
       color = "grey",
       focusAfterOpen = false
     } = options;
     const result = await createCollectionTabs(items, {
       allowDuplicates: true
     });
     const tabIds = result.successes
       .map(({ tab }) => tab?.id)
       .filter(Number.isInteger);

     if (!tabIds.length) {
       return { ...result, chromeGroupId: null, groupError: null };
     }

     let chromeGroupId = null;
     let groupError = null;

     try {
       chromeGroupId = await chrome.tabs.group({ tabIds });
       await chrome.tabGroups.update(chromeGroupId, {
         title,
         color,
         collapsed: false
       });
     } catch (error) {
       console.warn("[tab-out] group creation failed:", error);
       groupError = error;
     }

     if (focusAfterOpen && tabIds[0]) {
       const firstTab = await chrome.tabs.update(tabIds[0], { active: true });

       if (Number.isInteger(firstTab?.windowId)) {
         await chrome.windows.update(firstTab.windowId, { focused: true });
       }
     }

     return { ...result, chromeGroupId, groupError };
   }

   async function updateProtectedGroupReference(snapshotId, chromeGroupId) {
     const protectedGroups = await getProtectedGroups();
     const updatedGroups = protectedGroups.map((group) => {
       if (group.id !== snapshotId) {
         return group;
       }

       return {
         ...group,
         chromeGroupId,
         ignoredSignature: "",
         updatedAt: new Date().toISOString()
       };
     });

     await saveProtectedGroups(updatedGroups);
   }

   function showCollectionOpenResult(result, { grouped = false } = {}) {
     const opened = result.successes.length;
     const skipped = result.skipped?.length || 0;
     const failed = result.failures.length + (result.groupError ? 1 : 0);

     if (!opened && skipped && !failed) {
       showToast(t("collectionDetailSelectedAlreadyOpen"));
       return;
     }

     if (!opened && failed) {
       showToast(t("collectionDetailOpenFailed"));
       return;
     }

     if (skipped || failed) {
       showToast(t(failed
         ? "collectionDetailOpenSummaryFailed"
         : "collectionDetailOpenSummary", {
         opened,
         skipped,
         failed
       }));
       return;
     }

     if (grouped) {
       showToast(t("collectionDetailOpenedGroup", { count: opened }));
       return;
     }

     showToast(t(opened === 1
       ? "collectionDetailOpenedOne"
       : "collectionDetailOpenedMany", { count: opened }));
   }

   async function resolveCurrentCollectionTab(detail, item) {
     if (!detail) {
       return null;
     }

     let liveGroup = null;

     if (detail.liveGroup || detail.kind !== "session") {
       const liveGroups = await getCurrentChromeGroups();

       if (detail.kind === "session") {
         liveGroup = findLiveGroupForSession(detail.session, liveGroups);
       } else if (detail.kind === "live-group") {
         liveGroup = liveGroups.find(
           (group) => String(group.chromeGroupId) === String(detail.id)
         );
       } else {
         liveGroup = findLiveGroupForSnapshot(detail.snapshot, liveGroups);
       }

       if (liveGroup) {
         if (detail.kind === "live-group" && Number.isInteger(item.id)) {
           const exactTab = liveGroup.tabs.find((tab) => tab.id === item.id);

           if (exactTab) {
             return exactTab;
           }
         }

         const normalizedGroupItemUrl = normalizeOpenTabUrl(item.url);
         const matchingGroupTab = liveGroup.tabs.find(
           (tab) => normalizeOpenTabUrl(tab.url) === normalizedGroupItemUrl
         );

         if (matchingGroupTab) {
           return matchingGroupTab;
         }
       }
     }

     const openState = await getCurrentWindowTabsByUrl(detail.targetWindowId);

     return openState.byUrl.get(normalizeOpenTabUrl(item.url)) || null;
   }

   async function openCollectionTabAndSwitch(tabKey) {
     const detail = collectionDetailState;
     const item = detail?.tabs.find((tab) => tab.key === tabKey);

     if (!detail || !item || detail.busy) {
       return;
     }

     detail.busy = true;
     updateCollectionDetailSelectionUi();

     try {
       const existingTab = await resolveCurrentCollectionTab(detail, item);

       if (existingTab?.id) {
         await chrome.tabs.update(existingTab.id, { active: true });

         if (Number.isInteger(existingTab.windowId)) {
           await chrome.windows.update(existingTab.windowId, { focused: true });
         }
         return;
       }

       const result = await createCollectionTabs([item], { active: true });

       if (result.skipped.length) {
         const existingTab = result.skipped[0].tab;

         await chrome.tabs.update(existingTab.id, { active: true });

         if (Number.isInteger(existingTab.windowId)) {
           await chrome.windows.update(existingTab.windowId, { focused: true });
         }
         return;
       }

       if (!result.successes.length) {
         showToast(t("collectionDetailOpenFailed"));
       }
     } finally {
       if (collectionDetailState === detail) {
         detail.busy = false;
         updateCollectionDetailSelectionUi();
       }
     }
   }

   async function openSelectedCollectionTabs() {
     const detail = collectionDetailState;

     if (!detail || detail.busy || !detail.selectedKeys.size) {
       return;
     }

     const items = detail.tabs.filter((tab) => detail.selectedKeys.has(tab.key));
     detail.busy = true;
     updateCollectionDetailSelectionUi();

     try {
       const result = await createCollectionTabs(items);

       result.successes.forEach(({ item }) => {
         detail.selectedKeys.delete(item.key);
       });
       result.skipped.forEach(({ item }) => {
         detail.selectedKeys.delete(item.key);
       });

       await refreshCollectionDetailOpenState();
       showCollectionOpenResult(result);
     } finally {
       if (collectionDetailState === detail) {
         detail.busy = false;
         updateCollectionDetailSelectionUi();
       }
     }
   }

   async function openAllCollectionTabs() {
     const detail = collectionDetailState;

     if (!detail || detail.busy || !detail.tabs.length) {
       return;
     }

     detail.busy = true;
     updateCollectionDetailSelectionUi();

     try {
       if (detail.kind === "session") {
         const result = await createCollectionTabs(detail.tabs);
         detail.selectedKeys.clear();
         await refreshCollectionDetailOpenState();
         showCollectionOpenResult(result);
         return;
       }

       let liveGroup = detail.liveGroup;

       if (detail.kind === "protected-group") {
         const currentGroups = await getCurrentChromeGroups();
         liveGroup = findLiveGroupForSnapshot(detail.snapshot, currentGroups);
       }

       const result = await createNativeCollectionGroup(detail.tabs, {
         title: detail.title,
         color: detail.color
       });

       if (
         detail.kind === "protected-group" &&
         !liveGroup &&
         Number.isInteger(result.chromeGroupId)
       ) {
         await updateProtectedGroupReference(detail.id, result.chromeGroupId);
         const refreshedGroups = await getCurrentChromeGroups();
         detail.liveGroup = findLiveGroupForSnapshot(
           detail.snapshot,
           refreshedGroups
         );
         const refreshedDiff = diffProtectedGroup(
           detail.snapshot,
           detail.liveGroup
         );
         const refreshedStatus = getProtectedGroupStatus(
           detail.snapshot,
           detail.liveGroup,
           refreshedDiff
         );

         detail.statusLabel = refreshedStatus.label;
         detail.noticeKey = refreshedDiff.missing
           ? "collectionDetailClosedNotice"
           : refreshedDiff.changed && !refreshedDiff.ignored
             ? "collectionDetailChangedNotice"
             : "";
         await renderSavedSessions();
       }

       detail.selectedKeys.clear();
       await refreshCollectionDetailOpenState();
       showCollectionOpenResult(result, {
         grouped: Number.isInteger(result.chromeGroupId)
       });
     } finally {
       if (collectionDetailState === detail) {
         detail.busy = false;
         updateCollectionDetailSelectionUi();
       }
     }
   }

   function trapCollectionDetailFocus(event) {
     const elements = getCollectionDetailElements();

     if (!elements.overlay || elements.overlay.hidden) {
       return;
     }

     const focusable = Array.from(
       elements.overlay.querySelectorAll(
         'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
       )
     ).filter((element) => !element.hidden);

     if (!focusable.length) {
       return;
     }

     const first = focusable[0];
     const last = focusable[focusable.length - 1];

     if (event.shiftKey && document.activeElement === first) {
       event.preventDefault();
       last.focus();
     } else if (!event.shiftKey && document.activeElement === last) {
       event.preventDefault();
       first.focus();
     }
   }

   function setupCollectionDetail() {
     const overlay = document.getElementById("collectionDetailOverlay");

     if (!overlay) {
       return;
     }

     overlay.addEventListener("click", (event) => {
       if (event.target === overlay) {
         closeCollectionDetail();
       }
     });
   }

   document.addEventListener("DOMContentLoaded", setupCollectionDetail);

   let draggedSavedSessionId = null;
   let suppressSavedSessionOpenUntil = 0;
   let savedSessionDragState = null;
   let openTabAssignmentDragState = null;
   let savedSessionTabDragState = null;
   let suppressedOpenTabFocusClick = null;
   let provisionalSessionState = null;
   let inlineSessionRenameState = null;
   let deferCollectionStorageRefreshUntil = 0;
   const expandedSessionIds = new Set();

   const SAVED_SESSION_DRAG_THRESHOLD = 7;
   const OPEN_TAB_DRAG_THRESHOLD = 7;
   const SAVED_SESSION_TAB_DRAG_THRESHOLD = 7;

   function createSessionDescriptorFromOpenTab(tab) {
     return {
       title: getTabDisplayTitle(tab) || tab.title || tab.url,
       url: tab.url,
       favIconUrl: tab.favIconUrl || getTabFavicon(tab.url, 16)
     };
   }

   function getOpenTabFromDragElement(element) {
     const tabId = Number(element?.dataset.tabId);
     const normalizedUrl = normalizeOpenTabUrl(element?.dataset.tabUrl);

     return unassignedOpenTabs.find(
       (tab) =>
         (Number.isInteger(tabId) && tab.id === tabId) ||
         normalizeOpenTabUrl(tab.url) === normalizedUrl
     ) || null;
   }

   function suppressNextOpenTabFocusClick(state) {
     const suppression = {
       sourceElement: state.sourceElement,
       tabId: String(state.tab?.id ?? ""),
       normalizedUrl: normalizeOpenTabUrl(state.tab?.url)
     };

     suppressedOpenTabFocusClick = suppression;
     setTimeout(() => {
       if (suppressedOpenTabFocusClick === suppression) {
         suppressedOpenTabFocusClick = null;
       }
     }, 250);
   }

   function consumeSuppressedOpenTabFocusClick(element) {
     const suppression = suppressedOpenTabFocusClick;

     if (!suppression) {
       return false;
     }

     const matches =
       element === suppression.sourceElement ||
       (
         suppression.tabId &&
         element?.dataset.tabId === suppression.tabId
       ) ||
       (
         suppression.normalizedUrl &&
         normalizeOpenTabUrl(element?.dataset.tabUrl) ===
           suppression.normalizedUrl
       );

     if (matches) {
       suppressedOpenTabFocusClick = null;
     }

     return matches;
   }

   function getSuggestedPairSessionName(tabs) {
     const domains = tabs.map((tab) => getTabDomain(tab.url)).filter(Boolean);

     if (domains.length === 2 && domains[0] === domains[1]) {
       return friendlyDomain(domains[0]) || t("newSessionDefaultName");
     }

     const labels = domains
       .map((domain) => friendlyDomain(domain))
       .filter(Boolean);

     return labels.length === 2
       ? `${labels[0]} + ${labels[1]}`
       : t("newSessionDefaultName");
   }

   function clearOpenTabDropTarget(state) {
     state?.target?.element?.classList.remove(
       "is-open-tab-drop-target",
       "is-open-tab-pair-target"
     );
     state?.target?.element?.removeAttribute("data-open-tab-drop-label");

     if (state) {
       state.target = null;
     }
   }

   function setOpenTabDropTarget(state, target) {
     if (
       state.target?.kind === target?.kind &&
       state.target?.element === target?.element
     ) {
       return;
     }

     clearOpenTabDropTarget(state);
     state.target = target;

     if (!target) {
       return;
     }

     const isSession = target.kind === "session";
     target.element.classList.add(
       isSession ? "is-open-tab-drop-target" : "is-open-tab-pair-target"
     );
     target.element.dataset.openTabDropLabel = t(
       isSession ? "dropAddToSession" : "dropCreatePair"
     );
   }

   function getOpenTabDropTarget(state, x, y) {
     const hovered = document.elementFromPoint(x, y);
     const sessionCard = hovered?.closest(
       '.saved-session-card[data-session-id]'
     );

     if (sessionCard) {
       return {
         kind: "session",
         element: sessionCard,
         sessionId: sessionCard.dataset.sessionId,
         sessionName: sessionCard.dataset.sessionName || ""
       };
     }

     const tabElement = hovered?.closest('[data-open-tab-draggable="true"]');

     if (!tabElement || tabElement === state.sourceElement) {
       return null;
     }

     const targetTab = getOpenTabFromDragElement(tabElement);

     if (
       !targetTab ||
       normalizeOpenTabUrl(targetTab.url) ===
         normalizeOpenTabUrl(state.tab.url)
     ) {
       return null;
     }

     return {
       kind: "tab",
       element: tabElement,
       tab: targetTab
     };
   }

   function createOpenTabDragGhost(tab) {
     const ghost = document.createElement("div");
     ghost.className = "open-tab-drag-ghost";

     const copy = document.createElement("span");
     copy.className = "open-tab-drag-copy";

     const label = document.createElement("small");
     label.textContent = t("assignTabDrag");

     const title = document.createElement("strong");
     title.textContent = getTabDisplayTitle(tab) || tab.url;

     copy.appendChild(label);
     copy.appendChild(title);
     const faviconUrl = tab.favIconUrl || getTabFavicon(tab.url, 16);

     if (faviconUrl) {
       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = faviconUrl;
       ghost.appendChild(favicon);
     }

     ghost.appendChild(copy);
     return ghost;
   }

   function startOpenTabPointerDrag(event, state) {
     const rect = state.sourceElement.getBoundingClientRect();

     state.dragging = true;
     state.offsetX = Math.min(event.clientX - rect.left, rect.width - 12);
     state.offsetY = Math.min(event.clientY - rect.top, rect.height - 12);
     state.ghost = createOpenTabDragGhost(state.tab);
     suppressSavedSessionOpenUntil = Date.now() + 600;

     if (state.sourceElement.setPointerCapture) {
       try {
         state.sourceElement.setPointerCapture(event.pointerId);
       } catch {}
     }

     state.sourceElement.classList.add("is-open-tab-drag-source");
     document.body.classList.add("is-assigning-open-tab");
     document
       .querySelectorAll('.saved-session-card[data-session-id]')
       .forEach((card) => card.classList.add("is-open-tab-drop-zone"));
     document.body.appendChild(state.ghost);
     updateOpenTabPointerDrag(event);
   }

   function updateOpenTabPointerDrag(event) {
     const state = openTabAssignmentDragState;

     if (!state?.dragging) {
       return;
     }

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     const ghostWidth = state.ghost.offsetWidth;
     const ghostHeight = state.ghost.offsetHeight;
     const left = Math.max(
       8,
       Math.min(
         event.clientX - state.offsetX,
         window.innerWidth - ghostWidth - 8
       )
     );
     const top = Math.max(
       8,
       Math.min(
         event.clientY - state.offsetY,
         window.innerHeight - ghostHeight - 8
       )
     );

     state.ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
     setOpenTabDropTarget(
       state,
       getOpenTabDropTarget(state, event.clientX, event.clientY)
     );
   }

   function cleanupOpenTabPointerDrag(event, state) {
     clearOpenTabDropTarget(state);
     state.sourceElement?.classList.remove("is-open-tab-drag-source");
     state.ghost?.remove();
     document.body.classList.remove("is-assigning-open-tab");
     document
       .querySelectorAll(".saved-session-card.is-open-tab-drop-zone")
       .forEach((card) => card.classList.remove("is-open-tab-drop-zone"));

     if (state.sourceElement?.releasePointerCapture) {
       try {
         state.sourceElement.releasePointerCapture(event.pointerId);
       } catch {}
     }
   }

   async function refreshDashboardCollections() {
     await Promise.all([
       renderDashboard(),
       renderSavedSessions()
     ]);
   }

   async function assignOpenTabToSession(tab, target, sourceElement) {
     sourceElement?.classList.add("is-open-tab-assignment-pending");
     deferCollectionStorageRefreshUntil = Date.now() + 400;
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:addTabToSession",
       tabId: tab.id,
       sessionId: target.sessionId
     });

     if (!response.ok) {
       sourceElement?.classList.remove("is-open-tab-assignment-pending");
       showToast(t("tabAssignmentFailed"));
       await refreshDashboardCollections();
       return;
     }

     if (response.code === "already_added") {
       sourceElement?.classList.remove("is-open-tab-assignment-pending");
       showToast(t("tabAlreadyAssigned"));
     } else {
       target.element?.classList.add("is-open-tab-drop-success");
       showToast(t("tabAssignedToSession", {
         name: target.sessionName
       }));
       await new Promise((resolve) => setTimeout(resolve, 220));
     }

     await refreshDashboardCollections();
   }

   async function beginProvisionalPairSession(sourceTab, targetTab) {
     const tabs = [
       createSessionDescriptorFromOpenTab(sourceTab),
       createSessionDescriptorFromOpenTab(targetTab)
     ];
     const suggestedName = getSuggestedPairSessionName(tabs);

     inlineSessionRenameState = null;
     provisionalSessionState = {
       tabs,
       suggestedName,
       name: suggestedName,
       committing: false,
       focusRequested: true
     };
     await refreshDashboardCollections();
   }

   async function finishOpenTabPointerDrag(event, { cancelled = false } = {}) {
     const state = openTabAssignmentDragState;

     if (!state || state.pointerId !== event.pointerId) {
       return;
     }

     openTabAssignmentDragState = null;
     const target = state.target;
     const wasDragging = state.dragging;

     if (wasDragging && !cancelled) {
       suppressNextOpenTabFocusClick(state);
     }

     cleanupOpenTabPointerDrag(event, state);

     if (!wasDragging || cancelled || !target) {
       return;
     }

     if (target.kind === "session") {
       await assignOpenTabToSession(
         state.tab,
         target,
         state.sourceElement
       );
       return;
     }

     await beginProvisionalPairSession(state.tab, target.tab);
   }

   async function commitProvisionalSession() {
     const state = provisionalSessionState;

     if (!state || state.committing) {
       return;
     }

     state.committing = true;
     deferCollectionStorageRefreshUntil = Date.now() + 300;
     const input = document.querySelector(
       '.session-inline-name-input[data-session-name-mode="provisional"]'
     );

     if (input) {
       input.disabled = true;
     }

     const name = state.name.trim() || state.suggestedName;
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:createSessionFromTabs",
       name,
       tabs: state.tabs
     });

     if (provisionalSessionState !== state) {
       return;
     }

     if (!response.ok) {
       state.committing = false;
       if (input) {
         input.disabled = false;
         input.focus();
       }
       showToast(t("sessionCreationFailed"));
       return;
     }

     provisionalSessionState = null;
     showToast(t("sessionCreatedFromTabs"));
     await refreshDashboardCollections();
   }

   async function cancelProvisionalSession() {
     if (!provisionalSessionState) {
       return;
     }

     provisionalSessionState = null;
     await refreshDashboardCollections();
   }

   async function startInlineSessionRename(sessionId, currentName) {
     if (!sessionId || provisionalSessionState) {
       return;
     }

     inlineSessionRenameState = {
       sessionId,
       originalName: currentName,
       value: currentName,
       saving: false,
       focusRequested: true
     };
     closeProtectedGroupMenus();
     await renderSavedSessions();
   }

   async function commitInlineSessionRename() {
     const state = inlineSessionRenameState;

     if (!state || state.saving) {
       return;
     }

     const name = state.value.trim();

     if (!name) {
       inlineSessionRenameState = null;
       await renderSavedSessions();
       return;
     }

     if (name === state.originalName) {
       inlineSessionRenameState = null;
       await renderSavedSessions();
       return;
     }

     state.saving = true;
     deferCollectionStorageRefreshUntil = Date.now() + 250;
     const input = document.querySelector(
       `.session-inline-name-input[data-session-id="${CSS.escape(
         state.sessionId
       )}"]`
     );

     if (input) {
       input.disabled = true;
     }

     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:renameSession",
       sessionId: state.sessionId,
       name
     });

     if (inlineSessionRenameState !== state) {
       return;
     }

     if (!response.ok) {
       state.saving = false;
       if (input) {
         input.disabled = false;
         input.focus();
       }
       showToast(t("sessionRenameFailed"));
       return;
     }

     inlineSessionRenameState = null;
     showToast(t("sessionRenamed"));
     await renderSavedSessions();
   }

   async function cancelInlineSessionRename() {
     if (!inlineSessionRenameState) {
       return;
     }

     inlineSessionRenameState = null;
     await renderSavedSessions();
   }

   async function toggleSessionInlineTabs(sessionId) {
     if (!sessionId || !isDashboardBehaviorEnabled("expandSessionTabs")) {
       return;
     }

     if (expandedSessionIds.has(sessionId)) {
       expandedSessionIds.delete(sessionId);
     } else {
       expandedSessionIds.add(sessionId);
     }

     await renderSavedSessions();
     requestAnimationFrame(() => {
       document
         .querySelector(
           `.saved-session-expand[data-session-id="${CSS.escape(sessionId)}"]`
         )
         ?.focus({ preventScroll: true });
     });
   }

   async function openSessionInlineTab(url) {
     const normalizedUrl = normalizeOpenTabUrl(url);
     const browserTabs = await queryTabsWithMetadata({});
     const existingTab = browserTabs.find(
       (tab) =>
         normalizeOpenTabUrl(tab.pendingUrl || tab.url) === normalizedUrl
     );

     if (existingTab?.id) {
       await chrome.tabs.update(existingTab.id, { active: true });

       if (Number.isInteger(existingTab.windowId)) {
         await chrome.windows.update(existingTab.windowId, { focused: true });
       }

       return;
     }

     const windowId = await getCollectionTargetWindowId();
     const createProperties = {
       url,
       active: true
     };

     if (Number.isInteger(windowId)) {
       createProperties.windowId = windowId;
     }

     try {
       await chrome.tabs.create(createProperties);
     } catch {
       showToast(t("collectionDetailOpenFailed"));
     }
   }

   function clearSavedSessionTabDropTarget(state) {
     state?.target?.element?.classList.remove(
       "is-saved-session-tab-drop-target"
     );
     state?.target?.element?.removeAttribute("data-session-tab-drop-label");

     if (state) {
       state.target = null;
     }
   }

   function setSavedSessionTabDropTarget(state, target) {
     if (
       state.target?.kind === target?.kind &&
       state.target?.element === target?.element
     ) {
       return;
     }

     clearSavedSessionTabDropTarget(state);
     state.target = target;

     if (!target) {
       return;
     }

     target.element.classList.add("is-saved-session-tab-drop-target");
     target.element.dataset.sessionTabDropLabel = t(
       target.kind === "session"
         ? "dropMoveToSession"
         : "dropMoveToUnassigned"
     );
   }

   function getSavedSessionTabDropTarget(state, x, y) {
     const hovered = document.elementFromPoint(x, y);
     const sessionCard = hovered?.closest(
       '.saved-session-card[data-session-id]'
     );

     if (
       sessionCard &&
       sessionCard.dataset.sessionId !== state.sourceSessionId
     ) {
       return {
         kind: "session",
         element: sessionCard,
         sessionId: sessionCard.dataset.sessionId,
         sessionName: sessionCard.dataset.sessionName || ""
       };
     }

     const unassignedSection = hovered?.closest("#openTabsSection");

     if (unassignedSection) {
       return {
         kind: "unassigned",
         element: unassignedSection
       };
     }

     return null;
   }

   function createSavedSessionTabDragGhost(state) {
     const ghost = document.createElement("div");
     ghost.className = "saved-session-tab-drag-ghost";
     const favicon = state.sourceElement.querySelector("img");

     if (favicon?.src) {
       const image = document.createElement("img");
       image.alt = "";
       image.src = favicon.src;
       ghost.appendChild(image);
     }

     const copy = document.createElement("span");
     const label = document.createElement("small");
     label.textContent = t("moveSavedTabLabel");
     const title = document.createElement("strong");
     title.textContent = state.title || state.url;
     copy.append(label, title);
     ghost.appendChild(copy);
     return ghost;
   }

   function startSavedSessionTabPointerDrag(event, state) {
     const rect = state.sourceElement.getBoundingClientRect();

     state.dragging = true;
     state.offsetX = Math.min(event.clientX - rect.left, rect.width - 12);
     state.offsetY = Math.min(event.clientY - rect.top, rect.height - 12);
     state.ghost = createSavedSessionTabDragGhost(state);
     suppressSavedSessionOpenUntil = Date.now() + 600;

     if (state.handle.setPointerCapture) {
       try {
         state.handle.setPointerCapture(event.pointerId);
       } catch {}
     }

     state.sourceElement.classList.add("is-saved-session-tab-drag-source");
     document.body.classList.add("is-moving-saved-session-tab");
     document
       .querySelectorAll(
         `.saved-session-card[data-session-id]:not([data-session-id="${CSS.escape(
           state.sourceSessionId
         )}"])`
       )
       .forEach((card) => card.classList.add("is-saved-session-tab-drop-zone"));
     document
       .getElementById("openTabsSection")
       ?.classList.add("is-saved-session-tab-drop-zone");
     document.body.appendChild(state.ghost);
     updateSavedSessionTabPointerDrag(event);
   }

   function updateSavedSessionTabPointerDrag(event) {
     const state = savedSessionTabDragState;

     if (!state?.dragging) {
       return;
     }

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     const ghostWidth = state.ghost.offsetWidth;
     const ghostHeight = state.ghost.offsetHeight;
     const left = Math.max(
       8,
       Math.min(
         event.clientX - state.offsetX,
         window.innerWidth - ghostWidth - 8
       )
     );
     const top = Math.max(
       8,
       Math.min(
         event.clientY - state.offsetY,
         window.innerHeight - ghostHeight - 8
       )
     );

     state.ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
     setSavedSessionTabDropTarget(
       state,
       getSavedSessionTabDropTarget(state, event.clientX, event.clientY)
     );
   }

   function cleanupSavedSessionTabPointerDrag(event, state) {
     clearSavedSessionTabDropTarget(state);
     state.sourceElement?.classList.remove(
       "is-saved-session-tab-drag-source"
     );
     state.ghost?.remove();
     document.body.classList.remove("is-moving-saved-session-tab");
     document
       .querySelectorAll(".is-saved-session-tab-drop-zone")
       .forEach((element) =>
         element.classList.remove("is-saved-session-tab-drop-zone")
       );

     if (state.handle?.releasePointerCapture) {
       try {
         state.handle.releasePointerCapture(event.pointerId);
       } catch {}
     }
   }

   function focusSavedSessionTransferOrigin(sessionId, url = "") {
     requestAnimationFrame(() => {
       const sessionSelector = CSS.escape(sessionId);
       const urlSelector = url ? CSS.escape(url) : "";
       const row = url
         ? document.querySelector(
             `.saved-session-inline-tab[data-session-id="${sessionSelector}"][data-tab-url="${urlSelector}"]`
           )
         : null;
       const target =
         row?.querySelector(".saved-session-tab-drag") ||
         document.querySelector(
           `.saved-session-expand[data-session-id="${sessionSelector}"]:not(:disabled)`
         ) ||
         document.querySelector(
           `.saved-session-open[data-session-id="${sessionSelector}"]`
         );

       target?.focus({ preventScroll: true });
     });
   }

   async function runSavedSessionTabTransfer(
     state,
     target,
     { removeFromAll = false } = {}
   ) {
     deferCollectionStorageRefreshUntil = Date.now() + 450;
     const runtimeTarget = target.kind === "session"
       ? {
           kind: "session",
           sessionId: target.sessionId
         }
       : {
           kind: "unassigned",
           removeFromAll,
           windowId: await getCollectionTargetWindowId()
         };
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:transferSessionTab",
       sourceSessionId: state.sourceSessionId,
       url: state.url,
       target: runtimeTarget
     });

     if (!response.ok) {
       showToast(
         t(
           response.code === "tab_creation_failed"
             ? "sessionTabBackgroundOpenFailed"
             : "sessionTabMoveFailed"
         )
       );
       await refreshDashboardCollections();
       focusSavedSessionTransferOrigin(state.sourceSessionId, state.url);
       return;
     }

     if (response.code === "confirmation_required") {
       showToast(
         t("unassignSharedTabConfirm", {
           count: response.assignedSessionCount
         }),
         {
           actionLabel: t("unassignFromAll"),
           cancelLabel: t("cancel"),
           duration: 0,
           onAction: async () => {
             await runSavedSessionTabTransfer(state, target, {
               removeFromAll: true
             });
           },
           onCancel: () => {
             focusSavedSessionTransferOrigin(
               state.sourceSessionId,
               state.url
             );
           }
         }
       );
       requestAnimationFrame(() => {
         document.getElementById("toastAction")?.focus();
       });
       return;
     }

     if (
       target.kind === "session" &&
       isDashboardBehaviorEnabled("expandSessionTabs")
     ) {
       expandedSessionIds.add(target.sessionId);
     }

     await refreshDashboardCollections();

     if (response.code === "already_moved") {
       showToast(t("sessionTabAlreadyMoved"));
     } else if (response.code === "already_in_target") {
       showToast(t("sessionTabRemovedFromSource"));
     } else if (response.code === "unassigned") {
       showToast(t("sessionTabMovedToUnassigned"));
     } else {
       showToast(t("sessionTabMoved", {
         name: target.sessionName || ""
       }));
     }

     focusSavedSessionTransferOrigin(
       target.kind === "session" ? target.sessionId : state.sourceSessionId,
       target.kind === "session" ? state.url : ""
     );
   }

   async function finishSavedSessionTabPointerDrag(
     event,
     { cancelled = false } = {}
   ) {
     const state = savedSessionTabDragState;

     if (!state || state.pointerId !== event.pointerId) {
       return;
     }

     savedSessionTabDragState = null;
     const target = state.target;
     const wasDragging = state.dragging;
     cleanupSavedSessionTabPointerDrag(event, state);

     if (!wasDragging || cancelled || !target) {
       return;
     }

     await runSavedSessionTabTransfer(state, target);
   }

   function focusPendingSessionNameInput() {
     const state = provisionalSessionState || inlineSessionRenameState;

     if (!state?.focusRequested) {
       return;
     }

     const input = document.querySelector(".session-inline-name-input");

     if (!input) {
       return;
     }

     state.focusRequested = false;
     requestAnimationFrame(() => {
       input.focus();
       input.select();
     });
   }

   function renderProvisionalSessionCard() {
     const state = provisionalSessionState;

     if (!state) {
       return null;
     }

     const card = document.createElement("div");
     card.className = "saved-session-card is-provisional-session";

     const body = document.createElement("div");
     body.className = "saved-session-open";

     const input = document.createElement("input");
     input.type = "text";
     input.className = "session-inline-name-input";
     input.value = state.name;
     input.disabled = state.committing;
     input.dataset.sessionNameMode = "provisional";
     input.setAttribute("aria-label", t("createSessionTitle"));

     const meta = document.createElement("span");
     meta.className = "saved-session-meta";
     meta.textContent = plural(
       state.tabs.length,
       "sessionTabCount",
       "sessionTabsCount"
     );

     const favicons = document.createElement("span");
     favicons.className = "saved-session-favicons";
     appendSessionFavicons(favicons, state.tabs);

     body.appendChild(input);
     body.appendChild(meta);
     body.appendChild(favicons);
     card.appendChild(body);
     return card;
   }

   function getSavedSessionCards(container) {
     return Array.from(
       container.querySelectorAll('.saved-session-card[data-session-draggable="true"]')
     ).filter((card) => !card.classList.contains('is-drag-source'));
   }

   function getSavedSessionInsertBefore(container, x, y) {
     const cards = getSavedSessionCards(container);

     return cards.find((card) => {
       const rect = card.getBoundingClientRect();
       const isSameRow = y >= rect.top && y <= rect.bottom;

       if (isSameRow) {
         return x < rect.left + rect.width / 2;
       }

       return y < rect.top + rect.height / 2;
     }) || null;
   }

   function getSavedSessionDomOrder(list) {
     if (!list) return [];

     return Array.from(
       list.querySelectorAll('.saved-session-card[data-session-draggable="true"]')
     ).map((card) => card.dataset.sessionId).filter(Boolean);
   }

   function hasSavedSessionOrderChanged(before, after) {
     if (before.length !== after.length) return true;
     return before.some((id, index) => id !== after[index]);
   }

   function startSavedSessionPointerDrag(event, state) {
     const { card, list } = state;
     const rect = card.getBoundingClientRect();

     state.dragging = true;
     draggedSavedSessionId = card.dataset.sessionId;
     suppressSavedSessionOpenUntil = Date.now() + 500;

     if (card.setPointerCapture) {
       try { card.setPointerCapture(event.pointerId); } catch {}
     }

     const placeholder = document.createElement('div');
     placeholder.className = 'saved-session-card saved-session-placeholder';
     placeholder.style.width = `${rect.width}px`;
     placeholder.style.height = `${rect.height}px`;

     const ghost = card.cloneNode(true);
     ghost.classList.add('saved-session-drag-ghost');
     ghost.classList.remove('is-expanded');
     ghost.querySelector('.saved-session-inline-tabs')?.remove();
     ghost.querySelector('.saved-session-expand')?.remove();
     ghost.style.width = `${rect.width}px`;
     ghost.style.height = `${card.querySelector('.saved-session-summary')?.offsetHeight || rect.height}px`;
     ghost.style.left = "0px";
     ghost.style.top = "0px";

     state.offsetX = event.clientX - rect.left;
     state.offsetY = event.clientY - rect.top;
     state.placeholder = placeholder;
     state.ghost = ghost;

     list.classList.add('is-reordering');
     card.classList.add('is-drag-source');
     list.insertBefore(placeholder, card);
     card.remove();
     document.body.appendChild(ghost);

     updateSavedSessionPointerDrag(event);
   }

   function updateSavedSessionPointerDrag(event) {
     const state = savedSessionDragState;

     if (!state || !state.dragging) {
       return;
     }

     const { list, placeholder, ghost, offsetX, offsetY } = state;

     if (ghost) {
       ghost.style.transform = `translate3d(${event.clientX - offsetX}px, ${event.clientY - offsetY}px, 0)`;
     }

     if (!list || !placeholder) {
       return;
     }

     const insertBefore = getSavedSessionInsertBefore(list, event.clientX, event.clientY);

     if (insertBefore && insertBefore !== placeholder) {
       list.insertBefore(placeholder, insertBefore);
     } else if (!insertBefore) {
       list.appendChild(placeholder);
     }
   }

   async function finishSavedSessionPointerDrag(event) {
     const state = savedSessionDragState;

     if (!state) {
       return;
     }

     const { card, list, placeholder, ghost, initialOrder, dragging } = state;

     savedSessionDragState = null;

     if (card?.releasePointerCapture) {
       try { card.releasePointerCapture(event.pointerId); } catch {}
     }

     if (!dragging) {
       return;
     }

     suppressSavedSessionOpenUntil = Date.now() + 600;

     if (placeholder && list) {
       list.insertBefore(card, placeholder);
       placeholder.remove();
     }

     if (ghost) {
       ghost.remove();
     }

     if (card) {
       card.classList.remove('is-drag-source');
     }

     if (list) {
       list.classList.remove('is-reordering');
     }

     draggedSavedSessionId = null;

     const finalOrder = getSavedSessionDomOrder(list);

     if (hasSavedSessionOrderChanged(initialOrder, finalOrder)) {
       await saveCurrentSavedSessionOrder();
       showToast(t('sessionsReordered'));
     }
   }

   async function saveCurrentSavedSessionOrder() {
     const list = document.getElementById("savedSessionsList");

     if (!list || savedSessionsViewMode !== "sessions") {
       return;
     }

     const orderedIds = getSavedSessionDomOrder(list);

     if (orderedIds.length === 0) {
       return;
     }

     const sessions = await getSavedSessions();
     const byId = new Map(sessions.map((session) => [session.id, session]));
     const reorderedSessions = orderedIds
       .map((id) => byId.get(id))
       .filter(Boolean);

     sessions.forEach((session) => {
       if (!orderedIds.includes(session.id)) {
         reorderedSessions.push(session);
       }
     });

     await saveSavedSessions(reorderedSessions);
   }

   let savedSessionsViewMode = "sessions";

   function findLiveGroupForSession(session, liveGroups) {
     if (!session?.groupLink) {
       return null;
     }

     const exactIdMatch = liveGroups.find(
       (group) => group.chromeGroupId === session.groupLink.chromeGroupId
     );

     if (exactIdMatch) {
       return exactIdMatch;
     }

     const exactSignatureMatches = liveGroups.filter(
       (group) =>
         getGroupSignature(group) === session.groupLink.lastReviewedSignature
     );

     if (exactSignatureMatches.length === 1) {
       return exactSignatureMatches[0];
     }

     const expectedTitle = session.groupTemplate?.title || session.name || "";
     const comparableSession = {
       title: expectedTitle,
       color: session.groupTemplate?.color || "grey",
       tabs: session.tabs || []
     };
     const safeMatches = liveGroups.filter(
       (group) =>
         (group.title || "") === expectedTitle &&
         getUrlOverlapScore(comparableSession, group) >= 0.65
     );

     return safeMatches.length === 1 ? safeMatches[0] : null;
   }

   function getSessionGroupStatus(session, liveGroup) {
     if (!session.groupLink) {
       return null;
     }

     if (!liveGroup) {
       return {
         key: "closed",
         label: t("groupClosedStatus"),
         className: "is-group-closed"
       };
     }

     const liveSignature = getGroupSignature(liveGroup);
     const savedSignature = getGroupSignature({
       title: session.groupTemplate?.title || session.name || "",
       color: session.groupTemplate?.color || "grey",
       tabs: session.tabs || []
     });

     if (
       liveSignature !== session.groupLink.lastReviewedSignature ||
       liveSignature !== savedSignature
     ) {
       return {
         key: "changed",
         label: t("groupChangedStatus"),
         className: "is-group-changed"
       };
     }

     return {
       key: "open",
       label: t("groupOpenStatus"),
       className: "is-group-open"
     };
   }

   function appendSessionFavicons(container, tabs) {
     (tabs || []).slice(0, 4).forEach((tab) => {
       const favicon = tab.favIconUrl || getTabFavicon(tab.url, 16);

       if (!favicon) {
         return;
       }

       const image = document.createElement("img");
       image.alt = "";
       image.src = favicon;
       container.appendChild(image);
     });

     if ((tabs || []).length > 4) {
       const more = document.createElement("span");
       more.className = "saved-session-more";
       more.textContent = `+${tabs.length - 4}`;
       container.appendChild(more);
     }
   }

   function getOpenTabForSessionDescriptor(descriptor, browserTabs = []) {
     const normalizedUrl = normalizeOpenTabUrl(descriptor?.url);

     return browserTabs.find(
       (tab) =>
         normalizeOpenTabUrl(tab.pendingUrl || tab.url) === normalizedUrl
     ) || null;
   }

   function createSavedSessionInlineTabs(session, browserTabs = []) {
     const panel = document.createElement("div");
     const panelId = `saved-session-tabs-${session.id}`;
     const expanded = expandedSessionIds.has(session.id);

     panel.id = panelId;
     panel.className = "saved-session-inline-tabs";
     panel.dataset.sessionId = session.id;
     panel.setAttribute("role", "list");
     panel.setAttribute("aria-label", t("sessionTabsList", {
       name: session.name
     }));
     panel.hidden = !expanded;

     (session.tabs || []).forEach((tab) => {
       const existingTab = getOpenTabForSessionDescriptor(tab, browserTabs);
       const row = document.createElement("div");
       row.className = "saved-session-inline-tab";
       row.dataset.sessionId = session.id;
       row.dataset.tabUrl = tab.url;
       row.setAttribute("role", "listitem");

       if (existingTab) {
         row.classList.add("is-open");
       }

       if (isDashboardBehaviorEnabled("dragSessionTabs")) {
         row.classList.add("has-drag-handle");
         const dragHandle = document.createElement("button");
         dragHandle.type = "button";
         dragHandle.className = "saved-session-tab-drag";
         dragHandle.dataset.sessionTabDragHandle = "true";
         dragHandle.dataset.sessionId = session.id;
         dragHandle.dataset.sessionName = session.name;
         dragHandle.dataset.tabUrl = tab.url;
         dragHandle.title = t("moveSavedTab", {
           title: tab.title || tab.url
         });
         dragHandle.setAttribute("aria-label", dragHandle.title);
         dragHandle.innerHTML = "<span></span><span></span><span></span>";
         row.appendChild(dragHandle);
       }

       const openButton = document.createElement("button");
       openButton.type = "button";
       openButton.className = "saved-session-inline-tab-open";
       openButton.dataset.action = "open-session-inline-tab";
       openButton.dataset.tabUrl = tab.url;
       openButton.dataset.sessionId = session.id;
       openButton.title = existingTab
         ? t("collectionDetailSwitchToTab")
         : t("collectionDetailOpenAndSwitch");

       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = tab.favIconUrl || getTabFavicon(tab.url, 16);
       favicon.addEventListener("error", () => {
         favicon.hidden = true;
       }, { once: true });

       const information = document.createElement("span");
       information.className = "saved-session-inline-tab-info";
       const title = document.createElement("span");
       title.className = "saved-session-inline-tab-title";
       title.textContent = tab.title || tab.url;
       const domain = document.createElement("span");
       domain.className = "saved-session-inline-tab-domain";
       domain.textContent = getTabDomain(tab.url) || tab.url;
       information.append(title, domain);

       if (existingTab) {
         const badge = document.createElement("span");
         badge.className = "saved-session-inline-tab-badge";
         badge.textContent = t("collectionDetailAlreadyOpen");
         information.appendChild(badge);
       }

       openButton.append(favicon, information);
       row.appendChild(openButton);
       panel.appendChild(row);
     });

     return panel;
   }

   function renderUnifiedSessionCard(session, liveGroups, browserTabs = []) {
     const liveGroup = findLiveGroupForSession(session, liveGroups);
     const status = getSessionGroupStatus(session, liveGroup);
     const menuKey = `session-${session.id}`;
     const card = document.createElement("div");
     const expanded = expandedSessionIds.has(session.id);

     card.className = [
       "saved-session-card",
       expanded ? "is-expanded" : "",
       session.groupTemplate ? "has-group-template" : "",
       session.groupLink ? "has-group-link" : "",
       status?.className || ""
     ].filter(Boolean).join(" ");
     card.dataset.sessionId = session.id;
     card.dataset.sessionName = session.name;
     card.dataset.sessionDraggable = "true";
     card.draggable = false;

     const summary = document.createElement("div");
     summary.className = "saved-session-summary";

     const openButton = document.createElement("button");
     openButton.type = "button";
     openButton.className = "saved-session-open";
     openButton.dataset.action = "view-saved-session";
     openButton.dataset.sessionId = session.id;

     if (session.groupTemplate && session.groupLink) {
       const colorDot = document.createElement("span");
       colorDot.className = "chrome-group-color-dot";
       colorDot.style.setProperty(
         "--chrome-group-color",
         CHROME_GROUP_COLORS[session.groupTemplate.color] ||
           CHROME_GROUP_COLORS.grey
       );
       colorDot.title = t("chromeGroupNativeColor");
       openButton.appendChild(colorDot);
     }

     const title = document.createElement("span");
     title.className = "saved-session-title";
     title.textContent = session.name;
     title.dataset.action = "rename-session-inline";
     title.dataset.sessionId = session.id;
     title.dataset.sessionName = session.name;
     title.title = t("renameSession");

     const meta = document.createElement("span");
     meta.className = "saved-session-meta";
     meta.textContent = [
       plural(session.tabs.length, "sessionTabCount", "sessionTabsCount"),
       status?.label || ""
     ].filter(Boolean).join(" · ");

     const favicons = document.createElement("span");
     favicons.className = "saved-session-favicons";
     appendSessionFavicons(favicons, session.tabs);

     openButton.appendChild(title);
     openButton.appendChild(meta);
     openButton.appendChild(favicons);

     const menuButton = document.createElement("button");
     menuButton.type = "button";
     menuButton.className = "saved-session-edit";
     menuButton.textContent = "⋯";
     menuButton.title = t("sessionActions");
     menuButton.setAttribute("aria-label", t("sessionActions"));
     menuButton.dataset.action = "toggle-protected-group-menu";
     menuButton.dataset.menuKey = menuKey;

     const renameButton = document.createElement("button");
     renameButton.type = "button";
     renameButton.className = "saved-session-rename";
     renameButton.textContent = "✎";
     renameButton.title = t("renameSession");
     renameButton.setAttribute("aria-label", t("renameSession"));
     renameButton.dataset.action = "rename-session-inline";
     renameButton.dataset.sessionId = session.id;
     renameButton.dataset.sessionName = session.name;

     const menu = document.createElement("div");
     menu.className = "protected-group-menu";
     menu.dataset.menuKey = menuKey;
     menu.hidden = true;
     menu.appendChild(createProtectedMenuButton(
       t("editSession"),
       "edit-saved-session",
       { sessionId: session.id }
     ));
     menu.appendChild(createProtectedMenuButton(
       liveGroup ? t("showOpenGroup") : t("openAsGroup"),
       "open-session-as-group",
       { sessionId: session.id }
     ));
     menu.appendChild(createProtectedMenuButton(
       t("openGroupCopy"),
       "open-session-group-copy",
       { sessionId: session.id }
     ));

     if (liveGroup) {
       menu.appendChild(createProtectedMenuButton(
         t("reviewGroupChanges"),
         "review-session-group",
         { sessionId: session.id }
       ));
     }

     menu.appendChild(createProtectedMenuButton(
       session.groupLink ? t("changeGroup") : t("connectGroup"),
       "connect-session-group",
       { sessionId: session.id }
     ));

     if (session.groupLink) {
       menu.appendChild(createProtectedMenuButton(
         t("disconnectGroup"),
         "disconnect-session-group",
         { sessionId: session.id }
       ));
     }

     menu.appendChild(createProtectedMenuButton(
       t("delete"),
       "delete-saved-session-direct",
       { sessionId: session.id },
       "danger"
     ));

     summary.appendChild(openButton);
     const renameState = inlineSessionRenameState?.sessionId === session.id
       ? inlineSessionRenameState
       : null;

     if (renameState) {
       title.hidden = true;
       renameButton.hidden = true;
       card.classList.add("is-renaming-session");

       const input = document.createElement("input");
       input.type = "text";
       input.className = "session-inline-name-input";
       input.value = renameState.value;
       input.disabled = renameState.saving;
       input.dataset.sessionNameMode = "rename";
       input.dataset.sessionId = session.id;
       input.setAttribute("aria-label", t("renameSession"));
       summary.appendChild(input);
     }

     summary.appendChild(renameButton);
     summary.appendChild(menuButton);
     summary.appendChild(menu);

     if (isDashboardBehaviorEnabled("expandSessionTabs")) {
       const expandButton = document.createElement("button");
       const panelId = `saved-session-tabs-${session.id}`;

       expandButton.type = "button";
       expandButton.className = "saved-session-expand";
       expandButton.dataset.action = "toggle-session-inline-tabs";
       expandButton.dataset.sessionId = session.id;
       expandButton.disabled = session.tabs.length === 0;
       expandButton.setAttribute("aria-expanded", String(expanded));
       expandButton.setAttribute("aria-controls", panelId);
       expandButton.title = t(
         expanded ? "hideSessionTabs" : "showSessionTabs"
       );
       expandButton.setAttribute("aria-label", expandButton.title);
       expandButton.innerHTML = `
         <svg viewBox="0 0 20 20" aria-hidden="true">
           <path d="m5.5 7.5 4.5 4.5 4.5-4.5"></path>
         </svg>
       `;
       summary.appendChild(expandButton);
     }

     card.appendChild(summary);

     if (
       isDashboardBehaviorEnabled("expandSessionTabs") &&
       session.tabs.length > 0
     ) {
       card.appendChild(createSavedSessionInlineTabs(session, browserTabs));
     }

     return card;
   }

   async function renderSavedSessions() {
     const section = document.getElementById("savedSessionsSection");
     const list = document.getElementById("savedSessionsList");

     if (!section || !list) {
       return;
     }

     if (
       openTabAssignmentDragState?.dragging ||
       savedSessionTabDragState?.dragging
     ) {
       return;
     }

     if (
       document.activeElement?.classList.contains("session-inline-name-input") &&
       (provisionalSessionState || inlineSessionRenameState)
     ) {
       return;
     }

     section.hidden = false;
     savedSessionsViewMode = "sessions";

     const [sessions, liveGroups, browserTabs] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups(),
       queryTabsWithMetadata({})
     ]);

     const sessionIds = new Set(sessions.map((session) => session.id));
     expandedSessionIds.forEach((sessionId) => {
       if (!sessionIds.has(sessionId)) {
         expandedSessionIds.delete(sessionId);
       }
     });

     list.innerHTML = "";

     if (sessions.length === 0 && !provisionalSessionState) {
       list.innerHTML = `
         <div class="saved-sessions-empty">
           ${t("noSavedSession")}
         </div>
       `;
       return;
     }

     sessions.forEach((session) => {
       list.appendChild(
         renderUnifiedSessionCard(session, liveGroups, browserTabs)
       );
     });

     const provisionalCard = renderProvisionalSessionCard();

     if (provisionalCard) {
       list.appendChild(provisionalCard);
     }

     focusPendingSessionNameInput();
   }

   let groupImportState = null;
   let groupImportReturnFocus = null;

   function getGroupImportElements() {
     return {
       modal: document.getElementById("groupImportModal"),
       title: document.getElementById("groupImportTitle"),
       subtitle: document.getElementById("groupImportSubtitle"),
       body: document.getElementById("groupImportBody"),
       back: document.getElementById("groupImportBackBtn"),
       summary: document.getElementById("groupImportSummary"),
       save: document.getElementById("groupImportSaveBtn")
     };
   }

   function getSessionLinkedToGroup(group, sessions, liveGroups = [group]) {
     return sessions.find((session) => {
       const matchedGroup = findLiveGroupForSession(session, liveGroups);
       return matchedGroup?.chromeGroupId === group.chromeGroupId;
     }) || null;
   }

   function setGroupImportStep(step) {
     if (!groupImportState) {
       return;
     }

     if (groupImportState.step && groupImportState.step !== step) {
       groupImportState.history.push(groupImportState.step);
     }

     groupImportState.step = step;
     renderGroupImportModal();
   }

   function closeGroupImportModal() {
     const elements = getGroupImportElements();
     const returnFocus = groupImportReturnFocus;

     if (elements.modal) {
       elements.modal.hidden = true;
     }

     groupImportState = null;
     groupImportReturnFocus = null;

     requestAnimationFrame(() => {
       if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
         returnFocus.focus();
       }
     });
   }

   function createGroupImportChoice({
     title,
     meta = "",
     action,
     dataset = {},
     color = ""
   }) {
     const button = document.createElement("button");
     button.type = "button";
     button.className = "group-import-choice";
     button.dataset.action = action;

     Object.entries(dataset).forEach(([key, value]) => {
       button.dataset[key] = String(value);
     });

     if (color) {
       const dot = document.createElement("span");
       dot.className = "chrome-group-color-dot";
       dot.style.setProperty(
         "--chrome-group-color",
         CHROME_GROUP_COLORS[color] || CHROME_GROUP_COLORS.grey
       );
       button.appendChild(dot);
     }

     const copy = document.createElement("span");
     copy.className = "group-import-choice-copy";

     const heading = document.createElement("strong");
     heading.textContent = title;
     copy.appendChild(heading);

     if (meta) {
       const description = document.createElement("span");
       description.textContent = meta;
       copy.appendChild(description);
     }

     button.appendChild(copy);
     return button;
   }

   function buildGroupReviewTabs(session, group) {
     const tabsByUrl = new Map();

     (session?.tabs || []).forEach((tab) => {
       const normalizedUrl = normalizeOpenTabUrl(tab.url);

       if (!normalizedUrl || tabsByUrl.has(normalizedUrl)) {
         return;
       }

       tabsByUrl.set(normalizedUrl, {
         key: normalizedUrl,
         title: tab.title || tab.url,
         url: tab.url,
         favIconUrl: tab.favIconUrl || "",
         inSession: true,
         inGroup: false
       });
     });

     (group.tabs || []).forEach((tab) => {
       const normalizedUrl = normalizeOpenTabUrl(tab.url);

       if (!normalizedUrl) {
         return;
       }

       const existing = tabsByUrl.get(normalizedUrl);

       if (existing) {
         existing.inGroup = true;
         existing.favIconUrl = existing.favIconUrl || tab.favIconUrl || "";
         return;
       }

       tabsByUrl.set(normalizedUrl, {
         key: normalizedUrl,
         title: tab.title || tab.url,
         url: tab.url,
         favIconUrl: tab.favIconUrl || "",
         inSession: false,
         inGroup: true
       });
     });

     return Array.from(tabsByUrl.values());
   }

   function updateGroupImportSummary() {
     const elements = getGroupImportElements();
     const state = groupImportState;

     if (!state || state.step !== "review") {
       return;
     }

     const selected = state.selectedKeys;
     const kept = state.reviewTabs.filter(
       (tab) => tab.inSession && selected.has(tab.key)
     ).length;
     const added = state.reviewTabs.filter(
       (tab) => !tab.inSession && selected.has(tab.key)
     ).length;
     const removed = state.reviewTabs.filter(
       (tab) => tab.inSession && !selected.has(tab.key)
     ).length;
     const nameInput = document.getElementById("groupImportNameInput");

     state.sessionName = nameInput?.value.trim() || state.sessionName || "";

     if (elements.summary) {
       elements.summary.textContent = t("groupReviewSummary", {
         kept,
         added,
         removed
       });
     }

     if (elements.save) {
       elements.save.disabled =
         !state.sessionName ||
         selected.size === 0;
     }
   }

   function prepareGroupReview(session, group) {
     if (!groupImportState) {
       return;
     }

     groupImportState.sessionId = session?.id || null;
     groupImportState.sessionName = session?.name || group.title;
     groupImportState.groupId = group.chromeGroupId;
     groupImportState.reviewTabs = buildGroupReviewTabs(session, group);
     groupImportState.selectedKeys = new Set(
       groupImportState.reviewTabs.map((tab) => tab.key)
     );
     setGroupImportStep("review");
   }

   function renderGroupImportGroupList(elements, state) {
     elements.subtitle.textContent = t("chooseGroupSubtitle");

     if (!state.liveGroups.length) {
       const empty = document.createElement("div");
       empty.className = "saved-sessions-empty";
       empty.textContent = t("noChromeGroupsForImport");
       elements.body.appendChild(empty);
       return;
     }

     state.liveGroups.forEach((group) => {
       const linkedSession = getSessionLinkedToGroup(
         group,
         state.sessions,
         state.liveGroups
       );
       const fixedSessionOwnsGroup =
         state.fixedSessionId &&
         linkedSession?.id === state.fixedSessionId;
       const groupMeta = [
         plural(
           group.tabs.length,
           "chromeGroupTabCount",
           "chromeGroupTabsCount"
         ),
         group.windowId === state.currentWindowId
           ? t("groupCurrentWindow")
           : t("groupOtherWindow"),
         linkedSession
           ? t("linkedToSession", { name: linkedSession.name })
           : ""
       ].filter(Boolean).join(" · ");
       const choice = createGroupImportChoice({
         title: group.title || t("untitledChromeGroup"),
         meta: groupMeta,
         action: linkedSession && !fixedSessionOwnsGroup
           ? "review-linked-session-group"
           : "select-group-import",
         dataset: {
           groupId: group.chromeGroupId,
           ...(linkedSession ? { sessionId: linkedSession.id } : {})
         },
         color: group.color
       });

       elements.body.appendChild(choice);
     });
   }

   function renderGroupImportMode(elements, state) {
     const group = state.liveGroups.find(
       (item) => item.chromeGroupId === state.groupId
     );

     elements.subtitle.textContent = t("chooseGroupModeSubtitle");
     elements.body.appendChild(createGroupImportChoice({
       title: t("importAsNewSession"),
       meta: group?.title || "",
       action: "create-session-from-group"
     }));
     elements.body.appendChild(createGroupImportChoice({
       title: t("updateExistingSession"),
       meta: plural(
         group?.tabs?.length || 0,
         "chromeGroupTabCount",
         "chromeGroupTabsCount"
       ),
       action: "choose-session-for-group"
     }));
   }

   function renderGroupImportSessionList(elements, state) {
     elements.subtitle.textContent = t("chooseSessionSubtitle");

     if (!state.sessions.length) {
       const empty = document.createElement("div");
       empty.className = "saved-sessions-empty";
       empty.textContent = t("noSavedSession");
       elements.body.appendChild(empty);
       return;
     }

     state.sessions.forEach((session) => {
       elements.body.appendChild(createGroupImportChoice({
         title: session.name,
         meta: plural(
           session.tabs.length,
           "sessionTabCount",
           "sessionTabsCount"
         ),
         action: "select-session-for-group",
         dataset: { sessionId: session.id },
         color: session.groupTemplate?.color || ""
       }));
     });
   }

   function renderGroupImportReview(elements, state) {
     elements.subtitle.textContent = t("reviewGroupSubtitle");

     const nameLabel = document.createElement("label");
     nameLabel.className = "session-name-label";

     const nameText = document.createElement("span");
     nameText.textContent = t("sessionNameLabel");

     const nameInput = document.createElement("input");
     nameInput.type = "text";
     nameInput.id = "groupImportNameInput";
     nameInput.value = state.sessionName;
     nameInput.autocomplete = "off";
     nameInput.addEventListener("input", updateGroupImportSummary);

     nameLabel.appendChild(nameText);
     nameLabel.appendChild(nameInput);
     elements.body.appendChild(nameLabel);

     const toolbar = document.createElement("div");
     toolbar.className = "session-tabs-toolbar";
     toolbar.appendChild(createProtectedMenuButton(
       t("selectAll"),
       "select-all-group-review"
     ));
     toolbar.appendChild(createProtectedMenuButton(
       t("clearAll"),
       "clear-group-review"
     ));
     elements.body.appendChild(toolbar);

     const list = document.createElement("div");
     list.className = "group-review-tabs";

     state.reviewTabs.forEach((tab) => {
       const row = document.createElement("label");
       row.className = "session-tab-row group-review-tab";
       row.dataset.tabUrl = tab.url;

       const checkbox = document.createElement("input");
       checkbox.type = "checkbox";
       checkbox.checked = state.selectedKeys.has(tab.key);
       checkbox.dataset.groupReviewKey = tab.key;

       const image = document.createElement("img");
       image.alt = "";
       image.src = tab.favIconUrl || getTabFavicon(tab.url, 16);

       const info = document.createElement("span");
       info.className = "session-tab-info";

       const title = document.createElement("span");
       title.className = "session-tab-title";
       title.textContent = tab.title || tab.url;

       const meta = document.createElement("span");
       meta.className = "session-tab-url";
       meta.textContent = tab.inSession && tab.inGroup
         ? t("groupTabInBoth")
         : tab.inGroup
           ? t("groupTabNew")
           : t("groupTabSessionOnly");

       info.appendChild(title);
       info.appendChild(meta);
       row.appendChild(checkbox);
       row.appendChild(image);
       row.appendChild(info);
       list.appendChild(row);
     });

     elements.body.appendChild(list);
     elements.save.hidden = false;
     updateGroupImportSummary();
   }

   function renderGroupImportModal() {
     const elements = getGroupImportElements();
     const state = groupImportState;

     if (!state || !elements.modal || !elements.body) {
       return;
     }

     elements.title.textContent = t("importGroupTitle");
     elements.body.innerHTML = "";
     elements.summary.textContent = "";
     elements.save.hidden = true;
     elements.back.hidden = state.history.length === 0;

     if (state.step === "groups") {
       renderGroupImportGroupList(elements, state);
     } else if (state.step === "mode") {
       renderGroupImportMode(elements, state);
     } else if (state.step === "sessions") {
       renderGroupImportSessionList(elements, state);
     } else if (state.step === "review") {
       renderGroupImportReview(elements, state);
     }
   }

   async function openGroupImportModal({ sessionId = null } = {}) {
     const elements = getGroupImportElements();

     if (!elements.modal) {
       return;
     }

     const [sessions, liveGroups, currentWindowId] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups(),
       getCollectionTargetWindowId()
     ]);

     groupImportState = {
       step: "groups",
       history: [],
       fixedSessionId: sessionId,
       sessions,
       liveGroups,
       currentWindowId,
       groupId: null,
       sessionId: sessionId,
       sessionName: "",
       reviewTabs: [],
       selectedKeys: new Set()
     };

     groupImportReturnFocus = document.activeElement;
     elements.modal.hidden = false;
     renderGroupImportModal();
     requestAnimationFrame(() => {
       elements.body.querySelector("button")?.focus();
     });
   }

   async function reviewSessionLinkedGroup(sessionId) {
     const [sessions, liveGroups, currentWindowId] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups(),
       getCollectionTargetWindowId()
     ]);
     const session = sessions.find((item) => item.id === sessionId);
     const group = session
       ? findLiveGroupForSession(session, liveGroups)
       : null;

     if (!session || !group) {
       await openGroupImportModal({ sessionId });
       return;
     }

     const elements = getGroupImportElements();
     if (elements.modal.hidden) {
       groupImportReturnFocus = document.activeElement;
     }
     groupImportState = {
       step: "",
       history: [],
       fixedSessionId: sessionId,
       sessions,
       liveGroups,
       currentWindowId,
       groupId: group.chromeGroupId,
       sessionId,
       sessionName: session.name,
       reviewTabs: [],
       selectedKeys: new Set()
     };
     elements.modal.hidden = false;
     prepareGroupReview(session, group);
   }

   function goBackInGroupImport() {
     if (!groupImportState?.history.length) {
       return;
     }

     groupImportState.step = groupImportState.history.pop();
     renderGroupImportModal();
   }

   function trapGroupImportFocus(event) {
     const elements = getGroupImportElements();
     const focusable = Array.from(
       elements.modal?.querySelectorAll(
         'button:not([disabled]):not([hidden]), input:not([disabled])'
       ) || []
     ).filter((element) => !element.hidden);

     if (!focusable.length) {
       return;
     }

     const first = focusable[0];
     const last = focusable[focusable.length - 1];

     if (event.shiftKey && document.activeElement === first) {
       event.preventDefault();
       last.focus();
     } else if (!event.shiftKey && document.activeElement === last) {
       event.preventDefault();
       first.focus();
     }
   }

   async function saveGroupImportReview() {
     const state = groupImportState;

     if (!state || state.step !== "review") {
       return;
     }

     updateGroupImportSummary();

     if (!state.sessionName || !state.selectedKeys.size) {
       return;
     }

     const [sessions, liveGroups] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups()
     ]);
     const group = liveGroups.find(
       (item) => item.chromeGroupId === state.groupId
     );

     if (!group) {
       closeGroupImportModal();
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const linkedOwner = getSessionLinkedToGroup(group, sessions, liveGroups);

     if (linkedOwner && linkedOwner.id !== state.sessionId) {
       closeGroupImportModal();
       showToast(t("linkedToSession", { name: linkedOwner.name }));
       return;
     }

     const selectedTabs = state.reviewTabs
       .filter((tab) => state.selectedKeys.has(tab.key))
       .map((tab) => ({
         title: tab.title || tab.url,
         url: tab.url,
         favIconUrl: tab.favIconUrl || ""
       }));
     const now = new Date().toISOString();
     const sessionIndex = state.sessionId
       ? sessions.findIndex((session) => session.id === state.sessionId)
       : -1;
     const existingSession = sessionIndex >= 0
       ? sessions[sessionIndex]
       : null;
     const updatedSession = {
       ...(existingSession || {}),
       id: existingSession?.id || createSessionId(),
       name: state.sessionName,
       tabs: selectedTabs,
       groupTemplate: {
         title: group.title || state.sessionName,
         color: group.color || "grey"
       },
       groupLink: {
         chromeGroupId: group.chromeGroupId,
         lastReviewedSignature: getGroupSignature(group),
         lastReviewedAt: now
       },
       createdAt: existingSession?.createdAt || now,
       updatedAt: now
     };

     if (sessionIndex >= 0) {
       sessions[sessionIndex] = updatedSession;
     } else {
       sessions.push(updatedSession);
     }

     await saveSavedSessions(sessions);
     closeGroupImportModal();
     await renderSavedSessions();
     showToast(t("groupReviewSaved"));
   }

   async function disconnectSessionGroup(sessionId) {
     const sessions = await getSavedSessions();
     const sessionIndex = sessions.findIndex(
       (session) => session.id === sessionId
     );

     if (sessionIndex < 0) {
       return;
     }

     const { groupLink, ...unlinkedSession } = sessions[sessionIndex];
     sessions[sessionIndex] = {
       ...unlinkedSession,
       updatedAt: new Date().toISOString()
     };

     await saveSavedSessions(sessions);
     await renderSavedSessions();
     showToast(t("groupDisconnected"));
   }

   async function deleteSavedSessionDirect(sessionId) {
     const sessions = await getSavedSessions();
     const updatedSessions = sessions.filter(
       (session) => session.id !== sessionId
     );

     if (updatedSessions.length === sessions.length) {
       return;
     }

     await saveSavedSessions(updatedSessions);
     await renderSavedSessions();
     showToast(t("sessionDeleted"));
   }

   async function focusLiveSessionGroup(group) {
     const tab = group?.tabs?.[0];

     if (!tab?.id) {
       return false;
     }

     await chrome.tabs.update(tab.id, { active: true });

     if (Number.isInteger(tab.windowId)) {
       await chrome.windows.update(tab.windowId, { focused: true });
     }

     return true;
   }

   async function connectSessionToLiveGroup(sessionId, group) {
     const sessions = await getSavedSessions();
     const sessionIndex = sessions.findIndex(
       (session) => session.id === sessionId
     );

     if (sessionIndex < 0) {
       return false;
     }

     const now = new Date().toISOString();
     sessions[sessionIndex] = {
       ...sessions[sessionIndex],
       groupTemplate: {
         title: group.title || sessions[sessionIndex].name,
         color: group.color || "grey"
       },
       groupLink: {
         chromeGroupId: group.chromeGroupId,
         lastReviewedSignature: getGroupSignature(group),
         lastReviewedAt: now
       },
       updatedAt: now
     };

     await saveSavedSessions(sessions);
     return true;
   }

   async function openSessionAsGroup(sessionId, { copy = false } = {}) {
     const [sessions, liveGroups] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups()
     ]);
     const session = sessions.find((item) => item.id === sessionId);

     if (!session) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const liveGroup = findLiveGroupForSession(session, liveGroups);

     if (!copy && liveGroup && await focusLiveSessionGroup(liveGroup)) {
       showToast(t("groupFocused"));
       return;
     }

     const result = await createNativeCollectionGroup(session.tabs || [], {
       title: copy
         ? t("groupCopyTitle", {
             name: session.groupTemplate?.title || session.name
           })
         : session.groupTemplate?.title || session.name,
       color: session.groupTemplate?.color || "grey",
       focusAfterOpen: true
     });

     if (!Number.isInteger(result.chromeGroupId)) {
       showCollectionOpenResult(result, { grouped: false });
       return;
     }

     if (!copy) {
       const refreshedGroups = await getCurrentChromeGroups();
       const createdGroup = refreshedGroups.find(
         (group) => group.chromeGroupId === result.chromeGroupId
       );

       if (createdGroup) {
         await connectSessionToLiveGroup(session.id, createdGroup);
       }

       await refreshDashboardCollections();
       showToast(t("groupOpenedLinked", { name: session.name }));
       return;
     }

     await renderDashboard();
     showCollectionOpenResult(result, { grouped: true });
   }

   async function openSavedSession(sessionId) {
     const sessions = await getSavedSessions();
     const session = sessions.find((item) => item.id === sessionId);

     if (!session) {
       return;
     }

     const result = await createCollectionTabs(session.tabs);

     await getLanguage();
     applyStaticTranslations();
     await renderDashboard();
     await renderSavedSessions();
     showCollectionOpenResult(result);
   }

   let sessionEditorState = null;
   let sessionEditorReturnFocus = null;

   function cloneSessionTabs(tabs = []) {
     return tabs.map((tab) => ({
       title: tab.title || tab.url || "",
       url: tab.url || "",
       favIconUrl: tab.favIconUrl || ""
     })).filter((tab) => tab.url);
   }

   function getSessionEditorTabKey(tabOrUrl) {
     const url = typeof tabOrUrl === "string"
       ? tabOrUrl
       : tabOrUrl?.url;
     return normalizeOpenTabUrl(url || "");
   }

   async function getCurrentSessionOpenTabs() {
     await fetchOpenTabs();
     const tabsByUrl = new Map();

     getRealTabs().forEach((tab) => {
       const key = getSessionEditorTabKey(tab);

       if (!key || tabsByUrl.has(key)) {
         return;
       }

       tabsByUrl.set(key, {
         title: getTabDisplayTitle(tab),
         url: tab.url,
         favIconUrl: tab.favIconUrl || getTabFavicon(tab.url, 16)
       });
     });

     return Array.from(tabsByUrl.values());
   }

   function getAvailableSessionEditorTabs() {
     if (!sessionEditorState) {
       return [];
     }

     const includedUrls = new Set(
       sessionEditorState.draftTabs.map(getSessionEditorTabKey)
     );

     return sessionEditorState.openTabs.filter(
       (tab) => !includedUrls.has(getSessionEditorTabKey(tab))
     );
   }

   function createSessionEditorTabRow(tab, action) {
     const row = document.createElement("div");
     row.className = "session-tab-row session-editor-tab-row";
     row.dataset.tabUrl = tab.url;

     const favicon = document.createElement("img");
     favicon.alt = "";
     favicon.src = tab.favIconUrl || getTabFavicon(tab.url, 16);
     favicon.addEventListener("error", () => {
       favicon.hidden = true;
     }, { once: true });

     const info = document.createElement("span");
     info.className = "session-tab-info";

     const title = document.createElement("span");
     title.className = "session-tab-title";
     title.textContent = tab.title || tab.url;

     const url = document.createElement("span");
     url.className = "session-tab-url";
     url.textContent = getTabDomain(tab.url) || tab.url;

     const button = document.createElement("button");
     button.type = "button";
     button.className = `session-tab-action is-${action}`;
     button.dataset.sessionTabAction = action;
     button.dataset.tabUrl = tab.url;
     button.textContent = t(action === "add" ? "addTab" : "removeTab");

     info.appendChild(title);
     info.appendChild(url);
     row.appendChild(favicon);
     row.appendChild(info);
     row.appendChild(button);

     return row;
   }

   function renderSessionEditorList(container, tabs, action, emptyKey) {
     container.innerHTML = "";

     if (!tabs.length) {
       const empty = document.createElement("div");
       empty.className = "session-editor-empty";
       empty.textContent = t(emptyKey);
       container.appendChild(empty);
       return;
     }

     tabs.forEach((tab) => {
       container.appendChild(createSessionEditorTabRow(tab, action));
     });
   }

   function renderSessionEditor() {
     if (!sessionEditorState) {
       return;
     }

     const includedList = document.getElementById("sessionTabsList");
     const availableList = document.getElementById("sessionAvailableTabsList");
     const includedCount = document.getElementById("sessionIncludedCount");
     const availableCount = document.getElementById("sessionAvailableCount");
     const removeAllButton = document.getElementById("removeAllSessionTabsBtn");
     const addAllButton = document.getElementById("addAllSessionTabsBtn");
     const undoButton = document.getElementById("undoSessionEditBtn");
     const availableTabs = getAvailableSessionEditorTabs();

     if (!includedList || !availableList) {
       return;
     }

     renderSessionEditorList(
       includedList,
       sessionEditorState.draftTabs,
       "remove",
       "noIncludedTabs"
     );
     renderSessionEditorList(
       availableList,
       availableTabs,
       "add",
       "noAvailableTabs"
     );

     if (includedCount) {
       includedCount.textContent = String(sessionEditorState.draftTabs.length);
     }

     if (availableCount) {
       availableCount.textContent = String(availableTabs.length);
     }

     if (removeAllButton) {
       removeAllButton.disabled = sessionEditorState.draftTabs.length === 0;
     }

     if (addAllButton) {
       addAllButton.disabled = availableTabs.length === 0;
     }

     if (undoButton) {
       undoButton.disabled = sessionEditorState.history.length === 0;
     }
   }

   function applySessionEditorMutation(mutator) {
     if (!sessionEditorState) {
       return;
     }

     const previousTabs = cloneSessionTabs(sessionEditorState.draftTabs);
     const nextTabs = cloneSessionTabs(mutator(previousTabs) || previousTabs);

     if (JSON.stringify(previousTabs) === JSON.stringify(nextTabs)) {
       return;
     }

     sessionEditorState.history.push(previousTabs);
     sessionEditorState.draftTabs = nextTabs;

     const conflict = document.getElementById("sessionEditorConflict");

     if (conflict) {
       conflict.hidden = true;
       conflict.textContent = "";
     }

     renderSessionEditor();
   }

   function removeTabFromSessionDraft(url) {
     const targetKey = getSessionEditorTabKey(url);

     applySessionEditorMutation((tabs) =>
       tabs.filter((tab) => getSessionEditorTabKey(tab) !== targetKey)
     );
   }

   function addOpenTabToSessionDraft(url) {
     const targetKey = getSessionEditorTabKey(url);
     const tab = sessionEditorState?.openTabs.find(
       (item) => getSessionEditorTabKey(item) === targetKey
     );

     if (!tab) {
       return;
     }

     applySessionEditorMutation((tabs) => [...tabs, tab]);
   }

   function undoSessionEditorMutation() {
     if (!sessionEditorState?.history.length) {
       return;
     }

     sessionEditorState.draftTabs =
       sessionEditorState.history.pop();
     const conflict = document.getElementById("sessionEditorConflict");

     if (conflict) {
       conflict.hidden = true;
       conflict.textContent = "";
     }
     renderSessionEditor();
   }

   function getSessionManualErrorMessage(code) {
     if (code === "invalid_url") {
       return t("collectionManualInvalidUrl");
     }

     if (code === "unsupported_url") {
       return t("collectionManualUnsupportedUrl");
     }

     if (code === "already_added") {
       return t("collectionManualAlreadyAdded");
     }

     return t("collectionManualAddFailed");
   }

   async function addManualTabToSessionDraft() {
     const editorState = sessionEditorState;
     const urlInput = document.getElementById("sessionManualUrlInput");
     const titleInput = document.getElementById("sessionManualTitleInput");
     const error = document.getElementById("sessionManualAddError");
     const submit = document.getElementById("sessionManualAddSubmit");

     if (!editorState || !urlInput || !titleInput || !error || !submit) {
       return;
     }

     if (!urlInput.value.trim()) {
       error.hidden = false;
       error.textContent = t("collectionManualInvalidUrl");
       urlInput.focus();
       return;
     }

     submit.disabled = true;
     error.hidden = true;
     error.textContent = "";

     try {
       const response = await sendCollectionRuntimeMessage({
         type: "tabOut:normalizeManualLink",
         link: {
           url: urlInput.value,
           title: titleInput.value
         }
       });

       if (sessionEditorState !== editorState) {
         return;
       }

       if (!response.ok) {
         error.hidden = false;
         error.textContent = getSessionManualErrorMessage(response.code);
         return;
       }

       const key = getSessionEditorTabKey(response.tab);
       const alreadyIncluded = editorState.draftTabs.some(
         (tab) => getSessionEditorTabKey(tab) === key
       );

       if (alreadyIncluded) {
         error.hidden = false;
         error.textContent = t("collectionManualAlreadyAdded");
         return;
       }

       applySessionEditorMutation((tabs) => [...tabs, response.tab]);
       urlInput.value = "";
       titleInput.value = "";
       urlInput.focus();
     } finally {
       if (!sessionEditorState || sessionEditorState === editorState) {
         submit.disabled = false;
       }
     }
   }

   async function openSessionModal(sessionId = null) {
     const returnFocus = document.activeElement;
     const modal = document.getElementById("sessionModal");
     const title = document.getElementById("sessionModalTitle");
     const nameInput = document.getElementById("sessionNameInput");
     const deleteButton = document.getElementById("deleteSessionBtn");

     if (!modal || !title || !nameInput || !deleteButton) {
       return;
     }

     const [sessions, openTabs] = await Promise.all([
       getSavedSessions(),
       getCurrentSessionOpenTabs()
     ]);
     const existingSession = sessionId
       ? sessions.find((session) => session.id === sessionId)
       : null;
     const draftTabs = existingSession
       ? cloneSessionTabs(existingSession.tabs)
       : cloneSessionTabs(openTabs);

     sessionEditorState = {
       sessionId: existingSession?.id || null,
       baseUpdatedAt: existingSession?.updatedAt || "",
       initialTabs: cloneSessionTabs(draftTabs),
       draftTabs,
       openTabs,
       history: []
     };
     sessionEditorReturnFocus = returnFocus instanceof HTMLElement
       ? returnFocus
       : null;

     title.textContent = existingSession
       ? t("editSessionTitle")
       : t("createSessionTitle");
     nameInput.value = existingSession ? existingSession.name : "";
     deleteButton.hidden = !existingSession;

     document.getElementById("sessionManualAddForm")?.reset();
     const manualSubmit = document.getElementById("sessionManualAddSubmit");

     if (manualSubmit) {
       manualSubmit.disabled = false;
     }

     [
       document.getElementById("sessionManualAddError"),
       document.getElementById("sessionEditorConflict")
     ].forEach((message) => {
       if (message) {
         message.hidden = true;
         message.textContent = "";
       }
     });

     renderSessionEditor();
     modal.hidden = false;
     nameInput.focus();
   }

   function closeSessionModal() {
     const modal = document.getElementById("sessionModal");
     const returnFocus = sessionEditorReturnFocus;

     if (!modal) {
       return;
     }

     sessionEditorState = null;
     sessionEditorReturnFocus = null;
     modal.hidden = true;

     requestAnimationFrame(() => {
       if (returnFocus?.isConnected) {
         returnFocus.focus();
       }
     });
   }

   function trapSessionEditorFocus(event) {
     const modal = document.getElementById("sessionModal");
     const focusable = Array.from(
       modal?.querySelectorAll(
         'button:not([disabled]):not([hidden]), input:not([disabled])'
       ) || []
     ).filter((element) => !element.hidden);

     if (!focusable.length) {
       return;
     }

     const first = focusable[0];
     const last = focusable[focusable.length - 1];

     if (event.shiftKey && document.activeElement === first) {
       event.preventDefault();
       last.focus();
     } else if (!event.shiftKey && document.activeElement === last) {
       event.preventDefault();
       first.focus();
     }
   }

   async function saveSessionFromModal() {
     const editorState = sessionEditorState;
     const nameInput = document.getElementById("sessionNameInput");
     const conflict = document.getElementById("sessionEditorConflict");

     if (!nameInput || !editorState) {
       return;
     }

     const name = nameInput.value.trim();

     if (!name) {
       alert(t("sessionNameRequired"));
       return;
     }

     const sessions = await getSavedSessions();
     const now = new Date().toISOString();

     if (sessionEditorState !== editorState) {
       return;
     }

     if (editorState.sessionId) {
       const index = sessions.findIndex(
         (session) => session.id === editorState.sessionId
       );

       if (index < 0) {
         if (conflict) {
           conflict.hidden = false;
           conflict.textContent = t("collectionDetailUnavailable");
         }
         return;
       }

       if (
         (sessions[index].updatedAt || "") !==
         editorState.baseUpdatedAt
       ) {
         if (conflict) {
           conflict.hidden = false;
           conflict.textContent = t("sessionChangedConflict");
         }
         return;
       }

       sessions[index] = {
         ...sessions[index],
         name,
         tabs: cloneSessionTabs(editorState.draftTabs),
         updatedAt: now
       };
     } else {
       sessions.push({
         id: createSessionId(),
         name,
         tabs: cloneSessionTabs(editorState.draftTabs),
         createdAt: now,
         updatedAt: now
       });
     }

     await saveSavedSessions(sessions);
     await renderSavedSessions();
     closeSessionModal();
     showToast(t("sessionSaved"));
   }

   async function deleteCurrentSession() {
     if (!sessionEditorState?.sessionId) {
       return;
     }

     const confirmed = confirm(t("deleteSessionConfirm"));

     if (!confirmed) {
       return;
     }

     const sessions = await getSavedSessions();
     const updatedSessions = sessions.filter(
       (session) => session.id !== sessionEditorState.sessionId
     );

     await saveSavedSessions(updatedSessions);
     await renderSavedSessions();
     closeSessionModal();
     showToast(t("sessionDeleted"));
   }

   function setupSessionManager() {
     const cancelButton = document.getElementById("cancelSessionBtn");
     const saveButton = document.getElementById("saveSessionBtn");
     const deleteButton = document.getElementById("deleteSessionBtn");
     const undoButton = document.getElementById("undoSessionEditBtn");
     const removeAllButton = document.getElementById("removeAllSessionTabsBtn");
     const addAllButton = document.getElementById("addAllSessionTabsBtn");
     const manualAddForm = document.getElementById("sessionManualAddForm");
     const modal = document.getElementById("sessionModal");
     const groupImportModal = document.getElementById("groupImportModal");

     cancelButton?.addEventListener("click", closeSessionModal);
     saveButton?.addEventListener("click", saveSessionFromModal);
     deleteButton?.addEventListener("click", deleteCurrentSession);
     undoButton?.addEventListener("click", undoSessionEditorMutation);

     removeAllButton?.addEventListener("click", () => {
       applySessionEditorMutation(() => []);
     });

     addAllButton?.addEventListener("click", () => {
       const availableTabs = getAvailableSessionEditorTabs();
       applySessionEditorMutation((tabs) => [...tabs, ...availableTabs]);
     });

     manualAddForm?.addEventListener("submit", (event) => {
       event.preventDefault();
       addManualTabToSessionDraft();
     });

     if (modal) {
       modal.addEventListener("click", (event) => {
         if (event.target === modal) {
           closeSessionModal();
           return;
         }

         const actionButton = event.target.closest(
           "button[data-session-tab-action]"
         );

         if (!actionButton) {
           return;
         }

         if (actionButton.dataset.sessionTabAction === "add") {
           addOpenTabToSessionDraft(actionButton.dataset.tabUrl);
         } else {
           removeTabFromSessionDraft(actionButton.dataset.tabUrl);
         }
       });
     }

     if (groupImportModal) {
       groupImportModal.addEventListener("click", (event) => {
         if (event.target === groupImportModal) {
           closeGroupImportModal();
         }
       });
     }

     renderSavedSessions();
     applyStaticTranslations();
   }
   
   document.addEventListener("DOMContentLoaded", setupSessionManager);



   /* ----------------------------------------------------------------
   LIVE TAB REFRESH
   Refresh Tab Out when Chrome tabs change.
   ---------------------------------------------------------------- */

let tabRefreshTimer = null;
let savedSessionsRefreshTimer = null;

function scheduleDashboardRefresh() {
  clearTimeout(tabRefreshTimer);

  tabRefreshTimer = setTimeout(async () => {
    if (
      openTabAssignmentDragState?.dragging ||
      savedSessionTabDragState?.dragging
    ) {
      scheduleDashboardRefresh();
      return;
    }

    await renderDashboard();
  }, 350);
}

if (chrome?.tabs?.onCreated) {
  chrome.tabs.onCreated.addListener(() => {
    scheduleDashboardRefresh();
    scheduleCollectionDetailOpenStateRefresh();
  });
}

function scheduleSavedSessionsRefresh() {
  clearTimeout(savedSessionsRefreshTimer);
  const delay = Math.max(
    120,
    deferCollectionStorageRefreshUntil - Date.now()
  );

  savedSessionsRefreshTimer = setTimeout(async () => {
    if (Date.now() < deferCollectionStorageRefreshUntil) {
      scheduleSavedSessionsRefresh();
      return;
    }

    if (
      openTabAssignmentDragState?.dragging ||
      savedSessionTabDragState?.dragging
    ) {
      scheduleSavedSessionsRefresh();
      return;
    }

    await refreshDashboardCollections();
  }, delay);
}

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.savedSessions) {
      scheduleSavedSessionsRefresh();
    }

    if (
      areaName === "local" &&
      changes[UNASSIGNED_REMOVAL_HISTORY_KEY]
    ) {
      unassignedRemovalHistory = normalizeUnassignedRemovalHistory(
        changes[UNASSIGNED_REMOVAL_HISTORY_KEY].newValue
      );
      updateUnassignedRemovalUndoControl();
    }
  });
}

if (chrome?.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener(() => {
    scheduleDashboardRefresh();
    scheduleCollectionDetailOpenStateRefresh();
  });
}

if (chrome?.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (
      changeInfo.status === "complete" ||
      changeInfo.url ||
      changeInfo.title
    ) {
      scheduleDashboardRefresh();
      scheduleCollectionDetailOpenStateRefresh();
    }
  });
}

if (chrome?.tabs?.onAttached) {
  chrome.tabs.onAttached.addListener(scheduleCollectionDetailOpenStateRefresh);
}

if (chrome?.tabs?.onDetached) {
  chrome.tabs.onDetached.addListener(scheduleCollectionDetailOpenStateRefresh);
}

// Do not refresh the whole dashboard on focus/activation only.
// It caused visible layout jumps while switching between Tab Out and grouped tabs.
// Tab creation/removal and URL/title completion still refresh the open-tabs section.

/* ----------------------------------------------------------------
   EVENT HANDLERS — using event delegation

   One listener on document handles ALL button clicks.
   Think of it as one security guard watching the whole building
   instead of one per door.
   ---------------------------------------------------------------- */

document.addEventListener("pointerdown", (e) => {
  const sessionTabDragHandle = e.target.closest?.(
    '[data-session-tab-drag-handle="true"]'
  );

  if (
    sessionTabDragHandle &&
    isDashboardBehaviorEnabled("dragSessionTabs") &&
    e.button === 0 &&
    e.isPrimary !== false &&
    !openTabAssignmentDragState &&
    !savedSessionDragState &&
    !provisionalSessionState &&
    !inlineSessionRenameState
  ) {
    const sourceElement = sessionTabDragHandle.closest(
      ".saved-session-inline-tab"
    );

    if (sourceElement) {
      savedSessionTabDragState = {
        handle: sessionTabDragHandle,
        sourceElement,
        sourceSessionId: sourceElement.dataset.sessionId,
        sourceSessionName:
          sessionTabDragHandle.dataset.sessionName || "",
        url: sourceElement.dataset.tabUrl,
        title:
          sourceElement.querySelector(".saved-session-inline-tab-title")
            ?.textContent || sourceElement.dataset.tabUrl,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        ghost: null,
        target: null
      };
      return;
    }
  }

  const openTabSource = e.target.closest?.(
    '[data-open-tab-draggable="true"]'
  );

  if (
    openTabSource &&
    isDashboardBehaviorEnabled("dragUnassignedTabs") &&
    e.button === 0 &&
    e.isPrimary !== false &&
    !provisionalSessionState &&
    !inlineSessionRenameState &&
    !e.target.closest(".chip-actions")
  ) {
    const tab = getOpenTabFromDragElement(openTabSource);

    if (tab) {
      openTabAssignmentDragState = {
        sourceElement: openTabSource,
        tab,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        ghost: null,
        target: null
      };
      return;
    }
  }

  const card = e.target.closest('.saved-session-card[data-session-draggable="true"]');

  if (
    !card ||
    !isDashboardBehaviorEnabled("reorderSessions") ||
    openTabAssignmentDragState ||
    savedSessionTabDragState ||
    provisionalSessionState ||
    inlineSessionRenameState ||
    savedSessionsViewMode !== "sessions"
  ) {
    return;
  }

  if (
    e.button !== 0 ||
    e.target.closest('.saved-session-edit') ||
    e.target.closest('.saved-session-rename') ||
    e.target.closest('.saved-session-title') ||
    e.target.closest('.session-inline-name-input') ||
    e.target.closest('.saved-session-expand') ||
    e.target.closest('.saved-session-inline-tabs') ||
    e.target.closest('.protected-group-menu')
  ) {
    return;
  }

  const list = card.closest("#savedSessionsList");

  if (!list) {
    return;
  }

  savedSessionDragState = {
    card,
    list,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    initialOrder: getSavedSessionDomOrder(list),
    placeholder: null,
    ghost: null
  };

  // Do not capture the pointer on simple click.
  // Capturing here makes Chrome retarget the following click to the card,
  // so the inner open button no longer receives the click action.
  // Pointer capture is applied only after the drag threshold is crossed.
});

document.addEventListener("pointermove", (e) => {
  const savedTabState = savedSessionTabDragState;

  if (savedTabState?.pointerId === e.pointerId) {
    const distanceX = Math.abs(e.clientX - savedTabState.startX);
    const distanceY = Math.abs(e.clientY - savedTabState.startY);

    if (!savedTabState.dragging) {
      if (
        Math.max(distanceX, distanceY) <
        SAVED_SESSION_TAB_DRAG_THRESHOLD
      ) {
        return;
      }

      e.preventDefault();
      startSavedSessionTabPointerDrag(e, savedTabState);
      return;
    }

    e.preventDefault();
    updateSavedSessionTabPointerDrag(e);
    return;
  }

  const openTabState = openTabAssignmentDragState;

  if (openTabState?.pointerId === e.pointerId) {
    const distanceX = Math.abs(e.clientX - openTabState.startX);
    const distanceY = Math.abs(e.clientY - openTabState.startY);

    if (!openTabState.dragging) {
      if (Math.max(distanceX, distanceY) < OPEN_TAB_DRAG_THRESHOLD) {
        return;
      }

      e.preventDefault();
      startOpenTabPointerDrag(e, openTabState);
      return;
    }

    e.preventDefault();
    updateOpenTabPointerDrag(e);
    return;
  }

  const state = savedSessionDragState;

  if (!state || state.pointerId !== e.pointerId) {
    return;
  }

  const distanceX = Math.abs(e.clientX - state.startX);
  const distanceY = Math.abs(e.clientY - state.startY);

  if (!state.dragging) {
    if (Math.max(distanceX, distanceY) < SAVED_SESSION_DRAG_THRESHOLD) {
      return;
    }

    e.preventDefault();
    startSavedSessionPointerDrag(e, state);
    return;
  }

  e.preventDefault();
  updateSavedSessionPointerDrag(e);
});

document.addEventListener("pointerup", async (e) => {
  if (savedSessionTabDragState?.pointerId === e.pointerId) {
    await finishSavedSessionTabPointerDrag(e);
    return;
  }

  if (openTabAssignmentDragState?.pointerId === e.pointerId) {
    await finishOpenTabPointerDrag(e);
    return;
  }

  if (!savedSessionDragState || savedSessionDragState.pointerId !== e.pointerId) {
    return;
  }

  await finishSavedSessionPointerDrag(e);
});

document.addEventListener("pointercancel", async (e) => {
  if (savedSessionTabDragState?.pointerId === e.pointerId) {
    await finishSavedSessionTabPointerDrag(e, { cancelled: true });
    return;
  }

  if (openTabAssignmentDragState?.pointerId === e.pointerId) {
    await finishOpenTabPointerDrag(e, { cancelled: true });
    return;
  }

  if (!savedSessionDragState || savedSessionDragState.pointerId !== e.pointerId) {
    return;
  }

  await finishSavedSessionPointerDrag(e);
});

document.addEventListener("input", (event) => {
  if (event.target?.classList.contains("session-inline-name-input")) {
    if (
      event.target.dataset.sessionNameMode === "provisional" &&
      provisionalSessionState
    ) {
      provisionalSessionState.name = event.target.value;
    } else if (
      event.target.dataset.sessionNameMode === "rename" &&
      inlineSessionRenameState?.sessionId === event.target.dataset.sessionId
    ) {
      inlineSessionRenameState.value = event.target.value;
    }

    return;
  }

  if (event.target?.id !== "openTabsFilterInput") {
    return;
  }

  openTabsFilterQuery = event.target.value || "";
  renderFilteredOpenTabs();
});

document.addEventListener("dragstart", (e) => {
  if (
    e.target.closest?.('[data-open-tab-draggable="true"]') ||
    e.target.closest?.('[data-session-tab-drag-handle="true"]')
  ) {
    e.preventDefault();
  }
});

document.addEventListener("focusout", (event) => {
  if (!event.target?.classList.contains("session-inline-name-input")) {
    return;
  }

  if (event.target.dataset.sessionNameMode === "provisional") {
    commitProvisionalSession();
  } else {
    commitInlineSessionRename();
  }
});

document.addEventListener("change", (event) => {
  const groupReviewCheckbox = event.target.closest?.(
    "input[data-group-review-key]"
  );

  if (groupReviewCheckbox && groupImportState?.step === "review") {
    const key = groupReviewCheckbox.dataset.groupReviewKey;

    if (groupReviewCheckbox.checked) {
      groupImportState.selectedKeys.add(key);
    } else {
      groupImportState.selectedKeys.delete(key);
    }

    updateGroupImportSummary();
    return;
  }

  const checkbox = event.target.closest?.("input[data-collection-tab-key]");

  if (!checkbox || !collectionDetailState) {
    return;
  }

  const tabKey = checkbox.dataset.collectionTabKey;

  if (checkbox.checked) {
    collectionDetailState.selectedKeys.add(tabKey);
  } else {
    collectionDetailState.selectedKeys.delete(tabKey);
  }

  updateCollectionDetailSelectionUi();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target && (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );

  const collectionOverlay = document.getElementById("collectionDetailOverlay");
  const groupImportModal = document.getElementById("groupImportModal");
  const sessionModal = document.getElementById("sessionModal");

  if (target?.classList.contains("session-inline-name-input")) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      if (target.dataset.sessionNameMode === "provisional") {
        commitProvisionalSession();
      } else {
        commitInlineSessionRename();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      if (target.dataset.sessionNameMode === "provisional") {
        cancelProvisionalSession();
      } else {
        cancelInlineSessionRename();
      }
    }

    return;
  }

  if (groupImportModal && !groupImportModal.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeGroupImportModal();
      return;
    }

    if (event.key === "Tab") {
      trapGroupImportFocus(event);
    }

    return;
  }

  if (sessionModal && !sessionModal.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSessionModal();
      return;
    }

    if (event.key === "Tab") {
      trapSessionEditorFocus(event);
    }

    return;
  }

  if (collectionOverlay && !collectionOverlay.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCollectionDetail();
      return;
    }

    if (event.key === "Tab") {
      trapCollectionDetailFocus(event);
    }

    return;
  }

  if (event.key === "Escape" && target?.id === "openTabsFilterInput") {
    event.preventDefault();
    openTabsFilterQuery = "";
    target.value = "";
    openTabsSearchVisible = false;

    const searchWrap = document.getElementById("openTabsSearchWrap");
    const toggle = document.querySelector('[data-action="toggle-open-tabs-search"]');
    if (searchWrap) searchWrap.classList.remove("is-visible");
    if (toggle) toggle.setAttribute("aria-expanded", "false");

    target.blur();
    renderFilteredOpenTabs();
  }
});

document.addEventListener('click', async (e) => {
  // Walk up the DOM to find the nearest element with data-action
  const actionEl = e.target.closest('[data-action]');
  
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  // ---- Open tabs search ----
  if (action === "toggle-open-tabs-search") {
    e.preventDefault();
    e.stopPropagation();

    openTabsSearchVisible = !openTabsSearchVisible;
    const searchWrap = document.getElementById("openTabsSearchWrap");
    const input = document.getElementById("openTabsFilterInput");

    if (searchWrap) searchWrap.classList.toggle("is-visible", openTabsSearchVisible);
    actionEl.setAttribute("aria-expanded", openTabsSearchVisible ? "true" : "false");

    if (openTabsSearchVisible && input) {
      requestAnimationFrame(() => input.focus());
    }

    if (!openTabsSearchVisible && !normalizeFilterText(openTabsFilterQuery)) {
      return;
    }

    return;
  }

  if (action === "clear-open-tabs-search") {
    e.preventDefault();
    e.stopPropagation();

    const hadQuery = Boolean(normalizeFilterText(openTabsFilterQuery));
    openTabsFilterQuery = "";

    const input = document.getElementById("openTabsFilterInput");
    const searchWrap = document.getElementById("openTabsSearchWrap");
    const toggle = document.querySelector('[data-action="toggle-open-tabs-search"]');

    if (input) {
      input.value = "";
    }

    if (hadQuery) {
      if (input) input.focus();
      renderFilteredOpenTabs();
      return;
    }

    openTabsSearchVisible = false;
    if (searchWrap) searchWrap.classList.remove("is-visible");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (input) input.blur();
    renderFilteredOpenTabs();
    return;
  }

    if (action === "close-collection-detail") {
      e.preventDefault();
      e.stopPropagation();

      closeCollectionDetail();
      return;
    }

    if (action === "select-all-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      if (!collectionDetailState || collectionDetailState.busy) {
        return;
      }

      collectionDetailState.tabs.forEach((tab) => {
        if (!tab.existingTab) {
          collectionDetailState.selectedKeys.add(tab.key);
        }
      });
      document
        .querySelectorAll("#collectionDetailTabs input[data-collection-tab-key]")
        .forEach((checkbox) => {
          checkbox.checked = checkbox.dataset.alreadyOpen !== "true";
        });
      updateCollectionDetailSelectionUi();
      return;
    }

    if (action === "clear-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      if (!collectionDetailState || collectionDetailState.busy) {
        return;
      }

      collectionDetailState.selectedKeys.clear();
      document
        .querySelectorAll("#collectionDetailTabs input[data-collection-tab-key]")
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
      updateCollectionDetailSelectionUi();
      return;
    }

    if (action === "open-selected-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      await openSelectedCollectionTabs();
      return;
    }

    if (action === "open-all-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      await openAllCollectionTabs();
      return;
    }

    if (action === "open-collection-tab-and-switch") {
      e.preventDefault();
      e.stopPropagation();

      await openCollectionTabAndSwitch(actionEl.dataset.tabKey);
      return;
    }

    // ---- Backup / import ----
    if (action === "toggle-backup-menu") {
      e.preventDefault();
      e.stopPropagation();

      toggleBackupMenu();
      return;
    }

    if (action === "export-tab-out-data") {
      e.preventDefault();
      e.stopPropagation();

      await exportTabOutData();
      return;
    }

    if (action === "import-tab-out-data") {
      e.preventDefault();
      e.stopPropagation();

      openBackupImportPicker();
      return;
    }

    // ---- Saved sessions ----
    if (action === "rename-session-inline") {
      e.preventDefault();
      e.stopPropagation();

      await startInlineSessionRename(
        actionEl.dataset.sessionId,
        actionEl.dataset.sessionName || ""
      );
      return;
    }

    if (action === "create-saved-session") {
      e.preventDefault();
      e.stopPropagation();
  
      await openSessionModal(null);
      return;
    }

    if (action === "open-group-import") {
      e.preventDefault();
      e.stopPropagation();

      await openGroupImportModal();
      return;
    }

    if (action === "close-group-import") {
      e.preventDefault();
      e.stopPropagation();

      closeGroupImportModal();
      return;
    }

    if (action === "group-import-back") {
      e.preventDefault();
      e.stopPropagation();

      goBackInGroupImport();
      return;
    }

    if (action === "select-group-import") {
      e.preventDefault();
      e.stopPropagation();

      if (!groupImportState) {
        return;
      }

      const group = groupImportState.liveGroups.find(
        (item) => String(item.chromeGroupId) === actionEl.dataset.groupId
      );

      if (!group) {
        return;
      }

      groupImportState.groupId = group.chromeGroupId;

      if (groupImportState.fixedSessionId) {
        const session = groupImportState.sessions.find(
          (item) => item.id === groupImportState.fixedSessionId
        );
        prepareGroupReview(session, group);
      } else {
        setGroupImportStep("mode");
      }
      return;
    }

    if (action === "review-linked-session-group") {
      e.preventDefault();
      e.stopPropagation();

      await reviewSessionLinkedGroup(actionEl.dataset.sessionId);
      return;
    }

    if (action === "create-session-from-group") {
      e.preventDefault();
      e.stopPropagation();

      const group = groupImportState?.liveGroups.find(
        (item) => item.chromeGroupId === groupImportState.groupId
      );

      if (group) {
        prepareGroupReview(null, group);
      }
      return;
    }

    if (action === "choose-session-for-group") {
      e.preventDefault();
      e.stopPropagation();

      setGroupImportStep("sessions");
      return;
    }

    if (action === "select-session-for-group") {
      e.preventDefault();
      e.stopPropagation();

      const session = groupImportState?.sessions.find(
        (item) => item.id === actionEl.dataset.sessionId
      );
      const group = groupImportState?.liveGroups.find(
        (item) => item.chromeGroupId === groupImportState.groupId
      );

      if (session && group) {
        prepareGroupReview(session, group);
      }
      return;
    }

    if (action === "save-group-import") {
      e.preventDefault();
      e.stopPropagation();

      await saveGroupImportReview();
      return;
    }

    if (
      action === "select-all-group-review" ||
      action === "clear-group-review"
    ) {
      e.preventDefault();
      e.stopPropagation();

      if (groupImportState?.step !== "review") {
        return;
      }

      const shouldSelect = action === "select-all-group-review";
      groupImportState.selectedKeys = new Set(
        shouldSelect
          ? groupImportState.reviewTabs.map((tab) => tab.key)
          : []
      );
      document
        .querySelectorAll("#groupImportBody input[data-group-review-key]")
        .forEach((checkbox) => {
          checkbox.checked = shouldSelect;
        });
      updateGroupImportSummary();
      return;
    }
  
    if (action === "edit-saved-session") {
      e.preventDefault();
      e.stopPropagation();
  
      await openSessionModal(actionEl.dataset.sessionId);
      return;
    }

    if (action === "open-session-as-group") {
      e.preventDefault();
      e.stopPropagation();

      const sessionId =
        actionEl.dataset.sessionId || collectionDetailState?.id;

      if (sessionId) {
        await openSessionAsGroup(sessionId);
        await reloadCollectionDetailSource();
      }
      return;
    }

    if (action === "open-session-group-copy") {
      e.preventDefault();
      e.stopPropagation();

      await openSessionAsGroup(actionEl.dataset.sessionId, { copy: true });
      return;
    }

    if (action === "review-session-group") {
      e.preventDefault();
      e.stopPropagation();

      await reviewSessionLinkedGroup(actionEl.dataset.sessionId);
      return;
    }

    if (action === "connect-session-group") {
      e.preventDefault();
      e.stopPropagation();

      await openGroupImportModal({
        sessionId: actionEl.dataset.sessionId
      });
      return;
    }

    if (action === "disconnect-session-group") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("disconnectGroupConfirm"))) {
        await disconnectSessionGroup(actionEl.dataset.sessionId);
      }
      return;
    }

    if (action === "delete-saved-session-direct") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("deleteSessionConfirm"))) {
        await deleteSavedSessionDirect(actionEl.dataset.sessionId);
      }
      return;
    }

    if (action === "toggle-session-inline-tabs") {
      e.preventDefault();
      e.stopPropagation();
      await toggleSessionInlineTabs(actionEl.dataset.sessionId);
      return;
    }

    if (action === "open-session-inline-tab") {
      e.preventDefault();
      e.stopPropagation();
      await openSessionInlineTab(actionEl.dataset.tabUrl);
      return;
    }

    if (action === "view-saved-session") {
      e.preventDefault();
      e.stopPropagation();

      if (Date.now() < suppressSavedSessionOpenUntil) {
        return;
      }

      await showSavedSessionDetail(actionEl.dataset.sessionId, actionEl);
      return;
    }
  
    if (action === "open-saved-session") {
      e.preventDefault();
      e.stopPropagation();

      if (Date.now() < suppressSavedSessionOpenUntil) {
        return;
      }
  
      await openSavedSession(actionEl.dataset.sessionId);
      return;
    }

    
    if (action === "set-sessions-view") {
      e.preventDefault();
      e.stopPropagation();

      savedSessionsViewMode = actionEl.dataset.sessionView === "groups" ? "groups" : "sessions";
      await renderSavedSessions();
      return;
    }

    if (action === "sync-protected-groups") {
      e.preventDefault();
      e.stopPropagation();

      lastProtectedGroupsRenderSignature = "";
      await renderProtectedGroupsIntoSessions(document.getElementById("savedSessionsList"), { force: true });
      protectedGroupsToast(t("syncChromeGroups"));
      return;
    }

    if (action === "protect-chrome-group") {
      e.preventDefault();
      e.stopPropagation();

      await protectChromeGroup(actionEl.dataset.groupId);
      return;
    }

    if (action === "toggle-protected-group-menu") {
      e.preventDefault();
      e.stopPropagation();

      toggleProtectedGroupMenu(actionEl.dataset.menuKey);
      return;
    }

    if (action === "view-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      await showProtectedGroupDetail(actionEl.dataset.snapshotId, actionEl);
      return;
    }

    if (action === "view-live-chrome-group") {
      e.preventDefault();
      e.stopPropagation();

      await showLiveChromeGroupDetail(actionEl.dataset.groupId, actionEl);
      return;
    }

    if (action === "focus-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      await focusProtectedGroup(actionEl.dataset.snapshotId);
      return;
    }

    if (action === "focus-chrome-group") {
      e.preventDefault();
      e.stopPropagation();

      await focusChromeGroup(actionEl.dataset.groupId);
      return;
    }

    if (action === "restore-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      const needsConfirmation = await shouldConfirmProtectedGroupRestore(actionEl.dataset.snapshotId);

      if (!needsConfirmation || confirm(t("restoreProtectedGroupConfirm"))) {
        await restoreProtectedGroup(actionEl.dataset.snapshotId);
      }
      return;
    }

    if (action === "open-protected-group-copy") {
      e.preventDefault();
      e.stopPropagation();

      await openProtectedGroupCopy(actionEl.dataset.snapshotId);
      return;
    }

    if (action === "update-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("updateProtectedGroupConfirm"))) {
        await updateProtectedSnapshot(actionEl.dataset.snapshotId);
      }
      return;
    }

    if (action === "ignore-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      await ignoreProtectedGroupChange(actionEl.dataset.snapshotId);
      return;
    }

    if (action === "delete-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("deleteProtectedGroupConfirm"))) {
        await deleteProtectedSnapshot(actionEl.dataset.snapshotId);
      }
      return;
    }
// ---- Toggle tab dropdown ----
    if (action === "toggle-tab-dropdown") {
      e.preventDefault();
      e.stopPropagation();
  
      const dropdownId = actionEl.dataset.dropdownId;
      const dropdown = document.getElementById(dropdownId);
  
      if (!dropdown) {
        return;
      }
  
      dropdown.hidden = !dropdown.hidden;
  
      const tabCount = dropdown.querySelectorAll(".tab-dropdown-item").length;

      actionEl.textContent = dropdown.hidden
        ? t("showTabs", { count: tabCount })
        : t("hideTabs", { count: tabCount });
  
      return;
    }

  // ---- Close duplicate Tab Out tabs ----
  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) {
      banner.style.transition = 'opacity 0.4s';
      banner.style.opacity = '0';
      setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400);
    }
    showToast(t("closedExtraTabOutTabs"));

    await renderDashboard();
    await renderSavedSessions();

    return;
  }

  const card = actionEl.closest('.mission-card');

  if (action === "undo-unassigned-removal") {
    e.preventDefault();
    e.stopPropagation();

    if (unassignedRemovalUndoBusy) {
      return;
    }

    unassignedRemovalUndoBusy = true;
    updateUnassignedRemovalUndoControl();

    try {
      const result = await restoreLatestUnassignedRemoval();
      await renderDashboard();

      if (result.empty) {
        showToast(t("unassignedUndoRemovalEmpty"));
      } else if (result.failed > 0 && result.restored > 0) {
        showToast(t("unassignedRemovalRestorePartial", {
          restored: result.restored,
          failed: result.failed
        }));
      } else if (result.failed > 0) {
        showToast(t("unassignedRemovalRestoreFailed"));
      } else if (result.restored > 0) {
        showToast(t("unassignedRemovalRestored", {
          count: result.restored
        }));
      } else {
        showToast(t("unassignedRemovalAlreadyRestored"));
      }
    } catch (error) {
      console.warn(
        "[tab-out] Failed to undo unassigned tab removal:",
        error
      );
      showToast(t("unassignedRemovalRestoreFailed"));
    } finally {
      unassignedRemovalUndoBusy = false;
      updateUnassignedRemovalUndoControl();
    }

    return;
  }

  // ---- Expand overflow chips ("+N more") ----
  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement.querySelector('.page-chips-overflow');
    if (overflowContainer) {
      overflowContainer.style.display = 'contents';
      actionEl.remove();
    }
    return;
  }

  // ---- Focus a specific tab ----
  if (action === 'focus-tab') {
    if (consumeSuppressedOpenTabFocusClick(actionEl)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // ---- Close a single tab ----
  if (action === 'close-single-tab') {
    e.stopPropagation(); // don't trigger parent chip's focus-tab
    const chip = actionEl.closest('.page-chip');
    const tabId = Number.parseInt(chip?.dataset.tabId, 10);

    if (!Number.isInteger(tabId)) {
      return;
    }

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        [tabId],
        "single"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close an unassigned tab:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    playCloseSound();

    // Animate the chip row out
    if (chip) {
      const rect = chip.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        // If the card now has no tabs, remove it too
        const parentCard = document.querySelector('.mission-card:has(.mission-pages:empty)');
        if (parentCard) animateCardOut(parentCard);
        document.querySelectorAll('.mission-card').forEach(c => {
          if (c.querySelectorAll('.page-chip[data-action="focus-tab"]').length === 0) {
            animateCardOut(c);
          }
        });
      }, 200);
    }

    // Update footer
    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    showToast(t("tabClosed"));
    return;
  }

  // ---- Save a single tab for later (then close it) ----
  if (action === 'defer-single-tab') {
    e.stopPropagation();
    const tabUrl   = actionEl.dataset.tabUrl;
    const tabTitle = actionEl.dataset.tabTitle || tabUrl;
    if (!tabUrl) return;

    // Save to chrome.storage.local
    try {
      await saveTabForLater({ url: tabUrl, title: tabTitle });
    } catch (err) {
      console.error('[tab-out] Failed to save tab:', err);
      showToast(t("failedToSaveTab"));
      return;
    }

    // Close the tab in Chrome
    const allTabs = await queryTabsWithMetadata({});
    const match   = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    // Animate chip out
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => chip.remove(), 200);
    }

    showToast(t("savedForLater"));
    await renderDeferredColumn();
    return;
  }

  // ---- Check off a saved tab (moves it to archive) ----
  if (action === 'check-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await checkOffSavedTab(id);

    // Animate: strikethrough first, then slide out
    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('checked');
      setTimeout(() => {
        item.classList.add('removing');
        setTimeout(() => {
          item.remove();
          renderDeferredColumn(); // refresh counts and archive
        }, 300);
      }, 800);
    }
    return;
  }

  // ---- Dismiss a saved tab (removes it entirely) ----
  if (action === 'dismiss-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await dismissSavedTab(id);

    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('removing');
      setTimeout(() => {
        item.remove();
        renderDeferredColumn();
      }, 300);
    }
    return;
  }

  if (action === 'restore-archived-tab') {
    e.preventDefault();
    e.stopPropagation();
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    try {
      const restored = await restoreArchivedSavedTab(id);
      if (!restored) return;

      await renderDeferredColumn();
      showToast(t("archivedTabRestored"));
    } catch (error) {
      console.warn('[tab-out] Failed to restore archived tab:', error);
      showToast(t("archivedTabActionFailed"));
    }
    return;
  }

  if (action === 'delete-archived-tab') {
    e.preventDefault();
    e.stopPropagation();
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    try {
      const deletion = await deleteArchivedSavedTab(id);
      if (!deletion) return;

      await renderDeferredColumn();
      showToast(t("archivedTabDeleted"), {
        actionLabel: t("undoDelete"),
        duration: 5000,
        onAction: async () => {
          try {
            const reinserted = await reinsertArchivedSavedTab(
              deletion.item,
              deletion.index
            );

            if (!reinserted) {
              return;
            }

            await renderDeferredColumn();
            showToast(t("archivedTabDeleteUndone"));
          } catch (error) {
            console.warn('[tab-out] Failed to undo archived tab deletion:', error);
            showToast(t("archivedTabActionFailed"));
          }
        }
      });
    } catch (error) {
      console.warn('[tab-out] Failed to delete archived tab:', error);
      showToast(t("archivedTabActionFailed"));
    }
    return;
  }

  // ---- Close all tabs in a domain group ----
  if (action === 'close-domain-tabs') {
    const domainId = actionEl.dataset.domainId;
    const group    = domainGroups.find(g => {
      return 'domain-' + g.domain.replace(/[^a-z0-9]/g, '-') === domainId;
    });
    if (!group) return;

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        group.tabs.map((tab) => tab.id),
        "domain"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close an unassigned domain:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    const closedCount = removal.closedTabs.length;
    const fullyClosed = closedCount === group.tabs.length;

    if (card && fullyClosed) {
      playCloseSound();
      animateCardOut(card);
    } else {
      playCloseSound();
      scheduleDashboardRefresh();
    }

    if (fullyClosed) {
      const idx = domainGroups.indexOf(group);
      if (idx !== -1) domainGroups.splice(idx, 1);
    }

    const groupLabel = group.domain === '__landing-pages__' ? t('homepages') : (group.label || friendlyDomain(group.domain));
    showToast(t(closedCount === 1 ? "closedTabsFrom" : "closedTabsFromPlural", { count: closedCount, name: groupLabel }));

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;
    return;
  }

  // ---- Close duplicates, keep one copy ----
  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;

    const tabsToClose = [];

    urls.forEach((url) => {
      const matchingTabs = unassignedOpenTabs.filter(
        (tab) => tab.url === url
      );
      const keep = matchingTabs.find((tab) => tab.active) ||
        matchingTabs[0];

      matchingTabs.forEach((tab) => {
        if (tab.id !== keep?.id) {
          tabsToClose.push(tab.id);
        }
      });
    });

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        tabsToClose,
        "duplicates"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close unassigned duplicates:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    playCloseSound();
    const fullyDeduplicated =
      removal.closedTabs.length === tabsToClose.length;

    if (!fullyDeduplicated) {
      scheduleDashboardRefresh();
      showToast(t("unassignedDuplicatesClosedPartial"));
      return;
    }

    // Hide the dedup button
    actionEl.style.transition = 'opacity 0.2s';
    actionEl.style.opacity    = '0';
    setTimeout(() => actionEl.remove(), 200);

    // Remove dupe badges from the card
    if (card) {
      card.querySelectorAll('.chip-dupe-badge').forEach(b => {
        b.style.transition = 'opacity 0.2s';
        b.style.opacity    = '0';
        setTimeout(() => b.remove(), 200);
      });
      card.querySelectorAll('.open-tabs-badge').forEach(badge => {
        if (badge.textContent.includes('duplicate')) {
          badge.style.transition = 'opacity 0.2s';
          badge.style.opacity    = '0';
          setTimeout(() => badge.remove(), 200);
        }
      });
      card.classList.remove('has-amber-bar');
      card.classList.add('has-neutral-bar');
    }

    showToast(t("unassignedDuplicatesClosed"));
    return;
  }

  // ---- Close ALL open tabs ----
  if (action === 'close-all-open-tabs') {
    const allTabIds = unassignedOpenTabs
      .map((tab) => tab.id)
      .filter(Number.isInteger);

    if (!allTabIds.length) {
      return;
    }

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        allTabIds,
        "all"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close all unassigned tabs:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    playCloseSound();
    const fullyClosed =
      removal.closedTabs.length === allTabIds.length;

    if (fullyClosed) {
      document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
        shootConfetti(
          c.getBoundingClientRect().left + c.offsetWidth / 2,
          c.getBoundingClientRect().top  + c.offsetHeight / 2
        );
        animateCardOut(c);
      });
    } else {
      scheduleDashboardRefresh();
    }

    showToast(t(
      fullyClosed
        ? "unassignedTabsClosed"
        : "unassignedTabsClosedPartial",
      { count: removal.closedTabs.length }
    ));
    return;
  }
});

// ---- Archive toggle — expand/collapse the archive section ----
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#archiveToggle');
  if (!toggle) return;

  toggle.classList.toggle('open');
  const body = document.getElementById('archiveBody');
  if (body) {
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  }
});

// ---- Archive search — filter archived items as user types ----
document.addEventListener('input', async (e) => {
  if (e.target.id !== 'archiveSearch') return;

  try {
    const { archived } = await getSavedTabs();
    renderArchiveItems(archived);
  } catch (err) {
    console.warn(`[tab-out] ${t("archiveSearchFailed")}:`, err);
  }
});


function updateClock() {
  const clock = document.getElementById("clockDisplay");
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString(activeLocale(), {
    hour: "2-digit",
    minute: "2-digit"
  });
}

updateClock();
setInterval(updateClock, 1000);

/* ----------------------------------------------------------------
   INITIALIZE
   ---------------------------------------------------------------- */
renderDashboard();


const DEFAULT_SHORTCUTS = window.TAB_OUT_DEFAULT_SHORTCUTS || [];

let editingShortcutIndex = null;

function normalizeUrl(url) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function getShortcutDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function getShortcutFavicon(domain) {
  if (!domain) {
    return "";
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function getStoredShortcuts() {
  const stored = localStorage.getItem("tabOutShortcuts");

  if (!stored) {
    return [...DEFAULT_SHORTCUTS];
  }

  try {
    const shortcuts = JSON.parse(stored);
    return Array.isArray(shortcuts) ? shortcuts : [...DEFAULT_SHORTCUTS];
  } catch {
    return [...DEFAULT_SHORTCUTS];
  }
}

function saveStoredShortcuts(shortcuts) {
  localStorage.setItem("tabOutShortcuts", JSON.stringify(shortcuts));
}

function renderShortcuts() {
  const container = document.querySelector(".quick-links");

  if (!container) {
    return;
  }

  const addButton = document.getElementById("addShortcutBtn");
  const shortcuts = getStoredShortcuts();

  container.querySelectorAll(".shortcut-item").forEach((item) => {
    item.remove();
  });

  shortcuts.forEach((shortcut, index) => {
    const item = document.createElement("div");
    item.className = "shortcut-item";

    const link = document.createElement("a");
    link.className = "quick-link";
    link.href = shortcut.url;

    const img = document.createElement("img");
    img.alt = "";
    img.src = getShortcutFavicon(shortcut.domain || getShortcutDomain(shortcut.url));

    const label = document.createElement("span");
    label.textContent = shortcut.name;

    const actions = document.createElement("div");
    actions.className = "shortcut-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "shortcut-action-btn shortcut-edit-btn";
    editButton.textContent = "✎";
    editButton.title = t("editShortcut");

    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openShortcutModal(index);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "shortcut-action-btn shortcut-delete-btn";
    deleteButton.textContent = "×";
    deleteButton.title = t("deleteShortcut");

    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const currentShortcuts = getStoredShortcuts();
      currentShortcuts.splice(index, 1);
      saveStoredShortcuts(currentShortcuts);
      renderShortcuts();
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    link.appendChild(img);
    link.appendChild(label);
    link.appendChild(actions);

    item.appendChild(link);
    container.insertBefore(item, addButton);
  });
}

function openShortcutModal(index = null) {
  const modal = document.getElementById("shortcutModal");
  const title = modal ? modal.querySelector("h2") : null;
  const nameInput = document.getElementById("shortcutNameInput");
  const urlInput = document.getElementById("shortcutUrlInput");
  const saveButton = document.getElementById("saveShortcutBtn");
  const deleteButton = document.getElementById("deleteShortcutBtn");

  if (!modal || !nameInput || !urlInput || !saveButton) {
    return;
  }

  editingShortcutIndex = Number.isInteger(index) ? index : null;

  if (editingShortcutIndex !== null) {
    const shortcut = getStoredShortcuts()[editingShortcutIndex];

    if (!shortcut) {
      editingShortcutIndex = null;
      return;
    }

    if (title) title.textContent = t("editShortcutTitle");
    nameInput.value = shortcut.name || "";
    urlInput.value = shortcut.url || "";
    saveButton.textContent = t("saveShortcut");
    if (deleteButton) deleteButton.hidden = false;
  } else {
    if (title) title.textContent = t("addShortcutTitle");
    nameInput.value = "";
    urlInput.value = "";
    saveButton.textContent = t("addShortcut");
    if (deleteButton) deleteButton.hidden = true;
  }

  modal.hidden = false;
  nameInput.focus();
}

function closeShortcutModal() {
  const modal = document.getElementById("shortcutModal");

  if (!modal) {
    return;
  }

  editingShortcutIndex = null;
  modal.hidden = true;
}

function saveShortcutFromModal() {
  const nameInput = document.getElementById("shortcutNameInput");
  const urlInput = document.getElementById("shortcutUrlInput");

  if (!nameInput || !urlInput) {
    return;
  }

  const name = nameInput.value.trim();
  const url = normalizeUrl(urlInput.value);

  if (!name || !url) {
    return;
  }

  const shortcuts = getStoredShortcuts();
  const domain = getShortcutDomain(url);
  const nextShortcut = {
    name,
    url,
    domain
  };

  if (editingShortcutIndex !== null && shortcuts[editingShortcutIndex]) {
    shortcuts[editingShortcutIndex] = nextShortcut;
  } else {
    shortcuts.push(nextShortcut);
  }

  saveStoredShortcuts(shortcuts);
  renderShortcuts();
  closeShortcutModal();
}

function deleteShortcut(index = editingShortcutIndex) {
  if (index === null || index === undefined) {
    return;
  }

  const shortcuts = getStoredShortcuts();
  const shortcut = shortcuts[index];

  if (!shortcut) {
    return;
  }

  const confirmed = confirm(t("deleteShortcutConfirm", { name: shortcut.name }));

  if (!confirmed) {
    return;
  }

  shortcuts.splice(index, 1);
  saveStoredShortcuts(shortcuts);
  renderShortcuts();
  closeShortcutModal();
}

function resetShortcutsToDefault() {
  const confirmed = confirm(t("resetShortcutsConfirm"));

  if (!confirmed) {
    return;
  }

  saveStoredShortcuts([...DEFAULT_SHORTCUTS]);
  renderShortcuts();
  closeShortcutModal();
}

function setupShortcutManager() {
  const addButton = document.getElementById("addShortcutBtn");
  const cancelButton = document.getElementById("cancelShortcutBtn");
  const saveButton = document.getElementById("saveShortcutBtn");
  const deleteButton = document.getElementById("deleteShortcutBtn");
  const modal = document.getElementById("shortcutModal");
  const nameInput = document.getElementById("shortcutNameInput");
  const urlInput = document.getElementById("shortcutUrlInput");

  if (addButton) {
    addButton.addEventListener("click", () => openShortcutModal());
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closeShortcutModal);
  }

  if (saveButton) {
    saveButton.addEventListener("click", saveShortcutFromModal);
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", () => deleteShortcut());
  }

  [nameInput, urlInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveShortcutFromModal();
      }

      if (event.key === "Escape") {
        closeShortcutModal();
      }
    });
  });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeShortcutModal();
      }
    });
  }

  renderShortcuts();
  applyStaticTranslations();
}

document.addEventListener("DOMContentLoaded", setupShortcutManager);


/* ----------------------------------------------------------------
   LANGUAGE SWITCHER
   ---------------------------------------------------------------- */

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    element.title = t(key);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    element.setAttribute("aria-label", t(key));
  });

  updateLanguageButton();
}

function updateLanguageButton() {
  const button = document.getElementById("languageToggleBtn");

  if (!button) {
    return;
  }

  button.textContent = currentLanguage.toUpperCase();
  button.title = currentLanguage === "fr" ? t("languageSwitchToEnglish") : t("languageSwitchToFrench");
}

async function setupLanguageSwitcher() {
  await getLanguage();

  applyStaticTranslations();

  const button = document.getElementById("languageToggleBtn");

  if (!button) {
    return;
  }

  updateLanguageButton();

  button.addEventListener("click", async () => {
    const nextLanguage = currentLanguage === "fr" ? "en" : "fr";

    await setLanguage(nextLanguage);

    applyStaticTranslations();
    updateLanguageButton();

    await renderDashboard();
    await renderSavedSessions();
    await loadWeather({ force: false });
    await globalThis.TabOutTodoWidget?.refresh?.();
  });
}

document.addEventListener("DOMContentLoaded", setupLanguageSwitcher);

/* ----------------------------------------------------------------
   BACKUP / IMPORT — discreet local data safety net
   ---------------------------------------------------------------- */

const TAB_OUT_BACKUP_VERSION = 4;
const TAB_OUT_CHROME_STORAGE_BACKUP_KEYS = [
  "savedSessions",
  "tabOutSessionSchemaVersion",
  "tabOutLanguage",
  "tabOutDashboardSettings",
  "deferred",
  "tabOutTodoStateV1"
];
const TAB_OUT_LEGACY_BACKUP_KEYS = [
  "tabOutProtectedGroups"
];
const TAB_OUT_LOCAL_STORAGE_BACKUP_KEYS = [
  "tabOutShortcuts"
];

function toggleBackupMenu(forceOpen = null) {
  const menu = document.getElementById("backupMenu");
  const button = document.getElementById("backupMenuBtn");

  if (!menu || !button) {
    return;
  }

  const shouldOpen = forceOpen === null ? menu.hidden : Boolean(forceOpen);

  menu.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
}

function closeBackupMenu() {
  toggleBackupMenu(false);
}

async function collectTabOutBackupData() {
  const chromeData = await chrome.storage.local.get(TAB_OUT_CHROME_STORAGE_BACKUP_KEYS);
  const localData = {};

  TAB_OUT_LOCAL_STORAGE_BACKUP_KEYS.forEach((key) => {
    const rawValue = localStorage.getItem(key);

    if (rawValue === null) {
      return;
    }

    try {
      localData[key] = JSON.parse(rawValue);
    } catch {
      localData[key] = rawValue;
    }
  });

  return {
    app: "Tab Out Custom",
    type: "tab-out-backup",
    version: TAB_OUT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      chromeStorage: chromeData,
      localStorage: localData
    }
  };
}

function downloadJsonBackup(payload) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `tab-out-backup-${date}.json`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportTabOutData() {
  try {
    const backup = await collectTabOutBackupData();

    downloadJsonBackup(backup);
    closeBackupMenu();
    showToast(t("exportSuccess"));
  } catch (error) {
    console.warn("[tab-out] backup export failed:", error);
    showToast(t("exportFailed"));
  }
}

function openBackupImportPicker() {
  const input = document.getElementById("backupImportInput");

  closeBackupMenu();

  if (!input) {
    return;
  }

  input.value = "";
  input.click();
}

function validateBackupPayload(payload) {
  return Boolean(
    payload &&
    payload.type === "tab-out-backup" &&
    payload.data &&
    typeof payload.data === "object" &&
    payload.data.chromeStorage &&
    typeof payload.data.chromeStorage === "object" &&
    payload.data.localStorage &&
    typeof payload.data.localStorage === "object"
  );
}

async function importTabOutDataFromFile(file) {
  if (!file) {
    return;
  }

  try {
    const rawText = await file.text();
    const payload = JSON.parse(rawText);

    if (!validateBackupPayload(payload)) {
      showToast(t("invalidBackupFile"));
      return;
    }

    const confirmed = confirm(t("importConfirm"));

    if (!confirmed) {
      return;
    }

    const chromeStorageData = {};
    const acceptedChromeKeys = [
      ...TAB_OUT_CHROME_STORAGE_BACKUP_KEYS,
      ...TAB_OUT_LEGACY_BACKUP_KEYS
    ];

    acceptedChromeKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload.data.chromeStorage, key)) {
        chromeStorageData[key] = payload.data.chromeStorage[key];
      }
    });

    if (
      chromeStorageData.tabOutTodoStateV1 &&
      globalThis.TabOutTodoService?.normalizeState
    ) {
      chromeStorageData.tabOutTodoStateV1 =
        globalThis.TabOutTodoService.normalizeState(
          chromeStorageData.tabOutTodoStateV1
        );
    }

    await chrome.storage.local.remove([
      ...acceptedChromeKeys,
      "tabOutTodoUndoV1"
    ]);

    if (Object.keys(chromeStorageData).length) {
      await chrome.storage.local.set(chromeStorageData);
    }

    unifiedSessionMigrationPromise = null;
    await ensureUnifiedSessionStorage();

    TAB_OUT_LOCAL_STORAGE_BACKUP_KEYS.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(payload.data.localStorage, key)) {
        return;
      }

      localStorage.setItem(key, JSON.stringify(payload.data.localStorage[key]));
    });

    await getLanguage();
    applyStaticTranslations();

    if (typeof renderShortcuts === "function") {
      renderShortcuts();
    }

    await renderDashboard();
    await renderSavedSessions();
    await globalThis.TabOutTodoWidget?.refresh?.();

    showToast(t("importSuccess"));
  } catch (error) {
    console.warn("[tab-out] backup import failed:", error);
    showToast(t("importFailed"));
  }
}

function setupBackupMenu() {
  const input = document.getElementById("backupImportInput");

  if (input) {
    input.addEventListener("change", async () => {
      await importTabOutDataFromFile(input.files?.[0]);
      input.value = "";
    });
  }
}

document.addEventListener("click", (event) => {
  if (!event.target.closest("#backupMenuWrap")) {
    closeBackupMenu();
  }
});

document.addEventListener("DOMContentLoaded", setupBackupMenu);

/* ----------------------------------------------------------------
   WEATHER WIDGET — local weather, city hidden by default
   ---------------------------------------------------------------- */

   const WEATHER_CACHE_KEY = "tabOutWeatherCache";
   const WEATHER_ENABLED_KEY = "tabOutWeatherEnabled";
   const WEATHER_CACHE_MAX_AGE = 45 * 60 * 1000; // 45 min
   const WEATHER_AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // vérifie toutes les 5 min
   let weatherAutoRefreshTimer = null;
   let weatherCityVisible = false;
   
   function mapWeatherCode(code) {
     if ([0].includes(code)) {
       return { kind: "sun", label: t("weatherSun") };
     }
   
     if ([1, 2].includes(code)) {
       return { kind: "partly", label: t("weatherPartly") };
     }
   
     if ([3].includes(code)) {
       return { kind: "cloud", label: t("weatherCloud") };
     }
   
     if ([45, 48].includes(code)) {
       return { kind: "fog", label: t("weatherFog") };
     }
   
     if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
       return { kind: "rain", label: t("weatherRain") };
     }
   
     if ([71, 73, 75, 77, 85, 86].includes(code)) {
       return { kind: "snow", label: t("weatherSnow") };
     }
   
     if ([95, 96, 99].includes(code)) {
       return { kind: "storm", label: t("weatherStorm") };
     }
   
     return { kind: "cloud", label: t("weatherGeneric") };
   }
   
   function roundTemp(value) {
     if (typeof value !== "number") {
       return "--";
     }
   
     return Math.round(value);
   }


   function startWeatherAutoRefresh() {
    stopWeatherAutoRefresh();

    if (
      globalThis.TabOutDashboardRuntime &&
      !globalThis.TabOutDashboardRuntime.isModuleVisible("weather")
    ) {
      return;
    }
  
    weatherAutoRefreshTimer = setInterval(() => {
      loadWeather({ force: false });
    }, WEATHER_AUTO_REFRESH_INTERVAL);
  }

   function stopWeatherAutoRefresh() {
    if (weatherAutoRefreshTimer) {
      clearInterval(weatherAutoRefreshTimer);
      weatherAutoRefreshTimer = null;
    }
   }
   
   async function getStoredWeatherCache() {
     const { [WEATHER_CACHE_KEY]: cache } = await chrome.storage.local.get(WEATHER_CACHE_KEY);
   
     if (!cache || !cache.timestamp) {
       return null;
     }
   
     const isFresh = Date.now() - cache.timestamp < WEATHER_CACHE_MAX_AGE;
   
     return isFresh ? cache : null;
   }

   async function isWeatherEnabled() {
     const stored = await chrome.storage.local.get([
       WEATHER_ENABLED_KEY,
       WEATHER_CACHE_KEY
     ]);

     return Boolean(
       stored[WEATHER_ENABLED_KEY] ||
       stored[WEATHER_CACHE_KEY]?.timestamp
     );
   }
   
   async function saveWeatherCache(data) {
     await chrome.storage.local.set({
       [WEATHER_CACHE_KEY]: {
         ...data,
         timestamp: Date.now()
       }
     });
   }
   
   function getCurrentPositionPromise() {
     return new Promise((resolve, reject) => {
       if (!navigator.geolocation) {
         const error = new Error("Geolocation unavailable");
         error.code = "GEOLOCATION_UNAVAILABLE";
         reject(error);
         return;
       }
   
       navigator.geolocation.getCurrentPosition(resolve, reject, {
         enableHighAccuracy: false,
         timeout: 8000,
         maximumAge: 60 * 60 * 1000
       });
     });
   }
   
   async function reverseGeocodeCity(latitude, longitude) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2` +
        `&lat=${latitude}` +
        `&lon=${longitude}` +
        `&zoom=10` +
        `&addressdetails=1`;
  
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });
  
      if (!response.ok) {
        return "";
      }
  
      const data = await response.json();
      const address = data.address || {};
  
      return (
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state ||
        ""
      );
    } catch {
      return "";
    }
  }
   
   async function fetchWeatherForPosition(latitude, longitude) {
     const url =
       `https://api.open-meteo.com/v1/forecast` +
       `?latitude=${latitude}` +
       `&longitude=${longitude}` +
       `&current=temperature_2m,apparent_temperature,weather_code` +
       `&timezone=auto`;
   
     const response = await fetch(url);
   
     if (!response.ok) {
       const error = new Error("Weather request failed");
       error.code = "WEATHER_REQUEST_FAILED";
       throw error;
     }
   
     const data = await response.json();
     const current = data.current || {};
     const mapped = mapWeatherCode(current.weather_code);
   
     const city = await reverseGeocodeCity(latitude, longitude);
   
     return {
       temperature: roundTemp(current.temperature_2m),
       feelsLike: roundTemp(current.apparent_temperature),
       condition: mapped.label,
       kind: mapped.kind,
       city,
       latitude,
       longitude
     };
   }
   
   
function translateWeatherKind(kind, fallback = "") {
  const keyMap = {
    sun: "weatherSun",
    partly: "weatherPartly",
    cloud: "weatherCloud",
    fog: "weatherFog",
    rain: "weatherRain",
    snow: "weatherSnow",
    storm: "weatherStorm"
  };

  return t(keyMap[kind] || "weatherGeneric") || fallback;
}

function renderWeatherWidget(weather, cityVisible = false) {
     const widget = document.getElementById("weatherWidget");
     const enableBtn = document.getElementById("weatherEnableBtn");
     const content = document.getElementById("weatherContent");
     const visual = document.getElementById("weatherVisual");
     const temp = document.getElementById("weatherTemp");
     const condition = document.getElementById("weatherCondition");
     const feelsLike = document.getElementById("weatherFeelsLike");
     const cityText = document.getElementById("weatherCityText");
     const cityToggle = document.getElementById("weatherCityToggle");
   
     if (!widget || !enableBtn || !content || !visual || !temp || !condition || !feelsLike || !cityText || !cityToggle) {
       return;
     }
   
     widget.hidden = false;
     enableBtn.hidden = true;
     content.hidden = false;
   
     visual.dataset.weather = weather.kind || "cloud";
     temp.textContent = `${weather.temperature}°C`;
     condition.textContent = translateWeatherKind(weather.kind, weather.condition);
     feelsLike.textContent = t("weatherFeelsLike", { temp: weather.feelsLike });
   
     cityText.textContent = cityVisible && weather.city ? weather.city : "";
     cityToggle.classList.toggle("is-visible", cityVisible && Boolean(weather.city));
     cityToggle.setAttribute("aria-label", cityVisible ? t("hideCity") : t("showCity"));
   }
   
   function renderWeatherEnableState() {
     const widget = document.getElementById("weatherWidget");
     const enableBtn = document.getElementById("weatherEnableBtn");
     const content = document.getElementById("weatherContent");
   
     if (!widget || !enableBtn || !content) {
       return;
     }
   
     widget.hidden = false;
     enableBtn.hidden = false;
     content.hidden = true;
   }

   function getWeatherErrorMessageKey(error) {
     if (Number(error?.code) === 1) {
       return "weatherPermissionDenied";
     }

     if (
       Number(error?.code) === 2 ||
       error?.code === "GEOLOCATION_UNAVAILABLE"
     ) {
       return "weatherLocationUnavailable";
     }

     if (Number(error?.code) === 3) {
       return "weatherLocationTimeout";
     }

     if (
       error?.code === "WEATHER_REQUEST_FAILED" ||
       error instanceof TypeError
     ) {
       return "weatherNetworkError";
     }

     return "weatherLoadFailed";
   }
   
   async function loadWeather({
     force = false,
     notifyOnError = false
   } = {}) {
     if (
       globalThis.TabOutDashboardRuntime &&
       !globalThis.TabOutDashboardRuntime.isModuleVisible("weather")
     ) {
       stopWeatherAutoRefresh();
       return;
     }

     try {
       const cached = !force ? await getStoredWeatherCache() : null;
       const cityVisible = false;
       weatherCityVisible = false;
   
       if (cached) {
         renderWeatherWidget(cached, cityVisible);
         return true;
       }

       if (!force && !await isWeatherEnabled()) {
         renderWeatherEnableState();
         return false;
       }
   
       const position = await getCurrentPositionPromise();
       const { latitude, longitude } = position.coords;
   
       const weather = await fetchWeatherForPosition(latitude, longitude);
   
       await saveWeatherCache(weather);
       await chrome.storage.local.set({
         [WEATHER_ENABLED_KEY]: true
       });
       renderWeatherWidget(weather, cityVisible);
       return true;
     } catch (error) {
       console.warn("[tab-out] Could not load weather:", error);
       renderWeatherEnableState();

       if (notifyOnError) {
         showToast(t(getWeatherErrorMessageKey(error)));
       }

       return false;
     }
   }
   
   async function setupWeatherWidget() {
     const enableBtn = document.getElementById("weatherEnableBtn");
     const cityToggle = document.getElementById("weatherCityToggle");
     const widget = document.getElementById("weatherWidget");
   
     if (!widget) {
       return;
     }

     if (enableBtn) {
       enableBtn.addEventListener("click", async () => {
         enableBtn.disabled = true;
         enableBtn.setAttribute("aria-busy", "true");
         enableBtn.textContent = t("weatherLoading");

         try {
           const enabled = await loadWeather({
             force: true,
             notifyOnError: true
           });

           if (enabled) {
             startWeatherAutoRefresh();
           }
         } finally {
           enableBtn.disabled = false;
           enableBtn.removeAttribute("aria-busy");
           enableBtn.textContent = t("weatherEnable");
         }
       });
     }
   
     if (cityToggle) {
      cityToggle.addEventListener("click", async () => {
        weatherCityVisible = !weatherCityVisible;
  
        const cache = await getStoredWeatherCache();
  
        if (cache) {
          renderWeatherWidget(cache, weatherCityVisible);
         }
       });
     }

     if (globalThis.TabOutDashboardRuntime?.ready) {
       await globalThis.TabOutDashboardRuntime.ready;
     }

     if (
       globalThis.TabOutDashboardRuntime &&
       !globalThis.TabOutDashboardRuntime.isModuleVisible("weather")
     ) {
       stopWeatherAutoRefresh();
       return;
     }

     const enabled = await loadWeather({ force: false });

     if (enabled) {
       startWeatherAutoRefresh();
     } else {
       stopWeatherAutoRefresh();
     }
  }
  
  document.addEventListener("DOMContentLoaded", setupWeatherWidget);

/* ----------------------------------------------------------------
   PROTECTED CHROME TAB GROUPS
   Compact snapshot-based sync inside the Sessions section.
   ---------------------------------------------------------------- */

const PROTECTED_GROUPS_STORAGE_KEY = "tabOutProtectedGroups";

const CHROME_GROUP_COLORS = {
  grey: "#9aa0a6",
  blue: "#8ab4f8",
  red: "#f28b82",
  yellow: "#fdd663",
  green: "#81c995",
  pink: "#ff8bcb",
  purple: "#c58af9",
  cyan: "#78d9ec",
  orange: "#fcad70"
};

function protectedGroupsToast(message) {
  if (typeof showToast === "function") {
    showToast(message);
    return;
  }

  console.log(message);
}

function createProtectedGroupId() {
  return `protected-group-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeGroupUrl(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url || "";
  }
}

function getGroupFavicon(url = "") {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`;
  } catch {
    return "";
  }
}

function getGroupSignature(group) {
  const urls = (group.tabs || [])
    .map((tab) => normalizeGroupUrl(tab.url))
    .filter(Boolean)
    .sort();

  return JSON.stringify({
    title: group.title || "",
    color: group.color || "grey",
    urls
  });
}

async function getProtectedGroups() {
  const result = await chrome.storage.local.get(PROTECTED_GROUPS_STORAGE_KEY);
  return result[PROTECTED_GROUPS_STORAGE_KEY] || [];
}

async function saveProtectedGroups(groups) {
  await chrome.storage.local.set({
    [PROTECTED_GROUPS_STORAGE_KEY]: groups
  });
}

async function getCurrentChromeGroups() {
  if (!chrome?.tabGroups?.query) {
    return [];
  }

  const groups = await chrome.tabGroups.query({});
  const tabs = await queryTabsWithMetadata({});

  return groups
    .map((group) => {
      const groupTabs = tabs
        .filter((tab) => tab.groupId === group.id)
        .map((tab) => ({
          id: tab.id,
          windowId: tab.windowId,
          title: tab.title || "",
          url: tab.pendingUrl || tab.url || "",
          favIconUrl: tab.favIconUrl || getGroupFavicon(tab.pendingUrl || tab.url || "")
        }))
        .filter((tab) => tab.url);

      return {
        chromeGroupId: group.id,
        windowId: group.windowId,
        title: group.title || t("untitledChromeGroup"),
        color: group.color || "grey",
        collapsed: Boolean(group.collapsed),
        tabs: groupTabs
      };
    })
    .filter((group) => group.tabs.length > 0);
}

async function getActiveChromeGroup() {
  if (!chrome?.tabGroups?.get) {
    return null;
  }

  const [activeTab] = await queryTabsWithMetadata({
    active: true,
    currentWindow: true
  });

  if (!activeTab || activeTab.groupId === undefined || activeTab.groupId === -1) {
    return null;
  }

  const chromeGroup = await chrome.tabGroups.get(activeTab.groupId);
  const allTabs = await queryTabsWithMetadata({});

  const groupTabs = allTabs
    .filter((tab) => tab.groupId === chromeGroup.id)
    .map((tab) => ({
      id: tab.id,
      windowId: tab.windowId,
      title: tab.title || "",
      url: tab.pendingUrl || tab.url || "",
      favIconUrl: tab.favIconUrl || getGroupFavicon(tab.pendingUrl || tab.url || "")
    }))
    .filter((tab) => tab.url);

  if (!groupTabs.length) {
    return null;
  }

  return {
    chromeGroupId: chromeGroup.id,
    title: chromeGroup.title || t("untitledChromeGroup"),
    color: chromeGroup.color || "grey",
    collapsed: Boolean(chromeGroup.collapsed),
    tabs: groupTabs
  };
}

function createSnapshotFromChromeGroup(group) {
  return {
    id: createProtectedGroupId(),
    chromeGroupId: group.chromeGroupId,
    title: group.title || t("untitledChromeGroup"),
    color: group.color || "grey",
    tabs: (group.tabs || []).map((tab) => ({
      title: tab.title || "",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || getGroupFavicon(tab.url || "")
    })),
    baseSignature: getGroupSignature(group),
    ignoredSignature: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function getUrlOverlapScore(snapshot, liveGroup) {
  const snapshotUrls = new Set(
    (snapshot.tabs || []).map((tab) => normalizeGroupUrl(tab.url)).filter(Boolean)
  );

  const liveUrls = new Set(
    (liveGroup.tabs || []).map((tab) => normalizeGroupUrl(tab.url)).filter(Boolean)
  );

  if (!snapshotUrls.size || !liveUrls.size) {
    return 0;
  }

  let matches = 0;

  snapshotUrls.forEach((url) => {
    if (liveUrls.has(url)) {
      matches += 1;
    }
  });

  return matches / Math.max(snapshotUrls.size, liveUrls.size);
}

function findLiveGroupForSnapshot(snapshot, liveGroups) {
  const exactIdMatch = liveGroups.find(
    (group) => group.chromeGroupId === snapshot.chromeGroupId
  );

  if (exactIdMatch) {
    return exactIdMatch;
  }

  const sameTitleGroups = liveGroups.filter(
    (group) => (group.title || "") === (snapshot.title || "")
  );

  if (sameTitleGroups.length === 1) {
    return sameTitleGroups[0];
  }

  let bestMatch = null;
  let bestScore = 0;

  liveGroups.forEach((group) => {
    const score = getUrlOverlapScore(snapshot, group);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = group;
    }
  });

  return bestScore >= 0.5 ? bestMatch : null;
}

function diffProtectedGroup(snapshot, liveGroup) {
  if (!liveGroup) {
    return {
      missing: true,
      changed: true,
      ignored: false,
      addedTabs: [],
      removedTabs: snapshot.tabs || []
    };
  }

  const liveSignature = getGroupSignature(liveGroup);
  const changed = liveSignature !== snapshot.baseSignature;
  const ignored = changed && snapshot.ignoredSignature === liveSignature;

  const snapshotUrls = new Map(
    (snapshot.tabs || []).map((tab) => [normalizeGroupUrl(tab.url), tab])
  );

  const liveUrls = new Map(
    (liveGroup.tabs || []).map((tab) => [normalizeGroupUrl(tab.url), tab])
  );

  const addedTabs = [];
  const removedTabs = [];

  liveUrls.forEach((tab, url) => {
    if (!snapshotUrls.has(url)) {
      addedTabs.push(tab);
    }
  });

  snapshotUrls.forEach((tab, url) => {
    if (!liveUrls.has(url)) {
      removedTabs.push(tab);
    }
  });

  return {
    missing: false,
    changed,
    ignored,
    liveSignature,
    addedTabs,
    removedTabs
  };
}

function getProtectedGroupChangeLabel(diff) {
  const added = diff.addedTabs?.length || 0;
  const removed = diff.removedTabs?.length || 0;

  if (added && removed) {
    return t("chromeGroupChangeAddedRemoved", { added, removed });
  }

  if (added) {
    return t("chromeGroupChangeAdded", { added });
  }

  if (removed) {
    return t("chromeGroupChangeRemoved", { removed });
  }

  return t("chromeGroupChanged");
}

function getProtectedGroupChangeTooltip(diff) {
  return t("chromeGroupChangeTooltip", {
    added: diff.addedTabs?.length || 0,
    removed: diff.removedTabs?.length || 0
  });
}

function getProtectedGroupStatus(snapshot, liveGroup, diff) {
  if (diff.missing) {
    return {
      className: "is-missing",
      label: t("chromeGroupMissing"),
      tooltip: t("chromeGroupMissing")
    };
  }

  if (!diff.changed || diff.ignored) {
    return {
      className: "is-synced",
      label: t("chromeGroupSynced"),
      tooltip: t("chromeGroupSynced")
    };
  }

  return {
    className: "is-changed",
    label: getProtectedGroupChangeLabel(diff),
    tooltip: getProtectedGroupChangeTooltip(diff)
  };
}

function getProtectedGroupLastSavedText(snapshot) {
  const savedAt = snapshot.updatedAt || snapshot.createdAt;

  if (!savedAt) {
    return "";
  }

  return t("chromeGroupLastSaved", { time: timeAgo(savedAt) });
}

function getProtectedGroupCardTooltip({ title, tabsCount, statusLabel, statusTooltip, lastSavedText = "" }) {
  return [
    title,
    `${tabsCount} · ${statusLabel}`,
    statusTooltip && statusTooltip !== statusLabel ? statusTooltip : "",
    lastSavedText,
    t("chromeGroupTooltipStatusColor")
  ].filter(Boolean).join("\n");
}

function renderProtectedGroupFavicons(targetEl, tabs = []) {
  targetEl.innerHTML = "";

  tabs.slice(0, 4).forEach((tab) => {
    const favicon = tab.favIconUrl || getGroupFavicon(tab.url);

    if (!favicon) {
      return;
    }

    const img = document.createElement("img");
    img.alt = "";
    img.src = favicon;
    targetEl.appendChild(img);
  });

  if (tabs.length > 4) {
    const more = document.createElement("span");
    more.className = "saved-session-more";
    more.textContent = `+${tabs.length - 4}`;
    targetEl.appendChild(more);
  }
}

function closeProtectedGroupMenus() {
  document.querySelectorAll(".protected-group-menu").forEach((menu) => {
    menu.hidden = true;
  });
}

function toggleProtectedGroupMenu(menuKey) {
  const menu = document.querySelector(
    `.protected-group-menu[data-menu-key="${CSS.escape(menuKey)}"]`
  );

  if (!menu) {
    return;
  }

  const shouldOpen = menu.hidden;

  closeProtectedGroupMenus();

  menu.hidden = !shouldOpen;
}

function createProtectedMenuButton(label, action, dataset = {}, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;

  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });

  if (className) {
    button.className = className;
  }

  return button;
}

function findSnapshotForLiveGroup(liveGroup, protectedGroups) {
  const exactMatch = protectedGroups.find(
    (snapshot) => snapshot.chromeGroupId === liveGroup.chromeGroupId
  );

  if (exactMatch) {
    return exactMatch;
  }

  let bestMatch = null;
  let bestScore = 0;

  protectedGroups.forEach((snapshot) => {
    const score = getUrlOverlapScore(snapshot, liveGroup);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = snapshot;
    }
  });

  return bestScore >= 0.65 ? bestMatch : null;
}

function renderLiveChromeGroupCard(group) {
  const menuKey = `chrome-${group.chromeGroupId}`;
  const groupTitle = group.title || t("untitledChromeGroup");
  const tabsText = plural(group.tabs.length, "chromeGroupTabCount", "chromeGroupTabsCount");
  const statusLabel = t("chromeGroupUnprotected");

  const card = document.createElement("div");
  card.className = "saved-session-card is-protected-group is-unprotected";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "saved-session-open";
  openButton.dataset.action = "view-live-chrome-group";
  openButton.dataset.groupId = String(group.chromeGroupId);
  openButton.title = getProtectedGroupCardTooltip({
    title: groupTitle,
    tabsCount: tabsText,
    statusLabel,
    statusTooltip: statusLabel
  });

  const title = document.createElement("span");
  title.className = "saved-session-title";
  title.textContent = groupTitle;

  const meta = document.createElement("span");
  meta.className = "saved-session-meta";
  meta.textContent = `${tabsText} · ${statusLabel}`;
  meta.title = openButton.title;

  const favicons = document.createElement("span");
  favicons.className = "saved-session-favicons";
  renderProtectedGroupFavicons(favicons, group.tabs);

  const colorDot = document.createElement("span");
  colorDot.className = "chrome-group-color-dot";
  colorDot.style.setProperty("--chrome-group-color", CHROME_GROUP_COLORS[group.color] || CHROME_GROUP_COLORS.grey);
  colorDot.title = t("chromeGroupNativeColor");

  openButton.appendChild(colorDot);
  openButton.appendChild(title);
  openButton.appendChild(meta);
  openButton.appendChild(favicons);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "saved-session-edit";
  editButton.textContent = "✎";
  editButton.title = t("protectChromeGroup");
  editButton.dataset.action = "toggle-protected-group-menu";
  editButton.dataset.menuKey = menuKey;

  const menu = document.createElement("div");
  menu.className = "protected-group-menu";
  menu.dataset.menuKey = menuKey;
  menu.hidden = true;

  menu.appendChild(createProtectedMenuButton(
    t("protectChromeGroup"),
    "protect-chrome-group",
    { groupId: String(group.chromeGroupId) }
  ));

  card.appendChild(openButton);
  card.appendChild(editButton);
  card.appendChild(menu);

  return card;
}

function renderProtectedGroupCard(snapshot, liveGroups, liveGroupOverride = undefined) {
  const liveGroup = liveGroupOverride === undefined
    ? findLiveGroupForSnapshot(snapshot, liveGroups)
    : liveGroupOverride;
  const diff = diffProtectedGroup(snapshot, liveGroup);
  const status = getProtectedGroupStatus(snapshot, liveGroup, diff);
  const menuKey = `snapshot-${snapshot.id}`;
  const groupTitle = snapshot.title || t("untitledChromeGroup");
  const tabsText = plural(snapshot.tabs.length, "chromeGroupTabCount", "chromeGroupTabsCount");
  const lastSavedText = getProtectedGroupLastSavedText(snapshot);

  const card = document.createElement("div");
  card.className = `saved-session-card is-protected-group ${status.className}`;

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "saved-session-open";
  openButton.dataset.action = "view-protected-group";
  openButton.dataset.snapshotId = snapshot.id;
  openButton.title = getProtectedGroupCardTooltip({
    title: groupTitle,
    tabsCount: tabsText,
    statusLabel: status.label,
    statusTooltip: status.tooltip,
    lastSavedText
  });

  const title = document.createElement("span");
  title.className = "saved-session-title";
  title.textContent = groupTitle;

  const meta = document.createElement("span");
  meta.className = "saved-session-meta";
  meta.textContent = `${tabsText} · ${status.label}`;
  meta.title = openButton.title;

  const favicons = document.createElement("span");
  favicons.className = "saved-session-favicons";
  renderProtectedGroupFavicons(favicons, snapshot.tabs);

  const colorDot = document.createElement("span");
  colorDot.className = "chrome-group-color-dot";
  colorDot.style.setProperty("--chrome-group-color", CHROME_GROUP_COLORS[snapshot.color] || CHROME_GROUP_COLORS.grey);
  colorDot.title = t("chromeGroupNativeColor");

  openButton.appendChild(colorDot);
  openButton.appendChild(title);
  openButton.appendChild(meta);
  openButton.appendChild(favicons);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "saved-session-edit";
  editButton.textContent = "✎";
  editButton.title = t("editSession");
  editButton.dataset.action = "toggle-protected-group-menu";
  editButton.dataset.menuKey = menuKey;

  const menu = document.createElement("div");
  menu.className = "protected-group-menu";
  menu.dataset.menuKey = menuKey;
  menu.hidden = true;

  if (lastSavedText) {
    const note = document.createElement("div");
    note.className = "protected-group-menu-note";
    note.textContent = lastSavedText;
    menu.appendChild(note);
  }

  menu.appendChild(createProtectedMenuButton(
    t("restoreProtectedGroup"),
    "restore-protected-group",
    { snapshotId: snapshot.id }
  ));

  menu.appendChild(createProtectedMenuButton(
    t("openProtectedGroupCopy"),
    "open-protected-group-copy",
    { snapshotId: snapshot.id }
  ));

  if (liveGroup) {
    menu.appendChild(createProtectedMenuButton(
      t("updateProtectedGroup"),
      "update-protected-group",
      { snapshotId: snapshot.id }
    ));
  }

  if (diff.changed && !diff.ignored && liveGroup) {
    menu.appendChild(createProtectedMenuButton(
      t("ignoreProtectedGroupChange"),
      "ignore-protected-group",
      { snapshotId: snapshot.id }
    ));
  }

  menu.appendChild(createProtectedMenuButton(
    t("deleteProtectedGroup"),
    "delete-protected-group",
    { snapshotId: snapshot.id },
    "danger"
  ));

  card.appendChild(openButton);
  card.appendChild(editButton);
  card.appendChild(menu);

  return card;
}

let lastProtectedGroupsRenderSignature = "";

function getProtectedGroupsRenderSignature(liveGroups, protectedGroups) {
  const livePart = liveGroups
    .map((group) => ({
      id: group.chromeGroupId,
      title: group.title || "",
      color: group.color || "grey",
      signature: getGroupSignature(group)
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const protectedPart = protectedGroups.map((snapshot) => ({
    id: snapshot.id,
    chromeGroupId: snapshot.chromeGroupId,
    title: snapshot.title || "",
    color: snapshot.color || "grey",
    baseSignature: snapshot.baseSignature || "",
    ignoredSignature: snapshot.ignoredSignature || "",
    createdAt: snapshot.createdAt || "",
    updatedAt: snapshot.updatedAt || ""
  }));

  return JSON.stringify({ livePart, protectedPart, language: currentLanguage });
}

function sortLiveChromeGroupsForDisplay(groups) {
  return [...groups].sort((a, b) => {
    const titleCompare = (a.title || "").localeCompare(b.title || "", activeLocale(), {
      sensitivity: "base",
      numeric: true
    });

    if (titleCompare !== 0) {
      return titleCompare;
    }

    return String(a.chromeGroupId).localeCompare(String(b.chromeGroupId));
  });
}

async function renderProtectedGroupsIntoSessions(list, { force = false } = {}) {
  if (!list) {
    return;
  }

  const [liveGroups, protectedGroups] = await Promise.all([
    getCurrentChromeGroups(),
    getProtectedGroups()
  ]);

  const signature = getProtectedGroupsRenderSignature(liveGroups, protectedGroups);

  if (!force && signature === lastProtectedGroupsRenderSignature) {
    return;
  }

  lastProtectedGroupsRenderSignature = signature;

  const renderedSnapshotIds = new Set();
  const renderedLiveGroupIds = new Set();
  const fragment = document.createDocumentFragment();

  // Protected groups are rendered first and keep the user's snapshot order.
  // This prevents Chrome's live group ordering from reshuffling the cards on focus changes.
  protectedGroups.forEach((snapshot) => {
    const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

    if (liveGroup) {
      renderedLiveGroupIds.add(liveGroup.chromeGroupId);
    }

    renderedSnapshotIds.add(snapshot.id);
    fragment.appendChild(renderProtectedGroupCard(snapshot, liveGroups, liveGroup || null));
  });

  sortLiveChromeGroupsForDisplay(liveGroups).forEach((liveGroup) => {
    if (renderedLiveGroupIds.has(liveGroup.chromeGroupId)) {
      return;
    }

    const snapshot = findSnapshotForLiveGroup(liveGroup, protectedGroups);

    if (snapshot && renderedSnapshotIds.has(snapshot.id)) {
      return;
    }

    fragment.appendChild(renderLiveChromeGroupCard(liveGroup));
  });

  list.innerHTML = "";

  if (!fragment.childNodes.length) {
    list.innerHTML = `
      <div class="saved-sessions-empty protected-groups-empty">
        <strong>${t("protectedGroupsEmptyTitle")}</strong>
        <span>${t("protectedGroupsEmptySubtitle")}</span>
      </div>
    `;
    return;
  }

  list.appendChild(fragment);
}

async function protectChromeGroup(chromeGroupId) {
  const liveGroups = await getCurrentChromeGroups();
  const liveGroup = liveGroups.find(
    (group) => String(group.chromeGroupId) === String(chromeGroupId)
  );

  if (!liveGroup) {
    protectedGroupsToast(t("noActiveChromeGroup"));
    return;
  }

  const protectedGroups = await getProtectedGroups();
  const existingIndex = protectedGroups.findIndex(
    (snapshot) => snapshot.chromeGroupId === liveGroup.chromeGroupId
  );

  const snapshot = createSnapshotFromChromeGroup(liveGroup);

  if (existingIndex >= 0) {
    snapshot.id = protectedGroups[existingIndex].id;
    snapshot.createdAt = protectedGroups[existingIndex].createdAt;
    protectedGroups[existingIndex] = snapshot;
    protectedGroupsToast(t("chromeGroupSnapshotUpdated", { name: liveGroup.title }));
  } else {
    protectedGroups.push(snapshot);
    protectedGroupsToast(t("chromeGroupProtected", { name: liveGroup.title }));
  }

  await saveProtectedGroups(protectedGroups);
  savedSessionsViewMode = "groups";
  await renderSavedSessions();
}

async function focusChromeGroup(chromeGroupId) {
  const liveGroups = await getCurrentChromeGroups();
  const liveGroup = liveGroups.find(
    (group) => String(group.chromeGroupId) === String(chromeGroupId)
  );

  const tab = liveGroup?.tabs?.[0];

  if (!tab?.id) {
    return;
  }

  await chrome.tabs.update(tab.id, { active: true });

  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

async function focusProtectedGroup(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  if (!snapshot) {
    return;
  }

  const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

  if (!liveGroup || !liveGroup.tabs.length) {
    await restoreProtectedGroup(snapshotId, { focusAfterRestore: true, showMessage: false });
    return;
  }

  const tab = liveGroup.tabs[0];

  if (!tab?.id) {
    await restoreProtectedGroup(snapshotId, { focusAfterRestore: true, showMessage: false });
    return;
  }

  await chrome.tabs.update(tab.id, { active: true });

  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

async function shouldConfirmProtectedGroupRestore(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  if (!snapshot) {
    return false;
  }

  const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

  return Boolean(liveGroup?.tabs?.length);
}

async function openProtectedGroupCopy(snapshotId) {
  const protectedGroups = await getProtectedGroups();
  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  await restoreProtectedGroup(snapshotId, {
    focusAfterRestore: true,
    showMessage: false,
    updateSnapshotReference: false
  });

  if (snapshot) {
    protectedGroupsToast(t("chromeGroupCopyOpened", { name: snapshot.title || t("untitledChromeGroup") }));
  }
}

async function restoreProtectedGroup(snapshotId, options = {}) {
  const {
    focusAfterRestore = false,
    showMessage = true,
    updateSnapshotReference = true
  } = options;
  const protectedGroups = await getProtectedGroups();
  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  if (!snapshot) {
    return;
  }

  const result = await createNativeCollectionGroup(snapshot.tabs || [], {
    title: snapshot.title || t("untitledChromeGroup"),
    color: snapshot.color || "grey",
    focusAfterOpen: focusAfterRestore
  });

  if (!Number.isInteger(result.chromeGroupId)) {
    return;
  }

  if (updateSnapshotReference) {
    await updateProtectedGroupReference(snapshotId, result.chromeGroupId);
  }

  await renderSavedSessions();

  if (showMessage) {
    protectedGroupsToast(t("chromeGroupRestored", { name: snapshot.title }));
  }
}

async function updateProtectedSnapshot(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const snapshotIndex = protectedGroups.findIndex((group) => group.id === snapshotId);

  if (snapshotIndex < 0) {
    return;
  }

  const snapshot = protectedGroups[snapshotIndex];
  const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

  if (!liveGroup) {
    return;
  }

  const updatedSnapshot = createSnapshotFromChromeGroup(liveGroup);

  updatedSnapshot.id = snapshot.id;
  updatedSnapshot.createdAt = snapshot.createdAt;

  protectedGroups[snapshotIndex] = updatedSnapshot;

  await saveProtectedGroups(protectedGroups);
  await renderSavedSessions();

  protectedGroupsToast(t("chromeGroupSnapshotUpdated", { name: updatedSnapshot.title }));
}

async function ignoreProtectedGroupChange(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const updatedGroups = protectedGroups.map((snapshot) => {
    if (snapshot.id !== snapshotId) {
      return snapshot;
    }

    const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

    if (!liveGroup) {
      return snapshot;
    }

    return {
      ...snapshot,
      ignoredSignature: getGroupSignature(liveGroup),
      updatedAt: new Date().toISOString()
    };
  });

  await saveProtectedGroups(updatedGroups);
  await renderSavedSessions();

  protectedGroupsToast(t("chromeGroupIgnored"));
}

async function deleteProtectedSnapshot(snapshotId) {
  const protectedGroups = await getProtectedGroups();
  const updatedGroups = protectedGroups.filter((group) => group.id !== snapshotId);

  await saveProtectedGroups(updatedGroups);
  await renderSavedSessions();

  protectedGroupsToast(t("chromeGroupDeleted"));
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".protected-group-menu") &&
      !event.target.closest('[data-action="toggle-protected-group-menu"]')) {
    closeProtectedGroupMenus();
  }
});

let protectedGroupsRefreshTimer = null;

function scheduleProtectedGroupsRefresh() {
  clearTimeout(protectedGroupsRefreshTimer);

  protectedGroupsRefreshTimer = setTimeout(async () => {
    if (
      openTabAssignmentDragState?.dragging ||
      savedSessionTabDragState?.dragging
    ) {
      scheduleProtectedGroupsRefresh();
      return;
    }

    if (collectionDetailState?.kind === "session") {
      await reloadCollectionDetailSource();
      return;
    }

    await renderSavedSessions();
  }, 700);
}

if (chrome?.tabGroups?.onCreated) {
  chrome.tabGroups.onCreated.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabGroups?.onUpdated) {
  chrome.tabGroups.onUpdated.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabGroups?.onRemoved) {
  chrome.tabGroups.onRemoved.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabs?.onCreated) {
  chrome.tabs.onCreated.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete" || changeInfo.url || changeInfo.title) {
      scheduleProtectedGroupsRefresh();
    }
  });
}
