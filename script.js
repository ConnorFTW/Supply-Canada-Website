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
// No key or account needed.
// Online: the message is emailed to you through FormSubmit (formsubmit.co). The very first message
// sends you an "Activate Form" email; click it once and every message after that arrives directly.
// Opened as a file (no server): FormSubmit refuses those pages, so the visitor's email app opens
// with the message already written. If sending online ever fails, it falls back to the same thing.
// The address is stored encoded so it isn't shown on the page or sitting in the code as plain text.
const INBOX = atob('Y29ubm9yam1zYXZhZ2UxQGljbG91ZC5jb20=');
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

// Used when the message can't be sent directly. A plain mailto link does nothing on computers
// with no email app set up, so the visitor also gets Gmail, Outlook and copy options.
const sendOptions = document.getElementById('send-options');

function openEmailApp(m) {
  const subject = `Quote request: ${m.product}, ${m.quantity}`;
  const body = [
    `Name: ${m.name}`, `Company: ${m.company}`, `Email: ${m.email}`,
    `Product: ${m.product}`, `Quantity: ${m.quantity}`, `Extras: ${m.extras}`, '', m.message,
  ].join('\n');
  const to = encodeURIComponent(INBOX), su = encodeURIComponent(subject), bo = encodeURIComponent(body);

  document.getElementById('send-gmail').href = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bo}`;
  document.getElementById('send-outlook').href = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${bo}`;
  document.getElementById('send-app').href = `mailto:${INBOX}?subject=${su}&body=${bo}`;
  document.getElementById('send-copy').onclick = async () => {
    const text = `To: ${INBOX}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    status.textContent = 'Copied. Paste it into a new email to send it to us.';
  };

  sendOptions.hidden = false;
  status.textContent = 'Your message is ready. Choose how to send it:';
  status.className = 'form-status ok';
}

form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (form.elements._honey.value) return; // bot

  if (!validate()) {
    status.textContent = 'Please fill in your name, a valid email, product and quantity.';
    status.className = 'form-status err';
    return;
  }

  const m = collect();

  if (location.protocol === 'file:') {
    openEmailApp(m);
    return;
  }

  sendOptions.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  status.textContent = '';

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${INBOX}`, {
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
    if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || `Send failed (${res.status})`);

    status.textContent = "Thanks! Your message was sent. We'll reply within one business day.";
    status.className = 'form-status ok';
    form.reset();
  } catch (err) {
    console.error('Form send failed, opening email app instead:', err);
    openEmailApp(m);
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
