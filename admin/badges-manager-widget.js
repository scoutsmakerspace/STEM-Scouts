/*
 * Badges Manager Widget – Expandable Rows (v3)
 * - Table shows TITLE (not ID)
 * - ID shown in expanded panel
 * - Icon reliably resolved and previewed in expanded panel
 */

(function () {
  const h = window.h;

  function resolveIcon(badge) {
    if (!badge) return null;
    if (typeof badge.icon === "string") return badge.icon;
    if (badge.icon && typeof badge.icon.url === "string") return badge.icon.url;
    if (typeof badge.icon_path === "string") return badge.icon_path;
    return null;
  }

  function normaliseBadges(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.badges)) return data.badges;
    return [];
  }

  const BadgesManagerControl = createClass({
    getInitialState() {
      return {
        expandedId: null,
      };
    },

    toggleExpand(id) {
      this.setState({
        expandedId: this.state.expandedId === id ? null : id,
      });
    },

    renderExpandedRow(badge, colCount) {
      const icon = resolveIcon(badge);
      const reqs = Array.isArray(badge.requirements) ? badge.requirements : [];

      return h(
        "tr",
        { className: "badge-expanded-row" },
        h(
          "td",
          { colSpan: colCount, style: { background: "#f7f7f7", padding: "12px" } },
          h("div", { style: { display: "flex", gap: "16px" } }, [
            h("div", { style: { minWidth: "120px" } }, [
              h("strong", {}, "Icon"),
              h(
                "div",
                { style: { marginTop: "6px" } },
                icon
                  ? h("img", {
                      src: icon,
                      style: {
                        maxWidth: "96px",
                        maxHeight: "96px",
                        border: "1px solid #ccc",
                        background: "#fff",
                      },
                    })
                  : h("em", {}, "No icon set")
              ),
            ]),
            h("div", { style: { flex: 1 } }, [
              h("div", {}, [
                h("strong", {}, "ID: "),
                h("code", {}, badge.id || "(missing)"),
              ]),
              h("div", { style: { marginTop: "8px" } }, [
                h("strong", {}, "Requirements"),
                reqs.length
                  ? h(
                      "ol",
                      { style: { marginTop: "6px" } },
                      reqs.map((r) => h("li", {}, r))
                    )
                  : h("div", { style: { marginTop: "6px" } }, h("em", {}, "No requirements")),
              ]),
            ]),
          ])
        )
      );
    },

    render() {
      const value = this.props.value || {};
      const badges = normaliseBadges(value);

      const columns = ["", "Title", "Section", "Category", "Status", "Reqs"];
      const colCount = columns.length;

      return h("div", {}, [
        h(
          "table",
          {
            className: "nc-table",
            style: { width: "100%", tableLayout: "fixed" },
          },
          [
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                columns.map((c) =>
                  h("th", { style: { textAlign: "left", padding: "6px" } }, c)
                )
              )
            ),
            h(
              "tbody",
              {},
              badges.flatMap((badge) => {
                const isOpen = this.state.expandedId === badge.id;
                return [
                  h(
                    "tr",
                    { key: badge.id },
                    [
                      h(
                        "td",
                        { style: { width: "24px", cursor: "pointer" }, onClick: () => this.toggleExpand(badge.id) },
                        isOpen ? "▾" : "▸"
                      ),
                      h("td", {}, badge.title || "(untitled)"),
                      h("td", {}, badge.section || ""),
                      h("td", {}, badge.category || ""),
                      h("td", {}, badge.status || ""),
                      h(
                        "td",
                        {},
                        Array.isArray(badge.requirements) ? badge.requirements.length : 0
                      ),
                    ]
                  ),
                  isOpen ? this.renderExpandedRow(badge, colCount) : null,
                ];
              })
            ),
          ]
        ),
      ]);
    },
  });

  window.CMS.registerWidget("badges_manager", BadgesManagerControl);
})();
