const express = require("express");
const app = express();
const mysql = require("mysql");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const path = require("path");
const upload = require("./multer.js");
const { cloudinary } = require("./cloudinary.js");
const fs = require("fs");
const md5 = require("md5");
//////////////////////////////////////////////
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const cats = [
  "Indian",
  "Chinese",
  "Italian",
  "Non-Veg",
  "Global",
  "BreakFast",
  "Japanse",
  "Mexican",
  "Street Food",
];
var users = new Map();

function getUsers() {
  con.query("SELECT * FROM User", function (err, uss) {
    uss.forEach((user) => {
      var name = user.First_Name + " " + user.Last_Name;
      users.set(user.Id, `${name}`);
    });
  });
}

///////////////////////////////////// SQL CONNECTION ////////////////////////////////////////////

// var con = mysql.createConnection({
//   host: "blgsoenyjh4cujzsu5kq-mysql.services.clever-cloud.com",
//   user: "u9tce37ovxwxe4ce",
//   password: "c5jCgRV9AJnA5f2I1bV4",
//   database: "blgsoenyjh4cujzsu5kq",
//   multipleQueries: true,
// });
// con.connect(function (err) {
//   if (!err) {
//     console.log("Connected to mySql Server");
//   } else {
//     console.log(err);
//   }
// });

