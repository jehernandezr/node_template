import { Sequelize} from 'sequelize-typescript';
import BaseTable from './entities/BaseTable';
import derived_table from './entities/DerivedClass';
 
// All entities
import  from './models/access_record';
 
const sequelize = new Sequelize({
    database:"my_database",
    username:"root",
    password:"123456",
    host:"localhost",
    port:3306,
    dialect:'mysql',
    operatorsAliases:false,
 
    pool:{
        max:5,
        min:0,
        acquire:30000,
        idle:10000
    },
 
         // Configuración de zona horaria
    dialectOptions:{
        useUTC:false // for reading from database
    },
    timezone:'+8:00' // for writing to database
})
sequelize.addModels([__dirname + '/models']);
 
sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.')
})
.catch(err => {
    console.error('Unable to connect to the database:', err)
});
 
export { sequelize, BaseTable, derived_table }