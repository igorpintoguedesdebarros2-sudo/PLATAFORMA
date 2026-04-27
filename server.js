import "dotenv/config";
import express from "express";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import cors from "cors";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

process.on("exit", (code) => {
  console.log("Process exit:", code);
});

process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err);
});

// 🔥 importa a key
function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
  console.error("Firebase ENV incompleto");
} else {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n")
    }),
  });
}

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  .replace(/\\n/g, "\n")
  .replace(/\r/g, "")
  .trim(),
  };
}

console.log("CHECK ENV:", {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "MISSING",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "MISSING",
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? "OK" : "MISSING",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "OK" : "MISSING",
  JWT_SECRET: process.env.JWT_SECRET ? "OK" : "MISSING",
  CLIENT_URL: process.env.CLIENT_URL || "MISSING"
});

const serviceAccount = getFirebaseConfig();

console.log("🔥 FIREBASE DEBUG:", {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  keyPreview: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30)
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.app(); 
}

const db = admin.firestore();

const app = express();

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.originalUrl === "/stripe-webhook"
}));

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🔥 webhook precisa raw
app.use("/stripe-webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(cookieParser());

app.use(cors({
origin: process.env.CLIENT_URL,
methods: ["GET", "POST", "PUT"],
credentials: true
}));

// 🔐 CONFIG
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definido");
}

// =============================
// 🔐 MIDDLEWARE
// =============================
function authMiddleware(req, res, next) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Sem token" });
  }

  try {
   const decoded = jwt.verify(token, JWT_SECRET, {
  issuer: "api",
  audience: "user"
}); 

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20
});

app.use("/session-login", loginLimiter);

// =============================
// 🔑 LOGIN
// =============================
app.post("/session-login", async (req, res) => {

  try {
    const idToken = req.headers.authorization?.replace("Bearer ", "");
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
  JWT_SECRET,
  { expiresIn: "1h", issuer: "api", audience: "user" }
);

 res.cookie("accessToken", accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: "None"
});

    res.json({ role });

  } catch (err) {
    res.status(401).json({ error: "Erro login" });
  }
});

