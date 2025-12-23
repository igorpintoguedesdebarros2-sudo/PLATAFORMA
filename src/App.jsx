import { HashRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Profile from "./auth/Profile";
import Pagamento from "./Pagamento";
import Preparatorio from "./Preparatorio";
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
import MATEMATICA from "./MATEMATICA";
import MATEMATICA2 from "./MATEMATICA2";
import PROVAMATEMATICA from "./PROVA-MATEMATICA";
import PORTUGUES from "./PORTUGUES";
import PROVAPORTUGUES from "./PROVA-PORTUGUES";
import PROVAPORTUGUES2 from "./PROVA-PORTUGUES2";
import DRONE from "./DRONE";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pagamento" element={<Pagamento />} />
        <Route path="/preparatorio" element={<Preparatorio />} />
        <Route path="projeto/src/NR1.jsx" element={<NR1 />} />
        <Route path="/src/PROVA-NR1" element={<PROVANR1 />} />
        <Route path="projeto/src/NR5.jsx" element={<NR5 />} />
        <Route path="/src/PROVA-NR5" element={<PROVANR5 />} />
        <Route path="projeto/src/NR6.jsx" element={<NR6 />} />
        <Route path="/src/PROVA-NR6" element={<PROVANR6 />} />
        <Route path="projeto/src/NR10.jsx" element={<NR10 />} />
        <Route path="/src/PROVA-NR10" element={<PROVANR10 />} />
        <Route path="projeto/src/NR10HV.jsx" element={<NR10HV />} />
        <Route path="/src/PROVA-NR10HV" element={<PROVANR10HV />} />
        <Route path="projeto/src/NR11.jsx" element={<NR11 />} />
        <Route path="/src/PROVA-NR11" element={<PROVANR11 />} />
        <Route path="projeto/src/NR12.jsx" element={<NR12 />} />
        <Route path="/src/PROVA-NR12" element={<PROVANR12 />} />
        <Route path="projeto/src/NR13.jsx" element={<NR13 />} />
        <Route path="/src/PROVA-NR13" element={<PROVANR13 />} />
        <Route path="projeto/src/NR16.jsx" element={<NR16 />} />
        <Route path="/src/PROVA-NR16" element={<PROVANR16 />} />
        <Route path="projeto/src/NR17.jsx" element={<NR17 />} />
        <Route path="/src/PROVA-NR17" element={<PROVANR17 />} />
        <Route path="projeto/src/NR18.jsx" element={<NR18 />} />
        <Route path="/src/PROVA-NR18" element={<PROVANR18 />} />
        <Route path="projeto/src/NR20.jsx" element={<NR20 />} />
        <Route path="/src/PROVA-NR20" element={<PROVANR20 />} />
        <Route path="projeto/src/NR23.jsx" element={<NR23 />} />
        <Route path="/src/PROVA-NR23" element={<PROVANR23 />} />
        <Route path="projeto/src/NR26.jsx" element={<NR26 />} />
        <Route path="/src/PROVA-NR26" element={<PROVANR26 />} />
        <Route path="projeto/src/NR29.jsx" element={<NR29 />} />
        <Route path="/src/PROVA-NR29" element={<PROVANR29 />} />
        <Route path="projeto/src/NR30.jsx" element={<NR30 />} />
        <Route path="/src/PROVA-NR30" element={<PROVANR30 />} />
        <Route path="projeto/src/NR32.jsx" element={<NR32 />} />
        <Route path="projeto/src/NR33.jsx" element={<NR33 />} />
        <Route path="/src/PROVA-NR33" element={<PROVANR33 />} />
        <Route path="projeto/src/NR34.jsx" element={<NR34 />} />
        <Route path="/src/PROVA-NR34" element={<PROVANR34 />} />
        <Route path="projeto/src/NR35.jsx" element={<NR35 />} />
        <Route path="/src/PROVA-NR35" element={<PROVANR35 />} />
        <Route path="projeto/src/NR37.jsx" element={<NR37 />} />
        <Route path="/src/PROVA-NR37" element={<PROVANR37 />} />
        <Route path="projeto/src/NR38.jsx" element={<NR38 />} />
        <Route path="/src/PROVA-NR38" element={<PROVANR38 />} />
         <Route path="projeto/src/MATEMATICA.jsx" element={<MATEMATICA />} />
        <Route path="/src/MATEMATICA2" element={<MATEMATICA2 />} />
        <Route path="/src/PROVA-MATEMATICA" element={<PROVAMATEMATICA />} />
        <Route path="projeto/src/PORTUGUES.jsx" element={<PORTUGUES />} />
        <Route path="/src/PROVA-PORTUGUES" element={<PROVAPORTUGUES />} />
        <Route path="/src/PROVA-PORTUGUES2" element={<PROVAPORTUGUES2 />} />
        <Route path="projeto/src/DRONE.jsx" element={<DRONE />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
