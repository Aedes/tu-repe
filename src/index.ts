import express from "express"
import cors from "cors"
import { PORT, FRONTEND_URL } from "./config/config"
import { clubRouter } from "./routes/club.routes"
import { courtRouter } from "./routes/court.routes"
import { videoRouter } from "./routes/video.routes"
import { initVideoIngestor } from "./workers/videoIngestor"
import { initRetryUploadWorker } from "./workers/retryUploadWorker"
import { initCleanupWorker } from "./workers/cleanupWorker"
import { clipRouter } from "./routes/clip.routes"
import { ensureUploadsDir } from "./config/initUploads"
//import { initRecordingScheduler } from "./workers/recordingScheduler"
import { authRouter } from "./routes/auth.routes"
import { userRouter } from "./routes/user.routes"

const app = express()

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}))

app.use(express.json())

initVideoIngestor()
initRetryUploadWorker()
initCleanupWorker()
//initRecordingScheduler()
ensureUploadsDir()

app.use("/clubs", clubRouter)
app.use("/courts", courtRouter)
app.use("/videos", videoRouter)
app.use("/clips", clipRouter)
app.use("/auth", authRouter)
app.use("/users", userRouter)

app.get("/", (_req, res) => {
    res.send("Hello world")
})

app.listen(PORT, "127.0.0.1", () => {
    console.log(`🚀 Server listening on port ${PORT}`)
})