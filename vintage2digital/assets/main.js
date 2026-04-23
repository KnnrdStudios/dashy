(function () {
  'use strict';

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky nav shadow on scroll
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal-on-scroll
  const revealTargets = document.querySelectorAll(
    '.section-head, .service-card, .step, .price-card, .testimonial, .faq-list details, .about-copy, .about-visual, .contact-copy, .contact-form, .hero-stats > div'
  );
  revealTargets.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }

  // FAQ — close others when one opens (accordion behavior)
  const allDetails = document.querySelectorAll('.faq-list details');
  allDetails.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open) {
        allDetails.forEach((other) => {
          if (other !== d) other.open = false;
        });
      }
    });
  });

  // Contact form — client-side validation + friendly confirmation
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form && status) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.classList.remove('success', 'error');
      status.textContent = '';

      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const formats = (data.get('formats') || '').toString().trim();

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !emailOk || !formats) {
        status.textContent = 'Please fill in your name, a valid email, and pick a format.';
        status.classList.add('error');
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      // Simulated submit — swap for real endpoint when wired up
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = original;
        form.reset();
        status.textContent = `Thanks, ${name.split(' ')[0]} — we'll be in touch within 24 hours with your free quote.`;
        status.classList.add('success');
      }, 900);
    });
  }

  // Smooth-scroll for in-page anchors (respects reduced motion)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.pageYOffset - 72;
        window.scrollTo({ top: y, behavior: 'smooth' });
        history.pushState(null, '', id);
      });
    });
  }
})();
