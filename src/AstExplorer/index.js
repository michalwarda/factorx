// @flow

import * as babel from 'babel-core';
import Position from '../Position';
import Expression from '../Expression';
import ExpressionNotFoundError from '../ExpressionNotFoundError';
import options from './options';

export default class AstExplorer {
  code: string;
  ast: Object;
  map: Object;
  stop: Function;

  constructor(input: string) {
    const { code, map, ast } = babel.transform(input, options);
    this.code = code;
    this.map = map;
    this.ast = ast;
  }

  serializeNode = (node: Object) => Expression.fromNode(this.code, node);

  findExpressions(selection: Position): Array<Expression> {
    const nodes = [];
    this.transform(() => ({
      visitor: {
        Expression({ node }) {
          if (selection.includes(node)) {
            nodes.push(node);
          }
        },
      },
    }));
    if (nodes.length === 0) throw new ExpressionNotFoundError();
    return nodes.map(this.serializeNode);
  }

  extractVariable(selection: Position): string {
    let extracted = false;
    this.transform(({ types }) => ({
      visitor: {
        Expression: (path) => {
          const { node } = path;
          if (!node.visited && selection.includes(node)) {
            node.visited = true;
            const id = path.scope.generateUidIdentifierBasedOnNode(node.id);
            path.scope.push({ id, init: path.node });
            path.replaceWith(types.identifier(id.name));
            extracted = true;
          }
        },
      },
    }));
    if (!extracted) throw new ExpressionNotFoundError();
    return this.code;
  }

  transform(plugin: Function) {
    const { code, map, ast } = babel.transformFromAst(this.ast, this.code, {
      ...options,
      plugins: [plugin],
    });
    this.code = code;
    this.map = map;
    this.ast = ast;
  }
}
