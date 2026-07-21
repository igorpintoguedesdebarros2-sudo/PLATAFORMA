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
    "pk_test_SUA_CHAVE_PUBLICA"
);




// Backend

const API_URL =
"https://SEU-BACKEND.onrender.com";




let usuarioAtual = null;




onAuthStateChanged(
    auth,
    (usuario)=>{


        if(!usuario){

            window.location =
            "index.html";

            return;

        }


        usuarioAtual =
        usuario;


        carregarCursos();


    }
);





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