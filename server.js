const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { db, init } = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_NAME = "water_fault_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

if (!JWT_SECRET) {
  console.error(
    "Missing JWT_SECRET environment variable. Set JWT_SECRET before starting the app.",
  );
  if (NODE_ENV === "production") {
    process.exit(1);
  }
}

app.use(express.json());
app.use(cookieParser());
app.use(helmet());

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function authMiddleware(req, res, next) {
  const token = req.cookies[TOKEN_NAME];
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid authentication token" });
  }
}

function pageAuthMiddleware(req, res, next) {
  const token = req.cookies[TOKEN_NAME];
  if (!token) {
    return res.redirect("/Auth.html");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.redirect("/Auth.html");
  }
}

app.get("/", pageAuthMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  const query =
    "INSERT INTO users (name, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)";
  db.run(
    query,
    [name.trim(), email.trim().toLowerCase(), passwordHash, createdAt],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res
            .status(409)
            .json({ error: "Email is already registered." });
        }
        return res.status(500).json({ error: "Unable to create account." });
      }

      const token = createToken({ id: this.lastID, name, email });
      res.cookie(TOKEN_NAME, token, COOKIE_OPTIONS);
      res.json({ id: this.lastID, name, email });
    },
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const query =
    "SELECT id, name, email, passwordHash FROM users WHERE email = ?";
  db.get(query, [email.trim().toLowerCase()], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Unable to login." });
    }
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = createToken(user);
    res.cookie(TOKEN_NAME, token, COOKIE_OPTIONS);
    res.json({ id: user.id, name: user.name, email: user.email });
  });
});

app.post("/api/logout", authMiddleware, (req, res) => {
  res.clearCookie(TOKEN_NAME, COOKIE_OPTIONS);
  res.json({ success: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email });
});

app.get("/api/reports", authMiddleware, (req, res) => {
  const query = `SELECT id, location, issueType, severity, description, status, createdAt, updatedAt
                 FROM reports
                 WHERE userId = ?
                 ORDER BY createdAt DESC`;
  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Unable to load reports." });
    }
    res.json(rows);
  });
});

app.post("/api/reports", authMiddleware, (req, res) => {
  const { location, issueType, severity, description } = req.body;
  if (!location || !issueType || !severity || !description) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;
  const status = "Open";
  const query = `INSERT INTO reports (userId, location, issueType, severity, description, status, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    query,
    [
      req.user.id,
      location.trim(),
      issueType,
      severity,
      description.trim(),
      status,
      createdAt,
      updatedAt,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Unable to save report." });
      }
      res.status(201).json({
        id: this.lastID,
        userId: req.user.id,
        location,
        issueType,
        severity,
        description,
        status,
        createdAt,
        updatedAt,
      });
    },
  );
});

app.patch("/api/reports/:id/status", authMiddleware, (req, res) => {
  const { status } = req.body;
  const reportId = Number(req.params.id);
  if (!["Open", "In Progress", "Resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const updateAt = new Date().toISOString();
  const query =
    "UPDATE reports SET status = ?, updatedAt = ? WHERE id = ? AND userId = ?";
  db.run(query, [status, updateAt, reportId, req.user.id], function (err) {
    if (err) {
      return res.status(500).json({ error: "Unable to update report status." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Report not found." });
    }
    res.json({ id: reportId, status, updatedAt });
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

init();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
