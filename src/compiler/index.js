/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-12-13 19:08:07
 * @Description: 
 * @Copyright: © 2020 杭州杰竞科技有限公司 版权所有
 */ 
/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// baseCompile函数主要通过三个步骤，parse、optimize、generate来生成一个包含ast、render和staticRenderFns的对象
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 将template转化为AST
  const ast = parse(template.trim(), options)
  // 优化AST
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // 将AST合成代码
  const code = generate(ast, options)

  // 最后生成一个包含AST，render，和staticRenderFns的对象
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
