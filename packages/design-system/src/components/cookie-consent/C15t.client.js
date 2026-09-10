import { define } from "@kickstartds/core/lib/component";
import CookieConsent from "./CookieConsent.client.js";

const customTranslations = {
  de: {
    accept: "Akzeptieren",
    reject: "Ablehnen",
    required: "Immer aktiv",
    settings: "Cookies verwalten",
  },
  en: {
    accept: "Accept",
    reject: "Reject",
    required: "Always Active",
    settings: "Cookie Preferences",
  },
};

const translate = (elements, translationConfig) => {
  const defaultLanguage = translationConfig.defaultLanguage;
  const translations = translationConfig.translations[defaultLanguage];
  const customTranslation =
    customTranslations[defaultLanguage] || customTranslations.en;

  // Notice
  elements.notice.title.textContent = translations.cookieBanner.title;
  elements.notice.description.textContent =
    translations.cookieBanner.description;
  elements.notice.customizeBtn.textContent = translations.common.customize;
  elements.notice.rejectAllBtn.textContent = translations.common.rejectAll;
  elements.notice.acceptAllBtn.textContent = translations.common.acceptAll;

  // Dialog
  elements.dialog.title.textContent = translations.consentManagerDialog.title;
  elements.dialog.description.textContent =
    translations.consentManagerDialog.description;

  elements.dialog.activateAllBtn.textContent = translations.common.acceptAll;
  elements.dialog.deactivateAllBtn.textContent = translations.common.rejectAll;
  elements.dialog.saveBtn.textContent = translations.common.save;

  for (const option of elements.dialog.form.querySelectorAll(
    ".dsa-cookie-consent-dialog__option"
  )) {
    const type = option.dataset.consentType;
    const translation = translations.consentTypes[type];
    if (translation) {
      option.querySelector(".dsa-headline__inner").textContent =
        translation.title;
      option.querySelector(
        ".dsa-cookie-consent-dialog__option-description"
      ).textContent = translation.description;
    }

    const requiredLabel = option.querySelector(
      ".dsa-cookie-consent-dialog__label"
    );
    if (requiredLabel) requiredLabel.textContent = customTranslation.required;
  }

  for (const element of elements.dialog.form.elements) {
    if (element.type === "radio") {
      element.nextElementSibling.nextElementSibling.textContent =
        customTranslation[element.value];
    }
  }

  // settings
  elements.settings.button.firstElementChild.textContent =
    customTranslation.settings;
};

export default class CookieConsentC15t extends CookieConsent {
  static identifier = "dsa.cookie-consent.c15t";
  static store;

  constructor(element) {
    super(element);

    const store = this.constructor.store;
    const elements = this.elements;

    // get gdprTypes from radio buttons
    const initialState = store.getState();
    const gdprTypes = [];
    for (const element of elements.dialog.form.elements) {
      if (element.type === "radio" && element.value === "accept") {
        gdprTypes.push(element.name);
      }
    }
    initialState.setGdprTypes(gdprTypes);

    const update = (state) => {
      // show/hide cookie banner or settings button
      this.showNotice = state.showPopup;

      // update dialog form
      for (const type in state.consents) {
        const radios = elements.dialog.form.elements[type];
        const accepted = state.consents[type];
        if (radios) {
          for (const radio of radios) {
            radio.defaultChecked =
              radio.value === "accept" ? accepted : !accepted;
          }
        }
      }
    };
    const unsub = store.subscribe(update);
    translate(this.elements, initialState.translationConfig);
    update(initialState);

    const acceptCustom = () => {
      const state = store.getState();
      const consentTypes = state.getDisplayedConsents();

      for (const type of consentTypes) {
        if (!type.disabled) {
          state.setConsent(
            type.name,
            elements.dialog.form.elements[type.name].value === "accept"
          );
        }
      }
      state.saveConsents("custom");
    };
    const acceptAll = () => {
      const state = store.getState();
      state.saveConsents("all");
    };
    const rejectAll = () => {
      const state = store.getState();
      state.saveConsents("necessary");
    };

    elements.dialog.form.addEventListener("submit", acceptCustom);
    elements.notice.acceptAllBtn.addEventListener("click", acceptAll);
    elements.notice.rejectAllBtn.addEventListener("click", rejectAll);

    this.onDisconnect(() => {
      unsub();
      elements.dialog.form.removeEventListener("submit", acceptCustom);
      elements.notice.acceptAllBtn.removeEventListener("click", acceptAll);
      elements.notice.rejectAllBtn.removeEventListener("click", rejectAll);
    });
  }
}

define(CookieConsentC15t.identifier, CookieConsentC15t);
