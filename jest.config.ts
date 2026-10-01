/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest', // 👈 Esta línea es clave
    testEnvironment: "node",
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {}],
    },
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    testPathIgnorePatterns: ["/node_modules/", "/build/", "/tests/external/"],
    modulePathIgnorePatterns: ["<rootDir>/build/"],
};