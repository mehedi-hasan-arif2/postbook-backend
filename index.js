const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// DB connection
const db = mysql.createPool({
  host: "bwikb3gj9wva2xsnblei-mysql.services.clever-cloud.com",
  user: "umqflj1ucaz6j5ul",
  password: "6IjEt8QePsp8NRfu25UD",
  database: "bwikb3gj9wva2xsnblei",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// test db
db.getConnection((err, conn) => {
  if (err) console.error("DB error:", err);
  else {
    console.log("DB connected");
    conn.release();
  }
});

// ---------- ROUTES ----------

// register
app.post("/registerUser", (req, res) => {
  const { username, password, image } = req.body;

  db.query(
    "SELECT * FROM users WHERE userName = ?",
    [username],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });

      if (result.length > 0) {
        return res.json({ success: false, message: "Username exists" });
      }

      db.query(
        "INSERT INTO users (userName, userPassword, userImage) VALUES (?, ?, ?)",
        [username, password, image || "default.png"],
        (err) => {
          if (err) return res.status(500).json({ success: false });
          res.json({ success: true });
        }
      );
    }
  );
});

// login
app.post("/getUserInfo", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT userId, userName, userImage FROM users WHERE userName=? AND userPassword=?",
    [username, password],
    (err, result) => {
      if (err) return res.status(500).json([]);
      res.json(result);
    }
  );
});

// get posts
app.get("/getAllPosts", (req, res) => {
  const sql = `
    SELECT users.userName AS postedUserName,
           users.userImage AS postedUserImage,
           posts.postId, posts.postedUserId,
           posts.postedTime, posts.postText, posts.postImageUrl
    FROM posts
    INNER JOIN users ON posts.postedUserId = users.userId
    ORDER BY posts.postedTime DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json([]);
    res.json(result);
  });
});

// get comments
app.get("/getAllComments/:postId", (req, res) => {
  db.query(
    `SELECT users.userName AS commentedUsername,
            users.userImage AS commentedUserImage,
            comments.commentId, comments.commentedUserId,
            comments.commentText, comments.commentTime
     FROM comments
     INNER JOIN users ON comments.commentedUserId = users.userId
     WHERE comments.commentOfPostId = ?`,
    [req.params.postId],
    (err, result) => {
      if (err) return res.status(500).json([]);
      res.json(result);
    }
  );
});

// add comment ✅
app.post("/postComment", (req, res) => {
  const { commentOfPostId, commentedUserId, commentText, commentTime } = req.body;

  if (!commentText)
    return res.status(400).json({ message: "Empty comment" });

  db.query(
    "INSERT INTO comments VALUES (NULL, ?, ?, ?, ?)",
    [commentOfPostId, commentedUserId, commentText, commentTime],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    }
  );
});

// add post ✅
app.post("/addNewPost", (req, res) => {
  const { postedUserId, postedTime, postText, postImageUrl } = req.body;

  if (!postText)
    return res.status(400).json({ message: "Empty post" });

  db.query(
    "INSERT INTO posts VALUES (NULL, ?, ?, ?, ?)",
    [postedUserId, postedTime, postText, postImageUrl],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    }
  );
});

// edit post
app.put("/editPost", (req, res) => {
  const { postId, postText, postImageUrl, userId } = req.body;

  db.query(
    "UPDATE posts SET postText=?, postImageUrl=? WHERE postId=? AND postedUserId=?",
    [postText, postImageUrl, postId, userId],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    }
  );
});

// delete post
app.delete("/deletePost/:id/:userId", (req, res) => {
  db.query(
    "DELETE FROM posts WHERE postId=? AND postedUserId=?",
    [req.params.id, req.params.userId],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    }
  );
});

// ---------------------------------

app.listen(port, () => {
  console.log("Server running on port", port);
});
