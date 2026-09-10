import { Component, define } from "@kickstartds/core/lib/component";

export default class CookieConsent extends Component {
  static identifier = "dsa.cookie-consent";

  constructor(element) {
    super(element);
    const $ = element.querySelector.bind(element);
    const elements = (this.elements = {
      notice: {
        wrapper: $(".dsa-cookie-consent-notice"),
        title: $(".dsa-cookie-consent-notice__title .dsa-headline__inner"),
        description: $(".dsa-cookie-consent-notice__description"),
        customizeBtn: $(".dsa-cookie-consent-notice__button--customize"),
        rejectAllBtn: $(".dsa-cookie-consent-notice__button--reject"),
        acceptAllBtn: $(".dsa-cookie-consent-notice__button--accept"),
      },
      dialog: {
        wrapper: $(".dsa-cookie-consent-dialog"),
        title: $(".dsa-cookie-consent-dialog__title .dsa-headline__inner"),
        description: $(".dsa-cookie-consent-dialog__description"),
        closeBtn: $(".dsa-cookie-consent-dialog__close"),
        form: $(".dsa-cookie-consent-dialog__form"),
        activateAllBtn: $(".dsa-cookie-consent-dialog__button--activate-all"),
        deactivateAllBtn: $(
          ".dsa-cookie-consent-dialog__button--deactivate-all"
        ),
        saveBtn: $(".dsa-cookie-consent-dialog__button--save"),
      },
      settings: {
        button: $(".dsa-cookie-consent-revisit"),
      },
    });

    const showDialog = () => {
      elements.dialog.wrapper.showModal();
    };
    const closeDialog = () => {
      elements.dialog.wrapper.close();
    };
    const closeDialogAndReset = () => {
      closeDialog();
      elements.dialog.form.reset();
    };
    const onBackdropClick = (event) => {
      if (event.target === elements.dialog.wrapper) closeDialogAndReset();
    };

    const activateAll = () => {
      for (const element of elements.dialog.form.elements) {
        if (element.value === "accept") {
          element.checked = true;
        }
      }
    };
    const deactivateAll = () => {
      for (const element of elements.dialog.form.elements) {
        if (element.value === "reject") {
          element.checked = true;
        }
      }
    };

    elements.notice.customizeBtn.addEventListener("click", showDialog);
    elements.settings.button.addEventListener("click", showDialog);

    elements.dialog.closeBtn.addEventListener("click", closeDialogAndReset);

    elements.dialog.activateAllBtn.addEventListener("click", activateAll);
    elements.dialog.deactivateAllBtn.addEventListener("click", deactivateAll);
    elements.dialog.wrapper.addEventListener("click", onBackdropClick);

    window._ks.radio.on(
      CookieConsent.identifier + ".showNotice",
      (_, value) => {
        this.showNotice = value;
      }
    );

    this.onDisconnect(() => {
      elements.notice.customizeBtn.removeEventListener("click", showDialog);
      elements.settings.button.removeEventListener("click", showDialog);

      elements.dialog.closeBtn.removeEventListener(
        "click",
        closeDialogAndReset
      );

      elements.dialog.activateAllBtn.removeEventListener("click", activateAll);
      elements.dialog.deactivateAllBtn.removeEventListener(
        "click",
        deactivateAll
      );
      elements.dialog.wrapper.removeEventListener("click", onBackdropClick);
    });
  }

  set showNotice(value) {
    this.elements.notice.wrapper.hidden = !value;
    this.elements.settings.button.hidden = value;
  }
}

define(CookieConsent.identifier, CookieConsent);
