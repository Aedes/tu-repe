import express from "express"
import cors from "cors"
import { PORT, FRONTEND_URL } from "./config/config"
import { clubRouter } from "./routes/club.routes"
import { courtRouter } from "./routes/court.routes"
import { videoRouter } from "./routes/video.routes"
import { initVideoIngestor } from "./workers/videoIngestor"

const app = express()

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}))

app.use(express.json())

initVideoIngestor()

app.use("/clubs", clubRouter)
app.use("/courts", courtRouter)
app.use("/videos", videoRouter)

app.get("/", (_req, res) => {
    res.send("Hello world")
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})