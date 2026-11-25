# Ejemplos de backend-codigo-enterprise

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

## Reglas de revisión

```
- [ ] Capas respetadas: el dominio no importa infraestructura
- [ ] Dependencias por constructor, tipadas con puertos, sin new de colaboradores
- [ ] Reloj e ids inyectados
- [ ] Enums, no literales, para eventos, errores, colas y permisos
- [ ] Entradas externas validadas con zod en el borde
- [ ] Errores de dominio con código y sin filtrar detalles al cliente
- [ ] Pruebas en __tests__/ junto al código
- [ ] Migración generada con la CLI y revisada, si cambió una entidad
- [ ] Sin secretos, sin datos personales en logs
- [ ] Sin comentarios en línea; JSDoc en cada método público
```
