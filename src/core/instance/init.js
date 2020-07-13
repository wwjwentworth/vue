/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 在Vue原型对象上增加_init方法
  Vue.prototype._init = function (options?: Object) {
    // 声明vm常量，并指向Vue对象本身
    const vm: Component = this
    // a uid
    vm._uid = uid++

    // 防止Vue实例被observe的标识
    vm._isVue = true

    // 如果当前这个Vue实例是组件（看组件相关源码的时候再详细看，先略过）
    if (options && options._isComponent) {
      // 初始化组件
      initInternalComponent(vm, options)
    } else { // 当前Vue实例不是组件，而是实例化Vue对象时
      // 合并构造函数的options和创建实例传入的options
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
   
    // 将实例的_self指向自身
    vm._self = vm

    // 初始化生命周期钩子
    initLifecycle(vm)

    // 初始化事件监听
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm)

    // vm的状态初始化
    initState(vm)
    initProvide(vm)
    callHook(vm, 'created')

    // vm的mount,挂载dom节点
    // 如果Vue实例在实例化时没有收到el选项，则它处于未挂载状态，可以使用vm.$mount手动的挂载一个未挂载的实例。如果没有提供elementOrSelector参数，模版将渲染为文档之外的元素，并且你必须使用原生的DOM API将它插入到文档中
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 初始化组件，该方法主要是为vm.$options绑定一些属性
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {

  // Vue对象的构造函数中的options赋值给Vue对象的$options属性
  // 声明opts常量，并指向Vue对象的$options属性
  const opts = vm.$options = Object.create(vm.constructor.options)

  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 获取vm构造函数的options
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 实例化对象有两种方式，一种是基础的Vue构造器，另外一种是通过Vue.extend
  // 当Ctor是基础构造器的时候（new Vue）时候，这个时候的options就是Vue构造器上的options
  // 当Ctor是通过Vue.extend创建的子类，那么在extend的过程中，Ctor对象上就会自动加上super属性

  // 类本身的options
  let options = Ctor.options

  // 判断该类是否是Vue的子类
  // 有super属性，说明Ctor是用Vue.extend构建的子类
  if (Ctor.super) {
    // 通过递归的方法把父类上的options赋值给superOptions
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 然后把自身的options赋值给cachedSuperOptions
    const cachedSuperOptions = Ctor.superOptions

    // 比较superOptions和cachedSuperOptions是否相当，如果不相等的话就说明父类的options发生了改变，比如执行了Vue.extend或者Vue.mixin方法

    if (superOptions !== cachedSuperOptions) {
      // 这个时候需要将自身的options替换成最新的
      Ctor.superOptions = superOptions
      // 再检查自身的options是否发生了改变
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // 如果有新增的options，那么将新增的options合并到Ctor.extendOptions上
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 再使用mergeOptions方法合并父类构造器上的options和自身的extendOptions属性
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  // 定义modified变量
  let modified
  // 将自身的options赋值给latest常量
  const latest = Ctor.options
  // 执行Vue.extend时封装自身的options，这个属性就是用来判断自身options有没有发生改变
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    // 如果latest和sealed有属性存在不相等的情况下，那么返回发生改变的options属性
    // 一般情况下新增的是生命周期钩子函数
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