/////////////////////////////////// TRYING TO HANDLE DISCONNECTIONS ///////////////////////////////////
var db_config = {
  host: "blgsoenyjh4cujzsu5kq-mysql.services.clever-cloud.com",
  user: "u9tce37ovxwxe4ce",
  password: "c5jCgRV9AJnA5f2I1bV4",
  database: "blgsoenyjh4cujzsu5kq",
  multipleQueries: true,
};

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    } else {
      console.log("Successfully Connected to the MySQL Server!!");
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();

// ///////////////////////////////// USER TABLE ///////////////////////////////////////////////////////////////////////
app.get("/createTableForUser", function (req, res) {
  con.query(
    "CREATE TABLE User (Id INT NOT NULL AUTO_INCREMENT, First_Name VARCHAR(255) NOT NULL, Last_Name VARCHAR(255) NOT NULL, Email VARCHAR(255) NOT NULL UNIQUE, Contact_No VARCHAR(255) NOT NULL, Password VARCHAR(255) NOT NULL CHECK(LENGTH(Password)>=6), PRIMARY KEY(Id))",
    function (err, result) {
      if (!err) {
        res.send("<h1>Table Created</h1>");
        console.log("Table Created!!");
      } else {
        console.log(err);
      }
    }
  );
});
///////////////////////////////// CATEGORY TABLE ///////////////////////////////////////////////////////////////////
app.get("/createTableForCategory", function (req, res) {
  con.query(
    "CREATE TABLE Category (Id INT NOT NULL AUTO_INCREMENT, Type_Of_Cousine VARCHAR(255) NOT NULL, PRIMARY KEY(Id))",
    function (err, result) {
      if (!err) {
        res.send("<h1>Table Created</h1>");
        console.log("Table Created!!");
      } else {
        console.log(err);
      }
    }
  );
});
///////////////////////////////// BLOG TABLE ///////////////////////////////////////////////////////////////////////
app.get("/createTableForBlog", function (req, res) {
  con.query(
    "CREATE TABLE Blog (Id INT NOT NULL AUTO_INCREMENT, User_Id INT NOT NULL, Category_Id INT NOT NULL, Title VARCHAR(255) NOT NULL, Content TEXT NOT NULL, Image VARCHAR(255), Date_Of_Blog DATE, Likes INT, PRIMARY KEY(Id), FOREIGN KEY (User_Id) REFERENCES User(Id), FOREIGN KEY (Category_Id) REFERENCES Category(Id))",
    function (err, result) {
      if (!err) {
        res.send("<h1>Table Created</h1>");
        console.log("Table Created!!");
      } else {
        console.log(err);
      }
    }
  );
});
///////////////////////////////// COMMENTS TABLE /////////////////////////////////////////////////////////////////////
app.get("/createTableForComments", function (req, res) {
  con.query(
    "CREATE TABLE Comments (Id INT NOT NULL AUTO_INCREMENT, Id_Of_Blog INT NOT NULL, Id_Of_Commenter INT NOT NULL, Comment VARCHAR(255) NOT NULL, PRIMARY KEY(Id), FOREIGN KEY (Id_Of_Blog) REFERENCES Blog(Id), FOREIGN KEY (Id_Of_Commenter) REFERENCES User(Id))",
    function (err, result) {
      if (!err) {
        res.send("<h1>Table Created</h1>");
        console.log("Table Created!!");
      } else {
        console.log(err);
      }
    }
  );
});
///////////////////////////////// COMMENTS TABLE /////////////////////////////////////////////////////////////////////
app.get("/createTableForLikes", function (req, res) {
  con.query(
    "CREATE TABLE Likes (Id INT NOT NULL AUTO_INCREMENT, Id_Of_Blog INT NOT NULL, Id_Of_User INT NOT NULL, PRIMARY KEY(Id), FOREIGN KEY (Id_Of_Blog) REFERENCES Blog(Id), FOREIGN KEY (Id_Of_User) REFERENCES User(Id))",
    function (err, result) {
      if (!err) {
        res.send("<h1>Table Created</h1>");
        console.log("Table Created!!");
      } else {
        console.log(err);
      }
    }
  );
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/", function (req, res) {
  getUsers();
  res.render("home");
});

app.get("/login", function (req, res) {
  getUsers();
  res.render("login", {
    incorrectEmail: false,
    incorrectPassword: false,
  });
});

app.get("/profile", function (req, res) {
  res.render("profile");
});

app.post("/login", function (req, res) {
  con.query(
    "SELECT * FROM User WHERE Email=?",
    req.body.email,
    function (err, result) {
      if (!err) {
        if (result.length > 0) {
          if (result[0].Password === md5(req.body.password)) {
            con.query(
              "SELECT * FROM Blog ORDER BY Likes DESC",
              function (er, blogs) {
                if (!er) {
                  getUsers();
                  res.render("profile", {
                    user: result[0],
                    blogs: blogs,
                    Category: cats,
                    users: users,
                  });
                } else {
                  console.log(er);
                }
              }
            );
          } else {
            res.render("login", {
              incorrectPassword: true,
              incorrectEmail: false,
            });
          }
        } else {
          res.render("login", {
            incorrectEmail: true,
            incorrectPassword: false,
          });
        }
      } else {
        console.log(err);
      }
    }
  );
});

app.get("/register", function (req, res) {
  res.render("register", {
    ps: false,
    em: false,
  });
});

app.post("/register", function (req, res) {
  const sql =
    "INSERT INTO User (First_Name, Last_Name, Email, Contact_No, Password) VALUES (?,?,?,?,?)";
  const values = [
    req.body.firstName,
    req.body.lastName,
    req.body.email,
    req.body.number,
    md5(req.body.password),
  ];
  con.query(sql, values, function (err, result) {
    if (!err) {
      res.redirect("/login");
    } else {
      const emailError = err.errno === 1062 ? true : false;
      const passwordError = err.errno === 3819 ? true : false;
      res.render("register", {
        em: emailError,
        ps: !emailError && passwordError,
      });
    }
  });
});

app.get("/Category/:c/:id", function (req, res) {
  con.query(
    "SELECT * FROM Blog WHERE Category_Id=(SELECT Id FROM Category WHERE Type_Of_Cousine=?) ORDER BY Date_Of_Blog DESC",
    req.params.c,
    function (err, foundBlogs) {
      if (!err) {
        con.query(
          "Select * FROM User Where id=?",
          req.params.id,
          function (er, person) {
            if (!er) {
              getUsers();
              res.render("Category", {
                user: person[0],
                blogs: foundBlogs,
                Category: req.params.c,
                users: users,
              });
            } else {
              console.log(er);
            }
          }
        );
      } else {
        console.log(err);
      }
    }
  );
});

app.get("/profilepg/:user", function (req, res) {
  con.query(
    "Select * FROM User Where id=?",
    req.params.user,
    function (err, person) {
      if (!err) {
        getUsers();
        con.query(
          "SELECT * FROM Likes, Blog where Likes.Id_Of_Blog=Blog.Id and Likes.Id_Of_User=?",
          req.params.user,
          function (error, blogs) {
            res.render("profilepg", {
              user: person[0],
              blogs: blogs,
              Category: cats,
              users: users,
            });
          }
        );
      } else {
        console.log(err);
      }
    }
  );
});

app.get("/postblog/:id", function (req, res) {
  con.query(
    "Select * FROM User Where id=?",
    req.params.id,
    function (err, person) {
      if (!err) {
        res.render("postblog", {
          user: person[0],
        });
      } else {
        console.log(err);
      }
    }
  );
});

app.post("/postblog", upload.single("image"), async (req, res, next) => {
  const result = await cloudinary.uploader.upload(req.file.path);
  const post_details = {
    image: result.public_id,
  };
  con.query(
    "SELECT Id FROM Category WHERE Type_Of_Cousine=?",
    req.body.category,
    function (err, id) {
      if (!err) {
        // console.log(req.file);
        // console.log(id);
        // console.log(req.body);
        let dt = new Date();
        const sql =
          "INSERT INTO Blog (User_Id, Category_Id, Title, Content, Image, Date_Of_Blog, Likes) VALUES (?,?,?,?,?,?,?)";
        const values = [
          req.body.Id,
          id[0].Id,
          req.body.title,
          req.body.content,
          result.url,
          dt,
          0,
        ];
        con.query(sql, values, function (er, result) {
          if (!er) {
            res.redirect("/profilepg/" + req.body.Id);
          } else {
            res.send(er);
            console.log(er);
          }
        });
      } else {
        res.send(err);
        console.log(err);
      }
    }
  );
});

app.get("/blogs/:id", function (req, res) {
  con.query(
    "SELECT * FROM Blog WHERE User_Id=? ORDER BY Date_Of_Blog DESC",
    req.params.id,
    function (err, foundBlogs) {
      if (!err) {
        con.query(
          "Select * FROM User Where id=?",
          req.params.id,
          function (er, person) {
            if (!er) {
              res.render("personalBlogs", {
                user: person[0],
                blogs: foundBlogs,
                cats: cats,
              });
            } else {
              console.log(er);
            }
          }
        );
      } else {
        console.log(err);
      }
    }
  );
});

app.get("/profile/:user", function (req, res) {
  con.query(
    "Select * FROM User Where id=?",
    req.params.user,
    function (err, person) {
      if (!err) {
        con.query(
          "SELECT * FROM Blog ORDER BY Likes DESC",
          function (er, blogs) {
            if (!er) {
              getUsers();
              res.render("profile", {
                user: person[0],
                blogs: blogs,
                Category: cats,
                users: users,
              });
            } else {
              console.log(er);
            }
          }
        );
      } else {
        console.log(err);
      }
    }
  );
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

app.post("/comment1/:blog_id/:user_id", function (req, res) {
  con.query(
    "INSERT INTO Comments (Id_Of_Blog, Id_Of_Commenter, Comment) VALUES (?, ?, ?)",
    [req.params.blog_id, req.params.user_id, req.body.comment],
    function (err, result) {
      if (!err) {
        con.query(
          "SELECT Type_Of_Cousine FROM Category WHERE Id=?",
          req.params.blog_id,
          function (er, foundCategory) {
            if (!er) {
              res.redirect(
                "/blog/" + req.params.blog_id + "/" + req.params.user_id
              );
            } else {
              console.log("1eer" + er);
            }
          }
        );
      } else {
        console.log("2eer" + err);
      }
    }
  );
});

// app.get("/blog/:bid/:uid", function(req, res) {
//   con.query("Select * FROM User Where Id=?", req.params.uid, function(err, person) {
//     if (!err) {
//       con.query("SELECT * FROM Comments WHERE Id_Of_Blog = ?", req.params.bid, function(ee, foundComments) {
//         // console.log(foundComments);
//         con.query("SELECT * FROM Blog WHERE Id=?", req.params.bid, function(er, blog) {
//
//           con.query("SELECT * FROM Likes WHERE Id_Of_User=? AND Id_Of_Blog=?", [req.params.uid, req.params.bid], function(error, result) {
//             // console.log(result);
//             getUsers();
//             // console.log(users);
//             res.render("blogpg", {
//               user: person[0],
//               blog: blog[0],
//               cats: cats,
//               comments: foundComments,
//               users: users,
//               liked: result
//             });
//           });
//         });
//       });
//     } else {
//       console.log("this" + err);
//     }
//   });
// });

// app.get("/blog/:bid/:uid", function(req, res) {
//   con.query("Select * FROM User Where Id=?", req.params.uid, function(err, person) {
//     if (!err) {
//       con.query("SELECT Blog.Id as Blog_Id, Blog.User_Id, Blog.Content, Blog.Title, Blog.Image, Blog.Date_Of_Blog, Blog.Likes, Blog.Category_Id, Comments.Id_Of_Commenter, Comments.Comment, Likes From Blog, Comments WHERE Blog.Id=Comments.Id_Of_Blog", function(errrr, result1){
//         if(!errrr){
//         con.query("SELECT * FROM Likes WHERE Id_Of_User=? AND Id_Of_Blog=?", [req.params.uid, req.params.bid], function(error, result) {
//           // console.log(result);
//           if(!error){
//           getUsers();
//           console.log(result1);
//           // console.log(users);
//           res.render("blogpg", {
//             user: person[0],
//             blog: result1,
//             cats: cats,
//             users: users,
//             liked: result
//           });
//         } else {                                       // errorrr
//           console.log(error);
//         }
//         });
//       } else {
//         console.log(errrr);
//       }
//       });
//     } else {
//       console.log("this" + err);
//     }
//   });
// });

app.get("/blog/:bid/:uid", function (req, res) {
  con.query(
    "Select * FROM User Where Id=?",
    req.params.uid,
    function (err, person) {
      if (!err) {
        con.query(
          "SELECT * FROM Comments WHERE Id_Of_Blog = ?",
          req.params.bid,
          function (ee, foundComments) {
            // console.log("Comments: "+foundComments[0].Comment);
            con.query(
              "SELECT * FROM Blog WHERE Id=?",
              req.params.bid,
              function (er, blog) {
                con.query(
                  "SELECT * FROM Likes WHERE Id_Of_User=? AND Id_Of_Blog=?",
                  [req.params.uid, req.params.bid],
                  function (error, result) {
                    // console.log("Result: "+result.length);
                    getUsers();
                    // console.log("Users: "+users);
                    res.render("blogpg", {
                      user: person[0],
                      blog: blog[0],
                      cats: cats,
                      comments: foundComments,
                      users: users,
                      liked: result,
                      edit: false,
                    });
                  }
                );
              }
            );
          }
        );
      } else {
        console.log("this" + err);
      }
    }
  );
});

app.get("/like/:uid/:bid", function (req, res) {
  con.query(
    "UPDATE Blog SET Likes = Likes+1 WHERE Id = ?",
    req.params.bid,
    function (er, r) {
      if (!er) {
        con.query(
          "INSERT INTO Likes(Id_Of_Blog, Id_Of_User) VALUES (?, ?)",
          [req.params.bid, req.params.uid],
          function (e, re) {
            if (!e) {
              res.redirect("/blog/" + req.params.bid + "/" + req.params.uid);
            } else {
              console.log(e);
            }
          }
        );
      } else {
        console.log(er);
      }
    }
  );
});

app.get("/delete/:bid/:uid", function (req, res) {
  con.query(
    "DELETE From Blog WHERE Id=?",
    req.params.bid,
    function (err, result) {
      if (!err) {
        res.redirect("/blogs/" + req.params.uid);
      } else {
        console.log(err);
      }
    }
  );
});

app.get("/edit/:bid/:uid", function (req, res) {
  con.query(
    "SELECT * FROM Blog WHERE Id=?",
    req.params.bid,
    function (err, result) {
      if (!err) {
        res.render("edit", {
          user_id: req.params.uid,
          blog: result[0],
        });
      } else {
        console.log(err);
      }
    }
  );
});

app.post("/editblog", function (req, res) {
  con.query(
    "SELECT Id FROM Category WHERE Type_Of_Cousine=?",
    req.body.category,
    function (err, id) {
      if (!err) {
        con.query(
          "UPDATE Blog SET Category_Id=?, Title=?, Content=? WHERE Id=?",
          [id[0].Id, req.body.title, req.body.content, req.body.blog_id],
          function (error, result) {
            if (!error) {
              res.redirect(
                "/blogedited/" + req.body.blog_id + "/" + req.body.Id
              );
            } else {
              console.log(error);
            }
          }
        );
      } else {
        console.log(err);
      }
    }
  );
});

app.get("/blogedited/:bid/:uid", function (req, res) {
  con.query(
    "Select * FROM User Where Id=?",
    req.params.uid,
    function (err, person) {
      if (!err) {
        con.query(
          "SELECT * FROM Comments WHERE Id_Of_Blog = ?",
          req.params.bid,
          function (ee, foundComments) {
            // console.log("Comments: "+foundComments[0].Comment);
            con.query(
              "SELECT * FROM Blog WHERE Id=?",
              req.params.bid,
              function (er, blog) {
                con.query(
                  "SELECT * FROM Likes WHERE Id_Of_User=? AND Id_Of_Blog=?",
                  [req.params.uid, req.params.bid],
                  function (error, result) {
                    // console.log("Result: "+result.length);
                    getUsers();
                    // console.log("Users: "+users);
                    res.render("blogpg", {
                      user: person[0],
                      blog: blog[0],
                      cats: cats,
                      comments: foundComments,
                      users: users,
                      liked: result,
                      edit: true,
                    });
                  }
                );
              }
            );
          }
        );
      } else {
        console.log("this" + err);
      }
    }
  );
});

app.listen(PORT, function () {
  console.log("Started listening on port 3000");
});
