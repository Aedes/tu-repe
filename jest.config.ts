/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest', // 👈 Esta línea es clave
    testEnvironment: "node",
    setupFiles: ['dotenv/config'],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {}],
    },
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
};