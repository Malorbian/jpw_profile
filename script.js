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

  // top blur overlay toggle: show a narrow blurred band before the navbar when user scrolls down
  const topBlur = document.querySelector('.top-blur');
  function updateTopBlur() {
    const show = window.scrollY > 40; // simple threshold
    topBlur.classList.toggle('visible', show);
  }
  updateTopBlur();
  window.addEventListener('scroll', updateTopBlur, { passive: true });

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
  function setActiveProject(id) {
    panels.forEach(p => p.classList.toggle('active', p.dataset.project === id));
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

  // Scroll-based blur using a top overlay: blur strength is driven by distance
  const navbar = document.querySelector('.navbar');
  const topBlurEl = document.querySelector('.top-blur');
  // targets used to determine how close content is to the overlay: sections and shots
  const distanceTargets = Array.from(document.querySelectorAll('section, .shot'));
  let ticking = false;

  function updateOnScroll() {
    const navOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')) || 120;
    const overlayBottom = navOffset; // overlay top is 0

    const transitionRange = 20; // px over which blur interpolates
    const maxBlur = 6; // px maximum blur

    // find nearest distance from any target's top to the overlay bottom
    let minD = Infinity;
    distanceTargets.forEach(el => {
      const r = el.getBoundingClientRect();
      const d = r.top - overlayBottom;
      if (d < minD) minD = d;
    });

    let blur = 0;
    if (minD <= 0) {
      blur = maxBlur;
    } else if (minD < transitionRange) {
      blur = maxBlur * (1 - (minD / transitionRange));
    } else {
      blur = 0;
    }

    // set CSS variable used by the overlay's backdrop-filter
    document.documentElement.style.setProperty('--top-blur', `${blur}px`);
    topBlurEl.classList.toggle('visible', blur > 0);

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  }, { passive: true });
  updateOnScroll();
});
