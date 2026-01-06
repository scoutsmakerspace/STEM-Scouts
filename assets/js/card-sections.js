(function () {
  function buildCards(container) {
    const headings = Array.from(container.querySelectorAll("h2"));
    if (!headings.length) return;

    headings.forEach((h2) => {
      if (h2.closest(".section-card")) return;

      const card = document.createElement("section");
      card.className = "section-card";

      const header = document.createElement("div");
      header.className = "section-card__header";
      header.textContent = h2.textContent;

      const body = document.createElement("div");
      body.className = "section-card__body";

      let node = h2.nextSibling;
      while (node) {
        const next = node.nextSibling;
        if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === "h2") break;

        if (!(node.nodeType === 3 && !node.textContent.trim())) {
          body.appendChild(node);
        }
        node = next;
      }

      h2.parentNode.insertBefore(card, h2);
      card.appendChild(header);
      card.appendChild(body);
      h2.remove();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".js-card-sections").forEach(buildCards);
  });
})();
