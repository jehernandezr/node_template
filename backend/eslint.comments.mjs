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

const declaresTopLevel = (node) =>
  ['Program', 'ExportNamedDeclaration'].includes(node.parent?.type);

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

const isInsideFunctionBody = (sourceCode, comment) => {
  for (
    let node = sourceCode.getNodeByRangeIndex(comment.range[0]);
    node;
    node = node.parent
  ) {
    if (node.type === 'StaticBlock') return true;
    if (functionTypes.has(node.type) || node.type === 'FunctionDeclaration') {
      if (node.type === 'ClassExpression') return false;
      return node.body !== null && comment.range[0] >= node.body.range[0];
    }
  }
  return false;
};

const isFileOverview = (sourceCode, comment) =>
  sourceCode.getTokenBefore(comment) === null &&
  sourceCode
    .getAllComments()
    .every(
      (other) =>
        other === comment ||
        other.type === 'Shebang' ||
        other.range[0] > comment.range[0],
    );

const documentsDeclaration = (sourceCode, comment) => {
  if (isFileOverview(sourceCode, comment)) return true;
  if (isInsideFunctionBody(sourceCode, comment)) return false;
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
    if (node.type === 'VariableDeclaration' && declaresTopLevel(node)) {
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

const voidReturn =
  /^(void|undefined|never|Promise<\s*void\s*>|void\s*\|\s*Promise<\s*void\s*>)$/;

const nestedFunctionTypes = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
  'ClassDeclaration',
  'ClassExpression',
]);

const returnsSomething = (node) => {
  if (!node || typeof node.type !== 'string') return false;
  if (node.type === 'ReturnStatement') return node.argument !== null;
  if (nestedFunctionTypes.has(node.type)) return false;
  return Object.entries(node).some(([key, child]) => {
    if (key === 'parent') return false;
    if (Array.isArray(child)) return child.some(returnsSomething);
    return child && typeof child === 'object' && returnsSomething(child);
  });
};

const returnsValue = (sourceCode, fn, checker, services) => {
  const annotation = fn.returnType?.typeAnnotation;
  if (annotation) {
    return !voidReturn.test(sourceCode.getText(annotation).trim());
  }
  if (checker && services?.esTreeNodeToTSNodeMap) {
    const signature = checker.getSignatureFromDeclaration(
      services.esTreeNodeToTSNodeMap.get(fn),
    );
    if (signature) {
      const returned = checker.typeToString(
        checker.getReturnTypeOfSignature(signature),
      );
      return !voidReturn.test(returned.trim());
    }
  }
  if (fn.type === 'ArrowFunctionExpression' && fn.expression) return true;
  return returnsSomething(fn.body);
};

const functionValued = (member) =>
  member.type === 'PropertyDefinition' &&
  ['ArrowFunctionExpression', 'FunctionExpression'].includes(
    member.value?.type,
  );

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

const vagueWords = new Set(
  'do does doing done work works handle handles handling process processes processing perform performs run runs execute executes thing things stuff logic helper helpers util utils utility something operation operations task tasks job jobs data info information item items given some stuff needed necessary required relevant appropriate accordingly properly correctly etc'.split(
    ' ',
  ),
);

const isVague = (summary) => {
  const said = wordsOf(summary).filter((word) => !fillerWords.has(word));
  return said.length === 0 || said.every((word) => vagueWords.has(word));
};

const repeatsName = (summary, name) => {
  const named = new Set(wordsOf(name));
  const said = wordsOf(summary).filter((word) => !fillerWords.has(word));
  return said.length > 0 && said.every((word) => named.has(word));
};

const ownerName = (member) => {
  for (let node = member.parent; node; node = node.parent) {
    if (
      [
        'ClassDeclaration',
        'ClassExpression',
        'TSInterfaceDeclaration',
      ].includes(node.type)
    ) {
      return node.id?.name ?? '';
    }
    if (node.type === 'TSTypeAliasDeclaration') return node.id.name;
  }
  return '';
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
      summaryVague:
        'The JSDoc of `{{name}}` says nothing specific: say what it does, for whom or why.',
      fieldRepeatsName:
        'The JSDoc of `{{name}}` only repeats its name: say something the name does not, or delete it.',
      paramMissing: 'The JSDoc of `{{name}}` needs `@param {{param}}`.',
      returnsMissing: 'The JSDoc of `{{name}}` needs `@returns`.',
    },
  },
  create: (context) => {
    const sourceCode = context.sourceCode;
    const services = sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();
    const javaScript = /\.[cm]?js$/.test(context.filename);
    let names = new Set();
    const implementsMember = (member) => {
      const owner = member.parent.parent;
      if (!checker || !owner.implements?.length || member.static) return false;
      const name =
        member.key.type === 'Identifier' ? member.key.name : undefined;
      if (name === undefined) return false;
      return owner.implements.some((clause) => {
        const type = checker.getTypeAtLocation(
          services.esTreeNodeToTSNodeMap.get(clause.expression),
        );
        const declared = type.getSymbol()
          ? checker.getDeclaredTypeOfSymbol(type.getSymbol())
          : type;
        return declared.getProperty(name) !== undefined;
      });
    };
    const checkMethod = (member) => {
      if (!isPublicMember(member)) return;
      if (member.kind === 'constructor' || member.kind === 'set') return;
      if (member.override || implementsMember(member)) return;
      const fn = member.value;
      const name = methodLabel(sourceCode, member);
      const comment = jsDocOf(sourceCode, member);
      if (javaScript && comment && /@override\b/.test(comment.value)) return;
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
      } else if (repeatsName(summary, `${name} ${ownerName(member)}`)) {
        context.report({
          node: member.key,
          messageId: 'summaryRepeatsName',
          data: { name },
        });
      } else if (isVague(summary)) {
        context.report({
          node: member.key,
          messageId: 'summaryVague',
          data: { name },
        });
      }
      const documented = documentedParameters(comment);
      for (const parameter of fn.params) {
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
        member.kind !== 'get' &&
        returnsValue(sourceCode, fn, checker, services) &&
        !/@returns?\b/.test(comment.value)
      ) {
        context.report({
          node: member.key,
          messageId: 'returnsMissing',
          data: { name },
        });
      }
    };
    const checkField = (member) => {
      const comment = jsDocOf(sourceCode, member);
      const key = member.key ?? member.parameter;
      if (!comment || !key) return;
      const name =
        key.type === 'Identifier'
          ? key.name
          : key.type === 'AssignmentPattern' && key.left.type === 'Identifier'
            ? key.left.name
            : sourceCode.getText(key);
      const summary = summaryOf(comment);
      if (
        summary.length > 0 &&
        repeatsName(summary, `${name} ${ownerName(member)}`)
      ) {
        context.report({
          node: key,
          messageId: 'fieldRepeatsName',
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
          member.type === 'TSAbstractMethodDefinition' ||
          functionValued(member)
        ) {
          checkMethod(member);
        } else if (
          member.type === 'PropertyDefinition' ||
          member.type === 'TSAbstractPropertyDefinition'
        ) {
          checkField(member);
        }
      }
    };
    return {
      Program(program) {
        names = exportedNames(program);
      },
      ClassDeclaration: checkClass,
      TSPropertySignature: checkField,
      TSParameterProperty: checkField,
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
