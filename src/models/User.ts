import {
    Table,
    Column,
    Model,
    HasMany,
    BeforeUpdate,
    BeforeCreate,
    BeforeSave,
    DataType
} from 'sequelize-typescript';

import bcrypt from 'bcrypt';
@Table
export class User extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    id: string;

    @Column
    name: string;

    @Column({ type: DataType.STRING(1000) })
    password: string;

    @Column
    email: string;

    @Column({ values: ['admin', 'user'], defaultValue: 'user' })
    role: string;

    static hashPassword(password: string) {
        return bcrypt.hashSync(password, 10);
    }

    verifyPassword(comparePassword: string, encryptedPassword: string): boolean {
        return bcrypt.compareSync(comparePassword, encryptedPassword);
    }
}
