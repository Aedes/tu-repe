import express from "express"
import cors from "cors"
import { PORT, FRONTEND_URL } from "./config/config"
import { clubRouter } from "./routes/club.routes"
import { courtRouter } from "./routes/court.routes"

const app = express()

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}))

app.use(express.json())

app.use("/clubs", clubRouter)
app.use("/courts", courtRouter)

app.get("/", (_req, res) => {
    res.send("Hello world")
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})