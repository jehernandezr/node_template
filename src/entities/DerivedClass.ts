import { Table, Column, Model } from 'sequelize-typescript';
import BaseTable from './BaseTable';

@Table({
  tableName: 'derived_table'
})
export default class derived_table extends BaseTable {
  @Column
  name: string;

  @Column
  age: number;

  @Column({ field: 'create_time' })
  createTime: Date;
}
