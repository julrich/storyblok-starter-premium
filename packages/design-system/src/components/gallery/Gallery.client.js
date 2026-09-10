import { Component, define } from "@kickstartds/core/lib/component";

export const identifier = "dsa.gallery";

const passiveOpt = { passive: true };

const DRAG_THRESHOLD = 5;

function initDragToScroll(scrollEl) {
  scrollEl.style.cursor = "grab";

  let startScrollLeft = 0;
  let startX = 0;
  let velocity = 0;
  let rafId;
  let dragged = false;

  const cancelMomentum = () => cancelAnimationFrame(rafId);

  const applyMomentum = () => {
    scrollEl.scrollLeft += velocity;
    velocity *= 0.9;
    if (Math.abs(velocity) > 0.5) {
      rafId = requestAnimationFrame(applyMomentum);
    }
  };

  const onMouseMove = (e) => {
    e.preventDefault();
    const delta = e.clientX - startX;
    if (Math.abs(delta) > DRAG_THRESHOLD) dragged = true;
    const prevScroll = scrollEl.scrollLeft;
    scrollEl.scrollLeft = startScrollLeft - delta;
    velocity = scrollEl.scrollLeft - prevScroll;
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mouseleave", onMouseUp);
    scrollEl.style.cursor = "grab";
    scrollEl.style.removeProperty("user-select");
    cancelMomentum();
    rafId = requestAnimationFrame(applyMomentum);
    // Reset dragged flag after the click event has fired
    setTimeout(() => {
      dragged = false;
    }, 0);
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    dragged = false;
    startScrollLeft = scrollEl.scrollLeft;
    startX = e.clientX;
    scrollEl.style.cursor = "grabbing";
    scrollEl.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseUp);
    cancelMomentum();
  };

  const onClickCapture = (e) => {
    if (dragged) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  };

  scrollEl.addEventListener("mousedown", onMouseDown);
  scrollEl.addEventListener("click", onClickCapture, true);
  scrollEl.addEventListener("wheel", cancelMomentum, passiveOpt);

  return () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mouseleave", onMouseUp);
    scrollEl.removeEventListener("mousedown", onMouseDown);
    scrollEl.removeEventListener("click", onClickCapture, true);
    scrollEl.removeEventListener("wheel", cancelMomentum, passiveOpt);
  };
}

function initArrows(scrollEl, backBtn, forwardBtn) {
  const track = scrollEl.querySelector(".dsa-gallery__slider-track");
  const firstItem = track && track.firstElementChild;
  if (!firstItem) return () => {};

  const scrollByItem = (forward) => {
    const gap = Number(
      getComputedStyle(track).getPropertyValue("gap").split("px")[0],
    );
    const itemWidth = Math.ceil(firstItem.offsetWidth + gap);
    const pos = scrollEl.scrollLeft / itemWidth;
    const target = forward ? Math.floor(pos) + 1 : Math.ceil(pos) - 1;
    scrollEl.scrollTo({ left: target * itemWidth, behavior: "smooth" });
  };

  const onBack = () => scrollByItem(false);
  const onForward = () => scrollByItem(true);

  const updateDisabled = () => {
    backBtn.disabled = scrollEl.scrollLeft < 1;
    forwardBtn.disabled =
      scrollEl.scrollLeft + scrollEl.offsetWidth >= scrollEl.scrollWidth;
  };

  backBtn.addEventListener("click", onBack);
  forwardBtn.addEventListener("click", onForward);
  scrollEl.addEventListener("scroll", updateDisabled, passiveOpt);
  updateDisabled();

  return () => {
    backBtn.removeEventListener("click", onBack);
    forwardBtn.removeEventListener("click", onForward);
    scrollEl.removeEventListener("scroll", updateDisabled, passiveOpt);
  };
}

function initProgressBar(scrollEl, progressBar) {
  const updateProgress = () => {
    const maxScroll = scrollEl.scrollWidth - scrollEl.offsetWidth;
    const ratio = maxScroll > 0 ? scrollEl.scrollLeft / maxScroll : 0;
    progressBar.style.transform = `scaleX(${ratio})`;
  };

  scrollEl.addEventListener("scroll", updateProgress, passiveOpt);
  updateProgress();

  return () => {
    scrollEl.removeEventListener("scroll", updateProgress, passiveOpt);
  };
}

function unveilLazyImages(scrollEl) {
  const imgs = scrollEl.querySelectorAll("img.lazyload[data-src]");
  for (const img of imgs) {
    img.src = img.dataset.src;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.classList.remove("lazyload");
    img.classList.add("lazyloaded");
  }
}

function populateLightboxDimensions(galleryEl) {
  const links = galleryEl.querySelectorAll(
    ".lightbox-image__link[data-gallery]",
  );
  for (const link of links) {
    if (link.dataset.sizeW && link.dataset.sizeH) continue;

    const img = link.querySelector("img");
    if (!img) continue;

    const setDimensions = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        link.dataset.sizeW = String(img.naturalWidth);
        link.dataset.sizeH = String(img.naturalHeight);
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      setDimensions();
    } else {
      img.addEventListener("load", setDimensions, { once: true });
    }
  }
}

class Gallery extends Component {
  constructor(element) {
    super(element);

    populateLightboxDimensions(element);

    const scrollEl = element.querySelector(".dsa-gallery__slider");
    if (!scrollEl) return;

    unveilLazyImages(scrollEl);

    const cleanups = [];

    cleanups.push(initDragToScroll(scrollEl));

    const arrows = element.querySelectorAll(".dsa-gallery__slider-arrow");
    if (arrows.length === 2) {
      cleanups.push(initArrows(scrollEl, arrows[0], arrows[1]));
    }

    const progressBar = element.querySelector(
      ".dsa-gallery__slider-progress-bar",
    );
    if (progressBar) {
      cleanups.push(initProgressBar(scrollEl, progressBar));
    }

    this.onDisconnect(() => {
      for (const cleanup of cleanups) cleanup();
    });
  }
}

define(identifier, Gallery);
