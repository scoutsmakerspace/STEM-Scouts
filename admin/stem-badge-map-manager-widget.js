/* STEM Badge Map Manager – crash-proof registration for Decap CMS 3.x */

(function () {
  if (typeof CMS === "undefined") {
    console.error("[stem_badge_map_manager] Decap CMS global 'CMS' not found");
    return;
  }

  // Decap exposes React on window in many builds; CMS.react is not reliable.
  const React = window.React || (CMS && CMS.react);
  if (!React) {
    console.error(
      "[stem_badge_map_manager] React not found. window.React is missing and CMS.react is undefined."
    );
    // Register a dummy widget so Decap doesn't hard-fail the editor UI.
    CMS.registerWidget("stem_badge_map_manager", function Dummy() {
      return document.createTextNode(
        "STEM Badge Map Manager: React not available (check admin/index.html script order)."
      );
    });
    return;
  }

  const h = window.h || React.createElement;

  class StemBadgeMapManagerControl extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }

    componentDidCatch(err) {
      console.error("[stem_badge_map_manager] widget crashed:", err);
      this.setState({ error: String(err) });
    }

    render() {
      if (this.state.error) {
        return h(
          "div",
          {
            style: {
              padding: "12px",
              border: "2px solid #c00",
              background: "#fff5f5",
              color: "#900",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            },
          },
          "STEM Badge Map Manager crashed:\n\n" + this.state.error
        );
      }

      // Minimal “it works” UI (we’ll re-enable the full manager once stable)
      return h(
        "div",
        { style: { padding: "12px", border: "1px solid #ccc", background: "#f9f9f9" } },
        h("strong", null, "STEM Badge Map Manager"),
        h(
          "p",
          { style: { marginTop: "6px", color: "#555" } },
          "Widget loaded successfully (React available)."
        ),
        h(
          "pre",
          {
            style: {
              marginTop: "10px",
              fontSize: "12px",
              background: "#eee",
              padding: "8px",
              overflow: "auto",
              maxHeight: "240px",
            },
          },
          JSON.stringify(this.props.value || {}, null, 2)
        )
      );
    }
  }

  const StemBadgeMapManagerPreview = function Preview() {
    return h("div", null, "STEM Badge Map Manager");
  };

  // ✅ Register the widget (3rd arg is preview component)
  CMS.registerWidget(
    "stem_badge_map_manager",
    StemBadgeMapManagerControl,
    StemBadgeMapManagerPreview
  );

  console.log("[stem_badge_map_manager] widget registered");
})();
