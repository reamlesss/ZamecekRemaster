const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");

function setMenuOpen(open) {
  if (!menuToggle || !primaryNav) return;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.querySelector(".sr-only").textContent = open
    ? "Zavřít navigaci"
    : "Otevřít navigaci";
  primaryNav.classList.toggle("is-open", open);
}

menuToggle?.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

primaryNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = String(new Date().getFullYear());

const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
const themeColor = document.querySelector('meta[name="theme-color"]');

function updateThemeColor(event) {
  if (themeColor) themeColor.content = event.matches ? "#211813" : "#f7f0e6";
    // themeColor.content = '#211813'

}

updateThemeColor(colorScheme);
colorScheme.addEventListener("change", updateThemeColor);

const restaurantMenuContainer = document.querySelector("[data-restaurant-menu]");

if (restaurantMenuContainer) {
  const notice = document.querySelector("[data-menu-notice]");
  const liveMenuStatus = document.querySelector("[data-live-menu-status]");

  function renderRestaurantMenu(menu) {
    if (!menu || !Array.isArray(menu.sections)) {
      restaurantMenuContainer.textContent = "Jídelní lístek momentálně není k dispozici.";
      return false;
    }

    restaurantMenuContainer.innerHTML = menu.sections.map((section) => `
      <section class="menu-category">
        <div class="menu-category-heading">
          <h3>${escapeHtml(section.title)}</h3>
          ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
        </div>
        ${(section.items || []).map((item) => `
          <article class="menu-item">
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
            </div>
            ${item.price ? `<span class="menu-item-price">${escapeHtml(item.price)}</span>` : ""}
          </article>
        `).join("")}
      </section>
    `).join("");
    if (notice) notice.textContent = menu.notice || "";
    return true;
  }

  const siteMenuClient = window.createSiteSupabaseClient?.();
  if (!siteMenuClient) {
    const config = window.supabaseSiteConfig;
    if (config?.url && config?.anonKey) {
      restaurantMenuContainer.textContent = "Aktuální nabídku se nepodařilo načíst. Zkuste to prosím znovu později.";
      if (liveMenuStatus) liveMenuStatus.textContent = "Online jídelní lístek není dostupný; ověřte připojení k Supabase.";
    } else {
      renderRestaurantMenu(window.restaurantMenu);
      if (liveMenuStatus) {
        liveMenuStatus.textContent = "Zobrazuje se uložená místní nabídka; online aktualizace ještě nejsou nakonfigurovány.";
      }
    }
  } else {
    restaurantMenuContainer.textContent = "Načítáme aktuální nabídku…";
    siteMenuClient
      .from("site_content")
      .select("content")
      .eq("id", "restaurant-menu")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load the live restaurant menu.", error);
          restaurantMenuContainer.textContent = "Aktuální nabídku se nepodařilo načíst. Zkuste to prosím znovu později.";
          if (liveMenuStatus) liveMenuStatus.textContent = "Online jídelní lístek je dočasně nedostupný.";
          return;
        }

        renderRestaurantMenu(data?.content);
      })
      .catch((error) => {
        console.error("Could not load the live restaurant menu.", error);
        restaurantMenuContainer.textContent = "Aktuální nabídku se nepodařilo načíst. Zkuste to prosím znovu později.";
        if (liveMenuStatus) liveMenuStatus.textContent = "Online jídelní lístek je dočasně nedostupný.";
      });
  }
}

const accommodationData = window.accommodationData || [];
const accommodationDirectory = document.querySelector("[data-accommodation-groups]");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function accommodationUrl(accommodation) {
  return `apartments.html?unit=${encodeURIComponent(accommodation.id)}`;
}

