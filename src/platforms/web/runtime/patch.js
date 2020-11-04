/* @flow */
/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-11-04 21:46:23
 * @Description: 
 * @Copyright: © 2020 杭州杰竞科技有限公司 版权所有
 */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'
import directives from './directives'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// platformModules = [
//   attrs,
//   klass,
//   events,
//   domProps,
//   style,
//   transition
// ];

// baseModules = [
//   directives,
//   ref
// ]

export const patch: Function = createPatchFunction({ nodeOps, modules })
