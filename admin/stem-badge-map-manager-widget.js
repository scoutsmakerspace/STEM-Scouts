/* STEM Badge Map Manager – minimal stable widget for Decap CMS 3.x
   Goal: STOP React #31 and confirm widget registration/rendering works.
*/

(function () {
  if (typeof CMS === "undefined") {
    console.error("[stem_badge_map_manager] CMS global not found");
    return;
  }

  // Decap/React availability varies. Use window.React first.
  var React = window.React || (CMS && CMS.react);
  if (!React || !React.createElement) {
    console.error("[stem_badge_map_manager] React not available on window.React");
    // IMPORTANT: Do NOT register a widget that returns DOM nodes.
    // If React is missing, just do nothing and fail loudly in console.
    return;
  }

  var h = React.createElement;

  function StemBadgeMapManagerControl(props) {
    // Never render raw objects; keep output string-only for now.
    var hasValue = props && props.value != null;
    var type = hasValue ? Object.prototype.toString.call(props.value) : "null";

    return h(
      "div",
      {
        style: {
          padding: "12px",
          border: "1px solid #cfcfcf",
          background: "#f9f9f9",
          borderRadius: "6px",
        },
      },
      h("div", { style: { fontWeight: 700, marginBottom: "6px" } }, "STEM Badge Map Manager"),
      h(
        "div",
        { style: { color: "#555", fontSize: "13px" } },
        "Widget loaded successfully. Value type: " + type
      ),
      h(
        "div",
        { style: { marginTop: "10px", fontSize: "12px", color: "#777" } },
        "Next step: re-enable full manager UI."
      )
    );
  }

  function StemBadgeMapManagerPreview() {
    return h("div", null, "STEM Badge Map Manager");
  }

  CMS.registerWidget(
    "stem_badge_map_manager",
    StemBadgeMapManagerControl,
    StemBadgeMapManagerPreview
  );

  console.log("[stem_badge_map_manager] widget registered OK");
})();