if (accommodationDirectory) {
  const groups = [...new Set(accommodationData.map((accommodation) => accommodation.group))];
  accommodationDirectory.innerHTML = groups.map((group) => {
    const cards = accommodationData
      .filter((accommodation) => accommodation.group === group)
      .map((accommodation) => `
        <a class="accommodation-card" href="${accommodationUrl(accommodation)}">
          <div class="accommodation-card-image">
            <img src="${escapeHtml(accommodation.photos[0][0])}" alt="${escapeHtml(accommodation.photos[0][1])}" loading="lazy" />
            <span aria-hidden="true">↗</span>
          </div>
          <div class="accommodation-card-copy">
            <p class="eyebrow"><span></span> ${escapeHtml(accommodation.type)}</p>
            <h3>${escapeHtml(accommodation.cardTitle)}</h3>
            <p>${escapeHtml(accommodation.cardDescription)}</p>
            <div class="accommodation-card-meta"><span>${escapeHtml(accommodation.capacity)}</span><strong>${escapeHtml(accommodation.price)}</strong></div>
          </div>
        </a>
      `).join("");
    return `<section class="accommodation-group" aria-labelledby="group-${groups.indexOf(group)}"><h3 id="group-${groups.indexOf(group)}">${escapeHtml(group)}</h3><div class="accommodation-grid">${cards}</div></section>`;
  }).join("");
}

const photoGallery = document.querySelector("[data-photo-gallery]");
const photoCategoryNav = document.querySelector("[data-photo-category-nav]");
const lightbox = document.querySelector("[data-photo-lightbox]");

