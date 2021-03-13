const express = require("express");
const app = express();
const mysql = require("mysql");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const path = require("path");
// const fileupload = require("express-fileupload");
var multer = require("multer");
const upload = require('./multer');
const cloudinary = require("./cloudinary");
const fs = require("fs");

//////////////////////////////////////////////
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static("public"));

const cats = ["Indian", "Chinese", "Italian", "Non-Veg", "Global", "BreakFast", "Japanse", "Mexican", "Street Food"];
var users = [];

function getUsers() {
  con.query("SELECT * FROM User", function(err, uss) {
    users = uss;
  });
}
////////////////////////////////// CONNECTION TO MYSQL SERVER //////////////////////////////////////////////////////////
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "BonvivantDB",
  multipleQueries: true
});
con.connect(function(err) {
  if (!err) {
    console.log("Connected to mySql Server");
  } else {
    console.log(err);
  }
});

///////////////////////////////// USER TABLE ///////////////////////////////////////////////////////////////////////
app.get("/createTableForUser", function(req, res) {
  con.query("CREATE TABLE User (Id INT NOT NULL AUTO_INCREMENT, First_Name VARCHAR(255) NOT NULL, Last_Name VARCHAR(255) NOT NULL, Email VARCHAR(255) NOT NULL, Contact_No VARCHAR(255) NOT NULL, Password VARCHAR(255) NOT NULL, PRIMARY KEY(Id))", function(err, result) {
    if (!err) {
      res.send("<h1>Table Created</h1>");
      console.log("Table Created!!");
    } else {
      console.log(err);
    }
  })
});
///////////////////////////////// CATEGORY TABLE ///////////////////////////////////////////////////////////////////
app.get("/createTableForCategory", function(req, res) {
  con.query("CREATE TABLE Category (Id INT NOT NULL AUTO_INCREMENT, Type_Of_Cousine VARCHAR(255) NOT NULL, PRIMARY KEY(Id))", function(err, result) {
    if (!err) {
      res.send("<h1>Table Created</h1>");
      console.log("Table Created!!");
    } else {
      console.log(err);
    }
  });
});
///////////////////////////////// BLOG TABLE ///////////////////////////////////////////////////////////////////////
app.get("/createTableForBlog", function(req, res) {
  con.query("CREATE TABLE Blog (Id INT NOT NULL AUTO_INCREMENT, User_Id INT NOT NULL, Category_Id INT NOT NULL, Title VARCHAR(255) NOT NULL, Content TEXT NOT NULL, Image VARCHAR(255), Date_Of_Blog DATE, Likes INT, PRIMARY KEY(Id), FOREIGN KEY (User_Id) REFERENCES User(Id), FOREIGN KEY (Category_Id) REFERENCES Category(Id))", function(err, result) {
    if (!err) {
      res.send("<h1>Table Created</h1>");
      console.log("Table Created!!");
    } else {
      console.log(err);
    }
  });
});
///////////////////////////////// COMMENTS TABLE /////////////////////////////////////////////////////////////////////
app.get("/createTableForComments", function(req, res) {
  con.query("CREATE TABLE Comments (Id INT NOT NULL AUTO_INCREMENT, Id_Of_Blog INT NOT NULL, Id_Of_Commenter INT NOT NULL, Comment VARCHAR(255) NOT NULL, PRIMARY KEY(Id), FOREIGN KEY (Id_Of_Blog) REFERENCES Blog(Id), FOREIGN KEY (Id_Of_Commenter) REFERENCES User(Id))", function(err, result) {
    if (!err) {
      res.send("<h1>Table Created</h1>");
      console.log("Table Created!!");
    } else {
      console.log(err);
    }
  });
});
///////////////////////////////// COMMENTS TABLE /////////////////////////////////////////////////////////////////////
app.get("/createTableForLikes", function(req, res) {
  con.query("CREATE TABLE Likes (Id INT NOT NULL AUTO_INCREMENT, Id_Of_Blog INT NOT NULL, Id_Of_User INT NOT NULL, PRIMARY KEY(Id), FOREIGN KEY (Id_Of_Blog) REFERENCES Blog(Id), FOREIGN KEY (Id_Of_User) REFERENCES User(Id))", function(err, result) {
    if (!err) {
      res.send("<h1>Table Created</h1>");
      console.log("Table Created!!");
    } else {
      console.log(err);
    }
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  getUsers();
  res.render("login");
});

app.get("/profile", function(req, res) {
  res.render("profile");
});

app.post("/login", function(req, res) {
  con.query("SELECT * FROM User WHERE Email=?", req.body.email, function(err, result) {
    if (!err) {
      if (result.length > 0) {
        if (result[0].Password === req.body.password) {
          con.query("SELECT * FROM Blog ORDER BY Likes DESC", function(er, blogs) {
            if (!er) {
              res.render("profile", {
                user: result[0],
                blogs: blogs,
                Category: cats,
                users: users
              });
            } else {
              console.log(er);
            }
          });
        } else {
          res.send("<h1>Incorrect Password, Please try again</h1>");
        }
      } else {
        res.send("<h1>Looks like you are not registered, Please register first!!</h1>");
      }
    } else {
      console.log(err);
    }
  });
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  const sql = "INSERT INTO User (First_Name, Last_Name, Email, Contact_No, Password) VALUES (?,?,?,?,?)";
  const values = [req.body.firstName, req.body.lastName, req.body.email, req.body.number, req.body.password];
  con.query(sql, values, function(err, result) {
    if (!err) {
      res.redirect("/login");
    } else {
      console.log(err);
    }
  });
});

app.get("/Category/:c/:id", function(req, res) {
  con.query("SELECT * FROM Blog WHERE Category_Id=(SELECT Id FROM Category WHERE Type_Of_Cousine=?) ORDER BY Date_Of_Blog DESC", req.params.c, function(err, foundBlogs) {
    if (!err) {
      con.query("Select * FROM User Where id=?", req.params.id, function(er, person) {
        if (!er) {
          getUsers();
          res.render("Category", {
            user: person[0],
            blogs: foundBlogs,
            Category: req.params.c,
            users: users
          });
        } else {
          console.log(er);
        }
      });
    } else {
      console.log(err);
    }
  });
});

app.get("/profilepg/:user", function(req, res) {
  con.query("Select * FROM User Where id=?", req.params.user, function(err, person) {
    if (!err) {
      getUsers();
      con.query("SELECT * FROM likes, blog where likes.Id_Of_Blog=blog.Id and likes.Id_Of_User=?", req.params.user, function(error, blogs) {
        res.render("profilepg", {
          user: person[0],
          blogs: blogs,
          Category: cats,
          users: users
        });
      });
    } else {
      console.log(err);
    }
  });
});

app.get("/postblog/:id", function(req, res) {
  con.query("Select * FROM User Where id=?", req.params.id, function(err, person) {
    if (!err) {
      res.render("postblog", {
        user: person[0]
      });
    } else {
      console.log(err);
    }
  });
});

app.post('/postblog', upload.array('image'), async (req, res, next) => {
  const uploader = async (path) => await cloudinary.uploads(path, 'Images')
  if (req.method === 'POST') {
    const urls = [];
    const files = req.files;
    for (const file of files) {
      const {
        path
      } = file;
      const newPath = await uploader(path);
      urls.push(newPath);
      fs.unlinkSync(path);
    }
    console.log(urls[0].url);
    con.query("SELECT Id FROM Category WHERE Type_Of_Cousine=?", req.body.category, function(err, id) {
      if (!err) {
        // console.log(req.file);
        let dt = new Date();
        const sql = "INSERT INTO Blog (User_Id, Category_Id, Title, Content, Image, Date_Of_Blog, Likes) VALUES (?,?,?,?,?,?,?)";
        const values = [req.body.Id, id[0].Id, req.body.title, req.body.content, urls[0].url, dt, 0];
        con.query(sql, values, function(er, result) {
          if (!er) {
            res.redirect("/profilepg/" + req.body.Id);
          } else {
            console.log(er);
          }
        });
      } else {
        console.log(err);
      }
    });
  } else {
    res.status(450).json({
      err: "Images not uploaded Successfully"
    });
  }
});

app.get("/blogs/:id", function(req, res) {
  con.query("SELECT * FROM Blog WHERE User_Id=? ORDER BY Date_Of_Blog DESC", req.params.id, function(err, foundBlogs) {
    if (!err) {
      con.query("Select * FROM User Where id=?", req.params.id, function(er, person) {
        if (!er) {
          res.render("personalBlogs", {
            user: person[0],
            blogs: foundBlogs,
            cats: cats
          });
        } else {
          console.log(er);
        }
      });
    } else {
      console.log(err);
    }
  });
});

app.get("/profile/:user", function(req, res) {
  con.query("Select * FROM User Where id=?", req.params.user, function(err, person) {
    if (!err) {
      con.query("SELECT * FROM Blog ORDER BY Likes DESC", function(er, blogs) {
        if (!er) {
          getUsers();
          res.render("profile", {
            user: person[0],
            blogs: blogs,
            Category: cats,
            users: users
          });
        } else {
          console.log(er);
        }
      });
    } else {
      console.log(err);
    }
  });
});
//
// app.post("/comment/:blog_id/:user_id", function(req, res){
//   con.query("INSERT INTO Comments (Id_Of_Blog, Id_Of_Commenter, Comment) VALUES (?, ?, ?)", [req.params.blog_id, req.params.user_id, req.body.comment], function(err, result){
//     if(!err){
//       con.query("SELECT Type_Of_Cousine FROM Category WHERE Id=?", req.params.blog_id, function(er, foundCategory){
//         if(!er){
//           res.redirect("/Category/"+foundCategory[0]+"/"+req.params.user_id);
//         } else {
//           console.log(er);
//         }
//       });
//     } else {
//       console.log(err);
//     }
//   });
// });

app.post("/comment1/:blog_id/:user_id", function(req, res) {
  con.query("INSERT INTO Comments (Id_Of_Blog, Id_Of_Commenter, Comment) VALUES (?, ?, ?)", [req.params.blog_id, req.params.user_id, req.body.comment], function(err, result) {
    if (!err) {
      con.query("SELECT Type_Of_Cousine FROM Category WHERE Id=?", req.params.blog_id, function(er, foundCategory) {
        if (!er) {
          res.redirect("/blog/" + req.params.blog_id + "/" + req.params.user_id);
        } else {
          console.log("1eer" + er);
        }
      });
    } else {
      console.log("2eer" + err);
    }
  });
});

app.get("/blog/:bid/:uid", function(req, res) {
  con.query("Select * FROM User Where Id=?", req.params.uid, function(err, person) {
    if (!err) {
      con.query("SELECT * FROM Comments WHERE Id_Of_Blog = ?", req.params.bid, function(ee, foundComments) {
        // console.log("Comments: "+foundComments[0].Comment);
        con.query("SELECT * FROM Blog WHERE Id=?", req.params.bid, function(er, blog) {

          con.query("SELECT * FROM Likes WHERE Id_Of_User=? AND Id_Of_Blog=?", [req.params.uid, req.params.bid], function(error, result) {
            // console.log("Result: "+result.length);
            getUsers();
            // console.log("Users: "+users);
            res.render("blogpg", {
              user: person[0],
              blog: blog[0],
              cats: cats,
              comments: foundComments,
              users: users,
              liked: result
            });
          });
        });
      });
    } else {
      console.log("this" + err);
    }
  });
});

app.get("/like/:uid/:bid", function(req, res) {
  con.query("UPDATE Blog SET Likes = Likes+1 WHERE Id = ?", req.params.bid, function(er, r) {
    if (!er) {
      con.query("INSERT INTO Likes(Id_Of_Blog, Id_Of_User) VALUES (?, ?)", [req.params.bid, req.params.uid], function(e, re) {
        if (!e) {
          res.redirect("/blog/" + req.params.bid + "/" + req.params.uid);
        } else {
          console.log(e);
        }
      });
    } else {
      console.log(er);
    }
  });
});

app.listen(3000, function() {
  console.log("Started listening on port 3000");
});
