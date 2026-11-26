/**
 * Comment rules from the backend-code skill: code explains itself without inline comments, and every
 * public method of an exported class carries a complete JSDoc.
 */

const directive =
  /^\s*(eslint-disable(-next-line|-line)?\s+\S.*\s--\s+\S|eslint-enable\b|@ts-expect-error\s+\S|generated:[a-z:-]+\s*$)/;

const documentedNodeTypes = new Set([
  'ClassDeclaration',
  'ClassExpression',
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'FunctionDeclaration',
  'MethodDefinition',
  'TSAbstractMethodDefinition',
  'PropertyDefinition',
  'TSAbstractPropertyDefinition',
  'AccessorProperty',
  'TSParameterProperty',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
  'TSEnumMember',
  'TSPropertySignature',
  'TSMethodSignature',
  'TSModuleDeclaration',
  'TSDeclareFunction',
  'ExportAllDeclaration',
  'Decorator',
]);

const isJsDoc = (comment) =>
  comment.type === 'Block' && /^\*[^*]/.test(comment.value);

const functionTypes = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'ClassExpression',
]);

const declaresTopLevelOrFunction = (node) =>
  ['Program', 'ExportNamedDeclaration'].includes(node.parent?.type) ||
  node.declarations.every((declarator) =>
    functionTypes.has(declarator.init?.type),
  );

const insideFunction = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      functionTypes.has(parent.type) ||
      parent.type === 'FunctionDeclaration'
    ) {
      return true;
    }
  }
  return false;
};

const startsAt = (node, offset) => node.range[0] === offset;

const documentsDeclaration = (sourceCode, comment) => {
  const next = sourceCode.getTokenAfter(comment);
  if (!next) return false;
  if (next.value === '@') return true;
  let node = sourceCode.getNodeByRangeIndex(next.range[0]);
  while (node && startsAt(node, next.range[0])) {
    if (documentedNodeTypes.has(node.type)) return true;
    if (node.type === 'Property' && !insideFunction(node)) return true;
    if (
      node.type === 'ExpressionStatement' &&
      node.parent?.type === 'Program' &&
      node.expression.type === 'AssignmentExpression'
    ) {
      return true;
    }
    if (
      node.type === 'VariableDeclaration' &&
      declaresTopLevelOrFunction(node)
    ) {
      return true;
    }
    node = node.parent;
  }
  return false;
};

const noInlineComments = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      inline:
        'No inline comments: rename or extract a method. Only `eslint-disable* <rule> -- <reason>` and `@ts-expect-error <reason>` are allowed.',
      strayJsDoc:
        'A JSDoc block documents a declaration; inside code it is an inline comment.',
    },
  },
  create: (context) => ({
    Program() {
      const sourceCode = context.sourceCode;
      for (const comment of sourceCode.getAllComments()) {
        if (comment.type === 'Shebang') continue;
        if (isJsDoc(comment)) {
          if (!documentsDeclaration(sourceCode, comment)) {
            context.report({ loc: comment.loc, messageId: 'strayJsDoc' });
          }
          continue;
        }
        if (!directive.test(comment.value)) {
          context.report({ loc: comment.loc, messageId: 'inline' });
        }
      }
    },
  }),
};

const exportedNames = (program) => {
  const names = new Set();
  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration' && !statement.declaration) {
      for (const specifier of statement.specifiers) {
        names.add(specifier.local.name ?? specifier.local.value);
      }
    }
    if (
      statement.type === 'ExportDefaultDeclaration' &&
      statement.declaration.type === 'Identifier'
    ) {
      names.add(statement.declaration.name);
    }
  }
  return names;
};

const isExportedClass = (node, names) =>
  ['ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(
    node.parent?.type,
  ) ||
  (node.id !== null && names.has(node.id.name));

const parameterName = (parameter) => {
  const target =
    parameter.type === 'TSParameterProperty' ? parameter.parameter : parameter;
  if (target.type === 'Identifier') return target.name;
  if (
    target.type === 'AssignmentPattern' &&
    target.left.type === 'Identifier'
  ) {
    return target.left.name;
  }
  if (target.type === 'RestElement' && target.argument.type === 'Identifier') {
    return target.argument.name;
  }
  return undefined;
};

const voidReturn = /^(void|undefined|never|Promise<\s*void\s*>)$/;

const returnsValue = (sourceCode, method) => {
  const annotation = method.value.returnType?.typeAnnotation;
  if (annotation)
    return !voidReturn.test(sourceCode.getText(annotation).trim());
  return false;
};

const jsDocOf = (sourceCode, node) => {
  const target = node.decorators?.length > 0 ? node.decorators[0] : node;
  const comments = sourceCode.getCommentsBefore(target);
  const last = comments.at(-1);
  return last && isJsDoc(last) ? last : undefined;
};

