/** Acceso al disco que necesita la exportación, para poder probarla sin tocarlo. */
export abstract class FileSystem {
  abstract exists(path: string): Promise<boolean>;
  abstract read(path: string): Promise<string>;
  /** Escribe el archivo y crea las carpetas que falten. */
  abstract write(path: string, content: string): Promise<void>;
  /** Nombres de los subdirectorios directos, en orden alfabético. */
  abstract listDirectories(path: string): Promise<string[]>;
}
