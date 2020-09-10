/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

// Watcher对象用来解析表达式，收益依赖对象，并且在value值发生改变的时候执行回调函数
// 可用于$watch和指令
export default class Watcher {
  vm: Component;        // 实例
  expression: string;   // 表达式
  cb: Function;         // 回调函数
  id: number;           // Watcher实例ID
  deep: boolean;        // 是否深层
  user: boolean;        // 是否用户定义
  lazy: boolean;        // 是否是懒加载
  sync: boolean;        // 是否同步
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;     // 依赖对象数组
  newDeps: Array<Dep>;  // 新依赖对象数组 
  depIds: SimpleSet;    // 依赖Id集合
  newDepIds: SimpleSet; // 新依赖Id集合
  before: ?Function;
  getter: Function;
  value: any;           // 被观察的值

  constructor (
    vm: Component,              // 实例
    expOrFn: string | Function, // 要观察的表达式
    cb: Function,               // 当观察的表达式值发生改变的时候执行的回调函数
    options?: ?Object,          // 给当前观察者对象的选项
    isRenderWatcher?: boolean   // 标识该观察者实例是否是渲染函数的观察者
  ) {
    // 每一个观察者实例都有一个vm对象，该属性指明了这个观察者是属于哪个组件的
    this.vm = vm
    if (isRenderWatcher) {
      // 只有在MountComponent函数中创建渲染函数观察者时这个属性的值才为true
      // 组件的_watcher属性指向该组件的观察者
      vm._watcher = this
    }
    // 组件的_wathcers是个队列，存储着该组件所有的观察者对象
    vm._watchers.push(this)
    // options
    if (options) {
      // 当前观察者实例对象是否是深度观察
      // 在使用Vue的Watch选项或者Vue.$watch函数去观测某个数据时，可设置deep为true来深度观察该数据
      this.deep = !!options.deep
      // 用来标识当前观察者实例是开发者自定义的，还是内部定义的
      this.user = !!options.user
      // 是否为懒加载
      this.lazy = !!options.lazy
      // 当数据发生改变时，是否同步求值
      this.sync = !!options.sync
      // 可以理解为Watcher内部的钩子函数，在数据变化之后，触发更新之前
      this.before = options.before
    } else {
      // 如果没有传入的选项，以下这些属性的值都为false
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    // 避免收集重复依赖，且移除重复依赖
    this.dirty = this.lazy
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // this.getter最终会是一个函数
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }

    // 不是懒加载的时候，立即执行get函数
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  // 收集依赖
  // 求值的目的有两个，第一个是能触发访问器属性的get拦截器属性
  // 第二个是能够获取被观察目标的值
  get () {
    // 当前的Watcher实例赋值给Dep.target
    pushTarget(this)
    let value

    // 缓存vm
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // 递归的获取被观察目标的子属性，达到深度观察的目的
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  // 记录自己都订阅过哪些dep
  addDep (dep: Dep) {
    const id = dep.id
    // 避免收集重复的依赖
    if (!this.newDepIds.has(id)) {
      // 记录当前Watcher订阅的Dep
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // 把自己订阅到dep
        dep.addSub(this)
      }
    }
  }

  // 清空依赖
  cleanupDeps () {
    // deps：旧的依赖
    // newDeps：新的依赖
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      // 如果当前watcher已经被订阅了，则移除当前watcher的Dep
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }

    // 在this.newDepIds被清空之前，将其赋值给了thie.depIds，这一步的作用就是在下次收集依赖的时候防止重复收集依赖
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()

    // 在this.newDeps清空之前，将其赋值给了thie.deps，这一步的作用就是在下次收集依赖的时候防止重复收集依赖
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  // 当被观察的数据改变时，将会触发update函数
  update () {
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      // 同步更新
      this.run()
    } else {
      // 异步更新队列
      queueWatcher(this)
    }
  }

  // 同步更新
  run () {
    if (this.active) {
      const value = this.get()
      // 比较新值和旧值是否相等
      // 如果是数组或者对象，或者设置了深度观测，即使值没有发生改变，也需要执行回调
      if (
        value !== this.value ||
        isObject(value) ||
        this.deep
      ) {
        // 更新旧值
        const oldValue = this.value
        this.value = value
        // 意味着这个观察者是开发者定义的，所谓开发者定义的是指那些通过 watch 选项或 $watch 函数定义的观察者
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            // 回调函数在执行的过程中其行为是不可预知, 出现错误给出提示
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  // 计算被观察的数据的值
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  // 把Watcher实例从从当前正在观测的状态的依赖列表中移除
  teardown () {
    // 该观察者是否是激活状态
    if (this.active) {
      // _isBeingDestroyed一个标识，值为false表示该观察者还没被销毁，为true表示该观察者已经被销毁了
      if (!this.vm._isBeingDestroyed) {
        // 将当前观察者实例从组件实例对象的 vm._watchers 数组中移除
        remove(this.vm._watchers, this)
      }
      // 当一个属性与一个观察者建立联系之后，属性的 Dep 实例对象会收集到该观察者对象
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
