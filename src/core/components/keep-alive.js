/* @flow */

import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

type VNodeCache = { [key: string]: ?VNode };

function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}

const patternTypes: Array<Function> = [String, RegExp, Array]

// keep-alive的本质是寸缓存和拿缓存的过程，并没有实际的节点渲染
export default {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created () {
    // 缓存组件vnode
    this.cache = Object.create(null)
    // 缓存组件名
    this.keys = []
  },

  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  render () {
    // 拿到keep-alive下插槽的值
    const slot = this.$slots.default
    // 拿到keep-alive下第一个vnode节点
    const vnode: VNode = getFirstComponentChild(slot)
    // 拿到第一个组件实例
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    
    // 判断第一个组件实例是否存在
    if (componentOptions) {
      // 获取组件名称
      const name: ?string = getComponentName(componentOptions)
      const { include, exclude } = this
      // 如果子组件不满足匹配缓存的条件，那么会直接返回组件的vnode，不会做任何处理
      // include规定了只有名称匹配的组件才能被缓存
      // exclude规定了任何匹配的都不会被缓存
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      const { cache, keys } = this
      // 如果子组件的key不存在的，生成一个key，存在就用用户定义的key
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
      // 如果命中缓存
      if (cache[key]) {
        // 将组件缓存的componentInstance赋值给vnode.componentInstance
        vnode.componentInstance = cache[key].componentInstance
        // 先将命中缓存的key从缓存列表中移除，再将keypush到缓存列表中，这么做的原因是为了是当前的key最新
        remove(keys, key)
        keys.push(key)
      } else {
        // 如果没有命中缓存，那么将vnode赋值给cache[key]
        cache[key] = vnode
        keys.push(key)
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
      // 为缓存组件打上标志
      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}
