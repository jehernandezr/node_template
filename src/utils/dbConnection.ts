import path from 'path';
import { Sequelize } from 'sequelize-typescript';
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
console.log(DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME);

const route = path.basename(__filename).endsWith('js')
    ? path.join(process.cwd(), 'build', 'models')
    : path.join(process.cwd(), 'src', 'models');

const dbConnection = new Sequelize({
    database: DB_NAME,
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: 'postgres',
    username: DB_USER,
    password: DB_PASSWORD,
    // tslint:disable-next-line: max-line-length
    models: [route] // or [Player, Team],
});
console.log(route, path.basename(__filename));

export default dbConnection;
