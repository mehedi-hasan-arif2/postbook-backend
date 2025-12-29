const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');

// Render-server port
const port = process.env.PORT || 5000; 

const app = express();

// middlewares
app.use(cors({
    origin: ["https://postbook-web.vercel.app", "http://127.0.0.1:5502"], 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());

// Clever Cloud MySQL database connection
const db = mysql.createPool({
    host: "bwikb3gj9wva2xsnblei-mysql.services.clever-cloud.com",     
    user: "umqflj1ucaz6j5ul",                   
    password: "6IjEt8QePsp8NRfu25UD",                 
    database: "bwikb3gj9wva2xsnblei",               
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Cloud MySQL connection error:", err);
    } else {
        console.log("Connected to Clever Cloud MySQL successfully!");
        connection.release(); 
    }
});

  //getting user data from server

  // register route
  
app.post("/registerUser", (req, res) => {
  const { username, password, image } = req.body;

  const checkUserSql = "SELECT * FROM users WHERE userName = ?";
  db.query(checkUserSql, [username], (err, result) => {
    if (result.length > 0) {
      return res.json({ success: false, message: "Username already taken" });
    } else {
      const sql = "INSERT INTO users (userName, userPassword, userImage) VALUES (?, ?, ?)";
      db.query(sql, [username, password, image || 'default.png'], (err) => {
        if (err) return res.json({ success: false, message: "Database error" });
        return res.json({ success: true });
      });
    }
  });
});

  //post route
app.post("/getUserInfo", (req, res) => {  
  const { username, password } = req.body;

  const getUserInfoSql = `SELECT userId, userName, userImage FROM users WHERE userName=? AND userPassword=?`;

  db.query(getUserInfoSql, [username, password], (err, result) => {
    if (err) {
      console.log("Error fetching user info: ", err);
      return res.status(500).send([]);
    }
    res.send(result);
  });
});

app.get('/getAllPosts', (req, res) => {
  const sqlForAllPosts = `SELECT users.userName AS postedUserName, users.userImage AS postedUserImage, posts.postId, posts.postedUserId, posts.postedTime, posts.postText, posts.postImageUrl FROM posts INNER JOIN users ON posts.postedUserId=users.userId ORDER BY posts.postedTime DESC;`;

  let query = db.query(sqlForAllPosts, (err, result) => {
    if (err) {
      console.log("Error loading all posts from the database: ", err);
      throw err;
    }
    else{
      console.log(result);
      res.send(result);
    }
  })
});

//getting comments of a single post
app.get("/getAllComments/:postId", (req, res) => {
    let id = req.params.postId;

    let sqlForAllComments = `SELECT users.userName AS commentedUsername, users.userImage AS commentedUserImage,comments.commentId, comments.commentOfPostId, comments.commentedUserId, comments.commentText, comments.commentTime FROM comments INNER JOIN users ON comments.commentedUserId=users.userId 
    WHERE comments.commentOfPostId = ?`;

    let query = db.query(sqlForAllComments, [id], (err, result) => {
        if (err) {
            console.log("error fetching comments from the database ", err);
            throw err;
        } else {
            res.send(result);
        }
    });
});

//adding new comments to a post
app.post("/postComment" , (req, res) => {
    const { commentOfPostId, commentedUserId, commentText, commentTime } = req.body;
    if (!commentText || commentText.trim() === "") {
    return res.status(400).json({ message: "Comment cannot be empty" });
    }

//sql query
    let sqlForAddingNewComments = `INSERT INTO comments (commentId, commentOfPostId, commentedUserId, commentText, commentTime) VALUES (NULL, ?, ?, ?, ?);`;
    let query = db.query(sqlForAddingNewComments, [commentOfPostId, commentedUserId, commentText, commentTime], (err, result) => {
        if (err) {
            console.log("Error adding comment to the database: ", err);
        } else {
            res.send(result);
        }
 });
}); 

// adding new post
app.post('/addNewPost', (req, res) => {
    const { postedUserId, postedTime, postText, postImageUrl } = req.body;
    if (!postText) return res.status(400).json({ message: "Post cannot be empty" });
    let sql = "INSERT INTO posts (postedUserId, postedTime, postText, postImageUrl) VALUES (?, ?, ?, ?)";
    db.query(sql, [postedUserId, postedTime, postText, postImageUrl], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.status(200).json({ success: true, result });
    });
});

//Post Edit,Delete option
app.delete("/deletePost/:id/:userId", (req, res) => {
    const { id, userId } = req.params;

    const sql = "DELETE FROM posts WHERE postId = ? AND postedUserId = ?";
    db.query(sql, [id, userId], (err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

app.put("/editPost", (req, res) => {
    const { postId, postText, postImageUrl, userId } = req.body;

    const sql = `
        UPDATE posts 
        SET postText=?, postImageUrl=? 
        WHERE postId=? AND postedUserId=?
    `;

    db.query(sql, [postText, postImageUrl, postId, userId], (err, result) => {
        if (err) throw err;
        res.send(result);
    });
});

// delete comment route
app.delete("/deleteComment/:commentId/:userId/:postOwnerId", (req, res) => {
    const { commentId, userId, postOwnerId } = req.params;
    
    const sql = "DELETE FROM comments WHERE commentId = ? AND (commentedUserId = ? OR ? IN (SELECT postedUserId FROM posts WHERE postId = comments.commentOfPostId))";
    
    db.query(sql, [commentId, userId, userId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true, message: "Comment deleted" });
    });
});

// edit comment route
app.put("/editComment", (req, res) => {
    const { commentId, commentText, userId } = req.body;
    const sql = "UPDATE comments SET commentText = ? WHERE commentId = ? AND commentedUserId = ?";
    
    db.query(sql, [commentText, commentId, userId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true, message: "Comment updated" });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


app.put("/updateProfileImage", (req, res) => {
    const { userId, userImage } = req.body; 

    const sql = "UPDATE users SET userImage = ? WHERE userId = ?";

    db.query(sql, [userImage, userId], (err, result) => {
        if (err) {
            console.log("Error updating profile image: ", err);
            return res.json({ success: false, message: "Database error" });
        }
      
        res.json({ success: true, message: "Profile image updated successfully" });
    });
});

// Delete User Account Route 
app.delete("/deleteUser/:userId", (req, res) => {
    const userId = req.params.userId;

    const deleteComments = "DELETE FROM comments WHERE commentedUserId = ?";
    
    db.query(deleteComments, [userId], (err) => {
        if (err) return res.json({ success: false, message: "Error deleting comments" });

        const deletePosts = "DELETE FROM posts WHERE postedUserId = ?";
        db.query(deletePosts, [userId], (err) => {
            if (err) return res.json({ success: false, message: "Error deleting posts" });

            const deleteUser = "DELETE FROM users WHERE userId = ?";
            db.query(deleteUser, [userId], (err, result) => {
                if (err) return res.json({ success: false, message: "Error deleting user" });
                res.json({ success: true, message: "User and all related data deleted" });
            });
        });
    });
});