if (photoGallery && photoCategoryNav && lightbox) {
  const photoGroups = [
    ...(window.sitePhotoGroups || []),
    ...[...new Set(accommodationData.map((item) => item.group))].map((group) => ({
      title: `Ubytování · ${group.toLowerCase()}`,
      description: `Fotografie pokojů a ubytování: ${group.toLowerCase()}.`,
      photos: accommodationData
        .filter((item) => item.group === group)
        .flatMap((item) => item.photos),
    })),
  ];
  const photos = [];

  photoGallery.innerHTML = photoGroups.map((group, groupIndex) => {
    const groupId = `photo-group-${groupIndex}`;
    const cards = group.photos.map(([src, alt]) => {
      const photoIndex = photos.push({ src, alt }) - 1;
      return `
        <button class="photo-card" type="button" data-photo-index="${photoIndex}" aria-label="Zvětšit fotografii: ${escapeHtml(alt)}">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
          <span class="photo-card-caption">${escapeHtml(alt)}</span>
          <span class="photo-card-zoom" aria-hidden="true">↗</span>
        </button>
      `;
    }).join("");
    return `
      <section class="photo-group" id="${groupId}" aria-labelledby="${groupId}-title">
        <div class="photo-group-heading">
          <div><span class="photo-group-number">${String(groupIndex + 1).padStart(2, "0")}</span><h2 id="${groupId}-title">${escapeHtml(group.title)}</h2></div>
          <p>${escapeHtml(group.description)}</p>
        </div>
        <div class="photo-grid">${cards}</div>
      </section>
    `;
  }).join("");

  photoCategoryNav.innerHTML = photoGroups.map((group, index) =>
    `<a href="#photo-group-${index}">${escapeHtml(group.title)}</a>`,
  ).join("");

  const lightboxImage = lightbox.querySelector("[data-lightbox-image]");
  const lightboxCaption = lightbox.querySelector("[data-lightbox-caption]");
  const lightboxCount = lightbox.querySelector("[data-lightbox-count]");
  const closeButton = lightbox.querySelector("[data-photo-close]");
  let activePhotoIndex = 0;

  function showPhoto(index) {
    activePhotoIndex = (index + photos.length) % photos.length;
    const photo = photos[activePhotoIndex];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt;
    lightboxCaption.textContent = photo.alt;
    lightboxCount.textContent = `${String(activePhotoIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
  }

  photoGallery.addEventListener("click", (event) => {
    const button = event.target.closest("[data-photo-index]");
    if (!button) return;
    showPhoto(Number(button.dataset.photoIndex));
    lightbox.showModal();
    closeButton.focus();
  });

  lightbox.querySelector("[data-photo-prev]").addEventListener("click", () => showPhoto(activePhotoIndex - 1));
  lightbox.querySelector("[data-photo-next]").addEventListener("click", () => showPhoto(activePhotoIndex + 1));
  closeButton.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.open) return;
    if (event.key === "Escape") lightbox.close();
    if (event.key === "ArrowLeft") showPhoto(activePhotoIndex - 1);
    if (event.key === "ArrowRight") showPhoto(activePhotoIndex + 1);
  });
}

const apartmentPage = document.querySelector("[data-apartment-page]");

if (apartmentPage) {
  const requestedUnit = new URLSearchParams(window.location.search).get("unit");
  const accommodation = accommodationData.find((item) => item.id === (requestedUnit || "kamenny-apartman-u-rytire"));

  if (accommodation) {
    const title = escapeHtml(accommodation.title);
    const emphasis = escapeHtml(accommodation.titleEmphasis);
    const highlightedTitle = title.replace(emphasis, `<em>${emphasis}</em>`);
    const subject = encodeURIComponent(`Rezervace: ${accommodation.title}`);
    const emailLink = `mailto:nazamecku.provoz@seznam.cz?subject=${subject}`;
    const firstPhoto = accommodation.photos[0];
    const thumbnails = accommodation.photos.map(([src, alt], index) => `
      <button
        class="apartment-thumbnail${index === 0 ? " is-active" : ""}"
        type="button"
        data-apartment-image="${escapeHtml(src)}"
        data-apartment-alt="${escapeHtml(alt)}"
        data-apartment-caption="${escapeHtml(alt)}"
        aria-label="Fotografie ${index + 1}: ${escapeHtml(alt)}"
        ${index === 0 ? 'aria-current="true"' : ""}
      ><img src="${escapeHtml(src)}" alt="" loading="lazy" /></button>
    `).join("");
    const deposit = accommodation.deposit
      ? `<span class="deposit-note">${escapeHtml(accommodation.deposit)}</span>`
      : "";
    const capacityNote = accommodation.capacityNote
      ? `<p class="capacity-note">${escapeHtml(accommodation.capacityNote)}</p>`
      : "";
    const amenities = accommodation.amenities?.length
      ? `<section class="apartment-amenities section-pad">
          <div class="page-width">
            <div class="center-heading">
              <p class="eyebrow"><span></span> Zábava i odpočinek nablízku <span></span></p>
              <h2 class="section-title">Užijte si areál <em>po svém.</em></h2>
            </div>
            <div class="amenity-grid">${accommodation.amenities.map(([icon, name, text], index) => `
              <article class="amenity-card">
                <span class="amenity-number">${String(index + 1).padStart(2, "0")}</span>
                <span class="amenity-symbol" aria-hidden="true">${escapeHtml(icon)}</span>
                <h3>${escapeHtml(name)}</h3><p>${escapeHtml(text)}</p>
              </article>
            `).join("")}</div>
          </div>
        </section>`
      : "";

    document.title = `${accommodation.title} — Zámeček Kaliště`;
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      `${accommodation.title} na Zámečku Kaliště v Posázaví. ${accommodation.cardDescription} Cena uvedená na původním webu: ${accommodation.price}.`,
    );
    apartmentPage.innerHTML = `
      <section class="apartment-hero" aria-labelledby="apartment-title">
        <img class="apartment-hero-image" src="${escapeHtml(firstPhoto[0])}" alt="${escapeHtml(firstPhoto[1])}" fetchpriority="high" />
        <div class="apartment-hero-shade"></div>
        <div class="apartment-hero-content page-width">
          <nav class="breadcrumb breadcrumb-light" aria-label="Drobečková navigace">
            <a href="index.html">Úvod</a><span aria-hidden="true">/</span><a href="accommodations.html">Ubytování</a><span aria-hidden="true">/</span><span aria-current="page">${title}</span>
          </nav>
          <p class="eyebrow eyebrow-light"><span></span> ${escapeHtml(accommodation.type)}</p>
          <h1 id="apartment-title">${highlightedTitle}</h1>
          <p class="apartment-hero-intro">${escapeHtml(accommodation.lead)}</p>
          <a class="button button-light" href="#apartman">Prohlédnout ubytování <span aria-hidden="true">↓</span></a>
        </div>
        <div class="apartment-hero-label"><span></span> Kaliště · Posázaví</div>
      </section>
      <section class="apartment-intro section-pad" id="apartman">
        <div class="apartment-intro-grid page-width">
          <div class="apartment-intro-copy">
            <p class="eyebrow"><span></span> ${escapeHtml(accommodation.type)}</p>
            <h2 class="section-title">Pohodlí, které<br /><em>má svůj příběh.</em></h2>
            <p class="lead">${escapeHtml(accommodation.lead)}</p>
            <p>${escapeHtml(accommodation.description)}</p>
            ${capacityNote}
            <a class="text-link" href="${emailLink}">Zeptat se na pobyt <span aria-hidden="true">↗</span></a>
          </div>
          <aside class="apartment-facts" aria-label="Informace o ubytování">
            <span class="facts-kicker">Na první pohled</span>
            <div class="fact-row"><span class="fact-icon" aria-hidden="true">♙</span><span><strong>${escapeHtml(accommodation.capacity)}</strong><small>Kapacita podle původního webu</small></span></div>
            <div class="fact-row"><span class="fact-icon" aria-hidden="true">⌂</span><span><strong>${escapeHtml(accommodation.beds)}</strong><small>${escapeHtml(accommodation.location)}</small></span></div>
            <div class="fact-row"><span class="fact-icon" aria-hidden="true"><img src="location-pin.svg" alt="" /></span><span><strong>Poddubí 55</strong><small>251 65 Kaliště · Posázaví</small></span></div>
            <span class="facts-divider"></span>
            <span class="facts-kicker">Cena uvedená na webu</span>
            <strong class="apartment-price">${escapeHtml(accommodation.price)}</strong>
            ${deposit}
            <a class="button apartment-booking" href="reservations.html">Rezervovat online <span aria-hidden="true">↗</span></a>
            <a class="text-link apartment-email-booking" href="${emailLink}">Nebo poptat termín e-mailem <span aria-hidden="true">↗</span></a>
            <p class="price-note">Cenu, dostupnost i podmínky pobytu si prosím potvrďte při poptávce.</p>
          </aside>
        </div>
      </section>
      <section class="apartment-gallery-section section-pad">
        <div class="page-width">
          <div class="section-heading apartment-gallery-heading">
            <div><p class="eyebrow"><span></span> Prohlédněte si</p><h2 class="section-title">Ubytování <em>zblízka.</em></h2></div>
            <p class="section-aside">${escapeHtml(accommodation.cardDescription)}</p>
          </div>
          <div class="apartment-gallery" role="region" aria-roledescription="carousel" aria-label="Fotografie: ${title}">
            <div class="apartment-gallery-main">
              <img class="apartment-gallery-image" src="${escapeHtml(firstPhoto[0])}" alt="${escapeHtml(firstPhoto[1])}" loading="lazy" />
              <div class="apartment-gallery-caption" aria-live="polite"><span data-apartment-count>01 / ${String(accommodation.photos.length).padStart(2, "0")}</span><span data-apartment-caption>${escapeHtml(firstPhoto[1])}</span></div>
              <div class="apartment-gallery-arrows">
                <button class="carousel-arrow" type="button" data-apartment-direction="-1" aria-label="Předchozí fotografie"><span aria-hidden="true">←</span></button>
                <button class="carousel-arrow" type="button" data-apartment-direction="1" aria-label="Další fotografie"><span aria-hidden="true">→</span></button>
              </div>
            </div>
            <div class="apartment-thumbnails" role="group" aria-label="Vybrat fotografii">${thumbnails}</div>
          </div>
        </div>
      </section>
      ${amenities}
      <section class="apartment-cta">
        <div class="apartment-cta-inner page-width">
          <div>
            <p class="eyebrow eyebrow-light"><span></span> Čeká na vás Posázaví</p>
            <h2 class="section-title">Naplánujte si<br /><em>pobyt na Zámečku.</em></h2>
            <p>Napište nebo zavolejte. Rádi ověříme dostupnost a domluvíme s vámi podrobnosti.</p>
          </div>
          <div class="apartment-cta-actions">
            <a class="button button-light" href="reservations.html">Rezervovat online <span aria-hidden="true">↗</span></a>
            <a class="cta-email" href="${emailLink}">Nebo nám napište e-mail</a>
            <a class="cta-phone" href="tel:+420603543629">+420 603 543 629</a>
          </div>
        </div>
      </section>
    `;
  } else {
    document.title = "Ubytování nenalezeno — Zámeček Kaliště";
    apartmentPage.innerHTML = `<section class="directory-list section-pad"><div class="page-width"><h1 class="section-title">Toto ubytování <em>nenajdeme.</em></h1><p>Vyberte si prosím z aktuální nabídky.</p><a class="button" href="accommodations.html">Zobrazit ubytování <span aria-hidden="true">↗</span></a></div></section>`;
  }
}

const welcomeCarousel = document.querySelector(".welcome-carousel");

if (welcomeCarousel) {
  const slides = [
    {
      src: "https://061a38cc1e.clvaw-cdnwnd.com/6bcaeae67997544c7cf5f5587b1cbe32/200000080-6a6cd6b686/Zámeček%20Kaliště11.jpg",
      alt: "Zámeček Kaliště a jeho okolí",
      caption: "Klidné útočiště v Posázaví",
    },
    {
      src: "https://061a38cc1e.clvaw-cdnwnd.com/6bcaeae67997544c7cf5f5587b1cbe32/200012469-0115201154/IMG_1896.jpg",
      alt: "Zámeček Kaliště zasazený do okolní krajiny",
      caption: "Historický Zámeček v srdci Posázaví",
    },
    {
      src: "https://061a38cc1e.clvaw-cdnwnd.com/6bcaeae67997544c7cf5f5587b1cbe32/200000000-4188a42862/exter_3.jpg",
      alt: "Venkovní posezení v areálu Zámečku",
      caption: "Čas zpomalit a být spolu",
    },
    {
      src: "https://061a38cc1e.clvaw-cdnwnd.com/6bcaeae67997544c7cf5f5587b1cbe32/200000357-bd7fbbe7a0/vinarna_4.jpg",
      alt: "Útulné posezení v zámecké vinárně",
      caption: "Pohostinnost s příběhem",
    },
  ];
  const image = welcomeCarousel.querySelector(".welcome-image");
  const count = welcomeCarousel.querySelector(".slide-count");
  const caption = welcomeCarousel.querySelector(".slide-caption");
  const dots = [...welcomeCarousel.querySelectorAll(".carousel-dot")];
  let currentSlide = 0;

  function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
    const slide = slides[currentSlide];
    image.src = slide.src;
    image.alt = slide.alt;
    count.setAttribute("aria-label", `Snímek ${currentSlide + 1} ze ${slides.length}`);
    count.firstChild.textContent = String(currentSlide + 1).padStart(2, "0") + " ";
    caption.textContent = slide.caption;

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === currentSlide;
      dot.classList.toggle("is-active", isActive);
      if (isActive) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  }

  welcomeCarousel.querySelectorAll("[data-carousel-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      showSlide(currentSlide + Number(button.dataset.carouselDirection));
    });
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => showSlide(index));
  });
}

const apartmentGallery = document.querySelector(".apartment-gallery");

if (apartmentGallery) {
  const thumbnails = [...apartmentGallery.querySelectorAll(".apartment-thumbnail")];
  const image = apartmentGallery.querySelector(".apartment-gallery-image");
  const count = apartmentGallery.querySelector("[data-apartment-count]");
  const caption = apartmentGallery.querySelector("[data-apartment-caption]");
  let currentImage = 0;

  function showApartmentImage(index) {
    currentImage = (index + thumbnails.length) % thumbnails.length;
    const thumbnail = thumbnails[currentImage];
    image.src = thumbnail.dataset.apartmentImage;
    image.alt = thumbnail.dataset.apartmentAlt;
    count.textContent = `${String(currentImage + 1).padStart(2, "0")} / ${String(thumbnails.length).padStart(2, "0")}`;
    caption.textContent = thumbnail.dataset.apartmentCaption;

    thumbnails.forEach((item, itemIndex) => {
      const isActive = itemIndex === currentImage;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "true");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener("click", () => showApartmentImage(index));
  });

  apartmentGallery.querySelectorAll("[data-apartment-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      showApartmentImage(currentImage + Number(button.dataset.apartmentDirection));
    });
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealGroups = [
  ".welcome-image-wrap, .welcome-copy",
  ".stay-card",
  ".accommodation-card, .accommodation-group > h3",
  ".experience-card",
  ".wedding-image, .wedding-copy",
  ".dining-copy, .dining-photos",
  ".gallery-grid img",
  ".contact-copy, .contact-card",
  ".apartment-intro-copy, .apartment-facts",
  ".amenity-card",
  ".apartment-cta-inner",
  ".photo-group",
];

if (!prefersReducedMotion.matches && "IntersectionObserver" in window) {
  revealGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.classList.add("reveal");
      if (index > 0) element.style.setProperty("--reveal-delay", `${Math.min(index * 90, 270)}ms`);
    });
  });

  document.documentElement.classList.add("motion-ready");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
  );

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
}