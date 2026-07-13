import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.GMAIL_KEY,
    },
  });
}

const BRAND = {
  name: 'Barbearia Moderna de Tábua',
  navy: '#0F1119',
  gold: '#C9A24B',
  red: '#C6222F',
};

function wrapTemplate(title: string, bodyHtml: string): string {
  return `
  <div style="background:#0F1119; padding:32px 16px; font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#171A26; border-radius:16px; overflow:hidden; border:1px solid rgba(243,239,230,0.08);">
      <div style="background:linear-gradient(135deg,#22335E,#0F1119); padding:24px 28px;">
        <div style="color:#F3EFE6; font-size:18px; font-weight:bold;">${BRAND.name}</div>
      </div>
      <div style="padding:28px; color:#F3EFE6;">
        <h2 style="color:${BRAND.gold}; font-size:20px; margin:0 0 16px;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px; border-top:1px solid rgba(243,239,230,0.08); color:#9C9A93; font-size:12px;">
        Rua dos Bombeiros Voluntários 9A, 3420-322 Tábua &middot; 936 729 118
      </div>
    </div>
  </div>`;
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  customerName: string;
  barberName: string;
  serviceName: string;
  dateFormatted: string;
  time: string;
  price: number;
  cancelUrl: string;
}) {
  const html = wrapTemplate(
    'Marcação confirmada',
    `
    <p>Olá ${params.customerName},</p>
    <p>A sua marcação está confirmada:</p>
    <table style="width:100%; margin:16px 0; font-size:14px;">
      <tr><td style="color:#9C9A93; padding:4px 0;">Profissional</td><td style="text-align:right;">${params.barberName}</td></tr>
      <tr><td style="color:#9C9A93; padding:4px 0;">Serviço</td><td style="text-align:right;">${params.serviceName}</td></tr>
      <tr><td style="color:#9C9A93; padding:4px 0;">Data</td><td style="text-align:right;">${params.dateFormatted}</td></tr>
      <tr><td style="color:#9C9A93; padding:4px 0;">Hora</td><td style="text-align:right;">${params.time}</td></tr>
      <tr><td style="color:#9C9A93; padding:4px 0;">Preço</td><td style="text-align:right; color:${BRAND.gold};">${params.price.toFixed(2)}€</td></tr>
    </table>
    <p style="margin-top:24px;">
      <a href="${params.cancelUrl}" style="display:inline-block; background:${BRAND.red}; color:#fff; text-decoration:none; padding:12px 22px; border-radius:8px; font-size:14px;">Reagendar ou Cancelar</a>
    </p>
    `
  );

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_USER}>`,
    to: params.to,
    subject: `Marcação confirmada — ${params.dateFormatted} às ${params.time}`,
    html,
  });
}

export async function sendPendingPaymentEmail(params: {
  to: string;
  customerName: string;
  amount: number;
  paymentLink: string;
  holdMinutes: number;
}) {
  const html = wrapTemplate(
    'Falta confirmar o pagamento',
    `
    <p>Olá ${params.customerName},</p>
    <p>Para garantir o seu horário, falta efetuar o pré-pagamento de <b style="color:${BRAND.gold};">${params.amount.toFixed(2)}€</b>.</p>
    <p style="margin-top:20px;">
      <a href="${params.paymentLink}" style="display:inline-block; background:${BRAND.gold}; color:#171826; text-decoration:none; padding:12px 22px; border-radius:8px; font-size:14px; font-weight:bold;">Pagar ${params.amount.toFixed(2)}€</a>
    </p>
    <p style="font-size:12px; color:#9C9A93; margin-top:16px;">O horário fica reservado durante ${params.holdMinutes} minutos. Após confirmarmos o pagamento, recebe o email de confirmação definitiva.</p>
    `
  );

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_USER}>`,
    to: params.to,
    subject: 'Falta confirmar o pagamento da sua marcação',
    html,
  });
}

export async function sendCancellationEmail(params: { to: string; customerName: string; dateFormatted: string; time: string }) {
  const html = wrapTemplate(
    'Marcação cancelada',
    `<p>Olá ${params.customerName},</p><p>A sua marcação de ${params.dateFormatted} às ${params.time} foi cancelada.</p>`
  );

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_USER}>`,
    to: params.to,
    subject: 'Marcação cancelada',
    html,
  });
}
