import { Component, define } from "@kickstartds/core/lib/component";

export default class SearchModal extends Component {
  static identifier = "dsa.search-modal";

  constructor(element) {
    super(element);

    const form = element.querySelector(".dsa-search-form");
    const searchInput = element.querySelector(".dsa-search-bar__input");

    const onBackdropClick = (event) => {
      if (event.target === element)
        window._ks.radio.emit("dsa.search-modal.close");
    };

    const openToken = window._ks.radio.on("dsa.search-modal.open", () => {
      element.showModal();
      searchInput.focus();
    });
    const closeToken = window._ks.radio.on("dsa.search-modal.close", () => {
      form.reset();
      element.close();
    });

    element.addEventListener("click", onBackdropClick);

    this.onDisconnect(() => {
      window._ks.radio.off(openToken);
      window._ks.radio.off(closeToken);
      element.removeEventListener("click", onBackdropClick);
    });
  }
}

define(SearchModal.identifier, SearchModal);
