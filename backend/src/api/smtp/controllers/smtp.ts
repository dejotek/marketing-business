'use strict';

const nodemailer = require('nodemailer');

const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const textToHtml = (value = '') => {
  return escapeHtml(value).replace(/\n/g, '<br />');
};

const normalizeEmail = (value = '') => {
  return String(value).trim().toLowerCase();
};

const isValidEmail = (value = '') => {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

module.exports = {
  async send(ctx) {
    try {
      const body = ctx.request.body || {};

      const subject = String(body.subject || '').trim();
      const message = String(body.message || '').trim();
      const recipients = Array.isArray(body.recipients) ? body.recipients : [];

      if (!subject) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          message: 'Brakuje tytułu wiadomości.',
        };
        return;
      }

      if (!message) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          message: 'Brakuje treści wiadomości.',
        };
        return;
      }

      const maxRecipients = Number(process.env.SMTP_MAX_RECIPIENTS || 100);

      const seenEmails = new Set();

      const validRecipients = recipients
        .map((recipient) => {
          const email = normalizeEmail(recipient.email);

          return {
            id: recipient.id || null,
            documentId: recipient.documentId || null,
            name: recipient.name || '',
            email,
          };
        })
        .filter((recipient) => {
          if (!isValidEmail(recipient.email)) return false;
          if (seenEmails.has(recipient.email)) return false;

          seenEmails.add(recipient.email);
          return true;
        });

      if (!validRecipients.length) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          message: 'Brakuje poprawnych odbiorców.',
        };
        return;
      }

      if (validRecipients.length > maxRecipients) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          message: `Maksymalnie możesz wysłać wiadomość do ${maxRecipients} odbiorców naraz.`,
        };
        return;
      }

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT || 465);
      const smtpSecure = String(process.env.SMTP_SECURE || 'true') === 'true';
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || smtpUser;

      if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
        ctx.status = 500;
        ctx.body = {
          ok: false,
          message: 'Brakuje konfiguracji SMTP w pliku .env.',
        };
        return;
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const html = textToHtml(message);

      const results = [];

      for (const recipient of validRecipients) {
        try {
          const info = await transporter.sendMail({
            from: smtpFrom,
            to: recipient.email,
            subject,
            text: message,
            html,
          });

          results.push({
            email: recipient.email,
            name: recipient.name,
            success: true,
            messageId: info.messageId,
          });
        } catch (error) {
          strapi.log.error(`SMTP send failed for ${recipient.email}`, error);

          results.push({
            email: recipient.email,
            name: recipient.name,
            success: false,
            error: error.message || 'Błąd wysyłki',
          });
        }
      }

      const sent = results.filter((item) => item.success).length;
      const failed = results.filter((item) => !item.success).length;

      ctx.body = {
        ok: failed === 0,
        sent,
        failed,
        results,
      };
    } catch (error) {
      strapi.log.error('SMTP send endpoint error', error);

      ctx.status = 500;
      ctx.body = {
        ok: false,
        message: error.message || 'Błąd wysyłki wiadomości.',
      };
    }
  },
};