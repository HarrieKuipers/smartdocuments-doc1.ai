import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "noreply@doc1.ai";

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
) {
  await resend.emails.send({
    from: `doc1.ai <${FROM}>`,
    to: email,
    subject: "Wachtwoord resetten – doc1.ai",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #0062EB; margin: 0;">doc1.ai</h1>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; color: #111; margin-bottom: 16px;">Hallo ${name},</h2>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 24px;">
          We hebben een verzoek ontvangen om het wachtwoord van je doc1.ai account te resetten.
          Klik op de knop hieronder om een nieuw wachtwoord in te stellen.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #0062EB; color: #fff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
            Wachtwoord resetten
          </a>
        </div>
        <p style="font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 8px;">
          Deze link is 1 uur geldig. Als je geen wachtwoord reset hebt aangevraagd, kun je deze e-mail negeren.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          &copy; ${new Date().getFullYear()} doc1.ai – Slimme documenten, gebouwd door Espire AI Agency
        </p>
      </div>
    `,
  });
}
