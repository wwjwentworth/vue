/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-06-30 18:23:50
 * @Description: 
 */ 

import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

// 初始化一些全局的API
initGlobalAPI(Vue)

// 在Vue的原型对象上挂载一个属性$isServer
// 该属性的意思是判断是否是服务端渲染
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 在Vue的原型对象上挂载一个属性$ssrContext
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    return this.$vnode && this.$vnode.ssrContext
  }
})

// 在服务端渲染的时候自动安装帮助函数FunctionalRenderContext
// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

// 最后exportVue实例
export default Vue
