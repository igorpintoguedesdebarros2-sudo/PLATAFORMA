import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        navigate("/");
      } else {
        setUser(usuario);
      }
    });

    return () => unsub();
  }, [navigate]);

  const sair = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="container mt-5">
      <h2>Perfil</h2>

      <p><strong>Email:</strong> {user.email}</p>

      <div className="d-flex gap-2">
        <Link to="/home" className="btn btn-secondary">
          Voltar Home
        </Link>

        <button onClick={sair} className="btn btn-danger">
          Sair
        </button>
      </div>
    </div>
  );
}
