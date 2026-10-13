/* E-mails transacionais por HTTPS: compatível com Railway Free/Hobby. */
const SEND_URL = "https://api.resend.com/emails";

export const mailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());

export async function sendTransactionalEmail({ to, subject, text }) {
  if (!mailConfigured()) {
    const err = new Error("O envio de e-mails ainda precisa ser configurado no Railway.");
    err.status = 503;
    throw err;
  }
  if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
      typeof subject !== "string" || !subject.trim() ||
      typeof text !== "string" || !text.trim()) {
    const err = new Error("Mensagem transacional inválida.");
    err.status = 400;
    throw err;
  }

  let response;
  try {
    response = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL.trim(),
        to: [to.trim()],
        subject: subject.trim(),
        text
      }),
      signal: AbortSignal.timeout(12000)
    });
  } catch (cause) {
    const err = new Error("Não foi possível contatar o serviço de e-mails. Tente novamente.");
    err.status = 503;
    err.cause = cause;
    throw err;
  }
  if (!response.ok) {
    const err = new Error(
      response.status === 429
        ? "Limite temporário de envio de e-mails atingido. Aguarde um pouco."
        : "O serviço de e-mails não aceitou o envio. Verifique o domínio e as configurações."
    );
    err.status = response.status === 429 ? 429 : 502;
    // Nunca incluir chave, corpo da resposta ou dados pessoais em logs.
    console.error("Resend rejeitou mensagem transacional, HTTP", response.status);
    throw err;
  }
  const result = await response.json().catch(() => ({}));
  if (!result?.id) {
    const err = new Error("O serviço não confirmou o envio do e-mail.");
    err.status = 502;
    throw err;
  }
  return { messageId: result.id };
}
