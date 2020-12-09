/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

// 状态恢复，将控制流程状态的变量恢复到初始值，将队列情况
function resetSchedulerState () {
  // 将队列的length设置为0就是清空队列
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}


export let currentFlushTimestamp = 0

let getNow: () => number = Date.now

// 判读是否是在非IE的浏览器环境中
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    getNow = () => performance.now()
  }
}

// 刷新队列并执行watcher，该阶段主要做了以下几件事情
/**
 * 对queue中的watcher进行排序
 * 遍历watcher，如果watcher有before配置，则执行before方法，对应实例挂载之前的Watcher；在渲染watcher实例化的时候，我们传递了before函数，即在下一个tick更新之前，会调用beforeUpdate生命周期钩子函数
 * 执行run方法
 * 重置恢复状态，清空队列
 */
function flushSchedulerQueue () {
  // 获取当前时间戳
  currentFlushTimestamp = getNow()
  flushing = true
  let watcher, id

  // 刷新之前进行队列排序，排序主要是确保以下三件事情
  // 1. 组件的更新由父到子，因为父组件是先于子组件创建的，所以Watcher的执行也是先执行父组件的，再执行子组件的
  // 2. 用户自定义的watchers优先于渲染watchers执行，因为用户自定义的watchers是在渲染watchers之前创建的
  // 3. 如果子组件在父组件的watcher执行期间被销毁，那么子组件watchers的执行都可以被跳过
  
  // 根据ID大小排序
  queue.sort((a, b) => a.id - b.id)

  // 不用缓存queue队列的长度，因为在watcher执行期间可能会有其他的watcher被创建
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    // 如果watcher有before方法，则执行该watcher的before方法
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id
    has[id] = null
    // 执行watcher
    watcher.run()
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()
  // 重置恢复状态，清空队列
  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

export function queueActivatedComponent (vm: Component) {
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // 插入watcher
      // 插入的位置：第一个 待插入watcher的id大于当前队列中的watcher的id
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }

    if (!waiting) {
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      nextTick(flushSchedulerQueue)
    }
  }
}
