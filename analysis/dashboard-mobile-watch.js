/* Reaplica melhorias quando o dashboard é reconstruído. */
(function (root) {
  "use strict";
  let queued = false;
  function refresh() {
    root.MCDashboardMobileUX?.render();
    root.MCDashboardChartExport?.render();
  }
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    Promise.resolve().then(() => { queued = false; refresh(); });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  refresh();
})(window);
