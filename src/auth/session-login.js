require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const Stripe = require("stripe");
const helmet = require("helmet");
const crypto = require("crypto");

const app = express();

// 🔥 webhook precisa raw
app.use("/stripe-webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// 🔐 headers extras
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// 🔐 CORS
app.use(cors({
  origin: "plataforma-production-ea85.up.railway.app", // depois você troca
  credentials: true
}));

// 🔐 RATE LIMIT GLOBAL
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// 🔐 RATE LIMIT LOGIN (anti brute force)
app.use("/session-login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
}));

// 🔥 Firebase
admin.initializeApp({
  credential: admin.credential.cert(
    require("./PLATAFORMA/serviceAccountKey.json")
  )
});

const db = admin.firestore();

// 🔥 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🔐 ambiente
const isProd = process.env.NODE_ENV === "production";

// 🔐 ADMIN EMAILS
const ADMIN_EMAILS = ["ipgbtech@system.com"]
  .map(e => e.toLowerCase().trim());

// 🔒 CATÁLOGO FIXO
const CURSOS = {
  react: { nome: "React", preco: 5000 },
  node: { nome: "Node", preco: 7000 }
};

// =============================
// 🔐 AUTH MIDDLEWARE
// =============================
function authMiddleware(req, res, next) {
  const token = req.cookies.accessToken;

  if (!token) return res.status(401).send("Sem token");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).send("Token inválido");
  }
}

// =============================
// 🛡️ CSRF
// =============================
function csrfMiddleware(req, res, next) {
  const token = req.headers["x-csrf-token"];
  const cookie = req.cookies.csrfToken;

  if (!token || token !== cookie) {
    return res.status(403).send("CSRF inválido");
  }

  next();
}

// =============================
// 🔑 LOGIN
// =============================
app.post("/session-login", async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    const uid = decoded.uid;
    const email = (decoded.email || "").toLowerCase().trim();

    const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";

    await db.collection("users").doc(uid).set({
      email,
      role,
      cursos: [],
      updatedAt: new Date()
    }, { merge: true });

    const accessToken = jwt.sign(
      { uid, role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "seu-app",
        audience: "seu-app-users"
      }
    );

    // 🔐 CSRF forte
    const csrfToken = crypto.randomBytes(32).toString("hex");

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "Strict" : "Lax"
    });

    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "Strict" : "Lax"
    });

    res.json({ role, csrfToken });

  } catch (err) {
    console.error(err);
    res.status(401).send("Erro login");
  }
});

// =============================
// 👤 ME
// =============================
app.get("/me", authMiddleware, async (req, res) => {
  const doc = await db.collection("users").doc(req.user.uid).get();
  res.json(doc.data());
});

// =============================
// 💳 CRIAR PAGAMENTO
// =============================
app.post("/create-payment", authMiddleware, csrfMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.body;

    // 🔐 validação forte
    if (typeof cursoId !== "string" || !CURSOS[cursoId]) {
      return res.status(400).send("Curso inválido");
    }

    const curso = CURSOS[cursoId];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: { name: curso.nome },
          unit_amount: curso.preco
        },
        quantity: 1
      }],
      success_url: process.env.CLIENT_URL + "/perfil",
      cancel_url: process.env.CLIENT_URL + "/pagamento",
      metadata: {
        uid: req.user.uid,
        curso: curso.nome
      }
    });

    await db.collection("payments").add({
      uid: req.user.uid,
      curso: curso.nome,
      preco: curso.preco,
      status: "pendente",
      stripeSessionId: session.id,
      createdAt: new Date()
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("ERRO PAGAMENTO:", err);
    res.status(500).send("Erro pagamento");
  }
});

// =============================
// 🔔 WEBHOOK STRIPE
// =============================
app.post("/stripe-webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return res.status(400).send("Webhook inválido");
  }

  // 🔐 anti replay
  const eventId = event.id;
  const exists = await db.collection("stripe_events").doc(eventId).get();

  if (exists.exists) {
    return res.json({ received: true });
  }

  await db.collection("stripe_events").doc(eventId).set({
    createdAt: new Date()
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const snapshot = await db
      .collection("payments")
      .where("stripeSessionId", "==", session.id)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.status === "pago") continue;

      await doc.ref.update({ status: "pago" });

      await db.collection("users").doc(data.uid).set({
        cursos: admin.firestore.FieldValue.arrayUnion(data.curso)
      }, { merge: true });

      await db.collection("historico").add({
        uid: data.uid,
        curso: data.curso,
        preco: data.preco,
        createdAt: new Date()
      });
    }
  }

  res.json({ received: true });
});

// =============================
// 👑 ADMIN
// =============================
app.get("/payments", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Apenas admin");
  }

  const snapshot = await db.collection("payments").get();

  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(data);
});

app.put("/payments/:id", authMiddleware, csrfMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Apenas admin");
  }

  const { status } = req.body;

  if (!["pendente", "analise", "pago"].includes(status)) {
    return res.status(400).send("Status inválido");
  }

  await db.collection("payments").doc(req.params.id).update({ status });

  res.send("Atualizado");
});

// =============================
app.post("/logout", authMiddleware, csrfMiddleware, (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");
  res.send("Logout");
});

// =============================
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor seguro rodando");
});