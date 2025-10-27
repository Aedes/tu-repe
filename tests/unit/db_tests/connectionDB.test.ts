import { pool } from "../../../src/config/db"

test('usa la base de datos de test', async () => {
    const [rows]: any = await pool.query('SELECT DATABASE() AS db')
    expect(rows[0].db).toBe('tu_repe_mysql_test')
})

test('debería conectarse exitosamente a la base de datos MySQL', async () => {
    let connection
    try {
        connection = await pool.getConnection()
        const [rows] = await connection.query('SELECT 1 + 1 AS result')
        expect((rows as any[])[0].result).toBe(2)
    } finally {
        if (connection) {
            connection.release()
        }
    }
})