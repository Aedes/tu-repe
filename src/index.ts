import express from "express"
import cors from "cors"
import { PORT, FRONTEND_URL } from "./config/config"

const app = express()

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}))

app.use(express.json())

app.get("/", (_req, res) => {
    res.send("Hello world")
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})