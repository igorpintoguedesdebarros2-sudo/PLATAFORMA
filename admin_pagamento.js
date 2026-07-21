import {
    auth,
    db
}
from "./firebase.js";


import {
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


import {
    ref,
    onValue,
    update
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";





const tabela =
document.getElementById("pedidos");






onAuthStateChanged(
auth,
(usuario)=>{


    if(!usuario){


        window.location="index.html";


        return;


    }


    carregarPedidos();


});









function carregarPedidos(){



onValue(

ref(
db,
"solicitacoes_cursos"
),


(snapshot)=>{



tabela.innerHTML="";





snapshot.forEach((item)=>{



const pedido =
item.val();



const id =
item.key;






tabela.innerHTML += `



<tr>


<td>

${pedido.nomeUsuario || "Sem nome"}

</td>



<td>

${pedido.email || ""}

</td>



<td>

${pedido.curso}

</td>




<td>


<input

id="valor-${id}"

type="number"

placeholder="Ex: 149.90"

>


</td>






<td>


<input

id="link-${id}"

placeholder="Link do curso"

>


</td>







<td>


${pedido.status}


</td>








<td>



<button

onclick="aprovar('${id}')"

>


Liberar pagamento


</button>



</td>



</tr>



`;





});





});



}









window.aprovar = async(id)=>{



const valor =

document
.getElementById(
"valor-"+id
)
.value;





const link =

document
.getElementById(
"link-"+id
)
.value;







if(
valor === "" ||
Number(valor)<=0
){


alert(
"Digite um valor válido."
);


return;


}








if(link === ""){


alert(
"Digite o link do curso."
);


return;


}








await update(

ref(

db,

"solicitacoes_cursos/"+id

),


{


valor:
Number(valor),



linkCurso:
link,



status:
"aguardando_pagamento"



}


);







alert(
"Curso enviado para pagamento."
);



};