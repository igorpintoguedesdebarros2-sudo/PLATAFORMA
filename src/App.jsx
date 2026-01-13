import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Perfil from "./auth/Profile";
import Home from "./auth/Home";
import Planilha from "./Planilha";
import Pagamento from "./Pagamento";
import Preparatorio from "./Preparatorio";

export default function App() {
  return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/perfil" element={<Perfil />} />
         <Route path="/home" element={<Home />} />
          <Route path="/planilha" element={<Planilha />} />
           <Route path="/pagamento" element={<Pagamento />} />
            <Route path="/preparatorio" element={<Preparatorio />} />
      </Routes>
  );
}
