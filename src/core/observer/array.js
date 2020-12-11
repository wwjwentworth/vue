/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-12-11 09:49:49
 * @Description: 
 * @Copyrigh: © 2020 杭州杰竞科技有限公司 版权所有
 */ 

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

// 拦截数组以上方法，并触发依赖更新
methodsToPatch.forEach(function (method) {
  // 缓存原始方法
  const original = arrayProto[method]
  // 重写在Array.prototype上的push、pop、shift、unshift、splice、sort、reverse方法
  def(arrayMethods, method, function mutator (...args) {
    // 调用原来的方法进行计算，保证与原始数组方法的一致性
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // inserted变量标志着数组是否有新的元素增加，如果有新的元素增加，则触发observeArray，对新增的每个元素进行依赖的收集
    if (inserted) ob.observeArray(inserted)
    // 通知修改
    ob.dep.notify()
    return result
  })
})
