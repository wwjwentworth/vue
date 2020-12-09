/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

// 某些情况下，可能需要禁用组件的观察者属性
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

// 为每个需要被观察的对象附上一个Observer实例，附加之后，观察者对象会将目标对象的属性键值转换为用于收集依赖项关系并调度更新的getter/setters
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    // 被监听的对象
    this.value = value
    // dep：Dep对象实例，Watcher和Observer之间的纽带
    this.dep = new Dep()
    this.vmCount = 0
    // def是 Object.defineProperty函数的简单封装
    // 将自身添加到value对象的__ob__属性上
    def(value, '__ob__', this)

    // 处理数组
    if (Array.isArray(value)) {
      // 如果数组有__proto__属性，那么将数组的__proto__属性指向Array.prototype对象
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 观察数组
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    // 给对象上的每个属性定义反应属性
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  // 观察数组列表的每一项
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

//通过使用__proto__截取原型链来增强目标对象或数组
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

// 数组增强方法
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  // target: 被观察的对象
  // src：Array.prototype
  // keys：push、pop、shift、unshift、splice、sort、reverse

  // 将数组的push、pop、shift、unshift、splice、sort、reverse都用原型对象上对应的方法替换
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

// 尝试为一个值创建一个观察者对象，如果成功观察到，则返回新的观察者，如果这个值已经有观察中者了，则返回已经存在的观察者对象
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果传入的值不是对象类型或者不是Vnode的实例，则直接返回
  if (!isObject(value) || value instanceof VNode) {
    return
  }

  // 声明一个观察者对象ob
  let ob: Observer | void
  // 通过value是否有__ob__属性并且value.__ob__是否是Observer的实例来判断value是否已经有了观察者
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // 如果符合以下条件，则返回一个观察者实例
    // 如果需要被观察
    shouldObserve &&
    // 这个条件判断是否在服务端渲染
    !isServerRendering() &&
    // 这个条件判断value是否是数组或者对象类型
    (Array.isArray(value) || isPlainObject(value)) &&
    // 这个条件判断value是否可扩展
    Object.isExtensible(value) &&
    // 这个条件判断value是否是Vue实例化的
    !value._isVue
  ) {
    ob = new Observer(value)
  }

  // 程序执行到这里，ob就是Observe的实例对象了
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

// 给对象的属性添加一个响应式属性
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // Dep类是Observe和Watcher之间的纽带，每一个Observe都有一个Dep实例，用来存储Watcher
  const dep = new Dep()

  // 判断key是否是obj可以获取的属性
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 属性是否可以修改
  if (property && property.configurable === false) {
    return
  }

  // 将属性的get方法赋值给getter
  // 将属性的set方法赋值给setter
  const getter = property && property.get
  const setter = property && property.set
  // 如果getter或者setter二者之一存在且参数的个数为2的时候
  if ((!getter || setter) && arguments.length === 2) {
    // 那么将obj[key]赋值给val
    val = obj[key]
  }

  // 这一部分逻辑是针对深层次对象，如果对象的属性是一个对象，那么就会递归遍历对象，让其属性值也转化为响应式对象
  let childOb = !shallow && observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 如果有Watcher存在
      if (Dep.target) {
        // 为当前watcher添加订阅者
        dep.depend()
        if (childOb) {
          // 为属性值添加订阅者
          childOb.dep.depend()
          // 如果value是数组，那么执行对数组的监听优化
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      // 判断新值是否和之前的value相同，不相同则执行dep.notify()，通知所有Watcher
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      // 如果setter不存在，直接返回空
      if (getter && !setter) return
      // 如果setter存在，执行property.set(obj, newVal),将newVal赋值给obj的属性
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 获取值的观察者实例对象
      childOb = !shallow && observe(newVal)
      // 用来通知订阅者进行数据更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 如果被观察的数据是数组，且数组的下标是合法的话，那么更新数组长度，并且将val插入到数组中
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 如何key已经在被观察的对象中，则重新赋值并且返回val
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }

  // 将target.__ob__赋值给ob，__ob__其实就是Observer的一个实例，如果__ob__不存在的话，那么说明target不是一个响应式对象，则直接赋值返回
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }

  // 将新添加的属性变成响应式对象
  defineReactive(ob.value, key, val)
  // 派发更新
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

// 进行数组的差异化处理
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    // 如果e有__ob__，也就意味着e是数组或对象，执行添加订阅者操作
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
