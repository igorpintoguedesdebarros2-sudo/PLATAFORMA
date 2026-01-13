import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [comprados, setComprados] = useState([]);
  const [historico, setHistorico] = useState([]);

  const navigate = useNavigate();

  /* ---------- AUTH ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/");
      } else {
        setUser(u);

        // 🔥 Dados do perfil no Firestore
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setUserData(snap.data());
      }
    });

    return () => unsub();
  }, []);

  /* ---------- LOAD CURSOS POR USUÁRIO ---------- */
  useEffect(() => {
    if (!user) return;

    const uid = user.uid;

    setComprados(
      JSON.parse(localStorage.getItem(`PREP_comprados_${uid}`)) || []
    );

    setHistorico(
      JSON.parse(localStorage.getItem(`NR_comprados_${uid}`)) || []
    );
  }, [user]);

  /* ---------- CONCLUIR CURSO ---------- */
  function concluirCurso(id) {
    const curso = comprados.find((c) => c.id === id);
    if (!curso) return;

    const novoHistorico = [...historico, curso];
    const novosComprados = comprados.filter((c) => c.id !== id);

    setHistorico(novoHistorico);
    setComprados(novosComprados);

    const uid = user.uid;

    localStorage.setItem(
      `NR_comprados_${uid}`,
      JSON.stringify(novoHistorico)
    );

    localStorage.setItem(
      `PREP_comprados_${uid}`,
      JSON.stringify(novosComprados)
    );
  }

  function logout() {
    signOut(auth);
    navigate("/");
  }

  if (!user) return null;

  return (
    <div style={{ padding: 30 }}>
      <h1>Perfil</h1>

      <p><strong>Email:</strong> {user.email}</p>
      {userData && <p><strong>Nome:</strong> {userData.nome}</p>}

      <button onClick={logout}>Sair</button>

      <button
        onClick={() => navigate("/home")}
        style={{
          padding: "10px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px"
        }}
      >
        VOLTAR
      </button>

      {/* -------- CURSOS ATIVOS -------- */}
      <h2 style={{ marginTop: 40 }}>Cursos em andamento</h2>

      {comprados.length === 0 && <p>Nenhum curso ativo.</p>}

      {comprados.map((curso) => (
        <div key={curso.id} className="curso">
          <strong>{curso.nome}</strong><br />
          <a href={curso.arquivoCurso} target="_blank">Acessar curso</a><br />
          <button onClick={() => concluirCurso(curso.id)}>
            Marcar como concluído
          </button>
        </div>
      ))}

      {/* -------- HISTÓRICO -------- */}
      <h2 style={{ marginTop: 40 }}>Histórico de Cursos</h2>

      {historico.length === 0 && <p>Ainda nenhum curso concluído.</p>}

      {historico.map((curso) => (
        <div key={curso.id} className="curso historico">
          {curso.nome}
        </div>
      ))}
    </div>
  );
}
