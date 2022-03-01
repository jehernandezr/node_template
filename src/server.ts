import dotenv from 'dotenv';
import app from './app';
dotenv.config();

import sequelize from './utils/dbConnection';

const port = process.env.PORT || 3000;

sequelize
    .sync({ alter: true, logging: console.log })
    .then(() => {
        app.listen(port, () => {
            console.log(`App running on mode ${process.env.NODE_ENV} on port ${port}...`);
        });
    })
    .catch((err) => console.log(err));
