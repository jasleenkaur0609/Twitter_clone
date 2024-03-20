var mysql = require('mysql');
var db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "twitter_clone"
});

db.connect(function(err) {
    if(err) 
        throw err;
    }); // end of connect function
    
module.exports=db;