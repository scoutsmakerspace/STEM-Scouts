/* STEM Badge Map Manager – crash-proof registration */

(function () {
  if (typeof CMS === "undefined") {
    console.error("Decap CMS not found");
    return;
  }

  const React = CMS.react;
  const h = React.createElement;

  class StemBadgeMapManagerControl extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        value: props.value || {},
        error: null,
      };
    }

    componentDidCatch(error) {
      console.error("STEM Badge Map widget crashed:", error);
      this.setState({ error: error.toString() });
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

      return h(
        "div",
        {
          style: {
            padding: "12px",
            border: "1px solid #ccc",
            background: "#f9f9f9",
          },
        },
        h("strong", null, "STEM Badge Map Manager"),
        h(
          "p",
          { style: { marginTop: "6px", color: "#555" } },
          "Widget loaded successfully. Next step: re-enable mapping UI."
        ),
        h(
          "pre",
          {
            style: {
              marginTop: "10px",
              fontSize: "12px",
              background: "#eee",
              padding: "8px",
            },
          },
          JSON.stringify(this.props.value || {}, null, 2)
        )
      );
    }
  }

  // Preview (required so Decap doesn't complain)
  const StemBadgeMapManagerPreview = () =>
    h("div", null, "STEM Badge Map Manager");

  // 🔑 THIS IS THE IMPORTANT BIT
  CMS.registerWidget(
    "stem_badge_map_manager",
    StemBadgeMapManagerControl,
    StemBadgeMapManagerPreview
  );
})();
