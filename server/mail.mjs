import nodemailer from "nodemailer";
let transporter;
export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
export async function sendTransactionalEmail({to,subject,text}){
 if(!mailConfigured()) throw Object.assign(new Error("Envio de e-mails ainda não configurado no Railway."),{status:503});
 if(!transporter){
  const port=Number(process.env.SMTP_PORT||587);
  transporter=nodemailer.createTransport({
    host:process.env.SMTP_HOST,port,secure:port===465,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},
    requireTLS:port!==465,
  });
 }
 return transporter.sendMail({from:process.env.SMTP_FROM,to,subject,text});
}
