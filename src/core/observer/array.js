/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-07-02 16:07:06
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

// 拦截数组以上方法，并发出事件
methodsToPatch.forEach(function (method) {
  // 缓存原始方法
  const original = arrayProto[method]
  // 重写在Array.prototype上的push、pop、shift、unshift、splice、sort、reverse方法
  def(arrayMethods, method, function mutator (...args) {
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
    if (inserted) ob.observeArray(inserted)
    // 通知修改
    ob.dep.notify()
    return result
  })
})
