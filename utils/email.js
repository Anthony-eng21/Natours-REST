const nodemailer = require("nodemailer"); // npm i nodemailer

/* We're using mailtrap as our "service" to send these emails to our clients securely under my account (signed in with github)
this service allows us to send emails to clients in this use case we use it on user email addresses to allow them to set a new token 
via some email and then we take that token and hash it into our db saving it in memory */
const sendEmail = async (options) => {
  /*1) create a transporter: "service" that actually sends the email */
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    process: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  /*2) define email options */
  const mailOptions = {
    from: "Tony <awoodworth554@gmail.com>",
    to: options.email, //coming as an argument to this options arg in our params later args lols
    subject: options.subject,
    text: options.message,
    // html: 
  }
  /*3) send the email with nodemailer */

  //sets a promise for this cb (data for later)
  await transporter.sendMail(mailOptions)
};

module.exports = sendEmail