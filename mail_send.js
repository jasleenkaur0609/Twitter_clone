var nodemailer=require('nodemailer');
async function sendVerifyMail(to_email){
let transporter=nodemailer.createTransport({
    service:"gmail",
    host:"smtp.gmail.com",
    port:465,
    secure:false,
    auth:{
        user:"jasleensejal2003@gmail.com",
        pass:"ahezxqouuppkoykb"   //This is the app password which is generated by the google account

    }
});
let info=await transporter.sendMail({
    to:to_email,
    from:"jasleensejal2003@gmail.com",
    subject:"Verify your email for Twitter account",
    html: "<h2 style=\"color:red\">Please click on the link to verify your account</h2><a href=\"http://localhost:8080/verifyemail?email=" + to_email + "\">Click Here to verify email</a>"

});
if(info.messageId)
    return true;
else
    return false;
}
module.exports=sendVerifyMail;