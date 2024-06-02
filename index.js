const express = require('express');
const app = express();
const port = process.env.PORT || 5000;


// ! middleware 
app.use(express.json());




app.get('/', (req, res)=>{
    res.send('DiagPulse Server is Running')
})

app.listen(port, ()=>{
    console.log(`DiagPulse Server Running In port ${port}`)
})