// Mobile nav
const toggle = document.getElementById('nav-toggle');
const links = document.getElementById('nav-links');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  links.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
}));

// Product viewer (the tabs and panels are generated into index.html by tools/build.py)
const productSelect = document.getElementById('product-select');
const tabs = [...document.querySelectorAll('.tag-option')];

function showProduct(id) {
  tabs.forEach(t => {
    const on = t.dataset.id === id;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(`panel-${t.dataset.id}`).hidden = !on;
  });
}

tabs.forEach((t, i) => {
  t.addEventListener('click', () => showProduct(t.dataset.id));
  t.addEventListener('keydown', e => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.focus();
    showProduct(next.dataset.id);
  });
});

// "Request a quote" buttons pre-select the product in the form
document.querySelectorAll('[data-quote]').forEach(btn =>
  btn.addEventListener('click', () => { if (productSelect) productSelect.value = btn.dataset.quote; }));

// Links from product pages arrive as /?product=NAME#quote
const requested = new URLSearchParams(location.search).get('product');
if (requested && productSelect) productSelect.value = requested;

// Quote / contact form
// Messages are emailed to you through FormSubmit (formsubmit.co); the address is never shown on the page.
// The first submission sends an activation email. After you click "Activate", FormSubmit gives you a
// random ID: put it in place of the email below so the address isn't in the page source either.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/connorjmsavage1@icloud.com';
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const submitBtn = form?.querySelector('button[type="submit"]');

function validate() {
  let valid = true;
  form.querySelectorAll('[required]').forEach(field => {
    const ok = field.value.trim() !== '' && (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
    field.classList.toggle('invalid', !ok);
    if (!ok) valid = false;
  });
  return valid;
}

function collect() {
  const d = new FormData(form);
  return {
    name: d.get('name').trim(),
    company: d.get('company').trim(),
    email: d.get('email').trim(),
    product: d.get('product'),
    quantity: d.get('quantity'),
    extras: d.getAll('extras').join(', ') || 'None',
    message: d.get('message').trim() || '(no message)',
  };
}

form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (form.elements._honey.value) return; // bot

  if (!validate()) {
    status.textContent = 'Please fill in your name, a valid email, product and quantity.';
    status.className = 'form-status err';
    return;
  }

  // FormSubmit refuses pages opened straight from disk (file://). It works once the site is online.
  if (location.protocol === 'file:') {
    status.textContent = "The form can't send from a page opened as a file. It works once the site is online, or when previewed through a local server.";
    status.className = 'form-status err';
    return;
  }

  const m = collect();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  status.textContent = '';

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `New quote request: ${m.product}, ${m.quantity}`,
        _template: 'table',
        _replyto: m.email,
        ...m,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || 'Send failed');

    status.textContent = "Thanks! Your message was sent. We'll reply within one business day.";
    status.className = 'form-status ok';
    form.reset();
  } catch (err) {
    console.error('Form send failed:', err);
    status.textContent = "Sorry, your message didn't send. Please try again in a minute.";
    status.className = 'form-status err';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send message';
  }
});

form?.addEventListener('input', e => {
  if (e.target.classList.contains('invalid')) e.target.classList.remove('invalid');
});

// Hide the floating contact button while the form is on screen
const fab = document.getElementById('contact-fab');
const quoteSection = document.getElementById('quote');
if (fab && quoteSection) {
  new IntersectionObserver(([entry]) => fab.classList.toggle('hidden', entry.isIntersecting), { threshold: 0.15 })
    .observe(quoteSection);
}

document.getElementById('year').textContent = new Date().getFullYear();
