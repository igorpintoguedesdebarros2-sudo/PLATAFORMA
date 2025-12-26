import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      navigate("/home"); // 🔥 rota certa
    } catch (err) {
      setErro("Email ou senha inválidos");
    }
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          className="form-control mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="form-control mb-2"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && <p style={{ color: "red" }}>{erro}</p>}

        <button className="btn btn-primary w-100">
          Entrar
        </button>
      </form>
    </div>
  );
}
