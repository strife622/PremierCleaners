(function () {
  var html = document.documentElement;
  var header = document.querySelector("[data-site-header]");
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.getElementById("site-nav");

  html.classList.remove("no-js");
  html.classList.add("js");

  if (!header || !toggle || !nav) {
    return;
  }

  function setOpen(open) {
    header.toggleAttribute("data-nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }

  toggle.addEventListener("click", function () {
    setOpen(!header.hasAttribute("data-nav-open"));
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setOpen(false);
      toggle.focus();
    }
  });
})();
