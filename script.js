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
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // Project shots observer: keep right panel in sync with the shot currently visible
  const shots = document.querySelectorAll('.shot');
  const panels = document.querySelectorAll('.project-panel');

  // Keep track of the currently active project id to animate transitions
  let currentProjectId = null;

  function setActiveProject(id) {
    if (id === currentProjectId) return;
    const newPanel = document.querySelector(`.project-panel[data-project="${id}"]`);
    const oldPanel = document.querySelector(`.project-panel[data-project="${currentProjectId}"]`);

    // animate old panel up and remove active
    if (oldPanel) {
      oldPanel.classList.remove('active');
      oldPanel.classList.add('leaving');
      const cleanup = (e) => {
        // wait for opacity/transform transition to finish
        if (e.propertyName === 'transform' || e.propertyName === 'opacity') {
          oldPanel.classList.remove('leaving');
          oldPanel.removeEventListener('transitionend', cleanup);
        }
      };
      oldPanel.addEventListener('transitionend', cleanup);
    }

    // prepare and animate new panel from below
    if (newPanel) {
      newPanel.classList.remove('leaving');
      // force reflow so the transition picks up
      void newPanel.offsetHeight;
      newPanel.classList.add('active');
    }

    currentProjectId = id;
  }

  // default to first project's id
  if (shots.length) setActiveProject(shots[0].dataset.project);

  const shotObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.dataset.project;
        setActiveProject(id);
      }
    });
  }, { root: null, threshold: 0.6 });

  shots.forEach(s => shotObserver.observe(s));

  // Note: simplified blur behavior — only toggle the top overlay visibility based on scroll.
  // The `.top-blur` element height is controlled via CSS (`--nav-offset`) and we keep
  // the earlier simple handler `updateTopBlur` (defined above) to show/hide the overlay.
});
