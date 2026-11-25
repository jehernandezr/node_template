# backend-codigo-enterprise examples

Long examples the skill cites. Read them only when the topic applies to you.

## Review rules

```
- [ ] Layers respected: the domain does not import infrastructure
- [ ] Dependencies through the constructor, typed with ports, no new of collaborators
- [ ] Clock and ids injected
- [ ] Enums, not literals, for events, errors, queues and permissions
- [ ] External input validated with zod at the edge
- [ ] Domain errors with a code and no details leaked to the client
- [ ] Tests in __tests__/ next to the code
- [ ] Migration generated with the CLI and reviewed, if an entity changed
- [ ] No secrets, no personal data in logs
- [ ] No inline comments; JSDoc on every public method
```
