/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-11-04 22:10:40
 * @Description: 
 * @Copyright: © 2020 杭州杰竞科技有限公司 版权所有
 */
/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  // ASSET_TYPES = ['component', 'directive, 'filter']
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 如果第二个参数不存在，直接返回注册组件的构造函数
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          // 验证组件名称
          validateComponentName(id)
        }
        // 如果类型是component，且第二个参数为对象
        if (type === 'component' && isPlainObject(definition)) {
          // definition对象的name属性不存在的话，将id赋值给name属性
          definition.name = definition.name || id
          // 使用Vue.extend()创建子组件，返回子类构造器
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }

        // 在Vue.options上面增加子类构造器
        this.options[type + 's'][id] = definition
        // 总结一句话，全局注册组件就是会创建一个基于Vue的子类构造器，并将组件的信息加载到实例options.components中
        return definition
      }
    }
  })
}
