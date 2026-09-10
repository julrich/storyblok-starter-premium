import { events as lazyEvents } from "@kickstartds/core/lib/core";

if (window.location.hash === "#disable-umami")
  localStorage.setItem("umami.disabled", 1);

document.querySelectorAll("a:not([data-gallery^=gallery-])").forEach((a) => {
  if (!a.dataset.umamiEvent && !a.dataset.gallery) {
    a.dataset.umamiEvent =
      a.host !== window.location.host
        ? "click.link.outbound"
        : "click.link.internal";
    a.dataset.umamiEventUrl = a.href;
    a.dataset.umamiEventLabel = a.innerText;
  }
});

document
  .querySelectorAll("main section.l-section")
  .forEach((section, index) => {
    section.classList.add("lazyload");
    section.dataset.expand = "-1";
    section.dataset.title =
      section.querySelector("h1, h2, h3, h4, h5, h6")?.innerText || "No title";
    section.dataset.index = index;
  });

window._ks.radio.on(lazyEvents.beforeunveil, (_, el) => {
  if (el.tagName === "SECTION") {
    if (window.umami)
      window.umami.track("view.section.reached", {
        title: el.dataset.title,
        index: parseInt(el.dataset.index, 10) + 1,
      });
  }
});
