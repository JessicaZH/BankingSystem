const express = require ('express');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const app = express();

const connection = mysql.createConnection({
    host: 'localhost',
    port: 3406,
    user: 'root',
    password: 'mypassword',
    database: 'banksys'
});

connection.connect((err)=>{
    if(err) throw err;
    console.log("mysql connected!");
})

app.use(express.static(path.join(__dirname, 'public')));

app.set('views',(__dirname + "/public/views"));
// template engine.
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

app.get('/login', function(req, res){
    res.render('login');
});

// global value
var username;
var [name, tail]=[null, null];
var debit, credit, loan, score;
var lineChartData={}, pieChartData={},barChartData={};

app.post('/login',function(req,res){
    username = req.body.username;
    var password = req.body.password;
    [name, tail]=username.split('@');
    if(username && password) {
        connection.query('SELECT * FROM user WHERE uid = ? AND password = ?', [username,password],
        function(error, results, fileds){
            if (error) {
                console.log("error ocurred",error);
                res.send({
                    "code":400,
                    "failed": "error ocurred"
                })
            }else{
                if(results.length >0 ){
                    if(results[0].password == password){
                        connection.query("select cardno,balance from account, customer where account.cno=customer.cno and customer.email= ? and account.type='debit'",[username], 
                        function(error, results1, rows){
                            if(error){
                                console.log("card info display error", error);
                                res.send({
                                    "code": 400,
                                    "failed": "error ocurred"
                                })
                            }else{
                                debit = results1;
                                console.log(debit[0].cardno,debit[0].balance)
                            }
                        })
                        connection.query("select cardno,balance from account, customer where account.cno=customer.cno and customer.email= ? and account.type='credit'",[username], 
                        function(error, results2, rows){
                            if(error){
                                console.log("card info display error", error);
                                res.send({
                                    "code": 400,
                                    "failed": "error ocurred"
                                })
                            }else{
                                credit = results2;
                                console.log(credit[0].cardno, credit[0].balance);
                                console.log(credit[1].cardno, credit[1].balance);
                            }
                        })
                        connection.query("select contractno, amount, type, date, interest from loan, customer where customer.cno = loan.cno and customer.email= ?",[username], 
                        function(error, results3, rows){
                            if(error){
                                console.log("card info display error", error);
                                res.send({
                                    "code": 400,
                                    "failed": "error ocurred"
                                })
                            }else{
                                loan = results3;
                            }
                        })
                        connection.query("select score from customer where customer.email= ?",[username], 
                        function(error, results4, rows){
                            if(error){
                                console.log("card info display error", error);
                                res.send({
                                    "code": 400,
                                    "failed": "error ocurred"
                                })
                            }else{
                                score = results4[0].score;
                                console.log(score);
                            }
                        })
                        connection.query("select date, score.score from score, customer where score.cno=customer.cno and date between '2019-11' and '2020-04' and customer.email=? order by date",[username], 
                        function(error, results, rows){
                            if(error){
                                console.log("card info display error", error);
                                res.send({
                                    "code": 400,
                                    "failed": "error ocurred"
                                });
                            }else{
                                let label =[];
                                let data =[];
                                for ( var i = 0; i< results.length;i++ ){
                                    label.push(results[i].date);
                                    data.push(results[i].score);
                                }
                                lineChartData = {
                                    label: label,
                                    data: data
                                };
                                res.render('index', {name:name,debit:debit,credit:credit,loan:loan,score:score,lineChartData:lineChartData});
                             }
                        })
                    }
                }else{
                    res.send({
                        "code": 204,
                        "success": "Email and password does not match"
                    });
                }
            }
        })
    }
})


app.get('/index', function(req,res){ 
    res.render('index',{name:name,debit:debit,credit:credit,loan:loan,score:score,lineChartData:lineChartData});
})

app.get('/charts', function(req,res){
    connection.query("select fromdate, sum(amount) as summary from bill, customer where customer.email = ? and customer.cno = bill.cno and fromdate between '2019-11' and '2020-04' group by fromdate order by fromdate",[username], 
    function(error, results, rows){
        if(error){
            console.log("card info display error", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            });
        }else{
            let label =[];
            let data =[];
            for ( var i = 0; i< results.length;i++ ){
                label.push(results[i].fromdate);
                data.push(results[i].summary);
            }
            barChartData = {
                label: label,
                data: data
            };
         }
        })
    connection.query("select type, sum(amount) as summary from bill,customer where fromdate=date_format(now(),'%Y-%m') and customer.cno=bill.cno and customer.email= ? group by type",[username], 
    function(error, results, rows){
        if(error){
            console.log("card info display error", error);
            res.send({
                "code": 400,
                "failed": "error ocurred"
            });
        }else{
            let label =[];
            let data =[];
            for ( var i = 0; i< results.length;i++ ){
                label.push(results[i].type);
                data.push(results[i].summary);
            }
            pieChartData = {
                label: label,
                data: data
            };
            res.render('charts',{name:name,barChartData:barChartData,pieChartData:pieChartData});
         }
        })
})

app.get('/register', function(req,res){

    res.render('register');
})

app.post('/register', function(req, res){
    var customerno=req.body.customerno;
    var username=req.body.username;
    var password=req.body.password;
    if (customerno && username && password){
        connection.query('select * from customer where cno=?',[customerno],
        function(error, results, fileds){
            if(error){
                console.log("customer No not exist", error);
                res.send({
                    "code": 204,
                    "failed": "customer No not exist"
                });
            }else{
                if (results.length>0){
                    connection.query('insert into user values (?,?)',[username,password],
                    function(error,results,fileds){
                        if(error){
                            console.log("User create fail", error);
                            res.send({
                                "code": 400,
                                "failed": "error ocurred"
                            });
                        }else{
                            res.render('login');
                        }
                    })
                }
             } 
        })
    }
})



// setting up the server
app.listen(3000, ()=>{
    console.log('server is running on port 3000...');
});

module.exports = app;