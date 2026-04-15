import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./auth/Login";
import Perfil from "./auth/Profile";
import Admperfil from "./auth/Admprofile";

import Home from "./Home";
import Admhome from "./Admhome";

import Pagamento from "./Pagamento";
import Admpagamento from "./Admpagamento";

// ✅ IMPORT CORRETO
import NR1 from "./NR1";
import ProvaNR1 from "./Prova-NR1";
import NR5 from "./NR5";
import ProvaNR5 from "./Prova-NR5";
import NR6 from "./NR6";
import ProvaNR6 from "./Prova-NR6";
import NR10 from "./NR10";
import ProvaNR10 from "./Prova-NR10";
import NR10HV from "./NR10HV";
import ProvaNR10HV from "./Prova-NR10HV";
import NR11 from "./NR11";
import ProvaNR11 from "./Prova-NR11";
import NR12 from "./NR12";
import ProvaNR12 from "./Prova-NR12";
import NR13 from "./NR13";
import ProvaNR13 from "./Prova-NR13";
import NR16 from "./NR16";
import ProvaNR16 from "./Prova-NR16";
import NR17 from "./NR17";
import ProvaNR17 from "./Prova-NR17";
import NR18 from "./NR18";
import ProvaNR18 from "./Prova-NR18";
import NR20 from "./NR20";
import ProvaNR20 from "./Prova-NR20";
import NR23 from "./NR23";
import ProvaNR23 from "./Prova-NR23";
import NR26 from "./NR26";
import ProvaNR26 from "./Prova-NR26";
import NR29 from "./NR29";
import ProvaNR29 from "./Prova-NR29";
import NR30 from "./NR30";
import ProvaNR30 from "./Prova-NR30";
import NR32 from "./NR32";
import NR33 from "./NR33";
import ProvaNR33 from "./Prova-NR33";
import NR34 from "./NR34";
import ProvaNR34 from "./Prova-NR34";
import NR35 from "./NR35";
import ProvaNR35 from "./Prova-NR35";
import NR37 from "./NR37";
import ProvaNR37 from "./Prova-NR37";
import NR38 from "./NR38";
import ProvaNR38 from "./Prova-NR38";
import Matematica from "./Matematica";
import Matematica2 from "./Matematica2";
import ProvaMatematica from "./Prova-matematica";
import Portugues from "./Portugues";
import ProvaPortugues from "./Prova-portugues";
import ProvaPortugues2 from "./Prova-portugues2";
import Drone from "./DRONE";

