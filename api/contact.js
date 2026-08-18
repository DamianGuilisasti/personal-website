const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'damianguilisasti@gmail.com';
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Damian Guilisasti Website <onboarding@resend.dev>';

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const lang = typeof body.lang === 'string' ? body.lang : 'es';
    const honeypot = body._hp;

    // Honeypot field: real users never fill this, bots often do.
    // Pretend success so bots don't learn anything.
    if (honeypot) {
      return res.status(200).json({ ok: true });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return res.status(400).json({ ok: false, error: 'too_long' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('contact form: RESEND_API_KEY is not set');
      return res.status(500).json({ ok: false, error: 'server_misconfigured' });
    }

    const subject = `Nuevo contacto de ${name} (web)`;
    const text = [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Idioma de la web: ${lang}`,
      '',
      'Mensaje:',
      message,
    ].join('\n');

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject,
      text,
    });

    if (error) {
      console.error('resend error', error);
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact form error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
};
