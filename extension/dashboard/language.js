'use strict';

/* ----------------------------------------------------------------
   LANGUAGE SWITCHER
   ---------------------------------------------------------------- */

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
