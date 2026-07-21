import {
    auth,
    db
}
from "./firebase.js";


import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


import {
    ref,
    push,
    set,
    onValue,
    remove,
    update,
    get
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";




// Stripe Public Key

const stripe = Stripe(
    "pk_test_51TE8ZZLs51eEGUV1zJcylus26Ox4xxRVL8iiCeMmGngVvnbnRoR2laAVPhHxldhn0jkKs8kjugG4woYDr93qJX6z00QMKrOCbX"
);




// Backend

const API_URL =
"https://plataforma-56gy.onrender.com";




let usuarioAtual = null;

onAuthStateChanged(
    auth,
    (usuario)=>{


        if(!usuario){

            window.location = "index.html";

            return;

        }


        usuarioAtual = usuario;


        carregarCursos();


    }
);
 
function carregarCursos(){

    const solicitacoes =
    document.getElementById(
        "solicitacoes"
    );


    const liberados =
    document.getElementById(
        "cursosLiberados"
    );


    const historico =
    document.getElementById(
        "historico"
    );


    onValue(

        ref(db,"solicitacoes_cursos"),

        (snapshot)=>{


            solicitacoes.innerHTML = "";

            liberados.innerHTML = "";



            snapshot.forEach((item)=>{


                const curso =
                item.val();


                const id =
                item.key;



                if(
                    curso.usuarioId !== usuarioAtual.uid
                ){

                    return;

                }



                if(
                    curso.status === "aguardando"
                ){


                    solicitacoes.innerHTML += `

                    <div class="curso-card">

                    <h3>${curso.curso}</h3>

                    <p>
                    Aguardando aprovação
                    </p>

                    </div>

                    `;


                }



                if(
                    curso.status === "aguardando_pagamento"
                ){


                    solicitacoes.innerHTML += `

                    <div class="curso-card">

                    <h3>${curso.curso}</h3>

                    <p>
                    Valor: R$ ${curso.valor}
                    </p>


                    <button onclick="pagarCurso('${id}')">

                    Pagar

                    </button>


                    </div>

                    `;


                }



                if(
                    curso.status === "liberado"
                ){


                    liberados.innerHTML += `

                    <div class="curso-card">


                    <h3>${curso.curso}</h3>


                    <p>
                    Pagamento confirmado
                    </p>


                    <a href="${curso.linkCurso}"
                    target="_blank">


                    <button>
                    Acessar Curso
                    </button>


                    </a>


                    </div>

                    `;


                }


            });


        }

    );


}

document
.getElementById("sair")
.onclick = ()=>{

    signOut(auth);

    window.location="index.html";

};

document
.getElementById("solicitar")
.onclick = async()=>{


    const curso =
    document
    .getElementById("curso")
    .value;



    if(!curso){


        alert(
            "Selecione um curso"
        );


        return;

    }



    const pedido =
    push(
        ref(
            db,
            "solicitacoes_cursos"
        )
    );



    await set(

        pedido,

        {


            usuarioId:
            usuarioAtual.uid,


            nomeUsuario:
            usuarioAtual.displayName ||
            "Usuário",


            email:
            usuarioAtual.email,


            curso:
            curso,


            valor:
            0,


            status:
            "aguardando",


            pago:
            false,


            linkCurso:
            ""

        }

    );



    alert(
        "Curso enviado para análise."
    );


};

window.pagarCurso = async(id)=>{


    try{


        const resultado =
        await get(

            ref(
                db,
                "solicitacoes_cursos/"+id
            )

        );



        const curso =
        resultado.val();



        if(!curso){


            alert(
                "Curso não encontrado"
            );


            return;

        }



        if(
            !curso.valor ||
            Number(curso.valor)<=0
        ){


            alert(
                "Aguardando definição do valor."
            );


            return;

        }



        const resposta =
        await fetch(

            API_URL +
            "/criar-pagamento",

            {


                method:
                "POST",


                headers:{


                    "Content-Type":
                    "application/json"


                },


                body:
                JSON.stringify({

                    pedidoId:
                    id,


                    usuarioId:
                    usuarioAtual.uid,


                    curso:
                    curso.curso,


                    valor:
                    Number(curso.valor)


                })


            }

        );



        const dados =
        await resposta.json();




        if(!dados.id){


            alert(
                "Erro criando pagamento"
            );


            return;

        }




        const checkout =
        await stripe.redirectToCheckout({

            sessionId:
            dados.id

        });



        if(checkout.error){


            alert(
                checkout.error.message
            );

        }



    }
    catch(error){


        console.error(error);


        alert(
            "Erro no pagamento"
        );


    }


};