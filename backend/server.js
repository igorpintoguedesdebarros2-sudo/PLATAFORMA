const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const serviceAccount = JSON.parse(
    process.env.FIREBASE_ADMIN_JSON
);

const {
    getDatabase
} = require("firebase-admin/database");



const app = express();



// =======================
// FIREBASE ADMIN
// =======================


const serviceAccount =
require("./firebase-admin.json");



initializeApp({

    credential:
    cert(serviceAccount),


    databaseURL:
    "https://proje-79338-default-rtdb.firebaseio.com"

});



const db =
getDatabase();




// =======================
// STRIPE
// =======================


const stripe =
Stripe(
    process.env.STRIPE_SECRET_KEY
);



app.use(cors());




// =======================
// WEBHOOK STRIPE
// SEMPRE ANTES DO JSON
// =======================


app.post(

"/webhook",

express.raw({
    type:"application/json"
}),


async(req,res)=>{


    const assinatura =
    req.headers["stripe-signature"];


    let evento;



    try{


        evento =
        stripe.webhooks.constructEvent(

            req.body,

            assinatura,

            process.env.STRIPE_WEBHOOK_SECRET

        );


    }
    catch(error){


        console.log(
            "Webhook inválido:",
            error.message
        );


        return res
        .status(400)
        .send(
            "Webhook inválido"
        );


    }




    console.log(
        "Evento Stripe:",
        evento.type
    );





    if(
        evento.type ===
        "checkout.session.completed"
    ){


        const sessao =
        evento.data.object;



        console.log(
            "Metadata recebido:",
            sessao.metadata
        );



        const pedidoId =
        sessao.metadata?.pedidoId;




        if(!pedidoId){


            console.log(
                "Pedido sem ID"
            );


            return res.json({
                recebido:true
            });


        }



try{


    const curso =
    sessao.metadata.curso;



    let linkCurso = "";


    switch(curso){

        case "HTML Completo":
            linkCurso = "https://seusite.com/cursos/html";
            break;


        case "CSS Completo":
            linkCurso = "https://seusite.com/cursos/css";
            break;


        case "JavaScript":
            linkCurso = "https://seusite.com/cursos/javascript";
            break;


        case "Python":
            linkCurso = "https://seusite.com/cursos/python";
            break;


        case "Firebase":
            linkCurso = "https://seusite.com/cursos/firebase";
            break;


        default:
            linkCurso = "";
    }

await db
.ref(
    "solicitacoes_cursos/" + pedidoId
)
.update({

    status:"liberado",

    pago:true,

    pagamentoId:
    sessao.id,

    linkCurso:
    linkCurso,

    dataPagamento:
    new Date()
    .toLocaleDateString()

});

            console.log(
                "Curso liberado:",
                pedidoId
            );



        }
        catch(error){


            console.log(
                "Erro Firebase:",
                error.message
            );


            return res
            .status(500)
            .send(
                "Erro Firebase"
            );


        }



    }




    res.json({

        recebido:true

    });


});







// =======================
// JSON NORMAL
//************************

app.use(
    express.json()
);


// =======================
// CRIAR PAGAMENTO STRIPE
// =======================

app.post(
"/criar-pagamento",
async(req,res)=>{


    const {
        curso,
        valor,
        pedidoId,
        usuarioId

    } = req.body;



    if(
        !curso ||
        !valor ||
        !pedidoId
    ){

        return res
        .status(400)
        .json({

            erro:
            "Dados incompletos"

        });

    }




    try{


        const session =
        await stripe.checkout.sessions.create({

            payment_method_types:[

                "card"

            ],


            line_items:[

                {

                    price_data:{

                        currency:
                        "brl",


                        product_data:{

                            name:
                            curso

                        },


                        unit_amount:
                        Math.round(
                            Number(valor) * 100
                        )

                    },


                    quantity:1

                }

            ],



            mode:
            "payment",



            metadata:{

                pedidoId:
                pedidoId,

                usuarioId:
                usuarioId || "",

                curso:
                curso

            },



            success_url:

            "http://127.0.0.1:5500/sucesso.html?session_id={CHECKOUT_SESSION_ID}",



            cancel_url:

            "http://127.0.0.1:5500/cancelado.html"


        });



        res.json({

            id:
            session.id

        });



    }
    catch(error){


        console.log(

            "Erro criar pagamento:",
            error.message

        );


        res.status(500)
        .json({

            erro:
            error.message

        });


    }


});



const PORT =
process.env.PORT || 3000;


app.listen(PORT, ()=>{

    console.log(
        "Servidor rodando na porta " + PORT
    );

});