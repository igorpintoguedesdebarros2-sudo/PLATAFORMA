import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();

    if (!nome || !email || !password) {
      alert("Preenche tudo direitinho 🥺");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // 🔥 Cria documento do usuário no Firestore
      await setDoc(doc(db, "users", uid), {
        nome,
        email,
        criadoEm: new Date()
      });

      navigate("/perfil");
    } catch (error) {
      alert("Erro ao criar conta 😢");
    }
  }

  return (
    <div>
      <h2>Criar conta</h2>

      <form onSubmit={handleRegister}>
        <input
          placeholder="Nome"
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}
