export class AppointmentMergeError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly permanent: boolean
    ) {
        super(message)
        this.name = "AppointmentMergeError"
    }
}
