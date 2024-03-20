var express=require('express');
var session = require('express-session');
var bodyParser=require('body-parser');
var app=express();
var db=require('./db_connection.js');
const multer = require('multer');
var sendVerifyMail=require('./mail_send.js');

app.use(session({secret:"test123!@#"}));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(express.static(__dirname+"/public"));

var storage = multer.diskStorage({
    destination:(req,res,cb)=>{
        cb(null,"public/uploads/");
    }, //cb is the callback function
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+req.session.userid+file.originalname); //duplicate files will not be available
    }
});
var p_storage = multer.diskStorage({
    destination:(req,res,cb)=>{
        cb(null,"public/profileuploads/");
    }, //cb is the callback function
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+req.session.userid+file.originalname); //duplicate files will not be available
    }
});

var h_storage = multer.diskStorage({
    destination:(req,res,cb)=>{cb(null,"public/headeruploads/");
},
filename:(req,file,cb)=>{
    cb(null,Date.now()+"-"+req.session.userid+file.originalname);
}
});
// Login
app.get('/',function(req,res){
    var msg="";
    if(req.session.msg!=="")
        msg=req.session.msg;
    // req.session.msg="";
    res.render('login',{msg:msg});
});

app.post('/login_submit',function(req,res){
    const{email,password}=req.body;
    let sql="";
    if(isNaN(email))
        sql = "SELECT * FROM user WHERE email = '" + email + "' AND password = '" + password + "' AND status = 1 AND softdelete = 0";
    else
        sql = "SELECT * FROM user WHERE mobile = '" + email + "' AND password = '" + password + "' AND status = 1 AND softdelete = 0";
    db.query(sql,function(err,result,fields){
        if(err)
            throw err;
        if(result.length==0)
            res.render('login',{msg:"username or password didn't match"});
        else{
            req.session.userid=result[0].uid;
            req.session.un=result[0].username;
            res.redirect('/home');
        }
    })
})
app.get('/signup',function(req,res){
    res.render('signup',{errmsg:""});
});
var signup_upload=multer({storage:p_storage});
app.post('/signup_submit',signup_upload.single('profilepic'),function(req,res){
    const{fname,mname,lname,email,password,cpassword,dob,gender,username}=req.body;
    var p_filename="";
    try{
        p_filename=req.file.filename;
    }
    catch(err){
        console.log(err);
    }
    let sql_check="";
    if(isNaN(email))
        sql_check="SELECT email FROM user WHERE email = '" + email + "' ";
    else
        sql_check="SELECT mobile FROM user WHERE mobile = '" + email + "' ";
    db.query(sql_check,function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1){
            let errmsg="";
            if(isNaN(email))
                errmsg="Email already exist";
            else
                errmsg="Mobile already exist";
            
            res.render('signup',{errmsg:errmsg});
        }
        else{
            let sql = "";
            if(isNaN(email))
                 sql="insert into user(fname,mname,lname,email,password,dob,dor,profilepic,gender,username) values(?,?,?,?,?,?,?,?,?,?)";
            else
            sql="insert into user(fname,mname,lname,mobile,password,dob,dor,profilepic,gender,username) values(?,?,?,?,?,?,?,?,?,?)";

            let t=new Date();
            let m=t.getMonth()+1;
            let dor=t.getFullYear()+"-"+m+"-"+t.getDate();
            console.log(sql);
            db.query(sql,[fname,mname,lname,email,password,dob,dor,p_filename,gender,username],function(err,result){
                if(err)
                    throw err;
                else{
                    console.log(result);
                    
                    if(result && result.insertId>0){
                        if(isNaN(email)){
                            sendVerifyMail(email);
                        }
                        req.session.msg="Account created!!Please check the mail to verify the email";
                        res.redirect('/');
                    }
                    else{
                        res.render('signup',{errmsg:"Can Not complete the signup, please try again"});
                    }
                }
            })
        }
    })
});
app.get('/home',function(req,res){
    if(req.session.userid!=""){
        let msg="";
        if(req.session.msg!=""){
            msg=req.session.msg;
        }
        let sql = "SELECT * FROM tweet INNER JOIN user ON user.uid = tweet.uid WHERE tweet.uid = ? OR tweet.uid IN (SELECT follow_id FROM user_follows WHERE uid = ?) OR tweet.post LIKE '%" + req.session.un + "%' ORDER BY tweet.datetime DESC";
db.query(sql, [req.session.userid, req.session.userid], function(err, result, fields) {
    if (err)
        throw err;
    res.render('home', { result: result, msg: msg}); // Pass profile picture URL to the rendered view
});
        
    }
    else{
        req.session.msg="Please login first to view Home Page";
        res.redirect('/');
    }
})
app.get('/edit_profile',function (req, res) {
    db.query("select * from user where uid=?",[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1){
            res.render('edit_profile',{msg:"",result:result});
        }
        else{
            res.redirect('/');
        }
    })
     
})


