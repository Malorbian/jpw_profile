document.addEventListener('DOMContentLoaded', function () {
  const navLinks = document.querySelectorAll('.navbar a');
  const sections = document.querySelectorAll('section[id]');

  // IntersectionObserver to detect which section is mostly visible
  // use a rootMargin so the section is considered active when its middle area is near the viewport center
  const observerOptions = { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('id');
      const link = document.querySelector('.navbar a[href="#' + id + '"]');
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        navLinks.forEach(a => a.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'page');
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    // allow CSS to offset for fixed navbar when using scrollIntoView
    section.style.scrollMarginTop = '120px';
    observer.observe(section);
  });

  // top-blur removed: no overlay toggling required

  // Smooth scrolling for clicks (scroll-behavior supported by CSS too)
  // helper: select an element's text content (works for plain text or links)
  function selectElementText(el) {
    if (!el) return;
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (err) {
      // fallback: try to focus and select if it's an input
      if (el.select) {
        el.select();
      }
    }
  }

  // select a specific substring inside an element's text nodes
  function selectSubstringInElement(el, substring) {
    if (!el) return;
    if (!substring) return selectElementText(el);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let node = walker.nextNode();
    while (node) {
      const idx = node.data.indexOf(substring);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + substring.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      node = walker.nextNode();
    }
    // fallback: select the whole element if substring not found
    selectElementText(el);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      // perform smooth scroll
      const href = link.getAttribute('href');
      if (href === '#email') {
        // scroll so the CV intro heading (the intro title) is just below the navbar
        const navOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')) || 120;
        const introHeading = document.querySelector('.cv-intro h3, .cv-intro h2, .cv-intro .cv-details');
        if (introHeading) {
          const rect = introHeading.getBoundingClientRect();
          const top = window.scrollY + rect.top - navOffset + 8; // small gap under navbar
          window.scrollTo({ top, behavior: 'smooth' });
        } else {
          // fallback: position the email element under the navbar
          const rect = target.getBoundingClientRect();
          const top = window.scrollY + rect.top - navOffset + 8;
          window.scrollTo({ top, behavior: 'smooth' });
        }

        // wait for the smooth scroll to complete visually; 450ms is a reasonable default
        const emailString = (target.textContent || '').split(':')[1] ? (target.textContent.split(':')[1] || '').trim() : '';
        setTimeout(() => {
          if (emailString) selectSubstringInElement(target, emailString);
          else selectElementText(target);
        }, 450);
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Theme toggle: default = 'dark'
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  function setTheme(mode) {
    const html = document.documentElement;
    if (mode === 'light') {
      html.classList.add('light');
      themeToggle.setAttribute('aria-pressed', 'true');
      // sun icon
      themeIcon.innerHTML = '<path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />';
    } else {
      html.classList.remove('light');
      themeToggle.setAttribute('aria-pressed', 'false');
      // moon icon
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />';
    }
    try { localStorage.setItem('theme', mode); } catch (e) { /* ignore */ }
  }

  // initialize theme (default dark)
  const storedTheme = localStorage.getItem('theme');
  setTheme(storedTheme === 'light' ? 'light' : 'dark');

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'dark' : 'light');
  });

  // Project panels: compute precise unstick condition using panel height and last shot midpoint.
  // This avoids flicker from IntersectionObservers and handles re-sticking correctly while scrolling.
  (function setupProjectUnstickChecks() {
    const groups = Array.from(document.querySelectorAll('.project-group'));
    if (!groups.length) return;

    // read navOffset once per frame
    let ticking = false;

    function update() {
      ticking = false;
      const navOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')) || 120;
      groups.forEach(group => {
        const shots = group.querySelectorAll('.shot');
        const panel = group.querySelector('.project-panel');
        if (!panel || !shots.length) return;
        const lastShot = shots[shots.length - 1];
        const panelRect = panel.getBoundingClientRect();
        const lastRect = lastShot.getBoundingClientRect();

        // compute panel bottom when sticky: navOffset + panelHeight (in viewport coords)
        const panelHeight = panelRect.height;
        const panelBottomIfSticky = navOffset + panelHeight;

        // compute point at the last quarter of the final shot in viewport coordinates
        const lastMidpoint = lastRect.top + (lastRect.height * 0.67);

        // If the panel bottom would extend past the midpoint of the last shot,
        // gradually move the sticky top upward so the panel scrolls away smoothly.
        const shift = panelBottomIfSticky - lastMidpoint; // how many px the panel would overlap the midpoint
        if (shift > 0) {
          // reduce the sticky top so the panel moves up while still sticky
          // allow it to move up beyond the viewport if shift is large
          const newTop = Math.max(-panelHeight, navOffset - shift);
          panel.style.top = newTop + 'px';
        } else {
          // reset to default sticky top
          panel.style.top = '';
        }
      });
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    // also run once to initialize
    update();
  })();

  // Note: simplified blur behavior — only toggle the top overlay visibility based on scroll.
  // The `.top-blur` element height is controlled via CSS (`--nav-offset`) and we keep
  // the earlier simple handler `updateTopBlur` (defined above) to show/hide the overlay.
});