// =============================
// 👤 ME
// =============================
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const userData = userDoc.data();

    // HISTÓRICO (sem quebrar app)
    let historico = [];
    try {
      const histSnapshot = await db
        .collection("historico")
        .where("userId", "==", req.user.uid)
        .get();

      historico = histSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("Erro historico:", err.message);
    }

    // PAGAMENTOS
    let pedidos = [];
    try {
      const pagSnapshot = await db
        .collection("payments")
        .where("userId", "==", req.user.uid)
        .get();

      pedidos = pagSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("Erro pagamentos:", err.message);
    }

    res.json({
      uid: req.user.uid,
      ...userData,
      historico,
      pedidos
    });

  } catch (err) {
    console.error("❌ ERRO /me REAL:", err);
    res.status(500).json({ error: err.message });
  }
});
// =============================
// 👑 USERS
// =============================
app.get("/users", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const usersSnap = await db.collection("users").get();

  const users = [];

  for (const doc of usersSnap.docs) {
    const userData = doc.data();

    // 🔹 buscar pagamentos do usuário
    const paySnap = await db
      .collection("payments")
      .where("userId", "==", doc.id)
      .get();

    let pedidos = paySnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // 🔹 remover duplicados
    pedidos = Array.from(
      new Map(
        pedidos.map(p => [`${p.curso}`, p])
      ).values()
    );

    users.push({
      id: doc.id,
      ...userData,
      pedidos
    });
  }

  res.json(users);
});
// =============================
// 🧾 CRIAR PEDIDO
// =============================
app.post("/criar-pedido", authMiddleware, async (req, res) => {
  try {

    const { curso } = req.body;

   if (!curso || typeof curso !== "string" || curso.trim().length < 3) {
  return res.status(400).json({ error: "Curso inválido" });
}

    const docId = `${req.user.uid}_${curso}`;
const ref = db.collection("payments").doc(docId);

const existing = await ref.get();

if (existing.exists) {
  const data = existing.data();

  if (["finalizado", "pago", "analise"].includes(data.status)) {
    return res.status(400).json({
      error: "Curso já adquirido ou em andamento"
    });
  }

  return res.status(400).json({
    error: "Pedido já existe para este curso"
  });
}

await ref.set({
  userId: req.user.uid,
  curso,
  preco: null,
  status: "pendente",
  linkCurso: null,
  createdAt: new Date()
});

res.json({ id: docId });

  } catch {
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
});

// =============================
// 👑 ADMIN DEFINE PREÇO + LINK
// =============================
app.put("/definir-preco/:id", authMiddleware, async (req, res) => {
  try {
    // 🔒 somente admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Apenas admin" });
    }

    let { preco, linkCurso } = req.body;

    // 🔥 normaliza preço
    preco = Number(preco);

    // ❌ validação forte (Stripe-safe)
   if (!preco || isNaN(preco) || preco < 0.5) {
  return res.status(400).json({
    error: "Preço inválido (mínimo R$ 0,50)"
  });
}

    // 🔥 força 2 casas decimais (evita erro de centavos)
    preco = Math.round(preco * 100) / 100;

    // 🔥 valida link (opcional)
    if (linkCurso && typeof linkCurso !== "string") {
      return res.status(400).json({
        error: "Link do curso inválido"
      });
    }

    const ref = db.collection("payments").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const data = doc.data();

    // ❌ bloqueia estados finais
    if (["pago", "finalizado"].includes(data.status)) {
      return res.status(400).json({
        error: "Não é possível alterar este pedido"
      });
    }

    // 🔥 evita reprocessar se já estiver correto
    if (data.preco === preco && data.status === "analise") {
      return res.json({ message: "Preço já definido" });
    }

    // ✅ atualização segura
    await ref.update({
      preco,
      linkCurso: linkCurso || null,
      status: "analise",
      updatedAt: new Date()
    });

    console.log("✅ PREÇO DEFINIDO:", {
      id: req.params.id,
      preco,
      linkCurso
    });

    res.json({ message: "Preço definido com sucesso" });

  } catch (err) {
    console.error("❌ ERRO definir-preco:", err);
    res.status(500).json({ error: "Erro ao definir preço" });
  }
});
// =============================
// 💳 STRIPE
// =============================
app.post("/create-checkout/:id", authMiddleware, async (req, res) => {
  try {
    const ref = db.collection("payments").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const data = doc.data();

if (data.status === "pago") {
  return res.status(400).json({
    error: "Pedido já pago"
  });
}

    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // 🔥 validação forte
    if (!data.preco || isNaN(data.preco)) {
      return res.status(400).json({ error: "Preço inválido" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe não configurado" });
    }

    if (!process.env.CLIENT_URL) {
      return res.status(500).json({ error: "CLIENT_URL não definido" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { name: data.curso },
            unit_amount: Math.round(data.preco * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.CLIENT_URL}/perfil`,
      cancel_url: `${process.env.CLIENT_URL}/perfil`,
      metadata: { paymentId: req.params.id }
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ ERRO REAL STRIPE:", err); // 🔥 agora você vê o erro de verdade
    res.status(500).json({ error: "Erro Stripe", detalhe: err.message });
  }
});

// =============================
// 🔔 WEBHOOK
// =============================
app.post("/stripe-webhook", async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).send("Sem assinatura do Stripe");
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    ); 

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata.paymentId;

      const ref = db.collection("payments").doc(paymentId);
      const doc = await ref.get();

      if (doc.exists) {
        const data = doc.data();

        if (data.status === "pago") {
          return res.json({ received: true });
        }

      if (session.amount_total !== data.preco * 100) {
  return res.json({ received: true });
}

await ref.update({ status: "pago" });

        await db.collection("users").doc(data.userId).set({
          cursos: admin.firestore.FieldValue.arrayUnion(data.curso)
        }, { merge: true });
      }
    }

    res.json({ received: true });

  } catch (err) {
    console.error("❌ ERRO webhook:", err.message);
    res.status(400).send("Erro webhook");
  }
});
// =============================
// 📚 ACESSAR CURSO
// =============================
app.get("/curso/:id", authMiddleware, async (req, res) => {
  const doc = await db.collection("payments").doc(req.params.id).get();

  if (!doc.exists) return res.status(404).json({ error: "Curso não encontrado" });

  const data = doc.data();

  if (data.userId !== req.user.uid)
    return res.status(403).json({ error: "Acesso negado" });

  if (data.status !== "pago")
    return res.status(403).json({ error: "Curso não liberado ainda" });

  // Retorna o link do curso fixo
  let linkCurso;
  switch(data.curso) {
    case "React": linkCurso = "/cursos/react/index.html"; break;
    case "Node": linkCurso = "/cursos/node/index.html"; break;
    default: return res.status(400).json({ error: "Link não definido" });
  }

  res.json({ curso: data.curso, link: linkCurso });
});

// =============================
// 🧾 FINALIZAR CURSO
// =============================

// 🧾 FINALIZAR CURSO
app.post("/finalizar-curso/:id", authMiddleware, async (req, res) => {
  try {
    const ref = db.collection("payments").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const data = doc.data();

    // 🔒 segurança
    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // 🔥 já finalizado? evita duplicação
    if (data.status === "finalizado") {
      return res.json({ message: "Já finalizado" });
    }

    // 🔥 só pode finalizar se estiver pago
    if (data.status !== "pago") {
      return res.status(400).json({ error: "Curso ainda não pago" });
    }

    // 🧾 salva no histórico
    const docId = `${data.userId}_${data.curso}`;

    await db.collection("historico").doc(docId).set({
      userId: data.userId,
      curso: data.curso,
      preco: data.preco,
      createdAt: new Date()
    });

    // ✅ marca como finalizado
    await ref.update({
      status: "finalizado"
    });

    res.json({ message: "Curso finalizado" });

  } catch (err) {
    console.error("❌ ERRO finalizar curso:", err);
    res.status(500).json({ error: "Erro ao finalizar curso" });
  }
});
// =============================
// 👑 TODOS OS PAGAMENTOS (ADMIN)
// =============================
app.get("/payments", authMiddleware, async (req, res) => {
  try {
    // 🔒 só admin pode acessar
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const snapshot = await db.collection("payments").get();

    let data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ❗ remove finalizados (não aparecem no painel)
    data = data.filter(p => p.status !== "finalizado");

    // ❗ remove duplicados (user + curso)
    const unicos = Array.from(
      new Map(
        data.map(p => [`${p.userId}_${p.curso}`, p])
      ).values()
    );

    res.json(unicos);

  } catch (err) {
    console.error("❌ ERRO /payments:", err);
    res.status(500).json({ error: "Erro ao buscar pagamentos" });
  }
});
// =============================
// 👤 MEUS PAGAMENTOS
// =============================
app.get("/my-payments", authMiddleware, async (req, res) => {
  try {
    const snapshot = await db
      .collection("payments")
      .where("userId", "==", req.user.uid)
      .get();

    let data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ❗ REMOVE FINALIZADOS
    data = data.filter(p => p.status !== "finalizado");

    // ❗ REMOVE QUALQUER STATUS INVÁLIDO
   const STATUS = {
  PENDENTE: "pendente",
  ANALISE: "analise",
  PAGO: "pago",
  FINALIZADO: "finalizado"
};

    // ❗ GARANTE 1 POR CURSO (pega o mais recente)
    const unicos = Array.from(
      new Map(
        data
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(p => [p.curso, p])
      ).values()
    );

    res.json(unicos);

  } catch (err) {
    console.error("❌ ERRO /my-payments:", err);
    res.status(500).json({ error: "Erro ao buscar pagamentos" });
  }
});

app.get("/", (req, res) => {
  res.send("API rodando");
});

const PORT = process.env.PORT || 3000;

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta", process.env.PORT);
});

setInterval(() => {
  console.log("alive");
}, 5000);