app.post('/edit_profile_submit', function(req, res) {
    const { fname, mname, lname, about } = req.body;
    
    
    let sql = "UPDATE user fname=?, mname=?, lname=?, about=? WHERE uid=?";
    console.log("SQL:", sql);
    db.query(sql, [fname, mname, lname, about, req.session.userid], function(err, result) {
        if (err) {
            console.log("Query Error:", err);
            req.session.msg = "Data Not Updated (Error)";
            res.redirect('/home');
        } else {
            console.log("Query Result:", result);
            if (result && result.affectedRows == 1) {
                req.session.msg = "Data Updated";
                res.redirect('/home');
            } else {
                req.session.msg = "Data Not Updated";
                res.redirect('/home');
            }
        }
    });
});
app.get('/views/edit_headerpic.ejs',function(req,res){
    res.render('edit_headerpic.ejs');
});

var header_upload = multer({storage:h_storage});
app.post('/edit_headerpic_submit',header_upload.single('headerpic'),function(req,res){
    var h_filename = "";
    try {
        h_filename = req.file.filename; // Get Header picture filename
        
        console.log("Header Picture Filename:", h_filename);
        
    } catch (err) {
        console.log("Error:", err);
    }
    let sql = "UPDATE user SET headerpic=? WHERE uid=?";
    console.log("SQL:", sql);
    db.query(sql, [h_filename, req.session.userid], function(err, result) {
        if(err){
            console.log("Query Error:", err);
            req.session.msg = "Data Not Updated (Error)";
            res.redirect('/home');
        }else{
            console.log("Query Result:", result);
            if (result && result.affectedRows == 1) {
                req.session.msg = "Data Updated";
                res.redirect('/home');
            } else {
                req.session.msg = "Data Not Updated";
                res.redirect('/home');
            }
        }
    });
});
app.get('/views/edit_profilepic.ejs',function(req,res){
    res.render('edit_profilepic.ejs');
});

app.post('/edit_profilepic_submit',signup_upload.single('profilepic'),function(req,res){
    var p_filename = "";
    try {
        p_filename = req.file.filename; // Get profile picture filename
        
        console.log("Profile Picture Filename:", p_filename);
        
    } catch (err) {
        console.log("Error:", err);
    }
    let sql = "UPDATE user SET profilepic=? WHERE uid=?";
    console.log("SQL:", sql);
    db.query(sql, [p_filename, req.session.userid], function(err, result) {
        if(err){
            console.log("Query Error:", err);
            req.session.msg = "Data Not Updated (Error)";
            res.redirect('/home');
        }else{
            console.log("Query Result:", result);
            if (result && result.affectedRows == 1) {
                req.session.msg = "Data Updated";
                res.redirect('/home');
            } else {
                req.session.msg = "Data Not Updated";
                res.redirect('/home');
            }
        }
    });
});
app.get('/followers',function(req,res){
    let sql = "select * from user where uid in (select uid from user_follows where follow_id=?)";
    db.query(sql,[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        res.render('followers_view',{result:result,msg:""});
    })
})

app.get('/following',function(req,res){
    let sql = "select * from user where uid in (select follow_id from user_follows where uid=?)";
    db.query(sql,[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        res.render('following_view',{result:result,msg:""});
    })
})


var upload_detail=multer({storage:storage});
app.post('/tweet_submit',upload_detail.single('tweet_img'),function(req,res){
    const{post}=req.body;
    var filename="";
    var mimetype="";
    try{
        filename=req.file.filename;
        mimetype=req.file.mimetype;
    }catch(err){
        console.log(err);
    }
    
    var d=new Date();
    var m=d.getMonth()+1;
    var ct=d.getFullYear()+"-"+m+"-"+d.getDate() +" "+ d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();

    let sql = "insert into tweet(uid,post,datetime,img_vdo_name,type) values(?,?,?,?,?)";

    db.query(sql,[req.session.userid,post,ct,filename,mimetype],function(err,result){

        if(err)
            throw err;
        if(result.insertId>0)
            req.session.msg="Tweet Done";
        
        else
            req.session.msg="Can not tweet your post";
        res.redirect('/home');
    })
})
app.get('/logout', function (req, res) {
    req.session.userid="";
    res.redirect('/');
})
app.get('/verifyemail', function(req, res) {
    let email = req.query['email'];
    let sql_update = "UPDATE user SET status = 1 WHERE email = ?";

    db.query(sql_update, [email], function(err, result) {
        if (err) {
            console.log(err);
        }

        if (result.affectedRows == 1) {
            req.session.msg = "Email verified. You can now proceed to login.";
             res.redirect('/');
        } else {
            req.session.msg = "Unable to verify your email/contact.";
             res.redirect('/');
        }
    });
});

app.get('/changepassword',function(req, res) {
    res.render('changepassword');
});
app.post('/changepassword_submit',function(req, res) {
    const{password,cpassword}=req.body;
    let sql = "update user set password = ? where uid = ?";
    db.query(sql,[password,req.session.userid],function(err,result){
        if(err)
            throw err;
        else{
            console.log(result);
            if(result.affectedRows==1){
                req.session.msg="Password Changed";
                res.redirect('/home');
            }
            else{
                req.session.msg="Password Not Changed";
                res.redirect('/home');
            }

        }
    });

});
app.listen(8080,function(){console.log("Server running at localhost 8080 port")});