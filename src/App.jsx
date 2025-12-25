import { Routes, Route } from "react-router-dom";

import Login from "./auth/Login";
import Register from "./auth/Register";
import Profile from "./auth/Profile";
import Home from "./Home"
import Pagamento from "./Pagamento";
import Preparatorio from "./Pretaratorio";

// Cursos NR
import NR1 from "./NR1";
import PROVANR1 from "./PROVA-NR1";
import NR5 from "./NR5";
import PROVANR5 from "./PROVA-NR5";
import NR6 from "./NR6";
import PROVANR6 from "./PROVA-NR6";
import NR10 from "./NR10";
import PROVANR10 from "./PROVA-NR10";
import NR10HV from "./NR10HV";
import PROVANR10HV from "./PROVA-NR10HV";
import NR11 from "./NR11";
import PROVANR11 from "./PROVA-NR11";
import NR12 from "./NR12";
import PROVANR12 from "./PROVA-NR12";
import NR13 from "./NR13";
import PROVANR13 from "./PROVA-NR13";
import NR16 from "./NR16";
import PROVANR16 from "./PROVA-NR16";
import NR17 from "./NR17";
import PROVANR17 from "./PROVA-NR17";
import NR18 from "./NR18";
import PROVANR18 from "./PROVA-NR18";
import NR20 from "./NR20";
import PROVANR20 from "./PROVA-NR20";
import NR23 from "./NR23";
import PROVANR23 from "./PROVA-NR23";
import NR26 from "./NR26";
import PROVANR26 from "./PROVA-NR26";
import NR29 from "./NR29";
import PROVANR29 from "./PROVA-NR29";
import NR30 from "./NR30";
import PROVANR30 from "./PROVA-NR30";
import NR32 from "./NR32";
import NR33 from "./NR33";
import PROVANR33 from "./PROVA-NR33";
import NR34 from "./NR34";
import PROVANR34 from "./PROVA-NR34";
import NR35 from "./NR35";
import PROVANR35 from "./PROVA-NR35";
import NR37 from "./NR37";
import PROVANR37 from "./PROVA-NR37";
import NR38 from "./NR38";
import PROVANR38 from "./PROVA-NR38";

// Básico
import MATEMATICA from "./MATEMATICA";
import MATEMATICA2 from "./MATEMATICA2";
import PROVAMATEMATICA from "./PROVA-MATEMATICA";
import PORTUGUES from "./PORTUGUES";
import PROVAPORTUGUES from "./PROVA-PORTUGUES";
import PROVAPORTUGUES2 from "./PROVA-PORTUGUES2";

// Drone
import DRONE from "./DRONE";

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
      
      <Route path="/home" element={<Home />} />

      {/* Sistema */}
      <Route path="/pagamento" element={<Pagamento />} />
      <Route path="/preparatorio" element={<Preparatorio />} />

      {/* Cursos NR */}
      <Route path="/nr1" element={<NR1 />} />
      <Route path="/nr1/prova" element={<PROVANR1 />} />

      <Route path="/nr5" element={<NR5 />} />
      <Route path="/nr5/prova" element={<PROVANR5 />} />

      <Route path="/nr6" element={<NR6 />} />
      <Route path="/nr6/prova" element={<PROVANR6 />} />

      <Route path="/nr10" element={<NR10 />} />
      <Route path="/nr10/prova" element={<PROVANR10 />} />

      <Route path="/nr10hv" element={<NR10HV />} />
      <Route path="/nr10hv/prova" element={<PROVANR10HV />} />

      <Route path="/nr11" element={<NR11 />} />
      <Route path="/nr11/prova" element={<PROVANR11 />} />

      <Route path="/nr12" element={<NR12 />} />
      <Route path="/nr12/prova" element={<PROVANR12 />} />

      <Route path="/nr13" element={<NR13 />} />
      <Route path="/nr13/prova" element={<PROVANR13 />} />

      <Route path="/nr16" element={<NR16 />} />
      <Route path="/nr16/prova" element={<PROVANR16 />} />

      <Route path="/nr17" element={<NR17 />} />
      <Route path="/nr17/prova" element={<PROVANR17 />} />

      <Route path="/nr18" element={<NR18 />} />
      <Route path="/nr18/prova" element={<PROVANR18 />} />

      <Route path="/nr20" element={<NR20 />} />
      <Route path="/nr20/prova" element={<PROVANR20 />} />

      <Route path="/nr23" element={<NR23 />} />
      <Route path="/nr23/prova" element={<PROVANR23 />} />

      <Route path="/nr26" element={<NR26 />} />
      <Route path="/nr26/prova" element={<PROVANR26 />} />

      <Route path="/nr29" element={<NR29 />} />
      <Route path="/nr29/prova" element={<PROVANR29 />} />

      <Route path="/nr30" element={<NR30 />} />
      <Route path="/nr30/prova" element={<PROVANR30 />} />

      <Route path="/nr32" element={<NR32 />} />

      <Route path="/nr33" element={<NR33 />} />
      <Route path="/nr33/prova" element={<PROVANR33 />} />

      <Route path="/nr34" element={<NR34 />} />
      <Route path="/nr34/prova" element={<PROVANR34 />} />

      <Route path="/nr35" element={<NR35 />} />
      <Route path="/nr35/prova" element={<PROVANR35 />} />

      <Route path="/nr37" element={<NR37 />} />
      <Route path="/nr37/prova" element={<PROVANR37 />} />

      <Route path="/nr38" element={<NR38 />} />
      <Route path="/nr38/prova" element={<PROVANR38 />} />

      {/* Básico */}
      <Route path="/matematica" element={<MATEMATICA />} />
      <Route path="/matematica2" element={<MATEMATICA2 />} />
      <Route path="/matematica/prova" element={<PROVAMATEMATICA />} />

      <Route path="/portugues" element={<PORTUGUES />} />
      <Route path="/portugues/prova" element={<PROVAPORTUGUES />} />
      <Route path="/portugues/prova2" element={<PROVAPORTUGUES2 />} />

      {/* Drone */}
      <Route path="/drone" element={<DRONE />} />
    </Routes>
  );
}