function ProtectedRoute({ children, role }) {
  const userRole = localStorage.getItem("role")

  if (!userRole) {
    return <Navigate to="/" />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/" />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔑 LOGIN */}
        <Route path="/" element={<Login />} />

        {/* 👤 PERFIL USUÁRIO */}
        <Route
          path="/perfil"
          element={
            <ProtectedRoute role="user">
              <Perfil />
            </ProtectedRoute>
          }
        />

        {/* 💳 PAGAMENTO (USER) */}
        <Route
          path="/pagamento"
          element={
            <ProtectedRoute role="user">
              <Pagamento />
            </ProtectedRoute>
          }
        />

        {/* 👤 PERFIL USUÁRIO */}
        <Route
          path="/home"
          element={
            <ProtectedRoute role="user">
              <Home />
            </ProtectedRoute>
          }
        />

        {/* 📚 CURSO NR1 */}
        <Route
          path="/nr1"
          element={
            <ProtectedRoute role="user">
              <NR1 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr1"
          element={
            <ProtectedRoute role="user">
              <ProvaNR1 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr5"
          element={
            <ProtectedRoute role="user">
              <NR5 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr5"
          element={
            <ProtectedRoute role="user">
              <ProvaNR5 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr6"
          element={
            <ProtectedRoute role="user">
              <NR6 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr6"
          element={
            <ProtectedRoute role="user">
              <ProvaNR6 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr10"
          element={
            <ProtectedRoute role="user">
              <NR10 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr10"
          element={
            <ProtectedRoute role="user">
              <ProvaNR10 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr10hv"
          element={
            <ProtectedRoute role="user">
              <NR10HV />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr10hv"
          element={
            <ProtectedRoute role="user">
              <ProvaNR10HV />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nr11"
          element={
            <ProtectedRoute role="user">
              <NR11 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr11"
          element={
            <ProtectedRoute role="user">
              <ProvaNR11 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr12"
          element={
            <ProtectedRoute role="user">
              <NR12 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr12"
          element={
            <ProtectedRoute role="user">
              <ProvaNR12 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr13"
          element={
            <ProtectedRoute role="user">
              <NR13 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr13"
          element={
            <ProtectedRoute role="user">
              <ProvaNR13 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr16"
          element={
            <ProtectedRoute role="user">
              <NR16 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr16"
          element={
            <ProtectedRoute role="user">
              <ProvaNR16 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr17"
          element={
            <ProtectedRoute role="user">
              <NR17 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr17"
          element={
            <ProtectedRoute role="user">
              <ProvaNR17 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr18"
          element={
            <ProtectedRoute role="user">
              <NR18 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr18"
          element={
            <ProtectedRoute role="user">
              <ProvaNR18 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr20"
          element={
            <ProtectedRoute role="user">
              <NR20 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr20"
          element={
            <ProtectedRoute role="user">
              <ProvaNR20 />
            </ProtectedRoute>
          }
        />


        <Route
          path="/nr23"
          element={
            <ProtectedRoute role="user">
              <NR23 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr23"
          element={
            <ProtectedRoute role="user">
              <ProvaNR23 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr26"
          element={
            <ProtectedRoute role="user">
              <NR26 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr26"
          element={
            <ProtectedRoute role="user">
              <ProvaNR26 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr29"
          element={
            <ProtectedRoute role="user">
              <NR29 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr29"
          element={
            <ProtectedRoute role="user">
              <ProvaNR29 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr30"
          element={
            <ProtectedRoute role="user">
              <NR30 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr30"
          element={
            <ProtectedRoute role="user">
              <ProvaNR30 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr32"
          element={
            <ProtectedRoute role="user">
              <NR32 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr33"
          element={
            <ProtectedRoute role="user">
              <NR33 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr33"
          element={
            <ProtectedRoute role="user">
              <ProvaNR33 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr34"
          element={
            <ProtectedRoute role="user">
              <NR34 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr34"
          element={
            <ProtectedRoute role="user">
              <ProvaNR34 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr35"
          element={
            <ProtectedRoute role="user">
              <NR35 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr35"
          element={
            <ProtectedRoute role="user">
              <ProvaNR35 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr37"
          element={
            <ProtectedRoute role="user">
              <NR37 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr37"
          element={
            <ProtectedRoute role="user">
              <ProvaNR37 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/nr38"
          element={
            <ProtectedRoute role="user">
              <NR38 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-nr38"
          element={
            <ProtectedRoute role="user">
              <ProvaNR38 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/portugues"
          element={
            <ProtectedRoute role="user">
              <Portugues />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-portugues"
          element={
            <ProtectedRoute role="user">
              <ProvaPortugues />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-portugues2"
          element={
            <ProtectedRoute role="user">
              <ProvaPortugues2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/matematica"
          element={
            <ProtectedRoute role="user">
              <Matematica />
            </ProtectedRoute>
          }
        />

        <Route
          path="/matematica2"
          element={
            <ProtectedRoute role="user">
              <Matematica2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prova-matematica"
          element={
            <ProtectedRoute role="user">
              <ProvaMatematica />
            </ProtectedRoute>
          }
        />

        <Route
          path="/drone"
          element={
            <ProtectedRoute role="user">
              <Drone />
            </ProtectedRoute>
          }
        />

         {/* 👑 Home ADMIN */}
        <Route
          path="/admhome"
          element={
            <ProtectedRoute role="admin">
              <Admhome />
            </ProtectedRoute>
          }
        />

        {/* 👑 PERFIL ADMIN */}
        <Route
          path="/admperfil"
          element={
            <ProtectedRoute role="admin">
              <Admperfil />
            </ProtectedRoute>
          }
        />

        {/* 💰 PAGAMENTO ADMIN */}
        <Route
          path="/admpagamento"
          element={
            <ProtectedRoute role="admin">
              <Admpagamento />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}