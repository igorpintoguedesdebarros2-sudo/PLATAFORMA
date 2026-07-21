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



// Chave pública do Stripe
// Substitua pela sua pk_test
const stripe = Stripe(
    "pk_test_51TE8ZZLs51eEGUV1zJcylus26Ox4xxRVL8iiCeMmGngVvnbnRoR2laAVPhHxldhn0jkKs8kjugG4woYDr93qJX6z00QMKrOCbX"
);



let usuarioAtual = null;




// Verificar usuário logado


onAuthStateChanged(
    auth,
    (usuario)=>{


        if(!usuario){

            window.location="index.html";

            return;

        }


        usuarioAtual = usuario;


        carregarCursos();


    }
);








// Solicitar novo curso


document
.getElementById("solicitar")
.onclick = async()=>{


    const curso =
    document
    .getElementById("curso")
    .value;



    if(curso === ""){


        alert(
        "Selecione um curso."
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



            linkCurso:
            ""



        }

    );







    alert(
        "Curso enviado para análise."
    );


};

function carregarCursos(){


    const solicitacoes =
    document.getElementById(
        "solicitacoes"
    );



    const liberados =
    document.getElementById(
        "cursosLiberados"
    );




    onValue(

        ref(
            db,
            "solicitacoes_cursos"
        ),


        (snapshot)=>{


            solicitacoes.innerHTML = "";

            liberados.innerHTML = "";




            snapshot.forEach(

                (item)=>{


                    const curso =
                    item.val();



                    const id =
                    item.key;




                    if(
                        curso.usuarioId !== usuarioAtual.uid
                    ){

                        return;

                    }








                    // Curso aguardando análise do administrador


                    if(
                        curso.status === "aguardando"
                    ){


                        solicitacoes.innerHTML += `


                        <div class="curso-card">


                            <h3>
                            ${curso.curso}
                            </h3>


                            <p>
                            Status:
                            Aguardando aprovação
                            </p>


                        </div>


                        `;


                    }









                    // Administrador definiu valor


                    if(
                        curso.status === "aguardando_pagamento"
                    ){



                        solicitacoes.innerHTML += `


                        <div class="curso-card">


                            <h3>
                            ${curso.curso}
                            </h3>



                            <p>
                            Valor:
                            R$ ${curso.valor}
                            </p>




                            <button
                            onclick="pagarCurso('${id}')">


                            Pagar


                            </button>



                        </div>


                        `;


                    }









                    // Curso liberado após pagamento confirmado


                    if(
                        curso.status === "liberado"
                    ){


                        liberados.innerHTML += `


                        <div class="curso-card">


                            <h3>
                            ${curso.curso}
                            </h3>




                            <p>
                            Valor pago:
                            R$ ${curso.valor}
                            </p>





                            <a href="${curso.linkCurso}"
                            target="_blank">


                            <button>


                            Acessar Curso


                            </button>


                            </a>






                            <button
                            onclick="finalizarCurso('${id}')">


                            Concluir Curso


                            </button>



                        </div>


                        `;


                    }





                }

            );


        }


    );


}

// Pagamento usando Stripe
// O valor vem do administrador pelo Firebase


window.pagarCurso = async(id)=>{


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
        "Curso não encontrado."
        );


        return;


    }






    if(
        !curso.valor ||
        Number(curso.valor) <= 0
    ){


        alert(
        "O administrador ainda não definiu o valor."
        );


        return;


    }






    try{



        const resposta =
        await fetch(

            "http://localhost:3000/criar-pagamento",

            {


                method:"POST",



                headers:{


                    "Content-Type":
                    "application/json"


                },



                body:JSON.stringify({


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
            "Erro ao criar pagamento."
            );


            return;


        }








        const resultadoStripe =
        await stripe.redirectToCheckout({


            sessionId:
            dados.id


        });






        if(resultadoStripe.error){


            alert(
            resultadoStripe.error.message
            );


        }




    }
    catch(error){



        console.error(error);



        alert(
        "Erro ao iniciar pagamento."
        );



    }



};


// Finalizar curso
// Envia para histórico de cursos e pagamentos


window.finalizarCurso = async(id)=>{


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
        "Curso não encontrado."
        );


        return;


    }








    // Histórico de cursos concluídos


    await set(

        ref(

            db,

            "usuarios/"
            +usuarioAtual.uid+
            "/cursos/"+id

        ),


        {


            nome:
            curso.curso,



            status:
            "Concluído",



            data:
            new Date()
            .toLocaleDateString()



        }

    );









    // Histórico de pagamentos


    await set(

        ref(

            db,

            "usuarios/"
            +usuarioAtual.uid+
            "/pagamentos/"+id

        ),


        {


            curso:
            curso.curso,



            valor:
            curso.valor,



            data:
            new Date()
            .toLocaleDateString()



        }

    );









    // Remove da lista de cursos ativos


    await remove(

        ref(

            db,

            "solicitacoes_cursos/"+id

        )

    );







    alert(
        "Curso enviado para o histórico."
    );



};











// Logout


document
.getElementById("sair")
.onclick = ()=>{


    signOut(auth);


    window.location =
    "index.html";


};