/** El acceso al disco de los generadores, para probarlos sin tocarlo. */
export abstract class FileSystem {
  abstract exists(path: string): Promise<boolean>;
  abstract read(path: string): Promise<string>;
  /** Escribe el archivo y crea las carpetas que falten. */
  abstract write(path: string, content: string): Promise<void>;
  /** Rutas de todos los archivos bajo `root`, relativas a él y con `/`, en orden alfabético. */
  abstract listFiles(root: string): Promise<string[]>;
}
