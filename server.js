const express = require('express')
const https = require('https')
const fs = require('fs')
const helmet = require('helmet')
const dotenv = require('dotenv')
const clc = require('cli-color')
const path = require('path')
dotenv.config({ path: './config/config.env' })

const PORT = process.env.PORT || 3030
const app = express()

app.use(express.static(path.resolve(path.join(__dirname, '/public'))))

app.use(helmet({
  contentSecurityPolicy: false
}))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/public/lobby.html'))
})


const server = https.createServer({
  key: fs.readFileSync(__dirname + '/config/key.pem'),
  cert: fs.readFileSync(__dirname + '/config/cert.pem'),
  passphrase: process.env.HTTPS_SECRET
}, app)

server.listen(PORT, () =>  console.log(`Server listen as ${clc.underline.bold.cyan(`https://localhost:${PORT}`)}\n`))
