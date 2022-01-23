import { Table, Column, Model } from 'sequelize-typescript';

@Table({
  tableName: 'base_table'
})
export default class BaseTable extends Model<BaseTable> {
  @Column({
    primaryKey: true,
    autoIncrement: true
  })
  rid: number;

  /**
   * Indexador de cadenas
   */
  [index: string]: any;

  /**
   * Añadir
   * @param elemento nuevo elemento
   */
  static async createItem<T extends BaseTable>(item: T) {
    return await this.create(item);
  }

  /**
   * Eliminar
   * @param rid
   */
  static async deleteById<T extends BaseTable>(rid: number) {
    return await this.destroy({
      where: { rid }
    });
  }

  /**
   * Actualizar
   * @param elemento nuevo elemento objeto
   * @param rid El elemento a modificar deshacerse
   */
  static async updateItemById<T extends BaseTable>(item: T, rid: number) {
    const objItem = (await this.getById(rid)) as T;
    for (const key in item) objItem[key] = item[key];

    return await objItem.save();
  }

  /**
   * Comprobar todo
   */
  static async getList<T extends BaseTable>() {
    const items = await this.findAll({ raw: true });
    return items as T[];
  }

  /**
   * Consulta (a través de rid)
   * @param rid
   */
  static async getById<T extends BaseTable>(rid: number) {
    const item = await this.findOne({
      raw: true,
      where: { rid }
    });

    return item as T;
  }
}
