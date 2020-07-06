 
/* @flow */
/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2020-07-03 17:05:12
 * @Description: 
 * @Copyrigh: © 2020 杭州杰竞科技有限公司 版权所有
 */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

// Dep类是Observe和Watcher之间的纽带，每一个Observe都有一个Dep实例，用来存储Watcher
export default class Dep {
  static target: ?Watcher;
  // Dep类的id
  id: number;
  // 存储Watcher实例的数组
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    // 初始化存储Watcher实例的数组为空数组
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // 数组深拷贝
    const subs = this.subs.slice()
    // 通知每一个Watcher更新数据
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// Dep.target初始化为null
// 全局唯一，因为同一时刻只有一个Watcher在工作
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
