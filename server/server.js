const express = require('express')
const admin = require('firebase-admin');

require('dotenv').config({ path: "./.env" })
const bodyParser = require("body-parser")
const { default: mongoose } = require('mongoose')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser');
const server = app.listen(process.env.PORT || 8000)
var io = require('socket.io')(server);
// var serviceAccount = require("./videocall-webrtc-d5695-firebase-adminsdk-9oe9c-ae76e2b487.json");

var serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace \n with actual newline characters
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB:', err);
});


app.use(bodyParser.json())

app.use(express.json())
app.use(cookieParser());
app.use(cors({
    origin: '*',
    credentials: true,
}));



const emailToSocketMapping = new Map()
const socketToEmailMapping = new Map()


const activeRooms = new Map();


io.on('connection', (socket) => {
    console.log("socket connected", socket.id);

    socket.on("create_group_call", async (data) => {


        const { room_id, email_id } = data;

        console.log("group call creation data", email_id, room_id);

        if (activeRooms.has(room_id)) {
            socket.emit('room_creation_error', { message: 'Room already exists' });
            return;
        }

        activeRooms.set(room_id, {
            creator: email_id,
            participants: new Map().set(email_id, {
                socketId: socket.id,
                joinedAt: Date.now(),

            }),
            created_at: Date.now(),
            max_participants: 10
        });


        socket.join(room_id);

        socket.emit('group_call_created', { room_id });

        console.log("============================room is created======================================", room_id, activeRooms.get(room_id));

    })

    socket.on("join_group_call", async (data) => {

        const { room_id, participant_email } = data;


        const room = activeRooms.get(room_id);

        if (!room) {
            socket.emit('join_error', { message: 'Room does not exist' });
            return;
        }


        if (room.participants.size >= room.max_participants) {
            socket.emit('join_error', { message: 'Room is full' });
            return;
        }

        room.participants.set(participant_email, {
            socketId: socket.id,
            joinedAt: Date.now(),

        });

        socket.join(room_id);

        socket.to(room_id).emit('participant_joined', {
            participant_email,
            total_participants: room?.participants?.size
        });
        console.log("============================group call join data======================================", participant_email, room_id);

    })



    socket.on("call_user", data => {
        const { email_id, room_id, myEmail, offer } = data
        const room = activeRooms.get(room_id);

        if (!room) {
            socket.emit('call_error', { message: 'Room does not exist' });
            return;
        }

        const socketId = room?.participants.get(email_id)?.socketId

        socket.to(socketId).emit("incomming_call", { offer, fromEmail: myEmail })

        console.log(
            '============================ send calling  to new user ======================================',
            email_id, room_id, myEmail,
        );


    })

    socket.on('call_accepted', ({ email_id, myEmail, room_id, ans }) => {

        const room = activeRooms.get(room_id);
        if (!room) {
            socket.emit('call_error', { message: 'Room does not exist' });
        }
        const socketId = room?.participants?.get(email_id).socketId

        socket.to(socketId).emit("call_accepted", { ans, fromEmail: myEmail })

        console.log(
            '============================ call accepted by new user   ======================================',
            myEmail,
        );

    })


    socket.on("end-call", ({ room_id, email }) => {
        console.log("call end", room_id, email);
        const room = activeRooms.get(room_id);
        if (room?.creator === email) {
            console.log("call_ended end", room_id);
            activeRooms.delete(email)
            socket.broadcast.to(room_id).emit("call_ended", { message: "Call has ended." });
        } else {
            const socketId = room?.participants.get(email)?.socketId
            if (socketId) {
                socket.to(socketId).emit("call_ended", { message: "Call has ended." });
            }
        }


    });

    // **Add ICE Candidate Exchange Handling Here**
    socket.on('ice_candidate', ({ email_id, room_id, myEmail, candidate }) => {

        const room = activeRooms.get(room_id);

        const socketId = room.participants.get(email_id).socketId;

        if (socketId) {
            socket.to(socketId).emit('ice_candidate', { candidate, myEmail: email_id, room_id, fromEmail: myEmail });
            console.log('ICE candidate sent to:', email_id);
        }

        console.log(
            '============================ ice candidated  sended to new user   ======================================',
            myEmail,
        );
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
        const email_id = socketToEmailMapping.get(socket.id);
        console.log('Client disconnected:', socket.id, 'Email:', email_id);

        emailToSocketMapping.delete(email_id);
        socketToEmailMapping.delete(socket.id);
    });
})

const authRoute = require("./router/authRoute.js");
const User = require('./model/userModel.js');
const sendNotification = require('./utils/sendNotification.js');

app.use("/api/v1/", authRoute)

app.get("/", (req, res) => {
    res.send("hello ")
})





// app.listen(PORT, () => {
//     console.log("server is running on port 9000");
// })
// io.listen(9001, () => {
//     console.log("server is running on port 9001")
// })