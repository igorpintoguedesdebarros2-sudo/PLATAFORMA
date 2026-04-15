import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (type) => {
    setLoading(true);
    setErro("");

    try {
      // 🔥 GARANTE ESTADO LIMPO
      await signOut(auth);
      localStorage.clear();

      let userCredential;

      if (type === "email") {
        if (!email || !senha) {
          throw new Error("Preencha email e senha");
        }

        try {
          userCredential = await signInWithEmailAndPassword(auth, email, senha);
        } catch (err) {
          if (
            err.code === "auth/user-not-found" ||
            err.code === "auth/invalid-credential"
          ) {
            userCredential = await createUserWithEmailAndPassword(auth, email, senha);
          } else {
            throw err;
          }
        }
      } else {
        userCredential = await signInWithPopup(auth, provider);
      }

      // 🔥 TOKEN SEMPRE ATUALIZADO
      const firebaseToken = await userCredential.user.getIdToken(true);

      const res = await fetch("http://localhost:3000/session-login", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firebaseToken}`
        },
        credentials: "include"
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro no servidor");
      }

      const data = await res.json();

      // 🔍 DEBUG REAL
      console.log("EMAIL LOGADO:", userCredential.user.email);
      console.log("ROLE DO BACK:", data.role);

      // 🔴 VALIDAÇÃO CRÍTICA
      if (!data.role) {
        throw new Error("Role não veio do servidor");
      }

      // 💾 SALVA
      localStorage.setItem("csrfToken", data.csrfToken);
      localStorage.setItem("role", data.role);

      console.log("ROLE SALVO:", localStorage.getItem("role"));

      // 🔀 REDIRECIONAMENTO SEGURO
      if (data.role === "admin") {
        console.log("REDIRECIONANDO → ADMIN");
        navigate("/admperfil");
      } else {
        console.log("REDIRECIONANDO → USER");
        navigate("/perfil");
      }

    } catch (err) {
      console.error("ERRO LOGIN:", err);

      if (err.code === "auth/wrong-password") {
        setErro("Senha incorreta");
      } else if (err.code === "auth/invalid-email") {
        setErro("Email inválido");
      } else if (err.message.includes("Role")) {
        setErro("Erro interno de autenticação");
      } else {
        setErro("Erro no login");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <br /><br />

      <button onClick={() => handleLogin("email")} disabled={loading}>
        {loading ? "Entrando..." : "Login Email"}
      </button>

      <br /><br />

      <button onClick={() => handleLogin("google")} disabled={loading}>
        {loading ? "Entrando..." : "Login com Google"}
      </button>
    </div>
  );
} 