const summaryOf = (comment) => {
  const lines = comment.value
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim());
  const firstTag = lines.findIndex((line) => line.startsWith('@'));
  return (firstTag === -1 ? lines : lines.slice(0, firstTag))
    .filter((line) => line.length > 0)
    .join(' ');
};

const documentedParameters = (comment) =>
  new Set(
    [...comment.value.matchAll(/@param\s+(?:\{[^}]*\}\s+)?\[?([\w$]+)/g)].map(
      (match) => match[1],
    ),
  );

const fillerWords = new Set(
  'a an the of for to in on at by and or with from as is it its this that these those be new default instance class method function value object returns return gets get sets set creates create builds build makes make'.split(
    ' ',
  ),
);

const wordsOf = (text) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/(ies|es|s)$/, ''));

const repeatsName = (summary, name) => {
  const named = new Set(wordsOf(name));
  const said = wordsOf(summary).filter((word) => !fillerWords.has(word));
  return said.length > 0 && said.every((word) => named.has(word));
};

const isPublicMember = (member) =>
  member.accessibility !== 'private' &&
  member.accessibility !== 'protected' &&
  member.key?.type !== 'PrivateIdentifier';

const methodLabel = (sourceCode, member) =>
  member.kind === 'constructor'
    ? 'constructor'
    : sourceCode.getText(member.key);

const requirePublicJsDoc = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      classMissing:
        'Exported class `{{name}}` needs a JSDoc line with its role.',
      methodMissing: 'Public method `{{name}}` needs a JSDoc.',
      summaryMissing: 'The JSDoc of `{{name}}` needs a summary sentence.',
      summaryRepeatsName:
        'The JSDoc of `{{name}}` only repeats its name: say what it does, for whom or why.',
      paramMissing: 'The JSDoc of `{{name}}` needs `@param {{param}}`.',
      returnsMissing: 'The JSDoc of `{{name}}` needs `@returns`.',
    },
  },
  create: (context) => {
    const sourceCode = context.sourceCode;
    let names = new Set();
    const checkMethod = (member) => {
      if (!isPublicMember(member)) return;
      if (member.kind === 'constructor' || member.kind === 'set') return;
      if (member.override) return;
      const name = methodLabel(sourceCode, member);
      const comment = jsDocOf(sourceCode, member);
      if (!comment) {
        context.report({
          node: member.key,
          messageId: 'methodMissing',
          data: { name },
        });
        return;
      }
      const summary = summaryOf(comment);
      if (summary.length === 0) {
        context.report({
          node: member.key,
          messageId: 'summaryMissing',
          data: { name },
        });
      } else if (repeatsName(summary, name)) {
        context.report({
          node: member.key,
          messageId: 'summaryRepeatsName',
          data: { name },
        });
      }
      const documented = documentedParameters(comment);
      for (const parameter of member.value.params) {
        const param = parameterName(parameter);
        if (param && !param.startsWith('_') && !documented.has(param)) {
          context.report({
            node: parameter,
            messageId: 'paramMissing',
            data: { name, param },
          });
        }
      }
      if (
        member.kind === 'method' &&
        returnsValue(sourceCode, member) &&
        !/@returns?\b/.test(comment.value)
      ) {
        context.report({
          node: member.key,
          messageId: 'returnsMissing',
          data: { name },
        });
      }
    };
    const checkClass = (node) => {
      if (!isExportedClass(node, names)) return;
      const holder = node.parent?.type?.startsWith('Export')
        ? node.parent
        : node;
      const comment = jsDocOf(
        sourceCode,
        node.decorators?.length ? node : holder,
      );
      const className = node.id?.name ?? 'default';
      if (!comment || summaryOf(comment).length === 0) {
        context.report({
          node: node.id ?? node,
          messageId: 'classMissing',
          data: { name: className },
        });
      } else if (repeatsName(summaryOf(comment), className)) {
        context.report({
          node: node.id ?? node,
          messageId: 'summaryRepeatsName',
          data: { name: className },
        });
      }
      for (const member of node.body.body) {
        if (
          member.type === 'MethodDefinition' ||
          member.type === 'TSAbstractMethodDefinition'
        ) {
          checkMethod(member);
        }
      }
    };
    return {
      Program(program) {
        names = exportedNames(program);
      },
      ClassDeclaration: checkClass,
    };
  },
};

/** ESLint plugin with the comment rules of the backend. */
const commentsPlugin = {
  rules: {
    'no-inline-comments': noInlineComments,
    'require-public-jsdoc': requirePublicJsDoc,
  },
};

export { commentsPlugin };
