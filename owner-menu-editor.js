const menuForm = document.querySelector("[data-owner-menu-form]");
const sectionList = document.querySelector("[data-owner-sections]");
const statusMessage = document.querySelector("[data-owner-status]");
const menuNotice = document.querySelector('[name="notice"]');
const setupWarning = document.querySelector("[data-owner-setup]");
const setupSteps = document.querySelector("[data-owner-setup-steps]");
const saveButton = document.querySelector("[data-save-menu]");
const siteMenuClient = window.createSiteSupabaseClient?.();

if (!menuForm || !sectionList || !statusMessage || !menuNotice) {
  console.error("The owner menu editor could not initialize because required page elements are missing.");
} else if (!siteMenuClient) {
  setupWarning.hidden = false;
  setupSteps.hidden = false;
} else {
  setupWarning.hidden = true;
  setupSteps.hidden = true;
  let menu = null;
  let dirty = false;

  function markDirty() {
    dirty = true;
    statusMessage.textContent = "Nevyřízené změny. Uložte je, aby se zveřejnily.";
  }

  function makeField(labelText, value, options = {}) {
    const label = document.createElement("label");
    label.className = "owner-field";
    const labelTextElement = document.createElement("span");
    labelTextElement.textContent = labelText;
    const field = options.multiline
      ? document.createElement("textarea")
      : document.createElement("input");
    field.value = value || "";
    if (!options.multiline) field.type = "text";
    if (options.placeholder) field.placeholder = options.placeholder;
    if (options.rows) field.rows = options.rows;
    field.addEventListener("input", markDirty);
    label.append(labelTextElement, field);
    return { label, field };
  }

  function makeButton(text, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderEditor() {
    sectionList.replaceChildren();

    menu.sections.forEach((section, sectionIndex) => {
      const sectionCard = document.createElement("section");
      sectionCard.className = "owner-section-card";
      const heading = document.createElement("div");
      heading.className = "owner-card-heading";
      const headingCopy = document.createElement("div");
      const step = document.createElement("span");
      step.className = "owner-step";
      step.textContent = `Kategorie ${String(sectionIndex + 1).padStart(2, "0")}`;
      const sectionHeading = document.createElement("h2");
      sectionHeading.textContent = section.title || "Nová kategorie";
      headingCopy.append(step, sectionHeading);
      heading.append(headingCopy);
      heading.append(makeButton("Odebrat kategorii", "owner-delete-button", () => {
        menu.sections.splice(sectionIndex, 1);
        markDirty();
        renderEditor();
      }));
      sectionCard.append(heading);

      const sectionTitle = makeField("Název kategorie", section.title);
      sectionTitle.field.addEventListener("input", () => {
        section.title = sectionTitle.field.value;
        sectionHeading.textContent = section.title || "Nová kategorie";
      });
      const sectionDescription = makeField("Popis kategorie", section.description, {
        multiline: true,
        rows: 2,
      });
      sectionDescription.field.addEventListener("input", () => {
        section.description = sectionDescription.field.value;
      });
      sectionCard.append(sectionTitle.label, sectionDescription.label);

      const itemsHeading = document.createElement("h3");
      itemsHeading.className = "owner-items-heading";
      itemsHeading.textContent = "Položky";
      sectionCard.append(itemsHeading);

      section.items ||= [];
      section.items.forEach((item, itemIndex) => {
        const itemCard = document.createElement("div");
        itemCard.className = "owner-item-card";
        const itemHeading = document.createElement("div");
        itemHeading.className = "owner-item-heading";
        const itemLabel = document.createElement("strong");
        itemLabel.textContent = `Položka ${itemIndex + 1}`;
        itemHeading.append(itemLabel, makeButton("Odebrat", "owner-delete-button owner-delete-item", () => {
          section.items.splice(itemIndex, 1);
          markDirty();
          renderEditor();
        }));
        itemCard.append(itemHeading);

        const itemName = makeField("Název jídla nebo nápoje", item.name);
        itemName.field.addEventListener("input", () => {
          item.name = itemName.field.value;
        });
        const itemDescription = makeField("Popis (nepovinný)", item.description, {
          multiline: true,
          rows: 2,
        });
        itemDescription.field.addEventListener("input", () => {
          item.description = itemDescription.field.value;
        });
        const itemPrice = makeField("Cena (nepovinná)", item.price, {
          placeholder: "např. 245 Kč",
        });
        itemPrice.field.addEventListener("input", () => {
          item.price = itemPrice.field.value;
        });
        itemCard.append(itemName.label, itemDescription.label, itemPrice.label);
        sectionCard.append(itemCard);
      });

      sectionCard.append(makeButton("＋ Přidat položku", "owner-add-item", () => {
        section.items.push({ name: "", description: "", price: "" });
        markDirty();
        renderEditor();
        sectionList.children[sectionIndex]
          ?.querySelector(".owner-item-card:last-of-type input")
          ?.focus();
      }));
      sectionList.append(sectionCard);
    });
  }

  async function loadMenu() {
    statusMessage.textContent = "Načítáme jídelní lístek…";
    const { data, error } = await siteMenuClient
      .from("site_content")
      .select("content")
      .eq("id", "restaurant-menu")
      .single();

    if (error) {
      console.error("Could not load menu for editing.", error);
      statusMessage.textContent = `Jídelní lístek se nepodařilo načíst: ${error.message}`;
      menuForm.hidden = true;
      return;
    }

    if (!data?.content || !Array.isArray(data.content.sections)) {
      statusMessage.textContent = "Databáze obsahuje neplatný formát jídelního lístku.";
      menuForm.hidden = true;
      return;
    }

    menu = data.content;
    menuNotice.value = menu.notice || "";
    dirty = false;
    renderEditor();
    menuForm.hidden = false;
    statusMessage.textContent = "Aktuální jídelní lístek načten.";
  }

  menuNotice.addEventListener("input", () => {
    if (!menu) return;
    menu.notice = menuNotice.value;
    markDirty();
  });

  menuForm.querySelector("[data-add-section]").addEventListener("click", () => {
    menu.sections.push({ title: "", description: "", items: [] });
    markDirty();
    renderEditor();
    const lastSection = sectionList.lastElementChild;
    lastSection?.scrollIntoView({ behavior: "smooth", block: "center" });
    lastSection?.querySelector("input")?.focus();
  });

  saveButton.addEventListener("click", async () => {
    if (!menu) {
      statusMessage.textContent = "Jídelní lístek zatím není načten.";
      return;
    }

    const invalidSection = menu.sections.findIndex((section) => !String(section.title || "").trim());
    const invalidItem = menu.sections.findIndex((section) =>
      section.items.some((item) => !String(item.name || "").trim()),
    );
    if (invalidSection !== -1) {
      statusMessage.textContent = `Doplňte název kategorie ${invalidSection + 1} před uložením.`;
      sectionList.children[invalidSection]?.querySelector("input")?.focus();
      return;
    }
    if (invalidItem !== -1) {
      statusMessage.textContent = `Doplňte názvy všech položek v kategorii „${menu.sections[invalidItem].title}“.`;
      sectionList.children[invalidItem]?.querySelector(".owner-item-card input")?.focus();
      return;
    }

    saveButton.disabled = true;
    statusMessage.textContent = "Ukládáme jídelní lístek…";
    try {
      const { data, error } = await siteMenuClient
        .from("site_content")
        .update({ content: menu })
        .eq("id", "restaurant-menu")
        .select("id")
        .single();

      if (error) {
        console.error("Could not save menu.", error);
        statusMessage.textContent = `Jídelní lístek se nepodařilo uložit: ${error.message}`;
        return;
      }
      if (!data) {
        statusMessage.textContent = "Změny nebyly uloženy. Zkontrolujte, zda je řádek jídelního lístku v databázi.";
        return;
      }

      dirty = false;
      statusMessage.textContent = "Uloženo. Nový jídelní lístek je zveřejněn.";
    } catch (error) {
      console.error("Could not save menu.", error);
      statusMessage.textContent = `Jídelní lístek se nepodařilo uložit: ${error.message}`;
    } finally {
      saveButton.disabled = false;
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  loadMenu().catch((error) => {
    console.error("Could not initialize the owner editor.", error);
    statusMessage.textContent = `Editor se nepodařilo načíst: ${error.message}`;
  });
}
