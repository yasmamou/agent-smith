/**
 * Agent Smith Analytics — tiny, privacy-friendly tracker (~no cookies).
 * Install:
 *   <script defer data-key="YOUR_KEY" src="https://agent-smith-iota.vercel.app/track.js"></script>
 * Custom conversion events:
 *   window.agentsmith('signup')   // or 'pay', etc.
 */
(function () {
  var s = document.currentScript;
  var key = s && s.getAttribute("data-key");
  var endpoint = (s && s.src ? s.src.replace(/\/track\.js.*$/, "") : "") + "/api/track";
  if (!key) return;

  function send(event) {
    var params =
      "k=" + encodeURIComponent(key) +
      "&p=" + encodeURIComponent(location.pathname) +
      "&r=" + encodeURIComponent(document.referrer || "") +
      "&e=" + encodeURIComponent(event || "pageview");
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([], { type: "text/plain" })) ;
    } catch (e) {}
    // GET pixel keeps it simple + cross-origin friendly
    var img = new Image();
    img.src = endpoint + "?" + params + "&t=" + Date.now();
  }

  // expose custom-event API
  window.agentsmith = function (event) { send(event || "event"); };

  // initial pageview
  send("pageview");

  // SPA route changes (history API)
  var push = history.pushState;
  history.pushState = function () { push.apply(this, arguments); send("pageview"); };
  window.addEventListener("popstate", function () { send("pageview"); });
})();
