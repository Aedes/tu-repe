import { AppointmentVideoService } from "../../../src/services/AppointmentVideoService"
import { config } from "../../../src/config/config"
import { initAppointmentVideoWorker, stopAppointmentVideoWorker } from "../../../src/workers/appointmentVideoWorker"

describe("appointmentVideoWorker", () => {
    afterEach(async () => {
        await stopAppointmentVideoWorker()
        jest.restoreAllMocks()
    })

    test("no ejecuta dos uniones al mismo tiempo y se detiene", async () => {
        const previous = config.APPOINTMENT_MERGE_WORKER_INTERVAL_MS
        config.APPOINTMENT_MERGE_WORKER_INTERVAL_MS = 30
        let release: (value: boolean) => void = () => undefined
        const gate = new Promise<boolean>((resolve) => {
            release = resolve
        })
        const processNext = jest.spyOn(AppointmentVideoService, "processNext").mockImplementation(() => gate)
        initAppointmentVideoWorker()
        await new Promise((resolve) => setTimeout(resolve, 70))
        expect(processNext).toHaveBeenCalledTimes(1)
        release(true)
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(processNext.mock.calls.length).toBeGreaterThan(1)
        await stopAppointmentVideoWorker()
        const calls = processNext.mock.calls.length
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(processNext).toHaveBeenCalledTimes(calls)
        config.APPOINTMENT_MERGE_WORKER_INTERVAL_MS = previous
    })
})
